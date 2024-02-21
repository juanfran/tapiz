import * as dotenv from 'dotenv';
dotenv.config();

export default {
  DB_DATABASE: process.env['POSTGRES_DB'] ?? 'db',
  DB_HOST: process.env['POSTGRES_HOST'] ?? 'localhost',
  DB_PASSWORD: process.env['POSTGRES_PASSWORD'],
  DB_PORT_HOST: Number(process.env['DB_PORT_HOST']),
  DB_PORT: Number(process.env['DB_PORT']),
  DB_USER: process.env['POSTGRES_USER'],
  GOOGLE_CLIENT_ID: process.env['GOOGLE_CLIENT_ID'],
  GOOGLE_CLIENT_SECRET: process.env['GOOGLE_CLIENT_SECRET'],
  FRONTEND_URL: process.env['FRONTEND_URL'] ?? 'http://localhost:4300',
  API_URL: process.env['API'] ?? 'http://localhost:8000/api',
};
