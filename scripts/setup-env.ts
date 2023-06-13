import * as dotenv from 'dotenv';
import { writeFileSync, readFileSync } from 'fs';

dotenv.config();

const front = ['API', 'WS'];
const frontConfig: Record<string, unknown> = {};

front.forEach((key) => {
  frontConfig[key] = process.env[key];
});

writeFileSync(
  './apps/team-up/src/assets/config.json',
  JSON.stringify({
    ...frontConfig,
  })
);
