# Firebase 설정

1. Firebase 콘솔에서 웹 앱을 등록하고 설정 객체를 `src/firebaseConfig.js`에 입력합니다.
2. Authentication에서 Google 제공업체를 사용 설정하고 접속할 도메인을 승인된 도메인에 추가합니다. 로컬 테스트는 파일을 직접 열지 말고 localhost에서 제공합니다.
3. Cloud Firestore 데이터베이스와 Cloud Storage 버킷을 생성하고 `firestore.rules`와 `storage.rules`를 각 서비스의 보안 규칙에 적용합니다. 현재 규칙은 학생 본인에게만 접근을 허용합니다.
4. 학생 페이지에서 Google 로그인 후 OpenAI API 키를 입력합니다. 제출 시 `students/{uid}/activities/{활동 ID}`에 대화와 시간(밀리초), 이름, 이메일, 그림 경로가 저장되고 PNG는 `students/{uid}/drawings/{활동 ID}.png`에 저장됩니다. 최초 메시지 전송 시도부터 대화 종료까지 시간을 측정합니다. 제출 실패 후 재시도하면 다시 누른 시점까지 그림 시간이 측정됩니다.

두 서비스는 하나의 트랜잭션으로 묶이지 않으므로 업로드 후 기록 저장이 실패하면 이미지가 남을 수 있습니다. 재시도는 같은 활동 ID와 경로를 사용합니다. 교사 대시보드 접근은 교사 인증과 권한 정책을 구현한 후 별도로 추가해야 합니다.
