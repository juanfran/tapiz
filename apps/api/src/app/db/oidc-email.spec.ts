import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db, psqlClient, startDB } from './init-db.js';
import { createOidcUser, getUserByOidcIdentity, refreshOidcUserEmail, getUserInvitationsByEmail, acceptInvitation } from './user-db.js';
import { accounts, invitations, oidcIdentities, teams, teamMembers } from '../schema.js';

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

// Use only a disposable database: this suite exercises real migrations and uniqueness constraints.
describe.runIf(process.env['TAPIZ_TEST_DATABASE'] === '1')('OIDC returning-user email synchronization (PostgreSQL)', () => {
  beforeAll(async () => { await startDB(); });
  afterEach(async () => {
    for (const id of createdIds.splice(0)) await db.delete(accounts).where(eq(accounts.id, id));
  });
  afterAll(async () => { await psqlClient.end(); });

  it('moves invitation access to the new verified email without changing issuer/subject', async () => {
    const oldAddress = email('old');
    const newAddress = email('new');
    const { id, sub } = await createAccount(oldAddress);
    const [{ id: teamId }] = await db.insert(teams).values({ name: 'Invitation test' }).returning({ id: teams.id });
    try {
      const [{ id: oldInvite }] = await db.insert(invitations).values({ email: oldAddress, teamId, role: 'member', inviterId: id }).returning({ id: invitations.id });
      const [{ id: newInvite }] = await db.insert(invitations).values({ email: newAddress, teamId, role: 'member', inviterId: id }).returning({ id: invitations.id });
      const user = await refreshOidcUserEmail(issuer, sub, newAddress);
      expect(user).toMatchObject({ id, email: newAddress });
      if (!user) throw new Error('OIDC account not found');
      expect(await getUserByOidcIdentity(issuer, sub)).toMatchObject({ id, email: newAddress });
      expect((await getUserInvitationsByEmail(newAddress)).map((v) => v.id)).toContain(newInvite);
      expect(await acceptInvitation(id, user.email, oldInvite)).toBeUndefined();
      expect(await acceptInvitation(id, user.email, newInvite)).toBe(true);
      expect(await db.select().from(teamMembers).where(eq(teamMembers.accountId, id))).toHaveLength(1);
    } finally {
      await db.delete(invitations).where(eq(invitations.teamId, teamId));
      await db.delete(teams).where(eq(teams.id, teamId));
    }
  });

  it('rejects an email belonging to another account without changing either identity', async () => {
    const firstAddress = email('first');
    const secondAddress = email('second');
    const first = await createAccount(firstAddress);
    const second = await createAccount(secondAddress);
    await expect(refreshOidcUserEmail(issuer, first.sub, secondAddress)).rejects.toMatchObject({ code: '23505' });
    expect(await getUserByOidcIdentity(issuer, first.sub)).toMatchObject({ id: first.id, email: firstAddress });
    expect(await getUserByOidcIdentity(issuer, second.sub)).toMatchObject({ id: second.id, email: secondAddress });
    expect(await db.select().from(oidcIdentities)).toEqual(expect.arrayContaining([
      expect.objectContaining({ issuer, subject: first.sub, accountId: first.id }),
      expect.objectContaining({ issuer, subject: second.sub, accountId: second.id }),
    ]));
  });
});
