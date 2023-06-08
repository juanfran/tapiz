import { startApiServer } from './app/api-server';
import { startDB } from './app/db';

startDB();
startApiServer();
