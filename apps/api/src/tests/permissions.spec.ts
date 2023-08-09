import { startDB } from '../app/db/init-db';
import {
  createMultipleUsers,
  errorCall,
  getAuth,
  getUserCaller,
} from './test-helpers';
import { randProductName, randUuid } from '@ngneat/falso';
import { testRouter } from './routes-test';

describe('permissions', () => {
  let teamId: string;
  let boardId: string;

  beforeAll(async () => {
    await startDB();
    await createMultipleUsers();

    /*
      team admin: user1
      team member: user2, user3
      board admin: user2
    */

    const callerUser1 = await getUserCaller(1);
    const callerUser2 = await getUserCaller(2);
    const callerUser3 = await getUserCaller(3);

    const resultCreateTeam = await callerUser1.team.new({
      name: randProductName(),
    });

    teamId = resultCreateTeam.id;

    // user1 invite user2 team
    const resultInviteMember2 = await callerUser1.team.invite({
      email: getAuth(2).email,
      teamId,
      role: 'member',
    });

    await callerUser2.user.acceptInvite({
      inviteId: resultInviteMember2.id,
    });

    // user1 invite user3 team
    const resultInviteMember3 = await callerUser1.team.invite({
      email: getAuth(3).email,
      teamId,
      role: 'member',
    });

    await callerUser3.user.acceptInvite({
      inviteId: resultInviteMember3.id,
    });

    const board = await callerUser2.board.create({
      name: randProductName(),
      teamId,
    });

    boardId = board.id;
  });

  it('no user', async () => {
    const caller = testRouter.createCaller({
      user: null,
    });

    const result = await errorCall(async () => {
      return caller.protected();
    });

    expect(result?.code).toEqual('UNAUTHORIZED');
  });

  it('login user', async () => {
    const user = getAuth(1);

    const caller = testRouter.createCaller({
      user,
    });

    const result = await caller.protected();

    expect(result?.ctx.user).toEqual(user);
  });

  describe('team', () => {
    it('team not found', async () => {
      const user = getAuth(1);

      const caller = testRouter.createCaller({
        user,
      });

      const result = await errorCall(async () => {
        return caller.team({
          teamId: randUuid(),
        });
      });

      expect(result?.code).toEqual('NOT_FOUND');
    });

    it('team admin not authorized', async () => {
      const user = getAuth(2);

      const caller = testRouter.createCaller({
        user,
      });

      const result = await errorCall(async () => {
        return caller.teamAdmin({
          teamId,
        });
      });

      expect(result?.code).toEqual('UNAUTHORIZED');
    });

    it('team admin', async () => {
      const user = getAuth(1);

      const caller = testRouter.createCaller({
        user,
      });

      const result = await caller.teamAdmin({
        teamId,
      });

      expect(result.ctx.userTeam.accountId).toBeTruthy();
    });

    it('team member not authorized', async () => {
      const user = getAuth(9);

      const caller = testRouter.createCaller({
        user,
      });

      const result = await errorCall(async () => {
        return caller.teamMember({
          teamId,
        });
      });

      expect(result?.code).toEqual('UNAUTHORIZED');
    });

    it('team member', async () => {
      const user = getAuth(2);

      const caller = testRouter.createCaller({
        user,
      });

      const result = await caller.teamMember({
        teamId,
      });

      expect(result.ctx.userTeam.accountId).toBeTruthy();
    });
  });

  describe('board', () => {
    it('board not found', async () => {
      const user = getAuth(1);

      const caller = testRouter.createCaller({
        user,
      });

      const result = await errorCall(async () => {
        return caller.board({
          boardId: randUuid(),
        });
      });

      expect(result?.code).toEqual('NOT_FOUND');
    });

    it('board admin not authorized', async () => {
      const user = getAuth(9);

      const caller = testRouter.createCaller({
        user,
      });

      const result = await errorCall(async () => {
        return caller.boardAdmin({
          boardId,
        });
      });

      expect(result?.code).toEqual('UNAUTHORIZED');
    });

    it('board admin', async () => {
      const user = getAuth(2);

      const caller = testRouter.createCaller({
        user,
      });

      const result = await caller.boardAdmin({
        boardId,
      });

      expect(result.ctx.board.id).toEqual(boardId);
    });

    it('board team admin', async () => {
      const user = getAuth(1);

      const caller = testRouter.createCaller({
        user,
      });

      const result = await caller.boardAdmin({
        boardId,
      });

      expect(result.ctx.board.id).toEqual(boardId);
    });

    it('board member not authorized', async () => {
      const user = getAuth(9);

      const caller = testRouter.createCaller({
        user,
      });

      const result = await errorCall(async () => {
        return caller.boardMember({
          boardId,
        });
      });

      expect(result?.code).toEqual('UNAUTHORIZED');
    });

    it('board member', async () => {
      const user = getAuth(3);

      const caller = testRouter.createCaller({
        user,
      });

      const result = await caller.boardMember({
        boardId,
      });

      expect(result.ctx.board.id).toEqual(boardId);
    });
  });
});
