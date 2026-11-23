import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { firebaseConfig } from './firebaseConfig.js';

export function initializeFirebase() {
  if (!['apiKey', 'authDomain', 'projectId', 'storageBucket', 'appId'].every(key => firebaseConfig[key])) {
    throw new Error('Firebase 설정이 필요해요. .env.local 파일의 설정값을 확인해 주세요.');
  }
  const app = initializeApp(firebaseConfig);
  return { auth: getAuth(app), db: getFirestore(app), storage: getStorage(app) };
}
export function observeUser(auth, callback) { return onAuthStateChanged(auth, callback); }
export async function googleSignIn(auth) { return signInWithPopup(auth, new GoogleAuthProvider()); }
export async function googleSignOut(auth) { return signOut(auth); }
export async function submitActivity(services, user, activityId, blob, activity) {
  if (services.auth.currentUser?.uid !== user.uid) throw new Error('로그인 계정이 변경되었어요. 다시 로그인해 주세요.');
  const path = `students/${user.uid}/drawings/${activityId}.png`;
  await uploadBytes(ref(services.storage, path), blob, { contentType: 'image/png' });
  if (services.auth.currentUser?.uid !== user.uid) throw new Error('로그인 계정이 변경되었어요. 다시 로그인해 주세요.');
  await setDoc(doc(services.db, 'students', user.uid, 'activities', activityId), {
    ...activity, uid: user.uid, name: user.displayName || '', email: user.email || '',
    drawingPath: path, createdAt: serverTimestamp()
  });
}
