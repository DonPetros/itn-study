/* ITN Study — localStorage only. No accounts, no network telemetry. */
(function (root) {
  "use strict";
  const KEY = "itn-study-v1";
  const DUE = "2027-02-28"; // Europe/London calendar date
  const DEFAULTS = {
    version: 1,
    theme: "light",       // light | dark
    large: false,
    modules: {},          // id -> { cardsSeen: [], quizBest, quizAttempts, lastCard, lastAt }
    srs: {},              // cardId -> { due, interval, ease, reps, lapses }
    streak: { count: 0, lastDay: null },
    lastModule: null,
    lastRoute: "#/",
    focus: { completed: 0, lastAt: null }
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULTS));
      const data = JSON.parse(raw);
      const out = JSON.parse(JSON.stringify(DEFAULTS));
      Object.keys(out).forEach(function (k) {
        if (data[k] != null) out[k] = data[k];
      });
      if (!out.modules) out.modules = {};
      if (!out.srs) out.srs = {};
      if (!out.streak) out.streak = { count: 0, lastDay: null };
      return out;
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULTS));
    }
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
    return data;
  }

  function londonDay(d) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(d || new Date());
  }

  function londonMidnightMs(dayStr) {
    // Europe/London is GMT (UTC+0) in February; in late October–March usually GMT.
    // Parsing as UTC midnight is wrong on BST days. Use a noon UTC probe and format back,
    // but for day-diff we compare calendar dates in London.
    const parts = dayStr.split("-").map(Number);
    // Construct a date at 12:00 UTC on that calendar date, then adjust so the London
    // calendar day matches. Good enough for whole-day arithmetic.
    return Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  }

  function daysUntilDue() {
    const today = londonDay(new Date());
    const a = londonMidnightMs(today);
    const b = londonMidnightMs(DUE);
    return Math.round((b - a) / 86400000);
  }

  function applyTheme(data) {
    const html = document.documentElement;
    html.classList.toggle("dark", data.theme === "dark");
    html.classList.toggle("large", !!data.large);
    const colour = data.theme === "dark" ? "#14181e" : "#f4f1ea";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", colour);
    const cs = document.querySelector('meta[name="color-scheme"]');
    if (cs) cs.setAttribute("content", data.theme === "dark" ? "dark" : "light");
  }

  function moduleState(data, id) {
    if (!data.modules[id]) {
      data.modules[id] = { cardsSeen: [], quizBest: null, quizAttempts: 0, lastCard: 0, lastAt: null };
    }
    return data.modules[id];
  }

  function markCard(data, moduleId, cardId) {
    const m = moduleState(data, moduleId);
    if (m.cardsSeen.indexOf(cardId) === -1) m.cardsSeen.push(cardId);
    m.lastAt = Date.now();
    data.lastModule = moduleId;
    return save(data);
  }

  function recordQuiz(data, moduleId, score, total) {
    const m = moduleState(data, moduleId);
    const pct = total ? Math.round((score / total) * 100) : 0;
    if (m.quizBest == null || pct > m.quizBest) m.quizBest = pct;
    m.quizAttempts += 1;
    m.lastAt = Date.now();
    data.lastModule = moduleId;
    return { data: save(data), pct: pct };
  }

  /* Simple spaced repetition:
       again  -> due in 2 minutes
       good   -> 10 min, then 1 day, then ×2.5
       easy   -> 1 day if new, otherwise ×3.5
     Intervals are stored in minutes. */
  function srsRecord(data, cardId) {
    if (!data.srs[cardId]) {
      data.srs[cardId] = { due: 0, interval: 0, ease: 2.5, reps: 0, lapses: 0 };
    }
    return data.srs[cardId];
  }

  function review(data, cardId, rating) {
    const rec = srsRecord(data, cardId);
    const now = Date.now();
    if (rating === "again") {
      rec.interval = 2;
      rec.reps = 0;
      rec.lapses += 1;
    } else if (rating === "easy") {
      rec.reps += 1;
      rec.ease = Math.min(3.2, (rec.ease || 2.5) + 0.15);
      rec.interval = rec.interval < 1 ? 24 * 60 : Math.round(rec.interval * Math.max(2.8, rec.ease + 0.5));
    } else {
      rec.reps += 1;
      if (rec.interval < 1) rec.interval = 10;
      else if (rec.interval < 60) rec.interval = 24 * 60;
      else rec.interval = Math.round(rec.interval * (rec.ease || 2.5));
    }
    rec.due = now + rec.interval * 60 * 1000;
    return save(data);
  }

  function dueCards(data, allCards) {
    const now = Date.now();
    return allCards.filter(function (c) {
      const rec = data.srs[c.id];
      if (!rec) return true; // unseen counts as due
      return rec.due <= now;
    });
  }

  function noteStreakDay(data) {
    const today = londonDay(new Date());
    const last = data.streak.lastDay;
    if (last === today) return data;
    if (!last) {
      data.streak = { count: 1, lastDay: today };
    } else {
      const diff = Math.round((londonMidnightMs(today) - londonMidnightMs(last)) / 86400000);
      data.streak = { count: diff === 1 ? data.streak.count + 1 : 1, lastDay: today };
    }
    return save(data);
  }

  function completeFocus(data) {
    data.focus.completed = (data.focus.completed || 0) + 1;
    data.focus.lastAt = Date.now();
    noteStreakDay(data);
    return save(data);
  }

  function resetAll() {
    localStorage.removeItem(KEY);
    return load();
  }

  const api = {
    KEY: KEY,
    DUE: DUE,
    load: load,
    save: save,
    londonDay: londonDay,
    daysUntilDue: daysUntilDue,
    applyTheme: applyTheme,
    moduleState: moduleState,
    markCard: markCard,
    recordQuiz: recordQuiz,
    review: review,
    dueCards: dueCards,
    srsRecord: srsRecord,
    noteStreakDay: noteStreakDay,
    completeFocus: completeFocus,
    resetAll: resetAll
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.ITNStore = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
