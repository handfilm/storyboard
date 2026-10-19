import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, setDoc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

// Load config from firebase-applet-config.json
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');

// Use custom database ID if specified in config, otherwise default
const databaseId = (firebaseConfig as any).firestoreDatabaseId || '(default)';
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, databaseId);

// Strictly authorized studio users (can be extended by admin)
export const AUTHORIZED_EMAILS = [
  'handfilm.ai@gmail.com',
  'handfilm.mvfx@gmail.com',
  // Any user with studio access
];

export function isUserAuthorized(email: string | null | undefined): boolean {
  if (!email) return false;
  // If list is empty or matches
  if (AUTHORIZED_EMAILS.length === 0) return true;
  return AUTHORIZED_EMAILS.some(allowed => allowed.toLowerCase() === email.toLowerCase());
}

// Real-time Storyboard Sync Reference
export const STORYBOARD_DOC_REF = doc(db, 'storyboards', 'main');

// Real-time presence updater
export async function updatePresence(user: User, currentFrameIndex: number) {
  if (!user) return;
  const presenceRef = doc(db, 'presence', user.uid);
  try {
    await setDoc(presenceRef, {
      userId: user.uid,
      email: user.email || 'Anonymous',
      displayName: user.displayName || user.email?.split('@')[0] || 'Studio Artist',
      photoURL: user.photoURL || '',
      activeFrame: currentFrameIndex,
      lastSeen: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn('Presence update error:', err);
  }
}
