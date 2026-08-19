/* ===================== RESPONSIVE SCALE-TO-FIT ===================== */
(function () {
  const screen = document.querySelector(".screen");
  if (!screen) return;
  screen.style.transform = "none"; // wallpaper stays full-bleed

  // Keep the widget columns fully above the dock (macOS behaviour): when the
  // viewport is too short, scale each column down so nothing tucks under the dock.
  const desktop = document.querySelector(".desktop");
  const leftCol = document.querySelector(".widget-col--left");
  const rightCol = document.querySelector(".widget-col--right");
  const isMobile = () => window.matchMedia("(max-width: 720px)").matches;

  function fit() {
    // reset first so measurements aren't affected by a prior scale
    [leftCol, rightCol].forEach((c) => {
      if (c) c.style.transform = "none";
    });
    if (!desktop || isMobile()) return; // phone layout stacks + scrolls instead

    const cs = getComputedStyle(desktop);
    const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const avail = desktop.clientHeight - padY;
    const need = Math.max(
      leftCol ? leftCol.offsetHeight : 0,
      rightCol ? rightCol.offsetHeight : 0
    );
    if (need > avail && need > 0) {
      const s = Math.max(0.5, avail / need);
      if (leftCol) {
        leftCol.style.transformOrigin = "top left";
        leftCol.style.transform = "scale(" + s + ")";
      }
      if (rightCol) {
        rightCol.style.transformOrigin = "top right";
        rightCol.style.transform = "scale(" + s + ")";
      }
    }
  }

  fit();
  window.addEventListener("resize", fit);
  window.addEventListener("load", fit);
})();

/* ===================== iOS-STYLE ANALOG CLOCK ===================== */
(function () {
  const SVGNS = "http://www.w3.org/2000/svg";
  const CENTER = 100;

  const ticksGroup = document.querySelector(".clock__ticks");
  const numeralsGroup = document.querySelector(".clock__numerals");
  const hourHand = document.querySelector(".clock__hand--hour");
  const minuteHand = document.querySelector(".clock__hand--minute");
  const secondGroup = document.querySelector(".clock__second-group");

  // point on a circle of radius r at a given clock angle (0 = 12 o'clock)
  function point(deg, r) {
    const rad = (deg * Math.PI) / 180;
    return {
      x: CENTER + r * Math.sin(rad),
      y: CENTER - r * Math.cos(rad),
    };
  }

  // --- draw 60 tick marks (every 5th is a bold hour mark) ---
  const OUTER = 94;
  for (let i = 0; i < 60; i++) {
    const isMajor = i % 5 === 0;
    const inner = isMajor ? 80 : 85;
    const a = i * 6;
    const p1 = point(a, OUTER);
    const p2 = point(a, inner);

    const tick = document.createElementNS(SVGNS, "line");
    tick.setAttribute("x1", p1.x);
    tick.setAttribute("y1", p1.y);
    tick.setAttribute("x2", p2.x);
    tick.setAttribute("y2", p2.y);
    tick.setAttribute(
      "class",
      "clock__tick" + (isMajor ? " clock__tick--major" : "")
    );
    ticksGroup.appendChild(tick);
  }

  // --- numerals at 12, 3, 6, 9 ---
  const NUM_R = 62;
  [
    { n: 12, deg: 0 },
    { n: 3, deg: 90 },
    { n: 6, deg: 180 },
    { n: 9, deg: 270 },
  ].forEach(({ n, deg }) => {
    const p = point(deg, NUM_R);
    const t = document.createElementNS(SVGNS, "text");
    t.setAttribute("x", p.x);
    t.setAttribute("y", p.y);
    t.setAttribute("class", "clock__numeral");
    t.textContent = n;
    numeralsGroup.appendChild(t);
  });

  // --- animate hands ---
  function tick() {
    const now = new Date();
    const h = now.getHours() % 12;
    const m = now.getMinutes();
    const s = now.getSeconds();
    const ms = now.getMilliseconds();

    const secDeg = (s + ms / 1000) * 6;
    const minDeg = (m + s / 60) * 6;
    const hourDeg = (h + m / 60) * 30;

    hourHand.setAttribute("transform", `rotate(${hourDeg} ${CENTER} ${CENTER})`);
    minuteHand.setAttribute("transform", `rotate(${minDeg} ${CENTER} ${CENTER})`);
    secondGroup.setAttribute("transform", `rotate(${secDeg} ${CENTER} ${CENTER})`);

    requestAnimationFrame(tick);
  }
  tick();
})();

/* ===================== MENUBAR DATE & CLOCK (LIVE) ===================== */
(function () {
  const el = document.querySelector(".menubar__clock");
  if (!el) return;

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  function update() {
    const now = new Date();
    const day = DAYS[now.getDay()];
    const date = now.getDate();
    const month = MONTHS[now.getMonth()];

    let h = now.getHours();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    const m = String(now.getMinutes()).padStart(2, "0");

    // e.g. "Wed 25 Mar  11:33 PM"
    el.innerHTML = `${day} ${date} ${month}&nbsp;&nbsp;${h}:${m}&nbsp;${ampm}`;

    // re-sync at the start of the next minute
    const delay = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    setTimeout(update, delay);
  }
  update();
})();

