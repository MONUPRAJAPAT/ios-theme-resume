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
    folderAdd: S('<path d="M3 7a2 2 0 0 1 2-2h3.2l1.8 2H15a2 2 0 0 1 2 2v2"/><path d="M19 14v6M16 17h6"/>'),
    sidebar: S('<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><line x1="9.5" y1="4.5" x2="9.5" y2="19.5"/>'),
    folderY: '<svg viewBox="0 0 24 24"><path d="M3 8a2 2 0 0 1 2-2h3.3l1.7 2H19a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="none" stroke="#f4a000" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    folderD: '<svg viewBox="0 0 24 24"><path d="M3 8a2 2 0 0 1 2-2h3.3l1.7 2H19a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="none" stroke="#1e1e1e" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    chevron: S('<path d="M15 5l-6 7 6 7"/>'),
    compose: S('<path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"/><path d="M18.4 3.6a2 2 0 0 1 2.8 2.8L12 15.6 8 17l1.4-4z"/>'),
    checklist: S('<path d="M3.5 7l1.5 1.5L8 5.5"/><line x1="11" y1="7" x2="20.5" y2="7"/><path d="M3.5 15l1.5 1.5L8 13.5"/><line x1="11" y1="15" x2="20.5" y2="15"/>'),
    table: S('<rect x="3.5" y="5" width="17" height="14" rx="2"/><line x1="3.5" y1="10.5" x2="20.5" y2="10.5"/><line x1="3.5" y1="15" x2="20.5" y2="15"/><line x1="9.5" y1="5" x2="9.5" y2="19"/><line x1="15" y1="5" x2="15" y2="19"/>'),
    attach: S('<path d="M20 11l-8.4 8.4a4 4 0 0 1-5.7-5.7L14.2 5.4a2.6 2.6 0 0 1 3.7 3.7L9.5 17.5a1.3 1.3 0 0 1-1.9-1.9L15 8.2"/>'),
    markup: S('<path d="M15 4.5l4.5 4.5L8 20.5l-4.5 1 1-4.5z"/><line x1="13.5" y1="6" x2="18" y2="10.5"/>'),
    share: S('<path d="M12 3.5v11"/><path d="M8 7l4-4 4 4"/><path d="M6 12v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7"/>'),
    more: S('<circle cx="6" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="18" cy="12" r="1.7"/>'),
    search: S('<circle cx="10" cy="10" r="6"/><line x1="14.5" y1="14.5" x2="20" y2="20"/>'),
  };

  function open() {
    const sRect = screen.getBoundingClientRect();
    const w = widget.getBoundingClientRect();
    const ox = w.left + w.width / 2 - sRect.left;
    const oy = w.top + w.height / 2 - sRect.top;

    const modal = document.createElement("div");
    modal.className = "winmodal";
    const backdrop = document.createElement("div");
    backdrop.className = "winmodal__backdrop";
    const win = document.createElement("div");
    win.className = "noteswin";
    win.style.transformOrigin = ox + "px " + oy + "px";
    win.innerHTML =
      '<aside class="nw__sidebar">' +
        '<div class="nw__side-top">' +
          '<div class="nw__lights">' +
            '<button class="wl wl--close" aria-label="Close"></button>' +
            '<span class="wl wl--min"></span><span class="wl wl--max"></span>' +
          "</div>" +
          '<div class="nw__side-actions">' +
            '<button class="nw__ic" aria-label="New Folder">' + ICON.folderAdd + "</button>" +
            '<button class="nw__ic" aria-label="Toggle Sidebar">' + ICON.sidebar + "</button>" +
          "</div>" +
        "</div>" +
        '<div class="nw__section">On My Mac</div>' +
        '<ul class="nw__folders">' +
          '<li class="nw__folder nw__folder--active">' + ICON.folderY + '<span class="nw__fname">All on My Mac</span><span class="nw__count">13</span></li>' +
          '<li class="nw__folder">' + ICON.folderD + '<span class="nw__fname">Notes</span><span class="nw__count">13</span></li>' +
          '<li class="nw__folder">' + ICON.folderD + '<span class="nw__fname">Skills</span><span class="nw__count">0</span></li>' +
        "</ul>" +
        '<div class="nw__section">Tags</div>' +
      "</aside>" +
      '<section class="nw__main">' +
        '<header class="nw__toolbar">' +
          '<button class="nw__back" aria-label="Back">' + ICON.chevron + "</button>" +
          '<div class="nw__title"><div class="nw__title-main">All on My Mac</div><div class="nw__title-sub">13 notes</div></div>' +
          '<div class="nw__tools">' +
            "<button>" + ICON.compose + "</button>" +
            '<button><span class="nw__aa">Aa</span></button>' +
            "<button>" + ICON.checklist + "</button>" +
            "<button>" + ICON.table + "</button>" +
            "<button>" + ICON.attach + "</button>" +
            "<button>" + ICON.markup + "</button>" +
          "</div>" +
          '<div class="nw__tools">' +
            "<button>" + ICON.share + "</button>" +
            '<button class="nw__more">' + ICON.more + "</button>" +
          "</div>" +
          '<div class="nw__search">' + ICON.search + "<span>Search</span></div>" +
        "</header>" +
        '<div class="nw__content"><div class="nw__timestamp">' + stamp() + "</div></div>" +
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
    win.querySelector(".nw__back").addEventListener("click", close);
    document.addEventListener("keydown", onKey);
  }

  widget.style.cursor = "pointer";
  widget.addEventListener("click", open);
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

  // static: show all logos once; they wrap into two rows
  viewport.innerHTML = "";
  LOGOS.forEach((l) => viewport.appendChild(chip(l)));
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
