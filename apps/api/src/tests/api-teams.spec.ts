import { randProductName } from '@ngneat/falso';
import { eq } from 'drizzle-orm';
import { db as database, startDB } from '../app/db/init-db';
import db from '../app/db';
import * as schema from '../app/schema';

import {
  errorCall,
  createMultipleUsers,
  getUserCaller,
  getAuth,
} from './test-helpers';

describe('Api - teams', () => {
  beforeAll(async () => {
    await startDB();
    await createMultipleUsers();
  });

  describe('teams crud', () => {
    let teamId: string;

    it('create', async () => {
      const caller = await getUserCaller(1);

      const result = await caller.team.new({
        name: randProductName(),
      });

      teamId = result.id;
    });

    it('get as a member', async () => {
      const caller = await getUserCaller(1);

      const result = await caller.team.getAll();

      expect(result[0].teamMember?.role).toBe('admin');

      expect(result).toHaveLength(1);
    });

    it('get as a non-member', async () => {
      const caller = await getUserCaller(2);

      const result = await caller.team.getAll();

      expect(result).toHaveLength(0);
    });

    it('delete team', async () => {
      const caller = await getUserCaller(1);

      await caller.team.delete({
        teamId,
      });

      const result = await caller.team.getAll();

      expect(result).toHaveLength(0);
    });
  });

  describe('invite to team', () => {
    let inviteId: string;
    let teamId: string;

    beforeAll(async () => {
      const caller = await getUserCaller(1);

      const result = await caller.team.new({
        name: randProductName(),
      });

      teamId = result.id;
    });

    it('create', async () => {
      const caller = await getUserCaller(1);

      const result = await caller.team.invite({
        email: getAuth(2).email,
        teamId,
        role: 'member',
      });

      inviteId = result.id;

      const invitations = await caller.team.invitations({
        teamId,
      });

      expect(invitations).toHaveLength(1);
    });

    it('already invited', async () => {
      const caller = await getUserCaller(1);

      const result = await errorCall(() => {
        return caller.team.invite({
          email: getAuth(2).email,
          teamId,
          role: 'admin',
        });
      });

      expect(result?.code).toEqual('CONFLICT');
    });

    it('alreay member', async () => {
      const caller = await getUserCaller(1);

      const result = await errorCall(() => {
        return caller.team.invite({
          email: getAuth(1).email,
          teamId,
          role: 'admin',
        });
      });

      expect(result?.code).toEqual('CONFLICT');
    });

    it('get invites', async () => {
      const caller = await getUserCaller(2);

      const result = await caller.user.invites();

      expect(result[0].team?.id).toEqual(teamId);
    });

    it('try to accept other user invite', async () => {
      const caller = await getUserCaller(1);

      const result = await errorCall(() => {
        return caller.user.acceptInvite({
          inviteId,
        });
      });

      expect(result?.code).toEqual('NOT_FOUND');
    });

    it('change role invite', async () => {
      const caller = await getUserCaller(1);
      const caller2 = await getUserCaller(2);

      const result = await caller.team.editInviteRole({
        inviteId,
        role: 'admin',
      });

      expect(result.success).toEqual(true);

      const invites = await caller2.user.invites();

      expect(invites[0].role).toEqual('admin');
    });

    it('accept invite', async () => {
      const caller = await getUserCaller(2);

      const result = await caller.user.acceptInvite({
        inviteId,
      });

      expect(result.success).toEqual(true);

      const invites = await caller.user.invites();

      expect(invites).toHaveLength(0);

      const members = await caller.team.members({
        teamId,
      });

      expect(members).toHaveLength(2);
    });

    describe('member roles', () => {
      it('change role', async () => {
        const caller = await getUserCaller(1);

        const result = await caller.team.changeRole({
          userId: getAuth(2).sub,
          teamId,
          role: 'admin',
        });

        expect(result.success).toEqual(true);

        const teams = await caller.team.getAll();

        const team = teams.find((it) => it.id === teamId);

        expect(team?.teamMember?.role).toEqual('admin');
      });

      it('admin to member error because last admin', async () => {
        const caller = await getUserCaller(2);

        const resultCreateTeam = await caller.team.new({
          name: randProductName(),
        });

        const result = await errorCall(() => {
          return caller.team.changeRole({
            userId: getAuth(2).sub,
            teamId: resultCreateTeam.id,
            role: 'member',
          });
        });

        expect(result?.code).toEqual('CONFLICT');
      });

      it('delete member', async () => {
        const caller = await getUserCaller(1);

        const result = await caller.team.deleteMember({
          memberId: getAuth(2).sub,
          teamId,
        });

        expect(result.success).toEqual(true);

        const callerUser2 = getUserCaller(2);

        const teams = await callerUser2.team.getAll();

        const team = teams.find((it) => it.id === teamId);

        expect(team).toBeUndefined();
      });

      it('tye to delete last admin', async () => {
        const caller = await getUserCaller(1);

        const result = await errorCall(() => {
          return caller.team.deleteMember({
            memberId: getAuth(1).sub,
            teamId,
          });
        });

        expect(result?.code).toEqual('CONFLICT');
      });
    });

    describe('cancel invite', () => {
      let inviteId1: string;
      let inviteId2: string;

      beforeAll(async () => {
        const caller = await getUserCaller(1);

        inviteId1 = (
          await caller.team.invite({
            email: getAuth(5).email,
            teamId,
            role: 'member',
          })
        ).id;

        inviteId2 = (
          await caller.team.invite({
            email: getAuth(6).email,
            teamId,
            role: 'member',
          })
        ).id;
      });

      it('cancel invite with invited user', async () => {
        const caller = await getUserCaller(5);

        const result = await caller.user.cancelInvite({
          inviteId: inviteId1,
        });

        expect(result.success).toEqual(true);

        const invites = await caller.user.invites();

        expect(invites).toHaveLength(0);
      });

      it('cancel invite with admin user', async () => {
        const caller = await getUserCaller(1);

        const result = await caller.user.cancelInvite({
          inviteId: inviteId2,
        });

        expect(result.success).toEqual(true);

        const callerUser2 = getUserCaller(6);

        const invites = await callerUser2.user.invites();

        expect(invites).toHaveLength(0);
      });
    });
  });

  describe('leave team', () => {
    let teamId: string;

    beforeAll(async () => {
      const admin = await getUserCaller(80);
      teamId = (await admin.team.new({ name: randProductName() })).id;
      const invite = await admin.team.invite({
        email: getAuth(81).email,
        teamId,
        role: 'member',
      });
      await (
        await getUserCaller(81)
      ).user.acceptInvite({
        inviteId: invite.id,
      });
    });

    it('rejects the last admin leaving', async () => {
      const result = await errorCall(async () =>
        (await getUserCaller(80)).team.leave({ teamId }),
      );

      expect(result?.code).toBe('CONFLICT');
      expect(
        (await (await getUserCaller(80)).team.getAll()).map((it) => it.id),
      ).toContain(teamId);
    });

    it('lets a member leave', async () => {
      const caller = await getUserCaller(81);

      await caller.team.leave({ teamId });

      expect((await caller.team.getAll()).map((it) => it.id)).not.toContain(
        teamId,
      );
    });

    it('rejects the last member leaving', async () => {
      const result = await errorCall(async () =>
        (await getUserCaller(80)).team.leave({ teamId }),
      );

      expect(result?.code).toBe('CONFLICT');
    });
  });

  describe('legacy team without admins', () => {
    // Old data: teams whose only members are plain members.
    async function teamWithoutAdmins(...userIndexes: number[]) {
      const [owner, ...others] = userIndexes;
      const team = await db.team.createTeam(
        randProductName(),
        getAuth(owner).sub,
      );
      for (const index of others) {
        await db.user.addTeamMember(getAuth(index).sub, team.id, 'member');
      }
      await database
        .update(schema.teamMembers)
        .set({ role: 'member' })
        .where(eq(schema.teamMembers.teamId, team.id));
      return team.id;
    }

    it('lets its only member delete it', async () => {
      const teamId = await teamWithoutAdmins(82);
      const caller = await getUserCaller(82);

      await caller.team.delete({ teamId });

      expect(await db.team.getTeam(teamId)).toBeUndefined();
    });

    it('still requires an admin while other members remain', async () => {
      const teamId = await teamWithoutAdmins(83, 84);

      const result = await errorCall(async () =>
        (await getUserCaller(83)).team.delete({ teamId }),
      );

      expect(result?.code).toBe('UNAUTHORIZED');
      expect(await db.team.getTeam(teamId)).toBeTruthy();
    });

    it('does not let a plain member delete a team with an admin', async () => {
      const admin = await getUserCaller(85);
      const teamId = (await admin.team.new({ name: randProductName() })).id;
      await db.user.addTeamMember(getAuth(86).sub, teamId, 'member');
      await admin.team.leave({ teamId }).catch(() => undefined);

      const result = await errorCall(async () =>
        (await getUserCaller(86)).team.delete({ teamId }),
      );

      expect(result?.code).toBe('UNAUTHORIZED');
    });
  });

  describe('team spaces', () => {
    let teamId: string;
    let boardId: string;

    beforeAll(async () => {
      const caller = await getUserCaller(1);

      const result = await caller.team.new({
        name: randProductName(),
      });

      teamId = result.id;

      const board = await caller.board.create({
        name: 'test',
        teamId,
      });

      boardId = board.id;
    });

    it('create space', async () => {
      const caller = await getUserCaller(1);

      const result = await caller.team.createSpace({
        teamId,
        name: randProductName(),
        boards: [boardId],
      });

      expect(result?.id).toBeDefined();
      expect(result?.boards).toHaveLength(1);
    });

    it('get spaces', async () => {
      const caller = await getUserCaller(1);

      const result = await caller.team.spaces({
        teamId,
      });

      expect(result).toHaveLength(1);
      expect(result[0].boards).toHaveLength(1);
    });

    it('update space', async () => {
      const caller = await getUserCaller(1);

      const spaces = await caller.team.spaces({
        teamId,
      });

      const result = await caller.team.updateSpace({
        spaceId: spaces[0].id,
        name: randProductName(),
        boards: [],
      });

      expect(result.id).toEqual(spaces[0].id);
      expect(result.boards).toHaveLength(0);
    });

    it('try to update space from another team', async () => {
      const caller = await getUserCaller(1);
      const caller2 = await getUserCaller(2);

      const spaces = await caller.team.spaces({
        teamId,
      });

      const result = await errorCall(() => {
        return caller2.team.updateSpace({
          spaceId: spaces[0].id,
          name: randProductName(),
          boards: [],
        });
      });

      expect(result?.code).toEqual('UNAUTHORIZED');
    });

    it('try to delete space from another team', async () => {
      const caller = await getUserCaller(1);
      const caller2 = await getUserCaller(2);

      const spaces = await caller.team.spaces({
        teamId,
      });

      const result = await errorCall(() => {
        return caller2.team.deleteSpace({
          spaceId: spaces[0].id,
        });
      });

      expect(result?.code).toEqual('UNAUTHORIZED');
    });

    it('delete space', async () => {
      const caller = await getUserCaller(1);

      const spaces = await caller.team.spaces({
        teamId,
      });

      await caller.team.deleteSpace({
        spaceId: spaces[0].id,
      });

      const result = await caller.team.spaces({
        teamId,
      });

      expect(result).toHaveLength(0);
    });

    it('try to create create space with an invalid board (different team)', async () => {
      const caller = await getUserCaller(1);
      const board = await caller.board.create({
        name: 'test',
      });

      const result = await errorCall(() => {
        return caller.team.createSpace({
          teamId,
          name: randProductName(),
          boards: [board.id],
        });
      });

      expect(result?.code).toEqual('BAD_REQUEST');
    });
  });
});
