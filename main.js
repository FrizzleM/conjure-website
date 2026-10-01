/*
 * Conjure website behaviour: download links from downloads.js, the visitor's
 * platform, and the page's motion. Every section is complete without this
 * script; it only adds the animation and fills in the links.
 */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const motionOK = () => !reducedMotion.matches;

  /** Runs `onFrame` with eased progress 0…1 over `ms`, then resolves. */
  function tween(ms, onFrame, ease = easeInOut) {
    return new Promise((resolve) => {
      const start = performance.now();
      const step = (now) => {
        const t = clamp((now - start) / ms);
        onFrame(ease(t));
        if (t < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }

  /* ───────────── Platform ───────────── */

  function detectPlatform() {
    const ua = navigator.userAgent || "";
    const platform =
      (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
    if (/iPhone|iPod/i.test(ua)) return { key: "ios", name: "iPhone" };
    if (/iPad/i.test(ua) || (/Mac/i.test(platform) && navigator.maxTouchPoints > 1)) {
      return { key: "ios", name: "iPad" };
    }
    if (/Android/i.test(ua)) return { key: "android", name: "Android" };
    if (/Win/i.test(platform) || /Windows/i.test(ua)) return { key: "windows", name: "Windows" };
    if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) return { key: "mac", name: "Mac" };
    if (/Linux|X11|CrOS/i.test(platform + " " + ua)) return { key: "linux", name: "Linux" };
    return null;
  }

  /* ───────────── Downloads ───────────── */

  const config = window.CONJURE_DOWNLOADS || { platforms: {} };
  const platforms = config.platforms || {};
  const hasUrl = (link) => !!link && typeof link.url === "string" && link.url.trim() !== "";

  function primaryButton(link) {
    if (hasUrl(link)) {
      const a = document.createElement("a");
      a.className = "btn";
      a.href = link.url.trim();
      a.textContent = link.label || "Download";
      return a;
    }
    const soon = document.createElement("span");
    soon.className = "btn is-soon";
    soon.setAttribute("aria-disabled", "true");
    soon.textContent = "Coming soon";
    return soon;
  }

  function commandRow(command) {
    const row = document.createElement("div");
    row.className = "cmd";
    const code = document.createElement("code");
    code.textContent = command;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "copy";
    button.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8"/></svg><span>Copy</span>';
    const label = button.querySelector("span");
    button.addEventListener("click", () => {
      const done = () => {
        label.textContent = "Copied";
        setTimeout(() => (label.textContent = "Copy"), 1600);
      };
      const selectIt = () => {
        const range = document.createRange();
        range.selectNodeContents(code);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        label.textContent = "Press Ctrl+C";
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(command).then(done, selectIt);
      } else {
        selectIt();
      }
    });
    row.append(code, button);
    return row;
  }

  function renderDownloads(mine) {
    $$(".platform").forEach((card) => {
      const key = card.dataset.platform;
      const entry = platforms[key] || {};
      const actions = $(".platform-actions", card);
      actions.replaceChildren(primaryButton(entry.primary));

      if (typeof entry.command === "string" && entry.command.trim() !== "") {
        actions.append(commandRow(entry.command.trim()));
      }

      const more = (entry.more || []).filter(hasUrl);
      if (more.length) {
        const nav = document.createElement("div");
        nav.className = "more-links";
        more.forEach((link) => {
          const a = document.createElement("a");
          a.href = link.url.trim();
          a.textContent = link.label;
          nav.append(a);
        });
        actions.append(nav);
      }

      if (mine && mine.key === key) card.classList.add("is-mine");
    });

    // The hero button goes straight to this visitor's download when there is one.
    const hero = $("#hero-download");
    if (hero && mine) {
      const entry = platforms[mine.key] || {};
      hero.textContent = `Download for ${mine.name}`;
      if (hasUrl(entry.primary)) hero.href = entry.primary.url.trim();
    }

    const parts = [];
    if (config.version) parts.push(document.createTextNode(`Version ${config.version}`));
    [
      ["releaseNotes", "Release notes"],
      ["checksums", "Checksums (SHA-256)"],
    ].forEach(([field, text]) => {
      if (typeof config[field] === "string" && config[field].trim() !== "") {
        const a = document.createElement("a");
        a.href = config[field].trim();
        a.textContent = text;
        parts.push(a);
      }
    });
    const line = $("#release-line");
    if (line && parts.length) {
      parts.forEach((part, i) => {
        if (i) line.append(document.createTextNode(" · "));
        line.append(part);
      });
      line.hidden = false;
    }
  }

  /* ───────────── Navigation ───────────── */

  function watchNav() {
    const nav = $("#nav");
    if (!nav) return;
    const update = () => nav.classList.toggle("is-scrolled", window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  /* ───────────── Reveal on scroll ───────────── */

  // Anything already on screen at load stays put; only what's below the fold
  // waits to rise in, so the first frame is always complete.
  function setUpReveals() {
    const items = $$(".reveal");
    if (!("IntersectionObserver" in window) || !motionOK()) {
      items.forEach((el) => el.classList.add("is-revealed"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.remove("will-reveal");
          entry.target.classList.add("is-revealed");
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 },
    );
    const fold = window.innerHeight * 0.95;
    items.forEach((el) => {
      if (el.getBoundingClientRect().top > fold) {
        el.classList.add("will-reveal");
        io.observe(el);
      } else {
        el.classList.add("is-revealed");
      }
    });
  }

  /* ───────────── Hero: one live send, start to finish ───────────── */

  // The app's own words for time left (apple/App/Shared/Model/Wording.swift).
  function timeLeft(seconds) {
    if (seconds < 10) return "A few seconds left";
    const tens = Math.floor(seconds / 10);
    if (tens < 6) return `About ${tens * 10} seconds left`;
    const minutes = Math.round(seconds / 60);
    return `About ${minutes} minute${minutes === 1 ? "" : "s"} left`;
  }

  function setUpHero() {
    const phone = $("#phone");
    if (!phone || !motionOK()) return;

    const fill = $("#ring-fill");
    const pct = $("#ring-pct");
    const stage = $("#ring-stage");
    const eta = $("#ph-eta");
    const question = $("#float-question");
    const received = $("#float-received");
    const yes = question ? $(".answer", question) : null;

    const TRANSFER_SECONDS = 32; // 3.2 GB at ~100 MB/s across a local network
    const setProgress = (p) => {
      fill.style.strokeDashoffset = String(100 - p * 100);
      pct.textContent = `${Math.round(p * 100)}%`;
    };

    async function play() {
      phone.dataset.state = "waiting";
      setProgress(0);
      stage.textContent = "Waiting";
      eta.textContent = "Share the code to start";
      question && question.classList.add("is-hidden");
      received && received.classList.add("is-hidden");
      yes && yes.classList.remove("is-chosen");

      await sleep(500);
      question && question.classList.remove("is-hidden");
      await sleep(800);
      if (yes) {
        yes.classList.add("is-pressed");
        await sleep(160);
        yes.classList.remove("is-pressed");
        yes.classList.add("is-chosen");
      }

      await sleep(1300);
      stage.textContent = "Connected";
      eta.textContent = "Straight to the other device";
      await sleep(700);

      phone.dataset.state = "sending";
      stage.textContent = "Sending";
      await tween(
        3600,
        (p) => {
          setProgress(p);
          eta.textContent = timeLeft((1 - p) * TRANSFER_SECONDS);
        },
        (t) => t,
      );

      stage.textContent = "Verifying";
      eta.textContent = "Checking every byte";
      await sleep(650);

      phone.dataset.state = "done";
      stage.textContent = "Done";
      eta.textContent = "Straight to the other device";
      await sleep(350);
      received && received.classList.remove("is-hidden");
    }

    let running = false;
    let visible = true;
    async function loop() {
      if (running) return;
      running = true;
      await sleep(700); // let the phone land first
      while (visible && !document.hidden && motionOK()) {
        await play();
        await sleep(5200);
      }
      running = false;
    }

    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) loop();
    }).observe(phone);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && visible) loop();
    });
  }

  /* ───────────── Speed: the race ───────────── */

  function setUpRace() {
    const race = $("#race");
    if (!race) return;
    const replay = $("#race-replay");
    if (!motionOK()) {
      if (replay) replay.hidden = true;
      return;
    }

    const cloud = $(".lane-cloud", race);
    const direct = $(".lane-conjure", race);
    const bars = {
      up: $(".bar-up", race),
      down: $(".bar-down", race),
      direct: $(".bar-direct", race),
    };
    const width = (el, v) => (el.style.width = `${(v * 100).toFixed(2)}%`);

    // Illustrative timings: one trip, versus up + wait + down.
    const T = { direct: 2000, up: 2600, wait: 1500, down: 2600 };

    function reset() {
      Object.values(bars).forEach((el) => width(el, 0));
      cloud.dataset.phase = "idle";
      direct.dataset.phase = "idle";
    }

    let run = 0;
    function play() {
      const id = ++run;
      reset();
      const start = performance.now() + 250;
      const frame = (now) => {
        if (id !== run) return;
        const t = Math.max(0, now - start);
        const d = clamp(t / T.direct);
        const u = clamp(t / T.up);
        const dn = clamp((t - T.up - T.wait) / T.down);
        width(bars.direct, d);
        width(bars.up, u);
        width(bars.down, dn);
        direct.dataset.phase = t === 0 ? "idle" : d < 1 ? "run" : "done";
        cloud.dataset.phase = t === 0 ? "idle" : u < 1 ? "up" : dn <= 0 ? "wait" : dn < 1 ? "down" : "done";
        if (d < 1 || dn < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }

    reset();
    let played = false;
    new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !played) {
          played = true;
          play();
        }
      },
      { threshold: 0.55 },
    ).observe(race);
    replay && replay.addEventListener("click", play);
  }

  /* ───────────── File size: scrubbed by scroll ───────────── */

  function setUpSize() {
    const section = $("#size");
    if (!section || !motionOK()) return;
    const stops = $$("#size-stops li");
    const num = $("#size-num");
    const caption = $("#size-caption");
    if (!stops.length || !num || !caption) return;

    section.classList.add("is-scrub");

    let current = -1;
    let swapTimer = 0;
    function show(i) {
      if (i === current) return;
      const first = current === -1;
      current = i;
      stops.forEach((li, k) => li.classList.toggle("is-on", k === i));
      clearTimeout(swapTimer);
      const apply = () => {
        num.textContent = stops[i].dataset.num;
        caption.textContent = stops[i].dataset.cap;
        num.classList.remove("is-swapping");
      };
      if (first) return apply();
      num.classList.add("is-swapping");
      swapTimer = setTimeout(apply, 200);
    }

    let queued = false;
    function update() {
      queued = false;
      const rect = section.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const p = travel > 0 ? clamp(-rect.top / travel) : 1;
      section.style.setProperty("--p", p.toFixed(3));
      show(Math.min(stops.length - 1, Math.floor(p * stops.length)));
    }
    const request = () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);

    // The stops double as shortcuts.
    stops.forEach((li, i) => {
      li.style.cursor = "pointer";
      li.addEventListener("click", () => {
        const top = section.getBoundingClientRect().top + window.scrollY;
        const travel = section.offsetHeight - window.innerHeight;
        window.scrollTo({ top: top + ((i + 0.5) / stops.length) * travel, behavior: "smooth" });
      });
    });
  }

  /* ───────────── The code, group by group ───────────── */

  function setUpCode() {
    $$("#code-card .code-text span").forEach((span, i) => span.style.setProperty("--i", i));
  }

  /* ───────────── Private: a fresh scramble every time ───────────── */

  function setUpScramble() {
    const el = $("#scramble");
    if (!el || !motionOK()) return;
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789";
    const length = el.textContent.length;
    const random = () => alphabet[Math.floor(Math.random() * alphabet.length)];
    let busy = false;

    async function scramble() {
      if (busy) return;
      busy = true;
      const target = Array.from({ length }, random);
      await tween(
        900,
        (p) => {
          const settled = Math.floor(p * length);
          el.textContent = target.map((ch, i) => (i < settled ? ch : random())).join("");
        },
        (t) => t,
      );
      busy = false;
    }

    const tile = el.closest(".tile");
    new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) scramble();
      },
      { threshold: 0.6 },
    ).observe(el);
    tile && tile.addEventListener("mouseenter", scramble);
  }

  /* ───────────── Start ───────────── */

  const mine = detectPlatform();
  renderDownloads(mine);
  watchNav();
  setUpCode();
  setUpReveals();
  setUpHero();
  setUpRace();
  setUpSize();
  setUpScramble();
})();
