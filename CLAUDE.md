# Teachers FCU — "The Price Is Right" Game

Build a browser-based, single-page party game modeled on The Price Is Right, branded
for Teachers FCU. Three teams compete across several rounds guessing the price of an
item; closest guess without going over scores the most points. Runs entirely in the
browser (no backend, no database) so it can be run locally during development and
hosted for free on GitHub Pages for game day.

## Tech stack

- Plain HTML/CSS/JavaScript (no framework required) OR React + Vite if you prefer
  component structure — either is fine, but keep it a fully static site with no
  server-side code, since it needs to run as a static GitHub Pages site.
- No external API calls, no backend. Everything runs client-side.
- Use `localStorage` to auto-save setup progress (teams, rounds, items, images) so a
  refresh on game day doesn't wipe out preloaded work. This is safe here (unlike a
  sandboxed preview) since it's a real deployed site.
- Images the organizer uploads should be read client-side via `FileReader` and stored
  as base64 data URLs (in memory + localStorage). No file server needed.

## Brand assets

- Logo file is provided at `assets/teachers-fcu-logo.png` — use this exact file, do
  not recreate it. Display it a bit larger than a typical favicon-sized mark — around
  40–48px tall in the header is a good target (bigger than a first draft might use).
- Brand colors (use as CSS custom properties):
  - `--tfcu-navy: #0F1F3D` — primary dark color, header text, card text, high-contrast
    accents
  - `--tfcu-blue: #123A66` — main background field for the whole game (the app should
    sit on this blue, not a plain white or gray page background)
  - `--tfcu-gold: #F7A600` — primary accent color: buttons, borders, badges, the "you
    won" moments
  - `--tfcu-gold-tint: #FEF3DC` — light gold background for banners/callouts
  - White (`#FFFFFF`) — card surfaces sitting on top of the blue background, for
    contrast and legibility
- Typography: a clean, modern sans-serif (system font stack is fine: e.g.
  `-apple-system, "Segoe UI", Roboto, sans-serif`). Keep copy playful but
  professional — this is a credit union event, not a kids' show. Sentence case
  throughout, no ALL CAPS except small badges/labels.
- Overall tone: fun and energetic, but polished — Teachers FCU is hosting this, so it
  should feel like a nice internal event, not a cheap template.

## App flow

The app has four sequential stages. Stage 1–2 are "setup," done ahead of time by an
organizer. Stage 3–4 are "game day," run live in front of the teams.

### 1. Team & round setup (do this ahead of time)

- Inputs for exactly 3 team names (default placeholders: "Team 1", "Team 2",
  "Team 3"). Give each team name input a colored left border/accent matching that
  team's assigned color (see Team colors below) so it's visually consistent with the
  rest of the app.
- A number input for "how many rounds?" (default 5, min 1, max 20). Explain inline
  that tiebreaker rounds are added automatically if the game ends tied.
- "Next: add items" button moves to stage 2.

### 2. Preload items (do this ahead of time)

- One row per round (based on the round count from stage 1). Each row has:
  - Item name (text)
  - Price (number, dollars)
  - Short description (text, one line)
  - Image upload — a real file picker (`<input type="file" accept="image/*">`) that
    reads the file from the organizer's computer via `FileReader` and shows a small
    thumbnail preview inline. No image is fine — fall back to a generic gift-box icon
    in the game view.
- A "fill with sample items" button that populates all rows with placeholder demo
  items/prices, purely so the organizer can test the flow without typing real data.
  Sample items to use: 65" 4K smart TV ($649), stainless steel grill ($389), espresso
  machine ($799), mountain bike ($459), weekend getaway package ($1,250), stand mixer
  ($429), gaming laptop ($1,099), patio furniture set ($899) — cycle through this
  list if there are more rounds than sample items.
- Below the main item rows, a separate **"Tiebreaker items"** section:
  - Starts with one row (same fields: name, price, description, image).
  - An "add another tiebreaker item" button to add more rows, in case multiple
    tiebreaker rounds might be needed.
  - Explain inline: "used only if the game ends in a tie. If you run out, a small
    placeholder prize will be improvised automatically."
- "Finish setup" button moves to stage 3 (ready screen). Also persist all of this to
  `localStorage` as it's entered, so navigating away and back doesn't lose data.

### 3. Ready-to-play summary screen (game day starts here)

This is the screen the organizer should land back on when they open the page on
game day — it should not show them the raw setup form again unless they choose to.

- Confirms "setup complete."
- Shows:
  - Number of rounds loaded
  - The three team names, each with a colored dot matching their game color
  - A short "how it's scored" recap (see Scoring rules below, in plain language)
  - Whether any tiebreaker items were preloaded, or if the game will improvise one if
    needed
- Do **not** show item images or prices on this screen — that would spoil the game
  before it starts.
- Two buttons: "Edit setup" (goes back to stage 2) and "Start game" (goes to stage 4).

### 4. Live game screen (game day)

- Header shows the Teachers FCU logo + game title, and a small badge showing
  "round X of N" (or "tiebreaker round" during a tiebreaker).
- Item card: shows the uploaded image (or fallback icon), item name, and
  description. Price is hidden until "Reveal price" is clicked.
- Three team guess cards, one per team, each in that team's color:
  - A number input for that team's guess (dollars)
  - After reveal: shows how far off they were and how many points they earned
  - If a team is not eligible this round (only relevant during a tiebreaker — see
    below), the card is visibly dimmed/disabled with a "sitting out" label.
- "Reveal price" button: shows the actual price, scores the round (see Scoring rules),
  shows a short banner naming whoever was closest this round, and updates the
  scoreboard.
