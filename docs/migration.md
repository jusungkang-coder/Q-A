# 독립 배포로 옮기기 (예: Vercel)

지금 코드는 claude.ai 런타임에 맞춰져 있습니다. 회사 도메인이나 Vercel에서 운영하려면 아래 항목을 바꿔야 합니다.
다행히 런타임 호출이 `db`, `assets`, `mcp`, `downloads`, `user` 다섯 곳에 모여 있어서, 같은 모양의 어댑터를 만들어 끼우는 방식으로 옮길 수 있습니다.

## 바꿀 것

| 지금 (claude.ai) | 바꿀 후보 | 메모 |
|---|---|---|
| `db` (문서 저장 + 실시간 구독) | Firebase Firestore, Supabase | 현재 API가 Firestore와 거의 같습니다 (`collection().doc().get/set/update/delete/onSnapshot`). |
| DB 접근 규칙 | Firestore Security Rules, Supabase RLS | 읽기는 공개, 쓰기와 관리자 계정은 인증된 관리자만 |
| `assets` (이미지) | Firebase Storage, Supabase Storage, S3 | 현재 `/_blob/<id>` 경로를 저장소 URL로 바꿉니다. |
| `mcp` → Google Sheets | 서버에서 Sheets API 호출 (서비스 계정) 또는 Apps Script | 시트를 서비스 계정에 공유하면 개인 커넥터가 필요 없습니다. |
| `downloads` | 일반 `<a download>` | 그대로 브라우저 다운로드 |
| `user.canEdit()` | 로그인 세션의 역할(role) | |
| 브라우저 로그인 (해시 비교) | **서버 측 인증** (Firebase Auth, Supabase Auth, NextAuth 등) | 지금 방식을 그대로 쓰면 안 됩니다. 아래를 보세요. |

## 반드시 바꿔야 하는 것: 로그인

지금은 브라우저가 계정 문서를 읽어 비밀번호를 비교합니다. claude.ai에서는 계정 문서를 편집자만 읽을 수 있어서 이 방식으로도 막혀 있습니다.
하지만 일반 서버로 옮기면서 같은 방식을 쓰면 **누구나 해시를 받아 갈 수 있고 쓰기 권한도 막히지 않습니다.** 로그인과 쓰기 권한 확인은 반드시 서버(또는 DB 보안 규칙)에서 하도록 바꿔야 합니다.

## 추천 순서

1. Vercel 프로젝트를 만들고, `src/index.html`을 정적 페이지로 먼저 배포합니다. 이 단계에서는 화면만 뜹니다.
2. `window.claude.use`를 흉내 내는 어댑터를 만듭니다. `tests/mock-runtime.js`가 같은 모양의 예시입니다. `db`는 Firestore나 Supabase로 연결합니다.
3. 인증을 붙입니다. 관리자만 쓸 수 있게 보안 규칙을 걸고, 로그인 화면은 인증 서비스로 바꿉니다.
4. 이미지 저장소와 구글 시트 서버 API를 연결합니다.
5. 아티팩트 DB에 있는 질문과 설정 데이터를 새 DB로 옮깁니다. 데이터 내보내기는 Claude에게 요청하면 JSON으로 받을 수 있습니다.

현장앱(biber-field-app)과 같은 Vercel 팀, DB, 로그인 방식을 쓰면 관리하기 가장 편합니다.
