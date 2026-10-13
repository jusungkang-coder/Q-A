// 관리자 로그인 흐름 테스트. 실행: npm install && npx playwright install chromium && npm test
// 테스트 전용 계정(test.admin / Test1234pw)을 즉석에서 만들어 쓰므로 실제 계정 정보는 필요 없다.
import { chromium } from "playwright";
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const ID = "test.admin", PW = "Test1234pw";
const salt = randomBytes(16);
const seed = {
  ["data/admins/accounts/" + ID]: {
    salt: salt.toString("base64"),
    hash: pbkdf2Sync(PW, salt, 150000, 32, "sha256").toString("base64"),
    iter: 150000, createdAt: Date.now(), createdBy: "test",
  },
};
const mock = readFileSync(path.join(here, "mock-runtime.js"), "utf8").replace("var store = __SEED__;", "var store = " + JSON.stringify(seed) + ";");
const app = readFileSync(path.join(here, "..", "src", "index.html"), "utf8");
const marker = "<script>\n(function(){";
if (!app.includes(marker)) throw new Error("src/index.html 에서 메인 스크립트 시작 위치를 찾지 못했어요.");
const tmp = path.join(here, ".tmp"); mkdirSync(tmp, { recursive: true });
const variants = {
  "webcrypto.html": app.replace(marker, "<script>" + mock + "</script>\n" + marker),
  "no-webcrypto.html": app.replace(marker, "<script>" + mock + ';try{Object.defineProperty(window.crypto,"subtle",{value:undefined})}catch(e){}</script>\n' + marker),
};
for (const [f, html] of Object.entries(variants)) writeFileSync(path.join(tmp, f), html);

const cases = [
  { name: "정상 로그인 (WebCrypto)", file: "webcrypto.html", id: ID, pw: PW, expect: "in" },
  { name: "정상 로그인 (WebCrypto 없음, JS 대체 구현)", file: "no-webcrypto.html", id: ID, pw: PW, expect: "in" },
  { name: "비밀번호 틀림", file: "webcrypto.html", id: ID, pw: "wrong12345", expect: /A2/ },
  { name: "없는 아이디", file: "webcrypto.html", id: "nobody", pw: PW, expect: /A1/ },
  { name: "한글 입력 상태", file: "webcrypto.html", id: "ㅅㄷㄴㅅ", pw: PW, expect: /한\/영/ },
];

const browser = await chromium.launch();
let failed = 0;
for (const c of cases) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/*", (r) => (r.request().url().startsWith("file:") ? r.continue() : r.abort()));
  await page.goto("file://" + path.join(tmp, c.file) + "#/admin");
  await page.waitForTimeout(400);
  await page.fill("#l-id", c.id);
  await page.fill("#l-pw", c.pw);
  await page.click("#l-go");
  const read = (sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.textContent : null; }, sel);
  let who = null, err = "";
  for (let i = 0; i < 20; i++) { // 최대 6초 동안 결과를 기다린다
    await page.waitForTimeout(300);
    who = await read(".whoami"); err = (await read("#l-err")) || "";
    if (who || err) break;
  }
  let ok;
  if (c.expect === "in") {
    ok = !!who && who.includes(c.id);
    if (ok) { await page.reload(); await page.waitForTimeout(1200); ok = !!(await read(".whoami")); }
  } else ok = !who && c.expect.test(err || "");
  if (errors.length) ok = false;
  console.log((ok ? "PASS" : "FAIL") + "  " + c.name + (ok ? "" : "  → " + (who || err || "") + " " + errors.join("; ")));
  if (!ok) failed++;
  await page.close();
}
await browser.close();
if (failed) { console.error(failed + "개 실패"); process.exit(1); }
console.log("모두 통과");
