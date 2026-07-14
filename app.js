/* 한능검 심화 모의고사 문제은행 — 로컬 정적 웹앱 */
(function () {
  "use strict";

  // ---------- 시대 정의 (표준 10시대) ----------
  const ERAS = [
    { key: "선사", name: "선사시대" },
    { key: "고조선", name: "고조선·여러 나라" },
    { key: "삼국", name: "삼국·가야" },
    { key: "남북국", name: "남북국(통일신라·발해)" },
    { key: "고려", name: "고려" },
    { key: "조선전기", name: "조선 전기" },
    { key: "조선후기", name: "조선 후기" },
    { key: "근대", name: "근대(개항기)" },
    { key: "일제강점기", name: "일제강점기" },
    { key: "현대", name: "현대" },
  ];

  const BANK = (window.QUESTION_BANK || []).slice();
  const CIRCLED = ["①", "②", "③", "④", "⑤", "⑥"];

  // ---------- 저장소 ----------
  const STORE_KEY = "kh_records_v1";
  function loadStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || { attempts: [] }; }
    catch (e) { return { attempts: [] }; }
  }
  function saveStore(s) { localStorage.setItem(STORE_KEY, JSON.stringify(s)); }
  function recordAttempt(q, correct) {
    const s = loadStore();
    s.attempts.push({ id: q.id, era: q.era, tags: q.concept_tags || [], correct: !!correct, ts: Date.now() });
    saveStore(s);
  }
  function resetStore() { saveStore({ attempts: [] }); }

  // 개념별 취약도 집계: {tag: {tries, wrong}}
  function conceptStats() {
    const s = loadStore(); const m = {};
    for (const a of s.attempts) {
      for (const t of (a.tags || [])) {
        if (!m[t]) m[t] = { tries: 0, wrong: 0 };
        m[t].tries++; if (!a.correct) m[t].wrong++;
      }
    }
    return m;
  }
  function weakConcepts() {
    const m = conceptStats();
    return Object.entries(m)
      .map(([tag, v]) => ({ tag, tries: v.tries, wrong: v.wrong, rate: v.wrong / v.tries }))
      .filter(x => x.wrong > 0)
      .sort((a, b) => b.wrong - a.wrong || b.rate - a.rate);
  }
  function eraStats(eraKey) {
    const s = loadStore(); let tries = 0, correct = 0;
    for (const a of s.attempts) if (a.era === eraKey || matchEra(a.era, eraKey)) { tries++; if (a.correct) correct++; }
    return { tries, correct };
  }
  function matchEra(qEra, key) {
    // 데이터의 era 필드가 "고려" 처럼 저장됨 → 표준키와 매칭
    const map = { "고려": "고려" };
    return (map[qEra] || qEra) === key;
  }

  // ---------- 유틸 ----------
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function eraQuestions(key) { return BANK.filter(q => matchEra(q.era, key)); }
  function el(html) { const d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

  // ---------- 라우팅 ----------
  const app = document.getElementById("app");
  function setNav(route) {
    document.querySelectorAll(".nav button").forEach(b => b.classList.toggle("active", b.dataset.route === route));
  }
  function go(hash) { location.hash = hash; }
  window.addEventListener("hashchange", render);

  function render() {
    const h = location.hash.replace(/^#\/?/, "") || "home";
    const [route, rawArg] = h.split("/");
    const arg = rawArg ? decodeURIComponent(rawArg) : rawArg;
    setNav(route);
    if (route === "home") return renderHome();
    if (route === "exam") return renderExamConfig(arg);
    if (route === "review") return renderReview();
    if (route === "stats") return renderStats();
    return renderHome();
  }

  // ---------- 홈 ----------
  function renderHome() {
    const s = loadStore();
    const total = BANK.length;
    const attempted = new Set(s.attempts.map(a => a.id)).size;
    const tries = s.attempts.length;
    const correct = s.attempts.filter(a => a.correct).length;
    const acc = tries ? Math.round((correct / tries) * 100) : 0;
    const weak = weakConcepts().length;

    app.innerHTML = "";
    app.appendChild(el(`
      <div>
        <h1 class="page">한국사능력검정시험 심화 · 문제은행</h1>
        <div class="tiles" style="margin-bottom:22px">
          <div class="tile"><div class="n">${total.toLocaleString()}</div><div class="l">총 문항</div></div>
          <div class="tile"><div class="n">${attempted}</div><div class="l">푼 문항</div></div>
          <div class="tile"><div class="n">${acc}%</div><div class="l">누적 정답률</div></div>
          <div class="tile"><div class="n">${weak}</div><div class="l">취약 개념</div></div>
        </div>
        <div class="btn-row" style="margin-bottom:22px">
          <button class="btn" id="quickExam">🎯 실전 모의고사 시작</button>
          <button class="btn secondary" id="goReview" ${weak ? "" : "disabled"}>🔁 오답 유사문제 풀기</button>
        </div>
        <div class="section-title">시대별 학습</div>
        <div class="grid cols-2" id="eraGrid"></div>
      </div>
    `));

    const grid = document.getElementById("eraGrid");
    for (const e of ERAS) {
      const qs = eraQuestions(e.key);
      const has = qs.length > 0;
      const st = eraStats(e.key);
      const accE = st.tries ? Math.round((st.correct / st.tries) * 100) : null;
      const card = el(`
        <div class="card era-card ${has ? "" : "disabled"}">
          <h3>${esc(e.name)} ${has ? "" : '<span class="tag">준비중</span>'}</h3>
          <div class="meta">${has ? `${qs.length}문항` : "문항 없음"}${accE != null ? ` · 정답률 ${accE}%` : ""}</div>
        </div>`);
      if (has) card.addEventListener("click", () => go(`#/exam/${e.key}`));
      grid.appendChild(card);
    }
    document.getElementById("quickExam").addEventListener("click", () => go("#/exam"));
    const gr = document.getElementById("goReview");
    if (weak) gr.addEventListener("click", () => go("#/review"));
  }

  // ---------- 모의고사 설정 ----------
  function renderExamConfig(preEra) {
    const availEras = ERAS.filter(e => eraQuestions(e.key).length > 0);
    app.innerHTML = "";
    app.appendChild(el(`
      <div>
        <h1 class="page">모의고사 설정</h1>
        <div class="card">
          <div class="toolbar">
            <label>범위&nbsp;
              <select id="scope">
                <option value="all">전체 시대</option>
                ${availEras.map(e => `<option value="${e.key}" ${preEra === e.key ? "selected" : ""}>${esc(e.name)}</option>`).join("")}
              </select>
            </label>
            <label>문항 수&nbsp;
              <select id="count">
                <option value="10">10문항</option>
                <option value="20" selected>20문항</option>
                <option value="50">50문항 (실전)</option>
              </select>
            </label>
            <label>방식&nbsp;
              <select id="mode">
                <option value="study">학습모드 (문항마다 즉시 해설)</option>
                <option value="real">실전모드 (마지막에 일괄 채점)</option>
              </select>
            </label>
          </div>
          <div class="btn-row">
            <button class="btn" id="start">시작하기</button>
            <button class="btn secondary" id="back">홈으로</button>
          </div>
        </div>
      </div>
    `));
    document.getElementById("back").addEventListener("click", () => go("#/home"));
    document.getElementById("start").addEventListener("click", () => {
      const scope = document.getElementById("scope").value;
      const count = parseInt(document.getElementById("count").value, 10);
      const mode = document.getElementById("mode").value;
      let pool = scope === "all" ? BANK.slice() : eraQuestions(scope);
      pool = shuffle(pool).slice(0, count);
      if (!pool.length) { alert("해당 범위에 문항이 없습니다."); return; }
      startExam(pool, mode, "모의고사");
    });
  }

  // ---------- 시험 실행 ----------
  let EX = null;
  function startExam(pool, mode, title) {
    EX = { pool, mode, title, idx: 0, answers: {}, checked: {} };
    renderExam();
  }
  function renderExam() {
    const { pool, idx, mode } = EX;
    const q = pool[idx];
    const selected = EX.answers[q.id];
    const checked = EX.checked[q.id];
    const pct = Math.round((idx / pool.length) * 100);

    app.innerHTML = "";
    app.appendChild(el(`
      <div>
        <div class="progress-wrap">
          <div class="progress-bar"><i style="width:${pct}%"></i></div>
          <div class="muted" style="font-size:13px;white-space:nowrap">${idx + 1} / ${pool.length}</div>
        </div>
        <div class="card">
          <div class="q-head">
            <span class="q-index">Q${idx + 1}</span>
            <span class="tag diff-${esc(q.difficulty)}">${esc(q.difficulty || "")}</span>
            <span class="tag">${esc(q.topic || "")}</span>
            <span class="tag">${esc(q.type || "")}</span>
          </div>
          ${q.passage ? `<div class="q-passage">${esc(q.passage)}</div>` : ""}
          <div class="q-stem">${esc(q.stem)}</div>
          <div class="choices" id="choices"></div>
          <div id="explainSlot"></div>
        </div>
        <div class="btn-row" style="margin-top:16px">
          <button class="btn secondary" id="prev" ${idx === 0 ? "disabled" : ""}>이전</button>
          <button class="btn" id="next">${idx === pool.length - 1 ? "제출·결과" : "다음"}</button>
          <button class="btn ghost" id="quit" style="margin-left:auto">그만두기</button>
        </div>
      </div>
    `));

    const choicesBox = document.getElementById("choices");
    q.choices.forEach((c, i) => {
      const num = i + 1;
      const btn = el(`<button class="choice" data-n="${num}">
        <span class="num">${CIRCLED[i]}</span><span>${esc(c)}</span></button>`);
      if (selected === num) btn.classList.add("selected");
      if (checked) {
        btn.classList.add("disabled");
        if (num === q.answer) btn.classList.add("correct");
        else if (num === selected) btn.classList.add("wrong");
      } else {
        btn.addEventListener("click", () => {
          EX.answers[q.id] = num;
          if (mode === "study") { checkAndRecord(q); }
          renderExam();
        });
      }
      choicesBox.appendChild(btn);
    });

    if (checked || (mode === "study" && selected)) renderExplain(q);

    document.getElementById("prev").addEventListener("click", () => { EX.idx--; renderExam(); });
    document.getElementById("next").addEventListener("click", () => {
      if (idx === pool.length - 1) return finishExam();
      EX.idx++; renderExam();
    });
    document.getElementById("quit").addEventListener("click", () => { if (confirm("현재 시험을 종료할까요? 채점된 문항 기록은 저장됩니다.")) go("#/home"); });
  }

  function checkAndRecord(q) {
    if (EX.checked[q.id]) return;
    EX.checked[q.id] = true;
    recordAttempt(q, EX.answers[q.id] === q.answer);
  }

  function renderExplain(q) {
    const slot = document.getElementById("explainSlot");
    if (!slot) return;
    const sel = EX.answers[q.id];
    const ok = sel === q.answer;
    slot.appendChild(el(`
      <div class="explain">
        <h4>해설 <span class="verdict ${ok ? "o" : "x"}">${ok ? "정답 ○" : "오답 ✕"}</span>
          <span class="muted">· 정답 ${CIRCLED[q.answer - 1]}</span></h4>
        <div>${esc(q.explanation || "")}</div>
        ${Array.isArray(q.choice_explanations) && q.choice_explanations.length
          ? `<ul>${q.choice_explanations.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
        ${(q.concept_tags || []).length
          ? `<div class="concepts">${q.concept_tags.map(t => `<span class="concept-chip">#${esc(t)}</span>`).join("")}</div>` : ""}
      </div>
    `));
  }

  function finishExam() {
    // 실전모드: 미채점 문항 일괄 기록
    for (const q of EX.pool) {
      if (!EX.checked[q.id] && EX.answers[q.id] != null) checkAndRecord(q);
      else if (!EX.checked[q.id]) { EX.checked[q.id] = true; recordAttempt(q, false); } // 미응답=오답
    }
    const pool = EX.pool;
    const correct = pool.filter(q => EX.answers[q.id] === q.answer).length;
    const acc = Math.round((correct / pool.length) * 100);
    const wrongs = pool.filter(q => EX.answers[q.id] !== q.answer);

    app.innerHTML = "";
    app.appendChild(el(`
      <div>
        <h1 class="page">채점 결과 · ${esc(EX.title)}</h1>
        <div class="card center" style="margin-bottom:18px">
          <div style="font-size:44px;font-weight:800;color:var(--primary)">${correct} / ${pool.length}</div>
          <div class="muted">정답률 ${acc}%</div>
          <div class="btn-row" style="justify-content:center;margin-top:16px">
            <button class="btn" id="retryWrong" ${wrongs.length ? "" : "disabled"}>틀린 ${wrongs.length}문항 다시풀기</button>
            <button class="btn secondary" id="review2" ${wrongs.length ? "" : "disabled"}>유사문제 풀기</button>
            <button class="btn ghost" id="home2">홈으로</button>
          </div>
        </div>
        <div class="section-title">문항별 결과</div>
        <div id="reviewList"></div>
      </div>
    `));

    const list = document.getElementById("reviewList");
    pool.forEach((q, i) => {
      const sel = EX.answers[q.id];
      const ok = sel === q.answer;
      const card = el(`<div class="card" style="margin-bottom:12px">
        <div class="q-head">
          <span class="q-index">Q${i + 1}</span>
          <span class="verdict ${ok ? "o" : "x"}" style="font-weight:800;color:${ok ? "var(--correct)" : "var(--wrong)"}">${ok ? "○" : "✕"}</span>
          <span class="tag">${esc(q.topic || "")}</span>
          <span class="muted" style="font-size:13px">내 답 ${sel ? CIRCLED[sel - 1] : "미응답"} · 정답 ${CIRCLED[q.answer - 1]}</span>
        </div>
        <div style="font-size:15px">${esc(q.stem)}</div>
      </div>`);
      card.style.cursor = "pointer";
      card.addEventListener("click", () => { EX.checked[q.id] = true; startExam([q], "study", "다시보기"); });
      list.appendChild(card);
    });

    document.getElementById("home2").addEventListener("click", () => go("#/home"));
    const rw = document.getElementById("retryWrong");
    if (wrongs.length) rw.addEventListener("click", () => startExam(shuffle(wrongs), "study", "오답 다시풀기"));
    const r2 = document.getElementById("review2");
    if (wrongs.length) r2.addEventListener("click", () => go("#/review"));
  }

  // ---------- 오답 유사문제 ----------
  function similarQuestions(tags, limit) {
    const tagSet = new Set(tags);
    const scored = BANK
      .map(q => ({ q, score: (q.concept_tags || []).filter(t => tagSet.has(t)).length }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score);
    return shuffle(scored.slice(0, Math.max(limit * 2, 20))).slice(0, limit).map(x => x.q);
  }

  function renderReview() {
    const weak = weakConcepts();
    app.innerHTML = "";
    if (!weak.length) {
      app.appendChild(el(`<div><h1 class="page">오답 유사문제</h1>
        <div class="card empty">아직 틀린 문항이 없습니다.<br>모의고사를 풀면 취약 개념이 여기에 모입니다.</div></div>`));
      return;
    }
    app.appendChild(el(`
      <div>
        <h1 class="page">오답 유사문제 · 취약 개념</h1>
        <p class="muted" style="margin-top:-8px">틀린 문항의 개념을 모아 유사문제를 다시 출제합니다.</p>
        <div class="card" style="margin-bottom:18px">
          <div class="btn-row">
            <button class="btn" id="reviewAll">🔁 취약 개념 종합 유사문제 (20문항)</button>
          </div>
        </div>
        <div class="section-title">취약 개념 순위</div>
        <div id="weakList"></div>
      </div>
    `));
    const wl = document.getElementById("weakList");
    weak.slice(0, 30).forEach(w => {
      const rate = Math.round(w.rate * 100);
      const simCount = BANK.filter(q => (q.concept_tags || []).includes(w.tag)).length;
      const row = el(`<div class="card" style="margin-bottom:10px;display:flex;align-items:center;gap:12px">
        <div style="flex:1">
          <div style="font-weight:700">#${esc(w.tag)}</div>
          <div class="muted" style="font-size:13px">${w.wrong}/${w.tries} 오답 · 오답률 ${rate}% · 유사문항 ${simCount}개</div>
        </div>
        <button class="btn secondary" data-tag="${esc(w.tag)}">유사문제</button>
      </div>`);
      row.querySelector("button").addEventListener("click", () => {
        const qs = similarQuestions([w.tag], 10);
        if (!qs.length) { alert("유사문제가 없습니다."); return; }
        startExam(qs, "study", `유사문제 · ${w.tag}`);
      });
      wl.appendChild(row);
    });
    document.getElementById("reviewAll").addEventListener("click", () => {
      const tags = weak.slice(0, 12).map(w => w.tag);
      const qs = similarQuestions(tags, 20);
      if (!qs.length) { alert("유사문제가 없습니다."); return; }
      startExam(qs, "study", "취약 개념 종합 유사문제");
    });
  }

  // ---------- 통계 ----------
  function renderStats() {
    const s = loadStore();
    const tries = s.attempts.length;
    const correct = s.attempts.filter(a => a.correct).length;
    const acc = tries ? Math.round((correct / tries) * 100) : 0;
    app.innerHTML = "";
    app.appendChild(el(`
      <div>
        <h1 class="page">학습 통계</h1>
        <div class="tiles" style="margin-bottom:22px">
          <div class="tile"><div class="n">${tries}</div><div class="l">총 풀이</div></div>
          <div class="tile"><div class="n">${correct}</div><div class="l">정답</div></div>
          <div class="tile"><div class="n">${acc}%</div><div class="l">정답률</div></div>
          <div class="tile"><div class="n">${new Set(s.attempts.map(a=>a.id)).size}</div><div class="l">푼 문항</div></div>
        </div>
        <div class="section-title">시대별 정답률</div>
        <div id="eraBars" class="card"></div>
        <div class="section-title">개념별 취약도 (오답 많은 순)</div>
        <div id="tagBars" class="card"></div>
        <div class="btn-row" style="margin-top:20px">
          <button class="btn ghost" id="reset" style="color:var(--wrong)">기록 초기화</button>
        </div>
      </div>
    `));
    const eb = document.getElementById("eraBars");
    let any = false;
    for (const e of ERAS) {
      const st = eraStats(e.key);
      if (!st.tries) continue; any = true;
      const rate = Math.round((st.correct / st.tries) * 100);
      eb.appendChild(el(`<div class="bar-row">
        <div class="label">${esc(e.name)}</div>
        <div class="track"><i style="width:${rate}%;background:var(--correct)"></i></div>
        <div class="val">${rate}% (${st.correct}/${st.tries})</div></div>`));
    }
    if (!any) eb.innerHTML = `<div class="empty">아직 기록이 없습니다.</div>`;

    const tb = document.getElementById("tagBars");
    const weak = weakConcepts();
    if (!weak.length) tb.innerHTML = `<div class="empty">취약 개념이 없습니다.</div>`;
    weak.slice(0, 15).forEach(w => {
      const rate = Math.round(w.rate * 100);
      tb.appendChild(el(`<div class="bar-row">
        <div class="label">#${esc(w.tag)}</div>
        <div class="track"><i style="width:${rate}%;background:var(--wrong)"></i></div>
        <div class="val">${rate}% (${w.wrong}/${w.tries})</div></div>`));
    });
    document.getElementById("reset").addEventListener("click", () => {
      if (confirm("모든 풀이 기록을 삭제할까요? 되돌릴 수 없습니다.")) { resetStore(); render(); }
    });
  }

  // ---------- 부트 ----------
  document.querySelectorAll(".nav button").forEach(b =>
    b.addEventListener("click", () => go("#/" + b.dataset.route)));
  document.querySelector(".brand").addEventListener("click", () => go("#/home"));

  if (!BANK.length) {
    app.innerHTML = `<div class="card empty">문제 데이터가 아직 없습니다.<br>
      <code>src/data/bank.js</code> 생성 후 새로고침하세요.</div>`;
  } else {
    render();
  }
})();
