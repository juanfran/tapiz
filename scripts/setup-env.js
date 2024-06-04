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

const prodConfig = JSON.stringify({
  ...frontConfig,
  production: true,
});

const devConfig = JSON.stringify({
  ...frontConfig,
  production: false,
});

writeFileSync(
  './apps/web/src/environments/environment.prod.ts',
  `export const environment = ${prodConfig};`
);

writeFileSync(
  './apps/web/src/environments/environment.ts',
  `export const environment = ${devConfig};`
);
