import { app } from '../app/api-server';
import * as request from 'supertest';
import {
  randFirstName,
  randProductName,
  randText,
  randUuid,
} from '@ngneat/falso';
import { startDB, joinBoard, createBoard } from '../app/db';

const userId = randUuid();
const initBoard = {
  notes: [],
  groups: [],
  panels: [],
  images: [],
  texts: [],
  vectors: [],
};

const users: Record<string, string> = {
  'user-1': userId,
  'user-2': randUuid(),
  'user-3': randUuid(),
};

const usersNames: Record<string, string> = {
  'user-1': randFirstName(),
  'user-2': randFirstName(),
  'user-3': randFirstName(),
};

jest.mock('../app/auth', () => {
  return {
    verifyToken: (id: number) => {
      return Promise.resolve({
        sub: users[id],
        name: usersNames[id],
      });
    },
  };
});

describe('Api', () => {
  beforeAll(() => {
    startDB();
  });

  it('unauthorized', async () => {
    const res = await request(app).post('/new').send({
      name: randProductName(),
    });
    expect(res.statusCode).toEqual(401);
  });

  describe('new board', () => {
    let boardId: string;
    const boardName = randText({ charCount: 255 });

    it('new board - validation', async () => {
      const res = await request(app)
        .post('/new')
        .send({
          name: randText({ charCount: 256 }),
        })
        .set('Cookie', ['auth=user-1']);

      expect(res.statusCode).toEqual(400);
    });

    it('new board - success', async () => {
      const res = await request(app)
        .post('/new')
        .send({
          name: boardName,
        })
        .set('Cookie', ['auth=user-1']);

      boardId = res.body.id;

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('id');
    });

    it('get board', async () => {
      const res = await request(app)
        .get(`/board/${boardId}`)
        .set('Accept', 'application/json')
        .set('Cookie', ['auth=user-1']);

      expect(res.statusCode).toEqual(200);

      expect(res.body.name).toEqual(boardName);

      expect(res.body.board).toEqual(initBoard);
      expect(res.body.owners).toEqual([userId]);
    });

    it('delete without permissions', async () => {
      const res = await request(app)
        .delete(`/delete/${boardId}`)
        .set('Accept', 'application/json')
        .set('Cookie', ['auth=user-2']);

      expect(res.statusCode).toEqual(400);
    });

    it('delete with permissions', async () => {
      const res = await request(app)
        .delete(`/delete/${boardId}`)
        .set('Accept', 'application/json')
        .set('Cookie', ['auth=user-1']);

      expect(res.statusCode).toEqual(200);

      const resGetBoard = await request(app)
        .get(`/board/${boardId}`)
        .set('Accept', 'application/json')
        .set('Cookie', ['auth=user-1']);

      expect(resGetBoard.statusCode).toEqual(404);
    });
  });

  describe('leave board', () => {
    let boardId: string;
    const boardName = randText({ charCount: 255 });

    beforeAll(async () => {
      const res = await request(app)
        .post('/new')
        .send({
          name: boardName,
        })
        .set('Cookie', ['auth=user-1']);

      boardId = res.body.id;

      // user2 joins
      await joinBoard('user-2', boardId);
    });

    it('owner can not leave', async () => {
      const res = await request(app)
        .delete(`/leave/${boardId}`)
        .set('Accept', 'application/json')
        .set('Cookie', ['auth=user-1']);

      expect(res.statusCode).toEqual(400);
    });

    it('guest can leave', async () => {
      const res = await request(app)
        .delete(`/leave/${boardId}`)
        .set('Accept', 'application/json')
        .set('Cookie', ['auth=user-2']);

      expect(res.statusCode).toEqual(200);
    });
  });

  it('remove account', async () => {
    const res = await request(app)
      .delete(`/remove-account`)
      .set('Accept', 'application/json')
      .set('Cookie', ['auth=user-1']);

    expect(res.statusCode).toEqual(200);
  });

  describe('get boards', () => {
    let board1: string;
    let board2: string;

    beforeAll(async () => {
      board1 = (await createBoard(
        'board 1',
        users['user-1'],
        initBoard
      )) as string;
      board2 = (await createBoard(
        'board 2',
        users['user-1'],
        initBoard
      )) as string;

      await joinBoard(users['user-2'], board1);
      await joinBoard(users['user-2'], board2);
    });

    it('user without boards', async () => {
      const res = await request(app)
        .get(`/boards/`)
        .set('Accept', 'application/json')
        .set('Cookie', ['auth=user-3']);

      expect(res.statusCode).toEqual(200);

      expect(res.body).toEqual([]);
    });

    it('owner with 2 boards', async () => {
      const res = await request(app)
        .get(`/boards/`)
        .set('Accept', 'application/json')
        .set('Cookie', ['auth=user-1']);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual([
        {
          id: board2,
          is_owner: true,
          name: 'board 2',
        },
        {
          id: board1,
          is_owner: true,
          name: 'board 1',
        },
      ]);
    });

    it('guest with 2 boards', async () => {
      const res = await request(app)
        .get(`/boards/`)
        .set('Accept', 'application/json')
        .set('Cookie', ['auth=user-2']);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual([
        {
          id: board2,
          is_owner: false,
          name: 'board 2',
        },
        {
          id: board1,
          is_owner: false,
          name: 'board 1',
        },
      ]);
    });
  });

  it('user', async () => {
    const res = await request(app)
      .get(`/user`)
      .set('Accept', 'application/json')
      .set('Cookie', ['auth=user-1']);

    expect(res.body).toEqual({
      name: usersNames['user-1'],
      sub: users['user-1'],
    });
  });

  it('board not found', (done) => {
    request(app).get('/boards/xxx').expect(404, done);
  });
});
