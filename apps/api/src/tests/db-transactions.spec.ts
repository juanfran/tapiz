import { startDB } from '../app/db/init-db';
import db from '../app/db';
import { createMultipleUsers, getAuth, usersTest } from './test-helpers';

describe('DB Transactions', () => {
  beforeAll(async () => {
    await startDB();
    await createMultipleUsers();
  });

  afterAll(async () => {
    for (let i = 0; i < usersTest.length; i++) {
      await db.board.deleteUserBoards(getAuth(i).sub);
    }
  });

  describe('createBoard Transaction', () => {
    it('erstellt Board und accounts_boards-Eintrag atomar', async () => {
      const userId = getAuth(0).sub;
      const board = await db.board.createBoard(
        'Transaction Test',
        userId,
        [],
        null,
      );

      expect(board).toBeDefined();
      expect(board.id).toBeDefined();
      expect(board.name).toBe('Transaction Test');

      const boardUser = await db.board.getBoardUser(board.id, userId);
      expect(boardUser).toBeDefined();
      expect(boardUser?.role).toBe('admin');
    });
  });

  describe('deleteBoard Transaction', () => {
    it('löscht Board und zugehörige Daten atomar', async () => {
      const userId = getAuth(1).sub;
      const board = await db.board.createBoard(
        'Delete Test',
        userId,
        [],
        null,
      );

      await db.board.addStarredBoard(userId, board.id);

      const starredBefore = await db.board.getBoards(userId, { starred: true });
      expect(starredBefore.some((b) => b.id === board.id)).toBe(true);

      await db.board.deleteBoard(board.id);

      const deleted = await db.board.getBoard(board.id);
      expect(deleted).toBeUndefined();

      const starredAfter = await db.board.getBoards(userId, { starred: true });
      expect(starredAfter.some((b) => b.id === board.id)).toBe(false);
    });
  });

  describe('getBoardAdmins', () => {
    it('gibt Board- und Team-Admins zurück', async () => {
      const adminId = getAuth(2).sub;
      const board = await db.board.createBoard(
        'Admin Test',
        adminId,
        [],
        null,
      );

      const admins = await db.board.getBoardAdmins(board.id);
      expect(admins).toContain(adminId);
    });

    it('gibt leeres Array für unbekanntes Board zurück', async () => {
      const admins = await db.board.getBoardAdmins(
        '00000000-0000-0000-0000-000000000000',
      );
      expect(admins).toEqual([]);
    });
  });

  describe('haveAccess', () => {
    it('gibt true für Board-Admin zurück', async () => {
      const userId = getAuth(3).sub;
      const board = await db.board.createBoard(
        'Access Test',
        userId,
        [],
        null,
      );

      const access = await db.board.haveAccess(board.id, userId);
      expect(access).toBe(true);
    });

    it('gibt false für unbekannten User zurück', async () => {
      const userId = getAuth(4).sub;
      const board = await db.board.createBoard(
        'No Access Test',
        userId,
        [],
        null,
      );

      const access = await db.board.haveAccess(board.id, 'unknown-user-id');
      expect(access).toBe(false);
    });

    it('gibt true für öffentliches Board zurück', async () => {
      const userId = getAuth(5).sub;
      const board = await db.board.createBoard(
        'Public Test',
        userId,
        [],
        null,
      );

      await db.board.setBoardPrivacy(board.id, true);

      const access = await db.board.haveAccess(board.id, 'any-user-id');
      expect(access).toBe(true);
    });
  });
});
