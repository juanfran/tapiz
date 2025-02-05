import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

const NUM_CONNECTIONS = 25;
const PORT = 8000;
const STEP_DELAY = 17;
const SQUARE_SIZE = 2000;
const AUTH = '';
const BOARD_ID = '4faa8be4-4da4-4935-b23e-da21a3699530';

function createClient(index: number) {
  let interval: NodeJS.Timeout;
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
            position: { x: initialX, y: initialY },
          },
        },
        op: 'add',
      },
    ]);

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
              text: `Client ${index}`,
              position: { x, y },
            },
          },
          op: 'patch',
        },
      ]);
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

    setTimeout(() => {
      start();
    }, 2000);

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
