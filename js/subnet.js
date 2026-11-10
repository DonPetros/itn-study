/* ITN Study — IPv4 subnet and number-system helpers.
   Works in the browser and in Node (for tests).
   Usable-host rules:
     /0–/30: classic ITN rule — network and broadcast reserved, usable = 2^(32-p) − 2
     /31:    RFC 3021 point-to-point — both addresses are usable, no broadcast
     /32:    single-host route — one address, no broadcast
*/
(function (root) {
  "use strict";

  function ipToInt(ip) {
    if (typeof ip !== "string") throw new Error("IP must be a string");
    const parts = ip.trim().split(".");
    if (parts.length !== 4) throw new Error("IP must have four octets: " + ip);
    const oct = parts.map(function (p) {
      if (!/^\d+$/.test(p)) throw new Error("Bad octet in " + ip);
      if (p.length > 1 && p[0] === "0") throw new Error("Leading zero in " + ip);
      const n = Number(p);
      if (!Number.isInteger(n) || n < 0 || n > 255) throw new Error("Octet out of range in " + ip);
      return n;
    });
    return ((oct[0] << 24) >>> 0) + (oct[1] << 16) + (oct[2] << 8) + oct[3] >>> 0;
  }

  function intToIp(n) {
    n = n >>> 0;
    return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
  }

  function maskFromPrefix(prefix) {
    const p = Number(prefix);
    if (!Number.isInteger(p) || p < 0 || p > 32) throw new Error("Prefix must be 0–32");
    if (p === 0) return 0;
    return (0xffffffff << (32 - p)) >>> 0;
  }

  function prefixFromMask(mask) {
    const m = typeof mask === "string" ? ipToInt(mask) : mask >>> 0;
    // Must be a contiguous run of 1s then 0s.
    const inv = (~m) >>> 0;
    if ((inv & (inv + 1)) !== 0) throw new Error("Mask is not contiguous: " + intToIp(m));
    let bits = 0;
    let x = m;
    while (x) {
      if ((x & 0x80000000) === 0) throw new Error("Mask is not contiguous: " + intToIp(m));
      bits += 1;
      x = (x << 1) >>> 0;
    }
    return bits;
  }

  function hostBits(prefix) {
    return 32 - Number(prefix);
  }

  function comma(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function totalAddresses(prefix) {
    const h = hostBits(prefix);
    return h === 32 ? 4294967296 : Math.pow(2, h);
  }

  function networkInt(ip, prefix) {
    const addr = typeof ip === "number" ? ip >>> 0 : ipToInt(ip);
    return (addr & maskFromPrefix(prefix)) >>> 0;
  }

  function broadcastInt(ip, prefix) {
    const p = Number(prefix);
    if (p >= 31) return null; // no broadcast
    const net = networkInt(ip, p);
    const hostMask = (~maskFromPrefix(p)) >>> 0;
    return (net | hostMask) >>> 0;
  }

  function usableCount(prefix) {
    const p = Number(prefix);
    if (p === 32) return 1;
    if (p === 31) return 2;
    return totalAddresses(p) - 2;
  }

  function firstUsableInt(ip, prefix) {
    const p = Number(prefix);
    const net = networkInt(ip, p);
    if (p >= 31) return net;
    return (net + 1) >>> 0;
  }

  function lastUsableInt(ip, prefix) {
    const p = Number(prefix);
    const net = networkInt(ip, p);
    if (p === 32) return net;
    if (p === 31) return (net + 1) >>> 0;
    return (broadcastInt(ip, p) - 1) >>> 0;
  }

  function info(ip, prefix) {
    const p = Number(prefix);
    const net = networkInt(ip, p);
    const bcast = broadcastInt(ip, p);
    const mask = maskFromPrefix(p);
    return {
      ip: typeof ip === "string" ? ip : intToIp(ip),
      prefix: p,
      mask: intToIp(mask),
      maskInt: mask,
      network: intToIp(net),
      networkInt: net,
      broadcast: bcast === null ? null : intToIp(bcast),
      broadcastInt: bcast,
      firstUsable: intToIp(firstUsableInt(ip, p)),
      lastUsable: intToIp(lastUsableInt(ip, p)),
      total: totalAddresses(p),
      usable: usableCount(p),
      hostBits: hostBits(p),
      blockSize: p >= 24 ? totalAddresses(p) : null,
      wildcard: intToIp((~mask) >>> 0)
    };
  }

  function classifyAddress(ip, prefix) {
    const addr = typeof ip === "number" ? ip >>> 0 : ipToInt(ip);
    const p = Number(prefix);
    const net = networkInt(addr, p);
    if (p === 32) return "host";
    if (p === 31) return "usable";
    const bcast = broadcastInt(addr, p);
    if (addr === net) return "network";
    if (addr === bcast) return "broadcast";
    return "usable";
  }

  function parsePrefix(s) {
    const m = String(s).trim().match(/^\/?(\d+)$/);
    if (!m) return null;
    const p = Number(m[1]);
    if (p < 0 || p > 32) return null;
    return p;
  }

  function sameNetwork(a, b, prefix) {
    return networkInt(a, prefix) === networkInt(b, prefix);
  }

  /* ---------- explanations (plain British English) ---------- */

  function octetBreakdown(ip) {
    return ip.split(".").map(function (o) {
      const n = Number(o);
      return { dec: n, bin: n.toString(2).padStart(8, "0") };
    });
  }

  function interestingOctet(prefix) {
    if (prefix <= 8) return 0;
    if (prefix <= 16) return 1;
    if (prefix <= 24) return 2;
    return 3;
  }

  function explain(ip, prefix) {
    const i = info(ip, prefix);
    const p = i.prefix;
    const steps = [];
    steps.push("A /" + p + " prefix means " + p + " network bits and " + i.hostBits + " host bits.");
    steps.push("The subnet mask is " + i.mask + ".");
    if (p <= 30) {
      steps.push("Total addresses in the block: 2 to the power of " + i.hostBits + " = " + comma(i.total) + ".");
      steps.push("The first address is the network address and the last is the broadcast address, so usable hosts = " + comma(i.total) + " − 2 = " + comma(i.usable) + ".");
    } else if (p === 31) {
      steps.push("A /31 has two addresses. On a point-to-point link (RFC 3021) both are usable and there is no broadcast address.");
    } else {
      steps.push("A /32 is a single host address. There is no separate network or broadcast address.");
    }

    const oct = interestingOctet(p);
    const names = ["first", "second", "third", "fourth"];
    if (p > 0 && p < 32 && p % 8 !== 0) {
      const bitsInOctet = p - oct * 8;
      const block = Math.pow(2, 8 - bitsInOctet);
      steps.push("The " + names[oct] + " octet is the one that changes between subnets. Increment that octet in steps of " + block + " (the block size).");
    } else if (p === 8 || p === 16 || p === 24) {
      steps.push("The mask falls on an octet boundary, so the network portion is the first " + (p / 8) + " octet(s) exactly.");
    }

    steps.push("Network address: " + i.network + (p <= 30 ? " (all host bits 0)." : "."));
    if (i.broadcast) steps.push("Broadcast address: " + i.broadcast + " (all host bits 1).");
    steps.push("First usable: " + i.firstUsable + ".");
    steps.push("Last usable: " + i.lastUsable + ".");
    return { info: i, steps: steps };
  }

  /* ---------- random helpers ---------- */

  function randInt(a, b) {
    return a + Math.floor(Math.random() * (b - a + 1));
  }

  function randomPrivateIp() {
    const r = Math.random();
    if (r < 0.45) return "192.168." + randInt(0, 255) + "." + randInt(0, 255);
    if (r < 0.8) return "10." + randInt(0, 255) + "." + randInt(0, 255) + "." + randInt(0, 255);
    // 172.16.0.0/12
    return "172." + randInt(16, 31) + "." + randInt(0, 255) + "." + randInt(0, 255);
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function looksLikeIp(k) {
    return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(k);
  }

  function uniqueOptions(correct, makers, count) {
    const set = [correct];
    const seen = {};
    seen[String(correct)] = true;
    let guard = 0;
    let mi = 0;
    while (set.length < count && guard < 500) {
      guard++;
      const v = makers[mi % makers.length]();
      mi++;
      if (v === "" || v == null) continue;
      const k = String(v);
      if (k === "NaN" || k === "undefined" || k === "null") continue;
      if (looksLikeIp(k)) {
        try { ipToInt(k); } catch (e) { continue; }
      }
      if (seen[k]) continue;
      seen[k] = true;
      set.push(v);
    }
    if (set.length < count) {
      throw new Error("Could not build " + count + " unique options for " + correct + " (got " + set.length + ")");
    }
    return shuffle(set);
  }

  function nearbyIps(ip, prefix) {
    const i = info(ip, prefix);
    const net = i.networkInt;
    const block = totalAddresses(prefix);
    const list = [i.network, i.firstUsable, i.lastUsable, i.broadcast, i.ip];
    list.push(intToIp((net - 1) >>> 0));
    list.push(intToIp((net + block) >>> 0));
    if (i.broadcastInt != null) list.push(intToIp((i.broadcastInt + 1) >>> 0));
    list.push(intToIp((net - block) >>> 0));
    list.push(intToIp((ipToInt(ip) ^ 1) >>> 0));
    list.push(intToIp((ipToInt(ip) + 2) >>> 0));
    return list.filter(function (x) { return x; });
  }

  /* ---------- question generators ---------- */

  function qUsableHosts() {
    const p = pick([16, 20, 22, 23, 24, 25, 26, 27, 28, 29, 30]);
    const usable = usableCount(p);
    const pool = [2, 4, 6, 8, 14, 16, 30, 32, 62, 64, 126, 128, 254, 256, 510, 512, 1022, 1024, 2046, 2048, 4094, 4096, 8190, 8192, 65534, 65536, totalAddresses(p), usable * 2, Math.max(0, usable - 2), totalAddresses(p) - 1];
    const options = uniqueOptions(String(usable), pool.filter(function (n) { return String(n) !== String(usable); }).map(function (n) {
      return function () { return String(n); };
    }), 4);
    return {
      type: "usable",
      prompt: "How many usable host addresses does a /" + p + " network have?",
      answer: String(usable),
      options: options,
      input: "choice",
      explain: [
        "Host bits = 32 − " + p + " = " + (32 - p) + ".",
        "Total addresses = 2 to the power of " + (32 - p) + " = " + comma(totalAddresses(p)) + ".",
        "Subtract 2 for the network and broadcast addresses: " + comma(totalAddresses(p)) + " − 2 = " + comma(usable) + ".",
        "This is the usual ITN rule for prefixes from /0 to /30."
      ]
    };
  }

  function qTotalAddresses() {
    const p = pick([24, 25, 26, 27, 28, 29, 30, 22, 20]);
    const total = totalAddresses(p);
    const pool = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 65536, usableCount(p), total * 2, total / 2, total - 2, total + 2];
    const options = uniqueOptions(String(total), pool.filter(function (n) { return String(n) !== String(total); }).map(function (n) {
      return function () { return String(n); };
    }), 4);
    return {
      type: "total",
      prompt: "How many addresses are in a /" + p + " block in total (including network and broadcast)?",
      answer: String(total),
      options: options,
      input: "choice",
      explain: [
        "Host bits = 32 − " + p + " = " + (32 - p) + ".",
        "The whole block size is 2 to the power of " + (32 - p) + " = " + comma(total) + ".",
        "That count includes the network and broadcast addresses."
      ]
    };
  }

  function qMaskFromPrefix() {
    const p = pick([8, 16, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 32]);
    const mask = intToIp(maskFromPrefix(p));
    const others = [8, 12, 16, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32].filter(function (x) { return x !== p; });
    const options = uniqueOptions(mask, others.map(function (x) {
      return function () { return intToIp(maskFromPrefix(x)); };
    }), 4);
    return {
      type: "mask",
      prompt: "What is the dotted-decimal mask for a /" + p + " prefix?",
      answer: mask,
      options: options,
      input: "choice",
      explain: [
        "A /" + p + " prefix means the mask has " + p + " leading 1-bits, then " + (32 - p) + " 0-bits.",
        "In dotted decimal that is " + mask + "."
      ]
    };
  }

  function qPrefixFromMask() {
    const p = pick([8, 16, 20, 22, 24, 25, 26, 27, 28, 29, 30]);
    const mask = intToIp(maskFromPrefix(p));
    const others = [8, 12, 16, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 32].filter(function (x) { return x !== p; });
    const options = uniqueOptions("/" + p, others.map(function (x) {
      return function () { return "/" + x; };
    }), 4);
    return {
      type: "prefix",
      prompt: "What prefix length matches the mask " + mask + "?",
      answer: "/" + p,
      options: options,
      input: "choice",
      explain: [
        "Count the 1-bits in the mask " + mask + ".",
        "That count is the prefix length: /" + p + "."
      ]
    };
  }

  function randomDrillPrefix() {
    return pick([20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]);
  }

  function randomHostInSubnet(netInt, prefix) {
    const total = totalAddresses(prefix);
    if (prefix >= 31) return netInt;
    // pick a usable address
    const offset = randInt(1, total - 2);
    return (netInt + offset) >>> 0;
  }

  function alignedNetwork(prefix) {
    // Build a random private network aligned to the prefix.
    let ip = randomPrivateIp();
    let net = networkInt(ip, prefix);
    // Avoid very low or confusing all-zero last octets when we want variety — it's fine.
    return net;
  }

  function qNetworkOf() {
    const p = randomDrillPrefix();
    const net = alignedNetwork(p);
    const host = intToIp(randomHostInSubnet(net, p));
    const i = info(host, p);
    const options = uniqueOptions(i.network, nearbyIps(host, p).filter(function (x) { return x !== i.network; }).map(function (x) {
      return function () { return x; };
    }), 4);
    const ex = explain(host, p);
    return {
      type: "network",
      prompt: "What is the network address of " + host + "/" + p + "?",
      answer: i.network,
      options: options,
      input: "choice",
      explain: ex.steps
    };
  }

  function qBroadcastOf() {
    const p = randomDrillPrefix();
    const net = alignedNetwork(p);
    const host = intToIp(randomHostInSubnet(net, p));
    const i = info(host, p);
    const options = uniqueOptions(i.broadcast, nearbyIps(host, p).filter(function (x) { return x !== i.broadcast; }).map(function (x) {
      return function () { return x; };
    }), 4);
    return {
      type: "broadcast",
      prompt: "What is the broadcast address of " + host + "/" + p + "?",
      answer: i.broadcast,
      options: options,
      input: "choice",
      explain: explain(host, p).steps
    };
  }

  function qFirstUsable() {
    const p = randomDrillPrefix();
    const net = alignedNetwork(p);
    const host = intToIp(randomHostInSubnet(net, p));
    const i = info(host, p);
    const options = uniqueOptions(i.firstUsable, nearbyIps(host, p).filter(function (x) { return x !== i.firstUsable; }).map(function (x) {
      return function () { return x; };
    }), 4);
    return {
      type: "first",
      prompt: "What is the first usable host address in the network that contains " + host + "/" + p + "?",
      answer: i.firstUsable,
      options: options,
      input: "choice",
      explain: explain(host, p).steps
    };
  }

  function qLastUsable() {
    const p = randomDrillPrefix();
    const net = alignedNetwork(p);
    const host = intToIp(randomHostInSubnet(net, p));
    const i = info(host, p);
    const options = uniqueOptions(i.lastUsable, nearbyIps(host, p).filter(function (x) { return x !== i.lastUsable; }).map(function (x) {
      return function () { return x; };
    }), 4);
    return {
      type: "last",
      prompt: "What is the last usable host address in the network that contains " + host + "/" + p + "?",
      answer: i.lastUsable,
      options: options,
      input: "choice",
      explain: explain(host, p).steps
    };
  }

  function qWhichSubnet() {
    // Take a private major net and a longer prefix, ask which subnet an IP sits in.
    const major = pick([16, 20, 24]);
    const longerChoices = { 16: [20, 22, 24], 20: [22, 24, 25], 24: [26, 27, 28] };
    const p = pick(longerChoices[major]);
    const base = major === 16
      ? ipToInt("10." + randInt(0, 255) + ".0.0")
      : major === 20
        ? networkInt("172." + randInt(16, 31) + "." + randInt(0, 255) + ".0", 20)
        : ipToInt("192.168." + randInt(0, 255) + ".0");
    const majorNet = networkInt(base, major);
    const block = totalAddresses(p);
    const maxSubs = Math.min(8, totalAddresses(major) / block);
    const subIndex = randInt(0, maxSubs - 1);
    const net = (majorNet + subIndex * block) >>> 0;
    const host = intToIp(randomHostInSubnet(net, p));
    const answer = intToIp(net);
    const makers = [];
    for (let k = 0; k < maxSubs; k++) {
      if (k !== subIndex) makers.push((function (k) {
        return function () { return intToIp((majorNet + k * block) >>> 0); };
      })(k));
    }
    if (makers.length < 3) {
      makers.push(function () { return intToIp((net + block) >>> 0); });
      makers.push(function () { return intToIp((net - block) >>> 0); });
      makers.push(function () { return host; });
    }
    const options = uniqueOptions(answer, makers, 4);
    const i = info(host, p);
    return {
      type: "which",
      prompt: "A network " + intToIp(majorNet) + "/" + major + " is subnetted into /" + p + " subnets. Which /" + p + " subnet contains " + host + "?",
      answer: answer,
      options: options,
      input: "choice",
      explain: explain(host, p).steps.concat([
        "So " + host + " sits in " + answer + "/" + p + ".",
        "Usable range: " + i.firstUsable + "–" + i.lastUsable + "."
      ])
    };
  }

  function qClassify() {
    const p = randomDrillPrefix();
    const net = alignedNetwork(p);
    const kind = pick(["network", "broadcast", "usable", "usable"]);
    let addr;
    if (kind === "network") addr = net;
    else if (kind === "broadcast") addr = broadcastInt(net, p);
    else addr = randomHostInSubnet(net, p);
    const ip = intToIp(addr);
    const actual = classifyAddress(ip, p);
    const label = { network: "the network address", broadcast: "the broadcast address", usable: "a usable host address", host: "a host address" };
    return {
      type: "classify",
      prompt: "In the subnet of " + intToIp(net) + "/" + p + ", what is " + ip + "?",
      answer: label[actual],
      options: shuffle(["the network address", "the broadcast address", "a usable host address", "not in this subnet"]),
      input: "choice",
      explain: explain(ip, p).steps.concat(["Therefore " + ip + " is " + label[actual] + "."])
    };
  }

  const SUBNET_TYPES = [
    qUsableHosts, qTotalAddresses, qMaskFromPrefix, qPrefixFromMask,
    qNetworkOf, qBroadcastOf, qFirstUsable, qLastUsable, qWhichSubnet, qClassify
  ];

  const TYPE_MAP = {
    usable: qUsableHosts,
    total: qTotalAddresses,
    mask: qMaskFromPrefix,
    prefix: qPrefixFromMask,
    network: qNetworkOf,
    broadcast: qBroadcastOf,
    first: qFirstUsable,
    last: qLastUsable,
    which: qWhichSubnet,
    classify: qClassify,
    mixed: function () { return pick(SUBNET_TYPES)(); }
  };

  function nextSubnetQuestion(type) {
    const fn = TYPE_MAP[type] || TYPE_MAP.mixed;
    return fn();
  }

  /* ---------- conversion drills ---------- */

  function randomDec() {
    // Weight towards values that teach patterns, plus some random.
    return pick([0, 1, 2, 4, 8, 15, 16, 32, 64, 127, 128, 192, 224, 240, 248, 252, 254, 255, randInt(0, 255), randInt(0, 255), randInt(0, 255)]);
  }

  function qDecToBin() {
    const n = randomDec();
    const ans = n.toString(2).padStart(8, "0");
    return {
      type: "dec2bin",
      prompt: "Convert the decimal number " + n + " to 8-bit binary.",
      answer: ans,
      accept: [ans, ans.replace(/\s/g, ""), n.toString(2)],
      input: "binary",
      explain: explainConversion(n)
    };
  }

  function qBinToDec() {
    const n = randomDec();
    const bin = n.toString(2).padStart(8, "0");
    const pretty = bin.slice(0, 4) + " " + bin.slice(4);
    return {
      type: "bin2dec",
      prompt: "Convert the binary number " + pretty + " to decimal.",
      answer: String(n),
      accept: [String(n)],
      input: "number",
      explain: explainConversion(n)
    };
  }

  function qDecToHex() {
    const n = randomDec();
    const hex = n.toString(16).toUpperCase().padStart(2, "0");
    return {
      type: "dec2hex",
      prompt: "Convert the decimal number " + n + " to two-digit hexadecimal.",
      answer: hex,
      accept: [hex, hex.toLowerCase(), "0x" + hex, "0x" + hex.toLowerCase(), n.toString(16), n.toString(16).toUpperCase()],
      input: "hex",
      explain: explainConversion(n)
    };
  }

  function qHexToDec() {
    const n = randomDec();
    const hex = n.toString(16).toUpperCase().padStart(2, "0");
    return {
      type: "hex2dec",
      prompt: "Convert the hexadecimal value " + hex + " to decimal.",
      answer: String(n),
      accept: [String(n)],
      input: "number",
      explain: explainConversion(n)
    };
  }

  function qBinToHex() {
    const n = randomDec();
    const bin = n.toString(2).padStart(8, "0");
    const pretty = bin.slice(0, 4) + " " + bin.slice(4);
    const hex = n.toString(16).toUpperCase().padStart(2, "0");
    return {
      type: "bin2hex",
      prompt: "Convert the binary number " + pretty + " to two-digit hexadecimal.",
      answer: hex,
      accept: [hex, hex.toLowerCase(), "0x" + hex, "0x" + hex.toLowerCase()],
      input: "hex",
      explain: explainConversion(n).concat([
        "A handy shortcut: split the 8 bits into two groups of 4 (nibbles). Each nibble is one hex digit.",
        bin.slice(0, 4) + " = " + hex[0] + ", " + bin.slice(4) + " = " + hex[1] + "."
      ])
    };
  }

  function explainConversion(n) {
    const bin = n.toString(2).padStart(8, "0");
    const weights = [128, 64, 32, 16, 8, 4, 2, 1];
    const used = [];
    for (let i = 0; i < 8; i++) {
      if (bin[i] === "1") used.push(String(weights[i]));
    }
    const hex = n.toString(16).toUpperCase().padStart(2, "0");
    const steps = [
      "The bit weights of an 8-bit number are 128, 64, 32, 16, 8, 4, 2 and 1.",
      "Binary: " + bin.slice(0, 4) + " " + bin.slice(4) + "."
    ];
    if (used.length) steps.push("Add the weights where the bit is 1: " + used.join(" + ") + " = " + n + ".");
    else steps.push("Every bit is 0, so the value is 0.");
    steps.push("Hexadecimal: " + hex + " (because 16 × " + Math.floor(n / 16) + " + " + (n % 16) + " = " + n + ").");
    return steps;
  }

  const CONV_TYPES = [qDecToBin, qBinToDec, qDecToHex, qHexToDec, qBinToHex];
  const CONV_MAP = {
    dec2bin: qDecToBin,
    bin2dec: qBinToDec,
    dec2hex: qDecToHex,
    hex2dec: qHexToDec,
    bin2hex: qBinToHex,
    mixed: function () { return pick(CONV_TYPES)(); }
  };

  function nextConvertQuestion(type) {
    const fn = CONV_MAP[type] || CONV_MAP.mixed;
    return fn();
  }

  function normaliseAnswer(raw, input) {
    if (raw == null) return "";
    let s = String(raw).trim();
    if (input === "binary") {
      s = s.replace(/\s+/g, "");
      // allow dropping leading zeros by comparing numerically later
      return s;
    }
    if (input === "hex") {
      s = s.replace(/^0x/i, "").replace(/\s+/g, "").toUpperCase();
      if (s.length === 1) s = "0" + s;
      return s;
    }
    if (input === "number") return String(Number(s));
    if (input === "ip") {
      return s.replace(/\s+/g, "");
    }
    return s;
  }

  function answersMatch(given, question) {
    const g = String(given == null ? "" : given).trim();
    if (question.input === "choice") return g === String(question.answer);
    const accept = question.accept || [question.answer];
    if (question.input === "binary") {
      const bits = g.replace(/\s+/g, "");
      if (!/^[01]+$/.test(bits)) return false;
      const val = parseInt(bits, 2);
      return accept.some(function (a) {
        const t = String(a).replace(/\s+/g, "");
        if (/^[01]+$/.test(t)) return parseInt(t, 2) === val;
        return false;
      }) || val === parseInt(String(question.answer).replace(/\s+/g, ""), 2);
    }
    if (question.input === "hex") {
      const h = normaliseAnswer(g, "hex");
      return accept.some(function (a) { return normaliseAnswer(a, "hex") === h; });
    }
    if (question.input === "number") {
      if (!/^-?\d+$/.test(g)) return false;
      return accept.some(function (a) { return Number(a) === Number(g); });
    }
    return accept.some(function (a) { return String(a).trim().toLowerCase() === g.toLowerCase(); });
  }

  const api = {
    ipToInt: ipToInt,
    intToIp: intToIp,
    maskFromPrefix: maskFromPrefix,
    prefixFromMask: prefixFromMask,
    hostBits: hostBits,
    totalAddresses: totalAddresses,
    networkInt: networkInt,
    broadcastInt: broadcastInt,
    usableCount: usableCount,
    firstUsableInt: firstUsableInt,
    lastUsableInt: lastUsableInt,
    info: info,
    classifyAddress: classifyAddress,
    parsePrefix: parsePrefix,
    sameNetwork: sameNetwork,
    explain: explain,
    nextSubnetQuestion: nextSubnetQuestion,
    nextConvertQuestion: nextConvertQuestion,
    answersMatch: answersMatch,
    normaliseAnswer: normaliseAnswer,
    shuffle: shuffle,
    TYPES: Object.keys(TYPE_MAP).filter(function (k) { return k !== "mixed"; }),
    CONV_TYPES: Object.keys(CONV_MAP).filter(function (k) { return k !== "mixed"; })
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.ITNSubnet = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
