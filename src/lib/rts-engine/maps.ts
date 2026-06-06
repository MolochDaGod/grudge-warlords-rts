import type { Island, CreepCamp, UnitType, ResourceType } from './types';

export interface ResourceDef { type: ResourceType; pos: { x: number; y: number }; amount?: number; }
export interface UnitDef { faction: 'blue' | 'red'; type: UnitType; pos: { x: number; y: number }; }

export type MapMode = '1v1' | 'ffa' | 'boss';

// ── Resource zones — procedurally scatter thick areas of trees/rocks ──────────
// Replaces hand-placed individual harvestables (the old "wargus" per-point lists)
// with seeded zones that the engine expands into Resource entities on map load.
export interface ResourceZone {
  type: 'tree' | 'rock';
  /** Zone center in world coords. */
  pos: { x: number; y: number };
  /** Outer radius of the disc the harvestables scatter inside. */
  radius: number;
  /** How many harvestables to scatter. */
  count: number;
  /** Deterministic seed — same seed produces the same forest every load. */
  seed: number;
  /** Optional amount override per spawned resource. */
  amount?: number;
  /** Inner exclusion radius (no spawns inside) — leaves a clearing in the middle. */
  innerRadius?: number;
}

export interface MapDef {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  mode: MapMode;
  worldW: number;
  worldH: number;
  islands: Omit<Island, never>[];
  blueCastle: { x: number; y: number };
  redCastle: { x: number; y: number };
  startingUnits: UnitDef[];
  resources: ResourceDef[];
  resourceZones?: ResourceZone[];
  creepCamps: Omit<CreepCamp, 'id'>[];
  startingResources: { gold: number; wood: number };
  aiAttackInterval: number;
  thumbnail: string;
}

// ── Deterministic PRNG (mulberry32) — same seed → same scatter every load ────
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Expand a list of zones into individual ResourceDef entries.
 * Uses Poisson-ish jitter inside an annulus (innerRadius .. radius) so
 * harvestables look densely scattered without exact grid stacking.
 */
export function expandResourceZones(zones: ResourceZone[]): ResourceDef[] {
  const out: ResourceDef[] = [];
  for (const z of zones) {
    const rand = mulberry32(z.seed);
    const inner = z.innerRadius ?? 0;
    const r2outer = z.radius * z.radius;
    const r2inner = inner * inner;
    for (let i = 0; i < z.count; i++) {
      // Uniform area sample in annulus
      const t = rand();
      const r = Math.sqrt(r2inner + t * (r2outer - r2inner));
      const a = rand() * Math.PI * 2;
      out.push({
        type: z.type,
        pos: { x: z.pos.x + Math.cos(a) * r, y: z.pos.y + Math.sin(a) * r },
        amount: z.amount,
      });
    }
  }
  return out;
}

