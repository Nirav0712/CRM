import * as admin from 'firebase-admin';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!admin.apps.length) {
  if (projectId && clientEmail && privateKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    } catch (error) {
      console.error('Firebase admin initialization error', error);
    }
  } else {
    console.warn('Firebase Admin credentials not found. Initialization skipped.');
  }
}

export const db = admin.apps.length ? admin.firestore() : null as any;
export const auth = admin.apps.length ? admin.auth() : null as any;
export default admin;
