import { CommonState, User } from '@team-up/board-commons';
import { Pool, PoolClient, QueryResult } from 'pg';
import Config from './config';

export let client: PoolClient;

export function startDB() {
  return new Promise((resolve) => {
    // move to env variables https://node-postgres.com/features/connecting
    const pool = new Pool({
      database: Config.db.database,
      host: Config.db.host,
      password: Config.db.password,
      port: Config.db.port,
      user: Config.db.user,
    });

    pool.connect((err, _client, done) => {
      if (err) throw err;

      client = _client;

      resolve(client);
    });
  });
}

function getSingleRow(res: QueryResult<any>) {
  if (res.rows) {
    return res.rows[0];
  }

  return null;
}

export function getRoom(roomId: string): Promise<
  | {
      id: string;
      owner: string;
      board: CommonState;
      created_on: string;
    }
  | undefined
> {
  return client
    .query('SELECT * FROM room WHERE id = $1', [roomId])
    .then(getSingleRow);
}

export function getRoomOwners(roomId: string) {
  return client
    .query(
      'SELECT account_id as id FROM account_room where room_id = $1 and is_owner=true',
      [roomId]
    )
    .then((res) => res.rows.map((it) => it.id));
}

export function getRoomUser(roomId: string, userId: User['id']) {
  return client
    .query(
      'SELECT visible FROM account_room where room_id = $1 AND account_id = $2',
      [roomId, userId]
    )
    .then(getSingleRow);
}

export function getRooms(ownerId: string): Promise<
  {
    id: string;
    owner: string;
    board: CommonState;
    created_on: string;
  }[]
> {
  return client
    .query(
      'SELECT * FROM room LEFT JOIN account_room ON account_room.room_id = room.id where account_id = $1 ORDER BY created_on DESC',
      [ownerId]
    )
    .then((res) => res.rows);
}

export async function createRoom(
  name = 'New board',
  owner: string,
  board: unknown
): Promise<string> {
  const result = await client.query(
    `INSERT INTO room(name, board) VALUES($1, $2) RETURNING id`,
    [name, JSON.stringify(board)]
  );

  const room = getSingleRow(result);

  await client.query(
    `INSERT INTO account_room(account_id, room_id, is_owner) VALUES($1, $2, $3)`,
    [owner, room.id, true]
  );

  return room.id;
}

export async function deleteRoom(
  roomId: string
) {
  return client.query(
    `DELETE FROM room WHERE id=$1;`,
    [roomId]
  );
}

export async function joinRoom(userId: string, roomId: string): Promise<void> {
  const result = await client.query(
    'SELECT * FROM room LEFT JOIN account_room ON account_room.room_id = room.id where account_id = $1 and room_id = $2',
    [userId, roomId]
  );

  if (!result.rows.length) {
    await client.query(
      `INSERT INTO account_room(account_id, room_id, is_owner) VALUES($1, $2, $3)`,
      [userId, roomId, false]
    );
  }
}

export function updateBoard(id: string, board: CommonState) {
  const dbState = {
    notes: board.notes,
    paths: board.paths,
    groups: board.groups,
    panels: board.panels,
    images: board.images,
    texts: board.texts,
  };

  return client.query(`UPDATE room set board=$1 where id=$2`, [
    JSON.stringify(dbState),
    id,
  ]);
}

export function updateAccountRoom(
  roomId: string,
  userId: User['id'],
  visible: boolean
) {
  return client.query(
    `UPDATE account_room set visible=$1 where account_id=$2 AND room_id = $3`,
    [visible, userId, roomId]
  );
}

export function updateBoardName(id: string, name: string) {
  return client.query(`UPDATE room set name=$1 where id=$2`, [name, id]);
}

export function getUserByName(name: string) {
  return client
    .query('SELECT * FROM account WHERE name = $1', [name])
    .then(getSingleRow);
}

// export async function demo() {
//   const user = await getUserByName('user1');

//   const newRoomId = await createRoom(user.id, {
//     notes: [],
//     paths: [],
//     groups: [],
//     panels: [],
//   });

//   let room = await getRoom(newRoomId);

//   if (room) {
//     updateBoard(room.id, room.board);

//     room = await getRoom(newRoomId);

//     console.log('nuevo', room);
//   }
// };
