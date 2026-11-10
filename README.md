# ITN Study

A mobile-first progressive web app for studying **CCNA v7 Introduction to Networks (ITN)**.
It is a static site (HTML, CSS and JavaScript only). There is no backend and no account.
Progress, quiz scores, flashcard timing and the streak are stored only in this browser
(`localStorage`).

This is a **personal study aid**. The wording of every explainer and quiz is original.
It is **not affiliated with, or endorsed by, Cisco or Cisco Networking Academy**, and it
does not copy NetAcad course text or exam questions. Cisco is a trademark of Cisco
Systems, Inc.

## What is in the app

- **17 modules**, following the public ITN v7.02 module list. Each module has
  bite-size explainer cards (one idea per card) and a 10-question multiple-choice
  quiz with a short “why” after each answer.
- **Subnetting drill**: endless generated IPv4 questions (usable hosts, block size,
  mask and prefix, network and broadcast, first and last usable, which subnet an
  address sits in, classify an address). Answers are calculated in code. A worked
  solution is shown after you check. `/31` follows [RFC 3021](https://www.rfc-editor.org/rfc/rfc3021);
  `/32` is a single-host route. Most questions use the usual ITN “minus 2” rule
  for `/16`–`/30`.
- **Number-system drill**: decimal, binary and hexadecimal conversions for an octet,
  with the bit weights written out.
- **Flashcards** with simple spaced repetition (missed cards return sooner): ports,
  OSI/TCP-IP and PDUs, IOS commands, and addressing facts.
- **Focus mode**: a 5, 8 or 10 minute mixed session (due cards, a few quiz questions,
  one subnet question), with a visible timer, pause, and a done screen. A daily
  streak is counted in the Europe/London calendar when you finish a session.
- **Countdown** to 28 February 2027.
- **Light theme by default**, optional dark theme, optional larger text, and a
  home-screen install (manifest + service worker) so the app works offline.

## Counts

These counts come from `tools/content.py` and the generated JSON, not from an estimate.

| Module | Cards | Quiz |
| --- | ---: | ---: |
| 1 Networking Today | 10 | 10 |
| 2 Basic Switch and End Device Configuration | 10 | 10 |
| 3 Protocols and Models | 10 | 10 |
| 4 Physical Layer | 9 | 10 |
| 5 Number Systems | 8 | 10 |
| 6 Data Link Layer | 8 | 10 |
| 7 Ethernet Switching | 9 | 10 |
| 8 Network Layer | 9 | 10 |
| 9 Address Resolution | 8 | 10 |
| 10 Basic Router Configuration | 8 | 10 |
| 11 IPv4 Addressing | 11 | 10 |
| 12 IPv6 Addressing | 10 | 10 |
| 13 ICMP | 8 | 10 |
| 14 Transport Layer | 10 | 10 |
| 15 Application Layer | 9 | 10 |
| 16 Network Security Fundamentals | 8 | 10 |
| 17 Build a Small Network | 9 | 10 |
| **Total** | **154** | **170** |

Flashcards: **67** (16 ports, 13 OSI/TCP-IP, 25 IOS commands, 13 addressing).

## How facts were checked

Facts were checked against public sources, including:

- IANA port, protocol and special-purpose address registries
- RFCs 791, 792, 826, 1918, 3021, 3927, 4291, 4443, 4861, 5952 and 8200
- Public summaries of Ethernet framing
- The public [ITN v7.02 Scope and Sequence](https://netacad.fit.vutbr.cz/wp-content/uploads/ccna/itn/ITN%20v7.02%20Scope%20and%20Sequence.pdf) for module titles and topic coverage only

A source list also lives in the app under Progress → “Where the facts were checked”.

## Running locally

```bash
cd itn-study
python3 -m http.server 8812
# open http://localhost:8812
```

To regenerate the content JSON after editing `tools/content.py`:

```bash
python3 tools/content.py
node tests/content.test.js
node tests/subnet.test.js
```

If you change the app shell, bump `VERSION` in `sw.js` so installed copies pick up the change.

## Hosting on GitHub Pages

The site is set up to be served from the repository root (all paths are relative).
After a push to `main`, GitHub Pages should publish it at:

`https://donpetros.github.io/itn-study/`

On an iPhone: open that address in Safari, tap Share, then **Add to Home Screen**.

## Folder structure

```
index.html              app shell
manifest.json           PWA manifest
sw.js                   service worker (offline cache)
css/app.css             light/dark theme, large-text option, 44px+ tap targets
js/app.js               routes and screens
js/storage.js           localStorage, spaced repetition, streak, countdown
js/subnet.js            IPv4 subnet math and question generators (also used by tests)
content/modules.json    module cards and quizzes (generated)
content/flashcards.json flashcards (generated)
fonts/                  Inter and JetBrains Mono (SIL OFL 1.1)
icons/                  180, 192, 512 and maskable 512 PNG icons, favicon
tools/content.py        source of the study content
tools/make_icons.py     icon generator
tests/                  Node tests for content and subnet math
```

## Licence for this repository

The original code and study notes in this repository are available for personal
study. Fonts retain the SIL Open Font License. Do not treat the material as
Cisco course content or as an official practice exam.
