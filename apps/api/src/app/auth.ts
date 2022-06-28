import { OAuth2Client } from 'google-auth-library';
import Config from './config';

const googleClientId = Config.GoogleClientId;
const googleClient = new OAuth2Client(googleClientId);

export async function verifyGoogle(token: string) {
  try {
    const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: googleClientId,
    });

    const payload = ticket.getPayload();

    if (payload && payload['sub']) {
      return payload;
    }
  } catch(err) {
    console.error(err);
  }

  return undefined;
}
