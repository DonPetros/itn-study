/* ITN Study — single-page app. Hash routes, no backend. */
(function () {
  "use strict";
  const $ = function (sel, root) { return (root || document).querySelector(sel); };
  const view = $("#view");
  const tabbar = $("#tabbar");
  const modal = $("#modal");

  let COURSE = null;
  let DECKS = null;
  let store = window.ITNStore.load();
  let bootError = null;

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }
  function md(s) {
    const parts = esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .split(/\n\n+/);
    return parts.map(function (p) { return "<p>" + p.replace(/\n/g, "<br>") + "</p>"; }).join("");
  }
  function go(hash) { location.hash = hash; }
  function route() {
    const raw = (location.hash || "#/").replace(/^#/, "");
    const parts = raw.split("/").filter(Boolean);
    return parts;
  }
  function setTab(name) {
    tabbar.querySelectorAll("a").forEach(function (a) {
      a.classList.toggle("on", a.getAttribute("data-tab") === name);
    });
  }
  function immersive(on) {
    document.body.classList.toggle("immersive", !!on);
  }
  function iconGear() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 3v2m0 14v2M5.2 5.2l1.4 1.4m10.8 10.8 1.4 1.4M3 12h2m14 0h2M5.2 18.8l1.4-1.4M17.4 6.6l1.4-1.4"/></svg>';
  }
  function iconBack() { return "‹"; }
  function pct(n, d) { return d ? Math.round((n / d) * 100) : 0; }
  function moduleById(id) { return COURSE.modules.find(function (m) { return m.id === id; }); }
  function moduleProgress(m) {
    const st = window.ITNStore.moduleState(store, m.id);
    const seen = st.cardsSeen.length;
    const cardPct = pct(Math.min(seen, m.cards.length), m.cards.length);
    const quizPct = st.quizBest == null ? 0 : 100;
    // Module is "done" when every card has been opened and a quiz attempt exists.
    const done = seen >= m.cards.length && st.quizBest != null;
    const overall = Math.round(cardPct * 0.6 + (st.quizBest == null ? 0 : 40));
    return { seen: seen, cardPct: cardPct, quizBest: st.quizBest, attempts: st.quizAttempts, done: done, overall: overall, lastCard: st.lastCard || 0 };
  }
  function overallProgress() {
    if (!COURSE) return { done: 0, total: 0, pct: 0 };
    const total = COURSE.modules.length;
    const done = COURSE.modules.filter(function (m) { return moduleProgress(m).done; }).length;
    const avg = Math.round(COURSE.modules.reduce(function (s, m) { return s + moduleProgress(m).overall; }, 0) / total);
    return { done: done, total: total, pct: avg };
  }
  function countdownText() {
    const days = window.ITNStore.daysUntilDue();
    if (days > 1) return { title: days + " days left", note: "ITN is due 28 February 2027." };
    if (days === 1) return { title: "1 day left", note: "ITN is due tomorrow, 28 February 2027." };
    if (days === 0) return { title: "Due today", note: "ITN is due today, 28 February 2027." };
    return { title: "The due date has passed", note: "The date stored in the app is 28 February 2027." };
  }
  function applyChrome() {
    window.ITNStore.applyTheme(store);
  }

  /* ---------- render shell bits ---------- */
  function lbar(backHash, midHtml, rightHtml) {
    return '<div class="lbar">' +
      '<button class="x" type="button" data-go="' + esc(backHash) + '" aria-label="Back">' + iconBack() + "</button>" +
      (midHtml || "") +
      (rightHtml || "") +
      "</div>";
  }
  function actBar(buttons, cls, fb) {
    return '<div class="act' + (cls ? " " + cls : "") + '">' +
      (fb || "") +
      '<div class="in">' + buttons + "</div></div>";
  }
  function revealWhy() {
    const el = view.querySelector(".why");
    if (el) {
      try { el.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
      catch (e) { el.scrollIntoView(true); }
    }
  }

  /* ---------- HOME ---------- */
  function viewHome() {
    immersive(false);
    setTab("learn");
    const cd = countdownText();
    const ov = overallProgress();
    const lastId = store.lastModule;
    const last = lastId ? moduleById(lastId) : COURSE.modules.find(function (m) { return !moduleProgress(m).done; }) || COURSE.modules[0];
    const lastP = last ? moduleProgress(last) : null;
    let continueHtml = "";
    if (last) {
      const nextCard = Math.min(lastP.lastCard, last.cards.length - 1);
      const href = lastP.seen >= last.cards.length && lastP.quizBest == null
        ? "#/module/" + last.id + "/quiz"
        : "#/module/" + last.id + (nextCard ? "/" + nextCard : "");
      const label = lastP.seen >= last.cards.length && lastP.quizBest == null ? "Start the quiz" : (lastP.seen ? "Continue" : "Start");
      continueHtml = '<a class="next" href="' + href + '"><span class="k">Continue</span>' +
        '<div class="t">Module ' + last.number + ": " + esc(last.title) + "</div>" +
        '<div class="s">' + label + " · " + lastP.overall + "% of this module</div></a>";
    }
    const mods = COURSE.modules.map(function (m) {
      const p = moduleProgress(m);
      return '<a class="mod' + (p.done ? " done" : "") + '" href="#/module/' + m.id + '">' +
        '<div class="num">' + (p.done ? "OK" : String(m.number).padStart(2, "0")) + "</div>" +
        '<div class="info"><div class="t">' + esc(m.title) + "</div>" +
        '<div class="s">' + p.seen + "/" + m.cards.length + " cards" +
        (p.quizBest == null ? " · quiz not started" : " · quiz best " + p.quizBest + "%") + "</div>" +
        '<div class="bar" aria-hidden="true"><i style="width:' + p.overall + '%"></i></div></div></a>';
    }).join("");
    view.innerHTML =
      '<div class="top"><div class="brand"><h1 class="name">ITN Study</h1>' +
      '<span class="sub">CCNA v7 Introduction to Networks</span></div>' +
      '<a class="iconbtn text" href="#/me">More</a></div>' +
      '<div class="countdown"><div class="k">Countdown</div><div class="v"><b>' + esc(cd.title) + "</b></div>" +
      "<p>" + esc(cd.note) + "</p></div>" +
      '<div class="stats">' +
      '<div class="stat"><div class="v acc">' + ov.pct + '%</div><div class="k">Overall</div></div>' +
      '<div class="stat"><div class="v">' + ov.done + "/" + ov.total + '</div><div class="k">Modules</div></div>' +
      '<div class="stat"><div class="v">' + (store.streak.count || 0) + '</div><div class="k">Streak</div></div>' +
      "</div>" +
      continueHtml +
      '<a class="btn solid block" href="#/focus" style="margin-bottom:18px">Start a focus session</a>' +
      '<div class="h">Modules</div>' + mods +
      '<p class="foot">Original study notes for personal use. Not affiliated with Cisco. Progress stays on this device.</p>';
  }

  /* ---------- MODULE CARDS ---------- */
  let cardState = { id: null, i: 0 };

  function viewModule(id, index) {
    const m = moduleById(id);
    if (!m) return viewNotFound();
    immersive(true);
    setTab("learn");
    const i = Math.max(0, Math.min(m.cards.length - 1, Number(index) || 0));
    cardState = { id: id, i: i };
    const card = m.cards[i];
    window.ITNStore.markCard(store, id, card.id);
    store = window.ITNStore.load();
    const st = window.ITNStore.moduleState(store, id);
    st.lastCard = i;
    window.ITNStore.save(store);
    const dots = m.cards.map(function (_, n) {
      return "<i class='" + (n < i ? "d" : n === i ? "c" : "") + "'></i>";
    }).join("");
    const analogy = card.analogy
      ? '<div class="analogy"><span class="k">A way to picture it</span>' + md(card.analogy) + "</div>"
      : "";
    const isLast = i === m.cards.length - 1;
    view.innerHTML =
      lbar("#/", '<div class="prog" aria-hidden="true">' + dots + "</div>" +
        '<div class="cnt">' + (i + 1) + "/" + m.cards.length + "</div>") +
      '<div class="step">' +
      '<div class="kind">Module ' + m.number + " · " + esc(m.title) + "</div>" +
      "<h3>" + esc(card.title) + "</h3>" +
      '<div class="body">' + md(card.body) + "</div>" + analogy +
      "</div>" +
      actBar(
        (i > 0 ? '<button class="btn ghost" type="button" data-go="#/module/' + id + "/" + (i - 1) + '">Back</button>' : "") +
        (isLast
          ? '<a class="btn solid" href="#/module/' + id + '/quiz">Start quiz</a>'
          : '<button class="btn solid" type="button" data-go="#/module/' + id + "/" + (i + 1) + '">Next</button>')
      );
  }

  /* ---------- QUIZ ---------- */
  let quizState = null;

  function shuffleOptions(q) {
    const order = window.ITNSubnet.shuffle(q.options.map(function (_, i) { return i; }));
    return {
      q: q.q,
      id: q.id,
      why: q.why,
      options: order.map(function (i) { return q.options[i]; }),
      answer: order.indexOf(q.answer)
    };
  }

  function startQuiz(id) {
    const m = moduleById(id);
    if (!m) return viewNotFound();
    quizState = {
      id: id,
      items: m.quiz.map(shuffleOptions),
      i: 0,
      score: 0,
      picked: null,
      locked: false
    };
    renderQuiz();
  }

  function renderQuiz() {
    const m = moduleById(quizState.id);
    immersive(true);
    setTab("learn");
    const q = quizState.items[quizState.i];
    const dots = quizState.items.map(function (_, n) {
      return "<i class='" + (n < quizState.i ? "d" : n === quizState.i ? "c" : "") + "'></i>";
    }).join("");
    const letters = "ABCD";
    const opts = q.options.map(function (t, n) {
      let cls = "opt";
      if (quizState.locked) {
        if (n === q.answer) cls += " right";
        else if (n === quizState.picked) cls += " wrong";
      } else if (n === quizState.picked) cls += " sel";
      return '<button class="' + cls + '" type="button" data-pick="' + n + '">' +
        '<span class="ol">' + letters[n] + '</span><span class="ot">' + esc(t) + "</span></button>";
    }).join("");
    let why = "";
    let actCls = "";
    let actInner;
    let actFb = "";
    if (quizState.locked) {
      const ok = quizState.picked === q.answer;
      actCls = ok ? "fb-ok" : "fb-bad";
      why = '<div class="why"><div class="k">Why</div>' + md(q.why) + "</div>";
      const last = quizState.i === quizState.items.length - 1;
      actFb = '<div class="fb"><div class="ft">' + (ok ? "Correct" : "Not quite") + "</div></div>";
      actInner = '<button class="btn solid" type="button" data-quiz="' + (last ? "end" : "next") + '">' +
        (last ? "See results" : "Next") + "</button>";
    } else {
      actInner = '<button class="btn solid" type="button" data-quiz="check" ' +
        (quizState.picked == null ? "disabled" : "") + ">Check</button>";
    }
    view.innerHTML =
      lbar("#/module/" + m.id, '<div class="prog" aria-hidden="true">' + dots + "</div>" +
        '<div class="cnt">' + (quizState.i + 1) + "/" + quizState.items.length + "</div>") +
      '<div class="step">' +
      '<div class="kind">Module ' + m.number + " · quiz</div>" +
      '<div class="q">' + esc(q.q) + "</div>" +
      '<div class="opts' + (quizState.locked ? " locked" : "") + '">' + opts + "</div>" +
      why + "</div>" +
      actBar(actInner, actCls, actFb);
    if (quizState.locked) revealWhy();
  }

  function viewQuizResults() {
    const m = moduleById(quizState.id);
    const total = quizState.items.length;
    const score = quizState.score;
    const rec = window.ITNStore.recordQuiz(store, m.id, score, total);
    store = rec.data;
    window.ITNStore.noteStreakDay(store);
    store = window.ITNStore.load();
    quizState._ended = true;
    immersive(true);
    setTab("learn");
    const next = COURSE.modules[COURSE.modules.indexOf(m) + 1];
    view.innerHTML =
      lbar("#/", "") +
      '<div class="done">' +
      '<div class="kind">Module ' + m.number + "</div>" +
      "<h2>" + esc(m.title) + "</h2>" +
      '<div class="big">' + rec.pct + "%</div>" +
      "<p>You got <b>" + score + "</b> out of <b>" + total + "</b>. Best so far: " +
      window.ITNStore.moduleState(store, m.id).quizBest + "%.</p>" +
      '<div class="stats"><div class="stat"><div class="v">' + score + "/" + total + '</div><div class="k">This try</div></div>' +
      '<div class="stat"><div class="v">' + window.ITNStore.moduleState(store, m.id).quizAttempts + '</div><div class="k">Attempts</div></div>' +
      '<div class="stat"><div class="v acc">' + window.ITNStore.moduleState(store, m.id).quizBest + '%</div><div class="k">Best</div></div></div>' +
      '<button class="btn solid block" type="button" data-quiz-restart="' + m.id + '">Try the quiz again</button>' +
      (next ? '<a class="btn block" href="#/module/' + next.id + '" style="margin-top:10px">Next module: ' + esc(next.title) + "</a>" : "") +
      '<a class="btn ghost block" href="#/" style="margin-top:10px">Back to the module list</a>' +
      "</div>";
  }

  /* ---------- DRILL ---------- */
  let drill = null;

  function viewDrillHome() {
    immersive(false);
    setTab("drill");
    view.innerHTML =
      '<div class="top"><div class="brand"><h1 class="name">Drill</h1>' +
      '<span class="sub">Generated questions, marked in the app, with the working shown.</span></div>' +
      '<a class="iconbtn text" href="#/me">More</a></div>' +
      '<a class="next" href="#/drill/subnet"><span class="k">IPv4</span>' +
      '<div class="t">Subnetting</div>' +
      "<div class=\"s\">Usable hosts, network and broadcast, first and last usable, masks, and which subnet an address sits in.</div></a>" +
      '<a class="next" href="#/drill/convert"><span class="k">Module 5</span>' +
      '<div class="t">Binary, decimal and hex</div>' +
      "<div class=\"s\">Convert an octet in any direction, with the bit weights written out.</div></a>" +
      '<p class="foot">Answers are calculated, not stored as a fixed list, so they stay correct. /31 and /32 follow RFC 3021 and the single-host rule; most questions use the usual ITN − 2 rule for /16–/30.</p>';
  }

  function startDrill(kind, typ) {
    drill = { kind: kind, typ: typ || "mixed", q: null, picked: null, locked: false, typed: "", correct: 0, total: 0 };
    nextDrill();
  }

  function nextDrill() {
    drill.picked = null;
    drill.locked = false;
    drill.typed = "";
    drill.q = drill.kind === "convert"
      ? window.ITNSubnet.nextConvertQuestion(drill.typ)
      : window.ITNSubnet.nextSubnetQuestion(drill.typ);
    renderDrill();
  }

  function typeLabel(kind, typ) {
    const subnet = {
      mixed: "Mixed", usable: "Usable hosts", total: "Block size", mask: "Mask from prefix",
      prefix: "Prefix from mask", network: "Network address", broadcast: "Broadcast",
      first: "First usable", last: "Last usable", which: "Which subnet", classify: "Classify"
    };
    const conv = {
      mixed: "Mixed", dec2bin: "Decimal to binary", bin2dec: "Binary to decimal",
      dec2hex: "Decimal to hex", hex2dec: "Hex to decimal", bin2hex: "Binary to hex"
    };
    return kind === "convert" ? (conv[typ] || typ) : (subnet[typ] || typ);
  }

  function renderDrill() {
    immersive(true);
    setTab("drill");
    const q = drill.q;
    const types = drill.kind === "convert" ? ["mixed"].concat(window.ITNSubnet.CONV_TYPES) : ["mixed"].concat(window.ITNSubnet.TYPES);
    const chips = types.map(function (t) {
      return '<button class="chip' + (drill.typ === t ? " on" : "") + '" type="button" data-drill-type="' + t + '">' +
        esc(typeLabel(drill.kind, t)) + "</button>";
    }).join("");
    let body;
    if (q.input === "choice") {
      const letters = "ABCD";
      body = '<div class="opts' + (drill.locked ? " locked" : "") + '">' + q.options.map(function (t, n) {
        let cls = "opt";
        if (drill.locked) {
          if (String(t) === String(q.answer)) cls += " right";
          else if (n === drill.picked) cls += " wrong";
        } else if (n === drill.picked) cls += " sel";
        return '<button class="' + cls + '" type="button" data-pick="' + n + '">' +
          '<span class="ol">' + letters[n] + '</span><span class="ot">' + esc(t) + "</span></button>";
      }).join("") + "</div>";
    } else {
      const ph = q.input === "binary" ? "e.g. 11000000" : q.input === "hex" ? "e.g. C0" : "e.g. 192";
      const cls = !drill.locked ? "" : (window.ITNSubnet.answersMatch(drill.typed, q) ? " ok" : " bad");
      body = '<input class="field' + cls + '" id="drill-in" type="text" inputmode="' +
        (q.input === "number" ? "numeric" : "text") + '" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="' +
        ph + '" value="' + esc(drill.typed) + '"' + (drill.locked ? " disabled" : "") + ">";
    }
    let why = "";
    let actCls = "";
    let actInner;
    let actFb = "";
    if (drill.locked) {
      const ok = q.input === "choice"
        ? String(q.options[drill.picked]) === String(q.answer)
        : window.ITNSubnet.answersMatch(drill.typed, q);
      actCls = ok ? "fb-ok" : "fb-bad";
      why = '<div class="why"><div class="k">Worked steps</div><ol>' +
        q.explain.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol></div>";
      actFb = '<div class="fb"><div class="ft">' + (ok ? "Correct" : "Not quite — it is " + esc(q.answer)) + "</div></div>";
      actInner = '<button class="btn solid" type="button" data-drill="next">Next</button>';
    } else {
      actInner = '<button class="btn solid" type="button" data-drill="check">Check</button>';
    }
    view.innerHTML =
      lbar("#/drill", '<div class="cnt">' + drill.correct + "/" + drill.total + "</div>") +
      '<div class="step">' +
      '<div class="kind">' + (drill.kind === "convert" ? "Number systems" : "Subnetting") + " · " + esc(typeLabel(drill.kind, drill.typ)) + "</div>" +
      '<div class="chips">' + chips + "</div>" +
      '<div class="q">' + esc(q.prompt) + "</div>" + body + why +
      "</div>" + actBar(actInner, actCls, actFb);
    if (drill.locked) revealWhy();
    const input = $("#drill-in");
    if (input && !drill.locked) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }

  function checkDrill() {
    const q = drill.q;
    if (q.input === "choice") {
      if (drill.picked == null) return;
    } else {
      const input = $("#drill-in");
      drill.typed = input ? input.value : drill.typed;
      if (!String(drill.typed).trim()) return;
    }
    const ok = q.input === "choice"
      ? String(q.options[drill.picked]) === String(q.answer)
      : window.ITNSubnet.answersMatch(drill.typed, q);
    drill.locked = true;
    drill.total += 1;
    if (ok) drill.correct += 1;
    renderDrill();
  }

  /* ---------- FLASHCARDS ---------- */
  let cardReview = null;

  function viewCardsHome() {
    immersive(false);
    setTab("cards");
    const due = window.ITNStore.dueCards(store, DECKS.cards);
    const byDeck = {};
    DECKS.decks.forEach(function (d) { byDeck[d.id] = { title: d.title, total: 0, due: 0 }; });
    DECKS.cards.forEach(function (c) {
      if (!byDeck[c.deck]) return;
      byDeck[c.deck].total += 1;
    });
    due.forEach(function (c) { if (byDeck[c.deck]) byDeck[c.deck].due += 1; });
    const rows = DECKS.decks.map(function (d) {
      const info = byDeck[d.id];
      return '<a class="mod" href="#/cards/' + d.id + '"><div class="num">' + info.due + "</div>" +
        '<div class="info"><div class="t">' + esc(d.title) + "</div>" +
        '<div class="s">' + info.due + " due · " + info.total + " cards in this deck</div></div></a>";
    }).join("");
    view.innerHTML =
      '<div class="top"><div class="brand"><h1 class="name">Cards</h1>' +
      '<span class="sub">Short prompts. Cards you miss come back sooner.</span></div>' +
      '<a class="iconbtn text" href="#/me">More</a></div>' +
      '<div class="stats"><div class="stat"><div class="v acc">' + due.length + '</div><div class="k">Due now</div></div>' +
      '<div class="stat"><div class="v">' + DECKS.cards.length + '</div><div class="k">In the box</div></div>' +
      '<div class="stat"><div class="v">' + (store.streak.count || 0) + '</div><div class="k">Streak</div></div></div>' +
      (due.length
        ? '<a class="btn solid block" href="#/cards/all" style="margin-bottom:16px">Review all due cards</a>'
        : '<div class="banner" style="margin-bottom:16px">Nothing is due right now. Open a deck anyway if you want a fresh pass.</div>') +
      '<div class="h">Decks</div>' + rows;
  }

  function startCards(deckId) {
    let pool = DECKS.cards;
    if (deckId && deckId !== "all") pool = pool.filter(function (c) { return c.deck === deckId; });
    let due = window.ITNStore.dueCards(store, pool);
    if (!due.length) due = window.ITNSubnet.shuffle(pool).slice();
    else due = window.ITNSubnet.shuffle(due);
    cardReview = { queue: due, i: 0, revealed: false, again: 0, good: 0, deck: deckId || "all" };
    renderCardReview();
  }

  function deckTitle(id) {
    if (id === "all") return "All due cards";
    const d = DECKS.decks.find(function (x) { return x.id === id; });
    return d ? d.title : id;
  }

  function renderCardReview() {
    immersive(true);
    setTab("cards");
    if (!cardReview.queue.length || cardReview.i >= cardReview.queue.length) {
      window.ITNStore.noteStreakDay(store);
      store = window.ITNStore.load();
      view.innerHTML = lbar("#/cards", "") +
        '<div class="done"><h2>Deck done</h2>' +
        '<p>Again: <b>' + cardReview.again + "</b>. Good: <b>" + cardReview.good + "</b>.</p>" +
        '<a class="btn solid block" href="#/cards/' + cardReview.deck + '">Review again</a>' +
        '<a class="btn ghost block" href="#/cards" style="margin-top:10px">Back to decks</a></div>';
      return;
    }
    const c = cardReview.queue[cardReview.i];
    const deck = DECKS.decks.find(function (d) { return d.id === c.deck; });
    const extra = c.extra && cardReview.revealed
      ? '<p class="muted small" style="margin-top:10px">' + esc(c.extra) + "</p>" : "";
    view.innerHTML =
      lbar("#/cards", '<div class="cnt">' + (cardReview.i + 1) + "/" + cardReview.queue.length + "</div>") +
      '<div class="step"><div class="kind">' + esc(deckTitle(cardReview.deck)) + "</div>" +
      '<button class="flash" type="button" data-cards="flip" aria-label="' +
      (cardReview.revealed ? "Card answer showing" : "Show the answer") + '">' +
      '<div class="deck">' + esc(deck ? deck.title : c.deck) + "</div>" +
      '<div class="front">' + esc(c.front) + "</div>" +
      (cardReview.revealed ? '<div class="back">' + esc(c.back) + extra + "</div>" : '<div class="tap">Tap the card to show the answer</div>') +
      "</button></div>" +
      (cardReview.revealed
        ? actBar(
          '<button class="btn bad" type="button" data-cards="again">Again</button>' +
          '<button class="btn ok solid" type="button" data-cards="good">Good</button>' +
          '<button class="btn" type="button" data-cards="easy">Easy</button>'
        )
        : actBar('<button class="btn solid" type="button" data-cards="flip">Show answer</button>'));
  }

  function rateCard(rating) {
    const c = cardReview.queue[cardReview.i];
    window.ITNStore.review(store, c.id, rating);
    store = window.ITNStore.load();
    if (rating === "again") {
      cardReview.again += 1;
      // Put it back a few places later so it is seen again in this session.
      const later = Math.min(cardReview.queue.length, cardReview.i + 3);
      cardReview.queue.splice(later, 0, c);
    } else {
      cardReview.good += 1;
    }
    cardReview.i += 1;
    cardReview.revealed = false;
    renderCardReview();
  }

  /* ---------- FOCUS ---------- */
  let focus = null;
  let focusTimer = null;

  function viewFocusHome() {
    immersive(false);
    setTab("focus");
    const due = window.ITNStore.dueCards(store, DECKS.cards);
    view.innerHTML =
      '<div class="top"><div class="brand"><h1 class="name">Focus</h1>' +
      '<span class="sub">A short, mixed session with a timer. Pick a length you can actually finish.</span></div>' +
      '<a class="iconbtn text" href="#/me">More</a></div>' +
      '<div class="stats"><div class="stat"><div class="v acc">' + (store.streak.count || 0) + '</div><div class="k">Streak</div></div>' +
      '<div class="stat"><div class="v">' + (store.focus.completed || 0) + '</div><div class="k">Sessions</div></div>' +
      '<div class="stat"><div class="v">' + due.length + '</div><div class="k">Cards due</div></div></div>' +
      '<div class="h">Length</div>' +
      '<div class="row" style="margin-bottom:14px">' +
      '<button class="btn solid" type="button" data-focus-start="5">5 min</button>' +
      '<button class="btn solid" type="button" data-focus-start="8">8 min</button>' +
      '<button class="btn solid" type="button" data-focus-start="10">10 min</button>' +
      "</div>" +
      '<div class="card"><p>Each session mixes due flashcards, a few module quiz questions, and one subnetting question. The timer stays visible. You can pause if you need to. The streak counts a session you finish (including when the timer runs out).</p></div>';
  }

  function buildFocusQueue() {
    const items = [];
    let due = window.ITNStore.dueCards(store, DECKS.cards);
    due = window.ITNSubnet.shuffle(due).slice(0, 8);
    if (due.length < 5) {
      const extra = window.ITNSubnet.shuffle(DECKS.cards.filter(function (c) { return due.indexOf(c) === -1; })).slice(0, 5 - due.length);
      due = due.concat(extra);
    }
    due.forEach(function (c) { items.push({ kind: "card", card: c, revealed: false }); });
    // Three quiz questions from weaker or unattempted modules, else any.
    const ranked = COURSE.modules.slice().sort(function (a, b) {
      const pa = moduleProgress(a), pb = moduleProgress(b);
      const sa = pa.quizBest == null ? -1 : pa.quizBest;
      const sb = pb.quizBest == null ? -1 : pb.quizBest;
      return sa - sb;
    });
    const quizItems = [];
    ranked.slice(0, 6).forEach(function (m) {
      window.ITNSubnet.shuffle(m.quiz).slice(0, 1).forEach(function (q) {
        quizItems.push({ kind: "quiz", module: m, item: shuffleOptions(q), picked: null, locked: false });
      });
    });
    quizItems.slice(0, 3).forEach(function (it) { items.push(it); });
    items.push({ kind: "subnet", q: window.ITNSubnet.nextSubnetQuestion("mixed"), picked: null, locked: false });
    return window.ITNSubnet.shuffle(items);
  }

  function startFocus(minutes) {
    stopFocusTimer();
    const ms = minutes * 60 * 1000;
    focus = {
      minutes: minutes,
      remaining: ms,
      running: true,
      lastTick: Date.now(),
      queue: buildFocusQueue(),
      i: 0,
      correct: 0,
      wrong: 0,
      cards: 0,
      timedOut: false,
      done: false
    };
    focusTimer = setInterval(tickFocus, 250);
    renderFocus();
  }

  function stopFocusTimer() {
    if (focusTimer) { clearInterval(focusTimer); focusTimer = null; }
  }

  function tickFocus() {
    if (!focus || !focus.running || focus.done) return;
    const now = Date.now();
    focus.remaining -= (now - focus.lastTick);
    focus.lastTick = now;
    if (focus.remaining <= 0) {
      focus.remaining = 0;
      focus.running = false;
      focus.timedOut = true;
      stopFocusTimer();
    }
    const el = $("#focus-timer");
    if (el) {
      el.textContent = formatMs(focus.remaining);
      el.className = "timer" + (focus.remaining <= 30000 ? " warn" : "") + (focus.remaining <= 0 ? " out" : "");
    }
    const pauseBtn = $("[data-focus='pause']");
    if (focus.remaining <= 0 && pauseBtn) {
      // If the current item is already locked or is an unrevealed wait, allow finish on next action.
      // Update the timer label; the next Check/Good will end the session.
    }
  }

  function formatMs(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return String(m) + ":" + String(r).padStart(2, "0");
  }

  function maybeEndFocus() {
    if (focus.timedOut || focus.i >= focus.queue.length) {
      finishFocus();
      return true;
    }
    return false;
  }

  function finishFocus() {
    if (focus.done) return;
    focus.done = true;
    focus.running = false;
    stopFocusTimer();
    window.ITNStore.completeFocus(store);
    store = window.ITNStore.load();
    immersive(true);
    setTab("focus");
    view.innerHTML =
      lbar("#/focus", "") +
      '<div class="done">' +
      "<h2>Session done</h2>" +
      (focus.timedOut ? "<p>The timer ran out. Anything you had already answered still counts.</p>" : "<p>You cleared the queue.</p>") +
      '<div class="big">' + (store.streak.count || 0) + " day streak</div>" +
      '<div class="stats">' +
      '<div class="stat"><div class="v acc">' + focus.correct + '</div><div class="k">Correct</div></div>' +
      '<div class="stat"><div class="v">' + focus.wrong + '</div><div class="k">Missed</div></div>' +
      '<div class="stat"><div class="v">' + focus.cards + '</div><div class="k">Cards</div></div>' +
      "</div>" +
      '<button class="btn solid block" type="button" data-focus-start="' + focus.minutes + '">Start another ' + focus.minutes + " minutes</button>" +
      '<a class="btn ghost block" href="#/" style="margin-top:10px">Back to Learn</a></div>';
  }

  function renderFocus() {
    if (!focus || focus.done) return;
    if (focus.i >= focus.queue.length) return finishFocus();
    immersive(true);
    setTab("focus");
    const it = focus.queue[focus.i];
    const timerCls = "timer" + (focus.remaining <= 30000 ? " warn" : "") + (focus.remaining <= 0 ? " out" : "");
    const timer = '<div class="timer-row"><div class="timer ' + timerCls + '" id="focus-timer">' + formatMs(focus.remaining) + "</div>" +
      '<button class="btn sm ghost" type="button" data-focus="pause">' + (focus.running ? "Pause" : "Resume") + "</button></div>";
    const left = (focus.queue.length - focus.i);
    let body = "";
    let act = "";
    let actCls = "";
    let actFb = "";

    if (it.kind === "card") {
      const deck = DECKS.decks.find(function (d) { return d.id === it.card.deck; });
      const extra = it.card.extra && it.revealed ? '<p class="muted small" style="margin-top:10px">' + esc(it.card.extra) + "</p>" : "";
      body = '<div class="kind">Flashcard · ' + left + " left</div>" + timer +
        '<button class="flash" type="button" data-focus="flip">' +
        '<div class="deck">' + esc(deck ? deck.title : it.card.deck) + "</div>" +
        '<div class="front">' + esc(it.card.front) + "</div>" +
        (it.revealed ? '<div class="back">' + esc(it.card.back) + extra + "</div>" : '<div class="tap">Tap the card to show the answer</div>') +
        "</button>";
      act = it.revealed
        ? '<button class="btn bad" type="button" data-focus="again">Again</button>' +
          '<button class="btn ok solid" type="button" data-focus="good">Good</button>'
        : '<button class="btn solid" type="button" data-focus="flip">Show answer</button>';
    } else if (it.kind === "quiz" || it.kind === "subnet") {
      const qtext = it.kind === "quiz" ? it.item.q : it.q.prompt;
      const options = it.kind === "quiz" ? it.item.options : it.q.options;
      const answer = it.kind === "quiz" ? it.item.answer : options.indexOf(it.q.answer);
      const letters = "ABCD";
      const opts = options.map(function (t, n) {
        let cls = "opt";
        if (it.locked) {
          if (n === answer) cls += " right";
          else if (n === it.picked) cls += " wrong";
        } else if (n === it.picked) cls += " sel";
        return '<button class="' + cls + '" type="button" data-pick="' + n + '">' +
          '<span class="ol">' + letters[n] + '</span><span class="ot">' + esc(t) + "</span></button>";
      }).join("");
      const why = it.locked
        ? '<div class="why"><div class="k">Why</div>' +
          (it.kind === "quiz" ? md(it.item.why) : "<ol>" + it.q.explain.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol>") +
          "</div>"
        : "";
      body = '<div class="kind">' + (it.kind === "quiz" ? ("Quiz · " + esc(it.module.title)) : "Subnetting") +
        " · " + left + " left</div>" + timer +
        '<div class="q">' + esc(qtext) + "</div>" +
        '<div class="opts' + (it.locked ? " locked" : "") + '">' + opts + "</div>" + why;
      if (it.locked) {
        const ok = it.picked === answer;
        actCls = ok ? "fb-ok" : "fb-bad";
        actFb = '<div class="fb"><div class="ft">' + (ok ? "Correct" : "Not quite") + "</div></div>";
        act = '<button class="btn solid" type="button" data-focus="next">Next</button>';
      } else {
        act = '<button class="btn solid" type="button" data-focus="check" ' + (it.picked == null ? "disabled" : "") + ">Check</button>";
      }
    }
    view.innerHTML = lbar("#/focus", "") + '<div class="step">' + body + "</div>" + actBar(act, actCls, actFb);
    if (it.locked) revealWhy();
  }

  function focusAdvance() {
    focus.i += 1;
    if (maybeEndFocus()) return;
    renderFocus();
  }

  /* ---------- SETTINGS / ME ---------- */
  function viewMe() {
    immersive(false);
    setTab("learn");
    const ov = overallProgress();
    const rows = COURSE.modules.map(function (m) {
      const p = moduleProgress(m);
      return '<div class="set"><div class="st"><b>Module ' + m.number + " · " + esc(m.title) + "</b>" +
        "<span>" + p.seen + "/" + m.cards.length + " cards" +
        (p.quizBest == null ? " · quiz not started" : " · best " + p.quizBest + "%") +
        "</span></div></div>";
    }).join("");
    view.innerHTML =
      '<div class="top"><div class="brand"><h1 class="name">Progress</h1>' +
      '<span class="sub">Everything is stored only in this browser.</span></div></div>' +
      '<div class="stats">' +
      '<div class="stat"><div class="v acc">' + ov.pct + '%</div><div class="k">Overall</div></div>' +
      '<div class="stat"><div class="v">' + ov.done + "/" + ov.total + '</div><div class="k">Done</div></div>' +
      '<div class="stat"><div class="v">' + (store.streak.count || 0) + '</div><div class="k">Streak</div></div>' +
      "</div>" +
      '<div class="card">' +
      '<div class="set"><div class="st"><b>Dark theme</b><span>A darker background for low light.</span></div>' +
      '<button class="sw" type="button" role="switch" aria-checked="' + (store.theme === "dark") + '" data-set="theme" aria-label="Dark theme"></button></div>' +
      '<div class="set"><div class="st"><b>Larger text</b><span>Increases the base size on every screen.</span></div>' +
      '<button class="sw" type="button" role="switch" aria-checked="' + (!!store.large) + '" data-set="large" aria-label="Larger text"></button></div>' +
      "</div>" +
      '<div class="h">Add to the home screen</div>' +
      '<div class="card"><p>On an iPhone, open this site in Safari, tap the Share button, then <b>Add to Home Screen</b>. On Android, use the browser menu and <b>Install app</b> or <b>Add to Home screen</b>. After that it works offline.</p></div>' +
      '<div class="h">Modules</div><div class="card">' + rows + "</div>" +
      '<a class="btn ghost block" href="#/sources">Where the facts were checked</a>' +
      '<button class="btn bad block" type="button" data-set="reset" style="margin-top:10px">Clear all progress on this device</button>' +
      '<p class="foot"><a href="#/">Back to Learn</a></p>';
  }

  function viewSources() {
    immersive(false);
    setTab("learn");
    const lis = COURSE.sources.map(function (s) {
      return "<li><a href=\"" + esc(s.url) + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + esc(s.name) + "</a></li>";
    }).join("");
    view.innerHTML =
      lbar("#/me", "") +
      '<div class="step"><h3>Where the facts were checked</h3>' +
      "<p>The wording of every explainer and quiz is original. Facts were checked against public sources, not against NetAcad pages or exam-dump sites. Module titles follow the public ITN v7.02 list.</p>" +
      '<ul class="list-plain">' + lis + "</ul>" +
      "<p>This is a personal study aid. It is not affiliated with, or endorsed by, Cisco or Cisco Networking Academy. Cisco is a trademark of Cisco Systems, Inc.</p>" +
      "</div>";
  }

  function viewNotFound() {
    immersive(false);
    view.innerHTML = '<div class="step"><h3>That page is not here</h3><p><a href="#/">Back to Learn</a></p></div>';
  }

  function confirmReset() {
    modal.hidden = false;
    modal.innerHTML = '<div class="sheet" role="dialog" aria-labelledby="rs-title">' +
      '<h3 id="rs-title">Clear all progress?</h3>' +
      "<p>This removes module progress, quiz scores, flashcard timing and the streak from this browser. The content of the app is not deleted.</p>" +
      '<div class="row"><button class="btn ghost" type="button" data-modal="close">Cancel</button>' +
      '<button class="btn bad solid" type="button" data-modal="reset">Clear progress</button></div></div>';
  }

  /* ---------- events ---------- */
  document.addEventListener("click", function (e) {
    const goEl = e.target.closest("[data-go]");
    if (goEl) { e.preventDefault(); go(goEl.getAttribute("data-go")); return; }

    const pick = e.target.closest("[data-pick]");
    if (pick) {
      const n = Number(pick.getAttribute("data-pick"));
      if (focus && !focus.done && document.body.classList.contains("immersive") && location.hash.indexOf("focus") !== -1) {
        const it = focus.queue[focus.i];
        if (it && (it.kind === "quiz" || it.kind === "subnet") && !it.locked) {
          it.picked = n;
          renderFocus();
        }
        return;
      }
      if (quizState && !quizState.locked && location.hash.indexOf("/quiz") !== -1) {
        quizState.picked = n;
        renderQuiz();
        return;
      }
      if (drill && !drill.locked) {
        drill.picked = n;
        renderDrill();
        return;
      }
    }

    const restart = e.target.closest("[data-quiz-restart]");
    if (restart) {
      const id = restart.getAttribute("data-quiz-restart");
      quizState = null;
      if (location.hash !== "#/module/" + id + "/quiz") go("#/module/" + id + "/quiz");
      else startQuiz(id);
      return;
    }

    const quizBtn = e.target.closest("[data-quiz]");
    if (quizBtn && quizState) {
      const act = quizBtn.getAttribute("data-quiz");
      if (act === "check" && quizState.picked != null && !quizState.locked) {
        quizState.locked = true;
        if (quizState.picked === quizState.items[quizState.i].answer) quizState.score += 1;
        renderQuiz();
      } else if (act === "next") {
        quizState.i += 1;
        quizState.picked = null;
        quizState.locked = false;
        renderQuiz();
      } else if (act === "end") {
        viewQuizResults();
      }
      return;
    }

    const dtype = e.target.closest("[data-drill-type]");
    if (dtype && drill) {
      drill.typ = dtype.getAttribute("data-drill-type");
      nextDrill();
      return;
    }
    const dbtn = e.target.closest("[data-drill]");
    if (dbtn && drill) {
      const act = dbtn.getAttribute("data-drill");
      if (act === "check") checkDrill();
      else if (act === "next") nextDrill();
      return;
    }

    const cbtn = e.target.closest("[data-cards]");
    if (cbtn && cardReview) {
      const act = cbtn.getAttribute("data-cards");
      if (act === "flip") { cardReview.revealed = true; renderCardReview(); }
      else if (act === "again" || act === "good" || act === "easy") rateCard(act);
      return;
    }

    const fs = e.target.closest("[data-focus-start]");
    if (fs) {
      e.preventDefault();
      go("#/focus/run");
      startFocus(Number(fs.getAttribute("data-focus-start")));
      return;
    }
    const fbtn = e.target.closest("[data-focus]");
    if (fbtn && focus && !focus.done) {
      const act = fbtn.getAttribute("data-focus");
      const it = focus.queue[focus.i];
      if (act === "pause") {
        if (focus.running) {
          focus.running = false;
          focus.remaining -= (Date.now() - focus.lastTick);
          stopFocusTimer();
        } else if (focus.remaining > 0) {
          focus.running = true;
          focus.lastTick = Date.now();
          focusTimer = setInterval(tickFocus, 250);
        }
        renderFocus();
        return;
      }
      if (act === "flip" && it.kind === "card") { it.revealed = true; renderFocus(); return; }
      if ((act === "again" || act === "good") && it.kind === "card") {
        window.ITNStore.review(store, it.card.id, act === "again" ? "again" : "good");
        store = window.ITNStore.load();
        focus.cards += 1;
        if (act === "good") focus.correct += 1; else focus.wrong += 1;
        if (act === "again") {
          const later = Math.min(focus.queue.length, focus.i + 3);
          focus.queue.splice(later, 0, { kind: "card", card: it.card, revealed: false });
        }
        focusAdvance();
        return;
      }
      if (act === "check" && it && it.picked != null && !it.locked) {
        it.locked = true;
        const answer = it.kind === "quiz" ? it.item.answer : it.q.options.indexOf(it.q.answer);
        if (it.picked === answer) focus.correct += 1; else focus.wrong += 1;
        renderFocus();
        return;
      }
      if (act === "next") { focusAdvance(); return; }
    }

    const setBtn = e.target.closest("[data-set]");
    if (setBtn) {
      const act = setBtn.getAttribute("data-set");
      if (act === "theme") {
        store.theme = store.theme === "dark" ? "light" : "dark";
        window.ITNStore.save(store);
        applyChrome();
        viewMe();
      } else if (act === "large") {
        store.large = !store.large;
        window.ITNStore.save(store);
        applyChrome();
        viewMe();
      } else if (act === "reset") {
        confirmReset();
      }
      return;
    }
    const modalBtn = e.target.closest("[data-modal]");
    if (modalBtn) {
      const act = modalBtn.getAttribute("data-modal");
      if (act === "close") { modal.hidden = true; modal.innerHTML = ""; }
      else if (act === "reset") {
        store = window.ITNStore.resetAll();
        applyChrome();
        modal.hidden = true;
        modal.innerHTML = "";
        go("#/me");
        render();
      }
      return;
    }
    if (e.target === modal) { modal.hidden = true; modal.innerHTML = ""; }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    if (drill && !drill.locked && $("#drill-in") && document.activeElement === $("#drill-in")) {
      e.preventDefault();
      checkDrill();
    }
  });
  document.addEventListener("input", function (e) {
    if (e.target && e.target.id === "drill-in" && drill) drill.typed = e.target.value;
  });

  /* ---------- router ---------- */
  function render() {
    if (bootError) {
      immersive(false);
      view.innerHTML = '<div class="step"><h3>The app could not load its content</h3><p>' +
        esc(bootError) + "</p><p>If you opened the files directly from disk, serve the folder instead (for example <code>python3 -m http.server</code>) so the browser can fetch the JSON.</p></div>";
      return;
    }
    if (!COURSE) return;
    store = window.ITNStore.load();
    applyChrome();
    const r = route();
    store.lastRoute = location.hash || "#/";
    window.ITNStore.save(store);

    // Leaving focus mid-run (except the run route) stops the timer.
    if (!(r[0] === "focus" && r[1] === "run")) stopFocusTimer();

    if (r.length === 0) return viewHome();
    if (r[0] === "me") return viewMe();
    if (r[0] === "sources") return viewSources();
    if (r[0] === "module" && r[1] && r[2] === "quiz") {
      if (!quizState || quizState.id !== r[1] || quizState._ended) startQuiz(r[1]);
      else renderQuiz();
      return;
    }
    if (r[0] === "module" && r[1]) return viewModule(r[1], r[2]);
    if (r[0] === "drill" && r[1] === "subnet") {
      if (!drill || drill.kind !== "subnet") startDrill("subnet", "mixed");
      else renderDrill();
      return;
    }
    if (r[0] === "drill" && r[1] === "convert") {
      if (!drill || drill.kind !== "convert") startDrill("convert", "mixed");
      else renderDrill();
      return;
    }
    if (r[0] === "drill") return viewDrillHome();
    if (r[0] === "cards" && r[1]) { startCards(r[1]); return; }
    if (r[0] === "cards") return viewCardsHome();
    if (r[0] === "focus" && r[1] === "run") {
      if (!focus || focus.done) return viewFocusHome();
      return renderFocus();
    }
    if (r[0] === "focus") return viewFocusHome();
    viewNotFound();
  }

  window.addEventListener("hashchange", render);

  /* ---------- boot ---------- */
  function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    // Only register when served over http(s), not from file://
    if (location.protocol !== "http:" && location.protocol !== "https:") return;
    navigator.serviceWorker.register("sw.js").catch(function () { /* offline on first run is fine */ });
  }

  Promise.all([
    fetch("content/modules.json").then(function (r) { if (!r.ok) throw new Error("modules.json HTTP " + r.status); return r.json(); }),
    fetch("content/flashcards.json").then(function (r) { if (!r.ok) throw new Error("flashcards.json HTTP " + r.status); return r.json(); })
  ]).then(function (pair) {
    COURSE = pair[0];
    DECKS = pair[1];
    applyChrome();
    registerSW();
    render();
    view.focus();
  }).catch(function (err) {
    bootError = String(err && err.message ? err.message : err);
    render();
  });
})();
