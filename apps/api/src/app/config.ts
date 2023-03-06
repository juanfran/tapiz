import * as dotenv from 'dotenv';
dotenv.config();

export default {
  DB_DATABASE: process.env['POSTGRES_DB'],
  DB_HOST: process.env['DB_HOST'],
  DB_PASSWORD: process.env['POSTGRES_PASSWORD'],
  DB_PORT_HOST: process.env['DB_PORT_HOST'],
  DB_USER: process.env['POSTGRES_USER'],
  GOOGLE_CLIENT_ID: process.env['GOOGLE_CLIENT_ID'],
  WS_SERVER_PORT: Number(process.env['WS_SERVER_PORT']),
  API_SERVER_PORT: Number(process.env['API_SERVER_PORT']),
};
