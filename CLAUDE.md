# Teachers FCU — "The Price Is Right" Game

Browser-based, single-page party game modeled on The Price Is Right, branded for
Teachers FCU. Three teams compete across several rounds guessing the price of an
item; closest guess without going over scores the most points. Runs entirely in the
browser (no backend, no database).

**Status: built and live.** Plain HTML/CSS/JS, deployed to GitHub Pages with an
automated CI/CD pipeline — every push to `main` redeploys automatically.

- Repo: `https://github.com/dylandgz/Teachers-Price-Is-Right`
- Live site: `https://dylandgz.github.io/Teachers-Price-Is-Right/`
- Deploy: `.github/workflows/deploy.yml` (GitHub Actions → `actions/deploy-pages`).
  Pages source is set to "GitHub Actions" in repo settings, not "Deploy from a
  branch" — don't switch that back or the workflow's deploys won't take effect.

## Tech stack

- Plain HTML/CSS/JavaScript, no framework, no build step. Files: `index.html`,
  `style.css`, `app.js`. State lives in one module-level `state` object in
  `app.js`; every stage renders by replacing `#app`'s `innerHTML` and rebinding
  event listeners (see `render()`).
- No external API calls, no backend. Background music and the two win-sound
  effects are local `.mp3` files under `assets/audio/` (see "Background music &
  sound effects" below); the countdown tick during the reveal suspense is still
  synthesized client-side via the Web Audio API, no file needed for that one.
- `localStorage` (key `tfcuPriceIsRightState`) auto-saves the entire app state,
  not just setup — so a refresh mid-game on game day resumes where you left off,
  not just setup progress.
- Images the organizer uploads are read via `FileReader` and stored as base64 data
  URLs in state (and therefore in `localStorage`).

## Brand assets

- Logo file lives at `assets/teachers-fcu-logo.png`, used as-is. Shown at ~44px
  tall in the header, and also reused as the static center hub of the prize wheel
  during the reveal sequence (see below).
- Brand colors (CSS custom properties in `style.css`):
  - `--tfcu-navy: #0F1F3D` — primary dark color, header text, card text
  - `--tfcu-blue: #123A66` — page background the whole app sits on
  - `--tfcu-gold: #F7A600` — primary accent: buttons, borders, badges, "you won"
  - `--tfcu-gold-tint: #FEF3DC` — light gold background for banners/callouts
  - White (`#FFFFFF`) — card surfaces on top of the blue background
- Typography: system font stack (`-apple-system, "Segoe UI", Roboto, sans-serif`).
  Sentence case throughout, no ALL CAPS except small badges/labels.
- App title in the header is **"The Price Is Right: Teachers FCU Cash Bash"**.

## App flow

Five sequential stages (`state.stage`): `setup1` → `setup2` → `ready` → `game` →
`celebration`. Stages 1–2 are setup, done ahead of time; 3–5 are game day.

### 1. Team & round setup (`setup1`)

- 3 team name inputs, each with a colored left border matching that team's color.
- Round count input (default 5, min 1, max 20). Inline note that tiebreaker rounds
  are added automatically if the game ends tied.
- "Next: add items" → `setup2`.

### 2. Preload items (`setup2`)

- One row per round: item name, price, short description, image upload (with
  thumbnail preview, falls back to a generic gift-box icon in-game if no image),
  and a **"Timer (sec)"** field — the preset countdown length for that round, used
  on the live game screen. Leave blank/0 for no timer on that round.
- "Fill with sample items" button cycles through 8 demo items/prices for testing.
- Separate **"Tiebreaker items"** section below, same fields (including its own
  timer field), starts with one row, "add another tiebreaker item" to add more.
  Falls back to an improvised "Sudden death tiebreaker" item ($200–700 random
  price) if the queue runs out.
- "Finish setup" → `ready`. Everything autosaves to `localStorage` on every input.
- Has its own "Reset everything" button (separate from the global footer reset —
  see below) since this screen doesn't show the footer control.

### 3. Ready-to-play summary screen (`ready`)

Lands here on reopen once setup is done — never shows the raw setup form again
unless the organizer chooses "Edit setup." Shows round count, team names with
colored dots, a scoring recap, and tiebreaker item status. No prices or images
shown (avoids spoiling the game). "Edit setup" / "Start game" buttons.

### 4. Live game screen (`game`)

- Header: logo, title, round badge ("Round X of N" or "Tiebreaker round").
- Item card: image (bigger, `object-fit: contain` so nothing gets cropped) or
  fallback icon, name, description, price hidden until revealed. A **round timer**
  sits to the right of the item card (not above the team cards) — big countdown
  display with Start timer / Pause / Resume / Reset controls. Timer preset comes
  from the item's setup value; hitting Reset restores the full preset time. No
  timer section shown at all if that round has no timer configured.
- Three team guess cards, colored per team, with a guess input. During a
  tiebreaker, ineligible teams are dimmed with a "sitting out" label and can't
  guess.
- **Reveal sequence** (triggered by "Reveal price"): the round timer stops,
  background music pauses, then a **full-screen fixed overlay**
  (`.wheel-overlay`, `position: fixed`, dark translucent backdrop, doesn't affect
  page layout/height) appears with a spinning prize wheel — the Teachers FCU logo
  sits statically in the wheel's center hub while the colored segments spin —
  followed by a 3-2-1 countdown and "And the price is…" beat (synthesized ticks).
  Only then does the price actually reveal and scoring happen.
- On reveal: the round-winner sound effect plays, a banner names the closest
  team(s), a small 2–3 piece confetti burst fires for the round win (every round,
  not just the finale), and a **"Team X wins the round!" popup** pops in over a
  dimmed full-screen backdrop (`.winner-popup`, bounce-in animation, doesn't block
  clicks) and auto-dismisses after ~2.2s. Guess cards show each team's distance
  and points earned, scoreboard updates. Background music resumes once this
  popup phase ends (`state.revealPhase` goes `idle` → `suspense` → `winner` →
  `idle`; music is paused for the whole `suspense`/`winner` window).
- "Next round" button appears after reveal; label becomes "See final results" or
  "Break the tie" on the final round depending on whether there's a tie.
- Scoreboard always visible at the bottom.

### Team colors

- Team 1: red — border/accent `#E24B4A`, pill `#F0999A`
- Team 2: blue — border/accent `#378ADD`, pill `#8FC1F0`
- Team 3: green — border/accent `#639922`, pill `#A9D06B`

## Scoring rules

Applied every round, including tiebreaker rounds:

1. Only guesses **at or under** the actual price are eligible to place 1st or 2nd.
2. **Closest guess under (or equal to) the price → 3 points.**
3. **Second-closest eligible guess → 2 points.**
4. **Everyone else who submitted a guess gets 1 point** — including anyone over
   the price. Going over never scores zero.
5. A blank guess gets 0 points.
6. **Ties**: teams tied for closest all get the full 3 points (not split); the
   next distinct guess value down gets 2 points.
7. Points step down strictly by distance from the actual price, floor of 1 for
   anyone who guessed at all.

Implemented in `doReveal()` in `app.js`.

## Tiebreaker logic

- After the final round, if one team has the outright highest score, they're
  champion — straight to the celebration screen.
- If tied, trigger a tiebreaker round: pull from the tiebreaker queue (or
  improvise a placeholder), only tied teams' cards are active, score with the
  same rules (ranked only among eligible teams). Repeat with additional
  tiebreaker items until a single leader emerges among the originally-tied teams.

Implemented in `advanceRound()` / `pullTiebreakerItem()` in `app.js`.

## Champion celebration screen (`celebration`)

- Full celebration view replaces round content: trophy icon, winning team name
  large/bold in gold, final point total, falling confetti + firework-style bursts
  in brand + team colors (CSS keyframes only), scoreboard still visible below.
- The game-winner sound effect plays alone (background music paused) when the
  champion is decided; once that sound finishes, background music resumes and
  keeps playing through the rest of the celebration screen (see "Background
  music & sound effects" below for how that handoff is wired).
- "Play again" button resets all scores and returns to the `ready` screen,
  keeping the same preloaded items (no need to redo setup for a rematch).

## Global "Reset entire game" control

A footer with a "Reset game" button appears on every stage **except** `setup2`
(which has its own inline reset). Confirms before clearing `localStorage`
entirely and returning to a blank `setup1`. This is the way to fully start over
at any point, including mid-game on game day.

## Background music & sound effects

Audio files live under `assets/audio/`:
- `background-music.mp3` — loops continuously during the live game screen.
- `dingding.mp3` — plays once when a round's winner popup appears.
- `winner-sound.mp3` — plays once when the overall game champion is decided.

**Only use audio the organizer has confirmed rights to use** — do not add or
swap in copyrighted commercial tracks (e.g. game-show theme songs) without an
explicit, verifiable royalty-free license, since this repo and its GitHub Pages
site are both public. This came up directly during development: a request to
use the actual "Price Is Right" theme was declined for this reason.

To swap the background track, replace the file at
`assets/audio/background-music.mp3` in place (same filename/path) with a new
`.mp3` — no code changes needed. To swap either win sound, same idea at
`assets/audio/dingding.mp3` / `assets/audio/winner-sound.mp3`.

Playback wiring in `app.js`:
- `bgMusicEl` (`Audio`, `loop = true`) is started/stopped by `render()` itself:
  music plays whenever `state.stage === 'game'` **and** `state.revealPhase` is
  not `'suspense'` or `'winner'` — otherwise it's paused. This means every
  stage transition automatically gets the right music state for free; don't
  reintroduce a manual `stopMusic()`/`startMusic()` call elsewhere without
  checking this logic first, it's easy to fight it.
- `roundWinnerSoundEl` plays via `playRoundWinnerSound()`, called from
  `doReveal()`.
- `gameWinnerSoundEl` plays via `playGameWinnerSound()`, called from
  `advanceRound()` (both the "clean winner after final round" and
  "tiebreaker resolved" branches). Its `ended` listener explicitly calls
  `startMusic()` if `state.stage === 'celebration'` — this is what resumes
  background music after the champion sound finishes, bypassing the normal
  `render()`-driven stage check (celebration isn't `'game'`, so that check
  alone would never restart it).
- **Known gotcha already hit once**: the `setTimeout` in `doReveal()` that
  resets `revealPhase` from `'winner'` back to `'idle'` after ~2.2s must also
  check `state.stage === 'game'` before calling `setState()`. Without that
  guard, if the organizer advances to the next round/celebration quickly, that
  stray timer fires after the stage has already changed, triggers an
  unnecessary `render()`, and re-pauses the just-resumed celebration music.
  Keep that guard if touching this code.
- `setMuted()` mutes/unmutes `bgMusicEl` directly and is also checked at the
  top of `playTone()` (the synthesized tick) — the mute button controls both.
- The countdown ticks during the reveal suspense are still synthesized via
  `playTone()`/`playTick()`/`getAudioContext()` (Web Audio API), not files.
  `getAudioContext()` is called synchronously inside click handlers (not inside
  `setTimeout` callbacks) to keep the AudioContext unlocked under browser
  autoplay policies.

### Mute control

A persistent 🔊/🔇 button (`.mute-btn`, fixed bottom-left) is attached once
directly to `document.body` (not re-rendered with `#app`), so it survives every
stage transition without needing to be re-created. Toggles `state.muted`,
which is checked by both the file-based music/sound-effect code and the
synthesized tick.

## Data model

Persisted config shape (subset of the full runtime `state` object — see
`defaultState()` in `app.js` for the complete shape, which also includes runtime
fields like `currentRoundIndex`, `guesses`, `revealed`, `revealPhase`,
`timerSecondsLeft`, `timerRunning`, `lastRoundPoints`, etc.):

```js
{
  teams: [
    { name: "Team 1", color: "#E24B4A", pill: "#F0999A", score: 0 },
    { name: "Team 2", color: "#378ADD", pill: "#8FC1F0", score: 0 },
    { name: "Team 3", color: "#639922", pill: "#A9D06B", score: 0 }
  ],
  rounds: [
    { name: "...", description: "...", price: 649, image: "data:image/...", timeLimit: 60 }
  ],
  tiebreakerQueue: [
    { name: "...", description: "...", price: 250, image: "data:image/...", timeLimit: 45 }
  ],
  isTiebreaker: false,
  tiebreakerEligibleTeamIndices: []
}
```

## Local development

```
cd "Q2 All Hands-Price is right"
python3 -m http.server 8123
```
then visit `http://localhost:8123`. (Or `npx serve .`.) A local server is needed
so `FileReader` and relative asset paths behave consistently — opening
`index.html` directly can work but isn't reliable for the image upload flow.

## Deploying to GitHub Pages

Already set up — this section documents the actual configuration in place:

1. Repo `dylandgz/Teachers-Price-Is-Right`, remote via SSH
   (`git@github.com:dylandgz/Teachers-Price-Is-Right.git`).
2. `.github/workflows/deploy.yml` runs on every push to `main`: checks out,
   `actions/configure-pages`, `actions/upload-pages-artifact` (uploads the repo
   root as-is, no build step), `actions/deploy-pages`.
3. Repo **Settings → Pages → Source** is set to **"GitHub Actions"** (not
   "Deploy from a branch") — this must stay set that way for the workflow to
   actually publish.
4. Live URL: `https://dylandgz.github.io/Teachers-Price-Is-Right/`. Pushing to
   `main` is the entire deploy step — no manual Pages steps needed after that.
5. GitHub Pages/Fastly CDN caches responses for ~10 minutes
   (`cache-control: max-age=600`) — if a deploy doesn't visibly show up right
   away, hard-refresh (Cmd+Shift+R) or use a private window before assuming the
   deploy failed; check the Actions tab for the actual run status.

## Nice-to-haves status

- ✅ Sound effects on reveal and champion celebration — done (see "Background
  music & sound effects" above).
- ✅ "Reset everything" — done, both inline on the item-setup screen and as a
  global footer control on every other screen.
- ⬜ Print/export a simple end-of-game results summary — not built.
- ⬜ Support for more than 3 teams — not built; data model is loosely structured
  enough that this wouldn't be a full rewrite, but the UI (guess grid, team
  setup, colors) currently assumes exactly 3.

## Extras built beyond the original spec

These came from game-day feedback during development, not the original brief —
keep them in mind as the current expected behavior, not optional add-ons:

- Prize wheel + drumroll suspense sequence before every price reveal (full-screen
  overlay, doesn't shift page layout).
- Per-round countdown timer, preset in setup, run live with Start/Pause/Resume/
  Reset next to the item card.
- Small confetti burst on every round win, not just the finale, plus a "Team X
  wins the round!" popup.
- Looping background music during live play, with real win-sound effects on
  round wins and the game championship, and a persistent bottom-left mute
  button controlling all of it.
- Global "Reset game" footer control for a full restart at any point.
