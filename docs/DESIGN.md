# Cogworks — Game Design Document

> Working title: **Cogworks** (alt: *Autoforge*, *Loopworks*, *Spark & Gear*)
> Version: 0.1 (draft)
> Owner: Design
> Status: Pre-production / concept

---

## 1. High Concept

**Cogworks is a browser-based automation game where you don't just build factories — you *program* the robots that run them.**

You begin as a single robot on a barren world, mining ore by hand. You refine that ore, build a second robot, and then you teach it to mine for you using drag-and-drop programming blocks (`navigate to`, `interact with`, `if`, `loop`, …). Each robot you program frees you to design the next, more capable one. Progress is measured not by how much you click, but by how good your *programs* are.

The fantasy: **you are the architect of an autonomous robot civilization, and your real skill is logic.**

### Elevator pitch
> Factorio meets Scratch. Mine, refine, and build robots — then program their behavior with visual code blocks. The better your loops and conditionals, the more your colony automates itself. A tech tree unlocks new materials, instructions, and robot chassis as you climb from hand-mining to a fully self-replicating machine economy.

---

## 2. Design Pillars

These four pillars are the lens for every feature decision. If a feature doesn't serve a pillar, cut it.

1. **Programming *is* the gameplay.** The core verb is not "click to mine" — it's "write a behavior that mines." Automation is authored, not purchased. Buying an "auto-miner" upgrade would violate this pillar; *programming a robot to mine* honors it.
2. **Legible systems.** Every resource, recipe, instruction, and energy cost is inspectable and deterministic. Players should be able to reason about *why* their colony behaves as it does. No hidden RNG in core loops.
3. **Earned complexity.** The player starts with two instruction blocks and three resources. Complexity unlocks through the tech tree at the pace the player chooses. A new player is never shown the whole instruction set at once.
4. **The colony runs without you.** A well-programmed colony should make progress while the tab is closed (bounded offline simulation). The player's job trends from *operator* to *manager* to *legislator*.

---

## 3. Target Audience & Platform

| Attribute | Decision |
|---|---|
| **Platform** | Web (desktop-first, responsive down to tablet). Playable in a single browser tab, no install. |
| **Primary audience** | Players of automation/incremental games (Factorio, Shapez.io, Opus Magnum, Universal Paperclips) and people who enjoy puzzle-programming (Zachtronics titles, Human Resource Machine, Scratch). |
| **Secondary audience** | Educators / learners — the visual programming maps cleanly to real CS concepts (sequence, selection, iteration, functions, variables). |
| **Session length** | Designed for both 5-minute check-ins (tweak a program, collect output) and multi-hour design sessions. |
| **Difficulty stance** | Approachable onboarding, deep ceiling. No fail states in the base mode; "failure" is an inefficient program, which is recoverable. |
| **Monetization** | See §16. Base game is the focus; monetization is a later, optional layer. |

---

## 4. Core Gameplay Loop

### 4.1 The macro loop
```
        ┌─────────────────────────────────────────────────────┐
        │                                                     │
        ▼                                                     │
   COLLECT  ──►  REFINE  ──►  BUILD ROBOTS  ──►  PROGRAM  ──►  AUTOMATE
   resources     into         & parts          behavior       (loop tightens:
   (manual or    materials                     with blocks    robots now do the
   automated)                                                 collecting/refining)
        ▲                                                          │
        │                                                          │
        └────────────  UNLOCK (tech tree) ◄────────────────────────┘
              new materials, instructions, chassis, upgrades
```

Each pass through the loop should make the *next* pass cheaper in player effort and richer in capability. The win condition of any given stage is: "I no longer have to do this part by hand."

### 4.2 The moment-to-moment loop (early game)
1. Player directly controls Robot-01 (WASD / click-to-move).
2. Moves to an ore deposit, issues `Mine`. A progress bar fills; ore enters cargo.
3. Returns to the **Refinery**, deposits ore; refinery converts ore → ingots over time.
4. Spends ingots at the **Assembler** to build Robot-02 (a chassis + basic modules).
5. Opens the **Program Editor** for Robot-02, drags blocks to script "go to nearest ore → mine until full → return to refinery → deposit → repeat."
6. Hits **Run**. Robot-02 now mines autonomously. Player returns to controlling Robot-01 to do something new (scout, build, gather a new resource).

### 4.3 The mid-game loop
- The player rarely drives a robot manually. Instead they: diagnose a stalled robot (read its execution trace), refactor a program, define a reusable **Subroutine** (function), and provision robots with the right modules for a job.
- Bottlenecks shift from "I don't have enough robots" to "my logistics program is inefficient" — e.g., robots colliding at the refinery, or a loop that wastes energy.

### 4.4 The late-game loop
- The player designs **robots that build and program other robots** (self-replication), governed by high-level policy programs ("maintain a fleet of 8 miners; if iron stockpile < 500, build another miner").
- Gameplay becomes systems design and optimization: throughput, energy budgets, fault tolerance.

---

## 5. Setting & Narrative (light-touch)

Narrative is **minimal and ambient** — it frames the systems without gating them behind cutscenes.

