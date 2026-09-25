# AGENTS.md

Zero-dependency repo: vanilla HTML5 Canvas + JS. No bundler, no package.json, no tests, no lint, no CI. Do not add tooling or `npm install`.

## Run

Open `index.html` directly, or `npx serve .` → `http://localhost:3000`. No build step.

## Structure

- `index.html` — 800×600 `<canvas id="canvas">`, loads `game.js` via plain script tag.
- `game.js` — entire game (~423 lines, `'use strict'`). Classes `Ship` / `Bullet` / `Asteroid` / `Particle`, plus `update()` / `draw()` driven by `requestAnimationFrame(loop)`.
- `favicon.svg` — static only.

## Gotchas

- Fixed constants `W = 800`, `H = 600` duplicated in `index.html` canvas attrs and `game.js` — keep in sync.
- Space is toroidal: all movement wraps via `wrap(v, max)`. Don't add wall collision.
- Single-shot input uses `justPressed` + `pressed('Space')`; continuous input reads `keys` directly. Clearing happens inside `pressed()`.
- `dt` is clamped to `0.05` in `loop()` — preserves physics under tab-switch lag.
- Asteroid size index `3 → 2 → 1` feeds parallel arrays `RADII` / `SPEEDS` / `POINTS`; `split()` returns 2 of `size - 1`, none at size 1.
- Ship-vs-asteroid hit uses forgiving radius `ship.radius + a.radius * 0.82`, not full radius.
- Spawn safety: `spawnAsteroids()` keeps new large asteroids ≥130px from screen center.
- Level flow: `initGame()` starts 4 asteroids; `nextLevel()` spawns `3 + level` and calls `ship.reset()` (restores invincibility). `killShip()` → `dead` (2s timer) or `gameover` (Space restarts).
- README claims power-ups / "estrella fugaz" — not implemented in `game.js`. Don't assume they exist.
