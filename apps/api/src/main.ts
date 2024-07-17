import './env-vars.js';
import { startApiServer } from './app/init-server.js';
import { startDB } from './app/db/init-db.js';

startDB();
startApiServer();