- **Premise:** You are **CORE**, the boot-strapping intelligence of a colony seed-pod that crash-landed on **Cinder-7**, a resource-rich but lifeless world. Your manufacturing seed survived; your robot army did not. You must rebuild from a single salvage unit.
- **Voice:** A dry, helpful onboard AI ("FORGE") delivers tutorials and tech-tree flavor text. Think Portal's wit dialed back to "competent mission control."
- **Arc (optional, unlockable lore):** As you expand, you uncover ruins of a *previous* automated colony that collapsed — a cautionary thread about runaway automation that pays off thematically with the self-replication tech. Pure flavor; never blocks play.
- **Tone:** Optimistic tinkerer energy. Bright, clean, "competent machines doing satisfying work."

---

## 6. Resources & Economy

### 6.1 Resource tiers
Resources are grouped into tiers that gate progression. Each tier introduces a new mechanic, not just bigger numbers.

| Tier | Raw resources | Refined into | New mechanic introduced |
|---|---|---|---|
| **T0 – Surface** | Scrap, Iron ore, Silica | Iron ingots, Glass | Basic refining (1 input → 1 output) |
| **T1 – Powered** | Copper ore, Coal | Copper wire, Carbon, **Power cells** | Energy economy; multi-input recipes |
| **T2 – Electronic** | Silicon (from Silica), Gold trace | **Circuits**, Sensors | Component assembly (recipes with components) |
| **T3 – Advanced** | Titanium ore, Rare earths | Alloys, **Logic cores** | Quality/purity stat; refining yield matters |
| **T4 – Exotic** | Crystalline flux, Isotopes | Flux capacitors, **Quantum cores** | Unstable resources (decay over time) |

### 6.2 Resource attributes
Every resource stack carries:
- **Type** (e.g., Iron ore)
- **Quantity**
- **Purity / Quality** (0–100%, introduced at T3): higher purity = better refine yield and required for high-tier recipes. Encourages programming robots to selectively mine richer deposits.

### 6.3 Energy — the unifying constraint
Energy is the spine of the economy and the reason programming *efficiency* matters.

- **Robots consume energy** to move, mine, and **to execute instructions** (see §9.6 — every block has a cycle/energy cost).
- Energy is produced by **Generators** (burn Coal → power, T1) and later **Solar arrays** and **Flux reactors**.
- Energy is stored in **Power cells** and distributed via a **grid** (robots recharge at charging pads).
- **Design tension:** a sloppy program that loops uselessly drains energy; an elegant program does the same work for less power. This makes "clean code" mechanically rewarding rather than just aesthetically nice.

### 6.4 Storage & logistics
- **Stockpiles / containers** hold resources at locations.
- Robots transport between locations as directed by their programs.
- Mid-game unlock: **Conveyor / drone-route** infrastructure for passive logistics, reducing reliance on transport-bots for high-volume lanes (an optimization choice, not a requirement).

---

## 7. Production Chains (Refining & Assembly)

### 7.1 Buildings
| Building | Function | Notes |
|---|---|---|
| **Refinery** | Raw resource → refined material over time | Upgradable: speed, batch size, parallel recipes |
| **Assembler** | Materials + components → parts / modules / robots | Recipe-driven; the "factory floor" |
| **Generator / Power plant** | Fuel → energy | Energy source for the grid |
| **Charging pad** | Recharges robots | Robots route here when low |
| **Research lab** | Generates **Research Points** by consuming refined materials / data | Drives the tech tree (§10) |
| **Programming console** | Where the player authors robot programs | The "IDE" hub |

### 7.2 Example production chain (early game)
```
Iron ore  ──(Refinery)──►  Iron ingot  ──┐
                                          ├──(Assembler)──►  Chassis Frame
Copper ore ──(Refinery)──► Copper wire  ──┘
                                          
Iron ingot + Copper wire + Silicon ──(Assembler)──► Basic Sensor
Chassis Frame + Basic Sensor + Power cell ──(Assembler)──► Robot-02
```

Recipes are **data-driven** (see §15.3) so designers can tune/add chains without code changes.

---

## 8. Robots

Robots are the player's units and the canvas for programming. A robot = **Chassis** + **Modules** + **a Program**.

### 8.1 Chassis (the frame)
Chassis tiers define base capabilities. Better chassis are tech-gated and resource-expensive.

| Chassis | Module slots | Cargo | Speed | Energy cap | Notes |
|---|---|---|---|---|---|
| **Salvage Unit** (starter) | 2 | 10 | Slow | Low | The robot you start with; can be upgraded |
| **Worker Mk1** | 3 | 25 | Medium | Medium | Workhorse; cheap to mass-produce |
| **Hauler** | 2 | 100 | Slow | Medium | Logistics specialist |
| **Scout** | 2 | 5 | Fast | Low | Exploration / sensing |
| **Constructor** | 4 | 25 | Medium | High | Can build/repair structures and *other robots* |
| **Arbiter** (late) | 6 | 50 | Medium | Very high | Runs complex policy programs; can command other robots |

### 8.2 Modules (the upgrades / abilities)
Modules occupy slots and **grant the instructions a robot is allowed to run**. This is the key link between hardware and software: *a robot can only execute blocks its modules support.* You can't `Mine` without a Mining Drill module.

