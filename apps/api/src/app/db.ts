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

export function getBoard(boardId: string): Promise<
  | {
      id: string;
      owner: string;
      board: CommonState;
      created_on: string;
    }
  | undefined
> {
  return client
    .query('SELECT * FROM board WHERE id = $1', [boardId])
    .then(getSingleRow);
}

export function getBoardOwners(boardId: string) {
  return client
    .query(
      'SELECT account_id as id FROM account_board where board_id = $1 and is_owner=true',
      [boardId]
    )
    .then((res) => res.rows.map((it) => it.id));
}

export function getBoardUser(boardId: string, userId: User['id']) {
  return client
    .query(
      'SELECT visible FROM account_board where board_id = $1 AND account_id = $2',
      [boardId, userId]
    )
    .then(getSingleRow);
}

export function getBoards(ownerId: string): Promise<
  {
    id: string;
    owner: string;
    board: CommonState;
    created_on: string;
  }[]
> {
  return client
    .query(
      'SELECT * FROM board LEFT JOIN account_board ON account_board.board_id = board.id where account_id = $1 ORDER BY created_on DESC',
      [ownerId]
    )
    .then((res) => res.rows);
}

export async function createBoard(
  name = 'New board',
  owner: string,
  board: unknown
): Promise<string> {
  const result = await client.query(
    `INSERT INTO board(name, board) VALUES($1, $2) RETURNING id`,
    [name, JSON.stringify(board)]
  );

  const boardRow = getSingleRow(result);

  await client.query(
    `INSERT INTO account_board(account_id, board_id, is_owner) VALUES($1, $2, $3)`,
    [owner, boardRow.id, true]
  );

  return boardRow.id;
}

export async function deleteBoard(boardId: string) {
  return client.query(`DELETE FROM board WHERE id=$1;`, [boardId]);
}

export async function joinBoard(
  userId: string,
  boardId: string
): Promise<void> {
  const result = await client.query(
    'SELECT * FROM board LEFT JOIN account_board ON account_board.board_id = board.id where account_id = $1 and board_id = $2',
    [userId, boardId]
  );

  if (!result.rows.length) {
    await client.query(
      `INSERT INTO account_board(account_id, board_id, is_owner) VALUES($1, $2, $3)`,
      [userId, boardId, false]
    );
  }
}

export function updateBoard(id: string, board: CommonState) {
  const dbState = {
    notes: board.notes,
    groups: board.groups,
    panels: board.panels,
    images: board.images,
    texts: board.texts,
  };

  return client.query(`UPDATE board set board=$1 where id=$2`, [
    JSON.stringify(dbState),
    id,
  ]);
}

export function updateAccountBoard(
  boardId: string,
  userId: User['id'],
  visible: boolean
) {
  return client.query(
    `UPDATE account_board set visible=$1 where account_id=$2 AND board_id = $3`,
    [visible, userId, boardId]
  );
}

export function updateBoardName(id: string, name: string) {
  return client.query(`UPDATE board set name=$1 where id=$2`, [name, id]);
}

export function getUserByName(name: string) {
  return client
    .query('SELECT * FROM account WHERE name = $1', [name])
    .then(getSingleRow);
}

export function deleteAccount(ownerId: string): Promise<unknown> {
  return client.query('DELETE FROM account_board where account_id = $1', [
    ownerId,
  ]);
}
