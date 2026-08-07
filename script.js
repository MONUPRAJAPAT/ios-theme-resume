/* ===================== RESPONSIVE SCALE-TO-FIT ===================== */
(function () {
  const screen = document.querySelector(".screen");
  if (!screen) return;
  const DESIGN_W = 1440;
  const DESIGN_H = 900;

  // scene now fills the viewport directly — no scaling transform.
  screen.style.transform = "none";
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
  const PORTFOLIO_URL = "https://ankurdbb32.github.io/Portfolio/";

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
      P(`Hello, I'm Ankur.`) +
      P(`I'm a Senior Product Designer with 5+ years of experience creating digital products that balance user needs, business goals, and technical feasibility.`) +
      P(`Over the years I've worked across enterprise software, insurance, fintech, hiring platforms, AI products, social media tools, and consumer applications, designing experiences that simplify complex workflows into intuitive interfaces.`) +
      P(`My career began in software engineering, where I worked on Apple Maps. That experience fundamentally changed how I approach design. It taught me to understand systems before screens, logic before layouts, and scalability before aesthetics. Today I bridge the gap between design and development, making collaboration with engineers faster and more efficient.`) +
      P(`Currently, I lead product design initiatives at Ensylon, designing enterprise solutions for EquiTrust and multiple internal products. My work spans product discovery, user research, information architecture, interaction design, design systems, prototyping, usability testing, and developer handoff.`) +
      P(`I enjoy solving problems that most users never notice. Whether it's reducing the number of clicks required to complete a task, simplifying a complicated workflow, improving accessibility, or creating reusable design systems, I believe every small improvement contributes to a better overall experience.`) +
      '<blockquote class="nw__quote">' + `"Design is not about making things look better. It's about making people's lives a little easier, one interaction at a time."` + "</blockquote>" +
      HR +
      H2(`My Design Philosophy`) +
      P(`I don't design screens.`) +
      P(`I design experiences.`) +
      P(`A beautiful interface without usability is simply decoration. My goal is to create products that people understand instantly, enjoy using repeatedly, and trust over time.`) +
      P(`I believe great design should feel invisible. Users shouldn't have to stop and think about where to click next. Every interaction should feel natural, predictable, and purposeful.`) +
      P(`Good design answers three simple questions immediately:`) +
      TAGS([`Where am I?`, `What can I do?`, `What happens next?`]) +
      P(`If those questions aren't obvious, there's still work to do.`) +
      HR +
      H2(`How I Work`) +
      P(`Every project begins with understanding the problem, not the interface.`) +
      P(`My typical design process includes:`) +
      TAGS([`Product Discovery`, `Stakeholder Workshops`, `User Interviews`, `Competitive Analysis`, `User Journey Mapping`, `Information Architecture`, `Wireframing`, `High Fidelity Design`, `Interactive Prototyping`, `Usability Testing`, `Design QA`, `Continuous Iteration`]) +
      P(`I enjoy collaborating with product managers, developers, researchers, and business teams because the best products are never designed in isolation.`) +
      HR +
      H2(`Areas I Love Designing`) +
      TAGS([`Enterprise SaaS Products`, `AI Powered Experiences`, `Design Systems`, `Dashboard & Analytics`, `Productivity Applications`, `Mobile Apps`, `Web Platforms`, `Internal Business Tools`, `Data Heavy Interfaces`, `Workflow Optimisation`]) +
      HR +
      H2(`Beyond Design`) +
      P(`Outside of client work, I'm constantly exploring emerging technologies and experimenting with new ways of building digital products.`) +
      P(`I actively work with AI-assisted design workflows to accelerate ideation while maintaining high design quality:`) +
      TAGS([`Claude`, `ChatGPT`, `Cursor`, `Lovable`, `V0`, `Stitch`, `UX Pilot`, `Readdy AI`]) +
      P(`I'm also drawn to the space where design meets engineering:`) +
      TAGS([`Design Engineering`, `Motion Design`, `Micro Interactions`, `Spatial Interfaces`, `Design + Code Collaboration`]) +
      P(`Learning has become part of my daily routine because the design industry evolves quickly, and I believe curiosity is one of the most valuable skills a designer can have.`),

    "Professional Experience":
      '<h1 class="nw__h1">Professional Experience</h1>' +
      JOB(`Senior UI/UX Designer, Ensylon, Jaipur`, `Jun 2025 - Present`, [`Leading end-to-end product design for EquiTrust's digital ecosystem, including the Quotient hiring platform and 4+ enterprise insurance tools across policy, retirement, and annuity workflows`, `Designed and optimized multi-step user journeys within the Quotient platform, covering candidate onboarding, profile creation, job workflows, and recruiter interactions`, `Delivered 30+ wireframes, user flows, and high-fidelity prototypes, reducing design iteration cycles by ~30% across stakeholder reviews`, `Conducted structured user research with 30+ participants in 2-week cycles, identifying usability gaps and improving task completion rates by ~25% across hiring and internal workflows`, `Built and scaled reusable design system components across hiring and insurance products, reducing design-to-development turnaround time by ~35%`, `Delivered developer-ready specifications, interaction states, and edge cases, improving implementation efficiency by ~34% and reducing rework`, `Collaborated with US-based stakeholders, product managers, and engineering teams to translate complex hiring and insurance requirements into scalable UX solutions`, `Contributed to product direction by presenting UX insights that influenced feature prioritization and roadmap decisions`]) +
      JOB(`UI/UX Designer, Oolook, Jaipur`, `May 2023 - Apr 2025`, [`Designed end-to-end user experiences across web and mobile platforms, structuring core user journeys from onboarding to key feature interactions`, `Created scalable information architecture and interaction models, improving task completion rates by ~25% across primary user flows`, `Conducted usability testing and iterative design improvements, increasing user satisfaction by 15–20% based on feedback and usage patterns`, `Collaborated closely with product managers and engineers to translate requirements into feasible, high-quality design solutions`, `Delivered high-fidelity prototypes and developer-ready specifications, reducing ambiguity during implementation and improving delivery speed`, `Contributed to feature prioritization by leveraging user insights, aligning design decisions with business and product goals`]) +
      JOB(`Software Development Engineer, Apple Maps Via ThoughtGenesis, Hyderabad`, `Jan 2022 - Jan 2023`, [`Improved map-based user experience by enhancing visualization logic for geographic data layers (e.g., water bodies) across multiple zoom levels`, `Designed and implemented data optimization pipelines, achieving ~487% improvement in data accuracy, consistency, and availability for map interfaces`, `Worked on system-level design for data-driven UI behavior, ensuring consistency and scalability across large datasets and edge cases`]),

    "Internships":
      '<h1 class="nw__h1">Internships</h1>' +
      JOB(`UI/UX Design Intern, BrainQuest (Remote)`, `Feb 2023 - Apr 2023`, [`Iterated on designs using stakeholder feedback and usage insights, improving clarity and efficiency across key financial interactions`, `Delivered end-to-end UX solutions across fintech and insurance workflows by aligning user needs, business requirements, and system constraints, contributing to scalable, conversion-focused product experiences`, `Built intuitive interfaces for financial dashboards, policy comparison views, and transaction tracking systems, improving usability of data-heavy and high-frequency workflows`]) +
      JOB(`UI/UX Design Intern, Trumsy (Remote)`, `Apr 2021 - Dec 2021`, [`Owned the end-to-end design lifecycle for an EdTech startup's gamified learning platform for kids, translating complex user needs into intuitive UI flows and engaging learning experiences aligned with product KPIs`, `Collaborated closely with PMs and developers to define product features, apply usability best practices, and deliver high-impact design solutions under tight timelines.`]),

    "Skills":
      '<h1 class="nw__h1">Skills</h1>' +
      H2(`Design`) +
      TAGS([`User Experience (UX) Design`, `User Interface (UI) Design`, `Enterprise Product Design`, `SaaS Product Design`, `AI/LLM UX Design`, `Conversational UI Design`, `AI Copilot Experience Design`, `Prompt UX Design`, `Dashboard & Analytics Design`, `Data Visualization`, `Design Systems`, `Component Libraries`, `Information Architecture`, `User Research`, `User Journey Mapping`, `Wireframing`, `Prototyping`, `Interaction Design`, `Responsive Design`, `Mobile App Design`, `Web Application Design`, `Accessibility (WCAG)`, `Usability Testing`, `Design Thinking`, `Visual Design`, `Heuristic Evaluation`, `Design Strategy`, `UX Writing`, `User-Centered Design`]) +
      HR +
      H2(`Tools`) +
      TAGS([`Figma`, `FigJam`, `Adobe XD`, `Photoshop`, `Illustrator`, `Miro`, `Jira`, `Confluence`, `Notion`, `Cursor`, `Lovable AI`, `V0 by Vercel`, `ChatGPT`, `Claude`, `Gemini`, `Stitch`, `UX Pilot`, `Readdy.ai`, `Wix`, `WordPress`, `Maze`, `Zeplin`, `Chrome DevTools`]) +
      HR +
      H2(`Development Collaboration`) +
      TAGS([`HTML5`, `CSS3`, `JavaScript Fundamentals`, `Bootstrap`, `Responsive Web Design`, `Mobile-First Design`, `Design-to-Development Handoff`, `Figma Inspect`, `Component Libraries`, `Design Systems`, `Developer QA`, `Frontend Feasibility Review`, `Cross-Functional Collaboration`, `Agile/Scrum`, `Stakeholder Management`, `Product-Engineering Collaboration`]),

    "Certifications":
      '<h1 class="nw__h1">Certifications</h1>' +
      CARD(ICON.award, `Google UX Design Professional Certificate`, `Google`, ``) +
      CARD(ICON.award, `Using AI in UX Design Process`, `LinkedIn Learning`, ``) +
      H2(`Currently Learning`) +
      TAGS([`AI Product Design`, `Motion Design`, `Design Engineering`]),

    "POR":
      '<h1 class="nw__h1">Positions of Responsibility</h1>' +
      CARD(ICON.award, `Best Design Award`, `Design Rush · IIT BHU`, `Won among 1200+ participants for designing Trado, a Crypto Trading App.`) +
      CARD(ICON.award, `Head Team Member`, `Design Fest · IIT Roorkee`, `Led the design team during the national design competition.`),

    "Contact":
      '<h1 class="nw__h1">Contact</h1>' +
      P(`Let's build something meaningful.`) +
      '<div class="nw__contacts">' +
        CROW(ICON.mail, '<a class="nw__email" href="mailto:ankurmeena194@gmail.com">ankurmeena194@gmail.com</a>') +
        CROW(ICON.globe, '<a class="nw__email" href="' + PORTFOLIO_URL + '" target="_blank" rel="noopener">Portfolio</a>') +
        CROW(ICON.linkedin, '<a class="nw__email" href="https://www.linkedin.com/in/" target="_blank" rel="noopener">LinkedIn</a>') +
        CROW(ICON.pin, "Jaipur, India") +
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
    // masked placeholder rows (do NOT embed real secrets in a public site)
    const rows = Array.from({ length: 10 }, () => "<tr><td>•••••–••••</td></tr>").join("");
    win.innerHTML =
      '<aside class="nw__sidebar">' +
        '<div class="nw__side-top">' +
          '<div class="nw__lights">' +
            '<button class="wl wl--close" aria-label="Close"></button>' +
            '<span class="wl wl--min"></span><span class="wl wl--max"></span>' +
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
          '<div class="nw__title"><div class="nw__title-main">All on My Mac</div><div class="nw__title-sub">10 notes</div></div>' +
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

  const item = (icon, label, cls) =>
    '<div class="fw__item' + (cls ? " " + cls : "") + '">' +
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
    { title: "Lumina UX", cat: "AI Healthcare Platform", badge: "Live", bc: "live", theme: "light", grad: "linear-gradient(135deg,#eef3fb,#dbe7f7)", tags: [["Enterprise", "green"], ["AI", "purple"]], mi: "mon", mt: "12 Screens", yr: "2026" },
    { title: "Nexus Banking", cat: "Banking & FinTech Platform", badge: "Case Study", bc: "case", theme: "dark", grad: "linear-gradient(135deg,#1b1a2e,#242346)", tags: [["Enterprise", "green"], ["FinTech", "blue"]], mi: "mon", mt: "18 Screens", yr: "2026" },
    { title: "EquiTrust Platform", cat: "Insurance & Annuity Platform", badge: "Live", bc: "live", theme: "light", grad: "linear-gradient(135deg,#eef3fb,#e2ecf8)", tags: [["Enterprise", "green"], ["Insurance", "orange"]], mi: "mon", mt: "24 Screens", yr: "2025" },
    { title: "Oolook", cat: "AI Social Media Platform", badge: "Live", bc: "live", theme: "light", grad: "linear-gradient(135deg,#f0ecfb,#e5def7)", tags: [["SaaS", "teal"], ["AI", "purple"]], mi: "mon", mt: "15 Screens", yr: "2025" },
    { title: "Apple Maps (via TG)", cat: "Data Visualization & Maps", badge: "Archive", bc: "archive", theme: "dark", grad: "linear-gradient(135deg,#0f1420,#1b2436)", tags: [["System Design", "green"], ["Maps", "gray"]], mi: "mon", mt: "10 Screens", yr: "2023" },
    { title: "Quotient Hiring", cat: "Recruitment Platform", badge: "Case Study", bc: "case", theme: "light", grad: "linear-gradient(135deg,#eef3fb,#dfe9f7)", tags: [["Enterprise", "green"], ["HR Tech", "blue"]], mi: "mon", mt: "14 Screens", yr: "2025" },
    { title: "Ensylon Design System", cat: "Design System & Components", badge: "System", bc: "system", theme: "dark", grad: "linear-gradient(135deg,#151521,#20202f)", tags: [["Internal", "green"], ["Design System", "gray"]], mi: "stack", mt: "120+ Components", yr: "2025" },
    { featured: true, title: "Company Assignments", cat: "Projects & Tasks at Ensylon", badge: "Featured", bc: "featured", tags: [["Internal", "green"], ["Assignments", "gray"]], mi: "mon", mt: "Various", yr: "Ongoing" },
  ];

  function card(p) {
    const tags = p.tags
      .map((t) => '<span class="pj__tag pj__tag--' + t[1] + '">' + t[0] + "</span>")
      .join("");
    const thumb = p.featured
      ? '<div class="pj__thumb pj__thumb--feat">' +
          '<span class="pj__badge pj__badge--' + p.bc + '">' + p.badge + "</span>" +
          '<div class="pj__feat"><div><div class="pj__feat-name">Ankur<br>Meena</div>' +
          '<div class="pj__feat-role">Product Designer</div>' +
          '<div class="pj__feat-desc">Designing meaningful experiences that solve real problems.</div></div>' +
          '<div class="pj__feat-av">' + AVATAR + "</div></div></div>"
      : '<div class="pj__thumb pj__thumb--' + p.theme + '" style="background:' + p.grad + '">' +
          MOCK(p.theme) +
          '<span class="pj__badge pj__badge--' + p.bc + '">' + p.badge + "</span></div>";
    return (
      '<div class="pj">' + thumb +
        '<div class="pj__body">' +
          '<div class="pj__row">' + MINIFOLDER +
            '<span class="pj__title">' + p.title + "</span>" +
            '<button class="pj__star">' + M.star + "</button></div>" +
          '<div class="pj__cat">' + p.cat + "</div>" +
          '<div class="pj__tags">' + tags + "</div>" +
          '<div class="pj__meta">' +
            '<span class="pj__metaitem">' + M[p.mi] + p.mt + "</span>" +
            '<span class="pj__metaitem">' + M.cal + p.yr + "</span>" +
            '<button class="pj__more">' + M.more + "</button></div>" +
        "</div></div>"
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
    win.innerHTML =
      '<aside class="fw__sidebar">' +
        '<div class="fw__side-top"><div class="winmodal__lights">' +
          '<button class="wl wl--close" aria-label="Close"></button>' +
          '<span class="wl wl--min"></span><span class="wl wl--max"></span>' +
        "</div></div>" +
        '<div class="fw__list">' +
          item(I.recents, "Recents", "fw__item--active") +
          item(I.shared, "Shared") +
          '<div class="fw__section">Portfolio</div>' +
          item(I.grid, "Featured Projects") +
          item(I.briefcase, "Assignments") +
          item(I.robot, "AI Products") +
          item(I.layers, "Design Systems") +
          item(I.phone, "Mobile Apps") +
          item(I.web, "Web Apps") +
        "</aside>" +
      '<section class="fw__main">' +
        '<header class="fw__toolbar">' +
          '<div class="fw__titles"><div class="fw__title">Recents</div>' +
            '<div class="fw__subtitle">8 items, 5 Folders</div></div>' +
          '<button class="nw__circ">' + T.share + "</button>" +
          '<div class="nw__search">' + T.search + "<span>Search</span></div>" +
        "</header>" +
        '<div class="fw__grid fw__grid--projects">' +
          PROJECTS.map(card).join("") +
        "</div>" +
        '<div class="fw__footer">8 items</div>' +
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
    document.addEventListener("keydown", onKey);
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
    "dock__app--acrobat": "Resume",
    "dock__app--mail": "Contact Me",
    "dock__app--linkedin": "LinkedIn",
    "dock__app--behance": "Naukri",
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
