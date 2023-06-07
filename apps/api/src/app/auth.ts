import admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

export async function verifyToken(token: string) {
  try {
    const payload = await admin.auth().verifyIdToken(token);

    if (payload && payload['sub']) {
      return payload;
    }
  } catch (err) {
    console.error(err);
  }

  return undefined;
}