- "Next round" button appears after reveal, advances to the next item. On the final
  round, this button's label should change to either "See final results" or
  "Break the tie" depending on whether there's a tie for the lead.
- **Scoreboard**: always visible at the bottom of the game screen, showing every
  team's name and running point total in their team color, updating live after every
  round.

### Team colors

Use these three, consistently, across guess cards, scoreboard pills, and the team-dot
in setup:
- Team 1: red family — border/accent `#E24B4A`, pill background `#F0999A`
- Team 2: blue family — border/accent `#378ADD`, pill background `#8FC1F0`
- Team 3: green family — border/accent `#639922`, pill background `#A9D06B`

## Scoring rules

Applied every round, including tiebreaker rounds:

1. Only guesses **at or under** the actual price are eligible to place 1st or 2nd.
2. **Closest guess under (or equal to) the price → 3 points** (the most points
   available).
3. **Second-closest eligible guess → 2 points.**
4. **Everyone else who submitted a guess gets 1 point** — this includes teams that
   guessed *over* the price, and any eligible guesses beyond 2nd place. Going over
   should never score zero; it should always still earn the baseline 1 point.
5. A team that leaves the guess blank (didn't guess at all) gets 0 points for that
   round.
6. **Ties**: if two or more teams tie for the closest eligible guess, all of them get
   the full 3 points (do not split the points). The next distinct guess value down
   gets 2 points. Do not award both 3 and 2 points to two teams that guessed the
   identical amount — that value is worth 3 for everyone tied at it.
7. Round order of points should always be assigned in order of distance from the
   actual price: closest gets the most, and points step down from there, ending with
   1 point as the floor for anyone who guessed at all.

## Tiebreaker logic

- After the final scheduled round, compare total scores. If there is a single team
  with the highest score, that team is the champion — go straight to the
  celebration screen (stage 5 below).
- If two or more teams are tied for the highest score, trigger a tiebreaker round:
  - Pull the next item from the preloaded tiebreaker queue (if any are left);
    otherwise generate a small placeholder item (e.g. "Sudden death tiebreaker,"
    random price between $200–$700).
  - Only the tied teams' guess cards are active; the other team(s) are shown
    dimmed with a "sitting out" label and cannot submit a guess.
  - Score the round using the same rules above (still only ranking within the
    eligible tied teams).
  - If after this round the tied teams are still tied, repeat with another
    tiebreaker item. Keep going until there's a single leader among the
    originally-tied teams.
  - Once resolved, that team is the champion.

## Champion celebration screen (stage 5)

When a single champion is determined:

- Replace the round content (item card, guess inputs, reveal button) with a
  dedicated celebration view — don't just show a small banner.
- Center the winning team's name prominently (large, bold, in white or gold against
  the navy/blue background), with a trophy icon above it and their final point total
  below.
- Add a lightweight celebratory animation: falling confetti pieces in the brand
  colors (gold, white, and the three team colors) and a couple of firework-style
  bursts. Keep this to simple CSS keyframe animations (`translateY`/rotation for
  confetti, radiating small dots for fireworks) — no external animation libraries
  needed.
- The scoreboard should remain visible below the celebration, showing final standings
  for all three teams.
- Optionally add a "play again" button that resets scores and returns to the
  ready-to-play screen (keeping the same preloaded items so the organizer doesn't
  have to redo setup for a rematch) — nice-to-have, not required.

## Data model (suggested shape)

```js
{
  teams: [
    { name: "Team 1", color: "#E24B4A", score: 0 },
    { name: "Team 2", color: "#378ADD", score: 0 },
    { name: "Team 3", color: "#639922", score: 0 }
  ],
  rounds: [
    { name: "...", description: "...", price: 649, image: "data:image/..." }
  ],
  tiebreakerQueue: [
    { name: "...", description: "...", price: 250, image: "data:image/..." }
  ],
  currentRoundIndex: 0,
  isTiebreaker: false,
  tiebreakerEligibleTeamIndices: []
}
```

## Local development

- No build step is strictly required if built as plain HTML/CSS/JS — just open
  `index.html` in a browser, or better, run a simple local server so `FileReader` and
  relative asset paths behave consistently:
  ```
  npx serve .
  ```
  or
  ```
  python3 -m http.server 8000
  ```
  then visit `http://localhost:8000`.
- If built with Vite/React instead:
  ```
  npm install
  npm run dev
  ```

## Deploying to GitHub Pages (so it's ready for game day)

1. Push this project to a GitHub repository.
2. If it's plain HTML/CSS/JS with no build step:
   - Go to the repo's **Settings → Pages**.
   - Under "Build and deployment," set **Source** to "Deploy from a branch," branch
     `main`, folder `/ (root)`.
   - Save. The site will publish at `https://<username>.github.io/<repo-name>/`.
3. If built with Vite/React (needs a build step):
   - Set the `base` in `vite.config.js` to `/<repo-name>/`.
   - Run `npm run build` to produce a `dist/` folder.
   - Either commit `dist/` to a `gh-pages` branch and point Pages at that branch, or
     set up a small GitHub Actions workflow that builds and deploys on push to `main`
     (ask Claude Code to scaffold this if you go the React route).
4. On game day, just open the published GitHub Pages URL — the "ready to play"
   summary screen (with everything preloaded, assuming you used the same browser/
   device where setup was saved to `localStorage`) is where you'll land.

## Nice-to-haves (only if time allows)

- A subtle sound effect on price reveal and on the champion celebration.
- A "reset everything" button in setup for starting completely fresh.
- Print or export a simple end-of-game results summary (team names + final scores).
- Support for more than 3 teams (not required now, but keep the data model loosely
  structured enough that this wouldn't be a full rewrite later).