export const MAPS: MapDef[] = [
  // ── SKIRMISH (4 islands) — fast WC3 duel ──────────────────────────────────
  {
    id: 'skirmish',
    name: 'Skirmish',
    subtitle: '4-Island Clash',
    description: 'A fast duel. Two contested islands between home bases — creep camps guard the gold mines. First to tier 3 wins.',
    mode: '1v1',
    worldW: 3550, worldH: 1100,
    thumbnail: '⚔️',
    islands: [
      { id: 'blue', x: 80, y: 80, w: 860, h: 900, faction: 'blue' },
      { id: 'grudge1', x: 1050, y: 150, w: 640, h: 810, faction: 'neutral' },
      { id: 'grudge2', x: 1800, y: 150, w: 640, h: 810, faction: 'neutral' },
      { id: 'red', x: 2550, y: 80, w: 860, h: 900, faction: 'red' },
    ],
    blueCastle: { x: 200, y: 320 },
    redCastle: { x: 3120, y: 320 },
    startingResources: { gold: 500, wood: 150 },
    aiAttackInterval: 90,
    startingUnits: [
      { faction: 'blue', type: 'pawn', pos: { x: 380, y: 380 } },
      { faction: 'blue', type: 'pawn', pos: { x: 350, y: 460 } },
      { faction: 'blue', type: 'pawn', pos: { x: 420, y: 450 } },
      { faction: 'blue', type: 'pawn', pos: { x: 300, y: 500 } },
      { faction: 'blue', type: 'pawn', pos: { x: 440, y: 500 } },
      { faction: 'red', type: 'pawn', pos: { x: 2940, y: 380 } },
      { faction: 'red', type: 'pawn', pos: { x: 2970, y: 460 } },
      { faction: 'red', type: 'pawn', pos: { x: 2900, y: 450 } },
      { faction: 'red', type: 'pawn', pos: { x: 2880, y: 500 } },
      { faction: 'red', type: 'pawn', pos: { x: 2960, y: 500 } },
    ],
    resources: [
      { type: 'goldmine', pos: { x: 600, y: 500 }, amount: 12500 },
      { type: 'goldmine', pos: { x: 1350, y: 480 }, amount: 10000 },
      { type: 'goldmine', pos: { x: 2100, y: 480 }, amount: 10000 },
      { type: 'goldmine', pos: { x: 2860, y: 500 }, amount: 12500 },
    ],
    resourceZones: [
      // Blue island — twin forests + rocky outcrop
      { type: 'tree', pos: { x: 780, y: 220 }, radius: 130, count: 22, seed: 110101 },
      { type: 'tree', pos: { x: 800, y: 740 }, radius: 140, count: 24, seed: 110102 },
      { type: 'rock', pos: { x: 250, y: 760 }, radius: 90, count: 8, seed: 110103 },
      // Grudge 1 — neutral expansion
      { type: 'tree', pos: { x: 1380, y: 270 }, radius: 150, count: 26, seed: 110201 },
      { type: 'tree', pos: { x: 1500, y: 800 }, radius: 130, count: 20, seed: 110202 },
      { type: 'rock', pos: { x: 1150, y: 600 }, radius: 80, count: 7, seed: 110203 },
      // Grudge 2 — neutral expansion
      { type: 'tree', pos: { x: 2120, y: 270 }, radius: 150, count: 26, seed: 110301 },
      { type: 'tree', pos: { x: 2280, y: 800 }, radius: 130, count: 20, seed: 110302 },
      { type: 'rock', pos: { x: 2380, y: 600 }, radius: 80, count: 7, seed: 110303 },
      // Red island — mirror of blue
      { type: 'tree', pos: { x: 2680, y: 220 }, radius: 130, count: 22, seed: 110401 },
      { type: 'tree', pos: { x: 2660, y: 740 }, radius: 140, count: 24, seed: 110402 },
      { type: 'rock', pos: { x: 3220, y: 760 }, radius: 90, count: 8, seed: 110403 },
    ],
    creepCamps: [
      // Grudge 1 — easy camp guarding gold mine
      {
        pos: { x: 1300, y: 400 }, creeps: [{ type: 'goblin', level: 1 }, { type: 'goblin', level: 1 }, { type: 'spearGoblin', level: 2 }],
        dropTable: [{ itemId: 'claws_of_attack', chance: 0.5 }, { itemId: 'healing_salve', chance: 1.0 }],
        cleared: false, xpReward: 150, difficulty: 1
      },
      // Grudge 1 — hard camp
      {
        pos: { x: 1400, y: 700 }, creeps: [{ type: 'orc', level: 3 }, { type: 'archerGoblin', level: 2 }],
        dropTable: [{ itemId: 'ring_of_protection', chance: 0.6 }, { itemId: 'mana_potion', chance: 1.0 }],
        cleared: false, xpReward: 250, difficulty: 2
      },
      // Grudge 2 — easy camp
      {
        pos: { x: 2050, y: 400 }, creeps: [{ type: 'skeleton', level: 1 }, { type: 'skeleton', level: 1 }, { type: 'skeleton', level: 2 }],
        dropTable: [{ itemId: 'boots_of_speed', chance: 0.4 }, { itemId: 'healing_salve', chance: 1.0 }],
        cleared: false, xpReward: 150, difficulty: 1
      },
      // Grudge 2 — hard camp
      {
        pos: { x: 2200, y: 700 }, creeps: [{ type: 'fireElemental', level: 4 }],
        dropTable: [{ itemId: 'tome_of_power', chance: 0.5 }, { itemId: 'periapt_of_vitality', chance: 0.3 }],
        cleared: false, xpReward: 350, difficulty: 3
      },
    ],
  },

  // ── ARCHIPELAGO (6 islands) — WC3-style macro map ─────────────────────────
  {
    id: 'archipelago',
    name: 'Archipelago',
    subtitle: '6-Island War',
    description: 'Six islands with a rich bonus island reachable from the center. Control expansions, clear creep camps, and scale to late game.',
    mode: '1v1',
    worldW: 5100, worldH: 2100,
    thumbnail: '🌊',
    islands: [
      { id: 'blue', x: 80, y: 100, w: 900, h: 900, faction: 'blue' },
      { id: 'grudge1', x: 1090, y: 200, w: 700, h: 750, faction: 'neutral' },
      { id: 'grudge2', x: 1900, y: 100, w: 960, h: 900, faction: 'neutral' },
      { id: 'grudge3', x: 2970, y: 200, w: 700, h: 750, faction: 'neutral' },
      { id: 'red', x: 3780, y: 100, w: 900, h: 900, faction: 'red' },
      { id: 'grudge4', x: 1900, y: 1110, w: 960, h: 800, faction: 'neutral' },
    ],
    blueCastle: { x: 230, y: 390 },
    redCastle: { x: 4350, y: 390 },
    startingResources: { gold: 500, wood: 150 },
    aiAttackInterval: 120,
    startingUnits: [
      { faction: 'blue', type: 'pawn', pos: { x: 410, y: 460 } },
      { faction: 'blue', type: 'pawn', pos: { x: 380, y: 540 } },
      { faction: 'blue', type: 'pawn', pos: { x: 450, y: 540 } },
      { faction: 'blue', type: 'pawn', pos: { x: 350, y: 500 } },
      { faction: 'blue', type: 'pawn', pos: { x: 460, y: 480 } },
      { faction: 'red', type: 'pawn', pos: { x: 4170, y: 460 } },
      { faction: 'red', type: 'pawn', pos: { x: 4200, y: 540 } },
      { faction: 'red', type: 'pawn', pos: { x: 4130, y: 540 } },
      { faction: 'red', type: 'pawn', pos: { x: 4100, y: 500 } },
      { faction: 'red', type: 'pawn', pos: { x: 4220, y: 480 } },
    ],
    resources: [
      { type: 'goldmine', pos: { x: 650, y: 550 }, amount: 12500 },
      { type: 'goldmine', pos: { x: 1400, y: 580 }, amount: 8000 },
      { type: 'goldmine', pos: { x: 2380, y: 500 }, amount: 10000 },
      { type: 'goldmine', pos: { x: 3300, y: 580 }, amount: 8000 },
      { type: 'goldmine', pos: { x: 4100, y: 550 }, amount: 12500 },
      { type: 'goldmine', pos: { x: 2380, y: 1500 }, amount: 15000 },
    ],
    resourceZones: [
      // Blue island
      { type: 'tree', pos: { x: 820, y: 250 }, radius: 150, count: 26, seed: 0xA101 },
      { type: 'tree', pos: { x: 800, y: 830 }, radius: 140, count: 22, seed: 0xA102 },
      { type: 'rock', pos: { x: 260, y: 880 }, radius: 100, count: 9, seed: 0xA103 },
      // Grudge 1
      { type: 'tree', pos: { x: 1420, y: 320 }, radius: 140, count: 22, seed: 0xA201 },
      { type: 'rock', pos: { x: 1200, y: 800 }, radius: 80, count: 7, seed: 0xA202 },
      // Grudge 2 center
      { type: 'tree', pos: { x: 2100, y: 240 }, radius: 150, count: 24, seed: 0xA301 },
      { type: 'tree', pos: { x: 2700, y: 280 }, radius: 150, count: 24, seed: 0xA302 },
      { type: 'rock', pos: { x: 2200, y: 880 }, radius: 90, count: 8, seed: 0xA303 },
      // Grudge 3
      { type: 'tree', pos: { x: 3300, y: 320 }, radius: 140, count: 22, seed: 0xA401 },
      { type: 'rock', pos: { x: 3520, y: 800 }, radius: 80, count: 7, seed: 0xA402 },
      // Red island
      { type: 'tree', pos: { x: 3880, y: 250 }, radius: 150, count: 26, seed: 0xA501 },
      { type: 'tree', pos: { x: 3900, y: 830 }, radius: 140, count: 22, seed: 0xA502 },
      { type: 'rock', pos: { x: 4500, y: 880 }, radius: 100, count: 9, seed: 0xA503 },
      // Grudge 4 bonus — thick forest
      { type: 'tree', pos: { x: 2200, y: 1260 }, radius: 200, count: 36, seed: 0xA601 },
      { type: 'tree', pos: { x: 2700, y: 1300 }, radius: 180, count: 30, seed: 0xA602 },
      { type: 'rock', pos: { x: 2380, y: 1800 }, radius: 110, count: 10, seed: 0xA603 },
    ],
    creepCamps: [
      // Grudge 1 easy
      {
        pos: { x: 1350, y: 350 }, creeps: [{ type: 'goblin', level: 1 }, { type: 'goblin', level: 1 }],
        dropTable: [{ itemId: 'healing_salve', chance: 1.0 }], cleared: false, xpReward: 100, difficulty: 1
      },
      // Grudge 1 medium
      {
        pos: { x: 1500, y: 700 }, creeps: [{ type: 'orc', level: 3 }, { type: 'spearGoblin', level: 2 }],
        dropTable: [{ itemId: 'claws_of_attack', chance: 0.5 }], cleared: false, xpReward: 250, difficulty: 2
      },
      // Grudge 2 center hard
      {
        pos: { x: 2300, y: 350 }, creeps: [{ type: 'yeti', level: 5 }, { type: 'orc', level: 3 }],
        dropTable: [{ itemId: 'tome_of_power', chance: 0.6 }, { itemId: 'amulet_of_mana', chance: 0.3 }],
        cleared: false, xpReward: 400, difficulty: 3
      },
      // Grudge 3 easy
      {
        pos: { x: 3200, y: 350 }, creeps: [{ type: 'skeleton', level: 1 }, { type: 'skeleton', level: 1 }],
        dropTable: [{ itemId: 'mana_potion', chance: 1.0 }], cleared: false, xpReward: 100, difficulty: 1
      },
      // Grudge 3 medium
      {
        pos: { x: 3400, y: 700 }, creeps: [{ type: 'desertScorpio', level: 4 }, { type: 'archerGoblin', level: 2 }],
        dropTable: [{ itemId: 'ring_of_protection', chance: 0.5 }], cleared: false, xpReward: 280, difficulty: 2
      },
      // Grudge 4 BOSS — Ogre Boss guards rich island
      {
        pos: { x: 2380, y: 1400 }, creeps: [{ type: 'ogreBoss', level: 8 }, { type: 'orc', level: 4 }, { type: 'orc', level: 4 }],
        dropTable: [{ itemId: 'crown_of_kings', chance: 0.8 }, { itemId: 'orb_of_fire', chance: 0.4 }],
        cleared: false, xpReward: 800, difficulty: 5
      },
    ],
  },

  // ── DRAGON'S TEETH (3 islands) — tight aggressive duel ────────────────────
  {
    id: 'dragons_teeth',
    name: "Dragon's Teeth",
    subtitle: '3-Island Duel',
    description: 'A narrow map with one contested center island. Rush for the gold mine or be overrun. Dragon creep guards the best loot.',
    mode: '1v1',
    worldW: 2800, worldH: 1200,
    thumbnail: '🐉',
    islands: [
      { id: 'blue', x: 60, y: 100, w: 800, h: 1000, faction: 'blue' },
      { id: 'mid', x: 1000, y: 200, w: 800, h: 800, faction: 'neutral' },
      { id: 'red', x: 1940, y: 100, w: 800, h: 1000, faction: 'red' },
    ],
    blueCastle: { x: 200, y: 400 },
    redCastle: { x: 2560, y: 400 },
    startingResources: { gold: 600, wood: 200 },
    aiAttackInterval: 70,
    startingUnits: [
      { faction: 'blue', type: 'pawn', pos: { x: 350, y: 450 } },
      { faction: 'blue', type: 'pawn', pos: { x: 320, y: 530 } },
      { faction: 'blue', type: 'pawn', pos: { x: 400, y: 520 } },
      { faction: 'blue', type: 'pawn', pos: { x: 280, y: 580 } },
      { faction: 'blue', type: 'pawn', pos: { x: 420, y: 580 } },
      { faction: 'blue', type: 'swordsman', pos: { x: 380, y: 650 } },
      { faction: 'red', type: 'pawn', pos: { x: 2400, y: 450 } },
      { faction: 'red', type: 'pawn', pos: { x: 2430, y: 530 } },
      { faction: 'red', type: 'pawn', pos: { x: 2370, y: 520 } },
      { faction: 'red', type: 'pawn', pos: { x: 2460, y: 580 } },
      { faction: 'red', type: 'pawn', pos: { x: 2340, y: 580 } },
      { faction: 'red', type: 'swordsman', pos: { x: 2380, y: 650 } },
    ],
    resources: [
      { type: 'goldmine', pos: { x: 550, y: 600 }, amount: 10000 },
      { type: 'goldmine', pos: { x: 1400, y: 550 }, amount: 15000 },
      { type: 'goldmine', pos: { x: 2200, y: 600 }, amount: 10000 },
    ],
    resourceZones: [
      // Blue
      { type: 'tree', pos: { x: 700, y: 240 }, radius: 130, count: 22, seed: 0xD101 },
      { type: 'tree', pos: { x: 720, y: 850 }, radius: 140, count: 24, seed: 0xD102 },
      { type: 'rock', pos: { x: 200, y: 900 }, radius: 80, count: 7, seed: 0xD103 },
      // Mid (contested)
      { type: 'tree', pos: { x: 1200, y: 320 }, radius: 140, count: 22, seed: 0xD201 },
      { type: 'tree', pos: { x: 1620, y: 320 }, radius: 140, count: 22, seed: 0xD202 },
      { type: 'tree', pos: { x: 1400, y: 880 }, radius: 160, count: 26, seed: 0xD203 },
      { type: 'rock', pos: { x: 1700, y: 850 }, radius: 90, count: 8, seed: 0xD204 },
      // Red
      { type: 'tree', pos: { x: 2120, y: 240 }, radius: 130, count: 22, seed: 0xD301 },
      { type: 'tree', pos: { x: 2150, y: 850 }, radius: 140, count: 24, seed: 0xD302 },
      { type: 'rock', pos: { x: 2620, y: 900 }, radius: 80, count: 7, seed: 0xD303 },
    ],
    creepCamps: [
      {
        pos: { x: 1300, y: 400 }, creeps: [{ type: 'spearGoblin', level: 2 }, { type: 'goblin', level: 1 }, { type: 'goblin', level: 1 }],
        dropTable: [{ itemId: 'claws_of_attack', chance: 0.6 }, { itemId: 'healing_salve', chance: 1.0 }],
        cleared: false, xpReward: 180, difficulty: 2
      },
      {
        pos: { x: 1500, y: 700 }, creeps: [{ type: 'dragon', level: 6 }],
        dropTable: [{ itemId: 'dragon_heart', chance: 0.5 }, { itemId: 'orb_of_fire', chance: 0.7 }],
        cleared: false, xpReward: 600, difficulty: 4
      },
      {
        pos: { x: 1200, y: 650 }, creeps: [{ type: 'orc', level: 3 }, { type: 'archerGoblin', level: 2 }],
        dropTable: [{ itemId: 'ring_of_protection', chance: 0.5 }],
        cleared: false, xpReward: 250, difficulty: 2
      },
    ],
  },

  // ── PIRATE COVE (8 islands) — large-scale naval war ─────────────────────
  {
    id: 'pirate_cove',
    name: 'Pirate Cove',
    subtitle: '8-Island War',
    description: 'A sprawling archipelago with pirates guarding treasure islands. Multiple expansion paths, flanking routes, and a pirate captain boss on the center island.',
    mode: 'ffa',
    worldW: 5600, worldH: 2800,
    thumbnail: '⚓',
    islands: [
      { id: 'blue', x: 80, y: 300, w: 900, h: 900, faction: 'blue' },
      { id: 'blueExp', x: 80, y: 1400, w: 700, h: 700, faction: 'neutral' },
      { id: 'north1', x: 1200, y: 80, w: 700, h: 650, faction: 'neutral' },
      { id: 'center', x: 2100, y: 800, w: 1000, h: 1000, faction: 'neutral' },
      { id: 'north2', x: 3200, y: 80, w: 700, h: 650, faction: 'neutral' },
      { id: 'south', x: 2100, y: 2000, w: 900, h: 600, faction: 'neutral' },
      { id: 'redExp', x: 4420, y: 1400, w: 700, h: 700, faction: 'neutral' },
      { id: 'red', x: 4320, y: 300, w: 900, h: 900, faction: 'red' },
    ],
    blueCastle: { x: 250, y: 600 },
    redCastle: { x: 4950, y: 600 },
    startingResources: { gold: 400, wood: 100 },
    aiAttackInterval: 100,
    startingUnits: [
      { faction: 'blue', type: 'pawn', pos: { x: 400, y: 660 } },
      { faction: 'blue', type: 'pawn', pos: { x: 370, y: 740 } },
      { faction: 'blue', type: 'pawn', pos: { x: 440, y: 730 } },
      { faction: 'blue', type: 'pawn', pos: { x: 350, y: 800 } },
      { faction: 'blue', type: 'pawn', pos: { x: 460, y: 800 } },
      { faction: 'red', type: 'pawn', pos: { x: 4800, y: 660 } },
      { faction: 'red', type: 'pawn', pos: { x: 4830, y: 740 } },
      { faction: 'red', type: 'pawn', pos: { x: 4770, y: 730 } },
      { faction: 'red', type: 'pawn', pos: { x: 4850, y: 800 } },
      { faction: 'red', type: 'pawn', pos: { x: 4750, y: 800 } },
    ],
    resources: [
      { type: 'goldmine', pos: { x: 600, y: 750 }, amount: 12000 },
      { type: 'goldmine', pos: { x: 350, y: 1700 }, amount: 8000 },
      { type: 'goldmine', pos: { x: 1500, y: 350 }, amount: 8000 },
      { type: 'goldmine', pos: { x: 2600, y: 1250 }, amount: 18000 },
      { type: 'goldmine', pos: { x: 3500, y: 350 }, amount: 8000 },
      { type: 'goldmine', pos: { x: 2550, y: 2250 }, amount: 10000 },
      { type: 'goldmine', pos: { x: 4700, y: 1700 }, amount: 8000 },
      { type: 'goldmine', pos: { x: 4650, y: 750 }, amount: 12000 },
    ],
    resourceZones: [
      // Blue home
      { type: 'tree', pos: { x: 800, y: 450 }, radius: 150, count: 26, seed: 0xC101 },
      { type: 'tree', pos: { x: 750, y: 1020 }, radius: 130, count: 20, seed: 0xC102 },
      { type: 'rock', pos: { x: 200, y: 1100 }, radius: 90, count: 8, seed: 0xC103 },
      // Blue expansion
      { type: 'tree', pos: { x: 350, y: 1550 }, radius: 140, count: 22, seed: 0xC201 },
      { type: 'rock', pos: { x: 650, y: 2000 }, radius: 90, count: 8, seed: 0xC202 },
      // North1
      { type: 'tree', pos: { x: 1500, y: 220 }, radius: 160, count: 26, seed: 0xC301 },
      { type: 'rock', pos: { x: 1800, y: 650 }, radius: 80, count: 7, seed: 0xC302 },
      // Center
      { type: 'tree', pos: { x: 2400, y: 950 }, radius: 180, count: 32, seed: 0xC401 },
      { type: 'tree', pos: { x: 2800, y: 1000 }, radius: 160, count: 28, seed: 0xC402 },
      { type: 'tree', pos: { x: 2500, y: 1650 }, radius: 160, count: 26, seed: 0xC403 },
      { type: 'rock', pos: { x: 2900, y: 1700 }, radius: 110, count: 10, seed: 0xC404 },
      // North2
      { type: 'tree', pos: { x: 3500, y: 220 }, radius: 160, count: 26, seed: 0xC501 },
      { type: 'rock', pos: { x: 3300, y: 650 }, radius: 80, count: 7, seed: 0xC502 },
      // South
      { type: 'tree', pos: { x: 2400, y: 2120 }, radius: 160, count: 26, seed: 0xC601 },
      { type: 'tree', pos: { x: 2800, y: 2120 }, radius: 140, count: 22, seed: 0xC602 },
      // Red expansion
      { type: 'tree', pos: { x: 4700, y: 1550 }, radius: 140, count: 22, seed: 0xC701 },
      { type: 'rock', pos: { x: 5000, y: 2000 }, radius: 90, count: 8, seed: 0xC702 },
      // Red home
      { type: 'tree', pos: { x: 4500, y: 450 }, radius: 150, count: 26, seed: 0xC801 },
      { type: 'tree', pos: { x: 4550, y: 1020 }, radius: 130, count: 20, seed: 0xC802 },
      { type: 'rock', pos: { x: 5050, y: 1100 }, radius: 90, count: 8, seed: 0xC803 },
    ],
    creepCamps: [
      {
        pos: { x: 350, y: 1650 }, creeps: [{ type: 'pirate', level: 2 }, { type: 'pirate', level: 2 }],
        dropTable: [{ itemId: 'healing_salve', chance: 1.0 }], cleared: false, xpReward: 120, difficulty: 1
      },
      {
        pos: { x: 1450, y: 300 }, creeps: [{ type: 'pirateGunner', level: 3 }, { type: 'pirate', level: 2 }],
        dropTable: [{ itemId: 'boots_of_speed', chance: 0.5 }], cleared: false, xpReward: 200, difficulty: 2
      },
      {
        pos: { x: 2500, y: 1100 }, creeps: [{ type: 'pirateCaptain', level: 6 }, { type: 'pirateGunner', level: 4 }, { type: 'pirateGunner', level: 4 }],
        dropTable: [{ itemId: 'crown_of_kings', chance: 0.7 }, { itemId: 'orb_of_fire', chance: 0.5 }],
        cleared: false, xpReward: 700, difficulty: 5
      },
      {
        pos: { x: 3450, y: 300 }, creeps: [{ type: 'pirateGunner', level: 3 }, { type: 'pirate', level: 2 }],
        dropTable: [{ itemId: 'claws_of_attack', chance: 0.5 }], cleared: false, xpReward: 200, difficulty: 2
      },
      {
        pos: { x: 2500, y: 2200 }, creeps: [{ type: 'giantCrab', level: 5 }, { type: 'slime', level: 2 }],
        dropTable: [{ itemId: 'periapt_of_vitality', chance: 0.6 }], cleared: false, xpReward: 350, difficulty: 3
      },
      {
        pos: { x: 4650, y: 1650 }, creeps: [{ type: 'pirate', level: 2 }, { type: 'pirate', level: 2 }],
        dropTable: [{ itemId: 'mana_potion', chance: 1.0 }], cleared: false, xpReward: 120, difficulty: 1
      },
    ],
  },

  // ── GRUDGE GAUNTLET (5 islands) — boss rush with heavy creep camps ─────────
  {
    id: 'gauntlet',
    name: 'Grudge Gauntlet',
    subtitle: 'Boss Rush',
    description: 'Clear increasingly dangerous creep camps to reach the enemy. Each island has a boss guarding it. Heroes are essential — level up fast or die.',
    mode: 'boss',
    worldW: 4200, worldH: 1400,
    thumbnail: '💀',
    islands: [
      { id: 'blue', x: 60, y: 100, w: 800, h: 1200, faction: 'blue' },
      { id: 'gate1', x: 1000, y: 200, w: 600, h: 1000, faction: 'neutral' },
      { id: 'arena', x: 1740, y: 100, w: 700, h: 1200, faction: 'neutral' },
      { id: 'gate2', x: 2580, y: 200, w: 600, h: 1000, faction: 'neutral' },
      { id: 'red', x: 3320, y: 100, w: 800, h: 1200, faction: 'red' },
    ],
    blueCastle: { x: 200, y: 500 },
    redCastle: { x: 3900, y: 500 },
    startingResources: { gold: 700, wood: 250 },
    aiAttackInterval: 150,
    startingUnits: [
      { faction: 'blue', type: 'pawn', pos: { x: 350, y: 550 } },
      { faction: 'blue', type: 'pawn', pos: { x: 320, y: 630 } },
      { faction: 'blue', type: 'pawn', pos: { x: 400, y: 620 } },
      { faction: 'blue', type: 'pawn', pos: { x: 280, y: 700 } },
      { faction: 'blue', type: 'pawn', pos: { x: 420, y: 700 } },
      { faction: 'blue', type: 'swordsman', pos: { x: 360, y: 780 } },
      { faction: 'blue', type: 'bowman', pos: { x: 400, y: 800 } },
      { faction: 'red', type: 'pawn', pos: { x: 3750, y: 550 } },
      { faction: 'red', type: 'pawn', pos: { x: 3780, y: 630 } },
      { faction: 'red', type: 'pawn', pos: { x: 3720, y: 620 } },
      { faction: 'red', type: 'pawn', pos: { x: 3800, y: 700 } },
      { faction: 'red', type: 'pawn', pos: { x: 3700, y: 700 } },
      { faction: 'red', type: 'swordsman', pos: { x: 3760, y: 780 } },
      { faction: 'red', type: 'bowman', pos: { x: 3720, y: 800 } },
    ],
    resources: [
      { type: 'goldmine', pos: { x: 550, y: 700 }, amount: 15000 },
      { type: 'goldmine', pos: { x: 1250, y: 650 }, amount: 8000 },
      { type: 'goldmine', pos: { x: 2080, y: 650 }, amount: 12000 },
      { type: 'goldmine', pos: { x: 2850, y: 650 }, amount: 8000 },
      { type: 'goldmine', pos: { x: 3600, y: 700 }, amount: 15000 },
    ],
    resourceZones: [
      // Blue home
      { type: 'tree', pos: { x: 720, y: 260 }, radius: 150, count: 24, seed: 0xCA01 },
      { type: 'tree', pos: { x: 700, y: 1050 }, radius: 160, count: 28, seed: 0xCA02 },
      { type: 'rock', pos: { x: 200, y: 1180 }, radius: 100, count: 9, seed: 0xCA03 },
      // Gate 1
      { type: 'tree', pos: { x: 1250, y: 380 }, radius: 140, count: 22, seed: 0xCB01 },
      { type: 'rock', pos: { x: 1100, y: 1050 }, radius: 80, count: 7, seed: 0xCB02 },
      // Arena
      { type: 'tree', pos: { x: 1950, y: 280 }, radius: 160, count: 28, seed: 0xCC01 },
      { type: 'tree', pos: { x: 2150, y: 1080 }, radius: 160, count: 26, seed: 0xCC02 },
      { type: 'rock', pos: { x: 2380, y: 380 }, radius: 90, count: 8, seed: 0xCC03 },
      // Gate 2
      { type: 'tree', pos: { x: 2850, y: 380 }, radius: 140, count: 22, seed: 0xCD01 },
      { type: 'rock', pos: { x: 3050, y: 1050 }, radius: 80, count: 7, seed: 0xCD02 },
      // Red home
      { type: 'tree', pos: { x: 3500, y: 260 }, radius: 150, count: 24, seed: 0xCE01 },
      { type: 'tree', pos: { x: 3520, y: 1050 }, radius: 160, count: 28, seed: 0xCE02 },
      { type: 'rock', pos: { x: 4000, y: 1180 }, radius: 100, count: 9, seed: 0xCE03 },
    ],
    creepCamps: [
      // Gate 1 — Minotaur boss
      {
        pos: { x: 1200, y: 500 }, creeps: [{ type: 'minotaur', level: 5 }, { type: 'orc', level: 3 }, { type: 'orc', level: 3 }],
        dropTable: [{ itemId: 'claws_of_attack', chance: 0.8 }, { itemId: 'periapt_of_vitality', chance: 0.5 }],
        cleared: false, xpReward: 400, difficulty: 3
      },
      {
        pos: { x: 1350, y: 900 }, creeps: [{ type: 'skeleton', level: 3 }, { type: 'skeleton', level: 3 }, { type: 'necromancer', level: 4 }],
        dropTable: [{ itemId: 'amulet_of_mana', chance: 0.6 }], cleared: false, xpReward: 300, difficulty: 3
      },
      // Arena — Dragon boss
      {
        pos: { x: 2050, y: 450 }, creeps: [{ type: 'dragon', level: 8 }, { type: 'fireElemental', level: 5 }],
        dropTable: [{ itemId: 'dragon_heart', chance: 0.6 }, { itemId: 'orb_of_fire', chance: 0.8 }],
        cleared: false, xpReward: 800, difficulty: 5
      },
      {
        pos: { x: 2100, y: 950 }, creeps: [{ type: 'demon', level: 6 }, { type: 'armouredDemon', level: 5 }, { type: 'purpleDemon', level: 4 }],
        dropTable: [{ itemId: 'crown_of_kings', chance: 0.5 }, { itemId: 'tome_of_power', chance: 0.7 }],
        cleared: false, xpReward: 700, difficulty: 4
      },
      // Gate 2 — Ogre boss
      {
        pos: { x: 2800, y: 500 }, creeps: [{ type: 'ogreBoss', level: 7 }, { type: 'yeti', level: 4 }, { type: 'yeti', level: 4 }],
        dropTable: [{ itemId: 'boots_of_speed', chance: 0.7 }, { itemId: 'ring_of_protection', chance: 0.6 }],
        cleared: false, xpReward: 500, difficulty: 4
      },
      {
        pos: { x: 2900, y: 900 }, creeps: [{ type: 'mammoth', level: 6 }, { type: 'wendigo', level: 5 }],
        dropTable: [{ itemId: 'periapt_of_vitality', chance: 0.5 }], cleared: false, xpReward: 450, difficulty: 4
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════════
  //  STOCK 1v1 MAPS
  // ══════════════════════════════════════════════════════════════════════════════

  // ── IRON BRIDGE (2 islands) — tight 1v1, one narrow land bridge ────────────
  {
    id: 'iron_bridge',
    name: 'Iron Bridge',
    subtitle: '1v1 Rush',
    description: 'Two home islands connected by a narrow land bridge. No neutral expansions — pure micro and macro. Control the bridge or die.',
    mode: '1v1',
    worldW: 2400, worldH: 1000,
    thumbnail: '🌉',
    islands: [
      { id: 'blue', x: 60, y: 80, w: 800, h: 840, faction: 'blue' },
      { id: 'bridge', x: 920, y: 320, w: 560, h: 360, faction: 'neutral' },
      { id: 'red', x: 1540, y: 80, w: 800, h: 840, faction: 'red' },
    ],
    blueCastle: { x: 200, y: 320 },
    redCastle: { x: 2100, y: 320 },
    startingResources: { gold: 500, wood: 200 },
    aiAttackInterval: 75,
    startingUnits: [
      { faction: 'blue', type: 'pawn', pos: { x: 380, y: 380 } },
      { faction: 'blue', type: 'pawn', pos: { x: 350, y: 460 } },
      { faction: 'blue', type: 'pawn', pos: { x: 420, y: 450 } },
      { faction: 'blue', type: 'pawn', pos: { x: 300, y: 520 } },
      { faction: 'blue', type: 'pawn', pos: { x: 440, y: 510 } },
      { faction: 'red', type: 'pawn', pos: { x: 1930, y: 380 } },
      { faction: 'red', type: 'pawn', pos: { x: 1960, y: 460 } },
      { faction: 'red', type: 'pawn', pos: { x: 1900, y: 450 } },
      { faction: 'red', type: 'pawn', pos: { x: 1870, y: 520 } },
      { faction: 'red', type: 'pawn', pos: { x: 1970, y: 510 } },
    ],
    resources: [
      { type: 'goldmine', pos: { x: 550, y: 500 }, amount: 14000 },
      { type: 'goldmine', pos: { x: 1200, y: 480 }, amount: 8000 },
      { type: 'goldmine', pos: { x: 1850, y: 500 }, amount: 14000 },
    ],
    resourceZones: [
      // Blue
      { type: 'tree', pos: { x: 760, y: 220 }, radius: 130, count: 22, seed: 0xEA01 },
      { type: 'tree', pos: { x: 740, y: 740 }, radius: 140, count: 24, seed: 0xEA02 },
      { type: 'rock', pos: { x: 220, y: 800 }, radius: 90, count: 8, seed: 0xEA03 },
      // Bridge
      { type: 'tree', pos: { x: 1200, y: 380 }, radius: 100, count: 12, seed: 0xEB01 },
      { type: 'rock', pos: { x: 1380, y: 600 }, radius: 70, count: 6, seed: 0xEB02 },
      // Red
      { type: 'tree', pos: { x: 1640, y: 220 }, radius: 130, count: 22, seed: 0xEC01 },
      { type: 'tree', pos: { x: 1660, y: 740 }, radius: 140, count: 24, seed: 0xEC02 },
      { type: 'rock', pos: { x: 2180, y: 800 }, radius: 90, count: 8, seed: 0xEC03 },
    ],
    creepCamps: [
      // Bridge guardians
      {
        pos: { x: 1150, y: 450 }, creeps: [{ type: 'orc', level: 3 }, { type: 'spearGoblin', level: 2 }],
        dropTable: [{ itemId: 'claws_of_attack', chance: 0.6 }, { itemId: 'healing_salve', chance: 1.0 }],
        cleared: false, xpReward: 200, difficulty: 2
      },
      {
        pos: { x: 1280, y: 550 }, creeps: [{ type: 'orc', level: 3 }, { type: 'goblin', level: 2 }],
        dropTable: [{ itemId: 'ring_of_protection', chance: 0.5 }],
        cleared: false, xpReward: 200, difficulty: 2
      },
    ],
  },

  // ── TWIN PEAKS (4 islands) — vertical 1v1 with high-ground advantage ───────
  {
    id: 'twin_peaks',
    name: 'Twin Peaks',
    subtitle: '1v1 Heights',
    description: 'Mirrored vertical layout with elevated home bases. Two shared resource islands between the peaks — fight for map control or turtle and tech.',
    mode: '1v1',
    worldW: 2200, worldH: 2000,
    thumbnail: '⛰️',
    islands: [
      { id: 'blue', x: 400, y: 60, w: 1400, h: 600, faction: 'blue' },
      { id: 'west', x: 80, y: 750, w: 600, h: 500, faction: 'neutral' },
      { id: 'east', x: 1520, y: 750, w: 600, h: 500, faction: 'neutral' },
      { id: 'red', x: 400, y: 1340, w: 1400, h: 600, faction: 'red' },
    ],
    blueCastle: { x: 950, y: 200 },
    redCastle: { x: 950, y: 1700 },
    startingResources: { gold: 500, wood: 150 },
    aiAttackInterval: 90,
    startingUnits: [
      { faction: 'blue', type: 'pawn', pos: { x: 1130, y: 280 } },
      { faction: 'blue', type: 'pawn', pos: { x: 1100, y: 360 } },
      { faction: 'blue', type: 'pawn', pos: { x: 1170, y: 350 } },
      { faction: 'blue', type: 'pawn', pos: { x: 1050, y: 400 } },
      { faction: 'blue', type: 'pawn', pos: { x: 1200, y: 400 } },
      { faction: 'red', type: 'pawn', pos: { x: 1130, y: 1720 } },
      { faction: 'red', type: 'pawn', pos: { x: 1100, y: 1640 } },
      { faction: 'red', type: 'pawn', pos: { x: 1170, y: 1650 } },
      { faction: 'red', type: 'pawn', pos: { x: 1050, y: 1600 } },
      { faction: 'red', type: 'pawn', pos: { x: 1200, y: 1600 } },
    ],
    resources: [
      { type: 'goldmine', pos: { x: 700, y: 350 }, amount: 12000 },
      { type: 'goldmine', pos: { x: 350, y: 980 }, amount: 10000 },
      { type: 'goldmine', pos: { x: 1850, y: 980 }, amount: 10000 },
      { type: 'goldmine', pos: { x: 700, y: 1650 }, amount: 12000 },
    ],
    resourceZones: [
      // Blue peak
      { type: 'tree', pos: { x: 600, y: 180 }, radius: 140, count: 22, seed: 0xFA01 },
      { type: 'tree', pos: { x: 1550, y: 180 }, radius: 140, count: 22, seed: 0xFA02 },
      { type: 'tree', pos: { x: 1400, y: 530 }, radius: 130, count: 20, seed: 0xFA03 },
      { type: 'rock', pos: { x: 600, y: 530 }, radius: 80, count: 7, seed: 0xFA04 },
      // West island
      { type: 'tree', pos: { x: 220, y: 830 }, radius: 130, count: 22, seed: 0xFB01 },
      { type: 'tree', pos: { x: 520, y: 1100 }, radius: 130, count: 22, seed: 0xFB02 },
      { type: 'rock', pos: { x: 580, y: 870 }, radius: 70, count: 6, seed: 0xFB03 },
      // East island
      { type: 'tree', pos: { x: 1670, y: 830 }, radius: 130, count: 22, seed: 0xFC01 },
      { type: 'tree', pos: { x: 1950, y: 1100 }, radius: 130, count: 22, seed: 0xFC02 },
      { type: 'rock', pos: { x: 1600, y: 870 }, radius: 70, count: 6, seed: 0xFC03 },
      // Red peak
      { type: 'tree', pos: { x: 600, y: 1820 }, radius: 140, count: 22, seed: 0xFD01 },
      { type: 'tree', pos: { x: 1550, y: 1820 }, radius: 140, count: 22, seed: 0xFD02 },
      { type: 'tree', pos: { x: 1400, y: 1470 }, radius: 130, count: 20, seed: 0xFD03 },
      { type: 'rock', pos: { x: 600, y: 1470 }, radius: 80, count: 7, seed: 0xFD04 },
    ],
    creepCamps: [
      // West island
      {
        pos: { x: 300, y: 900 }, creeps: [{ type: 'goblin', level: 1 }, { type: 'goblin', level: 1 }, { type: 'spearGoblin', level: 2 }],
        dropTable: [{ itemId: 'healing_salve', chance: 1.0 }, { itemId: 'boots_of_speed', chance: 0.4 }],
        cleared: false, xpReward: 150, difficulty: 1
      },
      {
        pos: { x: 450, y: 1050 }, creeps: [{ type: 'orc', level: 3 }, { type: 'archerGoblin', level: 2 }],
        dropTable: [{ itemId: 'claws_of_attack', chance: 0.5 }],
        cleared: false, xpReward: 250, difficulty: 2
      },
      // East island
      {
        pos: { x: 1800, y: 900 }, creeps: [{ type: 'skeleton', level: 1 }, { type: 'skeleton', level: 1 }, { type: 'skeleton', level: 2 }],
        dropTable: [{ itemId: 'mana_potion', chance: 1.0 }, { itemId: 'ring_of_protection', chance: 0.4 }],
        cleared: false, xpReward: 150, difficulty: 1
      },
      {
        pos: { x: 1700, y: 1050 }, creeps: [{ type: 'fireElemental', level: 4 }],
        dropTable: [{ itemId: 'orb_of_fire', chance: 0.5 }],
        cleared: false, xpReward: 300, difficulty: 3
      },
    ],
  },

  // ── GRUDGE ARENA (3 islands) — competitive 1v1 with central boss ────────────
  {
    id: 'grudge_arena',
    name: 'Grudge Arena',
    subtitle: '1v1 Ranked',
    description: 'The definitive 1v1 map. Symmetrical bases, one contested center island with a boss. First blood on the boss wins the item advantage. Designed for ranked play.',
    mode: '1v1',
    worldW: 3000, worldH: 1200,
    thumbnail: '🏆',
    islands: [
      { id: 'blue', x: 60, y: 80, w: 900, h: 1040, faction: 'blue' },
      { id: 'center', x: 1100, y: 150, w: 800, h: 900, faction: 'neutral' },
      { id: 'red', x: 2040, y: 80, w: 900, h: 1040, faction: 'red' },
    ],
    blueCastle: { x: 200, y: 400 },
    redCastle: { x: 2700, y: 400 },
    startingResources: { gold: 500, wood: 150 },
    aiAttackInterval: 80,
    startingUnits: [
      { faction: 'blue', type: 'pawn', pos: { x: 380, y: 460 } },
      { faction: 'blue', type: 'pawn', pos: { x: 350, y: 540 } },
      { faction: 'blue', type: 'pawn', pos: { x: 420, y: 530 } },
      { faction: 'blue', type: 'pawn', pos: { x: 300, y: 580 } },
      { faction: 'blue', type: 'pawn', pos: { x: 440, y: 580 } },
      { faction: 'red', type: 'pawn', pos: { x: 2580, y: 460 } },
      { faction: 'red', type: 'pawn', pos: { x: 2610, y: 540 } },
      { faction: 'red', type: 'pawn', pos: { x: 2550, y: 530 } },
      { faction: 'red', type: 'pawn', pos: { x: 2630, y: 580 } },
      { faction: 'red', type: 'pawn', pos: { x: 2520, y: 580 } },
    ],
    resources: [
      { type: 'goldmine', pos: { x: 600, y: 600 }, amount: 12500 },
      { type: 'goldmine', pos: { x: 1500, y: 580 }, amount: 15000 },
      { type: 'goldmine', pos: { x: 2400, y: 600 }, amount: 12500 },
    ],
    resourceZones: [
      // Blue home
      { type: 'tree', pos: { x: 800, y: 220 }, radius: 140, count: 24, seed: 0xAA01 },
      { type: 'tree', pos: { x: 800, y: 870 }, radius: 150, count: 26, seed: 0xAA02 },
      { type: 'rock', pos: { x: 250, y: 950 }, radius: 90, count: 8, seed: 0xAA03 },
      // Center contested
      { type: 'tree', pos: { x: 1350, y: 280 }, radius: 140, count: 22, seed: 0xAB01 },
      { type: 'tree', pos: { x: 1750, y: 300 }, radius: 140, count: 22, seed: 0xAB02 },
      { type: 'tree', pos: { x: 1500, y: 870 }, radius: 160, count: 26, seed: 0xAB03 },
      { type: 'rock', pos: { x: 1300, y: 950 }, radius: 80, count: 7, seed: 0xAB04 },
      { type: 'rock', pos: { x: 1700, y: 950 }, radius: 80, count: 7, seed: 0xAB05 },
      // Red home
      { type: 'tree', pos: { x: 2200, y: 220 }, radius: 140, count: 24, seed: 0xAC01 },
      { type: 'tree', pos: { x: 2200, y: 870 }, radius: 150, count: 26, seed: 0xAC02 },
      { type: 'rock', pos: { x: 2750, y: 950 }, radius: 90, count: 8, seed: 0xAC03 },
    ],
    creepCamps: [
      // Center easy camp
      {
        pos: { x: 1350, y: 450 }, creeps: [{ type: 'goblin', level: 1 }, { type: 'goblin', level: 1 }, { type: 'spearGoblin', level: 2 }],
        dropTable: [{ itemId: 'claws_of_attack', chance: 0.5 }, { itemId: 'healing_salve', chance: 1.0 }],
        cleared: false, xpReward: 150, difficulty: 1
      },
      // Center boss
      {
        pos: { x: 1500, y: 650 }, creeps: [{ type: 'ogreBoss', level: 6 }, { type: 'orc', level: 3 }, { type: 'orc', level: 3 }],
        dropTable: [{ itemId: 'crown_of_kings', chance: 0.7 }, { itemId: 'tome_of_power', chance: 0.5 }],
        cleared: false, xpReward: 600, difficulty: 4
      },
      // Center hard camp
      {
        pos: { x: 1650, y: 450 }, creeps: [{ type: 'fireElemental', level: 4 }, { type: 'skeleton', level: 2 }],
        dropTable: [{ itemId: 'orb_of_fire', chance: 0.5 }, { itemId: 'mana_potion', chance: 1.0 }],
        cleared: false, xpReward: 300, difficulty: 3
      },
    ],
  },
];
