# Firebase 설정

1. Firebase 콘솔에서 웹 앱을 등록하고 `.env.example`을 참고하여 `.env.local`에 웹 앱 설정값을 입력합니다. `src/firebaseConfig.js`가 이 값을 불러옵니다. 환경 파일을 수정한 뒤에는 개발 서버를 다시 시작합니다.
2. Authentication에서 Google 제공업체를 사용 설정하고 접속할 도메인을 승인된 도메인에 추가합니다. `npm install` 후 `npm run dev`로 개발 서버를 실행하고 표시되는 주소로 접속합니다. 배포용 파일은 `npm run build`로 만듭니다.
3. Cloud Firestore 데이터베이스와 Cloud Storage 버킷을 생성하고 `firestore.rules`와 `storage.rules`를 각 서비스의 보안 규칙에 적용합니다. 현재 규칙은 학생 본인에게만 접근을 허용합니다.
4. 학생 페이지에서 Google 로그인 후 OpenAI API 키를 입력합니다. 제출 시 `students/{uid}/activities/{활동 ID}`에 대화와 시간(밀리초), 이름, 이메일, 그림 경로가 저장되고 PNG는 `students/{uid}/drawings/{활동 ID}.png`에 저장됩니다. 최초 메시지 전송 시도부터 대화 종료까지 시간을 측정합니다. 제출 실패 후 재시도하면 다시 누른 시점까지 그림 시간이 측정됩니다.

두 서비스는 하나의 트랜잭션으로 묶이지 않으므로 업로드 후 기록 저장이 실패하면 이미지가 남을 수 있습니다. 재시도는 같은 활동 ID와 경로를 사용합니다.

교사 화면에 접근할 계정의 Firebase Authentication UID를 `.env.local`의 `VITE_ADMIN_UIDS=UID1,UID2`에 쉼표로 구분해 입력하고 개발 서버를 다시 시작합니다. 비어 있으면 누구도 교사 화면을 열 수 없습니다.

`VITE_` 값과 페이지 접근 검사는 브라우저에 공개되며 변조할 수 있습니다. 학생의 대화와 그림을 교사에게 제공하기 전에 아래의 관리자 권한과 Firestore·Storage 보안 규칙을 적용해야 합니다.

## 교사 대시보드 설정

1. 교사의 Firebase Authentication UID를 `VITE_ADMIN_UIDS`에 추가합니다. 이 설정은 화면 표시를 위한 것이며 보안 권한이 아닙니다.
2. 신뢰할 수 있는 관리자 환경에서 Firebase 프로젝트에 접근할 Application Default Credentials를 설정한 뒤 `node scripts/set-admin-claim.js <UID> grant`를 실행합니다. 필요하면 `revoke`로 해제합니다. 기존 다른 사용자 정의 클레임은 유지합니다. 변경 후 해당 교사는 다시 로그인해야 합니다. 이 스크립트와 관리자 자격 증명은 브라우저에 배포하지 마세요.
3. 이 저장소의 `firestore.rules`와 `storage.rules`를 각각 Firebase에 적용합니다. 관리자 클레임이 있는 계정만 전체 활동 조회와 삭제가 가능하고 학생은 자신의 자료만 접근할 수 있습니다. rules 배포 전에는 권한을 테스트하세요.
4. 인증된 브라우저에서 Storage 이미지를 읽으려면 버킷의 CORS 설정이 필요합니다. `storage.cors.json`을 참고해 실제 서비스와 개발 서버의 origin을 지정하고 `gcloud storage buckets update gs://버킷이름 --cors-file=storage.cors.json`으로 적용합니다. 이 명령은 기존 CORS 설정을 교체하므로 기존 설정을 먼저 확인하세요.

활동 날짜는 제출 시각을 한국 시간으로 표시합니다. 그림과 기록은 별도 서비스에 저장되어 삭제가 원자적으로 처리되지 않습니다. 그림 삭제 후 기록 삭제가 실패하면 같은 기록에서 다시 삭제할 수 있습니다. 대시보드는 현재 전체 활동을 불러와 날짜별로 필터링하므로 데이터가 많아지면 페이지 나누기와 집계 구조가 필요합니다.