/* ============ EXPANDABLE GAME WINDOWS (macOS-style open/close) ============ */
(function () {
  const tiles = document.querySelectorAll(".widget--gameimg[data-game]");
  if (!tiles.length) return;
  const screen = document.querySelector(".screen");

  const LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  const TITLES = { ttt: "Tic-Tac-Toe", memory: "Memory" };

  // traffic-light glyphs
  const G_CLOSE =
    '<svg class="wl__g" viewBox="0 0 12 12"><path d="M3.4 3.4 8.6 8.6M8.6 3.4 3.4 8.6"/></svg>';
  const G_MIN =
    '<svg class="wl__g" viewBox="0 0 12 12"><path d="M3 6H9"/></svg>';
  const G_EXPAND =
    '<svg class="wl__g wl__g--fill" viewBox="0 0 12 12"><path d="M3 3 3 6.4 6.4 3Z"/><path d="M9 9 9 5.6 5.6 9Z"/></svg>';
  const G_COLLAPSE =
    '<svg class="wl__g wl__g--fill" viewBox="0 0 12 12"><path d="M3 5.8 5.8 5.8 5.8 3Z"/><path d="M9 6.2 6.2 6.2 6.2 9Z"/></svg>';

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function openGame(kind, tile) {
    // scale-from-icon origin (account for the .screen canvas scale)
    const sRect = screen.getBoundingClientRect();
    const t = tile.getBoundingClientRect();
    const ox = t.left + t.width / 2 - sRect.left;
    const oy = t.top + t.height / 2 - sRect.top;

    const modal = el("div", "winmodal");
    const backdrop = el("div", "winmodal__backdrop");
    const win = el("div", "winmodal__window");
    win.style.transformOrigin = ox + "px " + oy + "px";
    win.appendChild(
      el(
        "div",
        "winmodal__bar",
        '<div class="winmodal__lights">' +
          '<button class="wl wl--close" aria-label="Close">' + G_CLOSE + "</button>" +
          '<button class="wl wl--min" aria-label="Minimize">' + G_MIN + "</button>" +
          '<button class="wl wl--max" aria-label="Expand">' + G_EXPAND + "</button>" +
          "</div>" +
          '<span class="winmodal__title">' + TITLES[kind] + "</span>"
      )
    );
    const body = el("div", "winmodal__body");
    win.appendChild(body);
    modal.appendChild(backdrop);
    modal.appendChild(win);
    screen.appendChild(modal);

    if (kind === "ttt") mountTTT(body);
    else mountMemory(body);

    // play the open animation on the next frame
    requestAnimationFrame(() =>
      requestAnimationFrame(() => modal.classList.add("winmodal--open"))
    );

    function close() {
      modal.classList.remove("winmodal--open");
      setTimeout(() => modal.remove(), 330);
      document.removeEventListener("keydown", onKey);
    }
    function onKey(e) {
      if (e.key === "Escape") close();
    }
    backdrop.addEventListener("click", close);
    win.querySelector(".wl--close").addEventListener("click", close);
    const minBtn = win.querySelector(".wl--min");
    minBtn.addEventListener("click", close);
    const maxBtn = win.querySelector(".wl--max");
    maxBtn.addEventListener("click", () => {
      const isMax = win.classList.toggle("winmodal__window--max");
      maxBtn.innerHTML = isMax ? G_COLLAPSE : G_EXPAND;
      // macOS: minimize is unavailable while full-screen — grey it out.
      // Collapse (green again) restores the window and re-enables minimize.
      minBtn.disabled = isMax;
    });
    document.addEventListener("keydown", onKey);
  }

  tiles.forEach((tile) => {
    tile.style.cursor = "pointer";
    tile.addEventListener("click", () => openGame(tile.dataset.game, tile));
  });

  /* ---- Tic-Tac-Toe (hand-drawn) vs computer ---- */
  function mountTTT(body) {
    const O_SVG =
      '<svg viewBox="0 0 100 100" class="mark mark--o"><circle cx="50" cy="50" r="30"/></svg>';
    const X_SVG =
      '<svg viewBox="0 0 100 100" class="mark mark--x"><path d="M30 30 L70 70"/><path d="M70 30 L30 70"/></svg>';

    body.innerHTML =
      '<div class="dttt">' +
      '<div class="dttt__board">' +
      '<svg class="dttt__grid" viewBox="0 0 300 300" aria-hidden="true">' +
      '<path d="M102 16 C99 110 105 200 100 284"/>' +
      '<path d="M200 18 C197 110 203 205 198 282"/>' +
      '<path d="M16 101 C110 98 205 104 284 100"/>' +
      '<path d="M18 199 C110 196 205 202 282 198"/>' +
      "</svg>" +
      [0, 1, 2, 3, 4, 5, 6, 7, 8]
        .map((i) => '<button class="dttt__cell" data-i="' + i + '"></button>')
        .join("") +
      "</div>" +
      '<div class="dttt__foot">' +
      '<span class="dttt__status"></span>' +
      '<button class="dttt__reset" type="button">New Game</button>' +
      "</div></div>";

    const cells = [...body.querySelectorAll(".dttt__cell")];
    const status = body.querySelector(".dttt__status");
    const reset = body.querySelector(".dttt__reset");
    let board, over;

    function winnerInfo(b) {
      for (const line of LINES) {
        const [a, c, d] = line;
        if (b[a] && b[a] === b[c] && b[a] === b[d]) return { who: b[a], line };
      }
      return null;
    }
    function paint() {
      cells.forEach((c, i) => {
        c.innerHTML = board[i] === "X" ? X_SVG : board[i] === "O" ? O_SVG : "";
        c.disabled = board[i] !== "" || over;
        c.classList.remove("dttt__cell--win");
      });
    }
    function ai() {
      for (const p of ["O", "X"]) {
        for (const line of LINES) {
          const v = line.map((i) => board[i]);
          if (v.filter((x) => x === p).length === 2 && v.includes(""))
            return line[v.indexOf("")];
        }
      }
      if (board[4] === "") return 4;
      const cor = [0, 2, 6, 8].filter((i) => board[i] === "");
      const pool = cor.length
        ? cor
        : board.map((v, i) => (v === "" ? i : -1)).filter((i) => i >= 0);
      return pool[Math.floor(Math.random() * pool.length)];
    }
    function end(info) {
      over = true;
      if (info) {
        info.line.forEach((i) => cells[i].classList.add("dttt__cell--win"));
        status.textContent = info.who === "X" ? "You win! 🎉" : "Computer wins";
      } else status.textContent = "It's a draw";
      cells.forEach((c) => (c.disabled = true));
    }
    function play(i) {
      if (over || board[i]) return;
      board[i] = "X";
      paint();
      let info = winnerInfo(board);
      if (info) return end(info);
      if (board.every((v) => v)) return end(null);
      status.textContent = "Computer…";
      cells.forEach((c) => (c.disabled = true));
      setTimeout(() => {
        board[ai()] = "O";
        paint();
        info = winnerInfo(board);
        if (info) return end(info);
        if (board.every((v) => v)) return end(null);
        status.textContent = "Your turn";
      }, 360);
    }
    function newGame() {
      board = ["", "", "", "", "", "", "", "", ""];
      over = false;
      paint();
      status.textContent = "Your turn — you're X";
    }
    cells.forEach((c, i) => c.addEventListener("click", () => play(i)));
    reset.addEventListener("click", newGame);
    newGame();
  }

  /* ---- Memory match ---- */
  function mountMemory(body) {
    const SYMBOLS = ["🎮", "🎲", "🎯", "🎧", "🎸", "🎨"]; // 6 pairs
    body.innerHTML =
      '<div class="dmem"><div class="dmem__board"></div>' +
      '<div class="dmem__foot"><span class="dmem__status"></span>' +
      '<button class="dmem__reset" type="button">New Game</button></div></div>';
    const boardEl = body.querySelector(".dmem__board");
    const status = body.querySelector(".dmem__status");
    const reset = body.querySelector(".dmem__reset");
    let deck, flipped, matched, lock, moves;

    function shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
    function render() {
      boardEl.innerHTML = "";
      deck.forEach((sym, i) => {
        const card = el("button", "dmem__card");
        card.type = "button";
        card.dataset.i = i;
        card.dataset.sym = sym;
        card.addEventListener("click", () => flip(card));
        boardEl.appendChild(card);
      });
    }
    function flip(card) {
      if (
        lock ||
        card.classList.contains("dmem__card--up") ||
        card.classList.contains("dmem__card--done")
      )
        return;
      card.classList.add("dmem__card--up");
      card.textContent = card.dataset.sym;
      flipped.push(card);
      if (flipped.length === 2) {
        moves++;
        lock = true;
        const [a, b] = flipped;
        if (a.dataset.sym === b.dataset.sym) {
          setTimeout(() => {
            a.classList.add("dmem__card--done");
            b.classList.add("dmem__card--done");
            flipped = [];
            lock = false;
            matched++;
            if (matched === SYMBOLS.length)
              status.textContent = "Solved in " + moves + " moves! 🎉";
          }, 300);
        } else {
          setTimeout(() => {
            [a, b].forEach((c) => {
              c.classList.remove("dmem__card--up");
              c.textContent = "";
            });
            flipped = [];
            lock = false;
          }, 700);
        }
      }
    }
    function newGame() {
      deck = shuffle([...SYMBOLS, ...SYMBOLS]);
      flipped = [];
      matched = 0;
      moves = 0;
      lock = false;
      status.textContent = "Find all pairs";
      render();
    }
    reset.addEventListener("click", newGame);
    newGame();
  }
})();
/* ===================== ABOUT ME → NOTES WINDOW ===================== */
(function () {
  const widget = document.querySelector(".widget--notes");
  const screen = document.querySelector(".screen");
  if (!widget || !screen) return;

  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  function stamp() {
    const n = new Date();
    let h = n.getHours();
    const ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    const m = String(n.getMinutes()).padStart(2, "0");
    return `${n.getDate()} ${MONTHS[n.getMonth()]} ${n.getFullYear()} at ${h}:${m} ${ap}`;
  }

  const S = (b) => `<svg viewBox="0 0 24 24" aria-hidden="true">${b}</svg>`;
  const ICON = {
    folderAdd: S('<path d="M3 8.5a1.8 1.8 0 0 1 1.8-1.8h2.9l1.5 1.7H15a1.8 1.8 0 0 1 1.8 1.8v6.3a1.8 1.8 0 0 1-1.8 1.8H4.8A1.8 1.8 0 0 1 3 16.5z"/><path d="M19 4.6v3.8M17.1 6.5h3.8"/>'),
    sidebar: S('<rect x="3" y="5" width="18" height="14" rx="3"/><line x1="9.5" y1="5" x2="9.5" y2="19"/>'),
    folder: '<svg viewBox="0 0 24 24"><path d="M3 8a2 2 0 0 1 2-2h3.3l1.7 2H19a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M6.2 11.4H17.8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    chevron: S('<path d="M15 5l-6 7 6 7"/>'),
    compose: S('<path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"/><path d="M18.4 3.6a2 2 0 0 1 2.8 2.8L12 15.6 8 17l1.4-4z"/>'),
    checklist: S('<path d="M3.5 7l1.5 1.5L8 5.5"/><line x1="11" y1="7" x2="20.5" y2="7"/><path d="M3.5 15l1.5 1.5L8 13.5"/><line x1="11" y1="15" x2="20.5" y2="15"/>'),
    table: S('<rect x="3.5" y="5" width="17" height="14" rx="2"/><line x1="3.5" y1="10.5" x2="20.5" y2="10.5"/><line x1="3.5" y1="15" x2="20.5" y2="15"/><line x1="9.5" y1="5" x2="9.5" y2="19"/><line x1="15" y1="5" x2="15" y2="19"/>'),
    attach: S('<path d="M20 11l-8.4 8.4a4 4 0 0 1-5.7-5.7L14.2 5.4a2.6 2.6 0 0 1 3.7 3.7L9.5 17.5a1.3 1.3 0 0 1-1.9-1.9L15 8.2"/>'),
    markup: S('<path d="M15 4.5l4.5 4.5L8 20.5l-4.5 1 1-4.5z"/><line x1="13.5" y1="6" x2="18" y2="10.5"/>'),
    share: S('<path d="M12 3.5v11"/><path d="M8 7l4-4 4 4"/><path d="M6 12v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7"/>'),
    more: S('<circle cx="6" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="18" cy="12" r="1.7"/>'),
    search: S('<circle cx="10" cy="10" r="6"/><line x1="14.5" y1="14.5" x2="20" y2="20"/>'),
    copy: S('<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/>'),
    award: S('<circle cx="12" cy="9" r="5.5"/><path d="M8.6 13.6 7 21l5-2.6 5 2.6-1.6-7.4"/>'),
    mail: S('<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M4 8l8 5.5L20 8"/>'),
    globe: S('<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.7 2.5 4.2 5.7 4.2 9s-1.5 6.5-4.2 9c-2.7-2.5-4.2-5.7-4.2-9s1.5-6.5 4.2-9z"/>'),
    linkedin: S('<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="7.6" cy="8" r="1.1" fill="currentColor" stroke="none"/><path d="M7.6 10.8v6.2"/><path d="M11 17v-6.2"/><path d="M11 13.3c.4-1 1.4-1.8 2.7-1.8 1.6 0 2.7 1.1 2.7 3V17"/>'),
    pin: S('<path d="M12 21c4-4 6.3-7.2 6.3-10.5a6.3 6.3 0 1 0-12.6 0C5.7 13.8 8 17 12 21z"/><circle cx="12" cy="10.4" r="2.3"/>'),
  };
  const PORTFOLIO_URL = "https://monuprajapat.github.io/Portfolio/";

  // ---- content builders ----
  const P = (t) => '<p class="nw__p">' + t + "</p>";
  const H2 = (t) => '<h2 class="nw__h2">' + t + "</h2>";
  const HR = '<div class="nw__hr"></div>';
  const UL = (items) =>
    '<ul class="nw__ul">' + items.map((i) => '<li class="nw__li">' + i + "</li>").join("") + "</ul>";
  const ULP = (items) =>
    '<ul class="nw__ul nw__ul--plain">' + items.map((i) => '<li class="nw__li">' + i + "</li>").join("") + "</ul>";
  const JOB = (title, date, bullets) => {
    const idx = title.indexOf(",");
    const role = idx >= 0 ? title.slice(0, idx) : title;
    const org = idx >= 0 ? title.slice(idx + 1).trim() : "";
    return (
      '<div class="nw__job">' +
        '<div class="nw__job-head">' +
          '<div class="nw__job-titles">' +
            '<div class="nw__job-role">' + role + "</div>" +
            (org ? '<div class="nw__job-org">' + org + "</div>" : "") +
          "</div>" +
          (date ? '<span class="nw__job-date">' + date + "</span>" : "") +
        "</div>" +
        (bullets && bullets.length ? UL(bullets) : "") +
      "</div>"
    );
  };
  const TAGS = (items) =>
    '<div class="nw__tags">' + items.map((i) => '<span class="nw__tag">' + i + "</span>").join("") + "</div>";
  const CARD = (icon, title, sub, extra) =>
    '<div class="nw__card">' +
      '<span class="nw__card-ic">' + icon + "</span>" +
      '<div class="nw__card-body">' +
        '<div class="nw__card-title">' + title + "</div>" +
        (sub ? '<div class="nw__card-sub">' + sub + "</div>" : "") +
        (extra ? '<div class="nw__card-extra">' + extra + "</div>" : "") +
      "</div>" +
    "</div>";
  const CROW = (icon, text) =>
    '<div class="nw__crow"><span class="nw__crow-ic">' + icon + "</span>" +
    '<span class="nw__crow-text">' + text + "</span></div>";

  const CONTENT = {
    "About Me":
      '<h1 class="nw__h1">About Me</h1>' +
      P(`Hello, I'm Monu.`) +
      P(`I'm a Full Stack Engineer and Tech Lead with 4+ years of experience building high-impact, enterprise-grade products end to end across the MERN / Node.js + React stack, with full ownership and accountability from concept to production.`) +
      P(`I've shipped mission-critical, production-grade systems across inventory management, society management, gaming platforms, construction cost benchmarking, and solar analytics, translating ambiguous business requirements into clear technical roadmaps and predictable delivery.`) +
      P(`As a core technical owner, I drive key system design and architecture decisions (API design, database schema, cloud infrastructure) that reduce technical risk and improve reliability, while mentoring engineers, setting coding standards, and enforcing CI/CD and Git best practices to maximize delivery velocity.`) +
      P(`I enjoy the hard parts most users never see, whether it's a data ingestion pipeline that runs 14 days non-stop with zero data loss, a recursive parent-child cost verification engine, or a tariff engine for location-based rate structures. I believe every reliability and performance improvement compounds into a better product.`) +
      '<blockquote class="nw__quote">' + `"Understand systems before screens, logic before layouts, and scalability before aesthetics."` + "</blockquote>" +
      HR +
      H2(`My Engineering Philosophy`) +
      P(`I don't just ship features.`) +
      P(`I ship systems that scale.`) +
      P(`Code that works today but can't be reasoned about tomorrow is technical debt in disguise. My goal is to build software that's reliable under load, easy to extend, and safe to change.`) +
      P(`Every architecture decision should answer three questions clearly:`) +
      TAGS([`Will it scale?`, `Can it fail safely?`, `Is it easy to change?`]) +
      P(`If those aren't obvious, the design isn't done yet.`) +
      HR +
      H2(`How I Work`) +
      P(`Every project begins with understanding the problem and the constraints, not the framework.`) +
      P(`My typical delivery process includes:`) +
      TAGS([`Requirement Discovery`, `Solution Architecture`, `System Design`, `API & Schema Design`, `Sprint Planning`, `Implementation`, `Code Reviews`, `CI/CD`, `Performance Tuning`, `Observability`, `Stakeholder Alignment`, `Continuous Iteration`]) +
      P(`I work best as the client-facing technical lead, owning requirement discovery, architecture walkthroughs, and delivery across cross-functional engineering teams.`) +
      HR +
      H2(`Areas I Love Building`) +
      TAGS([`Enterprise SaaS`, `Microservices`, `Event-Driven Systems`, `Distributed Systems`, `REST & GraphQL APIs`, `Data Ingestion Pipelines`, `Real-Time Apps`, `Serverless on AWS`, `Payment Integrations`, `AI / LLM Integrations`]) +
      HR +
      H2(`Beyond Work`) +
      P(`Outside of client work, I explore emerging technologies and integrate AI into real product workflows.`) +
      P(`I actively build with LLM and AI tooling:`) +
      TAGS([`OpenAI`, `LLM APIs`, `Pinecone`, `Claude`, `ChatGPT`, `Cursor`]) +
      P(`I'm most drawn to the space where architecture meets scale:`) +
      TAGS([`System Design`, `Distributed Systems`, `Cloud Architecture`, `Performance Engineering`, `Developer Experience`]) +
      P(`Learning is part of my daily routine, because the ecosystem evolves quickly and curiosity is one of the most valuable skills an engineer can have.`),

    "Professional Experience":
      '<h1 class="nw__h1">Professional Experience</h1>' +
      JOB(`Sr. Full Stack Engineer, Eminence Technology`, `Apr 2024 - Present`, [`Serve as Full Stack Tech Lead and core technical owner for high-impact, enterprise-grade products, driving initiatives from concept to production across the MERN / Node.js + React stack with full ownership and accountability`, `Translate ambiguous business requirements into clear, actionable technical roadmaps, ensuring predictable delivery and high client confidence in Agile/Scrum environments`, `Act as primary client-facing technical lead, owning requirement discovery, solution architecture walkthroughs, sprint planning, and stakeholder alignment across cross-functional engineering teams`, `Consistently ship mission-critical, production-grade systems on time by balancing speed, code quality, and long-term scalability across microservices and distributed architectures`, `Drive key system design and architecture decisions (API design, database schema, cloud infrastructure) that reduce technical risk and improve reliability`, `Lead and mentor a team of full stack engineers, setting coding standards, conducting code reviews, and enforcing CI/CD and Git best practices to maximize delivery velocity`]) +
      JOB(`Full Stack Engineer, FarmHeal`, `Mar 2022 - Apr 2024`, [`Led end-to-end development of client-facing full stack platforms, including an enterprise inventory management system and a society management solution using React, Node.js, AWS Lambda, API Gateway, and S3 in a serverless microservices architecture`, `Designed, built, and integrated scalable REST APIs with SSR and full-stack performance optimizations, reducing page load times by ~37%`, `Collaborated with cross-functional product, design, and QA teams in Agile/Scrum sprints to deliver high-availability full stack solutions for enterprise clients`]),

    "Internships":
      '<h1 class="nw__h1">Internships</h1>' +
      JOB(`Research Intern, Samsung R&D Institute`, `Aug 2021 - Mar 2022`, [`Developed a deep learning-based recommendation system using 10,000+ data samples for user classification (Samsung PenUp)`, `Applied data engineering and machine learning techniques to improve personalization accuracy`]),

    "Projects":
      '<h1 class="nw__h1">Projects</h1>' +
      JOB(`Solar Calculator, Solar ROI & Analytics Platform`, ``, [`Engineered an end-to-end solar cost-benefit analysis platform, from data ingestion to ROI insights, for estimating energy production, costs, savings, and ROI prior to installation`, `Ingested and processed a full year of 15-minute interval usage data (~35,000 points) via the Smart Meter Texas (SMT) API`, `Built proprietary algorithms to track sun position and model shading, enabling precise, panel-specific production estimates`, `Developed a tariff engine for location-based rate structures and accurate cost modeling, and unified all data into a single cost-benefit engine with interactive battery and grid charts`]) +
      JOB(`TruGamer, Unified Gaming Platform`, `Next.js · Strapi · PostgreSQL · AWS`, [`Engineered an IGDB game-data ingestion pipeline processing 350,000+ games with batching, rate limiting, and retry logic, sustaining a 14-day non-stop run with zero data loss; built a webhook pipeline for continuous game updates`, `Integrated Steam, Xbox, and PSN APIs with custom per-platform ID resolution, reducing sync to 4-6 API calls per platform per user`, `Implemented priority-queue scheduling and response caching for 700+ active users`]) +
      JOB(`ICM, Intelligent Cost Manager (University of Melbourne)`, `Node.js · PostgreSQL · Supabase · React · Auth0`, [`Built a production-grade cost benchmarking platform managing construction project costs across an 8-level data hierarchy with real-time validation at every level`, `Designed a 26-table normalized PostgreSQL schema with recursive parent-child cost verification`, `Implemented role-based access control (Owner/Admin/Editor/Viewer) using Auth0, JWT, and org-level data isolation`]),

    "Skills":
      '<h1 class="nw__h1">Skills</h1>' +
      H2(`Core Technologies`) +
      TAGS([`Node.js`, `TypeScript`, `React`, `Next.js`, `GraphQL`, `REST APIs`, `Microservices`, `Event-Driven Architecture`, `Distributed Systems`, `System Design`, `Redis`, `WebSockets`, `WebRTC`, `MongoDB`, `PostgreSQL`, `Pinecone`, `API Design`, `Authentication (JWT, OAuth)`]) +
      HR +
      H2(`Cloud, DevOps & Integrations`) +
      TAGS([`AWS (EC2, S3, Lambda, EKS, ECS, CloudWatch)`, `Serverless Architecture`, `Docker`, `CI/CD`, `NGINX`, `Firebase`, `Twilio`, `Stripe`, `Razorpay`, `PayPal`, `Paddle`, `OAuth (Google, Microsoft, Apple)`, `OpenAI`, `LLM APIs`, `Git`, `GitLab`, `Bitbucket`]),

    "Education":
      '<h1 class="nw__h1">Education</h1>' +
      CARD(ICON.award, `Bachelor of Technology, Computer Science (CSE)`, `Chandigarh University · 2019 - 2023`, `CGPA: 7.89 / 10.0`) +
      CARD(ICON.award, `CBSE Class XII`, `Prakash Public School, Karnal · 2019`, `95%`) +
      CARD(ICON.award, `CBSE Class X`, `Prakash Public School, Karnal · 2017`, `CGPA: 9.80`) +
      H2(`Languages`) +
      TAGS([`Hindi (Upper Intermediate)`, `English (Upper Intermediate)`]),

    "Certifications":
      '<h1 class="nw__h1">Certifications</h1>' +
      P(`Verified online courses & specializations I've completed on Coursera.`) +
      CARD(ICON.award, `Machine Learning`, `Stanford Online · Coursera`, `<a class="nw__email" href="https://www.coursera.org/account/accomplishments/verify/PBNZUF4GMZ3P" target="_blank" rel="noopener">View Certificate ↗</a>`) +
      CARD(ICON.award, `Blockchain Specialization`, `University at Buffalo & The State University of New York · Coursera`, `<a class="nw__email" href="https://www.coursera.org/account/accomplishments/specialization/XT2CZUVZM2HN" target="_blank" rel="noopener">View Certificate ↗</a>`) +
      CARD(ICON.award, `Front-End Web Development with React`, `The Hong Kong University of Science and Technology · Coursera`, `<a class="nw__email" href="https://www.coursera.org/account/accomplishments/verify/X3YBVMXUZDNP" target="_blank" rel="noopener">View Certificate ↗</a>`) +
      CARD(ICON.award, `Java for Android`, `Vanderbilt University · Coursera`, `<a class="nw__email" href="https://www.coursera.org/account/accomplishments/verify/ZK47BNK5FCH8" target="_blank" rel="noopener">View Certificate ↗</a>`) +
      CARD(ICON.award, `Python Basics`, `University of Michigan · Coursera`, `<a class="nw__email" href="https://www.coursera.org/account/accomplishments/verify/2NUXVMW3L93K" target="_blank" rel="noopener">View Certificate ↗</a>`),

    "Contact":
      '<h1 class="nw__h1">Contact</h1>' +
      P(`Let's build something meaningful.`) +
      '<div class="nw__contacts">' +
        CROW(ICON.mail, '<a class="nw__email" href="mailto:monuprajapat6270@gmail.com">monuprajapat6270@gmail.com</a>') +
        CROW(ICON.linkedin, '<a class="nw__email" href="https://www.linkedin.com/in/monuprajapat/" target="_blank" rel="noopener">linkedin.com/in/monuprajapat</a>') +
        CROW(ICON.pin, '<a class="nw__email" href="tel:+919996105221">+91-9996105221</a>') +
      "</div>",
  };
  const TABS = Object.keys(CONTENT);

  function open(originEl) {
    const sRect = screen.getBoundingClientRect();
    const w = (originEl || widget).getBoundingClientRect();
    const ox = w.left + w.width / 2 - sRect.left;
    const oy = w.top + w.height / 2 - sRect.top;

    const modal = document.createElement("div");
    modal.className = "winmodal";
    const backdrop = document.createElement("div");
    backdrop.className = "winmodal__backdrop";
    const win = document.createElement("div");
    win.className = "noteswin";
    win.style.transformOrigin = ox + "px " + oy + "px";
    // traffic-light glyphs (shown on hover, macOS-style)
    const G_CLOSE = '<svg class="wl__g" viewBox="0 0 12 12"><path d="M3.4 3.4 8.6 8.6M8.6 3.4 3.4 8.6"/></svg>';
    const G_MIN = '<svg class="wl__g" viewBox="0 0 12 12"><path d="M3 6H9"/></svg>';
    const G_EXPAND = '<svg class="wl__g wl__g--fill" viewBox="0 0 12 12"><path d="M3 3 3 6.4 6.4 3Z"/><path d="M9 9 9 5.6 5.6 9Z"/></svg>';
    const G_COLLAPSE = '<svg class="wl__g wl__g--fill" viewBox="0 0 12 12"><path d="M3 5.8 5.8 5.8 5.8 3Z"/><path d="M9 6.2 6.2 6.2 6.2 9Z"/></svg>';
    win.innerHTML =
      '<aside class="nw__sidebar">' +
        '<div class="nw__side-top">' +
          '<div class="nw__lights">' +
            '<button class="wl wl--close" aria-label="Close">' + G_CLOSE + "</button>" +
            '<button class="wl wl--min" aria-label="Minimize">' + G_MIN + "</button>" +
            '<button class="wl wl--max" aria-label="Expand">' + G_EXPAND + "</button>" +
          "</div>" +
        "</div>" +
        '<ul class="nw__folders">' +
          TABS.map((n, i) =>
            '<li class="nw__folder' + (i === 0 ? " nw__folder--active" : "") + '">' +
            ICON.folder + '<span class="nw__fname">' + n + "</span></li>"
          ).join("") +
        "</ul>" +
      "</aside>" +
      '<section class="nw__main">' +
        '<header class="nw__toolbar">' +
          '<div class="nw__title"><div class="nw__title-main">All on My Mac</div><div class="nw__title-sub">8 notes</div></div>' +
          '<button class="nw__circ" aria-label="Share">' + ICON.share + "</button>" +
          '<div class="nw__search">' + ICON.search + "<span>Search</span></div>" +
        "</header>" +
        '<div class="nw__content"></div>' +
      "</section>";

    modal.appendChild(backdrop);
    modal.appendChild(win);
    screen.appendChild(modal);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => modal.classList.add("winmodal--open"))
    );

    function close() {
      modal.classList.remove("winmodal--open");
      setTimeout(() => modal.remove(), 330);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", outsideShare);
    }
    function onKey(e) {
      if (e.key === "Escape") close();
    }
    backdrop.addEventListener("click", close);
    win.querySelector(".wl--close").addEventListener("click", close);
    const minBtn = win.querySelector(".wl--min");
    minBtn.addEventListener("click", close);
    const maxBtn = win.querySelector(".wl--max");
    maxBtn.addEventListener("click", () => {
      const isMax = win.classList.toggle("noteswin--max");
      maxBtn.innerHTML = isMax ? G_COLLAPSE : G_EXPAND;
      minBtn.disabled = isMax;
    });
    const backBtn = win.querySelector(".nw__back");
    if (backBtn) backBtn.addEventListener("click", close);
    document.addEventListener("keydown", onKey);

    // share → "Copy Link" popover
    const shareBtn = win.querySelector('.nw__circ[aria-label="Share"]');
    let sharePop = null;
    function outsideShare(e) {
      if (sharePop && !sharePop.contains(e.target) && !shareBtn.contains(e.target)) closeShare();
    }
    function closeShare() {
      if (!sharePop) return;
      sharePop.remove();
      sharePop = null;
      document.removeEventListener("click", outsideShare);
    }
    shareBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (sharePop) return closeShare();
      sharePop = document.createElement("div");
      sharePop.className = "nw__share-pop";
      sharePop.innerHTML =
        '<div class="nw__share-title">Copy Link</div>' +
        '<button class="nw__share-row" type="button">' +
          '<span class="nw__share-url">' + PORTFOLIO_URL + "</span>" +
          '<span class="nw__share-copy">' + ICON.copy + "</span>" +
        "</button>";
      win.appendChild(sharePop);
      const wr = win.getBoundingClientRect();
      const br = shareBtn.getBoundingClientRect();
      sharePop.style.top = br.bottom - wr.top + 8 + "px";
      sharePop.style.left = Math.max(8, br.right - wr.left - 300) + "px";
      requestAnimationFrame(() => sharePop.classList.add("nw__share-pop--show"));
      sharePop.querySelector(".nw__share-row").addEventListener("click", () => {
        if (navigator.clipboard) navigator.clipboard.writeText(PORTFOLIO_URL).catch(() => {});
        sharePop.querySelector(".nw__share-title").textContent = "Link Copied!";
        setTimeout(closeShare, 950);
      });
      setTimeout(() => document.addEventListener("click", outsideShare), 0);
    });

    // clickable tabs → swap note content
    const folders = win.querySelectorAll(".nw__folder");
    const contentEl = win.querySelector(".nw__content");
    const titleMain = win.querySelector(".nw__title-main");
    const titleSub = win.querySelector(".nw__title-sub");
    function selectTab(fEl) {
      folders.forEach((f) => f.classList.remove("nw__folder--active"));
      fEl.classList.add("nw__folder--active");
      const name = fEl.querySelector(".nw__fname").textContent;
      titleMain.textContent = name;
      titleSub.textContent = "";
      contentEl.innerHTML =
        '<div class="nw__doc"><div class="nw__date">' + stamp() + "</div>" +
        (CONTENT[name] || "") + "</div>";
      contentEl.scrollTop = 0;
    }
    folders.forEach((f) => f.addEventListener("click", () => selectTab(f)));
    selectTab(folders[0]);
  }

  widget.style.cursor = "pointer";
  widget.addEventListener("click", () => open(widget));

  // dock "About Me" (Notes) icon opens the same window, zooming from the dock
  const dockNotes = document.querySelector(".dock__app--notes");
  if (dockNotes) {
    dockNotes.style.cursor = "pointer";
    dockNotes.addEventListener("click", (e) => {
      e.preventDefault();
      open(dockNotes);
    });
  }
})();

