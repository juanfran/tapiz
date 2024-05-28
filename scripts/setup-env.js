import { config } from 'dotenv'
import { expand } from 'dotenv-expand';

expand(config())

import { writeFileSync } from 'fs';

const front = ['API_URL', 'WS_URL', 'DEMO'];
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
  './apps/web/src/assets/config.json',
  JSON.stringify({
    ...frontConfig,
  }),
);
