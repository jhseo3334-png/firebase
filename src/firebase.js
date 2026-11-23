import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js';
import { getFirestore, doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js';
import { getStorage, ref, uploadBytes } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-storage.js';
import { firebaseConfig } from './firebaseConfig.js';

export function initializeFirebase() {
  if (!['apiKey', 'authDomain', 'projectId', 'storageBucket', 'appId'].every(key => firebaseConfig[key])) {
    throw new Error('Firebase 설정이 필요해요. src/firebaseConfig.js에 프로젝트 설정값을 입력해 주세요.');
  }
  const app = initializeApp(firebaseConfig);
  return { auth: getAuth(app), db: getFirestore(app), storage: getStorage(app) };
}
export function observeUser(auth, callback) { return onAuthStateChanged(auth, callback); }
export async function googleSignIn(auth) { return signInWithPopup(auth, new GoogleAuthProvider()); }
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
