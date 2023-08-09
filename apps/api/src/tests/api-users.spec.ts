import db from '../app/db';
import { startDB } from '../app/db/init-db';
import { createMultipleUsers, getAuth, getUserCaller } from './test-helpers';

describe('user', () => {
  beforeAll(async () => {
    await startDB();
    await createMultipleUsers();
  });

  it('delete account should delete user', async () => {
    const caller = await getUserCaller(5);

    await caller.user.removeAccount();

    const user = await db.user.getUser(getAuth(5).sub);

    expect(user).toBeFalsy();
  });

  it('delete account should delete empty team/board', async () => {
    const caller = await getUserCaller(6);

    const resultCreateTeam = await caller.team.new({
      name: 'test',
    });

    const teamId = resultCreateTeam.id;

    const resultCreateBoard = await caller.board.create({
      name: 'test',
      teamId,
    });

    const boardId = resultCreateBoard.id;

    await caller.user.removeAccount();

    const team = await db.team.getTeam(teamId);
    const board = await db.board.getBoard(boardId);

    expect(team).toBeFalsy();
    expect(board).toBeFalsy();
  });

  it('delete account should transfer ownership', async () => {
    const caller = await getUserCaller(7);
    const newAdmin = await getUserCaller(8);

    const resultCreateTeam = await caller.team.new({
      name: 'test',
    });

    const teamId = resultCreateTeam.id;

    await caller.board.create({
      name: 'test',
      teamId,
    });

    const publicBoard = await caller.board.create({
      name: 'test2',
    });

    await caller.board.changePrivacy({
      boardId: publicBoard.id,
      isPublic: true,
    });

    await db.board.joinBoard(getAuth(8).sub, publicBoard.id);

    await newAdmin.board.board({
      boardId: publicBoard.id,
    });

    // invite to team
    const teamInvitation = await caller.team.invite({
      email: getAuth(8).email,
      teamId,
      role: 'member',
    });
    await newAdmin.user.acceptInvite({
      inviteId: teamInvitation.id,
    });

    await caller.user.removeAccount();

    const teams = await newAdmin.team.getAll();
    const boards = await newAdmin.board.boards();

    expect(teams[0].teamMember.role).toEqual('admin');
    expect(boards[0].role).toEqual('admin');
    expect(boards[1].role).toEqual('admin');
  });

  describe('invites', () => {
    let caller: Awaited<ReturnType<typeof getUserCaller>>;
    let caller2: Awaited<ReturnType<typeof getUserCaller>>;
    let caller3: Awaited<ReturnType<typeof getUserCaller>>;
    let resultCreateTeam: Awaited<ReturnType<typeof caller.team.new>>;

    beforeAll(async () => {
      caller = await getUserCaller(1);
      caller2 = await getUserCaller(2);
      caller3 = await getUserCaller(3);

      resultCreateTeam = await caller.team.new({
        name: 'test',
      });
    });

    it('invite', async () => {
      await caller.team.invite({
        email: getAuth(2).email,
        teamId: resultCreateTeam.id,
        role: 'member',
      });

      await caller.team.invite({
        email: getAuth(3).email,
        teamId: resultCreateTeam.id,
        role: 'member',
      });

      await caller.team.invite({
        email: getAuth(4).email,
        teamId: resultCreateTeam.id,
        role: 'member',
      });

      const invites = await caller2.user.invites();

      expect(invites.length).toEqual(1);
    });

    it('accept invite', async () => {
      const invites = await caller2.user.invites();

      const result = await caller2.user.acceptInvite({
        inviteId: invites[0].id,
      });

      expect(result.success).toEqual(true);

      const invites2 = await caller2.user.invites();

      expect(invites2).toHaveLength(0);
    });

    it('cancel invite', async () => {
      const invites = await caller3.user.invites();

      expect(invites).toHaveLength(1);

      await caller.user.cancelInvite({
        inviteId: invites[0].id,
      });

      const invites2 = await caller3.user.invites();

      expect(invites2).toHaveLength(0);
    });
  });
});
