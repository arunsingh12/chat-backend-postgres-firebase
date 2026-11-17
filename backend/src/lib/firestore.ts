import { applicationDefault, cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { env } from '../config/env.js';
import { logger } from './logger.js';

const createFirebaseApp = (): App => {
  const existing = getApps()[0];
  if (existing) return existing;

  if (env.FIRESTORE_EMULATOR_HOST) {
    logger.info({ host: env.FIRESTORE_EMULATOR_HOST }, 'Using Firestore emulator');
    return initializeApp({ projectId: env.FIREBASE_PROJECT_ID });
  }

  if (env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
    return initializeApp({
      projectId: env.FIREBASE_PROJECT_ID,
      credential: cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY,
      }),
    });
  }

  // Falls back to GOOGLE_APPLICATION_CREDENTIALS / workload identity.
  return initializeApp({ projectId: env.FIREBASE_PROJECT_ID, credential: applicationDefault() });
};

let firestore: Firestore | undefined;

export const getFirestoreDb = (): Firestore => {
  if (!firestore) {
    firestore = getFirestore(createFirebaseApp());
    firestore.settings({ ignoreUndefinedProperties: true });
  }
  return firestore;
};

export const checkFirestore = async (): Promise<void> => {
  await getFirestoreDb().listCollections();
};
