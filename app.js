'use strict';

const STORAGE_KEY = 'tfcuPriceIsRightState';

const TEAM_DEFAULTS = [
  { name: 'Team 1', color: '#E24B4A', pill: '#F0999A' },
  { name: 'Team 2', color: '#378ADD', pill: '#8FC1F0' },
  { name: 'Team 3', color: '#639922', pill: '#A9D06B' }
];

const SAMPLE_ITEMS = [
  { name: '65" 4K smart TV', price: 649, description: 'Crisp picture, big screen, movie night upgrade.', image: null },
  { name: 'Stainless steel grill', price: 389, description: 'Backyard cookouts just got a lot better.', image: 'assets/sample-images/grill.jpg' },
  { name: 'Espresso machine', price: 799, description: 'Cafe-quality coffee without leaving the kitchen.', image: 'assets/sample-images/espresso-machine.jpg' },
  { name: 'Mountain bike', price: 459, description: 'Trail-ready wheels for weekend adventures.', image: null },
  { name: 'Weekend getaway package', price: 1250, description: 'Two nights away, all the relaxation.', image: 'assets/sample-images/getaway-package.jpg' },
  { name: 'Stand mixer', price: 429, description: 'A baker\'s best friend, in your favorite color.', image: null },
  { name: 'Gaming laptop', price: 1099, description: 'Fast, portable, ready for anything.', image: 'assets/sample-images/gaming-laptop.jpg' },
  { name: 'Patio furniture set', price: 899, description: 'Turn the backyard into a hangout spot.', image: 'assets/sample-images/patio-furniture.jpg' }
];

const SAMPLE_SHOWCASE_ITEMS = [
  [
    { name: 'Leather sofa', price: 899, image: 'assets/sample-images/showcase1-sofa.jpg' },
    { name: 'Wood coffee table', price: 349, image: 'assets/sample-images/showcase1-coffee-table.jpg' },
    { name: '55" smart TV', price: 549, image: null }
  ],
  [
    { name: 'Stainless refrigerator', price: 1499, image: 'assets/sample-images/showcase2-refrigerator.jpg' },
    { name: 'Washing machine', price: 699, image: 'assets/sample-images/showcase2-washer.jpg' },
    { name: 'Built-in dishwasher', price: 549, image: 'assets/sample-images/showcase2-dishwasher.jpg' }
  ]
];

/* ---- Q2 All Hands event preset (real event data, images added manually by organizer) ---- */

const QALLHANDS_ROUND_ITEMS = [
  { name: 'Keurig Coffee Variety Pack', price: 55 },
  { name: 'GE Microwave', price: 135 },
  { name: 'Uline Commercial Stapler', price: 115 },
  { name: 'Flavia Creation 600 Coffee Machine', price: 2150 },
  { name: 'Game Room Arcade Machine', price: 3299 }
];

const QALLHANDS_TIEBREAKER_ITEMS = [
  { name: 'Foosball Table', price: 499 }
];

const QALLHANDS_SHOWCASE_ITEMS = [
  [
    { name: 'Dell Pro 16 Plus Laptop', price: 1345 },
    { name: 'ViewSonic 24 inch Monitor', price: 160 },
    { name: 'Logitech Keyboard and Mouse', price: 65 },
    { name: 'Dell Docking Station', price: 199 },
    { name: 'Noise Canceling Headphones - AirPods Max 2', price: 550 }
  ],
  [
    { name: 'Hexy SitOnIt Office Chair', price: 265 },
    { name: 'Standing Desk', price: 860 },
    { name: 'Uline Water Cooler', price: 360 },
    { name: 'Mini Fridge', price: 395 },
    { name: 'Walking Pad Treadmill', price: 170 }
  ]
];

function defaultShowcaseState() {
  return {
    teamIndices: [],
    firstPickerIdx: null,
    itemCounts: [3, 3],
    items: [[], []],
    currentPos: 0,
    guesses: {},
    revealed: {},
    busted: {},
    winnerSlot: null
  };
}

function defaultState() {
  return {
    stage: 'setup1',
    teams: TEAM_DEFAULTS.map(t => ({ name: t.name, color: t.color, pill: t.pill, score: 0 })),
    roundCount: 5,
    rounds: [],
    tiebreakerQueue: [],
    currentRoundIndex: 0,
    isTiebreaker: false,
    tiebreakerEligibleTeamIndices: [],
    tiebreakerQueueIndex: 0,
    activeTiebreakerItem: null,
    guesses: [null, null, null],
    revealed: false,
    revealPhase: 'idle',
    lastRoundPoints: [null, null, null],
    lastRoundDiff: [null, null, null],
    lastRoundClosestIndices: [],
    timerSecondsLeft: null,
    timerRunning: false,
    muted: false,
    showcase: defaultShowcaseState(),
    showcaseSetupOrigin: 'celebration'
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return Object.assign(defaultState(), parsed);
  } catch (e) {
    return defaultState();
  }
}

let state = loadState();

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setState(patch) {
  Object.assign(state, patch);
  save();
  render();
}

function money(n) {
  if (n === null || n === undefined || isNaN(n)) return '';
  return '$' + Number(n).toLocaleString('en-US');
}

function ensureRoundRows() {
  const count = state.roundCount;
  const rows = state.rounds.slice(0, count);
  while (rows.length < count) {
    rows.push({ name: '', price: '', description: '', image: null, timeLimit: 60 });
  }
  state.rounds = rows;
}

