import { initializeFirebase, observeUser, googleSignIn, googleSignOut, loginErrorMessage } from './firebase.js';
import { isAdminUid } from './admin-access.js';

const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const errorMessage = document.getElementById('auth-error');

try {
  const { auth } = initializeFirebase();
  observeUser(auth, user => {
    document.getElementById('logged-in-actions').hidden = !user;
    document.getElementById('logged-out-actions').hidden = !!user;
    document.getElementById('teacher-link').hidden = !isAdminUid(user?.uid);
    logoutButton.hidden = !user;
    document.getElementById('account-info').textContent = user
      ? `${user.displayName || '사용자'} · ${user.email || '이메일 없음'}`
      : '로그인 후 활동을 시작할 수 있어요';
    errorMessage.textContent = '';
  });
  loginButton.addEventListener('click', async () => {
    loginButton.disabled = true;
    errorMessage.textContent = '';
    try { await googleSignIn(auth); }
    catch (error) { errorMessage.textContent = loginErrorMessage(error); }
    finally { loginButton.disabled = false; }
  });
  logoutButton.addEventListener('click', async () => {
    logoutButton.disabled = true;
    try { await googleSignOut(auth); }
    catch { errorMessage.textContent = '로그아웃하지 못했어요. 다시 시도해 주세요.'; }
    finally { logoutButton.disabled = false; }
  });
} catch (error) {
  document.getElementById('account-info').textContent = '로그인 설정을 확인해 주세요';
  errorMessage.textContent = error.message;
}
