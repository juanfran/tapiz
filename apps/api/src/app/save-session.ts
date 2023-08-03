import fs from 'fs';
import WebSocket from 'ws';

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

  const ws = new WebSocket(`ws://localhost:8000`, {
    headers: {
      Cookie: `auth=${cookie}`,
    },
  });
  ws.on('open', () => {
    setInterval(() => {
      if (file[index]['boardId']) {
        file[index]['boardId'] = boardId;
      }

      const msg = JSON.stringify(file[index]);

      ws.send(msg);
      index++;
    }, 20);
  });
};

export const init = () => {
  setTimeout(runSession, 5000);
};