| Module | Grants instruction(s) | Notes |
|---|---|---|
| **Mining Drill** | `Mine` | Tiered: faster mining, can mine harder ore |
| **Cargo Bay** | `Pickup` / `Drop` / `Deposit` | Increases cargo capacity |
| **Optical Sensor** | `ScanFor`, `NearestOf` | Range upgradable; required for "find" logic |
| **Manipulator Arm** | `InteractWith`, `Build`, `Repair` | Enables construction tasks |
| **Locomotion Upgrade** | faster `NavigateTo` | Movement speed/energy efficiency |
| **Logic Core** | unlocks more **program length / variables / subroutines** | The "RAM/CPU" — see §9.7 |
| **Comms Array** | `Send` / `Receive` messages, read shared state | Enables multi-robot coordination |
| **Battery Extender** | larger energy cap | Longer autonomous runtime |

> **Design consequence:** Programming and hardware are co-designed. A clever program is useless if the robot lacks the module to act on it, and a fully-loaded robot is wasted without a good program. This creates a satisfying two-axis optimization (build *and* code).

### 8.3 Robot stats (surfaced in UI)
- Energy (current/max), Cargo (current/max), Speed, Sensor range
- **Program status:** Idle / Running / Blocked / Error, current instruction, energy/sec draw
- **Execution trace** (debugger): step-through of the last N executed instructions

---

## 9. The Programming System — *the heart of the game*

This is the differentiator and deserves the deepest design. The goal: **a visual programming language that is genuinely expressive, teaches real CS concepts, and is fun to optimize — while staying approachable.**

### 9.1 Model: block-based visual programming
- **Drag-and-drop blocks** snapping into a vertical sequence (Scratch/Blockly-style), chosen over text to lower the barrier and avoid syntax-error frustration.
- Blocks have **typed connectors** (statement blocks stack; value blocks plug into slots) so invalid programs are hard to construct — errors are caught at edit time, not runtime.
- Each robot has **one program** (its "behavior"). Programs can call **Subroutines** (see §9.5) shared across robots via a library.

### 9.2 Instruction categories
Instructions unlock through the tech tree. Players start with only **Movement** and **Action** basics.

**A. Movement**
- `NavigateTo(target)` — target = coordinate, named location, or a value (e.g., result of `NearestOf`)
- `MoveDirection(dir, distance)`
- `Patrol(waypoints)` *(unlock)*

**B. Actions** (gated by modules, §8.2)
- `Mine(target)`
- `Pickup(item)` / `Drop(item)` / `Deposit(container)`
- `InteractWith(object)` — generic "use" (lever, machine, door)
- `Build(blueprint)` / `Repair(target)` *(Constructor)*
- `Wait(duration)`

**C. Sensing** (gated by Optical Sensor)
- `ScanFor(type)` → returns list
- `NearestOf(type)` → returns target
- `DistanceTo(target)` → number
- `Read(stat)` — own energy, cargo, position
- `Read(container.amount)` — query a stockpile

**D. Control flow** — *the programming pillar*
- `If (condition) / Else`
- `While (condition)` / `Repeat (n)` / `ForEach (item in list)`
- `Loop` (infinite — the default top-level wrapper for autonomous behavior)
- `Break` / `Continue`
- `Wait Until (condition)`

**E. Logic & math** (value blocks)
- Comparisons `=, ≠, <, >, ≤, ≥`
- Boolean `AND / OR / NOT`
- Arithmetic `+ − × ÷ mod`
- Literals & **Variables** (§9.4)

**F. Data & variables**
- `Set variable = value` / `Change variable by n`
- Lists: `length`, `item at`, `append`
- **Robot memory** (per-robot variables) and **Shared memory** (colony-wide blackboard, requires Comms Array)

**G. Communication** (gated by Comms Array)
- `Send(message, toRobotOrChannel)`
- `OnReceive(message) → handler`
- `Claim(resource)` / `Release(resource)` — simple mutual exclusion so robots don't fight over the same deposit

### 9.3 Example program (early game, "autonomous miner")
```
Loop:
    target = NearestOf(IronOre)
    If (target exists):
        NavigateTo(target)
        While (cargo < cargoMax) AND (target has ore):
            Mine(target)
        NavigateTo(Refinery)
        Deposit(all)
    Else:
        NavigateTo(Base)
        Wait(2s)
```

### 9.4 Variables & memory
- **Local variables** scoped to a program/subroutine.
- **Robot memory:** persistent per-robot store (e.g., "home refinery = X").
- **Shared blackboard:** colony-wide key/value store for coordination (e.g., a queue of mining targets). Reading/writing it costs a Comms instruction and is the basis for swarm behavior. Gated late to keep early game simple.

### 9.5 Subroutines (functions) — reuse & the "aha"
- Players define named, parameterized **Subroutines** (e.g., `GoMine(oreType)`), stored in a **shared library**.
- Any robot's program can `Call(subroutine, args)`. Updating a subroutine updates behavior everywhere it's used — teaching DRY/abstraction organically.
- This is the moment the game's depth opens up: players build a personal library of reliable behaviors and compose them.

### 9.6 Execution model & costs (where balance lives)
- Programs run on a **virtual tick** (e.g., the sim advances N ticks/sec; each robot executes up to *k* instructions per tick where *k* scales with its **Logic Core** tier — its "clock speed").
- **Every executed instruction has an energy cost and a cycle cost.** Heavy blocks (`ScanFor` across a wide radius) cost more than cheap ones (`Set variable`).
- **Consequences that make programming matter:**
  - Tight, well-conditioned loops use less energy and accomplish more per second.
  - A robot that `ScanFor`s every tick when it doesn't need to will drain its battery and underperform an identical robot with a smarter program.
  - This turns "optimize your code" into a *measurable in-game advantage* (throughput per joule), not just a nicety — directly serving Pillar 1.
