// 관리자 계정 문서(data/admins/accounts/<id>)에 넣을 값을 만든다.
// 사용: npm run admin-hash -- <아이디> <비밀번호>
// 출력된 JSON을 그대로 DB 문서로 저장하면 된다. 비밀번호 자체는 저장되지 않는다.
import { pbkdf2Sync, randomBytes } from "node:crypto";

const [id, pw] = process.argv.slice(2);
if (!id || !pw) {
  console.error("사용법: npm run admin-hash -- <아이디> <비밀번호>");
  process.exit(1);
}
if (!/^[a-z0-9._-]{3,40}$/.test(id)) {
  console.error("아이디는 영문 소문자·숫자·. _ - 로 3~40자여야 해요.");
  process.exit(1);
}
const iter = 150000;
const salt = randomBytes(16);
const hash = pbkdf2Sync(pw, salt, iter, 32, "sha256");
const doc = {
  salt: salt.toString("base64"),
  hash: hash.toString("base64"),
  iter,
  createdAt: Date.now(),
  createdBy: "setup",
};
console.log(JSON.stringify({ collection: "data/admins/accounts", docId: id, data: doc }, null, 2));
