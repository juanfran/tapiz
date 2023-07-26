import * as cors from 'cors';
import * as express from 'express';
import { verifyToken } from './auth';
import {
  createBoard,
  getBoards,
  getBoard,
  getBoardOwners,
  deleteBoard,
  deleteAccount,
  leaveBoard,
  createUser,
  getBoardUser,
} from './db';
import * as cookieParser from 'cookie-parser';
import { body, validationResult } from 'express-validator';
import { startWsServer } from './ws-server';

export const app = express();
const port = 8000;
const baseUrl = '/api';

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    credentials: true,
    origin: true,
  })
);

async function authGuard(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const token = req.cookies.auth;

  const error401 = () => {
    return res.status(401).send('Invalid token');
  };

  if (!token) {
    return error401();
  } else {
    const user = await verifyToken(token as string);

    if (user) {
      req.user = user;
    } else {
      return error401();
    }

    return next();
  }
}

app.post(
  `${baseUrl}/new`,
  authGuard,
  body('name').isLength({ min: 1, max: 255 }),
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });

      return;
    }

    await createUser(req.user.sub, req.user.name);

    const name = req.body.name;
    const newBoardId = await createBoard(name, req.user.sub, {
      notes: [],
      groups: [],
      panels: [],
      images: [],
      texts: [],
      vectors: [],
    });

    res.json({
      id: newBoardId,
    });
  }
);

app.delete(`${baseUrl}/delete/:boardId`, authGuard, async (req, res) => {
  const owners = await getBoardOwners(req.params['boardId']);

  if (owners.includes(req.user.sub)) {
    await deleteBoard(req.params['boardId']);

    res.json({
      success: true,
    });
  } else {
    res.status(400).json({
      errors: ['no permissions'],
    });
  }
});

app.delete(`${baseUrl}/leave/:boardId`, authGuard, async (req, res) => {
  const owners = await getBoardOwners(req.params['boardId']);

  if (owners.includes(req.user.sub)) {
    res.status(400).json({
      errors: ['owner can not leave the board'],
    });
  } else {
    await leaveBoard(req.user.sub, req.params['boardId']);
    res.json({
      success: true,
    });
  }
});

app.post(`${baseUrl}/duplicate`, authGuard, async (req, res) => {
  if (!req.body.boardId) {
    res.status(400).json({
      errors: ['boardId is required'],
    });

    return;
  }

  const boardUser = await getBoardUser(req.body.boardId, req.user.sub);
  const board = await getBoard(req.body.boardId);

  if (!boardUser || !board) {
    res.status(404).json({
      errors: ['board not found'],
    });

    return;
  }

  const newBoardId = await createBoard(board.name, req.user.sub, board.board);

  res.json({
    id: newBoardId,
  });
});

app.delete('/remove-account', authGuard, async (req, res) => {
  await deleteAccount(req.user.sub);

  res.json({
    success: true,
  });
});

app.get(`${baseUrl}/board/:boardId`, authGuard, async (req, res) => {
  const board = await getBoard(req.params['boardId']);

  if (!board) {
    res.status(404);
    res.send();
  } else {
    const owners = await getBoardOwners(req.params['boardId']);

    res.json({
      ...board,
      owners,
    });
  }
});

app.get(`${baseUrl}/boards`, authGuard, async (req, res) => {
  const boards = await getBoards(req.user.sub);

  res.json(boards);
});

app.get(`${baseUrl}/user`, authGuard, async (req, res) => {
  res.json({
    name: req.user.name,
    sub: req.user.sub,
  });
});

app.get('*', function (req, res) {
  res.send(req.url);
});

export function startApiServer() {
  const httpServer = app.listen(port, () => {
    console.log(`http://localhost:${port}`);
  });

  startWsServer(httpServer);
}