- **Determinism:** given the same world state and program, execution is deterministic (Pillar 2), which also makes the offline simulation (§13.3) tractable.

### 9.7 Program-size limits as a resource
- A robot's **Logic Core** tier caps: max program length (block count), number of variables, and subroutine call depth.
- Upgrading the core is a meaningful investment, and the *constraint* creates puzzle-like pressure to write compact, elegant programs (Zachtronics-style optimization without a hard fail state).

### 9.8 Debugging tools (first-class, not an afterthought)
- **Step / pause / slow-mo** execution on a selected robot.
- **Live highlight** of the currently executing block.
- **Execution trace / log** with per-instruction energy cost.
- **Watch panel** for variables and sensor readings.
- **Visual "blocked" indicators** in the world (a robot stuck waiting shows why on hover).
> Good debugging UX is essential: when behavior is authored, *understanding* behavior is the primary skill, and frustration here would sink the game.

### 9.9 Why blocks, not text? (decision record)
- **Pro blocks:** no syntax errors, lower barrier, great for education audience, mobile/tablet friendly, visually distinctive.
- **Con:** ceiling can feel limiting to programmers; large programs get unwieldy.
- **Decision:** Ship block-based. Mitigate the ceiling with **subroutines**, **collapsible blocks**, and a **late-game "compact view."** *Stretch:* an optional text-mode (a small DSL) that round-trips with blocks for advanced players (see §18).

---

## 10. Tech Tree (Progression Backbone)

The tech tree gates **materials, instructions, modules, chassis, and buildings** — pacing the "earned complexity" pillar.

### 10.1 Structure
- A **directed acyclic graph** of nodes. Nodes are researched at the **Research Lab** by spending **Research Points (RP)** + sometimes a material cost.
- RP is generated by consuming refined materials/data (so research competes with building for resources — a real trade-off).
- Branches let players specialize their playthrough's order, but the graph converges on key milestones.

### 10.2 Branches
1. **Materials & Refining** — unlock T1→T4 resources, purity processing, higher refinery throughput.
2. **Robotics** — new chassis, more module slots, faster locomotion.
3. **Logic / Software** — *the signature branch*: new instruction blocks (`If` → `While` → `ForEach` → subroutines → comms → shared memory), bigger Logic Cores, debugging upgrades.
4. **Energy** — generators → solar → flux reactors; battery and grid efficiency.
5. **Automation Infrastructure** — conveyors, drone routes, auto-builders, self-replication.

### 10.3 Sample tech progression (vertical slice)
```
[Start] Hand Mining, NavigateTo, Mine, Loop
   │
   ├─► Basic Refining ─► Copper Processing ─► Circuits ─► Sensors
   │
   ├─► Conditional Logic (If/Else) ─► Iteration (While/Repeat)
   │        │
   │        └─► Subroutines ─► Shared Memory ─► Swarm Coordination
   │
   ├─► Worker Mk1 chassis ─► Constructor chassis ─► Self-Replication
   │
   └─► Coal Generator ─► Power Grid ─► Solar Arrays
```

### 10.4 Milestone gates (the "boss fights" of an automation game)
Designed to give the open progression shape and clear goals:
1. **First Autonomous Robot** — program a robot to mine without you. (Teaches `Loop` + `NavigateTo` + `Mine`.)
2. **The Self-Sustaining Refinery** — robots keep the refinery fed indefinitely. (Teaches conditionals + logistics.)
3. **The Constructor** — a robot that builds structures. (Teaches `Build` + blueprints.)
4. **Self-Replication** — a robot that builds *and programs* another robot. (The thematic climax; teaches subroutines + policy.)
5. **The Autonomous Colony** — a policy program maintains the whole colony hands-off for a sustained period. (Endgame mastery check.)

---

## 11. Upgrades Summary

Upgrades come in three flavors, each tied to a pillar:
- **Hardware upgrades** (modules/chassis): expand *what* a robot can do (more actions, slots, cargo, speed).
- **Software upgrades** (instructions/Logic Core): expand *how cleverly* it can do it (control flow, variables, program length).
- **Infrastructure upgrades** (buildings/grid): expand *throughput and passive automation*.

The interesting decisions come from these being **on different resource budgets competing for the same materials**, forcing players to choose between a bigger fleet, smarter robots, or faster factories.

---

## 12. UI / UX

### 12.1 Primary views
1. **World View** — top-down/isometric map of the colony; robots, buildings, resource nodes. Direct-control and selection happen here.
2. **Program Editor** — the block IDE; opens for a selected robot or a subroutine. Split-pane: palette (left) · canvas (center) · debug/watch (right).
3. **Tech Tree View** — graph of research nodes with costs and previews.
4. **Build Menu** — place buildings, queue robots/parts at the assembler.
5. **Colony Dashboard** — at-a-glance stats: resource stockpiles, energy grid load, fleet status, throughput graphs.

### 12.2 UX principles
- **Progressive disclosure:** the palette only shows unlocked blocks; advanced panels are hidden until relevant (Pillar 3).
- **Always inspectable:** click anything to see its stats, recipe, or program (Pillar 2).
- **Readable at a glance:** robots visually signal state (mining animation, "blocked" icon, low-energy pulse).
- **Forgiving:** edits are non-destructive (undo/redo, program versioning); experiments are cheap.
- **Keyboard + mouse first** (desktop), with touch-friendly fallbacks for tablet.

