import { hashApiToken, isApiToken } from './api-token.js';
import db from './db/index.js';

export async function authenticateApiToken(authorization?: string) {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1];

  if (!token || !isApiToken(token)) {
    return undefined;
  }

  return db.user.getUserByApiTokenHash(hashApiToken(token));
}
