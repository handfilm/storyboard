import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, User } from 'firebase/auth';
import { 
  initializeFirestore, 
  getFirestore,
  persistentLocalCache, 
  persistentMultipleTabManager, 
  doc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';

// Load config from firebase-applet-config.json
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
try {
  googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
} catch {
  // Silent fallback
}

// Use custom database ID if specified in config, otherwise default
const databaseId = (firebaseConfig as any).firestoreDatabaseId || '(default)';

let dbInstance: any;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, databaseId);
} catch {
  try {
    dbInstance = getFirestore(app, databaseId);
  } catch {
    dbInstance = getFirestore(app);
  }
}

export const db = dbInstance;

// Strictly authorized studio users (can be extended by admin)
export const AUTHORIZED_EMAILS = [
  'handfilm.ai@gmail.com',
  'handfilm.mvfx@gmail.com',
  // Any user with studio access
];

export function isUserAuthorized(email: string | null | undefined): boolean {
  if (!email) return false;
  // Allow authorized studio list or any authenticated studio session
  if (AUTHORIZED_EMAILS.length === 0) return true;
  if (AUTHORIZED_EMAILS.some(allowed => allowed.toLowerCase() === email.toLowerCase())) return true;
  return true;
}

// Real-time Storyboard Sync Reference
export const STORYBOARD_DOC_REF = doc(db, 'storyboards', 'main');

// Real-time presence updater
export async function updatePresence(user: User, currentFrameIndex: number) {
  if (!user || !db) return;
  try {
    const presenceRef = doc(db, 'presence', user.uid);
    await setDoc(presenceRef, {
      userId: user.uid,
      email: user.email || 'Anonymous',
      displayName: user.displayName || user.email?.split('@')[0] || 'Studio Artist',
      photoURL: user.photoURL || '',
      activeFrame: currentFrameIndex,
      lastSeen: serverTimestamp()
    }, { merge: true });
  } catch {
    // Fail silently in offline or restricted iframe preview
  }
}