function fallbackIconSvg(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="8" width="18" height="12" rx="1.5" stroke="currentColor" stroke-width="1.6"/>
    <path d="M3 8l9-4 9 4" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M12 4v16M3 8h18" stroke="currentColor" stroke-width="1.6"/>
  </svg>`;
}

/* ---------------- Audio (synthesized, no external assets) ---------------- */

let audioCtx = null;

function getAudioContext() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(freq, startTime, duration, type, gainPeak) {
  if (state.muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  const t0 = ctx.currentTime + startTime;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(gainPeak || 0.2, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

function playTick() {
  playTone(660, 0, 0.12, 'square', 0.12);
}

/* ---------------- Round/game winner sound effects (local audio files) ---------------- */

const ROUND_WINNER_SOUND_SRC = 'assets/audio/dingding.mp3';
const GAME_WINNER_SOUND_SRC = 'assets/audio/winner-sound.mp3';
const FAILURE_SOUND_SRC = 'assets/audio/failure_sound.mp3';

let roundWinnerSoundEl = null;
let gameWinnerSoundEl = null;
let failureSoundEl = null;

function playRoundWinnerSound() {
  if (state.muted) return;
  if (!roundWinnerSoundEl) {
    roundWinnerSoundEl = new Audio(ROUND_WINNER_SOUND_SRC);
    roundWinnerSoundEl.volume = 0.6;
  }
  roundWinnerSoundEl.currentTime = 0;
  roundWinnerSoundEl.play().catch(() => {});
}

function playGameWinnerSound() {
  if (state.muted) return;
  if (!gameWinnerSoundEl) {
    gameWinnerSoundEl = new Audio(GAME_WINNER_SOUND_SRC);
    gameWinnerSoundEl.volume = 0.7;
    gameWinnerSoundEl.addEventListener('ended', () => {
      if (state.stage === 'celebration' || state.stage === 'showcasePlay' || state.stage === 'showcaseResults') startMusic();
    });
  }
  gameWinnerSoundEl.currentTime = 0;
  gameWinnerSoundEl.play().catch(() => {});
}

function playFailureSound() {
  if (state.muted) return;
  if (!failureSoundEl) {
    failureSoundEl = new Audio(FAILURE_SOUND_SRC);
    failureSoundEl.volume = 0.6;
    failureSoundEl.addEventListener('ended', () => {
      if (state.stage === 'showcasePlay') startMusic();
    });
  }
  failureSoundEl.currentTime = 0;
  failureSoundEl.play().catch(() => {});
}

/* ---------------- Background music (local audio file) ---------------- */

const BG_MUSIC_SRC = 'assets/audio/background-music.mp3';
const BG_MUSIC_VOLUME = 0.35;

let bgMusicEl = null;

function getBgMusicEl() {
  if (!bgMusicEl) {
    bgMusicEl = new Audio(BG_MUSIC_SRC);
    bgMusicEl.loop = true;
    bgMusicEl.volume = BG_MUSIC_VOLUME;
    bgMusicEl.muted = state.muted;
  }
  return bgMusicEl;
}

function startMusic() {
  const el = getBgMusicEl();
  el.muted = state.muted;
  if (!el.paused) return;
  el.play().catch(() => {});
}

function stopMusic() {
  if (!bgMusicEl) return;
  bgMusicEl.pause();
}

function setMuted(muted) {
  state.muted = muted;
  save();
  if (bgMusicEl) bgMusicEl.muted = muted;
}

/* ---------------- Round timer ---------------- */

let timerIntervalId = null;

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function clearRoundTimer() {
  if (timerIntervalId) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
  state.timerRunning = false;
}

function initTimerForCurrentItem() {
  clearRoundTimer();
  const item = getCurrentItem();
  const limit = item && item.timeLimit ? Number(item.timeLimit) : 0;
  state.timerSecondsLeft = limit > 0 ? limit : null;
}

function startTimer() {
  if (timerIntervalId || !state.timerSecondsLeft) return;
  state.timerRunning = true;
  save();
  const btn = document.getElementById('timer-toggle-btn');
  if (btn) btn.textContent = 'Pause';
  const wrap = document.getElementById('timer-wrap');
  if (wrap) wrap.classList.remove('time-up');
  timerIntervalId = setInterval(() => {
    if (state.timerSecondsLeft <= 0) return;
    state.timerSecondsLeft -= 1;
    const valueEl = document.getElementById('timer-value');
    if (valueEl) valueEl.textContent = formatTime(state.timerSecondsLeft);
    if (state.timerSecondsLeft <= 3 && state.timerSecondsLeft > 0) playTick();
    if (state.timerSecondsLeft === 0) {
      clearInterval(timerIntervalId);
      timerIntervalId = null;
      state.timerRunning = false;
      save();
      const wrapEl = document.getElementById('timer-wrap');
      if (wrapEl) wrapEl.classList.add('time-up');
      const toggleBtn = document.getElementById('timer-toggle-btn');
      if (toggleBtn) toggleBtn.textContent = 'Start timer';
    } else {
      save();
    }
  }, 1000);
}

function pauseTimer() {
  clearRoundTimer();
  save();
  const btn = document.getElementById('timer-toggle-btn');
  if (btn) btn.textContent = 'Resume';
}

/* ---------------- Rendering ---------------- */

function render() {
  const app = document.getElementById('app');
  switch (state.stage) {
    case 'setup1': app.innerHTML = renderSetup1(); bindSetup1(); break;
    case 'setup2': app.innerHTML = renderSetup2(); bindSetup2(); break;
    case 'ready': app.innerHTML = renderReady(); bindReady(); break;
    case 'game': app.innerHTML = renderGame(); bindGame(); break;
    case 'celebration': app.innerHTML = renderCelebration(); bindCelebration(); break;
    case 'showcaseSetup': app.innerHTML = renderShowcaseSetup(); bindShowcaseSetup(); break;
    case 'showcaseChooseTeams': app.innerHTML = renderShowcaseChooseTeams(); bindShowcaseChooseTeams(); break;
    case 'showcaseChoosePrize': app.innerHTML = renderShowcaseChoosePrize(); bindShowcaseChoosePrize(); break;
    case 'showcaseReady': app.innerHTML = renderShowcaseReady(); bindShowcaseReady(); break;
    case 'showcasePlay': app.innerHTML = renderShowcasePlay(); bindShowcasePlay(); break;
    case 'showcaseResults': app.innerHTML = renderShowcaseResults(); bindShowcaseResults(); break;
  }
  const musicShouldPlay = (state.stage === 'game' && state.revealPhase !== 'suspense' && state.revealPhase !== 'winner')
    || (state.stage === 'showcasePlay' && !state.showcase.revealed[state.showcase.currentPos]);
  if (musicShouldPlay) {
    startMusic();
  } else {
    stopMusic();
  }
  if (state.stage !== 'setup2') {
    app.insertAdjacentHTML('beforeend', footerHtml());
    bindFooter();
  }
}

function footerHtml() {
  return `
    <div class="app-footer">
      <button class="btn btn-reset-game" id="reset-game-btn">Reset game</button>
    </div>
  `;
}

function bindFooter() {
  const btn = document.getElementById('reset-game-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      if (confirm('Reset the entire game? This erases all teams, items, scores, and progress and cannot be undone.')) {
        clearRoundTimer();
        localStorage.removeItem(STORAGE_KEY);
        state = defaultState();
        render();
      }
    });
  }
}

function headerHtml(badgeText) {
  return `
    <div class="app-header">
      <img class="logo" src="assets/teachers-fcu-logo.png" alt="Teachers FCU" />
      <h1>The Price Is Right: Teachers FCU Cash Bash</h1>
      ${badgeText ? `<div class="round-badge">${badgeText}</div>` : ''}
    </div>
  `;
}

/* ---- Stage 1: team & round setup ---- */

function renderSetup1() {
  return `
    ${headerHtml()}
    <div class="card">
      <h2>Set up your teams</h2>
      <div class="field-row" style="display:flex; gap:16px; flex-wrap:wrap;">
        ${state.teams.map((t, i) => `
          <div class="field team-name-field" style="border-color:${t.color}; flex:1; min-width:180px;">
            <label for="team-${i}">Team ${i + 1} name</label>
            <input type="text" id="team-${i}" value="${escapeHtml(t.name)}" placeholder="Team ${i + 1}" />
          </div>
        `).join('')}
      </div>

      <div class="field" style="max-width:240px; margin-top:20px;">
        <label for="round-count">How many rounds?</label>
        <input type="number" id="round-count" min="1" max="20" value="${state.roundCount}" />
        <p class="hint">Tiebreaker rounds are added automatically if the game ends tied.</p>
      </div>

      <div class="btn-row">
        <button class="btn btn-primary" id="next-to-items">Next: add items</button>
      </div>
    </div>
  `;
}

function bindSetup1() {
  document.querySelectorAll('.team-name-field input').forEach((input, i) => {
    input.addEventListener('input', () => {
      state.teams[i].name = input.value;
      save();
    });
  });
  document.getElementById('round-count').addEventListener('input', (e) => {
    let v = parseInt(e.target.value, 10);
    if (isNaN(v)) v = 1;
    v = Math.max(1, Math.min(20, v));
    state.roundCount = v;
    save();
  });
  document.getElementById('next-to-items').addEventListener('click', () => {
    let v = parseInt(document.getElementById('round-count').value, 10);
    if (isNaN(v)) v = 5;
    v = Math.max(1, Math.min(20, v));
    state.roundCount = v;
    ensureRoundRows();
    setState({ stage: 'setup2' });
  });
}

/* ---- Stage 2: preload items ---- */

function renderItemRow(item, idx, isTiebreaker) {
  const prefix = isTiebreaker ? 'tb' : 'rd';
  const thumb = item.image
    ? `<img class="thumb-preview" src="${item.image}" alt="preview" />`
    : `<div class="thumb-placeholder">${fallbackIconSvg(28)}</div>`;
  return `
    <div class="item-row">
      <div class="row-label">${isTiebreaker ? 'Tiebreaker ' + (idx + 1) : 'Round ' + (idx + 1)}</div>
      <div class="field" style="margin-bottom:0;">
        <label>Item name</label>
        <input type="text" data-role="name" data-prefix="${prefix}" data-idx="${idx}" value="${escapeHtml(item.name)}" placeholder="e.g. Espresso machine" />
        <label style="margin-top:10px;">Short description</label>
        <input type="text" data-role="description" data-prefix="${prefix}" data-idx="${idx}" value="${escapeHtml(item.description)}" placeholder="One line description" />
      </div>
      <div class="field" style="margin-bottom:0;">
        <label>Price ($)</label>
        <input type="number" min="0" data-role="price" data-prefix="${prefix}" data-idx="${idx}" value="${item.price === '' || item.price === null || item.price === undefined ? '' : item.price}" placeholder="0" />
      </div>
      <div class="field" style="margin-bottom:0;">
        <label>Timer (sec)</label>
        <input type="number" min="0" data-role="timeLimit" data-prefix="${prefix}" data-idx="${idx}" value="${item.timeLimit === '' || item.timeLimit === null || item.timeLimit === undefined ? '' : item.timeLimit}" placeholder="60" />
      </div>
      <div class="thumb-wrap">
        <label>Image</label>
        ${thumb}
        <input type="file" accept="image/*" data-role="image" data-prefix="${prefix}" data-idx="${idx}" />
      </div>
    </div>
  `;
}

function renderSetup2() {
  ensureRoundRows();
  return `
    ${headerHtml()}
    <div class="card">
      <h2>Preload items</h2>
      <p class="hint">One item per round. Add a name, price, short description, optional photo, and a guess timer (in seconds). Leave the timer blank or 0 for no time limit. On game day, you'll just press "Start timer" to run the preset time for that round.</p>
      <div class="btn-row" style="margin-top:0; margin-bottom:10px;">
        <button class="btn btn-secondary" id="fill-sample">Fill with sample items</button>
        <button class="btn btn-secondary" id="load-qallhands">Load Q2 All Hands items</button>
      </div>
      ${state.rounds.map((r, i) => renderItemRow(r, i, false)).join('')}
    </div>

    <div class="card">
      <h2>Tiebreaker items</h2>
      <p class="hint">Used only if the game ends in a tie. If you run out, a small placeholder prize will be improvised automatically.</p>
      ${state.tiebreakerQueue.map((r, i) => renderItemRow(r, i, true)).join('')}
      <div class="btn-row" style="margin-top:16px;">
        <button class="btn btn-secondary" id="add-tiebreaker">Add another tiebreaker item</button>
      </div>
    </div>

    <div class="btn-row">
      <button class="btn btn-secondary" id="back-to-teams">Back</button>
      <button class="btn btn-primary" id="finish-setup">Finish setup</button>
      <button class="btn btn-secondary" id="reset-everything" style="margin-left:auto;">Reset everything</button>
    </div>
  `;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function bindSetup2() {
  if (state.tiebreakerQueue.length === 0) {
    state.tiebreakerQueue.push({ name: '', price: '', description: '', image: null, timeLimit: 45 });
    save();
  }

  function targetArray(prefix) {
    return prefix === 'tb' ? state.tiebreakerQueue : state.rounds;
  }

  document.querySelectorAll('[data-role="name"], [data-role="description"], [data-role="price"], [data-role="timeLimit"]').forEach(input => {
    input.addEventListener('input', () => {
      const arr = targetArray(input.dataset.prefix);
      const idx = parseInt(input.dataset.idx, 10);
      const role = input.dataset.role;
      if (role === 'price' || role === 'timeLimit') {
        arr[idx][role] = input.value === '' ? '' : Number(input.value);
      } else {
        arr[idx][role] = input.value;
      }
      save();
    });
  });

  document.querySelectorAll('[data-role="image"]').forEach(input => {
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const dataUrl = await fileToDataUrl(file);
      const arr = targetArray(input.dataset.prefix);
      const idx = parseInt(input.dataset.idx, 10);
      arr[idx].image = dataUrl;
      save();
      render();
    });
  });

  document.getElementById('fill-sample').addEventListener('click', () => {
    state.rounds = state.rounds.map((r, i) => {
      const sample = SAMPLE_ITEMS[i % SAMPLE_ITEMS.length];
      return { name: sample.name, price: sample.price, description: sample.description, image: r.image || sample.image || null, timeLimit: r.timeLimit || 60 };
    });
    save();
    render();
  });

  document.getElementById('load-qallhands').addEventListener('click', () => {
    if (!confirm('Load the Q2 All Hands event items? This sets round count to 5 and replaces the current round and tiebreaker items with the event\'s real items and prices (images are not included — add those separately).')) {
      return;
    }
    state.roundCount = 5;
    ensureRoundRows();
    state.rounds = state.rounds.map((r, i) => {
      const item = QALLHANDS_ROUND_ITEMS[i];
      return { name: item.name, price: item.price, description: r.description || '', image: r.image || null, timeLimit: 30 };
    });
    state.tiebreakerQueue = QALLHANDS_TIEBREAKER_ITEMS.map((item, i) => {
      const existing = state.tiebreakerQueue[i];
      return { name: item.name, price: item.price, description: (existing && existing.description) || '', image: (existing && existing.image) || null, timeLimit: 30 };
    });
    save();
    render();
  });

  document.getElementById('add-tiebreaker').addEventListener('click', () => {
    state.tiebreakerQueue.push({ name: '', price: '', description: '', image: null, timeLimit: 45 });
    save();
    render();
  });

  document.getElementById('back-to-teams').addEventListener('click', () => {
    setState({ stage: 'setup1' });
  });

  document.getElementById('finish-setup').addEventListener('click', () => {
    setState({ stage: 'ready' });
  });

  document.getElementById('reset-everything').addEventListener('click', () => {
    if (confirm('Reset all teams, rounds, and items? This cannot be undone.')) {
      localStorage.removeItem(STORAGE_KEY);
      state = defaultState();
      render();
    }
  });
}

/* ---- Stage 3: ready to play ---- */

function renderReady() {
  const tbCount = state.tiebreakerQueue.filter(i => i.name && i.price !== '' && i.price !== null).length;
  return `
    ${headerHtml()}
    <div class="card">
      <h2>Setup complete!</h2>
      <p class="hint">You're ready to play. This is where you'll land any time you reopen the game before it starts.</p>

      <p><strong>${state.roundCount}</strong> round${state.roundCount === 1 ? '' : 's'} loaded.</p>

      <div class="team-list">
        ${state.teams.map(t => `
          <div class="team-row">
            <span class="dot" style="background:${t.color};"></span>
            <span>${escapeHtml(t.name)}</span>
          </div>
        `).join('')}
      </div>

      <div class="scoring-recap">
        <strong>How it's scored</strong>
        <ul>
          <li>Closest guess at or under the price earns 3 points.</li>
          <li>Second-closest eligible guess earns 2 points.</li>
          <li>Everyone else who guessed (including anyone over the price) earns 1 point.</li>
          <li>No guess submitted earns 0 points.</li>
          <li>Ties at the same guess value share the full points for that spot.</li>
        </ul>
      </div>

      <p class="hint" style="margin-top:16px;">
        ${tbCount > 0
          ? `${tbCount} tiebreaker item${tbCount === 1 ? '' : 's'} preloaded, ready if the game ends tied.`
          : `No tiebreaker items preloaded — a placeholder prize will be improvised automatically if needed.`}
      </p>

      <p class="hint">
        ${showcaseHasAnyItems()
          ? `Showcase round items are ready — after the regular rounds, you'll pick which two teams play them.`
          : `Showcase round not set up yet (optional) — you can add it now, or later from the champion screen.`}
      </p>

      <div class="btn-row">
        <button class="btn btn-secondary" id="edit-setup">Edit setup</button>
        <button class="btn btn-secondary" id="setup-showcase-btn">${showcaseHasAnyItems() ? 'Edit showcase items' : 'Set up showcase round'}</button>
        <button class="btn btn-primary" id="start-game">Start game</button>
      </div>
    </div>
  `;
}

function bindReady() {
  document.getElementById('edit-setup').addEventListener('click', () => {
    setState({ stage: 'setup2' });
  });
  document.getElementById('setup-showcase-btn').addEventListener('click', () => {
    state.showcaseSetupOrigin = 'ready';
    setState({ stage: 'showcaseSetup' });
  });
  document.getElementById('start-game').addEventListener('click', () => {
    state.stage = 'game';
    state.currentRoundIndex = 0;
    state.isTiebreaker = false;
    initTimerForCurrentItem();
    setState({
      guesses: [null, null, null],
      revealed: false,
      revealPhase: 'idle',
      lastRoundPoints: [null, null, null],
      lastRoundDiff: [null, null, null],
      lastRoundClosestIndices: []
    });
  });
}

/* ---- Stage 4: live game ---- */

function getCurrentItem() {
  if (state.isTiebreaker) return state.activeTiebreakerItem;
  return state.rounds[state.currentRoundIndex];
}

function isTeamEligible(i) {
  if (!state.isTiebreaker) return true;
  return state.tiebreakerEligibleTeamIndices.includes(i);
}

function renderTimerSide() {
  if (state.timerSecondsLeft === null || state.timerSecondsLeft === undefined) return '';
  const item = getCurrentItem();
  const running = state.timerRunning;
  const timeUp = !running && state.timerSecondsLeft === 0;
  const isAtFull = state.timerSecondsLeft === Number(item.timeLimit);
  const toggleLabel = running ? 'Pause' : (isAtFull ? 'Start timer' : 'Resume');
  return `
    <div class="timer-side ${timeUp ? 'time-up' : ''}" id="timer-wrap">
      <div class="timer-value" id="timer-value">${formatTime(state.timerSecondsLeft)}</div>
      <div class="timer-side-btns">
        <button class="btn btn-primary" id="timer-toggle-btn">${toggleLabel}</button>
        <button class="btn btn-secondary" id="timer-reset-btn">Reset</button>
      </div>
    </div>
  `;
}

function renderWinnerPopup() {
  const names = state.lastRoundClosestIndices.map(i => state.teams[i].name);
  const colors = state.lastRoundClosestIndices.map(i => state.teams[i].color);
  const accentColor = colors[0] || '#F7A600';
  let title;
  let subtitle;
  if (names.length === 0) {
    title = 'No one nailed it this round';
    subtitle = 'On to the next item!';
  } else if (names.length === 1) {
    title = `${escapeHtml(names[0])} wins the round!`;
    subtitle = 'Closest guess without going over';
  } else {
    title = `${names.map(escapeHtml).join(' & ')} tie for the round!`;
    subtitle = 'Both closest without going over';
  }
  return `
    <div class="winner-popup">
      <div class="winner-popup-card" style="border-color:${accentColor};">
        <div class="winner-popup-emoji">🎉</div>
        <div class="winner-popup-title" style="color:${accentColor};">${title}</div>
        <div class="winner-popup-subtitle">${subtitle}</div>
      </div>
    </div>
  `;
}

function renderRoundConfetti() {
  if (state.lastRoundClosestIndices.length === 0) return '';
  const colors = state.lastRoundClosestIndices.map(i => state.teams[i].color).concat(['#F7A600']);
  let html = '';
  for (let i = 0; i < 3; i++) {
    const left = 35 + Math.random() * 30;
    const delay = Math.random() * 0.3;
    const color = colors[i % colors.length];
    const rotate = Math.random() * 360;
    html += `<div class="round-confetti-piece" style="left:${left}%; background:${color}; animation-delay:${delay}s; transform:rotate(${rotate}deg);"></div>`;
  }
  return html;
}

function renderGame() {
  const item = getCurrentItem();
  const badge = state.isTiebreaker
    ? 'Tiebreaker round'
    : `Round ${state.currentRoundIndex + 1} of ${state.roundCount}`;

  const inSuspense = state.revealPhase === 'suspense';

  const imageHtml = item.image
    ? `<img class="item-image" src="${item.image}" alt="${escapeHtml(item.name)}" />`
    : `<div class="item-fallback">${fallbackIconSvg(56)}</div>`;

  const priceHtml = state.revealed
    ? `<div class="price-display">${money(item.price)}</div>`
    : `<div class="price-hidden">Price hidden</div>`;

  let bannerHtml = '';
  if (state.revealed) {
    const names = state.lastRoundClosestIndices.map(i => escapeHtml(state.teams[i].name));
    let bannerText;
    if (names.length === 0) {
      bannerText = 'No eligible guesses this round.';
    } else if (names.length === 1) {
      bannerText = `${names[0]} was closest this round!`;
    } else {
      bannerText = `${names.join(' & ')} tied for closest this round!`;
    }
    bannerHtml = `<div class="reveal-banner">${bannerText}</div>${renderRoundConfetti()}`;
  }

  const guessCardsHtml = state.teams.map((t, i) => {
    const eligible = isTeamEligible(i);
    const guessVal = state.guesses[i];
    let bodyHtml;
    if (!eligible) {
      bodyHtml = `<span class="sitting-out-label">Sitting out</span>`;
    } else if (!state.revealed) {
      bodyHtml = `
        <label for="guess-${i}">Guess ($)</label>
        <input type="number" min="0" id="guess-${i}" data-idx="${i}" value="${guessVal === null || guessVal === undefined ? '' : guessVal}" placeholder="Enter guess" ${inSuspense ? 'disabled' : ''} />
      `;
    } else {
      const pts = state.lastRoundPoints[i];
      const diff = state.lastRoundDiff[i];
      if (guessVal === null || guessVal === undefined || guessVal === '') {
        bodyHtml = `<div class="guess-result">No guess submitted <div class="pts">0 pts</div></div>`;
      } else {
        const diffLabel = diff === 0 ? 'Exact match!' : (diff > 0 ? `${money(Math.abs(diff))} under` : `${money(Math.abs(diff))} over`);
        bodyHtml = `
          <div class="guess-result">
            Guessed ${money(guessVal)} &mdash; ${diffLabel}
            <div class="pts">${pts} pt${pts === 1 ? '' : 's'}</div>
          </div>
        `;
      }
    }
    return `
      <div class="guess-card ${!eligible ? 'sitting-out' : ''}" style="border-color:${t.color};">
        <h3 style="color:${t.color};">${escapeHtml(t.name)}</h3>
        ${bodyHtml}
      </div>
    `;
  }).join('');

  const nextLabel = computeNextButtonLabel();

  const suspenseHtml = inSuspense
    ? `
      <div class="wheel-overlay">
        <div class="wheel-pointer"></div>
        <div class="wheel-wrap">
          <div class="prize-wheel"></div>
          <img class="wheel-logo" src="assets/teachers-fcu-logo.png" alt="" />
        </div>
        <div class="suspense-text" id="suspense-text">Spinning&hellip;</div>
      </div>
    `
    : '';

  const actionHtml = inSuspense
    ? ''
    : `
      <div class="card">
        <div class="btn-row" style="margin-top:0;">
          ${!state.revealed
            ? `<button class="btn btn-primary" id="reveal-btn">Reveal price</button>`
            : `<button class="btn btn-primary" id="next-round-btn">${nextLabel}</button>`}
        </div>
      </div>
    `;

  return `
    ${headerHtml(badge)}
    <div class="card item-card">
      ${imageHtml}
      <div class="item-info">
        <h2>${escapeHtml(item.name) || 'Untitled item'}</h2>
        <p>${escapeHtml(item.description) || ''}</p>
        ${priceHtml}
      </div>
      ${!state.revealed && !inSuspense ? renderTimerSide() : ''}
    </div>

    ${bannerHtml}

    <div class="guess-grid">${guessCardsHtml}</div>

    ${actionHtml}

    ${suspenseHtml}

    ${state.revealPhase === 'winner' ? renderWinnerPopup() : ''}

    <div class="card">
      <div class="scoreboard">
        ${state.teams.map(t => `
          <div class="scoreboard-pill" style="background:${t.pill};">
            ${escapeHtml(t.name)}: ${t.score}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function computeNextButtonLabel() {
  if (!state.revealed) return 'Next round';
  const isFinalRegularRound = !state.isTiebreaker && state.currentRoundIndex >= state.roundCount - 1;
  if (isFinalRegularRound) {
    return overallTie() ? 'Break the tie' : 'See final results';
  }
  if (state.isTiebreaker) {
    return tiebreakerStillTied() ? 'Break the tie' : 'See final results';
  }
  return 'Next round';
}

function overallTie() {
  const max = Math.max(...state.teams.map(t => t.score));
  return state.teams.filter(t => t.score === max).length > 1;
}

function tiebreakerStillTied() {
  const scores = state.tiebreakerEligibleTeamIndices.map(i => state.teams[i].score);
  const max = Math.max(...scores);
  return scores.filter(s => s === max).length > 1;
}

function bindGame() {
  if (state.revealPhase === 'suspense') return;

  if (!state.revealed) {
    document.querySelectorAll('.guess-card input[type="number"]').forEach(input => {
      input.addEventListener('input', () => {
        const i = parseInt(input.dataset.idx, 10);
        state.guesses[i] = input.value === '' ? null : Number(input.value);
        save();
      });
    });
    const revealBtn = document.getElementById('reveal-btn');
    if (revealBtn) revealBtn.addEventListener('click', startReveal);

    const timerToggleBtn = document.getElementById('timer-toggle-btn');
    if (timerToggleBtn) {
      timerToggleBtn.addEventListener('click', () => {
        if (state.timerRunning) pauseTimer();
        else startTimer();
      });
    }
    const timerResetBtn = document.getElementById('timer-reset-btn');
    if (timerResetBtn) {
      timerResetBtn.addEventListener('click', () => {
        initTimerForCurrentItem();
        render();
      });
    }
  } else {
    const nextBtn = document.getElementById('next-round-btn');
    if (nextBtn) nextBtn.addEventListener('click', advanceRound);
  }
}

function startReveal() {
  clearRoundTimer();
  getAudioContext();
  setState({ revealPhase: 'suspense' });
  let count = 3;
  const tick = () => {
    const el = document.getElementById('suspense-text');
    if (!el) return;
    if (count > 0) {
      el.textContent = String(count);
      playTick();
      count -= 1;
      setTimeout(tick, 700);
    } else {
      el.textContent = 'And the price is...';
      setTimeout(() => {
        doReveal();
      }, 900);
    }
  };
  setTimeout(tick, 1300);
}

function doReveal() {
  const item = getCurrentItem();
  const price = Number(item.price) || 0;

  const eligibleIndices = state.teams.map((_, i) => i).filter(isTeamEligible);

  const submitted = eligibleIndices
    .filter(i => state.guesses[i] !== null && state.guesses[i] !== undefined && state.guesses[i] !== '')
    .map(i => ({ i, guess: Number(state.guesses[i]) }));

  const underOrEqual = submitted.filter(g => g.guess <= price).sort((a, b) => b.guess - a.guess);
  const over = submitted.filter(g => g.guess > price);

  const distinctValues = [];
  underOrEqual.forEach(g => {
    if (!distinctValues.includes(g.guess)) distinctValues.push(g.guess);
  });

  const pointsByTeam = {};
  const diffByTeam = {};

  submitted.forEach(g => { diffByTeam[g.i] = price - g.guess; });

  distinctValues.forEach((val, rank) => {
    const pts = rank === 0 ? 3 : rank === 1 ? 2 : 1;
    underOrEqual.filter(g => g.guess === val).forEach(g => { pointsByTeam[g.i] = pts; });
  });
  over.forEach(g => { pointsByTeam[g.i] = 1; });

  const lastRoundPoints = [null, null, null];
  const lastRoundDiff = [null, null, null];
  eligibleIndices.forEach(i => {
    const wasSubmitted = state.guesses[i] !== null && state.guesses[i] !== undefined && state.guesses[i] !== '';
    lastRoundPoints[i] = wasSubmitted ? (pointsByTeam[i] !== undefined ? pointsByTeam[i] : 1) : 0;
    lastRoundDiff[i] = wasSubmitted ? diffByTeam[i] : null;
    state.teams[i].score += lastRoundPoints[i];
  });

  const closestIndices = distinctValues.length > 0
    ? underOrEqual.filter(g => g.guess === distinctValues[0]).map(g => g.i)
    : [];

  playRoundWinnerSound();
  setState({
    revealed: true,
    revealPhase: 'winner',
    lastRoundPoints,
    lastRoundDiff,
    lastRoundClosestIndices: closestIndices
  });
  setTimeout(() => {
    if (state.stage === 'game' && state.revealPhase === 'winner') setState({ revealPhase: 'idle' });
  }, 2200);
}

function pullTiebreakerItem() {
  if (state.tiebreakerQueueIndex < state.tiebreakerQueue.length) {
    const item = state.tiebreakerQueue[state.tiebreakerQueueIndex];
    state.tiebreakerQueueIndex += 1;
    if (item.name && item.price !== '' && item.price !== null) {
      return { name: item.name, price: Number(item.price), description: item.description, image: item.image };
    }
  }
  const randomPrice = Math.floor(Math.random() * (700 - 200 + 1)) + 200;
  return {
    name: 'Sudden death tiebreaker',
    price: randomPrice,
    description: 'A surprise prize to settle the tie once and for all.',
    image: null
  };
}

function advanceRound() {
  clearRoundTimer();

  if (state.isTiebreaker) {
    if (tiebreakerStillTied()) {
      state.activeTiebreakerItem = pullTiebreakerItem();
      initTimerForCurrentItem();
      setState({
        guesses: [null, null, null],
        revealed: false,
        revealPhase: 'idle',
        lastRoundPoints: [null, null, null],
        lastRoundDiff: [null, null, null],
        lastRoundClosestIndices: []
      });
    } else {
      playGameWinnerSound();
      setState({ stage: 'celebration' });
    }
    return;
  }

  const isFinalRegularRound = state.currentRoundIndex >= state.roundCount - 1;
  if (!isFinalRegularRound) {
    state.currentRoundIndex += 1;
    initTimerForCurrentItem();
    setState({
      guesses: [null, null, null],
      revealed: false,
      revealPhase: 'idle',
      lastRoundPoints: [null, null, null],
      lastRoundDiff: [null, null, null],
      lastRoundClosestIndices: []
    });
    return;
  }

  if (overallTie()) {
    const max = Math.max(...state.teams.map(t => t.score));
    const tiedIndices = state.teams.map((t, i) => i).filter(i => state.teams[i].score === max);
    state.isTiebreaker = true;
    state.tiebreakerEligibleTeamIndices = tiedIndices;
    state.activeTiebreakerItem = pullTiebreakerItem();
    initTimerForCurrentItem();
    setState({
      guesses: [null, null, null],
      revealed: false,
      revealPhase: 'idle',
      lastRoundPoints: [null, null, null],
      lastRoundDiff: [null, null, null],
      lastRoundClosestIndices: []
    });
  } else {
    playGameWinnerSound();
    setState({ stage: 'celebration' });
  }
}

/* ---- Stage 5: celebration ---- */

function renderCelebration() {
  const max = Math.max(...state.teams.map(t => t.score));
  const champion = state.teams.find(t => t.score === max);

  const confettiColors = ['#F7A600', '#FFFFFF', '#E24B4A', '#378ADD', '#639922'];
  let confettiHtml = '';
  for (let i = 0; i < 50; i++) {
    const left = Math.random() * 100;
    const delay = Math.random() * 3;
    const duration = 2.5 + Math.random() * 2.5;
    const color = confettiColors[i % confettiColors.length];
    const rotate = Math.random() * 360;
    confettiHtml += `<div class="confetti-piece" style="left:${left}%; background:${color}; animation-delay:${delay}s; animation-duration:${duration}s; transform:rotate(${rotate}deg);"></div>`;
  }

  let fireworksHtml = '';
  const fwPositions = [{ x: 20, y: 30 }, { x: 75, y: 25 }, { x: 50, y: 45 }];
  fwPositions.forEach((pos, i) => {
    const color = confettiColors[i % confettiColors.length];
    fireworksHtml += `<div class="firework" style="left:${pos.x}%; top:${pos.y}%; background:${color}; animation-delay:${i * 0.5}s;"></div>`;
  });

  return `
    ${headerHtml()}
    <div class="celebration">
      ${confettiHtml}
      ${fireworksHtml}
      <div class="celebration-content">
        <div class="trophy">🏆</div>
        <p class="champion-name">${escapeHtml(champion.name)}</p>
        <p class="champion-score">${champion.score} points &mdash; Champion!</p>
      </div>
    </div>

    <div class="card">
      <div class="scoreboard">
        ${state.teams.map(t => `
          <div class="scoreboard-pill" style="background:${t.pill};">
            ${escapeHtml(t.name)}: ${t.score}
          </div>
        `).join('')}
      </div>
    </div>

    <div class="btn-row">
      <button class="btn btn-secondary" id="start-showcase-btn">Start showcase round</button>
      <button class="btn btn-primary" id="play-again">Play again</button>
    </div>
  `;
}

function bindCelebration() {
  document.getElementById('start-showcase-btn').addEventListener('click', () => {
    if (showcaseHasAnyItems()) {
      state.showcase.teamIndices = [];
      setState({ stage: 'showcaseChooseTeams' });
    } else {
      state.showcaseSetupOrigin = 'celebration';
      setState({ stage: 'showcaseSetup' });
    }
  });
  document.getElementById('play-again').addEventListener('click', () => {
    clearRoundTimer();
    state.teams.forEach(t => { t.score = 0; });
    state.showcase.currentPos = 0;
    state.showcase.guesses = {};
    state.showcase.revealed = {};
    state.showcase.busted = {};
    state.showcase.winnerSlot = null;
    setState({
      stage: 'ready',
      currentRoundIndex: 0,
      isTiebreaker: false,
      tiebreakerEligibleTeamIndices: [],
      tiebreakerQueueIndex: 0,
      activeTiebreakerItem: null,
      guesses: [null, null, null],
      revealed: false,
      revealPhase: 'idle',
      lastRoundPoints: [null, null, null],
      lastRoundDiff: [null, null, null],
      lastRoundClosestIndices: [],
      timerSecondsLeft: null,
      timerRunning: false
    });
  });
}

/* ---- Showcase round: build the two showcases (pre-game) ---- */

function ensureShowcaseItemRows(slot) {
  const count = state.showcase.itemCounts[slot] || 3;
  const existing = state.showcase.items[slot] || [];
  const rows = existing.slice(0, count);
  while (rows.length < count) rows.push({ name: '', price: '', image: null });
  state.showcase.items[slot] = rows;
  state.showcase.itemCounts[slot] = count;
}

function showcaseHasAnyItems() {
  return [0, 1].some(slot => (state.showcase.items[slot] || []).some(it => it.name));
}

function renderShowcaseItemRow(slot, item, idx) {
  const thumb = item.image
    ? `<img class="thumb-preview" src="${item.image}" alt="preview" />`
    : `<div class="thumb-placeholder">${fallbackIconSvg(28)}</div>`;
  return `
    <div class="item-row showcase-item-row">
      <div class="row-label">Item ${idx + 1}</div>
      <div class="field" style="margin-bottom:0;">
        <label>Item name</label>
        <input type="text" data-role="scname" data-slot="${slot}" data-idx="${idx}" value="${escapeHtml(item.name)}" placeholder="e.g. Living room set" />
      </div>
      <div class="field" style="margin-bottom:0;">
        <label>Price ($)</label>
        <input type="number" min="0" data-role="scprice" data-slot="${slot}" data-idx="${idx}" value="${item.price === '' || item.price === null || item.price === undefined ? '' : item.price}" placeholder="0" />
      </div>
      <div class="thumb-wrap">
        <label>Image</label>
        ${thumb}
        <input type="file" accept="image/*" data-role="scimage" data-slot="${slot}" data-idx="${idx}" />
      </div>
    </div>
  `;
}

function renderShowcaseSetup() {
  ensureShowcaseItemRows(0);
  ensureShowcaseItemRows(1);
  return `
    ${headerHtml()}
    <div class="card">
      <h2>Showcase round setup</h2>
      <p class="hint">Build two showcases now. After the regular rounds finish, you'll pick which two teams play them — you don't need to know that yet.</p>
      <div class="btn-row" style="margin-top:0;">
        <button class="btn btn-secondary" id="fill-showcase-sample">Fill with sample items</button>
        <button class="btn btn-secondary" id="load-qallhands-showcase">Load Q2 All Hands items</button>
      </div>
    </div>
    ${[0, 1].map(slot => `
      <div class="card">
        <h2>Showcase ${slot + 1}</h2>
        <div class="field" style="max-width:220px;">
          <label>Number of items</label>
          <select data-slot="${slot}" class="showcase-count-select">
            ${[2, 3, 4, 5].map(n => `<option value="${n}" ${state.showcase.itemCounts[slot] === n ? 'selected' : ''}>${n} items</option>`).join('')}
          </select>
        </div>
        ${state.showcase.items[slot].map((item, i) => renderShowcaseItemRow(slot, item, i)).join('')}
      </div>
    `).join('')}
    <div class="btn-row">
      <button class="btn btn-secondary" id="cancel-showcase-setup">Back</button>
      <button class="btn btn-primary" id="finish-showcase-setup">Finish showcase setup</button>
    </div>
  `;
}

function bindShowcaseSetup() {
  document.querySelectorAll('.showcase-count-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const slot = parseInt(sel.dataset.slot, 10);
      state.showcase.itemCounts[slot] = parseInt(sel.value, 10);
      ensureShowcaseItemRows(slot);
      save();
      render();
    });
  });

  document.querySelectorAll('[data-role="scname"], [data-role="scprice"]').forEach(input => {
    input.addEventListener('input', () => {
      const slot = parseInt(input.dataset.slot, 10);
      const idx = parseInt(input.dataset.idx, 10);
      if (input.dataset.role === 'scprice') {
        state.showcase.items[slot][idx].price = input.value === '' ? '' : Number(input.value);
      } else {
        state.showcase.items[slot][idx].name = input.value;
      }
      save();
    });
  });

  document.querySelectorAll('[data-role="scimage"]').forEach(input => {
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const dataUrl = await fileToDataUrl(file);
      const slot = parseInt(input.dataset.slot, 10);
      const idx = parseInt(input.dataset.idx, 10);
      state.showcase.items[slot][idx].image = dataUrl;
      save();
      render();
    });
  });

  document.getElementById('fill-showcase-sample').addEventListener('click', () => {
    [0, 1].forEach(slot => {
      const samples = SAMPLE_SHOWCASE_ITEMS[slot];
      state.showcase.itemCounts[slot] = samples.length;
      state.showcase.items[slot] = samples.map((s, i) => {
        const existing = (state.showcase.items[slot] || [])[i];
        return {
          name: s.name,
          price: s.price,
          image: (existing && existing.image) || s.image || null
        };
      });
    });
    save();
    render();
  });

  document.getElementById('load-qallhands-showcase').addEventListener('click', () => {
    if (!confirm('Load the Q2 All Hands showcase items? This replaces both showcases with the event\'s real items and prices (images are not included — add those separately).')) {
      return;
    }
    [0, 1].forEach(slot => {
      const items = QALLHANDS_SHOWCASE_ITEMS[slot];
      state.showcase.itemCounts[slot] = items.length;
      state.showcase.items[slot] = items.map((it, i) => {
        const existing = (state.showcase.items[slot] || [])[i];
        return {
          name: it.name,
          price: it.price,
          image: (existing && existing.image) || null
        };
      });
    });
    save();
    render();
  });

  document.getElementById('cancel-showcase-setup').addEventListener('click', () => {
    setState({ stage: state.showcaseSetupOrigin === 'ready' ? 'ready' : 'celebration' });
  });

  document.getElementById('finish-showcase-setup').addEventListener('click', () => {
    setState({ stage: state.showcaseSetupOrigin === 'ready' ? 'ready' : 'showcaseChooseTeams' });
  });
}

/* ---- Showcase round: choose two teams (after the regular rounds) ---- */

function renderShowcaseChooseTeams() {
  return `
    ${headerHtml()}
    <div class="card">
      <h2>Showcase round — choose two teams</h2>
      <p class="hint">Pick exactly two teams to play the showcase. Pick order matters — whichever team you check <strong>first</strong> gets first choice of which showcase to play next.</p>
      <div class="showcase-team-picker">
        ${state.teams.map((t, i) => {
          const pickPos = state.showcase.teamIndices.indexOf(i);
          const badge = pickPos === 0
            ? `<span class="pick-order-badge pick-order-first">1st pick — chooses first</span>`
            : pickPos === 1
              ? `<span class="pick-order-badge pick-order-second">2nd pick</span>`
              : '';
          return `
            <label class="showcase-team-option" style="border-color:${t.color};">
              <input type="checkbox" data-idx="${i}" ${pickPos !== -1 ? 'checked' : ''} />
              <span class="dot" style="background:${t.color};"></span>
              ${escapeHtml(t.name)}
              ${badge}
            </label>
          `;
        }).join('')}
      </div>
      <div class="btn-row">
        <button class="btn btn-secondary" id="back-to-celebration">Back</button>
        <button class="btn btn-primary" id="choose-teams-continue">Continue</button>
      </div>
    </div>
  `;
}

function bindShowcaseChooseTeams() {
  document.querySelectorAll('.showcase-team-option input[type="checkbox"]').forEach(input => {
    input.addEventListener('change', () => {
      const idx = parseInt(input.dataset.idx, 10);
      if (input.checked && state.showcase.teamIndices.length >= 2 && !state.showcase.teamIndices.includes(idx)) {
        input.checked = false;
        alert('Only two teams can play the showcase — uncheck one first.');
        return;
      }
      const list = state.showcase.teamIndices.slice();
      if (input.checked) {
        list.push(idx);
      } else {
        const pos = list.indexOf(idx);
        if (pos !== -1) list.splice(pos, 1);
      }
      state.showcase.teamIndices = list;
      save();
      render();
    });
  });

  document.getElementById('back-to-celebration').addEventListener('click', () => {
    setState({ stage: 'celebration' });
  });

  document.getElementById('choose-teams-continue').addEventListener('click', () => {
    if (state.showcase.teamIndices.length !== 2) {
      alert('Select exactly two teams to continue.');
      return;
    }
    state.showcase.firstPickerIdx = state.showcase.teamIndices[0];
    setState({ stage: 'showcaseChoosePrize' });
  });
}

/* ---- Showcase round: first team chooses which showcase to play ---- */

function renderShowcaseChoosePrize() {
  const firstIdx = state.showcase.firstPickerIdx;
  const t = state.teams[firstIdx];

  const showcaseCard = (slot) => {
    const items = state.showcase.items[slot] || [];
    const itemsGrid = items.map(it => {
      const img = it.image
        ? `<img class="showcase-item-image" src="${it.image}" alt="${escapeHtml(it.name)}" />`
        : `<div class="showcase-item-fallback">${fallbackIconSvg(56)}</div>`;
      return `
        <div class="showcase-item-tile">
          ${img}
          <div class="showcase-item-name">${escapeHtml(it.name) || 'Mystery item'}</div>
        </div>
      `;
    }).join('');
    return `
      <div class="card showcase-prize-card">
        <h3>Showcase ${slot + 1}</h3>
        <div class="showcase-item-grid">${itemsGrid}</div>
        <button class="btn btn-primary showcase-prize-option" data-choice="${slot + 1}" style="margin-top:16px;">Play Showcase ${slot + 1}</button>
      </div>
    `;
  };

  return `
    ${headerHtml()}
    <div class="card">
      <h2 style="color:${t.color};">${escapeHtml(t.name)}, choose your showcase</h2>
      <p class="hint">${escapeHtml(t.name)} gets first pick — no prices shown, just what's in each. Whichever showcase they don't choose goes to the other team.</p>
    </div>
    <div class="showcase-prize-picker">
      ${showcaseCard(0)}
      ${showcaseCard(1)}
    </div>
    <div class="btn-row">
      <button class="btn btn-secondary" id="back-to-choose-teams">Back</button>
    </div>
  `;
}

function bindShowcaseChoosePrize() {
  document.querySelectorAll('.showcase-prize-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const choice = parseInt(btn.dataset.choice, 10);
      const firstIdx = state.showcase.firstPickerIdx;
      const otherIdx = state.showcase.teamIndices.find(i => i !== firstIdx);
      state.showcase.teamIndices = choice === 1 ? [firstIdx, otherIdx] : [otherIdx, firstIdx];
      setState({ stage: 'showcaseReady' });
    });
  });

  document.getElementById('back-to-choose-teams').addEventListener('click', () => {
    setState({ stage: 'showcaseChooseTeams' });
  });
}

/* ---- Showcase round: ready screen ---- */

function renderShowcaseReady() {
  return `
    ${headerHtml()}
    <div class="card">
      <h2>Showcase round ready</h2>
      <p class="hint">Here's who's playing which showcase. No prices or items are shown here to avoid spoiling it.</p>
      <div class="team-list">
        ${[0, 1].map(slot => {
          const teamIdx = state.showcase.teamIndices[slot];
          const t = state.teams[teamIdx];
          const count = state.showcase.itemCounts[slot] || 0;
          return `
            <div class="team-row">
              <span class="dot" style="background:${t.color};"></span>
              <span>Showcase ${slot + 1}: <strong>${escapeHtml(t.name)}</strong> — ${count} item${count === 1 ? '' : 's'} loaded</span>
            </div>
          `;
        }).join('')}
      </div>
      <div class="btn-row">
        <button class="btn btn-secondary" id="edit-showcase-teams">Change teams</button>
        <button class="btn btn-primary" id="start-showcase-play">Start showcase round</button>
      </div>
    </div>
  `;
}

function bindShowcaseReady() {
  document.getElementById('edit-showcase-teams').addEventListener('click', () => {
    setState({ stage: 'showcaseChooseTeams' });
  });
  document.getElementById('start-showcase-play').addEventListener('click', () => {
    state.showcase.currentPos = 0;
    state.showcase.guesses = {};
    state.showcase.revealed = {};
    state.showcase.busted = {};
    state.showcase.winnerSlot = null;
    setState({ stage: 'showcasePlay' });
  });
}

/* ---- Showcase round: play ---- */

function renderShowcasePlay() {
  const slot = state.showcase.currentPos;
  const teamIdx = state.showcase.teamIndices[slot];
  const t = state.teams[teamIdx];
  const items = state.showcase.items[slot] || [];
  const total = items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);
  const revealed = !!state.showcase.revealed[slot];
  const guessVal = state.showcase.guesses[slot];
  const badge = `Showcase ${slot + 1} of 2`;

  const itemsGrid = items.map(it => {
    const img = it.image
      ? `<img class="showcase-item-image" src="${it.image}" alt="${escapeHtml(it.name)}" />`
      : `<div class="showcase-item-fallback">${fallbackIconSvg(56)}</div>`;
    return `
      <div class="showcase-item-tile">
        ${img}
        <div class="showcase-item-name">${escapeHtml(it.name) || 'Mystery item'}</div>
      </div>
    `;
  }).join('');

  let resultHtml = '';
  if (revealed) {
    const busted = state.showcase.busted[slot];
    const guessNum = Number(guessVal) || 0;
    const under = total - guessNum;
    resultHtml = `
      <div class="reveal-banner ${busted ? 'reveal-banner-bust' : ''}">
        ${busted
          ? `${escapeHtml(t.name)} went over — busted.`
          : `${escapeHtml(t.name)} guessed ${money(guessNum)}, ${money(under)} under. We'll see how that stacks up once both showcases are revealed.`}
      </div>
      <div class="price-display">Total: ${money(total)}</div>
    `;
  }

  const isLast = slot >= 1;
  const nextLabel = isLast ? 'See showcase results' : 'Next showcase';

  return `
    ${headerHtml(badge)}
    <div class="card">
      <h2 style="color:${t.color};">${escapeHtml(t.name)}'s showcase</h2>
      <div class="showcase-item-grid">${itemsGrid}</div>
    </div>

    <div class="card">
      ${!revealed ? `
        <label for="showcase-guess">Guess the total price ($)</label>
        <input type="number" min="0" id="showcase-guess" value="${guessVal === null || guessVal === undefined ? '' : guessVal}" placeholder="Enter total guess" style="max-width:260px;" />
      ` : resultHtml}
    </div>

    <div class="card">
      <div class="btn-row" style="margin-top:0;">
        ${!revealed
          ? `<button class="btn btn-primary" id="reveal-showcase-btn">Reveal showcase price</button>`
          : `<button class="btn btn-primary" id="next-showcase-btn">${nextLabel}</button>`}
      </div>
    </div>
  `;
}

function bindShowcasePlay() {
  const slot = state.showcase.currentPos;
  const revealed = !!state.showcase.revealed[slot];
  if (!revealed) {
    const input = document.getElementById('showcase-guess');
    if (input) {
      input.addEventListener('input', () => {
        state.showcase.guesses[slot] = input.value === '' ? null : Number(input.value);
        save();
      });
    }
    const revealBtn = document.getElementById('reveal-showcase-btn');
    if (revealBtn) revealBtn.addEventListener('click', doRevealShowcase);
  } else {
    const nextBtn = document.getElementById('next-showcase-btn');
    if (nextBtn) nextBtn.addEventListener('click', advanceShowcase);
  }
}

function doRevealShowcase() {
  const slot = state.showcase.currentPos;
  const items = state.showcase.items[slot] || [];
  const total = items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);
  const guess = state.showcase.guesses[slot];
  const busted = guess === null || guess === undefined || guess === '' || Number(guess) > total;
  state.showcase.revealed[slot] = true;
  state.showcase.busted[slot] = busted;
  if (busted) playFailureSound();
  setState({});
}

function showcaseSlotDiff(slot) {
  const items = state.showcase.items[slot] || [];
  const total = items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);
  const guess = Number(state.showcase.guesses[slot]) || 0;
  return total - guess;
}

function computeShowcaseWinner() {
  const eligible = [0, 1].filter(slot => !state.showcase.busted[slot]);
  if (eligible.length === 0) return null;
  if (eligible.length === 1) return eligible[0];
  const d0 = showcaseSlotDiff(0);
  const d1 = showcaseSlotDiff(1);
  if (d0 < d1) return 0;
  if (d1 < d0) return 1;
  return 'tie';
}

function advanceShowcase() {
  if (state.showcase.currentPos >= 1) {
    const winnerSlot = computeShowcaseWinner();
    state.showcase.winnerSlot = winnerSlot;
    if (winnerSlot === 0 || winnerSlot === 1 || winnerSlot === 'tie') playGameWinnerSound();
    setState({ stage: 'showcaseResults' });
  } else {
    state.showcase.currentPos += 1;
    setState({});
  }
}

/* ---- Showcase round: results ---- */

function renderShowcaseResults() {
  const winnerSlot = state.showcase.winnerSlot;
  const hasWinner = winnerSlot === 0 || winnerSlot === 1 || winnerSlot === 'tie';

  const confettiColors = ['#F7A600', '#FFFFFF', '#E24B4A', '#378ADD', '#639922'];
  let confettiHtml = '';
  let fireworksHtml = '';
  if (hasWinner) {
    for (let i = 0; i < 50; i++) {
      const left = Math.random() * 100;
      const delay = Math.random() * 3;
      const duration = 2.5 + Math.random() * 2.5;
      const color = confettiColors[i % confettiColors.length];
      const rotate = Math.random() * 360;
      confettiHtml += `<div class="confetti-piece" style="left:${left}%; background:${color}; animation-delay:${delay}s; animation-duration:${duration}s; transform:rotate(${rotate}deg);"></div>`;
    }
    const fwPositions = [{ x: 20, y: 30 }, { x: 75, y: 25 }, { x: 50, y: 45 }];
    fwPositions.forEach((pos, i) => {
      const color = confettiColors[i % confettiColors.length];
      fireworksHtml += `<div class="firework" style="left:${pos.x}%; top:${pos.y}%; background:${color}; animation-delay:${i * 0.5}s;"></div>`;
    });
  }

  const rowsHtml = [0, 1].map(slot => {
    const teamIdx = state.showcase.teamIndices[slot];
    const t = state.teams[teamIdx];
    const items = state.showcase.items[slot] || [];
    const total = items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);
    const guess = state.showcase.guesses[slot];
    const busted = state.showcase.busted[slot];
    const isWinner = winnerSlot === slot || winnerSlot === 'tie';
    const guessLabel = guess === null || guess === undefined || guess === '' ? 'No guess' : money(guess);
    const status = busted ? 'Busted' : (isWinner ? '🏆 Won' : 'Did not win');
    return `
      <div class="team-row">
        <span class="dot" style="background:${t.color};"></span>
        <span><strong>${escapeHtml(t.name)}</strong> — guessed ${guessLabel}, actual total ${money(total)} — ${status}</span>
      </div>
    `;
  }).join('');

  const championTitle = winnerSlot === 'tie' ? "It's a tie!" : 'Showcase winner!';

  return `
    ${headerHtml()}
    ${hasWinner ? `
      <div class="celebration">
        ${confettiHtml}
        ${fireworksHtml}
        <div class="celebration-content">
          <div class="trophy">🏆</div>
          <p class="champion-name" style="font-size:2rem;">${championTitle}</p>
        </div>
      </div>
    ` : `
      <div class="card">
        <h2>Showcase results</h2>
        <p class="hint">Neither team came in under their showcase total this time — that's the end of the game.</p>
      </div>
    `}

    <div class="card">
      <h2>Results</h2>
      <div class="team-list">${rowsHtml}</div>
    </div>

    <div class="btn-row">
      <button class="btn btn-primary" id="showcase-play-again">Play again</button>
    </div>
  `;
}

function bindShowcaseResults() {
  document.getElementById('showcase-play-again').addEventListener('click', () => {
    clearRoundTimer();
    state.teams.forEach(t => { t.score = 0; });
    state.showcase.teamIndices = [];
    state.showcase.currentPos = 0;
    state.showcase.guesses = {};
    state.showcase.revealed = {};
    state.showcase.busted = {};
    state.showcase.winnerSlot = null;
    setState({
      stage: 'ready',
      currentRoundIndex: 0,
      isTiebreaker: false,
      tiebreakerEligibleTeamIndices: [],
      tiebreakerQueueIndex: 0,
      activeTiebreakerItem: null,
      guesses: [null, null, null],
      revealed: false,
      revealPhase: 'idle',
      lastRoundPoints: [null, null, null],
      lastRoundDiff: [null, null, null],
      lastRoundClosestIndices: [],
      timerSecondsLeft: null,
      timerRunning: false
    });
  });
}

/* ---------------- Utilities ---------------- */

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ---------------- Persistent mute control ---------------- */

function updateMuteButton(btn) {
  btn.textContent = state.muted ? '🔇' : '🔊';
  btn.setAttribute('aria-label', state.muted ? 'Unmute sound' : 'Mute sound');
  btn.title = state.muted ? 'Unmute sound' : 'Mute sound';
}

function initMuteButton() {
  if (document.getElementById('mute-toggle-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'mute-toggle-btn';
  btn.className = 'mute-btn';
  updateMuteButton(btn);
  btn.addEventListener('click', () => {
    getAudioContext();
    setMuted(!state.muted);
    updateMuteButton(btn);
  });
  document.body.appendChild(btn);
}

document.addEventListener('click', () => getAudioContext(), { once: true });

render();
initMuteButton();
