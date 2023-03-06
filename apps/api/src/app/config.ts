import * as dotenv from 'dotenv';
dotenv.config();

export default {
  DB_DATABASE: process.env['DB_DATABASE'],
  DB_HOST: process.env['DB_HOST'],
  DB_PASSWORD: process.env['DB_PASSWORD'],
  DB_PORT: process.env['DB_PORT'],
  DB_USER: process.env['DB_USER'],
  GOOGLE_CLIENT_ID: process.env['GOOGLE_CLIENT_ID'],
};
