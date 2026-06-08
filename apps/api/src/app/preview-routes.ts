import { FastifyInstance } from 'fastify';
import db from './db/index.js';
import { getServer } from './global.js';

function authorized(req: { headers: Record<string, unknown> }) {
  const token = process.env['PREVIEW_WORKER_TOKEN'];
  if (!token) {
    return false;
  }
  return req.headers['x-preview-token'] === token;
}

export async function registerPreviewRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: { boardId: string } }>(
    '/api/preview/boards/:boardId/snapshot',
    async (req, rep) => {
      if (!authorized(req)) {
        return rep.code(401).send({ error: 'Unauthorized' });
      }

      const liveState = getServer()?.getBoard(req.params.boardId);
      if (liveState) {
        return { id: req.params.boardId, board: liveState };
      }

      const board = await db.board.getBoard(req.params.boardId);
      if (!board) {
        return rep.code(404).send({ error: 'Not found' });
      }
      return { id: board.id, board: board.board };
    },
  );

  fastify.get('/api/preview/next-dirty', async (req, rep) => {
    if (!authorized(req)) {
      return rep.code(401).send({ error: 'Unauthorized' });
    }

    const boardId = await db.board.getNextDirtyBoardId();
    return { boardId: boardId ?? null };
  });

  fastify.post<{ Params: { boardId: string }; Body: { generated: boolean } }>(
    '/api/preview/boards/:boardId/complete',
    async (req, rep) => {
      if (!authorized(req)) {
        return rep.code(401).send({ error: 'Unauthorized' });
      }

      await db.board.markPreviewGenerated(
        req.params.boardId,
        !!req.body?.generated,
      );
      return { ok: true };
    },
  );
}
