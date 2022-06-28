import { startWsServer } from './app/ws-server';
import { startApiServer } from './app/api-server';
import { startDB } from './app/db';

startWsServer();
startDB();
startApiServer();
