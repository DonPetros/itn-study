"use strict";
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const modules = JSON.parse(fs.readFileSync(path.join(root, "content/modules.json"), "utf8"));
const cards = JSON.parse(fs.readFileSync(path.join(root, "content/flashcards.json"), "utf8"));
let failed = 0, passed = 0;
function ok(cond, msg) {
  if (cond) passed++;
  else { failed++; console.error("FAIL:", msg); }
}

ok(modules.modules.length === 17, "17 modules");
ok(modules.due === "2027-02-28", "due date");
ok(Array.isArray(modules.sources) && modules.sources.length >= 8, "sources listed");

const titles = modules.modules.map(m => m.title);
const expected = [
  "Networking Today",
  "Basic Switch and End Device Configuration",
  "Protocols and Models",
  "Physical Layer",
  "Number Systems",
  "Data Link Layer",
  "Ethernet Switching",
  "Network Layer",
  "Address Resolution",
  "Basic Router Configuration",
  "IPv4 Addressing",
  "IPv6 Addressing",
  "ICMP",
  "Transport Layer",
  "Application Layer",
  "Network Security Fundamentals",
  "Build a Small Network"
];
expected.forEach((t, i) => ok(titles[i] === t, "title " + (i + 1) + " " + t));

const ids = new Set();
for (const m of modules.modules) {
  ok(m.cards.length >= 8, m.id + " has at least 8 cards (" + m.cards.length + ")");
  ok(m.quiz.length === 10, m.id + " has 10 quiz questions");
  ok(m.blurb && m.blurb.length > 10, m.id + " blurb");
  for (const c of m.cards) {
    ok(!ids.has(c.id), "unique " + c.id);
    ids.add(c.id);
    ok(c.title && c.body && c.body.length > 40, "card body " + c.id);
  }
  for (const q of m.quiz) {
    ok(!ids.has(q.id), "unique " + q.id);
    ids.add(q.id);
    ok(q.options.length === 4, "4 options " + q.id);
    ok(new Set(q.options).size === 4, "unique options " + q.id);
    ok(q.answer >= 0 && q.answer < 4, "answer index " + q.id);
    ok(q.why && q.why.length > 20, "why " + q.id);
  }
}

ok(cards.cards.length >= 50, "at least 50 flashcards, got " + cards.cards.length);
const decks = new Set(cards.decks.map(d => d.id));
const fcIds = new Set();
for (const c of cards.cards) {
  ok(decks.has(c.deck), "known deck " + c.deck + " for " + c.id);
  ok(!fcIds.has(c.id), "unique fc " + c.id);
  fcIds.add(c.id);
  ok(c.front && c.back, "front/back " + c.id);
}

console.log("passed=" + passed + " failed=" + failed);
if (failed) process.exit(1);
