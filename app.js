'use strict';

const STORAGE_KEY = 'tfcuPriceIsRightState';

const TEAM_DEFAULTS = [
  { name: 'Team 1', color: '#E24B4A', pill: '#F0999A' },
  { name: 'Team 2', color: '#378ADD', pill: '#8FC1F0' },
  { name: 'Team 3', color: '#639922', pill: '#A9D06B' }
];

const SAMPLE_ITEMS = [
  { name: '65" 4K smart TV', price: 649, description: 'Crisp picture, big screen, movie night upgrade.' },
  { name: 'Stainless steel grill', price: 389, description: 'Backyard cookouts just got a lot better.' },
  { name: 'Espresso machine', price: 799, description: 'Cafe-quality coffee without leaving the kitchen.' },
  { name: 'Mountain bike', price: 459, description: 'Trail-ready wheels for weekend adventures.' },
  { name: 'Weekend getaway package', price: 1250, description: 'Two nights away, all the relaxation.' },
  { name: 'Stand mixer', price: 429, description: 'A baker\'s best friend, in your favorite color.' },
  { name: 'Gaming laptop', price: 1099, description: 'Fast, portable, ready for anything.' },
  { name: 'Patio furniture set', price: 899, description: 'Turn the backyard into a hangout spot.' }
];

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
    lastRoundPoints: [null, null, null],
    lastRoundDiff: [null, null, null],
    lastRoundClosestIndices: []
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
    rows.push({ name: '', price: '', description: '', image: null });
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

/* ---------------- Rendering ---------------- */

function render() {
  const app = document.getElementById('app');
  switch (state.stage) {
    case 'setup1': app.innerHTML = renderSetup1(); bindSetup1(); break;
    case 'setup2': app.innerHTML = renderSetup2(); bindSetup2(); break;
    case 'ready': app.innerHTML = renderReady(); bindReady(); break;
    case 'game': app.innerHTML = renderGame(); bindGame(); break;
    case 'celebration': app.innerHTML = renderCelebration(); bindCelebration(); break;
  }
}

function headerHtml(badgeText) {
  return `
    <div class="app-header">
      <img class="logo" src="assets/teachers-fcu-logo.png" alt="Teachers FCU" />
      <h1>The Price Is Right</h1>
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
      <p class="hint">One item per round. Add a name, price, short description, and optional photo.</p>
      <div class="btn-row" style="margin-top:0; margin-bottom:10px;">
        <button class="btn btn-secondary" id="fill-sample">Fill with sample items</button>
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
    state.tiebreakerQueue.push({ name: '', price: '', description: '', image: null });
    save();
  }

  function targetArray(prefix) {
    return prefix === 'tb' ? state.tiebreakerQueue : state.rounds;
  }

  document.querySelectorAll('[data-role="name"], [data-role="description"], [data-role="price"]').forEach(input => {
    input.addEventListener('input', () => {
      const arr = targetArray(input.dataset.prefix);
      const idx = parseInt(input.dataset.idx, 10);
      const role = input.dataset.role;
      if (role === 'price') {
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
      return { name: sample.name, price: sample.price, description: sample.description, image: r.image || null };
    });
    save();
    render();
  });

  document.getElementById('add-tiebreaker').addEventListener('click', () => {
    state.tiebreakerQueue.push({ name: '', price: '', description: '', image: null });
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

      <div class="btn-row">
        <button class="btn btn-secondary" id="edit-setup">Edit setup</button>
        <button class="btn btn-primary" id="start-game">Start game</button>
      </div>
    </div>
  `;
}

