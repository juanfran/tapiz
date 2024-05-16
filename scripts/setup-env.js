import e from 'cors';
import { writeFileSync } from 'fs';

const front = ['API', 'WS', 'DEMO'];
const frontConfig = {};


front.forEach((key) => {
  if (process.env[key] === 'true') {
    frontConfig[key] = true;
    return;
  } else if (process.env[key] === 'false') {
    frontConfig[key] = false;
    return;
  }

  frontConfig[key] = process.env[key];
});

writeFileSync(
  './apps/team-up/src/assets/config.json',
  JSON.stringify({
    ...frontConfig,
  }),
);
