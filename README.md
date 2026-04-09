# Grudge Warlords RTS

A WC3-style Real-Time Strategy game built entirely in the browser — canvas rendering, procedural islands, hero progression, naval combat, and a live faction designer.

---

## Features

| | |
|---|---|
| ⚔️ **80+ Unit Types** | Warriors, mages, siege, champions, creeps, animals across two factions |
| 👑 **8 Heroes** | Unique abilities, XP levelling, item inventory slots |
| 🚢 **Naval Combat** | 5 ship types with captain-crew and broadside cannons |
| 🏝️ **8-Node Islands** | Capture-point warfare, pirate haven, weekly map rotation |
| 🌊 **Tile Map** | 9-layer Tiny Swords tilemap with auto-tiling, elevation, and shadows |
| 🎯 **Designer Enforced** | Tech trees built in the visual designer are enforced at runtime |
| 🚀 **Ship Builder** | Modular spaceship assembly from 95 blocks (Grudge Space RTS preview) |

---

## Pages / Routes

| Route | Description |
|---|---|
| `/` | Home — feature overview and navigation hub |
| `/play` | **Game** — full RTS canvas with HUD, minimap, and hero bar |
| `/designer` | Faction Designer — node-graph tech trees for Kingdom, Legion, Neutral |
| `/designer/:faction` | Direct faction entry |
| `/map-editor` | Map Editor — paint terrain, place resources and creep camps |
| `/ship-builder` | Modular spaceship builder (95 blocks) |
| `/codex` | Codex — browse all units, buildings, heroes, items with sprite previews |
| `/admin` | Admin Compendium — configure VFX, shadows, projectile styles per entity |

---

## Controls (in-game)

| Input | Action |
|---|---|
| Arrow keys / Edge scroll | Pan camera |
| Scroll wheel | Zoom |
| Left click | Select unit / building |
| Right click | Move / attack-move target |
| `A` | Attack-move command |
| `S` | Stop |
| `H` | Hold position |
| `B` | Build |
| `Ctrl + 1–9` | Assign control group |
| `1–9` | Recall control group |
| `F1–F3` | Jump to hero |
| `Space` | Jump to last event |
| `U` | Upgrade Town Hall |

---

## Tech Stack

- **React 18** + **Vite 6** + **TypeScript 5.7**
- **Tailwind CSS** — all UI outside the canvas
- **wouter** — lightweight client-side routing
- **HTML5 Canvas** — game rendering (`renderer.ts`), minimap, VFX
- **Howler.js** — audio (SFX + music)
- **GSAP / Tween.js** — UI animations
- **Sprite CDN** — `https://molochdagod.github.io/ObjectStore`

---

## Project Structure

```
src/
  pages/              # Route-level page components (play, designer, codex, …)
  components/
    game-designer/    # GameCanvas — main game loop + canvas
    game-hud/         # React HUD overlay (resources, portraits, selection)
    rts-map-editor/   # Map editor UI
    admin-compendium/ # Admin config panels
    ui/               # Shared UI primitives (Button, Card, …)
  lib/
    rts-engine/       # Pure-TS game engine (19 modules)
      engine.ts         # Main game loop, state machine
      renderer.ts       # Canvas rendering + minimap (bottom-right)
      pathfinding.ts    # A* pathfinding on island graph
      island-gen.ts     # Procedural island generation
      ships.ts          # Naval unit logic
      vfx.ts            # Visual effects system
      sprite-loader.ts  # CDN sprite atlas loader
      types.ts          # Shared type definitions
      …
```

---

## Development

```bash
npm install
npm run dev       # Vite dev server on :3000
npm run build     # tsc + vite build → dist/
npm run lint      # ESLint
```

---

## Deployment

Hosted on **Vercel** as a static SPA.

`vercel.json` rewrites all routes to `/index.html` so client-side routing works:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

Push to `main` → Vercel auto-deploys.

---

## Author

**Racalvin The Pirate King** — Grudge Studio
