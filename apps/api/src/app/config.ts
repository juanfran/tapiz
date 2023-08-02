import * as dotenv from 'dotenv';
dotenv.config();

export default {
  DB_DATABASE: process.env['POSTGRES_DB'] ?? 'db',
  DB_HOST: process.env['POSTGRES_HOST'] ?? 'localhost',
  DB_PASSWORD: process.env['POSTGRES_PASSWORD'],
  DB_PORT_HOST: Number(process.env['DB_PORT_HOST']),
  DB_PORT: Number(process.env['DB_PORT']),
  DB_USER: process.env['POSTGRES_USER'],
};
