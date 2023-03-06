import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function createDatabase() {
  const client = new Client({
    database: process.env['POSTGRES_DB'],
    host: process.env['DB_HOST'],
    password: process.env['POSTGRES_PASSWORD'],
    port: Number(process.env['DB_PORT_HOST']),
    user: process.env['POSTGRES_USER'],
  });

  client.connect();

  console.log('drop tables');
  await client.query(`
    DROP TABLE if exists boards, users cascade;
    DROP TABLE if exists board, account_board cascade;
  `);

  console.log('create extensions');
  await client.query(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  `);

  console.log('create board');
  await client.query(`
    CREATE TABLE board (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR (255) NOT NULL,
      board json NOT NULL,
      created_on TIMESTAMP NOT NULL DEFAULT now()
    );
  `);

  console.log('create account_board');
  await client.query(`
    CREATE TABLE account_board (
      account_id VARCHAR (255),
      board_id uuid NOT NULL REFERENCES board(id) ON DELETE CASCADE,
      is_owner boolean DEFAULT false,
      visible boolean DEFAULT false,
      PRIMARY KEY (account_id, board_id)
    );
  `);

  await client.end();
  console.log('end');
}

createDatabase();
