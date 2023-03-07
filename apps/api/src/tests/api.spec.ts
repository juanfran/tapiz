import { app } from '../app/api-server';
import * as request from 'supertest';
import {
  randParagraph,
  randProductName,
  randText,
  randUuid,
} from '@ngneat/falso';
import { startDB } from '../app/db';

const userId = randUuid();

jest.mock('../app/auth', () => {
  return {
    verifyGoogle: () =>
      Promise.resolve({
        sub: userId,
      }),
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
    it('new board - validation', async () => {
      const res = await request(app)
        .post('/new')
        .send({
          name: randText({ charCount: 256 }),
        })
        .set('Cookie', ['auth=123']);

      expect(res.statusCode).toEqual(400);
    });

    it('new board - success', async () => {
      const boardName = randText({ charCount: 255 });

      const res = await request(app)
        .post('/new')
        .send({
          name: boardName,
        })
        .set('Cookie', ['auth=123']);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('id');

      const resBoard = await request(app)
        .get(`/board/${res.body.id}`)
        .set('Accept', 'application/json')
        .set('Cookie', ['auth=123']);

      expect(resBoard.statusCode).toEqual(200);

      expect(resBoard.body.name).toEqual(boardName);

      expect(resBoard.body.board).toEqual({
        notes: [],
        groups: [],
        panels: [],
        images: [],
        texts: [],
      });
      expect(resBoard.body.owners).toEqual([userId]);
    });
  });

  it('board not found', (done) => {
    request(app).get('/boards/xxx').expect(404, done);
  });
});
