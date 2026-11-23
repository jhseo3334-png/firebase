import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const uid = process.argv[2];
const action = process.argv[3];
if (!uid || !['grant', 'revoke'].includes(action)) {
  console.error('사용법: node scripts/set-admin-claim.js <Firebase UID> <grant|revoke>');
  process.exit(1);
}
try {
  initializeApp({ credential: applicationDefault() });
  const auth = getAuth();
  const user = await auth.getUser(uid);
  const claims = { ...user.customClaims };
  if (action === 'grant') claims.admin = true;
  else delete claims.admin;
  await auth.setCustomUserClaims(uid, claims);
  console.log(`관리자 권한 ${action === 'grant' ? '설정' : '해제'} 완료. 반영을 위해 해당 사용자는 다시 로그인해야 합니다.`);
} catch (error) {
  console.error(`권한 설정 실패: ${error.message}`);
  process.exitCode = 1;
}