/* ===================== PROJECTS → FINDER WINDOW ===================== */
(function () {
  const trigger = document.querySelector(".dock__app--finder");
  const screen = document.querySelector(".screen");
  if (!trigger || !screen) return;

  const S = (b) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + b + "</svg>";
  const I = {
    recents: S('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    shared: S('<path d="M3 8a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="9" cy="12.5" r="1.5"/><path d="M6.2 16.5c.4-1.3 1.5-2 2.8-2s2.4.7 2.8 2"/>'),
    apps: S('<path d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.3L12 15.3 7.2 17.8l.9-5.3L4.2 8.7l5.4-.8z"/>'),
    doc: S('<path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4h4"/>'),
    desktop: S('<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M9 21h6M12 17v4"/>'),
    downloads: S('<circle cx="12" cy="12" r="8.5"/><path d="M12 8v6m0 0l-2.6-2.6M12 14l2.6-2.6"/>'),
    icloud: S('<path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.3A3.5 3.5 0 0 1 17 18z"/>'),
    home: S('<path d="M4 11l8-6 8 6"/><path d="M6 10v9h12v-9"/>'),
    airdrop: S('<path d="M7.5 13.5a6 6 0 0 1 9 0"/><path d="M10 11a3 3 0 0 1 4 0"/><circle cx="12" cy="18" r="1.1"/>'),
    network: S('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.3 4 5.3 4 8.5s-1.5 6.2-4 8.5c-2.5-2.3-4-5.3-4-8.5s1.5-6.2 4-8.5z"/>'),
    bin: S('<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l1 13a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1l1-13"/>'),
    tags: S('<path d="M4 5.5h6.5l8.5 8.5-6.5 6.5L4 12z"/><circle cx="8.3" cy="9" r="1.2" fill="currentColor" stroke="none"/>'),
    star: S('<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 22l-5.2-2.4 1-5.8L3.5 9.7l5.9-.9z"/>'),
    grid: S('<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>'),
    briefcase: S('<rect x="3" y="7.5" width="18" height="12.5" rx="2"/><path d="M8 7.5V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1.5"/><path d="M3 12h18"/>'),
    robot: S('<rect x="4.5" y="8" width="15" height="11" rx="3"/><path d="M12 4.5V8"/><circle cx="12" cy="4" r="1.2" fill="currentColor" stroke="none"/><circle cx="9.5" cy="13" r="1.1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="13" r="1.1" fill="currentColor" stroke="none"/>'),
    layers: S('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 16.5l9 5 9-5"/>'),
    phone: S('<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M10.5 18h3"/>'),
    web: S('<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M3 8.5h18"/><circle cx="6" cy="6.5" r="0.6" fill="currentColor" stroke="none"/><circle cx="8" cy="6.5" r="0.6" fill="currentColor" stroke="none"/>'),
  };
  const T = {
    back: S('<path d="M15 6l-6 6 6 6"/>'),
    fwd: S('<path d="M9 6l6 6-6 6"/>'),
    grid: S('<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>'),
    list: S('<circle cx="4.5" cy="6" r="1.1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1.1" fill="currentColor" stroke="none"/><path d="M8 6h12M8 12h12M8 18h12"/>'),
    columns: S('<rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M9 4v16M15 4v16"/>'),
    gallery: S('<rect x="3.5" y="4" width="17" height="10.5" rx="2"/><path d="M6 18h3M11 18h2.5M16 18h2"/>'),
    group: S('<rect x="3" y="4.5" width="5" height="5" rx="1"/><rect x="3" y="12" width="5" height="5" rx="1"/><path d="M11 6h9M11 8.5h6M11 13.5h9M11 16h6"/>'),
    chev: S('<path d="M6 9l6 6 6-6"/>'),
    share: S('<path d="M12 3.5v11"/><path d="M8 7l4-4 4 4"/><path d="M6 12v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7"/>'),
    tag: S('<path d="M4 5.5h6.5l8.5 8.5-6.5 6.5L4 12z"/><circle cx="8.3" cy="9" r="1.2" fill="currentColor" stroke="none"/>'),
    more: S('<circle cx="6" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.6" fill="currentColor" stroke="none"/>'),
    search: S('<circle cx="10" cy="10" r="6"/><line x1="14.5" y1="14.5" x2="20" y2="20"/>'),
  };
  const FOLDER =
    '<svg viewBox="0 0 80 64" class="fw__folder-svg" aria-hidden="true">' +
    '<defs><linearGradient id="fwBack" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd2ff"/><stop offset="1" stop-color="#49a7f5"/></linearGradient>' +
    '<linearGradient id="fwFront" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#addcff"/><stop offset="1" stop-color="#5cb4f7"/></linearGradient></defs>' +
    '<path d="M4 12a4 4 0 0 1 4-4h18l6 6h36a4 4 0 0 1 4 4v4H4z" fill="url(#fwBack)"/>' +
    '<path d="M4 17h72a4 4 0 0 1 4 4v29a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" fill="url(#fwFront)"/></svg>';

  const item = (icon, label, cls, group) =>
    '<div class="fw__item' + (cls ? " " + cls : "") + '"' +
    (group ? ' data-group="' + group + '"' : "") + ">" +
    '<span class="fw__item-ic">' + icon + "</span>" +
    '<span class="fw__item-label">' + label + "</span></div>";
  const tag = (color, label) =>
    '<div class="fw__item"><span class="fw__tagdot" style="background:' + color + '"></span>' +
    '<span class="fw__item-label">' + label + "</span></div>";
  const tile = (name) =>
    '<div class="fw__tile">' + FOLDER + '<span class="fw__tile-label">' + name + "</span></div>";

  // ---- project cards ----
  const M = {
    mon: S('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M9 20h6M12 16v4"/>'),
    cal: S('<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 3v3M16 3v3"/>'),
    stack: S('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>'),
    star: S('<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 22l-5.2-2.4 1-5.8L3.5 9.7l5.9-.9z"/>'),
    more: S('<circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>'),
  };
  const MINIFOLDER =
    '<svg class="pj__folder" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 6.5A1.5 1.5 0 0 1 4 5h5l1.6 1.6h8.9A1.5 1.5 0 0 1 21 8.1v9.4A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" fill="#4aa8f5"/></svg>';
  const AVATAR =
    '<svg class="pj__feat-svg" viewBox="0 0 80 90" aria-hidden="true"><rect width="80" height="90" rx="10" fill="#dfe1e6"/><circle cx="40" cy="33" r="15" fill="#b9bcc4"/><path d="M13 84c2.5-16 14-24 27-24s24.5 8 27 24z" fill="#b9bcc4"/></svg>';
  const MOCK = (theme) => {
    const c = theme === "dark" ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.75)";
    return (
      '<svg class="pj__mock" viewBox="0 0 320 170" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<rect x="10" y="10" width="46" height="150" rx="8" fill="' + c + '"/>' +
      '<rect x="66" y="12" width="244" height="15" rx="5" fill="' + c + '"/>' +
      '<rect x="66" y="36" width="76" height="50" rx="8" fill="' + c + '"/>' +
      '<rect x="150" y="36" width="76" height="50" rx="8" fill="' + c + '"/>' +
      '<rect x="234" y="36" width="76" height="50" rx="8" fill="' + c + '"/>' +
      '<rect x="66" y="94" width="158" height="66" rx="8" fill="' + c + '"/>' +
      '<rect x="232" y="94" width="78" height="66" rx="8" fill="' + c + '"/>' +
      "</svg>"
    );
  };

  const PROJECTS = [
    // ---- Featured (live, real screenshots) ----
    { group: "featured", title: "TruGamer", cat: "Unified Gaming Platform", url: "https://trugamer.com/", img: "proj-trugamer.jpg", badge: "Live", bc: "live", tags: [["Next.js", "blue"], ["IGDB API", "purple"]], mi: "mon", mt: "350K+ Games", yr: "2025",
      desc: "A unified gaming platform that pulls games, news, and release calendars from Steam, Xbox, and PSN into a single hub.",
      stack: ["Next.js", "Node.js", "Strapi", "PostgreSQL", "Redis", "AWS", "IGDB API"],
      highlights: ["Built an IGDB ingestion pipeline for 350K+ games with batching, rate-limiting & retries — a 14-day non-stop run with zero data loss", "Integrated Steam/Xbox/PSN APIs with per-platform ID resolution (4–6 calls per platform per user)", "Priority-queue scheduling & response caching for 700+ active users"] },
    { group: "featured", title: "Jigawatt", cat: "Solar Design & Analytics Platform", url: "https://jigawatt.solar/", img: "proj-jigawatt.jpg", badge: "Live", bc: "live", tags: [["Node.js", "green"], ["Data Viz", "teal"]], mi: "mon", mt: "Solar ROI", yr: "2025",
      desc: "A solar cost-benefit platform that estimates energy production, savings, and ROI before installation.",
      stack: ["Node.js", "React", "PostgreSQL", "SMT API", "Chart.js", "AWS"],
      highlights: ["Ingested a full year of 15-minute interval usage data (~35K points) via the Smart Meter Texas API", "Built sun-position & shading algorithms for panel-specific production estimates", "Location-based tariff engine unified into a single cost-benefit engine with interactive charts"] },
    { group: "featured", title: "ICM", cat: "Intelligent Cost Manager", url: "https://icm.in/", img: "proj-icm.jpg", badge: "Live", bc: "live", tags: [["PostgreSQL", "blue"], ["Auth0", "orange"]], mi: "stack", mt: "8-Level Hierarchy", yr: "2024",
      desc: "A production-grade construction cost-benchmarking platform built for the University of Melbourne.",
      stack: ["Node.js", "React", "PostgreSQL", "Supabase", "Auth0", "AWS"],
      highlights: ["Managed project costs across an 8-level data hierarchy with real-time validation at every level", "Designed a 26-table normalized schema with recursive parent-child cost verification", "Role-based access (Owner/Admin/Editor/Viewer) via Auth0 with org-level data isolation"] },

    // ---- AI / ML ----
    { group: "ai", title: "DocuMind AI", cat: "RAG Document Assistant", badge: "Live", bc: "live", tags: [["OpenAI", "purple"], ["Pinecone", "blue"]], mi: "stack", mt: "Vector Search", yr: "2025",
      desc: "A retrieval-augmented assistant that answers questions over private document sets with cited sources.",
      stack: ["Node.js", "React", "OpenAI", "Pinecone", "LangChain", "MongoDB"],
      highlights: ["Chunking + embedding pipeline with semantic vector search over Pinecone", "Streaming answers with inline source citations", "Per-workspace document isolation & access control"] },
    { group: "ai", title: "SupportGenie", cat: "AI Customer-Support Copilot", badge: "Live", bc: "live", tags: [["LLM APIs", "purple"], ["React", "teal"]], mi: "mon", mt: "Streaming Chat", yr: "2024",
      desc: "An AI copilot that drafts support replies from a knowledge base and past ticket history.",
      stack: ["React", "Node.js", "LLM APIs", "Redis", "WebSockets", "PostgreSQL"],
      highlights: ["Streaming chat with tool-calling and knowledge-base retrieval", "Tone & brand-voice controls for generated replies", "Human-in-the-loop approval before sending"] },
    { group: "ai", title: "SmartRecs", cat: "Personalized Recommendation Engine", badge: "Case Study", bc: "case", tags: [["Node.js", "green"], ["ML", "purple"]], mi: "stack", mt: "Real-Time", yr: "2024",
      desc: "A recommendation engine serving real-time personalized suggestions across a product catalog.",
      stack: ["Node.js", "Python", "Redis", "PostgreSQL", "scikit-learn"],
      highlights: ["Hybrid collaborative + content-based scoring", "Real-time feature store backed by Redis", "Built-in A/B testing framework to measure lift"] },

    // ---- Cloud & DevOps ----
    { group: "devops", title: "DeployHub", cat: "CI/CD Pipeline Automation", badge: "Live", bc: "live", tags: [["GitHub Actions", "gray"], ["Docker", "blue"]], mi: "stack", mt: "EC2 · Zero-Downtime", yr: "2025",
      desc: "A CI/CD setup that builds, tests, and ships to AWS EC2 with zero-downtime releases.",
      stack: ["GitHub Actions", "Docker", "AWS EC2", "NGINX", "PM2", "Bash"],
      highlights: ["Multi-stage Docker builds with layer caching to cut build times", "Blue-green deploys to EC2 behind NGINX for zero downtime", "Automated rollback on failed health checks"] },
    { group: "devops", title: "InfraStack", cat: "Infrastructure as Code", badge: "Live", bc: "live", tags: [["Terraform", "purple"], ["AWS ECS", "orange"]], mi: "stack", mt: "Auto-Scaling", yr: "2024",
      desc: "Infrastructure-as-Code that provisions containerized services with auto-scaling.",
      stack: ["Terraform", "AWS ECS", "ECR", "CloudFormation", "IAM"],
      highlights: ["Reproducible environments via reusable Terraform modules", "ECS services with CPU/memory-based auto-scaling policies", "Least-privilege IAM roles and managed secrets"] },
    { group: "devops", title: "MetricPulse", cat: "Observability & Monitoring", badge: "Live", bc: "live", tags: [["CloudWatch", "orange"], ["Grafana", "teal"]], mi: "mon", mt: "Live Dashboards", yr: "2024",
      desc: "An observability stack with live dashboards, centralized logs, and alerting.",
      stack: ["Node.js", "CloudWatch", "Grafana", "Prometheus", "Docker"],
      highlights: ["Custom application metrics with CloudWatch alarms", "Grafana dashboards for latency and error rates", "SLO-based alerting to on-call channels"] },

    // ---- Mobile Apps ----
    { group: "mobile", title: "FitTrack", cat: "Fitness & Activity Tracker", badge: "Live", bc: "live", tags: [["React Native", "teal"], ["Node.js", "green"]], mi: "mon", mt: "iOS · Android", yr: "2025",
      desc: "A cross-platform fitness tracker with workouts, streaks, and progress charts.",
      stack: ["React Native", "Expo", "Node.js", "MongoDB", "Firebase"],
      highlights: ["Offline-first storage with background sync", "Push notifications to keep workout streaks alive", "Progress and health-data visualizations"] },
    { group: "mobile", title: "SplitEase", cat: "Expense Splitting App", badge: "Live", bc: "live", tags: [["React Native", "teal"], ["MongoDB", "green"]], mi: "mon", mt: "Realtime Sync", yr: "2024",
      desc: "A group expense-splitting app with realtime balances and settle-ups.",
      stack: ["React Native", "Node.js", "MongoDB", "Socket.io"],
      highlights: ["Realtime shared ledgers across group members", "Smart settle-up suggestions to minimize transfers", "Multi-currency support"] },
    { group: "mobile", title: "ChatWave", cat: "Realtime Messaging App", badge: "Live", bc: "live", tags: [["WebSockets", "blue"], ["Expo", "gray"]], mi: "mon", mt: "E2E Encrypted", yr: "2024",
      desc: "A realtime messaging app with media sharing, presence, and end-to-end encryption.",
      stack: ["React Native", "Node.js", "WebSockets", "Redis"],
      highlights: ["1:1 and group chats with typing & presence indicators", "End-to-end encrypted messages", "Media sharing with push notifications"] },

    // ---- Web Apps (MERN) ----
    { group: "web", title: "TaskFlow", cat: "Project Management SaaS", badge: "Live", bc: "live", tags: [["React", "teal"], ["MongoDB", "green"]], mi: "mon", mt: "Kanban · Teams", yr: "2025",
      desc: "A project-management SaaS with boards, teams, and realtime collaboration.",
      stack: ["React", "Node.js", "MongoDB", "Socket.io", "Redis"],
      highlights: ["Kanban boards with drag-and-drop", "Realtime collaboration and an activity feed", "Role-based team workspaces"] },
    { group: "web", title: "ShopSphere", cat: "E-Commerce Platform", badge: "Live", bc: "live", tags: [["MERN", "blue"], ["Stripe", "purple"]], mi: "stack", mt: "Payments", yr: "2024",
      desc: "A full-featured e-commerce platform with payments and an admin dashboard.",
      stack: ["React", "Node.js", "MongoDB", "Stripe", "Redis"],
      highlights: ["Cart, checkout & Stripe payment integration", "Admin dashboard for catalog and orders", "Search, filters, and inventory management"] },
    { group: "web", title: "MeetSync", cat: "Video Conferencing App", badge: "Live", bc: "live", tags: [["WebRTC", "blue"], ["Socket.io", "gray"]], mi: "mon", mt: "HD Video", yr: "2024",
      desc: "A browser-based video conferencing app with screen share and in-call chat.",
      stack: ["React", "Node.js", "WebRTC", "Socket.io"],
      highlights: ["HD multi-party video powered by WebRTC", "Screen sharing and in-call chat", "Shareable room links with a waiting room"] },
  ];

  // gradient headers for the detail page of imageless projects
  const GROUP_GRAD = {
    ai: "linear-gradient(135deg,#3a2b6e,#7c3aed)",
    devops: "linear-gradient(135deg,#12212e,#1f6f8b)",
    mobile: "linear-gradient(135deg,#1b4d2f,#2f9d5a)",
    web: "linear-gradient(135deg,#1b2a6e,#4059d0)",
    featured: "linear-gradient(135deg,#333,#555)",
  };

  function card(p, i) {
    const tags = p.tags
      .map((t) => '<span class="pj__tag pj__tag--' + t[1] + '">' + t[0] + "</span>")
      .join("");
    // only Featured projects show an image; others are clean info cards
    const thumb = p.img
      ? '<div class="pj__thumb" style="background:url(\'' + p.img + "') center / cover\">" +
          '<span class="pj__badge pj__badge--' + p.bc + '">' + p.badge + "</span></div>"
      : "";
    const isLink = !!p.url;
    const openTag = isLink
      ? '<a class="pj" data-i="' + i + '" href="' + p.url + '" target="_blank" rel="noopener">'
      : '<div class="pj" data-i="' + i + '">';
    const closeTag = isLink ? "</a>" : "</div>";
    return (
      openTag + thumb +
        '<div class="pj__body">' +
          '<div class="pj__row">' + MINIFOLDER +
            '<span class="pj__title">' + p.title + "</span>" +
            (p.img ? "" : '<span class="pj__badge-inline pj__badge--' + p.bc + '">' + p.badge + "</span>") +
            '<button class="pj__star">' + M.star + "</button></div>" +
          '<div class="pj__cat">' + p.cat + "</div>" +
          '<div class="pj__tags">' + tags + "</div>" +
          '<div class="pj__meta">' +
            '<span class="pj__metaitem">' + M[p.mi] + p.mt + "</span>" +
            '<span class="pj__metaitem">' + M.cal + p.yr + "</span>" +
            '<button class="pj__more" aria-label="Options">' + M.more + "</button></div>" +
        "</div>" + closeTag
    );
  }

  // full detail "page" shown when a card's ⋯ → View Details is chosen
  function detailHTML(p) {
    const chips = (p.stack || [])
      .map((s) => '<span class="pj__chip">' + s + "</span>")
      .join("");
    const hl = (p.highlights || [])
      .map((h) => "<li>" + h + "</li>")
      .join("");
    const hero = p.img
      ? '<div class="pjd__hero" style="background:url(\'' + p.img + "') center / cover\"></div>"
      : '<div class="pjd__hero" style="background:' + (GROUP_GRAD[p.group] || GROUP_GRAD.featured) + '">' +
          '<span class="pjd__hero-title">' + p.title + "</span></div>";
    return (
      '<div class="pjd">' + hero +
        '<div class="pjd__info">' +
          '<div class="pjd__head"><h2 class="pjd__title">' + p.title + "</h2>" +
            '<span class="pj__badge-inline pj__badge--' + p.bc + '">' + p.badge + "</span></div>" +
          '<div class="pjd__cat">' + p.cat + "</div>" +
          (p.desc ? '<p class="pjd__desc">' + p.desc + "</p>" : "") +
          (chips ? '<div class="pj__dlabel">Tech Stack</div><div class="pj__stack">' + chips + "</div>" : "") +
          (hl ? '<div class="pj__dlabel">What I built</div><ul class="pj__hl">' + hl + "</ul>" : "") +
          '<div class="pjd__foot">' +
            '<span class="pjd__meta-item">' + M[p.mi] + p.mt + "</span>" +
            '<span class="pjd__meta-item">' + M.cal + p.yr + "</span>" +
            (p.url ? '<a class="pjd__visit" href="' + p.url + '" target="_blank" rel="noopener">Visit Live Site ↗</a>' : "") +
          "</div>" +
        "</div>" +
      "</div>"
    );
  }

  function open(originEl) {
    const sRect = screen.getBoundingClientRect();
    const r = (originEl || trigger).getBoundingClientRect();
    const ox = r.left + r.width / 2 - sRect.left;
    const oy = r.top + r.height / 2 - sRect.top;

    const modal = document.createElement("div");
    modal.className = "winmodal";
    const backdrop = document.createElement("div");
    backdrop.className = "winmodal__backdrop";
    const win = document.createElement("div");
    win.className = "finderwin";
    win.style.transformOrigin = ox + "px " + oy + "px";
    // traffic-light glyphs (shown on hover, macOS-style)
    const G_CLOSE = '<svg class="wl__g" viewBox="0 0 12 12"><path d="M3.4 3.4 8.6 8.6M8.6 3.4 3.4 8.6"/></svg>';
    const G_MIN = '<svg class="wl__g" viewBox="0 0 12 12"><path d="M3 6H9"/></svg>';
    const G_EXPAND = '<svg class="wl__g wl__g--fill" viewBox="0 0 12 12"><path d="M3 3 3 6.4 6.4 3Z"/><path d="M9 9 9 5.6 5.6 9Z"/></svg>';
    const G_COLLAPSE = '<svg class="wl__g wl__g--fill" viewBox="0 0 12 12"><path d="M3 5.8 5.8 5.8 5.8 3Z"/><path d="M9 6.2 6.2 6.2 6.2 9Z"/></svg>';
    win.innerHTML =
      '<aside class="fw__sidebar">' +
        '<div class="fw__side-top"><div class="winmodal__lights">' +
          '<button class="wl wl--close" aria-label="Close">' + G_CLOSE + "</button>" +
          '<button class="wl wl--min" aria-label="Minimize">' + G_MIN + "</button>" +
          '<button class="wl wl--max" aria-label="Expand">' + G_EXPAND + "</button>" +
        "</div></div>" +
        '<div class="fw__list">' +
          item(I.recents, "Recents", "fw__item--active", "all") +
          '<div class="fw__section">Portfolio</div>' +
          item(I.grid, "Featured Projects", "", "featured") +
          item(I.robot, "AI / ML", "", "ai") +
          item(I.layers, "Cloud & DevOps", "", "devops") +
          item(I.phone, "Mobile Apps", "", "mobile") +
          item(I.web, "Web Apps", "", "web") +
        "</div></aside>" +
      '<section class="fw__main">' +
        '<header class="fw__toolbar">' +
          '<button class="fw__back" style="display:none" aria-label="Back">' + T.back + "</button>" +
          '<div class="fw__titles"><div class="fw__title">Recents</div>' +
            '<div class="fw__subtitle">3 items</div></div>' +
          '<button class="nw__circ">' + T.share + "</button>" +
          '<div class="nw__search">' + T.search + "<span>Search</span></div>" +
        "</header>" +
        '<div class="fw__grid fw__grid--projects">' +
          PROJECTS.map(card).join("") +
        "</div>" +
        '<div class="fw__detail" style="display:none"></div>' +
        '<div class="fw__footer">3 items</div>' +
      "</section>";

    modal.appendChild(backdrop);
    modal.appendChild(win);
    screen.appendChild(modal);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => modal.classList.add("winmodal--open"))
    );

    function close() {
      modal.classList.remove("winmodal--open");
      setTimeout(() => modal.remove(), 330);
      document.removeEventListener("keydown", onKey);
    }
    function onKey(e) {
      if (e.key === "Escape") close();
    }
    backdrop.addEventListener("click", close);
    win.querySelector(".wl--close").addEventListener("click", close);
    const minBtn = win.querySelector(".wl--min");
    minBtn.addEventListener("click", close);
    const maxBtn = win.querySelector(".wl--max");
    maxBtn.addEventListener("click", () => {
      const isMax = win.classList.toggle("finderwin--max");
      maxBtn.innerHTML = isMax ? G_COLLAPSE : G_EXPAND;
      minBtn.disabled = isMax;
    });
    document.addEventListener("keydown", onKey);

    // ---- sidebar filtering + ⋯ menu + detail drill-in ----
    const grid = win.querySelector(".fw__grid--projects");
    const detailEl = win.querySelector(".fw__detail");
    const backBtn = win.querySelector(".fw__back");
    const titleEl = win.querySelector(".fw__title");
    const subEl = win.querySelector(".fw__subtitle");
    const footEl = win.querySelector(".fw__footer");
    const navItems = [...win.querySelectorAll(".fw__item[data-group]")];
    const state = { group: "all", label: "Recents", list: PROJECTS };

    function renderGroup(group, label) {
      state.group = group;
      state.label = label;
      state.list = group === "all" ? PROJECTS : PROJECTS.filter((p) => p.group === group);
      grid.innerHTML = state.list.map((p, i) => card(p, i)).join("");
      titleEl.textContent = label;
      const n = state.list.length;
      const count = n + (n === 1 ? " item" : " items");
      subEl.textContent = count;
      footEl.textContent = count;
      // back to the list view
      detailEl.style.display = "none";
      grid.style.display = "";
      footEl.style.display = "";
      backBtn.style.display = "none";
      grid.scrollTop = 0;
    }

    function showDetail(p) {
      detailEl.innerHTML = detailHTML(p);
      grid.style.display = "none";
      footEl.style.display = "none";
      detailEl.style.display = "block";
      backBtn.style.display = "inline-flex";
      titleEl.textContent = p.title;
      subEl.textContent = p.cat;
      detailEl.scrollTop = 0;
    }

    navItems.forEach((it) =>
      it.addEventListener("click", () => {
        navItems.forEach((x) => x.classList.remove("fw__item--active"));
        it.classList.add("fw__item--active");
        renderGroup(it.dataset.group, it.querySelector(".fw__item-label").textContent);
      })
    );
    backBtn.addEventListener("click", () => renderGroup(state.group, state.label));

    // ⋯ → small menu ("View Details" / "Open Live Site")
    let menuEl = null;
    function closeMenu() {
      if (menuEl) { menuEl.remove(); menuEl = null; }
      document.removeEventListener("click", onDocClick);
    }
    function onDocClick(e) {
      if (menuEl && !menuEl.contains(e.target)) closeMenu();
    }
    grid.addEventListener("click", (e) => {
      const moreBtn = e.target.closest(".pj__more");
      if (!moreBtn) return;
      e.preventDefault();
      e.stopPropagation();
      const cardEl = moreBtn.closest(".pj");
      const p = cardEl && state.list[+cardEl.dataset.i];
      if (!p) return;
      closeMenu();
      menuEl = document.createElement("div");
      menuEl.className = "pj__menu";
      menuEl.innerHTML =
        '<button class="pj__menu-item" data-act="details">View Details</button>' +
        (p.url ? '<button class="pj__menu-item" data-act="site">Open Live Site</button>' : "");
      // fixed to the viewport (body child) so it isn't clipped and positions reliably
      document.body.appendChild(menuEl);
      const br = moreBtn.getBoundingClientRect();
      menuEl.style.top = br.bottom + 6 + "px";
      menuEl.style.left = Math.max(8, br.right - 172) + "px";
      menuEl.addEventListener("click", (ev) => {
        const btn = ev.target.closest(".pj__menu-item");
        if (!btn) return;
        if (btn.dataset.act === "details") showDetail(p);
        else if (btn.dataset.act === "site" && p.url) window.open(p.url, "_blank", "noopener");
        closeMenu();
      });
      setTimeout(() => document.addEventListener("click", onDocClick), 0);
    });

    renderGroup("all", "Recents");
  }

  trigger.style.cursor = "pointer";
  trigger.addEventListener("click", (e) => {
    e.preventDefault();
    open(trigger);
  });

  // "View All Projects" button in the home widget opens the same window
  document.querySelectorAll(".pjw__viewall").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      open(btn);
    });
  });
})();

