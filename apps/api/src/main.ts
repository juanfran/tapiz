import { startApiServer } from './app/index';
import { startDB } from './app/db';

startDB();
startApiServer();
