"use strict";
const S = require("../js/subnet.js");
let failed = 0;
let passed = 0;

function eq(actual, expected, msg) {
  const ok = Object.is(actual, expected) || actual === expected;
  if (ok) {
    passed++;
    return;
  }
  failed++;
  console.error("FAIL:", msg);
  console.error("  expected:", expected);
  console.error("  actual:  ", actual);
}

function throws(fn, msg) {
  try {
    fn();
    failed++;
    console.error("FAIL:", msg, "(expected throw)");
  } catch (e) {
    passed++;
  }
}

// --- known fixtures (ITN-style /0–/30, plus RFC 3021 /31 and /32) ---
const fixtures = [
  {
    ip: "192.168.1.10", prefix: 24,
    network: "192.168.1.0", broadcast: "192.168.1.255",
    first: "192.168.1.1", last: "192.168.1.254",
    usable: 254, total: 256, mask: "255.255.255.0"
  },
  {
    ip: "192.168.10.66", prefix: 27,
    network: "192.168.10.64", broadcast: "192.168.10.95",
    first: "192.168.10.65", last: "192.168.10.94",
    usable: 30, total: 32, mask: "255.255.255.224"
  },
  {
    ip: "10.0.0.0", prefix: 27,
    network: "10.0.0.0", broadcast: "10.0.0.31",
    first: "10.0.0.1", last: "10.0.0.30",
    usable: 30, total: 32, mask: "255.255.255.224"
  },
  {
    ip: "10.0.0.17", prefix: 28,
    network: "10.0.0.16", broadcast: "10.0.0.31",
    first: "10.0.0.17", last: "10.0.0.30",
    usable: 14, total: 16, mask: "255.255.255.240"
  },
  {
    ip: "172.16.4.200", prefix: 22,
    network: "172.16.4.0", broadcast: "172.16.7.255",
    first: "172.16.4.1", last: "172.16.7.254",
    usable: 1022, total: 1024, mask: "255.255.252.0"
  },
  {
    ip: "10.1.5.17", prefix: 16,
    network: "10.1.0.0", broadcast: "10.1.255.255",
    first: "10.1.0.1", last: "10.1.255.254",
    usable: 65534, total: 65536, mask: "255.255.0.0"
  },
  {
    ip: "192.168.0.1", prefix: 30,
    network: "192.168.0.0", broadcast: "192.168.0.3",
    first: "192.168.0.1", last: "192.168.0.2",
    usable: 2, total: 4, mask: "255.255.255.252"
  },
  {
    ip: "10.20.30.40", prefix: 8,
    network: "10.0.0.0", broadcast: "10.255.255.255",
    first: "10.0.0.1", last: "10.255.255.254",
    usable: 16777214, total: 16777216, mask: "255.0.0.0"
  },
  {
    ip: "192.168.100.130", prefix: 25,
    network: "192.168.100.128", broadcast: "192.168.100.255",
    first: "192.168.100.129", last: "192.168.100.254",
    usable: 126, total: 128, mask: "255.255.255.128"
  },
  {
    ip: "172.16.31.1", prefix: 20,
    network: "172.16.16.0", broadcast: "172.16.31.255",
    first: "172.16.16.1", last: "172.16.31.254",
    usable: 4094, total: 4096, mask: "255.255.240.0"
  },
  {
    ip: "10.0.0.5", prefix: 32,
    network: "10.0.0.5", broadcast: null,
    first: "10.0.0.5", last: "10.0.0.5",
    usable: 1, total: 1, mask: "255.255.255.255"
  },
  {
    ip: "10.0.0.1", prefix: 31,
    network: "10.0.0.0", broadcast: null,
    first: "10.0.0.0", last: "10.0.0.1",
    usable: 2, total: 2, mask: "255.255.255.254"
  }
];

for (const f of fixtures) {
  const i = S.info(f.ip, f.prefix);
  eq(i.network, f.network, f.ip + "/" + f.prefix + " network");
  eq(i.broadcast, f.broadcast, f.ip + "/" + f.prefix + " broadcast");
  eq(i.firstUsable, f.first, f.ip + "/" + f.prefix + " first");
  eq(i.lastUsable, f.last, f.ip + "/" + f.prefix + " last");
  eq(i.usable, f.usable, f.ip + "/" + f.prefix + " usable");
  eq(i.total, f.total, f.ip + "/" + f.prefix + " total");
  eq(i.mask, f.mask, f.ip + "/" + f.prefix + " mask");
  eq(S.prefixFromMask(f.mask), f.prefix, "prefix from " + f.mask);
  eq(S.intToIp(S.maskFromPrefix(f.prefix)), f.mask, "mask from /" + f.prefix);
}

