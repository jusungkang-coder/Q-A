// claude.ai 런타임(window.claude)을 흉내 내는 테스트용 목(mock).
// 실제 저장소 대신 메모리에 문서를 두고, db / user 기능만 제공한다.
// __SEED__ 자리는 tests/run.mjs 가 테스트용 관리자 계정으로 바꿔 넣는다.
(function () {
  var store = __SEED__;
  function snap(path) {
    var d = store[path];
    return { id: path.split("/").pop(), exists: !!d, data: function () { return d; }, metadata: { fromCache: false } };
  }
  function docRef(path) {
    return {
      id: path.split("/").pop(), path: path,
      get: function () { return Promise.resolve(snap(path)); },
      set: function (x) { store[path] = x; return Promise.resolve(); },
      update: function (x) { store[path] = Object.assign({}, store[path], x); return Promise.resolve(); },
      delete: function () { delete store[path]; return Promise.resolve(); },
      onSnapshot: function (n) { setTimeout(function () { n(snap(path)); }, 10); return function () {}; },
    };
  }
  function colRef(path) {
    return {
      doc: function (id) { return docRef(path + "/" + (id || Math.random().toString(36).slice(2))); },
      onSnapshot: function (n) {
        // 실제 런타임처럼 첫 스냅샷은 빈 캐시로 먼저 오게 한다 (로그인 직후 로그아웃 버그 회귀 테스트용)
        setTimeout(function () { n({ docs: [], size: 0, empty: true, docChanges: function () { return []; }, metadata: { fromCache: true } }); }, 5);
        setTimeout(function () {
          var docs = Object.keys(store).filter(function (k) {
            return k.indexOf(path + "/") === 0 && k.slice(path.length + 1).indexOf("/") < 0;
          }).map(snap);
          n({ docs: docs, size: docs.length, empty: !docs.length, docChanges: function () { return []; }, metadata: { fromCache: false } });
        }, 300);
        return function () {};
      },
    };
  }
  var db = { doc: docRef, collection: colRef };
  window.claude = {
    use: function (name) {
      return new Promise(function (r) {
        setTimeout(function () { r(name === "db" ? db : name === "user" ? { canEdit: function () { return true; } } : null); }, 50);
      });
    },
  };
})();
