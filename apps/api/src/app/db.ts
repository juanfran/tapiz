import { CommonState, User } from '@team-up/board-commons';
import { Pool, PoolClient, QueryResult } from 'pg';
import Config from './config';

export let client: PoolClient;
export let pool: Pool | undefined;

export async function startDB() {
  pool = new Pool({
    database: Config.DB_DATABASE,
    host: Config.DB_HOST,
    password: Config.DB_PASSWORD,
    port: Number(Config.DB_PORT_HOST),
    user: Config.DB_USER,
  });

  client = await pool.connect();

  return client;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    .then(getSingleRow)
    .catch(() => undefined);
}

export function getBoardOwners(boardId: string) {
  return client
    .query(
      'SELECT account_id as id FROM account_board where board_id = $1 and is_owner=true',
      [boardId]
    )
    .then((res) => res.rows.map((it) => it.id))
    .catch(() => [] as unknown[]);
}

export function getBoardUser(boardId: string, userId: User['id']) {
  return client
    .query(
      'SELECT visible FROM account_board where board_id = $1 AND account_id = $2',
      [boardId, userId]
    )
    .then(getSingleRow)
    .catch(() => undefined);
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
      'SELECT id, is_owner, name FROM board LEFT JOIN account_board ON account_board.board_id = board.id where account_id = $1 ORDER BY created_on DESC',
      [ownerId]
    )
    .then((res) => res.rows)
    .catch(() => []);
}

export async function createBoard(
  name = 'New board',
  owner: string,
  board: unknown
): Promise<string | Error> {
  const result = await client
    .query(`INSERT INTO board(name, board) VALUES($1, $2) RETURNING id`, [
      name,
      JSON.stringify(board),
    ])
    .catch((e) => console.error(e.stack));

  if (result) {
    const boardRow = getSingleRow(result);

    await client
      .query(
        `INSERT INTO account_board(account_id, board_id, is_owner) VALUES($1, $2, $3)`,
        [owner, boardRow.id, true]
      )
      .catch((e) => console.error(e.stack));

    return boardRow.id;
  }

  return new Error('Error creating project');
}

export async function deleteBoard(boardId: string) {
  return client
    .query(`DELETE FROM board WHERE id=$1;`, [boardId])
    .catch(() => undefined);
}

export async function leaveBoard(userId: string, boardId: string) {
  return client
    .query(`DELETE FROM account_board WHERE board_id=$1 AND account_id=$2;`, [
      boardId,
      userId,
    ])
    .catch(() => undefined);
}

export async function joinBoard(
  userId: string,
  boardId: string
): Promise<void> {
  const result = await client
    .query(
      'SELECT * FROM board LEFT JOIN account_board ON account_board.board_id = board.id where account_id = $1 and board_id = $2',
      [userId, boardId]
    )
    .catch(() => undefined);

  if (result && !result.rows.length) {
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

  return client
    .query(`UPDATE board set board=$1 where id=$2`, [
      JSON.stringify(dbState),
      id,
    ])
    .catch(() => undefined);
}

export function updateAccountBoard(
  boardId: string,
  userId: User['id'],
  visible: boolean
) {
  return client
    .query(
      `UPDATE account_board set visible=$1 where account_id=$2 AND board_id = $3`,
      [visible, userId, boardId]
    )
    .catch(() => undefined);
}

export function updateBoardName(id: string, name: string) {
  return client
    .query(`UPDATE board set name=$1 where id=$2`, [name, id])
    .catch(() => undefined);
}

export function getUserByName(name: string) {
  return client
    .query('SELECT * FROM account WHERE name = $1', [name])
    .then(getSingleRow)
    .catch(() => undefined);
}

export function deleteAccount(ownerId: string): Promise<unknown> {
  return client
    .query('DELETE FROM account_board where account_id = $1', [ownerId])
    .catch(() => undefined);
}
