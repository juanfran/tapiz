import * as cors from 'cors';
import * as express from 'express';
import { verifyGoogle } from './auth';
import {
  createBoard,
  getBoards,
  getBoard,
  getBoardOwners,
  deleteBoard,
} from './db';
import * as cookieParser from 'cookie-parser';
import { TokenPayload } from 'google-auth-library';

declare global {
  namespace Express {
    interface Request {
      user: TokenPayload;
    }
  }
}

const app = express();
const port = 8000;

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
    const user = await verifyGoogle(token as string);

    if (user) {
      req.user = user;
    } else {
      return error401();
    }

    return next();
  }
}

app.post('/new', authGuard, async (req, res) => {
  const name = req.body.name;
  const newBoardId = await createBoard(name, req.user.sub, {
    notes: [],
    groups: [],
    panels: [],
    images: [],
    texts: [],
  });

  res.json({
    id: newBoardId,
  });
});

app.delete('/delete/:boardId', authGuard, async (req, res) => {
  await deleteBoard(req.params.boardId);

  res.json({
    success: true,
  });
});

app.get('/board/:boardId', authGuard, async (req, res) => {
  const board = await getBoard(req.params.boardId);
  const owners = await getBoardOwners(req.params.boardId);

  res.json({
    ...board,
    owners,
  });
});

app.get('/boards', authGuard, async (req, res) => {
  const boards = await getBoards(req.user.sub);

  res.json(boards);
});

app.get('/user', authGuard, async (req, res) => {
  res.json({
    name: req.user.name,
    picture: req.user.picture,
    sub: req.user.sub,
  });
});

export function startApiServer() {
  app.listen(port, () => {
    console.log(`http://localhost:${port}`);
  });
}