eq(S.classifyAddress("192.168.10.64", 27), "network", "classify network");
eq(S.classifyAddress("192.168.10.95", 27), "broadcast", "classify broadcast");
eq(S.classifyAddress("192.168.10.66", 27), "usable", "classify usable");
eq(S.classifyAddress("10.0.0.1", 31), "usable", "classify /31");
eq(S.classifyAddress("10.0.0.5", 32), "host", "classify /32");

eq(S.usableCount(28), 14, "/28 usable");
eq(S.usableCount(27), 30, "/27 usable");
eq(S.usableCount(24), 254, "/24 usable");
eq(S.totalAddresses(28), 16, "/28 total");

eq(S.intToIp(S.ipToInt("0.0.0.0")), "0.0.0.0", "roundtrip 0.0.0.0");
eq(S.intToIp(S.ipToInt("255.255.255.255")), "255.255.255.255", "roundtrip 255s");
eq(S.intToIp(S.ipToInt("192.168.0.1")), "192.168.0.1", "roundtrip 192.168.0.1");

throws(() => S.ipToInt("192.168.0.256"), "octet 256");
throws(() => S.ipToInt("192.168.0"), "three octets");
throws(() => S.ipToInt("192.168.01.1"), "leading zero");
throws(() => S.ipToInt("192.168.-1.1"), "negative");
throws(() => S.maskFromPrefix(33), "prefix 33");
throws(() => S.prefixFromMask("255.255.0.255"), "non-contiguous mask");
throws(() => S.prefixFromMask("255.255.64.0"), "non-contiguous 64");

eq(S.prefixFromMask("0.0.0.0"), 0, "mask /0");
eq(S.intToIp(S.maskFromPrefix(0)), "0.0.0.0", "mask from /0");
eq(S.totalAddresses(0), 4294967296, "/0 total");

// Every generated subnet question must contain the correct answer and a matching check.
const types = S.TYPES;
for (let i = 0; i < 400; i++) {
  const t = types[i % types.length];
  const q = S.nextSubnetQuestion(t);
  if (!q.prompt || !q.answer || !q.explain || q.explain.length < 1) {
    failed++;
    console.error("FAIL: incomplete question", t, q);
    continue;
  }
  if (q.input === "choice") {
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      failed++;
      console.error("FAIL: need 4 options", t, q);
      continue;
    }
    if (new Set(q.options).size !== 4) {
      failed++;
      console.error("FAIL: duplicate options", t, q);
      continue;
    }
    if (!q.options.includes(q.answer)) {
      failed++;
      console.error("FAIL: answer not in options", t, q);
      continue;
    }
  }
  if (!S.answersMatch(q.answer, q)) {
    failed++;
    console.error("FAIL: answersMatch failed for correct answer", t, q);
    continue;
  }
  passed++;
}

// Conversion questions, including leading-zero and 0x acceptance.
for (let i = 0; i < 200; i++) {
  const q = S.nextConvertQuestion("mixed");
  if (!q.prompt || !q.answer || !q.explain) {
    failed++;
    console.error("FAIL: incomplete conversion", q);
    continue;
  }
  if (!S.answersMatch(q.answer, q)) {
    failed++;
    console.error("FAIL: conversion self-match", q);
    continue;
  }
  if (q.type === "dec2bin" || q.type === "bin2hex" || q.type === "dec2hex") {
    // ok
  }
  passed++;
}

const binQ = { input: "binary", answer: "00001010", accept: ["00001010", "1010"] };
eq(S.answersMatch("1010", binQ), true, "binary leading zeros optional");
eq(S.answersMatch("0000 1010", binQ), true, "binary spaces allowed");
eq(S.answersMatch("11", binQ), false, "binary wrong value");

const hexQ = { input: "hex", answer: "0A", accept: ["0A", "0a", "0x0A"] };
eq(S.answersMatch("0x0a", hexQ), true, "hex 0x accepted");
eq(S.answersMatch("a", hexQ), true, "hex single digit padded");
eq(S.answersMatch("0B", hexQ), false, "hex wrong");

// explain() should run for every fixture without throwing
for (const f of fixtures) {
  const ex = S.explain(f.ip, f.prefix);
  if (!ex.steps || ex.steps.length < 3) {
    failed++;
    console.error("FAIL: short explanation", f);
  } else passed++;
}

console.log("passed=" + passed + " failed=" + failed);
if (failed) process.exit(1);
