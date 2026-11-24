import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { describe, expect, it } from 'vitest';

describe('case-insensitive email migration (PostgreSQL)', () => {
  it('rejects legacy duplicates before creating the unique index', async () => {
    const connection = postgres({
      host: process.env['POSTGRES_HOST'],
      port: Number(process.env['POSTGRES_PORT_HOST']),
      username: process.env['POSTGRES_USER'],
      password: process.env['POSTGRES_PASSWORD'],
      database: process.env['POSTGRES_DB'],
      max: 1,
    });
    const migration = await readFile(
      new URL(
        '../../../../../drizzle/0012_case_insensitive_accounts_email.sql',
        import.meta.url,
      ),
      'utf8',
    );
    const [check] = migration.split('--> statement-breakpoint');
    try {
      await connection`CREATE TEMP TABLE accounts (id text, email text)`;
      await connection`INSERT INTO accounts (id, email) VALUES ('first', 'Person@Example.test'), ('second', 'person@example.test')`;
      await expect(connection.unsafe(check)).rejects.toMatchObject({
        code: 'P0001',
        message:
          'Resolve case-insensitive duplicate accounts.email values before migration 0012',
      });
      expect(
        await connection`SELECT count(*)::int AS total FROM accounts`,
      ).toEqual([expect.objectContaining({ total: 2 })]);
    } finally {
      await connection.end();
    }
  });
});
