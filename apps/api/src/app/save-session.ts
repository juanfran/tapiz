import * as fs from 'fs';
import * as WebSocket from 'ws';

import Config from '../app/config';
const sessionFile = 'apps/api/src/app/sessions/session.json';

export const saveMsg = (obj: Record<string, unknown>) => {
  console.log(obj);

  const data = fs.readFileSync(sessionFile, 'utf8');
  const file = JSON.parse(data);

  file.push(obj);

  fs.writeFileSync(sessionFile, JSON.stringify(file));
};

export const runSession = () => {
  const data = fs.readFileSync(sessionFile, 'utf8');
  const file = JSON.parse(data);
  console.log(file.length);
  let index = 0;
  const cookie = '';
  const boardId = '';

  const ws = new WebSocket(`ws://localhost:${Config.WS_SERVER_PORT}`, {
    headers: {
      Cookie: `auth=${cookie}`,
    },
  });
  ws.on('open', () => {
    setInterval(() => {
      const msg = JSON.stringify(file[index]);
      if (msg['boardId']) {
        msg['boardId'] = boardId;
      }

      ws.send(msg);
      index++;
    }, 20);
  });
};

export const init = () => {
  setTimeout(runSession, 5000);
};