/* ===================== TOOLS MARQUEE ===================== */
(function () {
  const viewport = document.querySelector(".tools__viewport");
  if (!viewport) return;

  const LOGOS = [
    {
      name: "Figma",
      cls: "",
      svg:
        '<svg viewBox="0 0 38 57" aria-label="Figma">' +
        '<path fill="#1abcfe" d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z"/>' +
        '<path fill="#0acf83" d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z"/>' +
        '<path fill="#ff7262" d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z"/>' +
        '<path fill="#f24e1e" d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z"/>' +
        '<path fill="#a259ff" d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z"/>' +
        "</svg>",
    },
    {
      name: "Adobe XD",
      cls: "tool--xd",
      svg:
        '<svg viewBox="0 0 48 48" aria-label="Adobe XD">' +
        '<rect width="48" height="48" rx="11" fill="#2e001f"/>' +
        '<text x="24" y="31" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="700" fill="#ff61f6">Xd</text>' +
        "</svg>",
    },
    {
      name: "Cursor",
      cls: "",
      svg:
        '<svg viewBox="0 0 40 40" aria-label="Cursor">' +
        '<path d="M20 3 L35 11.5 L20 20 L5 11.5 Z" fill="#cfcfcf"/>' +
        '<path d="M20 20 L35 11.5 L35 28.5 L20 37 Z" fill="#5a5a5a"/>' +
        '<path d="M20 20 L5 11.5 L5 28.5 L20 37 Z" fill="#1e1e1e"/>' +
        "</svg>",
    },
    {
      name: "Claude",
      cls: "",
      svg:
        '<svg viewBox="0 0 40 40" aria-label="Claude">' +
        '<g stroke="#d97757" stroke-width="3" stroke-linecap="round">' +
        '<line x1="20" y1="20" x2="20" y2="4"/><line x1="20" y1="20" x2="28" y2="6.1"/>' +
        '<line x1="20" y1="20" x2="33.9" y2="12"/><line x1="20" y1="20" x2="36" y2="20"/>' +
        '<line x1="20" y1="20" x2="33.9" y2="28"/><line x1="20" y1="20" x2="28" y2="33.9"/>' +
        '<line x1="20" y1="20" x2="20" y2="36"/><line x1="20" y1="20" x2="12" y2="33.9"/>' +
        '<line x1="20" y1="20" x2="6.1" y2="28"/><line x1="20" y1="20" x2="4" y2="20"/>' +
        '<line x1="20" y1="20" x2="6.1" y2="12"/><line x1="20" y1="20" x2="12" y2="6.1"/>' +
        "</g></svg>",
    },
    {
      name: "ChatGPT",
      cls: "",
      svg:
        '<svg viewBox="0 0 40 40" aria-label="ChatGPT">' +
        '<g fill="#10a37f">' +
        '<ellipse cx="20" cy="12" rx="6.2" ry="9.4"/>' +
        '<ellipse cx="20" cy="12" rx="6.2" ry="9.4" transform="rotate(60 20 20)"/>' +
        '<ellipse cx="20" cy="12" rx="6.2" ry="9.4" transform="rotate(120 20 20)"/>' +
        '<ellipse cx="20" cy="12" rx="6.2" ry="9.4" transform="rotate(180 20 20)"/>' +
        '<ellipse cx="20" cy="12" rx="6.2" ry="9.4" transform="rotate(240 20 20)"/>' +
        '<ellipse cx="20" cy="12" rx="6.2" ry="9.4" transform="rotate(300 20 20)"/>' +
        '</g><circle cx="20" cy="20" r="5.4" fill="#f7f7f8"/>' +
        "</svg>",
    },
    {
      name: "Stitch",
      cls: "",
      svg:
        '<svg viewBox="0 0 40 40" aria-label="Stitch">' +
        '<defs><linearGradient id="stitchGrad" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#4285f4"/><stop offset=".5" stop-color="#9b72cb"/>' +
        '<stop offset="1" stop-color="#d96570"/></linearGradient></defs>' +
        '<path d="M20 2 C21.2 12 28 18.8 38 20 C28 21.2 21.2 28 20 38 C18.8 28 12 21.2 2 20 C12 18.8 18.8 12 20 2 Z" fill="url(#stitchGrad)"/>' +
        "</svg>",
    },
    {
      name: "Sketch",
      cls: "tool--sketch",
      svg:
        '<svg viewBox="0 0 100 90" aria-label="Sketch">' +
        '<path d="M22 4 H78 L98 32 L50 88 L2 32 Z" fill="#fdb300"/>' +
        '<path d="M2 32 H98 L50 88 Z" fill="#ea6c00"/>' +
        '<path d="M22 4 L2 32 H37 Z" fill="#fdad00"/>' +
        '<path d="M78 4 L98 32 H63 Z" fill="#fdad00"/>' +
        '<path d="M22 4 H78 L63 32 H37 Z" fill="#feeeb7"/>' +
        "</svg>",
    },
    {
      name: "Framer",
      cls: "",
      svg:
        '<svg viewBox="0 0 24 24" aria-label="Framer">' +
        '<path fill="#0099ff" d="M4 0h16v8h-8zM4 8h8l8 8H4zM4 16h8v8z"/>' +
        "</svg>",
    },
  ];

  function chip(logo) {
    const c = document.createElement("span");
    c.className = "tool" + (logo.cls ? " " + logo.cls : "");
    c.title = logo.name;
    c.innerHTML = logo.svg;
    return c;
  }

  // single-row marquee: two identical sets → seamless loop
  viewport.innerHTML = "";
  const track = document.createElement("div");
  track.className = "tools__track";
  [0, 1].forEach(() => LOGOS.forEach((l) => track.appendChild(chip(l))));
  viewport.appendChild(track);
})();

