# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Cogworks** (repo: `RobotGame`) — a browser game where you mine/refine resources, build robots, and **program those robots** with visual code blocks to automate the colony. The visual programming is the core fantasy, not a side feature.

- **`docs/DESIGN.md`** is the design source of truth (game systems, the robot VM, tech tree, architecture rationale). Read it before adding game systems.
- **`docs/TASKS.md`** is the living implementation tracker. **Keep it up to date as you work:** mark a task `[~]` when starting and `[x]` when done & verified, and add a dated entry to the Progress Log. This is a required practice, not optional.

## Commands

```bash
npm run dev        # Vite dev server (local play/iteration)
npm run build      # correctness gate: tsc --noEmit && vite build  ->  ./dist
npm run typecheck  # tsc --noEmit only
npm run preview    # serve the production ./dist locally
```

- **There is no test runner or linter configured yet.** Until one exists, `npm run build` is the correctness gate — it type-checks (strict, incl. `noUnusedLocals`/`noUnusedParameters`) then builds. Run it before committing. If you add a test framework, document the single-test invocation here.

## Architecture: three decoupled layers

The codebase deliberately separates **simulation**, **rendering**, and **UI**. Understanding the boundaries (and why they exist) is essential — they enable determinism, save/replay, offline simulation, and a future move of the sim into a Web Worker.

1. **Sim — `src/game/`** (pure logic, no DOM/Pixi/React imports)
   - `sim/world.ts`: the `World` is plain serializable data; `tickWorld(world, dt)` advances it. It is **deterministic** — randomness comes only from the world's embedded PRNG (`nextRandom`), never `Math.random()`. This is what makes saves/replays/offline-sim reproducible. **Do not break determinism or add wall-clock/DOM dependencies into the sim.**
   - `loop.ts`: fixed-timestep loop (30 ticks/s) decoupled from render framerate, with an accumulator and a spiral-of-death clamp. Sim steps are fixed; rendering interpolates.
   - `vm/`: the robot VM (block AST → bytecode → ticked interpreter). Currently a stub (`instructions.ts` opcode + energy/cost table). Every instruction carries an energy + cycle cost — efficient programs are *mechanically* better, so cost accounting is load-bearing, not flavor.
   - `data/`: data-driven content (resources now; recipes/modules/tech later). Prefer adding content here over hardcoding in logic.

2. **Render — `src/render/`** (PixiJS v8)
   - `worldRenderer.ts` reads the world and draws it; it owns **no game logic**.
   - `PixiStage.tsx` bridges React↔Pixi: creates the `Application` (async `app.init()` in v8), mounts the canvas, and starts the loop. Its effect cleanup must fully destroy Pixi (guards against React StrictMode double-mount in dev).

3. **UI — `src/ui/`** (React + Zustand)
   - `store.ts` (Zustand) holds HUD state. **Data flows one way:** the loop pushes *throttled* snapshots into the store (`onStats`), React reads them. The **sim must never read from the store.**

**Scaffold caveat:** world + loop + renderer are currently wired together inside `PixiStage.tsx`. Lifting the sim into a Web Worker is a planned task (see `docs/TASKS.md`) — keep new sim code worker-safe (serializable state, no DOM) so that move stays cheap.

## Deployment & hosting (GitHub Pages)

- Pushing to **`main` auto-deploys to production** via `.github/workflows/deploy.yml` (builds, publishes `./dist`). The live public URL is **https://ryanmathewson.github.io/RobotGame/**. Treat `main` as production: it is publicly visible after every push.
- **`base: '/RobotGame/'` in `vite.config.ts` must exactly match the repo name (case-sensitive)** or all assets 404 on Pages. If the repo is renamed or moved to a user-site, update `base`.
- The game must remain **100% static / client-side** (no server, no hosted DB) so free Pages hosting works. Persistence is local (IndexedDB planned). Any future cloud feature must use a third-party serverless service, not a server we run.
- `dist/` is build output — gitignored, never committed. `public/.nojekyll` is copied into `dist/` so Pages serves `_`-prefixed asset folders.

## Design pillars (use as a decision lens)

When evaluating a feature, check it against these (from `docs/DESIGN.md`):
1. **Programming is the gameplay** — automation is authored by the player, never bought as an upgrade.
2. **Legible, deterministic systems** — inspectable, no hidden RNG in core loops.
3. **Earned complexity** — unlock breadth gradually via the tech tree; never dump everything at once.
4. **The colony runs without you** — design for bounded offline simulation.

If a change serves none of these, reconsider it.
