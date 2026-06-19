# Cogworks — Implementation Tasks & Progress

> **Living document.** This is the single source of truth for implementation status. It is kept
> up to date as work proceeds: a task is marked `[~]` when started and `[x]` when done & verified,
> and the **Progress Log** at the bottom records what changed each session.
>
> Design reference: [`DESIGN.md`](./DESIGN.md). Roadmap phases here mirror design §17.

**Status legend:** `[ ]` todo · `[~]` in progress · `[x]` done & verified · `[!]` blocked · `[-]` deferred/cut

---

## 🎯 Now / Next

- **Now:** Phase 1 — project scaffold (Vite + React + TS + Pixi + Zustand) building & deploying.
- **Next:** Phase 2 — MVP vertical slice, starting with the world/sim foundation, then the robot VM.

---

## Phase 0 — Hosting & Deployment ✅ (complete)

- [x] Validate GitHub Pages pipeline with a static placeholder (`site/`)
- [x] Public repo `RyanMathewson/RobotGame` created
- [x] Pages enabled, source = GitHub Actions, HTTPS enforced
- [x] Auto-deploy workflow (`.github/workflows/deploy.yml`) green
- [x] Live at https://ryanmathewson.github.io/RobotGame/

## Phase 1 — Project Scaffold / Foundation 🔨 (in progress)

- [~] Vite + React + TypeScript project (`package.json`, `tsconfig`, `vite.config.ts`)
- [~] `base: '/RobotGame/'` set for Pages subpath
- [~] PixiJS (v8) rendering layer — canvas mounts, draws a tile grid
- [~] Zustand store + React HUD overlay reading live sim stats
- [~] Fixed-timestep game loop (sim ticks decoupled from render)
- [~] Minimal world: grid + resource nodes + one wandering robot (proves loop → render → UI)
- [~] Project folder structure mirroring design §15 (`game/sim`, `game/vm`, `game/data`, `render`, `ui`)
- [~] Switch deploy workflow from static `site/` to `npm run build` → `dist/`
- [ ] Verify the **built** Vite app deploys live to the same URL
- [ ] (Later this phase) PWA manifest + service worker via `vite-plugin-pwa` — deferred to Alpha per design

## Phase 2 — MVP Vertical Slice ⏳ (not started)

> Goal (design §17.1): mine → refine → build a robot → **program it to mine autonomously** → watch it run.

**World & sim**
- [ ] ECS-lite entity model (typed component stores)
- [ ] Tile world + camera (pan/zoom)
- [ ] Player-controlled robot (click-to-move / WASD)
- [ ] Resource nodes (Iron, Scrap) with depletion *(cheap on-pillar pressure probe, design §13.5.7)*

**Production**
- [ ] Data-driven recipes loader + schema (design §15.3)
- [ ] Refinery building (ore → ingot over time)
- [ ] Assembler building (materials → parts/robots)
- [ ] Energy basics (per-action + per-instruction cost, charging)

**The robot VM — the core**
- [ ] Instruction set v0: `NavigateTo`, `Mine`, `Loop`, `If` (+ `Deposit`, sensing `NearestOf`)
- [ ] Block AST → bytecode compiler
- [ ] Per-robot ticked interpreter with energy/cycle accounting
- [ ] Determinism check (same world+program ⇒ same result)

**Program editor**
- [ ] Integrate Blockly with a custom block set mapping 1:1 to VM instructions
- [ ] Program editor panel (palette · canvas · run/step/pause)
- [ ] Debug v0: highlight current block, basic execution trace

**Loop closure**
- [ ] Build Robot-02 at the assembler from refined materials
- [ ] Assign/author a program for Robot-02
- [ ] **Milestone 1: First Autonomous Robot** mines without player input
- [ ] Onboarding script for the first 10 minutes (design §12.3)

**Persistence**
- [ ] Save/load via IndexedDB (world + program ASTs + versioning)
- [ ] Export/import save-to-file

## Phase 3+ — Alpha / Beta / 1.0 🗺️ (high-level, expanded when reached)

- [ ] **Alpha:** full control flow (`While`/`ForEach`), variables, Tech Tree v1, T1 resources + energy grid, debugging tools v1, PWA/offline
- [ ] **Alpha:** subroutines + shared library (the mid-game reuse hook)
- [ ] **Beta:** comms/shared memory + swarm coordination, self-replication, offline simulation, T2–T3 content
- [ ] **Beta:** revisit adversity decision per playtest data (design §13.5) — peaceful mode toggle if enemies added
- [ ] **1.0:** T4 content, art/audio polish, accessibility, balance pass, scenarios/challenges

---

## Architecture decisions & notes
- Scaffold keeps the world/loop/renderer co-located in the render component for now; **moving the sim
  into a Web Worker is a tracked Phase 2/3 task** (design §15.4), not done yet.
- `dist/` is gitignored and built by CI; never commit build output.
- `public/.nojekyll` is copied to `dist/` so Pages serves `_`-prefixed asset folders.
- Vite `base` MUST exactly match the repo name `RobotGame` (case-sensitive) or assets 404 on Pages.

---

## Progress Log

### 2026-06-18
- **Phase 0 complete.** Repo created, Pages live, placeholder deployed & verified (HTTP 200).
- **Phase 1 started.** Scaffolding Vite + React + TS + Pixi + Zustand; created this tracking doc.