/* ===================== DOCK HOVER TOOLTIPS ===================== */
(function () {
  const dock = document.querySelector(".dock");
  if (!dock) return;

  // class -> label mapping (in dock order)
  const TIPS = {
    "dock__app--finder": "Projects",
    "dock__app--notes": "About Me",
    "dock__app--music": "Music",
    "dock__app--settings": "System Settings",
    "dock__app--acrobat": "Resume",
    "dock__app--mail": "Contact Me",
    "dock__app--linkedin": "LinkedIn",
    "dock__app--github": "GitHub",
  };

  const tip = document.createElement("div");
  tip.className = "dock__tooltip";
  dock.appendChild(tip);

  dock.querySelectorAll(".dock__app").forEach((app) => {
    const key = Object.keys(TIPS).find((c) => app.classList.contains(c));
    const label = key ? TIPS[key] : app.getAttribute("aria-label") || "";
    if (!label) return;

    app.addEventListener("mouseenter", () => {
      tip.textContent = label;
      tip.style.left = app.offsetLeft + app.offsetWidth / 2 + "px";
      tip.classList.add("dock__tooltip--show");
    });
    app.addEventListener("mouseleave", () => {
      tip.classList.remove("dock__tooltip--show");
    });
  });
})();

/* ===================== PROJECT CAROUSEL ===================== */
(function () {
  const carousel = document.querySelector(".project__carousel");
  if (!carousel) return;

  const track = carousel.querySelector(".project__track");
  const slides = Array.from(carousel.querySelectorAll(".project__slide"));
  const dotsWrap = carousel.querySelector(".project__dots");
  const prevBtn = carousel.querySelector(".project__nav--prev");
  const nextBtn = carousel.querySelector(".project__nav--next");
  const nameEl = document.querySelector(".project__name");
  const roleEl = document.querySelector(".project__role");
  if (!track || slides.length === 0) return;

  const AUTOPLAY_MS = 4000;
  let index = 0;
  let timer = null;

  // build dots
  const dots = slides.map((_, i) => {
    const d = document.createElement("span");
    d.className = "project__dot";
    d.addEventListener("click", () => go(i, true));
    dotsWrap.appendChild(d);
    return d;
  });

  function render() {
    track.style.transform = `translateX(-${index * 100}%)`;
    const slide = slides[index];
    if (nameEl) nameEl.textContent = slide.dataset.name || "";
    if (roleEl) roleEl.textContent = slide.dataset.role || "";
    dots.forEach((d, i) =>
      d.classList.toggle("project__dot--active", i === index)
    );
  }

  function go(i, userInitiated) {
    index = (i + slides.length) % slides.length;
    render();
    if (userInitiated) restart();
  }

  const next = () => go(index + 1);
  const prev = () => go(index - 1);

  function restart() {
    stop();
    timer = setInterval(next, AUTOPLAY_MS);
  }
  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  nextBtn && nextBtn.addEventListener("click", () => go(index + 1, true));
  prevBtn && prevBtn.addEventListener("click", () => go(index - 1, true));

  // pause on hover so the user can read / navigate
  carousel.addEventListener("mouseenter", stop);
  carousel.addEventListener("mouseleave", restart);

  render();
  restart();
})();

