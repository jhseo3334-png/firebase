import { initializeFirebase, observeUser } from './firebase.js';
import { isAdminUid } from './admin-access.js';

try {
  const { auth } = initializeFirebase();
  observeUser(auth, user => {
    if (!isAdminUid(user?.uid)) {
      document.getElementById('admin-content').hidden = true;
      window.location.replace('index.html');
      return;
    }
    document.getElementById('admin-content').hidden = false;
  });
} catch {
  window.location.replace('index.html');
}