function bindReady() {
  document.getElementById('edit-setup').addEventListener('click', () => {
    setState({ stage: 'setup2' });
  });
  document.getElementById('start-game').addEventListener('click', () => {
    setState({
      stage: 'game',
      currentRoundIndex: 0,
      isTiebreaker: false,
      guesses: [null, null, null],
      revealed: false,
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

function renderGame() {
  const item = getCurrentItem();
  const badge = state.isTiebreaker
    ? 'Tiebreaker round'
    : `Round ${state.currentRoundIndex + 1} of ${state.roundCount}`;

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
    bannerHtml = `<div class="reveal-banner">${bannerText}</div>`;
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
        <input type="number" min="0" id="guess-${i}" data-idx="${i}" value="${guessVal === null || guessVal === undefined ? '' : guessVal}" placeholder="Enter guess" />
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

  return `
    ${headerHtml(badge)}
    <div class="card item-card">
      ${imageHtml}
      <div class="item-info">
        <h2>${escapeHtml(item.name) || 'Untitled item'}</h2>
        <p>${escapeHtml(item.description) || ''}</p>
        ${priceHtml}
      </div>
    </div>

    ${bannerHtml}

    <div class="guess-grid">${guessCardsHtml}</div>

    <div class="card">
      <div class="btn-row" style="margin-top:0;">
        ${!state.revealed
          ? `<button class="btn btn-primary" id="reveal-btn">Reveal price</button>`
          : `<button class="btn btn-primary" id="next-round-btn">${nextLabel}</button>`}
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
  if (!state.revealed) {
    document.querySelectorAll('.guess-card input[type="number"]').forEach(input => {
      input.addEventListener('input', () => {
        const i = parseInt(input.dataset.idx, 10);
        state.guesses[i] = input.value === '' ? null : Number(input.value);
        save();
      });
    });
    const revealBtn = document.getElementById('reveal-btn');
    if (revealBtn) revealBtn.addEventListener('click', doReveal);
  } else {
    const nextBtn = document.getElementById('next-round-btn');
    if (nextBtn) nextBtn.addEventListener('click', advanceRound);
  }
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

  setState({
    revealed: true,
    lastRoundPoints,
    lastRoundDiff,
    lastRoundClosestIndices: closestIndices
  });
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
  if (state.isTiebreaker) {
    if (tiebreakerStillTied()) {
      setState({
        activeTiebreakerItem: pullTiebreakerItem(),
        guesses: [null, null, null],
        revealed: false,
        lastRoundPoints: [null, null, null],
        lastRoundDiff: [null, null, null],
        lastRoundClosestIndices: []
      });
    } else {
      setState({ stage: 'celebration' });
    }
    return;
  }

  const isFinalRegularRound = state.currentRoundIndex >= state.roundCount - 1;
  if (!isFinalRegularRound) {
    setState({
      currentRoundIndex: state.currentRoundIndex + 1,
      guesses: [null, null, null],
      revealed: false,
      lastRoundPoints: [null, null, null],
      lastRoundDiff: [null, null, null],
      lastRoundClosestIndices: []
    });
    return;
  }

  if (overallTie()) {
    const max = Math.max(...state.teams.map(t => t.score));
    const tiedIndices = state.teams.map((t, i) => i).filter(i => state.teams[i].score === max);
    setState({
      isTiebreaker: true,
      tiebreakerEligibleTeamIndices: tiedIndices,
      activeTiebreakerItem: pullTiebreakerItem(),
      guesses: [null, null, null],
      revealed: false,
      lastRoundPoints: [null, null, null],
      lastRoundDiff: [null, null, null],
      lastRoundClosestIndices: []
    });
  } else {
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
      <button class="btn btn-primary" id="play-again">Play again</button>
    </div>
  `;
}

function bindCelebration() {
  document.getElementById('play-again').addEventListener('click', () => {
    state.teams.forEach(t => { t.score = 0; });
    setState({
      stage: 'ready',
      currentRoundIndex: 0,
      isTiebreaker: false,
      tiebreakerEligibleTeamIndices: [],
      tiebreakerQueueIndex: 0,
      activeTiebreakerItem: null,
      guesses: [null, null, null],
      revealed: false,
      lastRoundPoints: [null, null, null],
      lastRoundDiff: [null, null, null],
      lastRoundClosestIndices: []
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

render();
