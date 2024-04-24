import { writeFileSync } from 'fs';

const front = ['API', 'WS'];
const frontConfig = {};

front.forEach((key) => {
  frontConfig[key] = process.env[key];
});

writeFileSync(
  './apps/team-up/src/assets/config.json',
  JSON.stringify({
    ...frontConfig,
  }),
);