### 12.3 Onboarding
- A guided **first 10 minutes** scripted by FORGE: mine by hand → refine → build Robot-02 → write your first 3-block loop → watch it run. The "first autonomous robot" milestone is the onboarding's payoff and the hook.
- Tutorials are **interactive tooltips and highlighted targets**, not walls of text. Each new instruction unlock comes with a tiny optional "challenge" that teaches it.

---

## 13. Progression, Balancing & Pacing

### 13.1 The effort curve
The defining metric: **player actions-per-unit-progress should decrease over time** as automation takes over. Early game is hands-on; late game is hands-off design. If players feel *more* burdened over time, balancing has failed.

### 13.2 Anti-grind levers
- Costs scale, but so does automation capacity — net manual effort stays flat or falls.
- No artificial timers/energy-to-play; "waiting" is always convertible into "program better."
- Soft catch-up: returning after a break, a well-programmed colony has *produced* (offline sim), rewarding good design rather than punishing absence.

### 13.3 Offline / idle simulation
- When the tab is closed, the colony continues via a **deterministic, bounded offline simulation** (capped, e.g., to N hours, to avoid runaway/exploit and keep compute sane).
- On return, a **summary report** ("while you were away: +1,240 iron, 3 robots built, Miner-04 ran out of energy at 02:13") — turning the idle layer into feedback on program quality.
- Because execution is deterministic (§9.6), offline = fast-forwarding the same sim; no separate "idle math" to keep in sync.

### 13.4 Balancing methodology
- All costs/recipes/energy values live in **data files** (§15.3) for rapid iteration.
- Define target **throughput curves** per milestone; instrument the game to log actual player progress vs. target and tune.
- **Economy invariant to protect:** there must always exist a *programming* improvement that beats a *brute-force* (more robots) improvement at the margin — otherwise Pillar 1 erodes into "spam units."

### 13.5 Pressure, Adversity & Motivation — *decision deferred to post-MVP*

> **Status:** Open. We will **build the MVP with no adversity**, then let playtesting decide whether (and how much) pressure the full game needs. This section captures the analysis so the call is fast when the data arrives. Nothing here is committed.

#### 13.5.1 The core insight
The strongest argument for adding adversity is **not** "games need enemies." It's that **adversity is what gives the programming blocks a reason to exist.** In a static, hazard-free world the optimal program is `Loop { mine; deposit }` — the player never needs `If`, sensing-driven decisions, or error handling. **A world that never pushes back makes conditionals decorative**, which quietly undermines Pillar 1 ("programming is the gameplay"). So we evaluate adversity primarily as *content that creates demand for control flow*, not as combat for its own sake.

#### 13.5.2 The two motivation gaps to watch for in playtest
1. **Mid-game sag** — after the novelty of the first autonomous robots, the only pull is the tech tree and bigger numbers. Genre-classic churn point.
2. **Stakeless conditionals** — if nothing ever goes wrong, `If` / `While` / `Repair` / sensing have no job, and the game's signature systems feel optional.

#### 13.5.3 Menu of pressure mechanics, ranked by pillar-fit
**A. Environmental / systemic (best fit — pure logic, no combat). Strongest candidates because each directly creates demand for a programming block:**
- **Resource depletion** — deposits run dry → robots must *find/relocate* → makes `NearestOf`/`ScanFor`/decisions essential.
- **Robot wear & breakdowns** — degrade and need repair → `Repair` + self-monitoring (`if health < 20%: go to repair bay`) → fault-tolerant programming.
- **Hazard zones** — heat/radiation/corrosion/unstable terrain damage robots → programs must route around them → conditional pathfinding matters.
- **Episodic events** — dust storms (knock out solar), meteor showers, power surges → pressure without a persistent foe; pairs with a day/night cycle.
- **Decay/spoilage** — T4 unstable resources already do this → time pressure on logistics.

**B. Economic / self-imposed (great for optimizers):**
- **Contracts/quotas** — "deliver 500 circuits in 10 min for a reward" → optional urgency.
- **Throughput / energy / program-size scoring** — Zachtronics-style leaderboards; our energy-per-throughput metric is already a natural scoreboard.

**C. Active enemies (highest engagement, biggest fantasy risk):**
- **Rogue machines** from the collapsed previous colony (§5 lore) — a *thematically perfect* foe, not generic aliens; pays off the "runaway automation" thread exactly when self-replication unlocks.
- **Critical design move:** make defense **programmed** (patrol routines, threat-response behaviors, turret logic), not twitch-based. Authored combat *expands* the programming fantasy instead of betraying it.

#### 13.5.4 Recommended phasing *if* playtest shows we need it
1. **MVP:** none (current plan).
2. **Alpha:** add **systemic pressure first** — depletion + breakdowns + one hazard type. Cheapest to build, fully on-pillar, and likely the actual fix for both gaps.
3. **Beta:** layer **rogue machines** as an *opt-in* dimension with programmed defense, tied to the self-replication milestone.

