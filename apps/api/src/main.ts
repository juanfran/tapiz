import { startApiServer } from './app/index';
import { startDB } from './app/db/init-db';

startDB();
startApiServer();
