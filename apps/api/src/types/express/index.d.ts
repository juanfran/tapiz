import { TokenPayload } from 'google-auth-library';

export {};

declare global {
  namespace Express {
    interface Request {
      user: TokenPayload;
    }
  }
}