#### 13.5.5 Non-negotiable caveats (decide these *before* building any adversity)
- **Ship a peaceful/creative mode toggle (à la Factorio).** The education audience and pure optimizers will want pressure *off*. Make hazards and enemies switchable.
- **Self-pace the threat.** Tie escalation to expansion (bigger colony → more "attention"/pollution → more rogue-machine activity) so the player controls difficulty by how aggressively they grow. Never a fixed timer.
- **⚠️ Offline-sim hazard.** Persistent enemies that destroy the colony while the tab is closed would punish the idle player — the opposite of the "colony runs without you" pillar (§13.3). Either pause threats offline, hard-cap their damage, or simulate defenses too.

#### 13.5.6 Don't forget the non-adversarial motivators
Adversity isn't the only fix for the sag: a clear **endgame win-condition** (launch a colony ship / terraform / ascend), **new biomes/planets** as a curiosity engine (each with new resources *and* hazards), and a **prestige / new-game+** loop for replayability.

#### 13.5.7 Decision criteria — what to look for in MVP/Alpha playtests
Add adversity *only if* the data shows it's needed. Signals that we **do** need it:
- Players stop opening the program editor once their first miners run (conditionals going unused).
- Session length / retention drops sharply right after the "first autonomous robot" beat.
- Players self-report the mid-game as "just waiting for numbers."
Signals that we **don't**: players keep refactoring programs for efficiency, chase leaderboard/throughput goals, and engage with the tech tree for its own sake. **Cheap probe:** ship one systemic-pressure element (deposit depletion) early — it's low-cost, on-pillar, and tells us a lot about whether stakes change behavior before we invest in enemies.

---

## 14. Art & Audio Direction

- **Visual style:** clean, friendly, semi-flat **isometric** with chunky readable robots and color-coded resources. Readability > realism (you must parse a busy factory at a glance). Reference vibe: *Shapez.io* clarity + *Mindustry* energy + a warmer palette.
- **Robot design language:** modular silhouette — modules are *visible* on the chassis, so you can read a robot's loadout from its look.
- **Animation:** satisfying micro-feedback — mining sparks, ingots stamping, a little "thinking" blip when a robot evaluates a condition.
- **Audio:** mellow generative ambient that layers up as the colony grows (more machines = richer soundscape); crisp, non-fatiguing SFX for repeated actions (mining/depositing) — these will play *constantly*, so they must never annoy.
- **Accessibility:** colorblind-safe resource palette + icons (never color alone), scalable UI text, reduced-motion option.

---

## 15. Technical Architecture (Web)

### 15.1 Stack (proposed)
| Layer | Choice | Rationale |
|---|---|---|
| **Language** | **TypeScript** | Type safety across a complex simulation + program model |
| **Rendering** | **PixiJS** (WebGL 2D) | High-perf 2D for many sprites/robots; isometric-friendly. (Phaser is an alternative if we want a batteries-included game framework.) |
| **UI / IDE** | **React** for menus/HUD; **Blockly** (or a custom fork) for the block editor | Blockly is purpose-built for block programming and saves enormous effort; React for everything else |
| **State** | Custom **ECS** (Entity-Component-System) for the sim; lightweight store (Zustand) for UI | ECS scales to many robots and keeps sim logic data-oriented |
| **Build** | Vite | Fast DX; outputs a **fully static bundle** (critical for free GitHub Pages hosting, §15.6) |
| **Persistence** | LocalStorage / IndexedDB for saves | Offline-first; no account or server required to play — works perfectly on static hosting |
| **Hosting** | **GitHub Pages** (free, static) | Zero-cost, zero-ops; see §15.6. The whole game is client-side, so no backend is needed |
| **Backend** | **None for the foreseeable game.** Optional later: a *third-party* serverless BaaS (Supabase/Firebase free tier) *only* if cloud saves/leaderboards are added | GitHub Pages cannot run server code, so any future server feature must be an external service, not our own server |

> **Hard constraint (from hosting on GitHub Pages):** the game must ship as **100% static client-side assets** — HTML, JS, CSS, JSON, images, audio. No server-side rendering, no app server, no database we host. This is already the design's natural shape (offline-first, client-authoritative, deterministic local sim), so the constraint costs us almost nothing and is baked into every decision below.

### 15.2 Simulation architecture
- **Fixed-timestep deterministic simulation** decoupled from render framerate. The sim is the source of truth; rendering interpolates.
- **The robot "VM":** each robot program compiles from blocks into a lightweight **bytecode / instruction list**. A per-robot interpreter executes *k* instructions/tick (k = Logic Core clock). This:
  - makes per-instruction energy/cycle accounting trivial,
  - makes offline fast-forward just "run the sim faster,"
  - keeps determinism for save/replay/debugging.
- **Scheduler** advances all robot VMs each tick; world systems (refining, energy grid, generation) are ECS systems running on the same tick.

### 15.3 Data-driven content
All resources, recipes, modules, chassis, instructions, and tech nodes are defined in **JSON/data files** validated by a schema. Designers add content without touching engine code. Example recipe:
```json
{
  "id": "robot_worker_mk1",
  "building": "assembler",
  "inputs": [
    { "item": "chassis_frame", "qty": 1 },
    { "item": "basic_sensor",  "qty": 1 },
    { "item": "power_cell",    "qty": 2 }
  ],
  "outputs": [{ "item": "robot_worker_mk1", "qty": 1 }],
  "timeSeconds": 12,
  "requiresTech": "robotics_worker_mk1"
}
```

### 15.4 Performance targets
- Smooth at **200+ active robots** on a mid-range laptop (the late-game fantasy demands scale).
- Strategies: ECS + typed arrays for hot data, VM instruction budgets per tick, sprite batching/culling in Pixi, and offloading the sim to a **Web Worker** so the UI thread stays responsive.

