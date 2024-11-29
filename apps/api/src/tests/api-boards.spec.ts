import { startDB } from '../app/db/init-db';
import db from '../app/db';
import {
  createMultipleUsers,
  errorCall,
  getAuth,
  getUserCaller,
  usersTest,
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

  afterAll(async () => {
    // delete all test useres boards
    for (let i = 0; i < usersTest.length; i++) {
      await db.board.deleteUserBoards(getAuth(i).sub);
    }
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

    const initialBoards = await caller.board.boards({});

    await caller.board.duplicate({
      boardId: board.id,
    });

    const boards = await caller.board.boards({});

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

  it('transfer board only by admin', async () => {
    const callerUser1 = getUserCaller(1);

    const resultCreateBoard = await callerUser1.board.create({
      name: randProductName(),
      teamId,
    });

    const result = await callerUser1.board.transferBoard({
      boardId: resultCreateBoard.id,
      teamId: undefined,
    });

    const board = await callerUser1.board.board({
      boardId: resultCreateBoard.id,
    });

    expect(result.success).toEqual(true);
    expect(board.teamId).toEqual(null);
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

    let boards = await callerUser7.board.boards({});

    expect(boards.length).toEqual(1);

    await db.team.deleteTeam(team.id);

    boards = await callerUser7.board.boards({});

    expect(boards.length).toEqual(0);
  });

  it('team admin can see other users boards', async () => {
    const callerUser1 = await getUserCaller(1);
    const callerUser70 = await getUserCaller(70);

    const resultCreateBoard = await callerUser70.board.create({
      name: randProductName(),
      teamId,
    });

    const boards = await callerUser1.board.boards({
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

    const initialBoards = await callerUser70.board.boards({});

    const resultLeave = await callerUser70.board.leave({
      boardId: resultCreateBoard.id,
    });

    const boards = await callerUser70.board.boards({});

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

    const boards = await callerUser1.board.boards({
      starred: true,
    });

    expect(boards.length).toEqual(1);

    await callerUser1.board.removeStar({
      boardId: resultCreateBoard.id,
    });

    const boards2 = await callerUser1.board.boards({
      starred: true,
    });

    expect(boards2.length).toEqual(0);
  });

  describe('list boards', () => {
    it('guest user on a public board', async () => {
      const callerUser1 = await getUserCaller(1);
      const callerUser2 = await getUserCaller(2);

      // User 1 creates a public board
      const resultCreateBoard = await callerUser1.board.create({
        name: randProductName(),
      });

      await callerUser1.board.changePrivacy({
        boardId: resultCreateBoard.id,
        isPublic: true,
      });

      // User 2 joins the public board
      await db.board.joinBoard(getAuth(2).sub, resultCreateBoard.id);

      // User 2 should see the board in their boards list
      const boards = await callerUser2.board.boards({});

      const board = boards.find((it) => it.id === resultCreateBoard.id);

      expect(board).toHaveProperty('id');
    });

    it('guest loses access when board becomes private', async () => {
      const callerUser1 = await getUserCaller(55);
      const callerUser2 = await getUserCaller(56);

      // User 55 creates a public board
      const resultCreateBoard = await callerUser1.board.create({
        name: randProductName(),
      });

      await callerUser1.board.changePrivacy({
        boardId: resultCreateBoard.id,
        isPublic: true,
      });

      // User 56 joins the public board
      await db.board.joinBoard(getAuth(56).sub, resultCreateBoard.id);

      // User 56 should see the board in their boards list
      let boards = await callerUser2.board.boards({});

      let board = boards.find((it) => it.id === resultCreateBoard.id);

      expect(board).toHaveProperty('id');

      // User 55 changes the board to private
      await callerUser1.board.changePrivacy({
        boardId: resultCreateBoard.id,
        isPublic: false,
      });

      // User 56 should no longer see the board in their boards list
      boards = await callerUser2.board.boards({});

      board = boards.find((it) => it.id === resultCreateBoard.id);

      expect(board).toBeUndefined();
    });

    it('user removed from team cannot see team boards (even their own)', async () => {
      const callerUser75 = await getUserCaller(75); // Team member

      // User 68 creates a new team
      const team = await db.team.createTeam('test team', getAuth(68).sub);

      // User 68 adds User 75 to the team
      await addTeamMember(getAuth(75).sub, team.id, 'member');

      // User 75 creates a board in the team
      const resultCreateBoard = await callerUser75.board.create({
        name: randProductName(),
        teamId: team.id,
      });

      // User 75 should see the board in their boards list
      let boards = await callerUser75.board.boards({});

      let board = boards.find((it) => it.id === resultCreateBoard.id);

      expect(board).toHaveProperty('id');
      // User 1 removes User 75 from the team
      await db.team.deleteMember(team.id, getAuth(75).sub);

      // User 75 should no longer see the board in their boards list
      boards = await callerUser75.board.boards({});

      board = boards.find((it) => it.id === resultCreateBoard.id);

      expect(board).toBeUndefined();
    });

    it('get boards with limit and offset', async () => {
      const callerUser1 = await getUserCaller(30);

      // Create 5 boards
      for (let i = 0; i < 5; i++) {
        await callerUser1.board.create({
          name: `board ${i}`,
        });
      }

      // Get first 3 boards
      let boards = await callerUser1.board.boards({
        limit: 3,
        offset: 0,
      });

      expect(boards.length).toEqual(3);

      // Get next 2 boards
      boards = await callerUser1.board.boards({
        limit: 2,
        offset: 3,
      });

      expect(boards.length).toEqual(2);
    });

    it('get boards sorted by name', async () => {
      const callerUser1 = await getUserCaller(20);

      // Create boards with specific names
      await callerUser1.board.create({
        name: 'Zebra Board',
      });
      await callerUser1.board.create({
        name: 'Apple Board',
      });
      await callerUser1.board.create({
        name: 'Monkey Board',
      });

      // Get boards sorted by name
      const boards = await callerUser1.board.boards({
        sortBy: 'name',
      });

      expect(boards.length).toBeGreaterThanOrEqual(3);

      // Check that boards are sorted by name
      const boardNames = boards.map((board) => board.name);

      const sortedBoardNames = [...boardNames].sort();

      expect(boardNames.slice(0, 3)).toEqual(sortedBoardNames.slice(0, 3));
    });

    it('get boards by teamId', async () => {
      const callerUser1 = await getUserCaller(1);
      const userId1 = getAuth(1).sub;

      // User 1 creates two teams
      const team1 = await db.team.createTeam('Team 1', userId1);
      const team2 = await db.team.createTeam('Team 2', userId1);

      // User 1 creates boards in both teams
      const boardTeam1 = await callerUser1.board.create({
        name: 'Team1 Board1',
        teamId: team1.id,
      });
      const boardTeam2 = await callerUser1.board.create({
        name: 'Team2 Board1',
        teamId: team2.id,
      });

      // Get boards for team1
      let boards = await callerUser1.board.boards({
        teamId: team1.id,
      });

      expect(boards.length).toEqual(1);
      expect(boards[0].id).toEqual(boardTeam1.id);

      // Get boards for team2
      boards = await callerUser1.board.boards({
        teamId: team2.id,
      });

      expect(boards.length).toEqual(1);
      expect(boards[0].id).toEqual(boardTeam2.id);

      // Get all boards
      boards = await callerUser1.board.boards({});

      expect(boards.length).toBeGreaterThanOrEqual(2);
    });

    it('starred boards with limit and offset', async () => {
      const callerUser1 = await getUserCaller(1);

      // Create and star multiple boards
      const boardIds = [];
      for (let i = 0; i < 5; i++) {
        const board = await callerUser1.board.create({
          name: `Starred Board ${i}`,
        });
        await callerUser1.board.addStar({ boardId: board.id });
        boardIds.push(board.id);
      }

      // Get first 3 starred boards
      let boards = await callerUser1.board.boards({
        starred: true,
        limit: 3,
        offset: 0,
      });

      expect(boards.length).toEqual(3);

      // Get next 2 starred boards
      boards = await callerUser1.board.boards({
        starred: true,
        limit: 2,
        offset: 3,
      });

      expect(boards.length).toEqual(2);
    });

    it('non-team member cannot see team boards', async () => {
      const callerUser1 = await getUserCaller(1);
      const callerUser3 = await getUserCaller(3);

      // User 1 creates a team and a board
      const team = await db.team.createTeam('Exclusive Team', getAuth(1).sub);

      const teamBoard = await callerUser1.board.create({
        name: 'Exclusive Board',
        teamId: team.id,
      });

      // User 3 tries to get team boards
      const result = await errorCall(async () => {
        return await callerUser3.board.boards({
          teamId: team.id,
        });
      });

      expect(result?.code).toEqual('NOT_FOUND');

      // User 3 should not see the team board in their boards list
      const allBoards = await callerUser3.board.boards({});

      const board = allBoards.find((it) => it.id === teamBoard.id);

      expect(board).toBeUndefined();
    });

    it('public boards are visible to all users', async () => {
      const callerUser1 = await getUserCaller(1);
      const callerUser3 = await getUserCaller(3);

      // User 1 creates a public board
      const publicBoard = await callerUser1.board.create({
        name: 'Public Board',
      });

      await callerUser1.board.changePrivacy({
        boardId: publicBoard.id,
        isPublic: true,
      });

      // User 3 should see the public board after joining
      await db.board.joinBoard(getAuth(3).sub, publicBoard.id);

      const boards = await callerUser3.board.boards({});

      const board = boards.find((it) => it.id === publicBoard.id);

      expect(board).toHaveProperty('id');
    });

    it('board ordering with combined options', async () => {
      const callerUser1 = await getUserCaller(31);

      // Create boards with different names and star some of them
      const names = ['Alpha', 'Echo', 'Charlie', 'Delta', 'Bravo'];
      for (const name of names) {
        const board = await callerUser1.board.create({ name });
        if (['Echo', 'Bravo'].includes(name)) {
          await callerUser1.board.addStar({ boardId: board.id });
        }
      }

      // Get starred boards sorted by name
      const boards = await callerUser1.board.boards({
        starred: true,
        sortBy: 'name',
      });

      expect(boards.length).toEqual(2);
      expect(boards[0].name).toEqual('Bravo');
      expect(boards[1].name).toEqual('Echo');
    });
  });

  describe('filter boards by space', () => {
    it('create and list boards in a specific space', async () => {
      const callerUser1 = await getUserCaller(1);
      const teamId = (
        await db.team.createTeam('Team with spaces', getAuth(1).sub)
      ).id;

      // Create a space within the team
      const space = await db.team.createSpace(teamId, 'Space 1');

      // Create boards and associate them with the space
      const boardInSpace = await callerUser1.board.create({
        name: 'Board in Space 1',
        teamId,
      });

      await db.board.addBoardToSpace(boardInSpace.id, space.id);

      // Fetch boards for the space
      const boardsInSpace = await callerUser1.board.boards({
        spaceId: space.id,
        teamId,
      });

      expect(boardsInSpace.length).toEqual(1);
      expect(boardsInSpace[0].id).toEqual(boardInSpace.id);
    });

    it('does not list boards from other spaces', async () => {
      const callerUser1 = await getUserCaller(1);
      const teamId = (
        await db.team.createTeam('Team with spaces', getAuth(1).sub)
      ).id;

      // Create two spaces
      const space1 = await db.team.createSpace(teamId, 'Space 1');

      const space2 = await db.team.createSpace(teamId, 'Space 2');

      // Create a board and assign it to space1
      const boardInSpace1 = await callerUser1.board.create({
        name: 'Board in Space 1',
        teamId,
      });

      await db.board.addBoardToSpace(boardInSpace1.id, space1.id);

      // Fetch boards for space2
      const boardsInSpace2 = await callerUser1.board.boards({
        spaceId: space2.id,
        teamId,
      });

      expect(boardsInSpace2.length).toEqual(0);

      // Fetch boards for space1
      const boardsInSpace1 = await callerUser1.board.boards({
        spaceId: space1.id,
        teamId,
      });

      expect(boardsInSpace1.length).toEqual(1);
      expect(boardsInSpace1[0].id).toEqual(boardInSpace1.id);
    });

    it('guest user cannot see boards in private spaces', async () => {
      const callerUser1 = await getUserCaller(1);
      const callerUser2 = await getUserCaller(2); // Guest user

      const teamId = (
        await db.team.createTeam('Team with private spaces', getAuth(1).sub)
      ).id;

      // Create a private space
      const privateSpace = await db.team.createSpace(teamId, 'Private Space');

      // Create a board and assign it to the private space
      const boardInPrivateSpace = await callerUser1.board.create({
        name: 'Private Space Board',
        teamId,
      });

      await db.board.addBoardToSpace(boardInPrivateSpace.id, privateSpace.id);

      // Guest user tries to fetch boards in the private space
      const result = await errorCall(async () => {
        return await callerUser2.board.boards({
          spaceId: privateSpace.id,
          teamId,
        });
      });

      expect(result?.code).toEqual('NOT_FOUND');
    });
  });
});
