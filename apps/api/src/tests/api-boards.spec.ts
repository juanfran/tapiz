import { startDB } from '../app/db/init-db';
import db from '../app/db';
import {
  createMultipleUsers,
  errorCall,
  getAuth,
  getUserCaller,
} from './test-helpers';
import { randProductName } from '@ngneat/falso';
import { addTeamMember } from '../app/db/user-db';

describe('board', () => {
  let teamId: string;

  beforeAll(async () => {
    await startDB();
    await createMultipleUsers();

    const teamAdmin = getAuth(1).sub;

    const team = await db.team.createTeam('team 1', teamAdmin);

    teamId = team.id;

    await addTeamMember(getAuth(70).sub, team.id, 'member');
  });

  it('create board in team', async () => {
    const caller = await getUserCaller(1);

    const board = await caller.board.create({
      name: 'board 1',
      teamId,
    });

    const getBoard = await caller.board.board({
      boardId: board.id,
    });

    expect(getBoard.id).toEqual(board.id);
  });

  it('try to create board in team without access', async () => {
    const caller = await getUserCaller(5);

    const result = await errorCall(() => {
      return caller.board.create({
        name: 'board 3',
        teamId,
      });
    });

    expect(result?.code).toEqual('UNAUTHORIZED');
  });

  it('duplicate board', async () => {
    const caller = await getUserCaller(1);

    const board = await caller.board.create({
      name: 'board 1',
      teamId,
    });

    const initialBoards = await caller.board.boards();

    await caller.board.duplicate({
      boardId: board.id,
    });

    const boards = await caller.board.boards();

    expect(boards.length).toEqual(initialBoards.length + 1);
  });

  it('can view board', async () => {
    const callerUser1 = getUserCaller(1);
    const callerUser2 = getUserCaller(70);
    const callerUser3 = getUserCaller(3);

    const resultCreateBoard = await callerUser1.board.create({
      name: randProductName(),
      teamId,
    });

    // board admin
    const resultJoinBoard = await callerUser1.board.board({
      boardId: resultCreateBoard.id,
    });

    // team member
    const resultJoinBoard2 = await callerUser2.board.board({
      boardId: resultCreateBoard.id,
    });

    const resultJoinBoard3 = await errorCall(() => {
      return callerUser3.board.board({
        boardId: resultCreateBoard.id,
      });
    });

    expect(resultJoinBoard).toHaveProperty('id');
    expect(resultJoinBoard2).toHaveProperty('id');
    expect(resultJoinBoard3?.code).toEqual('UNAUTHORIZED');
  });

  it('rename board only by admin', async () => {
    const callerUser1 = getUserCaller(1);

    const resultCreateBoard = await callerUser1.board.create({
      name: randProductName(),
      teamId,
    });

    const caller = await getUserCaller(2);

    const result = await errorCall(() => {
      return caller.board.rename({
        boardId: resultCreateBoard.id,
        name: 'new name',
      });
    });

    expect(result?.code).toEqual('UNAUTHORIZED');

    const result2 = await callerUser1.board.rename({
      boardId: resultCreateBoard.id,
      name: 'new name',
    });

    const board = await callerUser1.board.board({
      boardId: resultCreateBoard.id,
    });

    expect(result2.success).toEqual(true);
    expect(board.name).toEqual('new name');
  });

  it('delete board only by admin', async () => {
    const callerUser1 = await getUserCaller(1);
    const callerUser2 = await getUserCaller(2);

    const resultCreateBoard = await callerUser1.board.create({
      name: randProductName(),
      teamId,
    });

    const resultRemoveByUser2 = await errorCall(() => {
      return callerUser2.board.delete({
        boardId: resultCreateBoard.id,
      });
    });

    expect(resultRemoveByUser2?.code).toEqual('UNAUTHORIZED');

    const result2 = await callerUser1.board.delete({
      boardId: resultCreateBoard.id,
    });

    expect(result2.success).toEqual(true);
  });

  it('delete team also delete boards', async () => {
    const callerUser7 = await getUserCaller(7);
    const userId = getAuth(7).sub;

    const team = await db.team.createTeam('team to delete', userId);

    await callerUser7.board.create({
      name: 'board 1',
      teamId: team.id,
    });

    let boards = await callerUser7.board.boards();

    expect(boards.length).toEqual(1);

    await db.team.deleteTeam(team.id);

    boards = await callerUser7.board.boards();

    expect(boards.length).toEqual(0);
  });

  it('team admin can see other users boards', async () => {
    const callerUser1 = await getUserCaller(1);
    const callerUser70 = await getUserCaller(70);

    const resultCreateBoard = await callerUser70.board.create({
      name: randProductName(),
      teamId,
    });

    const boards = await callerUser1.board.teamBoards({
      teamId,
    });

    const board = boards.find((it) => it.id === resultCreateBoard.id);

    expect(board).toHaveProperty('id');
  });

  it('leave public board', async () => {
    const callerUser1 = await getUserCaller(1);
    const callerUser70 = await getUserCaller(70);

    const resultCreateBoard = await callerUser1.board.create({
      name: randProductName(),
    });

    await callerUser1.board.changePrivacy({
      boardId: resultCreateBoard.id,
      isPublic: true,
    });

    await db.board.joinBoard(getAuth(70).sub, resultCreateBoard.id);

    const initialBoards = await callerUser70.board.boards();

    const resultLeave = await callerUser70.board.leave({
      boardId: resultCreateBoard.id,
    });

    const boards = await callerUser70.board.boards();

    expect(resultLeave.success).toEqual(true);
    expect(boards.length).toEqual(initialBoards.length - 1);
  });

  it('starred boards', async () => {
    const callerUser1 = await getUserCaller(1);

    const resultCreateBoard = await callerUser1.board.create({
      name: randProductName(),
    });

    await callerUser1.board.addStar({
      boardId: resultCreateBoard.id,
    });

    const boards = await callerUser1.board.starreds();

    expect(boards.length).toEqual(1);

    await callerUser1.board.removeStar({
      boardId: resultCreateBoard.id,
    });

    const boards2 = await callerUser1.board.starreds();

    expect(boards2.length).toEqual(0);
  });
});