/* ===================== NOW PLAYING — PLAY/PAUSE TOGGLE ===================== */
(function () {
  const playBtn = document.querySelector(".music__btn--play");
  if (!playBtn) return;

  const pauseIcon = playBtn.querySelector(".music__icon-pause");
  const playIcon = playBtn.querySelector(".music__icon-play");
  const viz = document.querySelector(".music__viz");
  let playing = true;

  playBtn.addEventListener("click", () => {
    playing = !playing;
    pauseIcon.hidden = !playing;
    playIcon.hidden = playing;
    if (viz) {
      viz
        .querySelectorAll("i")
        .forEach((bar) => (bar.style.animationPlayState = playing ? "running" : "paused"));
    }
  });
})();

/* ===================== MUSIC → GENERATIVE LO-FI PLAYER ===================== */
(function () {
  const trigger = document.querySelector(".dock__app--music");
  const screen = document.querySelector(".screen");
  if (!trigger || !screen) return;

  // ---- traffic-light glyphs (match the other windows) ----
  const G_CLOSE = '<svg class="wl__g" viewBox="0 0 12 12"><path d="M3.4 3.4 8.6 8.6M8.6 3.4 3.4 8.6"/></svg>';
  const G_MIN = '<svg class="wl__g" viewBox="0 0 12 12"><path d="M3 6H9"/></svg>';
  const G_EXPAND = '<svg class="wl__g wl__g--fill" viewBox="0 0 12 12"><path d="M3 3 3 6.4 6.4 3Z"/><path d="M9 9 9 5.6 5.6 9Z"/></svg>';
  const G_COLLAPSE = '<svg class="wl__g wl__g--fill" viewBox="0 0 12 12"><path d="M3 5.8 5.8 5.8 5.8 3Z"/><path d="M9 6.2 6.2 6.2 6.2 9Z"/></svg>';

  // ---- transport glyphs ----
  const PLAY = '<svg class="music__glyph" viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></svg>';
  const PAUSE = '<svg class="music__glyph" viewBox="0 0 24 24"><rect x="7" y="5.5" width="3.6" height="13" rx="1.2"/><rect x="13.4" y="5.5" width="3.6" height="13" rx="1.2"/></svg>';
  const PREV = '<svg class="music__glyph" viewBox="0 0 24 24"><path d="M18 6 10 12 18 18Z"/><rect x="6.4" y="6" width="2.4" height="12" rx="1"/></svg>';
  const NEXT = '<svg class="music__glyph" viewBox="0 0 24 24"><path d="M6 6 14 12 6 18Z"/><rect x="15.2" y="6" width="2.4" height="12" rx="1"/></svg>';

  // ---- "tracks" = generative moods (chords are semitone offsets from root) ----
  const TRACKS = [
    { name: "Midnight Study", artist: "Lo-Fi · Generative", bpm: 72, root: 220.0, wave: "sine",
      chords: [[0, 3, 7, 10], [-2, 3, 5, 10], [-4, 0, 3, 7], [-5, -2, 2, 5]], rain: false },
    { name: "Rainy Focus", artist: "Lo-Fi · Generative", bpm: 66, root: 196.0, wave: "triangle",
      chords: [[0, 3, 7, 10], [5, 8, 12, 15], [-2, 2, 5, 9], [-4, 0, 3, 7]], rain: true },
    { name: "Sunday Coding", artist: "Lo-Fi · Generative", bpm: 78, root: 261.63, wave: "sine",
      chords: [[0, 4, 7, 11], [-3, 2, 5, 9], [-5, 0, 4, 7], [2, 5, 9, 12]], rain: false },
  ];

  const mtof = (root, semis) => root * Math.pow(2, semis / 12);

  let win = null; // guard against multiple windows
  // audio state (single window at a time)
  let actx, master, analyser, freqData, NOISE, vol = 0.6;
  let playing = false, cur = 0, step = 0, nextT = 0;
  let sched = null, rafId = null, elapsed = 0, elapsedTimer = null;
  let crackle = null, rain = null;

  function noiseBuffer() {
    const len = actx.sampleRate * 2;
    const buf = actx.createBuffer(1, len, actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  function noiseLayer(type, cutoff, gainVal) {
    const src = actx.createBufferSource();
    src.buffer = NOISE; src.loop = true;
    const f = actx.createBiquadFilter(); f.type = type; f.frequency.value = cutoff;
    const g = actx.createGain(); g.gain.value = gainVal;
    src.connect(f).connect(g).connect(master);
    src.start();
    return { src, g };
  }
  function stopLayer(layer) {
    if (!layer) return;
    try { layer.src.stop(); } catch (e) {}
  }
  function kick(t) {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.9, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + 0.34);
  }
  function hat(t, vel) {
    const src = actx.createBufferSource(); src.buffer = NOISE;
    const hp = actx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 7000;
    const g = actx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(hp).connect(g).connect(master);
    src.start(t); src.stop(t + 0.06);
  }
  function pad(t, freqs, dur) {
    const g = actx.createGain();
    const lp = actx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1900; lp.Q.value = 0.6;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.15, t + 0.6);
    g.gain.setValueAtTime(0.15, t + Math.max(0.7, dur - 0.8));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    freqs.forEach((f, i) => {
      const o = actx.createOscillator();
      o.type = TRACKS[cur].wave;
      o.frequency.value = f;
      o.detune.value = (i - 1.5) * 4;
      o.connect(g);
      o.start(t); o.stop(t + dur + 0.05);
    });
    g.connect(lp).connect(master);
  }

  function scheduleStep(s, t) {
    const T = TRACKS[cur];
    const secPer8th = (60 / T.bpm) / 2;
    const e = s % 8;                 // eighth-note within the bar
    const bar = Math.floor(s / 8);
    if (e === 0) {
      const chord = T.chords[bar % T.chords.length].map((n) => mtof(T.root, n));
      pad(t, chord, secPer8th * 8);  // sustain the chord across the bar
      kick(t);
    }
    if (e === 4) kick(t);
    if (e % 2 === 1) hat(t, 0.08);        // off-beat hats give the groove
    else if (e !== 0 && e !== 4) hat(t, 0.045);
  }
  function scheduler() {
    while (nextT < actx.currentTime + 0.12) {
      scheduleStep(step, nextT);
      nextT += (60 / TRACKS[cur].bpm) / 2;
      step++;
    }
  }

  function ensureAudio() {
    if (actx) return;
    actx = new (window.AudioContext || window.webkitAudioContext)();
    master = actx.createGain(); master.gain.value = vol;
    analyser = actx.createAnalyser(); analyser.fftSize = 128;
    freqData = new Uint8Array(analyser.frequencyBinCount);
    master.connect(analyser).connect(actx.destination);
    NOISE = noiseBuffer();
    crackle = noiseLayer("highpass", 5200, 0.012);   // subtle vinyl hiss
  }

  function draw(bars) {
    analyser.getByteFrequencyData(freqData);
    const n = bars.length, half = freqData.length;
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(((i + 1) / n) * half);
      const v = freqData[Math.min(idx, half - 1)] / 255;
      bars[i].style.transform = "scaleY(" + (0.1 + v * 1.05).toFixed(3) + ")";
    }
    rafId = requestAnimationFrame(() => draw(bars));
  }

  const fmt = (s) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");

  function open(originEl) {
    if (win) return;
    const sRect = screen.getBoundingClientRect();
    const r = (originEl || trigger).getBoundingClientRect();
    const ox = r.left + r.width / 2 - sRect.left;
    const oy = r.top + r.height / 2 - sRect.top;

    const modal = document.createElement("div");
    modal.className = "winmodal";
    const backdrop = document.createElement("div");
    backdrop.className = "winmodal__backdrop";
    win = document.createElement("div");
    win.className = "winmodal__window musicwin";
    win.style.transformOrigin = ox + "px " + oy + "px";

    const EQ = Array.from({ length: 14 }, () => '<i class="music__bar"></i>').join("");
    win.innerHTML =
      '<div class="winmodal__bar">' +
        '<div class="winmodal__lights">' +
          '<button class="wl wl--close" aria-label="Close">' + G_CLOSE + "</button>" +
          '<button class="wl wl--min" aria-label="Minimize">' + G_MIN + "</button>" +
          '<button class="wl wl--max" aria-label="Expand">' + G_EXPAND + "</button>" +
        "</div>" +
        '<span class="winmodal__title">Music</span>' +
      "</div>" +
      '<div class="winmodal__body">' +
        '<div class="music" data-track="0">' +
          '<div class="music__art"><span class="music__label"></span></div>' +
          '<div class="music__meta">' +
            '<div class="music__track"></div>' +
            '<div class="music__artist"></div>' +
          "</div>" +
          '<div class="music__eq">' + EQ + "</div>" +
          '<div class="music__controls">' +
            '<button class="music__btn music__prev" aria-label="Previous">' + PREV + "</button>" +
            '<button class="music__btn music__play music__play--big" aria-label="Play">' + PLAY + "</button>" +
            '<button class="music__btn music__next" aria-label="Next">' + NEXT + "</button>" +
          "</div>" +
          '<div class="music__time"><span class="music__elapsed">0:00</span>' +
            '<span class="music__count"></span></div>' +
          '<div class="music__vol">' +
            '<svg class="music__volic" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8.5a4 4 0 0 1 0 7"/></svg>' +
            '<input class="music__slider" type="range" min="0" max="100" value="60" aria-label="Volume">' +
          "</div>" +
        "</div>" +
      "</div>";

    modal.appendChild(backdrop);
    modal.appendChild(win);
    screen.appendChild(modal);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => modal.classList.add("winmodal--open"))
    );

    const root = win.querySelector(".music");
    const bars = [...win.querySelectorAll(".music__bar")];
    const playBtn = win.querySelector(".music__play");
    const trackEl = win.querySelector(".music__track");
    const artistEl = win.querySelector(".music__artist");
    const labelEl = win.querySelector(".music__label");
    const elapsedEl = win.querySelector(".music__elapsed");
    const countEl = win.querySelector(".music__count");
    const slider = win.querySelector(".music__slider");

    function paintTrack() {
      const T = TRACKS[cur];
      trackEl.textContent = T.name;
      artistEl.textContent = T.artist;
      labelEl.textContent = T.name.split(" ")[0];
      root.dataset.track = String(cur);
      countEl.textContent = (cur + 1) + " / " + TRACKS.length;
    }
    function updTime() { elapsedEl.textContent = fmt(elapsed); }
    function setPlayUI(on) {
      playBtn.innerHTML = on ? PAUSE : PLAY;
      playBtn.setAttribute("aria-label", on ? "Pause" : "Play");
      root.classList.toggle("music--playing", on);
      if (!on) bars.forEach((b) => (b.style.transform = "scaleY(0.1)"));
    }

    function play() {
      ensureAudio();
      if (actx.state === "suspended") actx.resume();
      playing = true;
      nextT = actx.currentTime + 0.06;
      if (TRACKS[cur].rain && !rain) rain = noiseLayer("highpass", 900, 0.05);
      sched = setInterval(scheduler, 25);
      draw(bars);
      elapsedTimer = setInterval(() => { elapsed++; updTime(); }, 1000);
      setPlayUI(true);
    }
    function pause() {
      playing = false;
      clearInterval(sched); sched = null;
      cancelAnimationFrame(rafId); rafId = null;
      clearInterval(elapsedTimer); elapsedTimer = null;
      if (actx) actx.suspend();
      setPlayUI(false);
    }
    function toggle() { playing ? pause() : play(); }
    function switchTo(i) {
      cur = (i + TRACKS.length) % TRACKS.length;
      step = 0; elapsed = 0; updTime();
      paintTrack();
      if (rain && !TRACKS[cur].rain) { stopLayer(rain); rain = null; }
      if (playing) {
        if (TRACKS[cur].rain && !rain && actx) rain = noiseLayer("highpass", 900, 0.05);
        nextT = actx.currentTime + 0.06;
      }
    }

    playBtn.addEventListener("click", toggle);
    win.querySelector(".music__prev").addEventListener("click", () => switchTo(cur - 1));
    win.querySelector(".music__next").addEventListener("click", () => switchTo(cur + 1));
    slider.addEventListener("input", () => {
      vol = slider.value / 100;
      if (master) master.gain.setTargetAtTime(vol, actx.currentTime, 0.02);
    });

    paintTrack();
    setPlayUI(false);

    // ---- window chrome (close / minimize / maximize) ----
    function close() {
      pause();
      stopLayer(crackle); crackle = null;
      stopLayer(rain); rain = null;
      if (actx) { try { actx.close(); } catch (e) {} actx = null; }
      cur = 0; step = 0; elapsed = 0;
      modal.classList.remove("winmodal--open");
      setTimeout(() => modal.remove(), 330);
      document.removeEventListener("keydown", onKey);
      win = null;
    }
    function onKey(e) { if (e.key === "Escape") close(); }
    backdrop.addEventListener("click", close);
    win.querySelector(".wl--close").addEventListener("click", close);
    const minBtn = win.querySelector(".wl--min");
    minBtn.addEventListener("click", close);
    const maxBtn = win.querySelector(".wl--max");
    maxBtn.addEventListener("click", () => {
      const isMax = win.classList.toggle("winmodal__window--max");
      maxBtn.innerHTML = isMax ? G_COLLAPSE : G_EXPAND;
      minBtn.disabled = isMax;
    });
    document.addEventListener("keydown", onKey);
  }

  trigger.style.cursor = "pointer";
  trigger.addEventListener("click", (e) => {
    e.preventDefault();
    open(trigger);
  });
})();

