import * as cors from 'cors';
import * as express from 'express';
import { verifyGoogle } from './auth';
import { createRoom, getRooms, getRoom, getRoomOwners, deleteRoom } from './db';
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
  const newRoomId = await createRoom(name, req.user.sub, {
    notes: [],
    paths: [],
    groups: [],
    panels: [],
    images: [],
    texts: [],
  });

  res.json({
    id: newRoomId,
  });
});

app.delete('/delete/:roomId', authGuard, async (req, res) => {
  await deleteRoom(req.params.roomId);

  res.json({
    success: true,
  });
});

app.get('/room/:roomId', authGuard, async (req, res) => {
  const room = await getRoom(req.params.roomId);
  const owners = await getRoomOwners(req.params.roomId);

  res.json({
    ...room,
    owners,
  });
});

app.get('/rooms', authGuard, async (req, res) => {
  const rooms = await getRooms(req.user.sub);

  res.json(rooms);
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
