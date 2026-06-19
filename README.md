# Cogworks (working title)

A browser-based automation game where you don't just build factories — you **program the robots that run them**. Mine resources, refine them, build robots, then teach those robots to do the work for you using drag-and-drop programming blocks (`if`, `loop`, `navigate to`, `interact with`, …). Climb a tech tree from hand-mining to a self-replicating machine colony.

> **Factorio meets Scratch.** The better your loops and conditionals, the more your colony automates itself.

## 📄 Design

The full game design document lives in **[`docs/DESIGN.md`](docs/DESIGN.md)** — concept, core loop, the visual programming system, tech tree, technical architecture, roadmap, and risks.

## 🌐 Hosting (free, GitHub Pages)

This game is designed as a **100% static, offline-first client app**, so it can be hosted for **free on GitHub Pages** with no backend. See [`docs/DESIGN.md` §15.6](docs/DESIGN.md#156-hosting--deployment--free-on-github-pages) for the full setup. The short version:

1. Build is a static bundle (Vite → `dist/`).
2. A GitHub Actions workflow auto-deploys to Pages on every push to `main`.
3. In the repo: **Settings → Pages → Source = "GitHub Actions."**
4. Game goes live at `https://<username>.github.io/RobotGame/`.

Key gotchas (all handled in the design doc): set Vite `base` to the repo subpath, add a `.nojekyll` file, and use hash-based routing or a `404.html` fallback for deep links. Ships later as an installable **PWA** for offline play.

## 🚧 Status

Pre-production. Design complete; implementation not started. First engineering step is to stand up the static project + Pages deploy pipeline so every commit is live for playtesting (see §17.3).

## 🗺️ Roadmap (high level)

| Phase | Focus |
|---|---|
| **MVP** | Mine → refine → build a robot → **program it to mine autonomously**. Live on Pages. |
| **Alpha** | Full control flow, variables, tech tree, energy grid, subroutines, PWA/offline. |
| **Beta** | Swarm coordination, self-replication, offline simulation, deeper content. |
| **1.0** | Exotic tier, art/audio polish, accessibility, balance, scenarios. |
