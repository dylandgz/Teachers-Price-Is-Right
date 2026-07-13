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
- `background-music.mp3` — loops continuously during the live game screen and
  showcase play (paused during reveals, resumed after — see wiring below).
- `dingding.mp3` — plays once when a regular round's winner popup appears.
- `winner-sound.mp3` — plays once when the overall game champion is decided,
  and once when the showcase round's single overall winner is decided (not on
  each team's individual reveal — see the showcase round section above).
- `failure_sound.mp3` — plays once when a team busts in the showcase round
  (guesses over their showcase total, or doesn't guess at all).

**Only use audio the organizer has confirmed rights to use** — do not add or
swap in copyrighted commercial tracks (e.g. game-show theme songs) without an
explicit, verifiable royalty-free license, since this repo and its GitHub Pages
site are both public. This came up directly during development: a request to
use the actual "Price Is Right" theme was declined for this reason.

To swap any of these, replace the file in place (same filename/path) with a
new `.mp3` — no code changes needed.

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



## Showcase round (optional, after all regular rounds)

A distinct final stage modeled on the real show's Showcase Showdown format —
**exactly two showcases, two teams, one overall winner.** This went through a
full redesign during development (an earlier version let 1–3 teams each build
their own showcase and win independently) — the current behavior below is what's
actually implemented; don't reintroduce the old per-team-independent-win model.

### Setup is pre-game only (`showcaseSetup` stage)

- Reached from the **`ready` screen** (before "Start game"), via "Set up
  showcase round" / "Edit showcase items". This is deliberately pre-game — the
  organizer builds the two showcases before the first round even starts, so
  there's no pause to build content later, mid-flow, on game day.
- Builds **exactly two showcases** (Showcase 1, Showcase 2) — generic prize
  packages, not tied to any team yet. Each has a 2–5 item-count dropdown and
  that many name/price/image rows (`state.showcase.items[0]` / `items[1]`,
  `itemCounts[0]` / `[1]`).
- If items were never configured by the time the organizer reaches the
  celebration screen, "Start showcase round" there falls back to this same
  setup stage as a live-setup path (`showcaseHasAnyItems()` checks this) — but
  the intended, recommended flow is doing it ahead of time from `ready`.
- `state.showcaseSetupOrigin` (`'ready'` or `'celebration'`) tracks which entry
  point was used, so "Back"/"Finish setup" return to the right place (back to
  `ready` pre-game, or on to team selection post-game).

### Team selection happens after the regular rounds (`showcaseChooseTeams` stage)

- Reached from the **celebration screen** via "Start showcase round" (only
  after items are already configured — see above). Checkboxes for all 3 teams,
  **hard-capped at exactly 2** — trying to check a third shows an alert and the
  checkbox stays unchecked. This is a deliberate, manual, real-time choice made
  after seeing how the regular rounds played out, not decided in advance.
- The first team checked plays Showcase 1, the second plays Showcase 2
  (`state.showcase.teamIndices[0]` / `[1]`). Team selection always starts fresh
  each time this stage is entered from celebration (`teamIndices` reset to
  `[]`) — it is not remembered from a previous playthrough.

### Showcase ready screen (`showcaseReady`)

Shows "Showcase 1: Team X — N items", "Showcase 2: Team Y — N items" (counts
only, no prices/items — avoids spoilers). "Change teams" goes back to team
selection; "Start showcase round" begins play.

### Showcase play (`showcasePlay`, slot-indexed by `state.showcase.currentPos`)

- Teams play **one at a time**, Showcase 1's team first, then Showcase 2's.
- Item grid (photo + name, no prices) for the current slot's showcase, a
  single guess input for the combined total.
- **Individual reveal does not declare a winner.** Guessing at/under the total
  just shows a neutral "guessed $X, $Y under — we'll see how that stacks up
  once both showcases are revealed" — because the other team hasn't gone yet
  and could end up closer. Going over the total **is** an immediate, final
  outcome regardless of the other team ("went over — busted"), since busting
  doesn't depend on anyone else's result — the failure sound plays right away
  for that case. `state.showcase.busted[slot]` tracks this; there is
  deliberately no `won` field per-slot anymore, only a single overall
  `state.showcase.winnerSlot` computed once both teams have played (see below).

### Determining the single overall winner

Computed once in `advanceShowcase()` when moving from the second team's reveal
to the results screen (`computeShowcaseWinner()` in `app.js`):
- Both busted → no winner (`null`).
- Exactly one busted → the other team wins automatically.
- Neither busted → whoever guessed **closer without going over** wins
  (smaller `total - guess`); an exact tie in closeness is reported as `'tie'`.

The game-winner sound plays exactly once, at this moment (results screen),
never during an individual team's reveal — that was a real bug found during
development (both teams showing "Won" independently) and is the reason the
per-slot `won` field was replaced with a single `winnerSlot`.

### Showcase results (`showcaseResults`)

- Full celebration (confetti/fireworks, reused from the champion screen)
  **only if there's a winner** (including the tie case). Lists both teams'
  guess, actual total, and status (`🏆 Won` / `Did not win` / `Busted`).
- **If there's no winner** (both busted): a **"Try again with a different
  combination"** button appears. It pools both showcases' items together,
  shuffles them (Fisher-Yates), and re-splits into two new showcases —
  preserving each showcase's original item count, so the same organizer-built
  items get recombined into new price totals without any new data entry — then
  replays immediately with the *same two teams* (`reshuffleShowcaseItems()` in
  `app.js`).
- "Play again" (full game reset) is always available too, and resets scores
  and showcase play-state back to the `ready` screen — but showcase **item**
  setup persists across a rematch (like regular-round items do), so it doesn't
  need to be rebuilt; only team selection and guesses reset.