### 15.5 Save format
- Versioned JSON snapshot of world + all robot programs (as block ASTs) + tech state + timestamp (for offline sim on load). Migration layer for schema changes across updates.
- **Local-first, always.** Saves live in the browser (IndexedDB) so the game is fully playable on a static host with no account. **Export/Import save-to-file** is a first-class feature — it gives players backup/transfer/sharing without us hosting anything.

### 15.6 Hosting & Deployment — free on GitHub Pages
The game is delivered as a static site, so it can be hosted at **zero cost** on GitHub Pages (e.g., `https://<username>.github.io/RobotGame/` from a project repo, or `https://<username>.github.io/` from a `<username>.github.io` user-site repo).

**What "static" buys us / requires:**
- ✅ Everything (sim, robot VM, block editor, saves) runs in the **browser** — Pages just serves files.
- ✅ The deterministic local simulation + offline sim (§13.3) already assume no server — perfect fit.
- ⚠️ **No server-side code or hosted database.** Any future cloud feature (sync, leaderboards, shared subroutine library) must use a **third-party serverless backend** (Supabase/Firebase free tier, or a static-friendly approach like signed GitHub Gist imports). Not needed for MVP or 1.0.
- ⚠️ **Asset budget matters** — Pages has soft size/bandwidth limits (~1 GB repo, ~100 GB/month bandwidth, 10 builds/hr). Keep the bundle lean: compress textures/audio, lazy-load tiers/biomes, code-split the Blockly editor. This game is logic-heavy and art-light, so this is comfortable.

**Vite configuration for project-repo hosting (subpath):**
- Set `base: '/RobotGame/'` in `vite.config.ts` so asset URLs resolve under the repo subpath. (For a `<username>.github.io` user-site, `base: '/'`.)
- Add a **404.html that copies index.html** (or use HashRouter / hash-based screen state) so client-side routing/deep links survive GitHub Pages' lack of SPA fallback.
- Include a `.nojekyll` file at the publish root so Pages doesn't run Jekyll and strip files/folders beginning with `_`.

