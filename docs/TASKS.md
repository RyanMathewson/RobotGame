# Cogworks — Implementation Tasks & Progress

> **Living document.** This is the single source of truth for implementation status. It is kept
> up to date as work proceeds: a task is marked `[~]` when started and `[x]` when done & verified,
> and the **Progress Log** at the bottom records what changed each session.
>
> Design reference: [`DESIGN.md`](./DESIGN.md). Roadmap phases here mirror design §17.

**Status legend:** `[ ]` todo · `[~]` in progress · `[x]` done & verified · `[!]` blocked · `[-]` deferred/cut

---

## 🎯 Now / Next

- **Now:** 🎉 **MVP vertical slice is complete & playable end-to-end** — mine → refine → build → **program**
  → watch it run, with onboarding, save/load, and a deterministic VM. Every design §17.1 MVP item is in
  except the explicitly deferred ones (tile world/camera; PWA).
- **Next:** play-test the slice (is the core loop *fun*? — the whole point of the MVP), then start **Alpha**:
  full control flow (`While`/`ForEach`), variables, step/pause debugging, Tech Tree v1 + T1 resources +
  energy grid (turn the VM's placeholder recharge into real charging pads/generators).

---

## Phase 0 — Hosting & Deployment ✅ (complete)

- [x] Validate GitHub Pages pipeline with a static placeholder (`site/`)
- [x] Public repo `RyanMathewson/RobotGame` created
- [x] Pages enabled, source = GitHub Actions, HTTPS enforced
- [x] Auto-deploy workflow (`.github/workflows/deploy.yml`) green
- [x] Live at https://ryanmathewson.github.io/RobotGame/

## Phase 1 — Project Scaffold / Foundation ✅ (complete)

- [x] Vite + React + TypeScript project (`package.json`, `tsconfig`, `vite.config.ts`)
- [x] `base: '/RobotGame/'` set for Pages subpath (verified in built `index.html`)
- [x] PixiJS (v8) rendering layer — canvas mounts, draws a tile grid
- [x] Zustand store + React HUD overlay reading live sim stats
- [x] Fixed-timestep game loop (sim ticks decoupled from render)
- [x] Minimal world: grid + resource nodes + one wandering robot (proves loop → render → UI)
- [x] Project folder structure mirroring design §15 (`game/sim`, `game/vm`, `game/data`, `render`, `ui`)
- [x] Switch deploy workflow from static `site/` to `npm run build` → `dist/`
- [x] Verify the **built** Vite app deploys live to the same URL (HTTP 200 + JS bundle loads)
- [-] PWA manifest + service worker via `vite-plugin-pwa` — deferred to Alpha per design

## Phase 2 — MVP Vertical Slice ✅ (playable end-to-end; ready for play-testing)

> Goal (design §17.1): mine → refine → build a robot → **program it to mine autonomously** → watch it run.

**World & sim**
- [x] ECS-lite entity model (typed component stores: `transform`/`movement`/`resourceNode` + `player` tag)
- [~] Tile world + camera — view now **auto-fits any window** (root container scaled to fit, so a large
      map stays fully visible/reachable); full **pan/zoom camera still deferred** for worlds bigger than
      fit at a readable zoom
- [x] Player-controlled robot (click-to-move + WASD/arrows; input modeled as data consumed by the sim)
- [x] Resource nodes with mining: click a node → robot walks over & auto-mines on arrival, continuing
      until interrupted (move/WASD) or node exhausted; **full cargo pauses (robot shows "blocked" + a
      HUD reminder) and auto-resumes when freed**; nodes deplete & despawn
      *(cheap on-pillar pressure probe, design §13.5.7)*

**Production**
- [x] Data-driven recipes loader (`data/recipes.ts`, typed `RefineRecipe[]`) — JSON file + schema
      validation deferred until content grows (design §15.3); typed TS module is the interim form
- [x] Manual **Deposit**: click the Refinery → robot hauls cargo there & unloads into its input buffer
- [x] Refinery building (raw → refined over time): one batch at a time, consumes inputs per recipe,
      emits refined output into the colony stockpile; live progress bar in-world + HUD panel
- [x] Assembler building (materials → parts/robots): data-driven `AssembleRecipe[]`, FIFO build queue,
      draws inputs from the colony stockpile; HUD **Build** buttons (enabled only when affordable) feed
      `FrameInput.buildRequests` → sim. Robot recipes spawn a new robot beside the assembler
- [ ] Energy basics (per-action + per-instruction cost, charging)

**The robot VM — the core** ✅
- [x] Instruction set v0: `NavigateTo`, `Mine`, `Deposit`, `Wait`, `Loop`, `If`/`Else`, sensing
      `NearestOf` (nodes/refinery) + conditions (`exists`, `cargoFull`, `not`) — see `vm/ast.ts`
- [x] Block AST → bytecode compiler (`vm/compiler.ts`): control flow lowered to jumps; flat `Instr[]`
- [x] Per-robot ticked interpreter (`vm/interpreter.ts`): PC machine with a Logic Core **cycle budget**
      and **energy accounting** (debits per instruction; out-of-energy ⇒ `blocked`). Blocking actions
      drive the existing movement/mining/deposit components, so robots reuse those systems + render FX
- [x] Determinism check (`vm/determinism.ts`): same world+program ⇒ byte-identical result; runs in DEV
      at startup (console PASS/FAIL) and verified headlessly via `npx tsx`

**Program editor**
- [x] Block editor mapping 1:1 to VM instructions — **custom React editor** (not Blockly) per owner
      decision: lean bundle, fully verifiable, fits the v0 AST. The AST is the stable contract, so we can
      adopt Blockly later (when the language grows) with no VM/compiler changes. See note below.
- [x] Program editor panel: palette (add-block dropdown) · canvas (nested block tree with reorder/delete/
      param edits) · **Run** (compiles the edited AST onto the robot's VM via `FrameInput`). *Step/pause/
      slow-mo (design §9.8) deferred to debugging-tools v1.*
- [x] Debug v0: live **highlight of the executing block** (compiler tags each instr with a source path;
      editor highlights the block at the program counter) + a trace strip (status · op · pc · battery)

**Loop closure**
- [x] Build Robot-02 at the assembler from refined materials *(spawns running the default miner)*
- [x] Assign/author a program for Robot-02 — click the robot → edit its blocks → **Run** to recompile
- [x] **Milestone 1: First Autonomous Robot** — the player can now author/edit a robot's program and watch
      it mine autonomously (default miner provides instant payoff; the editor delivers the authoring)
- [x] Onboarding script for the first 10 minutes (design §12.3): FORGE guides mine → refine → build →
      program as progress-detecting prompts (pure UI reading store stats), with a highlighted Build button,
      Skip, and a replay pill; completion remembered in localStorage

**Persistence**
- [x] Save/load via IndexedDB (world + program ASTs + versioning) — pure (de)serialization in
      `sim/save.ts` (Maps/Sets ⇄ arrays; VM stored as AST + runtime, `code` recompiled on load), DOM IO
      in `persist/db.ts`. Versioned (`SAVE_VERSION`); loads in place so the running loop/renderer keep
      their world reference. **Round-trip verified deterministic** (serialize→load→tick matches keep-ticking)
- [x] Export/import save-to-file (download pretty JSON / read + validate a `.json` save)

## Phase 3+ — Alpha / Beta / 1.0 🗺️ (high-level, expanded when reached)

- [ ] **Alpha:** full control flow (`While`/`ForEach`), variables, Tech Tree v1, T1 resources + energy grid, debugging tools v1, PWA/offline
- [ ] **Alpha:** subroutines + shared library (the mid-game reuse hook)
- [ ] **Beta:** comms/shared memory + swarm coordination, self-replication, offline simulation, T2–T3 content
- [ ] **Beta:** revisit adversity decision per playtest data (design §13.5) — peaceful mode toggle if enemies added
- [ ] **1.0:** T4 content, art/audio polish, accessibility, balance pass, scenarios/challenges

---

## Architecture decisions & notes
- **Program editor is a custom React structured editor, not Blockly** (owner decision). Rationale: the
  v0 instruction set is tiny, the editor edits the `BlockProgram` AST directly (so invalid programs are
  hard to build), the bundle stays lean, and it's fully verifiable now. **The AST is the stable
  contract** — the VM/compiler don't care what produced the program — so swapping in Blockly later (when
  the language grows: `While`/`ForEach`/variables/subroutines) is contained and needs no VM changes.
  Editor edits are immutable, path-addressed ops (`ui/programEdit.ts`); the compiler tags each instruction
  with its source path (`vm/source.ts`) so the editor can highlight the block at the program counter.
- **Selection + editor↔sim bridges:** clicking a programmable robot in the world selects it (PixiStage
  hit-tests `world.vm` before falling back to a move order). The editor reads the robot's AST via a
  `getRobotProgram` store bridge (deep-cloned) and applies edits via `applyProgram`, which routes through
  `FrameInput.programApplies` → `applyInput` recompiles the VM and resets it clean (same one-way UI→sim
  flow as build requests). Live debug is computed in PixiStage's `onStats` (`robotDebugInfo`) for the
  selected robot and pushed to the store.
- **Robot VM drives the same ECS components player input does.** Blocking actions (`mine`/`navigateTo`/
  `deposit`/`wait`) are *dispatched* once (set the `mining`/`movement.target`/`depositOrder` component),
  then the VM **yields and polls** for completion on later ticks — so robots reuse the existing
  movement/mining/deposit systems *and* their renderer FX for free. The interpreter is a flat
  program-counter machine (control flow compiled to jumps) with a per-tick **cycle budget** (Logic Core
  clock) and **energy** debited per instruction. Leaf expressions (sensing/conditions) are evaluated
  inline rather than via a value stack — fine for v0's tiny expression set; a value stack is the growth
  path when variables/arithmetic arrive (Alpha).
- **Energy is real but recharge is a placeholder.** Robots have a battery the VM debits; passive regen
  (`energySystem`, 6/s) keeps autonomous robots from stranding until real charging (pads/grid) lands with
  the Energy task. A well-conditioned program stays topped up; a uselessly spinning one drains and blocks.
- **Built robots ship with a baked-in default program** (`vm/programs.ts` miner) so the VM is
  demonstrable before the Blockly editor exists. The editor will let players author/replace it per robot.
- **Determinism is load-bearing and now checked** (`vm/determinism.ts`): runs the same scenario twice and
  compares a full state fingerprint. Runs in DEV at startup; also runnable headlessly with `npx tsx`.
- **Colony stockpile for refined goods** (`World.stockpile`): the Refinery emits into it and the
  Assembler draws from it, so refined materials don't have to be hand-hauled between the two buildings
  (raw ore still is — that's the manual loop). A deliberate MVP simplification of inter-building
  logistics (design §6.4 stockpiles; §13.3 abstracted logistics); revisit when conveyors/drone-routes land.
- **UI → sim input bridge:** HUD buttons can't reach the sim's `FrameInput` directly (the HUD only reads
  the store). PixiStage registers a `requestBuild` callback into the store that pushes onto
  `FrameInput.buildRequests`; the sim drains it each tick. Keeps the one-way data flow (sim never reads
  the store) while letting React controls enqueue intent.
- Scaffold keeps the world/loop/renderer co-located in the render component for now; **moving the sim
  into a Web Worker is a tracked Phase 2/3 task** (design §15.4), not done yet.
- `dist/` is gitignored and built by CI; never commit build output.
- `public/.nojekyll` is copied to `dist/` so Pages serves `_`-prefixed asset folders.
- Vite `base` MUST exactly match the repo name `RobotGame` (case-sensitive) or assets 404 on Pages.

---

## Progress Log

### 2026-06-18
- **Phase 0 complete.** Repo created, Pages live, placeholder deployed & verified (HTTP 200).
- **Phase 1 complete.** Scaffolded Vite + React + TS + Pixi v8 + Zustand. Production build green
  (750 modules, ~120 KB gzip main). Deploy workflow switched to `npm run build` → `dist/`; built app
  verified live at https://ryanmathewson.github.io/RobotGame/ (index + hashed JS bundle both HTTP 200).
  Created this tracking doc. **Next: Phase 2 — ECS-lite model, then the robot VM.**
- Added `CLAUDE.md` capturing dev practices (layer boundaries, determinism rule, Pages constraints,
  build-as-correctness-gate, keep this tracker updated).
- **Phase 2 started.** Converted the sim to an ECS-lite model (entity ids + component stores in
  `sim/world.ts`, `sim/components.ts`; systems in `sim/systems.ts`). Added player input as data
  (`sim/input.ts`) consumed by the sim, with **click-to-move + WASD/arrows** control. Renderer now
  reads ECS stores, styles the player robot distinctly, and shows a destination marker; HUD shows
  live robot position. Build green. **In-browser confirmed:** click-to-move and WASD/arrows both work.
- **Mining added.** New `Cargo` + `Mining` components and a `miningSystem`. Click intent now flows to the
  sim as a raw `clickTile`; the sim decides mine-vs-walk-vs-move (keeps all game logic deterministic).
  Clicking a node within range starts mining (continues until the player moves); cargo fills, nodes
  deplete/shrink and despawn at zero. Renderer shows a mining beam + pulsing ring and node depletion;
  HUD shows cargo + status. Build green. **In-browser confirmed.**
- **Mining UX refined** (per user): a node click is now a *mine order* — robot walks over and auto-mines
  on arrival (one click), continuing until interrupted. Build green.
- **Cargo-full feedback** (per user): full cargo now *holds* the mining order (robot is "blocked",
  design §8.3) instead of silently cancelling, and surfaces a HUD reminder toast ("Cargo full — mining
  paused…") via the sim→loop→store path; mining beam turns red while blocked. Auto-resumes once cargo
  is freed (after Deposit lands). Build green.

### 2026-06-19
- **Deposit + Refine added** (closes "a place to put the ore"). New `Cargo`/`DepositOrder`/`Refinery`
  components; central 2×2 Refinery spawned at world center. Clicking the Refinery issues a deposit
  order: the robot hauls cargo over (`depositSystem`) and unloads it into the refinery's input buffer.
  `refinerySystem` then processes one batch at a time from data-driven recipes (new `data/recipes.ts`:
  iron→iron_ingot, scrap→carbon, silica→glass), consuming inputs and emitting refined output after the
  recipe's `seconds`. Determinism preserved (no wall-clock/RNG; recipes iterated in fixed order).
- Renderer draws the Refinery (gear glyph + live batch progress bar). HUD gains a Refinery panel
  (idle/processing, input queue size, refined-output tally) via new loop→store stats
  (`refined`/`refineryQueue`/`refineryBusy`). New refined item defs + colors in `data/resources.ts`.
  `npm run build` green (754 modules, ~123 KB gzip main). **Next: Assembler, then the robot VM.**
- **Assembler added** — closes the **mine → refine → build a robot** chain. Introduced a colony-wide
  refined `stockpile` on the world; the Refinery now emits into it (dropped the Refinery's local
  `output` buffer) and the new Assembler draws from it. New `Assembler` component (FIFO `queue` +
  `active`/`progress`), data-driven `ASSEMBLE_RECIPES` (`worker_mk1`: 5 iron_ingot + 2 carbon → a
  Worker Mk1 robot, 6s) and an `AssembleOutput` union (stockpiled item *or* spawned robot).
  `assemblerSystem` consumes inputs when affordable, builds over time, then spawns the robot beside the
  assembler (idle, non-player — awaiting a program). Added generic `ItemMap` helpers
  (`addItem`/`hasItems`/`takeItems`) in `components.ts`.
- Wiring: `FrameInput.buildRequests` carries build intent; HUD **Build** buttons (disabled unless
  affordable) push via a `requestBuild` store callback registered by PixiStage. Renderer draws the
  Assembler (robot glyph + progress bar) alongside the Refinery via shared `machineBox`/`progressBar`
  helpers. HUD reworked: Stockpile readout + Assembler panel; 4th stat now a live **Robots** count
  (ticks up when a build completes). `npm run build` green (754 modules, ~124 KB gzip main).
  **Next: the robot VM — turn `Mine`/`Deposit`/`NavigateTo` into VM instructions and program the
  Worker Mk1.**
- **Robot VM landed — the core fantasy is now real.** New `src/game/vm/`: `ast.ts` (block program tree),
  `compiler.ts` (AST → flat bytecode with jumps), `interpreter.ts` (`vmSystem` + `energySystem`,
  PC machine with cycle budget + energy), `programs.ts` (default autonomous miner), `determinism.ts`
  (DEV self-check). New `Energy` component + `vm`/`energy` stores; `spawnRobot` accepts a `program` and
  attaches a compiled VM + battery. `vmSystem` runs before the action systems in `tickWorld` so a
  program's component writes are carried out the same tick; `energySystem` regens after. Assembler-built
  robots now spawn **running the miner** (mine nearest node → deposit at refinery → repeat).
- Renderer draws a status pip over autonomous robots (green=running / amber=blocked / red=error); HUD
  gains a **Fleet** panel (running/blocked counts + lead robot battery %) via a new `fleet` loop stat.
- **Bug found & fixed during verification:** the interpreter dispatched a blocking action but never set
  `waiting`, so it re-dispatched every tick (robot stuck mining a full cargo, never depositing, draining
  energy). Caught by tracing the headless run; one-line fix (set `waiting` on `block`). After the fix the
  headless trace shows the full mine→deposit→refine loop producing ingots, energy stable. Determinism
  check **PASS** (byte-identical across two runs). `npm run build` green (758 modules, ~125 KB gzip main).
  **Next: the Blockly editor so players author programs.**

### 2026-06-19 (cont.) — Program editor → **Milestone 1 reached**
- **Owner decision:** build a **custom React block editor** instead of Blockly (lean/verifiable/fits the
  v0 AST; AST is the stable contract so Blockly remains a cheap future swap). See architecture note.
- **Editor:** `ui/ProgramEditor.tsx` — a right-side panel showing the selected robot's program as a nested
  block tree. Add blocks from a palette dropdown, reorder (↑/↓), delete (×), and edit params (target/
  condition selects, wait seconds, if `not`). **Run** compiles the edited AST onto the robot's VM.
  Immutable path-addressed edit helpers in `ui/programEdit.ts`.
- **Debug v0:** the compiler now tags every instruction with a **source path** (`vm/source.ts`); the
  editor highlights the block currently at the program counter and shows a trace strip (status · op ·
  pc/len · battery). `robotDebugInfo` (interpreter) produces the snapshot; PixiStage computes it for the
  selected robot each stats tick.
- **Wiring:** click a programmable robot to select it (PixiStage hit-tests `world.vm`); world draws a
  selection ring. New `FrameInput.programApplies` carries edited programs into the sim, drained by
  `applyInput` (recompile + reset, clearing any in-flight action). `Vm` now stores its source `ast`
  alongside compiled `code`; `createVm` takes the AST and compiles. New store fields `selectedRobot`/
  `robotDebug` + `getRobotProgram`/`applyProgram` bridges.
- **Verified headlessly** (`npx tsx`): edit helpers produce valid compilable programs (incl. nested
  inserts, move/remove); applying via the input channel swaps the AST, resets pc, clears in-flight
  actions; `robotDebugInfo` tracks the PC across blocks. Determinism still **PASS**. `npm run build` green
  (761 modules, ~128 KB gzip main). **MVP now only lacks onboarding + save/load.**

### 2026-06-19 (cont.) — Save / load + export / import
- **Pure (de)serialization** in `game/sim/save.ts` (DOM-free, part of the sim): the World's component
  Maps/Sets ⇄ arrays into a versioned `SaveData` (`SAVE_VERSION = 1`, timestamp). Robot VMs are saved as
  their source **AST + runtime fields** (pc/status/waiting/…); `code` is recompiled on load (deterministic
  compile ⇒ pc stays valid), keeping saves clean per design §15.5. `loadInto` restores **in place** so the
  running loop/renderer keep their world reference.
- **DOM IO** in `persist/db.ts`: IndexedDB (`cogworks`/`saves`, slot `auto`) for Save/Load; `downloadSave`/
  `readSaveFile` for Export/Import (validates it's a Cogworks save). UI: `ui/SaveControls.tsx` toolbar
  (bottom-left) with Save/Load/Export/Import + a transient status; bridges registered by PixiStage close
  over the live world. After a load, transient input + selection are cleared.
- **Renderer fix:** `drawRobots` now prunes graphics for entities that no longer exist, so loading a save
  (which swaps entity ids) doesn't leave orphaned robots on screen.
- **Verified headlessly:** serialize → JSON round-trip → `loadInto` a fresh world matches the source at the
  snapshot tick, and the two worlds stay **byte-identical after +250 more ticks** — save/load is
  deterministic. Determinism self-check still **PASS**. `npm run build` green (764 modules, ~129 KB gzip
  main). **MVP now only lacks onboarding.**

### 2026-06-19 (cont.) — Onboarding → **MVP vertical slice complete** 🎉
- **FORGE onboarding** (`ui/OnboardingOverlay.tsx`): a 4-step guided first run — mine → refine → build →
  program — as short in-character prompts that **auto-advance when progress is detected**. Pure UI: it
  reads the same store snapshots the HUD does (cargo / stockpile / fleet count / selection), so the sim
  stays untouched. Conditions are monotonic (later progress satisfies earlier steps), so out-of-order play
  doesn't get stuck. Includes a highlighted **Build** button (new `tutorialHint` store field → pulsing
  HUD class), a Skip, a completion card (Milestone 1 payoff), and a replay pill; completion is remembered
  in `localStorage`.
- **The MVP vertical slice (design §17.1) is now playable end-to-end** and the core fantasy — *program a
  robot to work for you* — is real: hand-mine → refine → build a Worker Mk1 → click it → edit its block
  program → Run → watch it mine autonomously, with live block highlighting; save/load + export/import
  persist it all. `npm run build` green (765 modules, ~130 KB gzip main).
- **Remaining before "1.0 of the slice":** play-test for *fun* (the MVP's actual purpose), then Alpha
  (full control flow, variables, real energy grid, tech tree). Deferred from MVP by design: tile world +
  camera pan/zoom, PWA/offline.

### 2026-06-19 (cont.) — Play-test balance pass (live)
First live play-test surfaced two issues: refined goods accrued too easily (near-1:1), and the loop ended
quickly (small map, few deposits). Batch of tuning + small features:
- **Economy:** refining is now **100 raw → 1 refined** (was 2:1/3:1) so refined goods are earned and the
  refinery — not mining — is the throughput bottleneck. Node deposits **200 → 2000** (required, else total
  iron < one robot's cost). **Worker Mk1 cargo 25 → 100** so a full haul = exactly one refinery batch.
- **More world:** map **28×18 → 52×32**; the renderer now **auto-fits the view to the window** (root
  container scaled, click→tile inverse adjusted) so the larger map stays fully visible/reachable without a
  camera. **Deposits 5 → 20** (~40k raw total), placed by a **deterministic** PRNG scatter (iron-weighted,
  spaced out, clear of the build cluster) plus 3 starter nodes near spawn.
- **Inventory visualization:** a cargo fill bar under every robot (fills by load, red when full) + a
  `📦 used/capacity` + item breakdown line in the editor's debug strip (`RobotDebug` gains cargo fields).
- **Verified headlessly:** world gen = 20 nodes / 40k raw, no overlaps/out-of-bounds/cluster collisions;
  VM determinism + save round-trip still **PASS**. `npm run build` green. Pushed live.