/* ===================== SYSTEM SETTINGS → WALLPAPER PICKER ===================== */
(function () {
  const trigger = document.querySelector(".dock__app--settings");
  const screen = document.querySelector(".screen");
  if (!trigger || !screen) return;

  const WALLPAPERS = [
    // ---- Live Wallpapers (looping video) ----
    { id: "live-sonoma-light", name: "Sonoma", section: "Live Wallpapers", video: "wp-live-sonoma-light.mp4", poster: "wp-live-sonoma-light-poster.jpg", bg: "#3a6b8f" },
    { id: "live-sonoma-dark", name: "Sonoma Dark", section: "Live Wallpapers", video: "wp-live-sonoma-dark.mp4", poster: "wp-live-sonoma-dark-poster.jpg", bg: "#16202e" },
    // ---- macOS (photo / graphic) ----
    { id: "bigsur", name: "Big Sur", section: "macOS", img: "macos-wallpaper.jpg", bg: "#1c3a52" },
    { id: "sonoma", name: "Sonoma", section: "macOS", img: "wp-sonoma.jpg", bg: "#1f5b46" },
    { id: "ventura", name: "Ventura", section: "macOS", img: "wp-ventura.jpg", bg: "#3a2a6e" },
    { id: "monterey", name: "Monterey", section: "macOS", img: "wp-monterey.jpg", bg: "#3a2a5a" },
    // ---- Colors ----
    { id: "sky", name: "Sky", section: "Colors", img: "wp-radial.jpg", bg: "#4a90d9" },
    { id: "blue", name: "Blue", section: "Colors", img: "wp-blue.jpg", bg: "#1a3a6e" },
    { id: "purple", name: "Purple", section: "Colors", img: "wp-purple.jpg", bg: "#4a2a86" },
    { id: "pink", name: "Pink", section: "Colors", img: "wp-pink.jpg", bg: "#b03a6e" },
    { id: "yellow", name: "Yellow", section: "Colors", img: "wp-yellow.jpg", bg: "#d9d06a" },
    { id: "green", name: "Green", section: "Colors", img: "wp-green.jpg", bg: "#2f7d4a" },
    { id: "imac-blue", name: "iMac Blue", section: "Colors", img: "wp-imac-blue.jpg", bg: "#2a5aaa" },
    { id: "imac-orange", name: "iMac Orange", section: "Colors", img: "wp-imac-orange.jpg", bg: "#d9772a" },
    { id: "imac-purple", name: "iMac Purple", section: "Colors", img: "wp-imac-purple.jpg", bg: "#7a4aaa" },
    { id: "imac-pink", name: "iMac Pink", section: "Colors", img: "wp-imac-pink.jpg", bg: "#d94a8a" },
    { id: "imac-silver", name: "iMac Silver", section: "Colors", img: "wp-imac-silver.jpg", bg: "#b0b0b8" },
    { id: "imac-yellow", name: "iMac Yellow", section: "Colors", img: "wp-imac-yellow.jpg", bg: "#e0c94a" },
  ];
  const KEY = "mp-wallpaper";
  const store = {
    get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} },
  };

  // full-screen looping video used for live wallpapers (created on demand)
  let wpVideo = null;
  function ensureVideo() {
    if (wpVideo) return;
    wpVideo = document.createElement("video");
    wpVideo.className = "wallpaper-video";
    wpVideo.muted = true;
    wpVideo.loop = true;
    wpVideo.setAttribute("muted", "");
    wpVideo.setAttribute("playsinline", "");
    wpVideo.setAttribute("autoplay", "");
    wpVideo.style.display = "none";
    document.body.insertBefore(wpVideo, document.body.firstChild);
  }
  function applyWallpaper(w) {
    if (w.video) {
      ensureVideo();
      if (wpVideo.getAttribute("data-src") !== w.video) {
        wpVideo.src = w.video;
        wpVideo.setAttribute("data-src", w.video);
      }
      if (w.poster) wpVideo.poster = w.poster;
      wpVideo.style.display = "block";
      document.body.style.background = w.bg;
      const pr = wpVideo.play();
      if (pr && pr.catch) pr.catch(() => {});
    } else {
      if (wpVideo) wpVideo.style.display = "none";
      document.body.style.background =
        w.bg + ' url("' + w.img + '") center / cover no-repeat fixed';
    }
  }
  // restore the saved wallpaper on load
  let currentId = store.get() || WALLPAPERS[2].id;
  if (store.get()) {
    const savedWp = WALLPAPERS.find((w) => w.id === currentId);
    if (savedWp) applyWallpaper(savedWp);
  }

  // traffic-light glyphs
  const G_CLOSE = '<svg class="wl__g" viewBox="0 0 12 12"><path d="M3.4 3.4 8.6 8.6M8.6 3.4 3.4 8.6"/></svg>';
  const G_MIN = '<svg class="wl__g" viewBox="0 0 12 12"><path d="M3 6H9"/></svg>';
  const G_EXPAND = '<svg class="wl__g wl__g--fill" viewBox="0 0 12 12"><path d="M3 3 3 6.4 6.4 3Z"/><path d="M9 9 9 5.6 5.6 9Z"/></svg>';
  const G_COLLAPSE = '<svg class="wl__g wl__g--fill" viewBox="0 0 12 12"><path d="M3 5.8 5.8 5.8 5.8 3Z"/><path d="M9 6.2 6.2 6.2 6.2 9Z"/></svg>';

  const sicon = (bg, glyph, label, active, pane) =>
    '<div class="set__item' + (active ? " set__item--active" : "") + '"' +
      (pane ? ' data-pane="' + pane + '"' : "") + ">" +
      '<span class="set__item-ic" style="background:' + bg + '">' + glyph + "</span>" +
      '<span class="set__item-label">' + label + "</span></div>";
  const GL = {
    wifi: '<svg viewBox="0 0 24 24"><path d="M4.5 11a11 11 0 0 1 15 0M7.5 14a7 7 0 0 1 9 0"/><circle cx="12" cy="17.5" r="1.1" fill="#fff" stroke="none"/></svg>',
    bt: '<svg viewBox="0 0 24 24"><path d="M8 7l8 5-8 5V4l8 5-8 5"/></svg>',
    net: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.5 2.3 4 5 4 8s-1.5 5.7-4 8c-2.5-2.3-4-5-4-8s1.5-5.7 4-8z"/></svg>',
    wall: '<svg viewBox="0 0 24 24"><rect x="4" y="5.5" width="16" height="13" rx="2"/><path d="M4 15l4-3.5 3.5 3 3.5-4 5 5.5"/><circle cx="9" cy="9.5" r="1.2" fill="#fff" stroke="none"/></svg>',
    disp: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M9 21h6M12 17v4"/></svg>',
    batt: '<svg viewBox="0 0 24 24"><rect x="3" y="8" width="16" height="9" rx="2"/><path d="M21 11v3"/><rect x="5" y="10" width="9" height="5" rx="1" fill="#fff" stroke="none"/></svg>',
  };

  let win = null;

  function open(originEl) {
    if (win) return;
    const sRect = screen.getBoundingClientRect();
    const r = (originEl || trigger).getBoundingClientRect();
    const ox = r.left + r.width / 2 - sRect.left;
    const oy = r.top + r.height / 2 - sRect.top;

    const modal = document.createElement("div");
    modal.className = "winmodal";
    const backdrop = document.createElement("div");
    backdrop.className = "winmodal__backdrop";
    win = document.createElement("div");
    win.className = "settingswin";
    win.style.transformOrigin = ox + "px " + oy + "px";

    const wallBtn = (w) =>
      '<button class="set__wall' + (w.id === currentId ? " set__wall--active" : "") +
        '" data-id="' + w.id + '">' +
        '<span class="set__wall-thumb" style="background-image:url(\'' + (w.poster || w.img) + "')\">" +
          (w.video ? '<span class="set__wall-live">LIVE</span>' : "") +
        "</span>" +
        '<span class="set__wall-name">' + w.name + "</span></button>";
    // group into sections (preserve order)
    const sections = [];
    WALLPAPERS.forEach((w) => {
      let s = sections.find((x) => x.name === w.section);
      if (!s) { s = { name: w.section, items: [] }; sections.push(s); }
      s.items.push(w);
    });
    const walls = sections
      .map(
        (s) =>
          '<div class="set__section-label">' + s.name + "</div>" +
          '<div class="set__grid">' + s.items.map(wallBtn).join("") + "</div>"
      )
      .join("");

    win.innerHTML =
      '<aside class="set__sidebar">' +
        '<div class="set__side-top"><div class="winmodal__lights">' +
          '<button class="wl wl--close" aria-label="Close">' + G_CLOSE + "</button>" +
          '<button class="wl wl--min" aria-label="Minimize">' + G_MIN + "</button>" +
          '<button class="wl wl--max" aria-label="Expand">' + G_EXPAND + "</button>" +
        "</div></div>" +
        '<div class="set__search">' +
          '<svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="6"/><path d="M14.5 14.5L20 20"/></svg><span>Search</span>' +
        "</div>" +
        '<div class="set__list">' +
          sicon("#3b8bff", GL.wifi, "Wi-Fi") +
          sicon("#3b8bff", GL.bt, "Bluetooth") +
          sicon("#3b8bff", GL.net, "Network") +
          '<div class="set__sep"></div>' +
          sicon("#3ab7d6", GL.wall, "Wallpaper", true, "wallpaper") +
          sicon("#4a7bff", GL.disp, "Displays") +
          sicon("#34c759", GL.batt, "Battery") +
        "</div>" +
      "</aside>" +
      '<section class="set__main">' +
        '<div class="set__header">' +
          '<div class="set__title">Wallpaper</div>' +
          '<div class="set__sub">Choose a picture for your desktop.</div>' +
        "</div>" +
        '<div class="set__body">' + walls + "</div>" +
      "</section>";

    modal.appendChild(backdrop);
    modal.appendChild(win);
    screen.appendChild(modal);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => modal.classList.add("winmodal--open"))
    );

    // pick a wallpaper (delegated across all section grids)
    win.querySelector(".set__body").addEventListener("click", (e) => {
      const btn = e.target.closest(".set__wall");
      if (!btn) return;
      const id = btn.dataset.id;
      const w = WALLPAPERS.find((x) => x.id === id);
      if (!w) return;
      currentId = id;
      applyWallpaper(w);
      store.set(id);
      win.querySelectorAll(".set__wall").forEach((el) =>
        el.classList.toggle("set__wall--active", el.dataset.id === id)
      );
    });

    // window chrome
    function close() {
      modal.classList.remove("winmodal--open");
      setTimeout(() => modal.remove(), 330);
      document.removeEventListener("keydown", onKey);
      win = null;
    }
    function onKey(e) { if (e.key === "Escape") close(); }
    backdrop.addEventListener("click", close);
    win.querySelector(".wl--close").addEventListener("click", close);
    const minBtn = win.querySelector(".wl--min");
    minBtn.addEventListener("click", close);
    const maxBtn = win.querySelector(".wl--max");
    maxBtn.addEventListener("click", () => {
      const isMax = win.classList.toggle("settingswin--max");
      maxBtn.innerHTML = isMax ? G_COLLAPSE : G_EXPAND;
      minBtn.disabled = isMax;
    });
    document.addEventListener("keydown", onKey);
  }

  trigger.style.cursor = "pointer";
  trigger.addEventListener("click", (e) => {
    e.preventDefault();
    open(trigger);
  });
})();
