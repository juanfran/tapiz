import { createHash, randomBytes } from 'node:crypto';

export const API_TOKEN_PREFIX = 'tapiz_pat_';

export function generateApiToken() {
  return `${API_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;
}

export function hashApiToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function isApiToken(token: string) {
  return (
    token.startsWith(API_TOKEN_PREFIX) && token.length > API_TOKEN_PREFIX.length
  );
}
