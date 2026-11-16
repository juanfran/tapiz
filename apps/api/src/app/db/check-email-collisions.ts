import postgres from 'postgres';

const required = [
  'POSTGRES_HOST',
  'POSTGRES_PORT_HOST',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_DB',
] as const;
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing ${key}`);
}

const client = postgres({
  host: process.env['POSTGRES_HOST'],
  port: Number(process.env['POSTGRES_PORT_HOST']),
  username: process.env['POSTGRES_USER'],
  password: process.env['POSTGRES_PASSWORD'],
  database: process.env['POSTGRES_DB'],
  connect_timeout: 10,
});

try {
  const collisions = await client`
    SELECT lower(email) AS email, array_agg(id ORDER BY id) AS account_ids
    FROM accounts GROUP BY lower(email) HAVING count(*) > 1 ORDER BY lower(email)
  `;
  if (collisions.length) {
    console.error(
      'Resolve case-insensitive account email collisions before upgrading:',
    );
    for (const row of collisions) console.error(JSON.stringify(row));
    process.exitCode = 1;
  } else {
    console.log('No case-insensitive account email collisions');
  }
} finally {
  await client.end();
}
