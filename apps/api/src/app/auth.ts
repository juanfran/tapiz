import { OAuth2Client } from 'google-auth-library';
import Config from './config.js';

const googleClient = new OAuth2Client(Config.GOOGLE_CLIENT_ID);

export async function verifyToken(token: string) {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: Config.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (payload && payload['sub'] && payload['name'] && payload['email']) {
      return {
        sub: payload['sub'],
        name: payload['name'],
        email: payload['email'],
      };
    }
  } catch (err) {
    console.error(err);
  }

  return undefined;
}