**Deployment pipeline (CI, recommended):** a GitHub Actions workflow on push to `main` that builds and publishes to Pages — no manual steps.
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push: { branches: [main] }
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: true }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build            # Vite → ./dist (static bundle)
      - run: touch dist/.nojekyll
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: '${{ steps.deployment.outputs.page_url }}' }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```
Then in the repo: **Settings → Pages → Source = "GitHub Actions."** Every push to `main` auto-publishes.

**Make it installable (recommended, free):** ship as a **PWA** (web app manifest + service worker, via `vite-plugin-pwa`). Players can "install" the game and play **offline** after first load — a great fit for an offline-first colony sim, at no hosting cost. The service worker also caches assets, cutting Pages bandwidth.

**Custom domain (optional):** GitHub Pages supports a free custom domain via a `CNAME` file + DNS, with automatic HTTPS, if you ever want `cogworks.app` instead of the `github.io` URL.

---

## 16. Monetization (deferred — base game first)

Stance: **build a great free-to-play-feeling core; never sell power that violates Pillar 1.** Programming skill, not wallet, is the progression currency.

Options, in order of preference:
1. **Premium / one-time purchase** (cleanest fit for this audience; no economy distortion).
2. **Free base game + paid expansions** (new biomes, instruction sets, campaign scenarios, cosmetic robot skins).
3. **Cosmetic-only microtransactions** (robot/colony skins) — never gameplay advantages.

Explicitly **avoid**: energy/timer paywalls, pay-to-skip-the-programming, or anything that makes "buying" beat "building & coding." Those would directly violate the design pillars.

---

## 17. Scope & Roadmap

### 17.1 MVP (Vertical Slice) — prove the core loop is fun
**Goal:** A player can mine → refine → build a robot → *program it to mine autonomously* → see it work. If *that* is fun, the game is viable.

Includes:
- T0 resources (Iron, Scrap) + basic Refinery + Assembler.
- Two chassis (Salvage Unit, Worker Mk1) and 3 modules (Drill, Cargo, Sensor).
- Block editor with **Movement, Action, Sensing, and `Loop`/`If`** only.
- One robot VM with energy costs.
- Milestone 1 ("First Autonomous Robot") fully playable, with onboarding.
- Save/load (IndexedDB) + export/import to file.
- **Live on GitHub Pages from the first commit** (static build + CI auto-deploy, §15.6) so the slice is shareable via a URL for playtesting.

Explicitly **out** of MVP: subroutines, comms/swarm, tech tree breadth (just a handful of nodes), self-replication, offline sim, audio polish, PWA/offline install (add in Alpha).

### 17.2 Milestones beyond MVP
| Phase | Adds | Validates |
|---|---|---|
| **Alpha 1** | Full control flow (`While`, `ForEach`), variables, Tech Tree v1 (Logic + Materials branches), T1 resources, energy grid | "Programming depth is engaging over hours" |
| **Alpha 2** | Subroutines + shared library, Constructor chassis, `Build`, debugging tools v1 | "Abstraction/reuse is the mid-game hook" |
| **Beta** | Comms/shared memory, swarm coordination, self-replication, offline sim, T2–T3 content, full onboarding | "The endgame fantasy lands; idle layer works" |
| **1.0** | T4 content, art/audio polish, balance pass, accessibility, full tech tree, scenarios/challenges | Ship |
| **Post-1.0** | Text-mode DSL, Steam/PWA wrapper, cloud saves, community subroutine sharing, sandbox/creative mode, multiplayer colonies | Longevity |

### 17.3 First implementation steps (for engineering)
0. **Stand up hosting on day one** (de-risks deployment early): Vite + TS project, `base` set for the repo subpath, `.nojekyll`, and the GitHub Actions deploy workflow (§15.6). Push a "Hello, Cinder-7" placeholder and confirm it's live at the `github.io` URL *before* building features — so every later commit auto-deploys.
1. Stand up Vite + TS + Pixi + React shell; render a grid world with one controllable robot.
2. Implement the **robot VM**: block AST → bytecode → ticked interpreter, with 4 instructions (`NavigateTo`, `Mine`, `Loop`, `If`) and energy costs.
3. Integrate Blockly with a custom block set mapping 1:1 to the VM instructions.
4. Add Refinery + Assembler as ECS systems with data-driven recipes.
5. Wire the MVP milestone + onboarding; playtest the "first autonomous robot" beat relentlessly.

---

## 18. Stretch Goals & Future Ideas
- **Text-mode DSL** that round-trips with blocks (advanced players / faster authoring).
- **Community subroutine library** — share/import behaviors (with sandboxing).
- **Challenge/puzzle mode** — Zachtronics-style fixed scenarios scored on throughput/energy/program-size (great for the optimizer audience and for marketing leaderboards).
- **Multiple biomes/planets** with distinct resources and hazards (hazards = programs must handle exceptions).
- **Hazards & fault tolerance** — robots break down, deposits deplete, weather disrupts solar — making `If`/error-handling *necessary*, not optional.
- **Multiplayer / co-op colonies** or async "factory diplomacy."
- **In-game profiler** showing energy/throughput hotspots in a program (debugging as endgame content).

---

## 19. Key Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Programming feels like homework, not play** | Fatal — it's the core | Ruthless onboarding polish; instant-gratification first loop; satisfying visual feedback when programs run; no syntax errors (blocks); the "first autonomous robot" dopamine hit early |
| **Complexity overwhelms new players** | High churn | Progressive disclosure via tech tree (Pillar 3); only show unlocked blocks; per-unlock micro-tutorials |
| **Block programming hits an expressiveness ceiling** | Loses core (programmer) audience | Subroutines, collapsible/compact views, late-game text-mode DSL stretch goal |
| **Performance collapses at scale** | Breaks the late-game fantasy | ECS + Web Worker sim + instruction budgets from day one; perf-test with 200+ bots early |
| **Idle/offline exploits or runaway sim** | Economy breaks | Deterministic bounded offline sim with hard caps; server-authoritative validation only if cloud features ship |
| **Balancing brute-force vs. clever code** | Erodes Pillar 1 | Protect the economy invariant (§13.4); energy-per-throughput rewards elegant programs measurably |
| **Mid-game motivation sag / stakeless conditionals** | Churn after first autonomous robots; control-flow blocks go unused, quietly undermining Pillar 1 | Deferred-but-planned adversity menu (§13.5); instrument playtests for the decision criteria (§13.5.7); cheap early probe = deposit depletion; back-stopped by non-adversarial motivators (endgame goal, biomes, prestige) |
| **Scope creep** (this doc is large) | Never ships | MVP is tightly fenced (§17.1); every feature must serve a pillar or get cut |

---

## 20. Open Questions (to resolve in pre-production)
1. **Perspective:** true isometric vs. top-down 2D? (Affects art pipeline and pathfinding.)
2. **Direct control vs. fully indirect:** do we keep manual robot driving past the early game, or commit fully to "everything is programmed"?
3. **One program per robot vs. shared "behavior assignment":** should programs be authored per-robot or as reusable "job templates" assigned to many robots? (Leaning template-based for scale.)
4. **How hard is the energy constraint?** Hard (robots can die/strand) vs. soft (robots slow down). Affects difficulty/forgiveness.
5. **Tech tree shape:** wide & branchy (player-driven specialization) vs. mostly linear with optional side branches (easier to balance/teach)?
6. **Education positioning:** do we lean into the CS-teaching angle as a marketed feature, or keep it implicit?
7. **Adversity stance (deferred to post-MVP, see §13.5):** cozy builder (systemic pressure only, no enemies) vs. pressure-first survival (rogue machines core) vs. toggleable both? **Decision driven by MVP/Alpha playtest data**, not chosen up front.

---

### Appendix A — Glossary
- **Block:** a draggable visual programming instruction.
- **Program:** the ordered set of blocks defining a robot's behavior.
- **Subroutine:** a named, reusable, parameterized program (a function).
- **Module:** hardware that grants a robot specific instructions/abilities.
- **Chassis:** a robot's frame, defining slots and base stats.
- **Logic Core:** the module governing program size, variables, and execution speed (the robot's "CPU/RAM").
- **Tick:** one step of the fixed-timestep simulation.
- **RP:** Research Points, spent in the tech tree.
- **Blackboard:** colony-wide shared memory for robot coordination.

### Appendix B — One-line design test
> *Before adding any feature, ask: "Does this make programming robots more expressive, more legible, more rewarding to optimize, or better-paced to unlock?" If none — cut it.*
