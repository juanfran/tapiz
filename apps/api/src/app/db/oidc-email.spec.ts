import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { db, psqlClient, startDB } from './init-db.js';
import {
  createOidcUser,
  getUserByOidcIdentity,
  refreshOidcUser,
  getUserByEmail,
  getUserInvitationsByEmail,
  inviteByEmail,
  acceptInvitation,
} from './user-db.js';
import {
  accounts,
  invitations,
  oidcIdentities,
  teams,
  teamMembers,
} from '../schema.js';

const createdIds: string[] = [];
const issuer = 'https://idp.example.test';
const subject = () => randomUUID();
const email = (prefix: string) => `${prefix}-${randomUUID()}@example.test`;

async function createAccount(address: string) {
  const sub = subject();
  const id = await createOidcUser(issuer, sub, 'Example', address);
  createdIds.push(id);
  return { id, sub };
}

// Runs against the configured POSTGRES_* database, like the other DB-backed
// API specs; it only deletes the accounts it creates.
describe('OIDC email and identity constraints (PostgreSQL)', () => {
  beforeAll(async () => {
    await startDB();
  });
  afterEach(async () => {
    for (const id of createdIds.splice(0))
      await db.delete(accounts).where(eq(accounts.id, id));
  });
  afterAll(async () => {
    await psqlClient.end();
  });

  it('moves invitation access to the new verified email without changing issuer/subject', async () => {
    const oldAddress = email('old');
    const newAddress = email('new');
    const { id, sub } = await createAccount(oldAddress);
    const [{ id: teamId }] = await db
      .insert(teams)
      .values({ name: 'Invitation test' })
      .returning({ id: teams.id });
    try {
      const [{ id: oldInvite }] = await db
        .insert(invitations)
        .values({ email: oldAddress, teamId, role: 'member', inviterId: id })
        .returning({ id: invitations.id });
      const [{ id: newInvite }] = await db
        .insert(invitations)
        .values({ email: newAddress, teamId, role: 'member', inviterId: id })
        .returning({ id: invitations.id });
      const user = await refreshOidcUser(issuer, sub, { email: newAddress });
      expect(user).toMatchObject({ id, email: newAddress });
      if (!user) throw new Error('OIDC account not found');
      expect(await getUserByOidcIdentity(issuer, sub)).toMatchObject({
        id,
        email: newAddress,
      });
      expect(
        (await getUserInvitationsByEmail(newAddress)).map((v) => v.id),
      ).toContain(newInvite);
      expect(await acceptInvitation(id, user.email, oldInvite)).toBeUndefined();
      expect(await acceptInvitation(id, user.email, newInvite)).toBe(true);
      expect(
        await db
          .select()
          .from(teamMembers)
          .where(eq(teamMembers.accountId, id)),
      ).toHaveLength(1);
    } finally {
      await db.delete(invitations).where(eq(invitations.teamId, teamId));
      await db.delete(teams).where(eq(teams.id, teamId));
    }
  });

  it('rolls back the losing account in simultaneous identity registrations', async () => {
    const firstAddress = email('concurrent-first');
    const secondAddress = email('concurrent-second');
    const sub = subject();
    const results = await Promise.allSettled([
      createOidcUser(issuer, sub, 'First', firstAddress),
      createOidcUser(issuer, sub, 'Second', secondAddress),
    ]);
    const successful = results.filter(
      (result) => result.status === 'fulfilled',
    );
    const failed = results.filter((result) => result.status === 'rejected');
    expect(successful).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect((failed[0] as PromiseRejectedResult).reason).toMatchObject({
      code: '23505',
    });
    const winner = (successful[0] as PromiseFulfilledResult<string>).value;
    createdIds.push(winner);
    expect(
      await db
        .select()
        .from(accounts)
        .where(sql`${accounts.email} in (${firstAddress}, ${secondAddress})`),
    ).toEqual([expect.objectContaining({ id: winner })]);
    expect(
      await db
        .select()
        .from(oidcIdentities)
        .where(
          and(
            eq(oidcIdentities.issuer, issuer),
            eq(oidcIdentities.subject, sub),
          ),
        ),
    ).toEqual([expect.objectContaining({ accountId: winner })]);
  });

  it('rejects a first-login email collision without an orphan account', async () => {
    const address = email('collision');
    const existing = await createAccount(address);
    const otherSubject = subject();
    await expect(
      createOidcUser(issuer, otherSubject, 'Other', address),
    ).rejects.toMatchObject({ code: '23505' });
    expect(
      await db.select().from(accounts).where(eq(accounts.email, address)),
    ).toEqual([expect.objectContaining({ id: existing.id })]);
    expect(
      await db
        .select()
        .from(oidcIdentities)
        .where(eq(oidcIdentities.subject, otherSubject)),
    ).toHaveLength(0);
  });

  it('matches mixed-case invitations and rejects duplicate email casing', async () => {
    const address = email('mixed');
    const mixed = address
      .replace('mixed', 'MiXeD')
      .replace('@example.test', '@Example.test');
    const { id } = await createAccount(address);
    const [{ id: teamId }] = await db
      .insert(teams)
      .values({ name: 'Mixed case' })
      .returning({ id: teams.id });
    try {
      const invite = await db
        .insert(invitations)
        .values({ email: address, teamId, role: 'member', inviterId: id })
        .returning({ id: invitations.id });
      expect(await getUserInvitationsByEmail(mixed)).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: invite[0].id })]),
      );
      expect(await acceptInvitation(id, mixed, invite[0].id)).toBe(true);
      await expect(
        createOidcUser(issuer, subject(), 'Duplicate', mixed),
      ).rejects.toMatchObject({ code: '23505' });
      expect(
        await db
          .select()
          .from(accounts)
          .where(sql`lower(${accounts.email}) = ${address}`),
      ).toHaveLength(1);
    } finally {
      await db.delete(invitations).where(eq(invitations.teamId, teamId));
      await db.delete(teams).where(eq(teams.id, teamId));
    }
  });

  it('consumes duplicate case-variant invitations after membership already exists', async () => {
    const address = email('duplicate-invite');
    const { id } = await createAccount(address);
    const [{ id: teamId }] = await db
      .insert(teams)
      .values({ name: 'Duplicate invites' })
      .returning({ id: teams.id });
    try {
      const invitationIds = await db
        .insert(invitations)
        .values([
          { email: address, teamId, role: 'member', inviterId: id },
          {
            email: address.toUpperCase(),
            teamId,
            role: 'member',
            inviterId: id,
          },
        ])
        .returning({ id: invitations.id });
      expect(await acceptInvitation(id, address, invitationIds[0].id)).toBe(
        true,
      );
      expect(await acceptInvitation(id, address, invitationIds[1].id)).toBe(
        true,
      );
      expect(
        await db
          .select()
          .from(teamMembers)
          .where(
            and(eq(teamMembers.accountId, id), eq(teamMembers.teamId, teamId)),
          ),
      ).toHaveLength(1);
      expect(
        await db
          .select()
          .from(invitations)
          .where(eq(invitations.teamId, teamId)),
      ).toHaveLength(0);
    } finally {
      await db.delete(invitations).where(eq(invitations.teamId, teamId));
      await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
      await db.delete(teams).where(eq(teams.id, teamId));
    }
  });

  it('rejects an email belonging to another account without changing either identity', async () => {
    const firstAddress = email('first');
    const secondAddress = email('second');
    const first = await createAccount(firstAddress);
    const second = await createAccount(secondAddress);
    await expect(
      refreshOidcUser(issuer, first.sub, { email: secondAddress }),
    ).rejects.toMatchObject({ code: '23505' });
    expect(await getUserByOidcIdentity(issuer, first.sub)).toMatchObject({
      id: first.id,
      email: firstAddress,
    });
    expect(await getUserByOidcIdentity(issuer, second.sub)).toMatchObject({
      id: second.id,
      email: secondAddress,
    });
    expect(await db.select().from(oidcIdentities)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          issuer,
          subject: first.sub,
          accountId: first.id,
        }),
        expect.objectContaining({
          issuer,
          subject: second.sub,
          accountId: second.id,
        }),
      ]),
    );
  });

  it('finds accounts and stores invitations case-insensitively', async () => {
    const address = email('lookup');
    const mixed = address.toUpperCase();
    const { id } = await createAccount(address);
    const [{ id: teamId }] = await db
      .insert(teams)
      .values({ name: 'Mixed-case invite' })
      .returning({ id: teams.id });
    try {
      expect(await getUserByEmail(mixed)).toMatchObject({ id });
      const invitation = await inviteByEmail(mixed, id, { teamId }, 'member');
      expect(invitation.email).toBe(address);
      expect(
        (await getUserInvitationsByEmail(address)).map((v) => v.id),
      ).toContain(invitation.id);
    } finally {
      await db.delete(invitations).where(eq(invitations.teamId, teamId));
      await db.delete(teams).where(eq(teams.id, teamId));
    }
  });

  it('refreshes the profile of a returning user only with claims it received', async () => {
    const address = email('profile');
    const { id, sub } = await createAccount(address);
    expect(
      await refreshOidcUser(issuer, sub, {
        email: address,
        name: 'Renamed User',
        picture: 'https://idp.example.test/avatar.png',
      }),
    ).toMatchObject({
      id,
      name: 'Renamed User',
      picture: 'https://idp.example.test/avatar.png',
    });
    expect(
      await refreshOidcUser(issuer, sub, { email: address }),
    ).toMatchObject({
      id,
      name: 'Renamed User',
      picture: 'https://idp.example.test/avatar.png',
    });
  });
});
