import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

/*
Tested scenario:

pnpm build
pnpm serve-dist
pnpm demo

50+fps

const NUM_CONNECTIONS = 100;
const PORT = 8000;
const STEP_DELAY = 50;
const SQUARE_SIZE = 2000;
const MAX_EMITS = 250;

Text on
Color on
Position on
*/

const NUM_CONNECTIONS = 100;
const STEP_DELAY = 50;
const SQUARE_SIZE = 2000;
const MAX_EMITS = 250;

const PORT = 8000;
const AUTH = '';
const BOARD_ID = '';

function randomRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function createClient(index: number) {
  let interval: NodeJS.Timeout;
  let emits = 0;
  let init = false;
  const noteId = uuidv4();
  const ownerId = `user_${index}_${Date.now()}`;
  const randomInitX = Math.random() * 1000;
  const randomInitY = Math.random() * 1000;

  const initialX = randomInitX + index * 50;
  const initialY = randomInitY;

  const ws = io(`ws://localhost:${PORT}`, {
    extraHeaders: { Cookie: AUTH },
  });

  function start() {
    interval = setInterval(() => {
      const progress = (Date.now() % 4000) / 1000;
      const side = Math.floor(progress);
      const sideProgress = progress - side;

      let x = initialX;
      let y = initialY;

      switch (side) {
        case 0:
          x += SQUARE_SIZE * sideProgress;
          break;
        case 1:
          x += SQUARE_SIZE;
          y += SQUARE_SIZE * sideProgress;
          break;
        case 2:
          x += SQUARE_SIZE * (1 - sideProgress);
          y += SQUARE_SIZE;
          break;
        case 3:
          y += SQUARE_SIZE * (1 - sideProgress);
          break;
      }

      ws.emit('board', [
        {
          data: {
            type: 'note',
            id: noteId,
            content: {
              text: `Client ${index} ${Math.random()}`,
              position: { x, y },
              color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
            },
          },
          position: randomRange(0, NUM_CONNECTIONS - 1),
          op: 'patch',
        },
      ]);

      emits++;

      if (emits >= MAX_EMITS) {
        clearInterval(interval);
        console.log(`Client ${index} finished`);
      }
    }, STEP_DELAY);
  }

  ws.on('connect', () => {
    console.log(`Client ${index} connected`);

    ws.emit('board', [
      {
        boardId: BOARD_ID,
        action: 'join',
      },
    ]);

    ws.on('board', (response) => {
      if (response && response[0].type === '[Board] State action' && !init) {
        init = true;

        ws.emit('board', [
          {
            data: {
              type: 'note',
              id: noteId,
              content: {
                text: '',
                votes: [],
                emojis: [],
                drawing: [],
                width: 300,
                height: 300,
                ownerId: ownerId,
                layer: 0,
                color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
                position: { x: initialX, y: initialY },
              },
            },
            op: 'add',
          },
        ]);

        setTimeout(() => {
          start();
        }, 500);
      }
    });

    ws.on('disconnect', () => {
      clearInterval(interval);
      console.log(`Client ${index} disconnected`);
    });
  });

  ws.on('connect_error', (err) => {
    console.error(`Error client ${index}:`, err.message);
  });
}

for (let i = 0; i < NUM_CONNECTIONS; i++) {
  createClient(i);
}
