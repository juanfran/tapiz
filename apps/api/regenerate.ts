import { Client } from 'pg';
import Config from './src/app/config';

async function createDatabase() {
  // move to env variables https://node-postgres.com/features/connecting
  const client = new Client({
    database: Config.db.database,
    host: Config.db.host,
    password: Config.db.password,
    port: Config.db.port,
    user: Config.db.user,
  });

  client.connect();

  console.log('drop tables');
  await client.query(`
    DROP TABLE if exists rooms, users cascade;
    DROP TABLE if exists room, account_room cascade;
  `);

  console.log('create extensions');
  await client.query(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  `);

  console.log('create room');
  await client.query(`
    CREATE TABLE room (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR (255) NOT NULL,
      board json NOT NULL,
      created_on TIMESTAMP NOT NULL DEFAULT now()
    );
  `);

  console.log('create account_room');
  await client.query(`
    CREATE TABLE account_room (
      account_id VARCHAR (255),
      room_id uuid NOT NULL REFERENCES room(id) ON DELETE CASCADE,
      is_owner boolean DEFAULT false,
      visible boolean DEFAULT false,
      PRIMARY KEY (account_id, room_id)
    );
  `);

  await client.end();
  console.log('end');
}

async function createFakeData() {
  const client = new Client({
    database: Config.db.database,
    host: Config.db.host,
    password: Config.db.password,
    port: Config.db.port,
    user: Config.db.user,
  });

  client.connect();

  const ownerId = '1';

  console.log(`admin id: ${ownerId}`);

  const emptyRoom = {
    notes: [],
    paths: [],
    groups: [],
    panels: [],
    images: [],
    texts: [],
  };

  const result = await client.query(
    `INSERT INTO room(name, board) VALUES($1, $2) RETURNING id`,
    ['Example', JSON.stringify(emptyRoom)]
  );

  await client.query(
    `INSERT INTO account_room(account_id, room_id, is_owner) VALUES($1, $2, $3)`,
    [ownerId, result.rows[0].id, true]
  );

  console.log(`use this room ${result.rows[0].id}`);
  process.exit();
}

createDatabase().then(() => {
  createFakeData();
});
