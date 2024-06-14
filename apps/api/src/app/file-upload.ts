import { FastifyInstance, FastifyReply } from 'fastify';
import multer from 'fastify-multer';
import db from './db/index.js';
import path from 'path';
import { v4 } from 'uuid';
import { createContext } from './auth.context.js';
import { FastifyRequest } from 'fastify/types/request.js';
import fastifyStatics from '@fastify/static';
import { unlink } from 'node:fs';

interface CheckAccessSuccess {
  success: true;
}

interface CheckAccessError {
  success: false;
  code: number;
  error: string;
}

type CheckAccessResult = CheckAccessSuccess | CheckAccessError;

const uploadFolder = path.join(import.meta.dirname, '../../../uploads');

async function checkAccess(
  req: FastifyRequest<{
    Body: {
      boardId: string;
    };
  }>,
  res: FastifyReply,
): Promise<CheckAccessResult> {
  const context = await createContext({ req, res });

  if (!context.user) {
    return { success: false, code: 401, error: 'Unauthorized' };
  }

  const board = await db.board.getBoard(req.body.boardId);

  if (!board) {
    return { success: false, code: 404, error: 'Board not found' };
  }

  const haveAccess = await db.board.haveAccess(
    req.body.boardId,
    context.user.sub,
  );

  if (!haveAccess) {
    return { success: false, code: 401, error: 'Unauthorized' };
  }

  return { success: true };
}

export async function fileUpload(fastify: FastifyInstance) {
  fastify.register(multer.contentParser);
  fastify.register(fastifyStatics, {
    root: uploadFolder,
    prefix: '/uploads/',
  });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, './uploads/');
    },
    filename: (req, file, cb) => {
      const extension = path.extname(file.originalname);

      const newName = v4() + extension;

      cb(null, newName);
    },
  });

  const upload = multer({ storage });
  fastify.route<{
    Body: {
      boardId: string;
    };
  }>({
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute',
      },
    },
    method: 'POST',
    url: '/api/upload-file-board',
    preHandler: upload.single('file'),
    handler: async (req, res) => {
      const access = await checkAccess(req, res);

      if (!access.success) {
        res.code(access.code);
        return { error: access.error };
      }

      // TODO: fix types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (req as any).file;

      if (!data) {
        res.code(400);
        return { error: 'Error uploading file' };
      }

      await db.board.addFileToBoard(req.body.boardId, data.filename);

      return {
        url: data.filename,
      };
    },
  });

  fastify.route<{
    Params: {
      filename: string;
    };
  }>({
    method: 'GET',
    url: '/api/uploads/:filename',
    handler: async (req, res) => {
      return res.sendFile(req.params.filename);
    },
  });
}

export async function deleteBoardFiles(boardId: string) {
  const files = await db.board.getBoardFiles(boardId);

  for (const file of files) {
    unlink(path.join(uploadFolder + '/' + file.name), (err) => {
      console.log(err);
    });
  }
}
