import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { startApiServer } from './app/init-server.js';
import { startDB } from './app/db/init-db.js';

expand(config());

startDB();
startApiServer();
