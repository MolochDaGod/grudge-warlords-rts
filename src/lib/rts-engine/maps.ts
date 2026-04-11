import type { Island, CreepCamp, UnitType } from './types';

export interface ResourceDef { type: 'tree' | 'goldmine'; pos: { x: number; y: number }; amount?: number; }
export interface UnitDef { faction: 'blue' | 'red'; type: UnitType; pos: { x: number; y: number }; }

export type MapMode = '1v1' | 'ffa' | 'boss';

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
  creepCamps: Omit<CreepCamp, 'id'>[];
  startingResources: { gold: number; wood: number };
  aiAttackInterval: number;
  thumbnail: string;
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
      { id: 'blue',    x: 80,   y: 80,  w: 860, h: 900, faction: 'blue' },
      { id: 'grudge1', x: 1050, y: 150, w: 640, h: 810, faction: 'neutral' },
      { id: 'grudge2', x: 1800, y: 150, w: 640, h: 810, faction: 'neutral' },
      { id: 'red',     x: 2550, y: 80,  w: 860, h: 900, faction: 'red' },
    ],
    blueCastle: { x: 200, y: 320 },
    redCastle:  { x: 3120, y: 320 },
    startingResources: { gold: 500, wood: 150 },
    aiAttackInterval: 90,
    startingUnits: [
      { faction: 'blue', type: 'pawn', pos: { x: 380, y: 380 } },
      { faction: 'blue', type: 'pawn', pos: { x: 350, y: 460 } },
      { faction: 'blue', type: 'pawn', pos: { x: 420, y: 450 } },
      { faction: 'blue', type: 'pawn', pos: { x: 300, y: 500 } },
      { faction: 'blue', type: 'pawn', pos: { x: 440, y: 500 } },
      { faction: 'red',  type: 'pawn', pos: { x: 2940, y: 380 } },
      { faction: 'red',  type: 'pawn', pos: { x: 2970, y: 460 } },
      { faction: 'red',  type: 'pawn', pos: { x: 2900, y: 450 } },
      { faction: 'red',  type: 'pawn', pos: { x: 2880, y: 500 } },
      { faction: 'red',  type: 'pawn', pos: { x: 2960, y: 500 } },
    ],
    resources: [
      // Blue island — trees + gold mine
      { type: 'tree', pos: { x: 700, y: 180 } }, { type: 'tree', pos: { x: 780, y: 260 } },
      { type: 'tree', pos: { x: 840, y: 170 } }, { type: 'tree', pos: { x: 660, y: 720 } },
      { type: 'tree', pos: { x: 740, y: 790 } }, { type: 'tree', pos: { x: 800, y: 700 } },
      { type: 'tree', pos: { x: 880, y: 620 } }, { type: 'tree', pos: { x: 910, y: 750 } },
      { type: 'goldmine', pos: { x: 600, y: 500 }, amount: 12500 },
      // Grudge 1 — gold mine + trees
      { type: 'tree', pos: { x: 1110, y: 240 } }, { type: 'tree', pos: { x: 1220, y: 310 } },
      { type: 'tree', pos: { x: 1400, y: 220 } }, { type: 'tree', pos: { x: 1540, y: 300 } },
      { type: 'tree', pos: { x: 1620, y: 800 } },
      { type: 'goldmine', pos: { x: 1350, y: 480 }, amount: 10000 },
      // Grudge 2 — gold mine + trees
      { type: 'tree', pos: { x: 1860, y: 240 } }, { type: 'tree', pos: { x: 1970, y: 310 } },
      { type: 'tree', pos: { x: 2150, y: 220 } }, { type: 'tree', pos: { x: 2300, y: 300 } },
      { type: 'tree', pos: { x: 2380, y: 800 } },
      { type: 'goldmine', pos: { x: 2100, y: 480 }, amount: 10000 },
      // Red island
      { type: 'tree', pos: { x: 2620, y: 180 } }, { type: 'tree', pos: { x: 2700, y: 260 } },
      { type: 'tree', pos: { x: 2640, y: 170 } }, { type: 'tree', pos: { x: 2660, y: 720 } },
      { type: 'tree', pos: { x: 2720, y: 790 } }, { type: 'tree', pos: { x: 2680, y: 700 } },
      { type: 'tree', pos: { x: 2590, y: 620 } }, { type: 'tree', pos: { x: 2610, y: 750 } },
      { type: 'goldmine', pos: { x: 2860, y: 500 }, amount: 12500 },
    ],
    creepCamps: [
      // Grudge 1 — easy camp guarding gold mine
      { pos: { x: 1300, y: 400 }, creeps: [{ type: 'goblin', level: 1 }, { type: 'goblin', level: 1 }, { type: 'spearGoblin', level: 2 }],
        dropTable: [{ itemId: 'claws_of_attack', chance: 0.5 }, { itemId: 'healing_salve', chance: 1.0 }],
        cleared: false, xpReward: 150, difficulty: 1 },
      // Grudge 1 — hard camp
      { pos: { x: 1400, y: 700 }, creeps: [{ type: 'orc', level: 3 }, { type: 'archerGoblin', level: 2 }],
        dropTable: [{ itemId: 'ring_of_protection', chance: 0.6 }, { itemId: 'mana_potion', chance: 1.0 }],
        cleared: false, xpReward: 250, difficulty: 2 },
      // Grudge 2 — easy camp
      { pos: { x: 2050, y: 400 }, creeps: [{ type: 'skeleton', level: 1 }, { type: 'skeleton', level: 1 }, { type: 'skeleton', level: 2 }],
        dropTable: [{ itemId: 'boots_of_speed', chance: 0.4 }, { itemId: 'healing_salve', chance: 1.0 }],
        cleared: false, xpReward: 150, difficulty: 1 },
      // Grudge 2 — hard camp
      { pos: { x: 2200, y: 700 }, creeps: [{ type: 'fireElemental', level: 4 }],
        dropTable: [{ itemId: 'tome_of_power', chance: 0.5 }, { itemId: 'periapt_of_vitality', chance: 0.3 }],
        cleared: false, xpReward: 350, difficulty: 3 },
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
      { id: 'blue',    x: 80,   y: 100, w: 900, h: 900, faction: 'blue' },
      { id: 'grudge1', x: 1090, y: 200, w: 700, h: 750, faction: 'neutral' },
      { id: 'grudge2', x: 1900, y: 100, w: 960, h: 900, faction: 'neutral' },
      { id: 'grudge3', x: 2970, y: 200, w: 700, h: 750, faction: 'neutral' },
      { id: 'red',     x: 3780, y: 100, w: 900, h: 900, faction: 'red' },
      { id: 'grudge4', x: 1900, y: 1110, w: 960, h: 800, faction: 'neutral' },
    ],
    blueCastle: { x: 230, y: 390 },
    redCastle:  { x: 4350, y: 390 },
    startingResources: { gold: 500, wood: 150 },
    aiAttackInterval: 120,
    startingUnits: [
      { faction: 'blue', type: 'pawn', pos: { x: 410, y: 460 } },
      { faction: 'blue', type: 'pawn', pos: { x: 380, y: 540 } },
      { faction: 'blue', type: 'pawn', pos: { x: 450, y: 540 } },
      { faction: 'blue', type: 'pawn', pos: { x: 350, y: 500 } },
      { faction: 'blue', type: 'pawn', pos: { x: 460, y: 480 } },
      { faction: 'red',  type: 'pawn', pos: { x: 4170, y: 460 } },
      { faction: 'red',  type: 'pawn', pos: { x: 4200, y: 540 } },
      { faction: 'red',  type: 'pawn', pos: { x: 4130, y: 540 } },
      { faction: 'red',  type: 'pawn', pos: { x: 4100, y: 500 } },
      { faction: 'red',  type: 'pawn', pos: { x: 4220, y: 480 } },
    ],
    resources: [
      // Blue island
      { type: 'tree', pos: { x: 750, y: 200 } }, { type: 'tree', pos: { x: 840, y: 290 } },
      { type: 'tree', pos: { x: 900, y: 190 } }, { type: 'tree', pos: { x: 720, y: 800 } },
      { type: 'tree', pos: { x: 800, y: 860 } }, { type: 'tree', pos: { x: 870, y: 780 } },
      { type: 'goldmine', pos: { x: 650, y: 550 }, amount: 12500 },
      // Grudge 1
      { type: 'tree', pos: { x: 1150, y: 290 } }, { type: 'tree', pos: { x: 1280, y: 370 } },
      { type: 'tree', pos: { x: 1450, y: 270 } }, { type: 'tree', pos: { x: 1680, y: 340 } },
      { type: 'goldmine', pos: { x: 1400, y: 580 }, amount: 8000 },
      // Grudge 2 center
      { type: 'tree', pos: { x: 1980, y: 200 } }, { type: 'tree', pos: { x: 2100, y: 300 } },
      { type: 'tree', pos: { x: 2500, y: 250 } }, { type: 'tree', pos: { x: 2800, y: 310 } },
      { type: 'goldmine', pos: { x: 2380, y: 500 }, amount: 10000 },
      // Grudge 3
      { type: 'tree', pos: { x: 3030, y: 290 } }, { type: 'tree', pos: { x: 3160, y: 370 } },
      { type: 'tree', pos: { x: 3330, y: 270 } }, { type: 'tree', pos: { x: 3560, y: 340 } },
      { type: 'goldmine', pos: { x: 3300, y: 580 }, amount: 8000 },
      // Red island
      { type: 'tree', pos: { x: 3840, y: 200 } }, { type: 'tree', pos: { x: 3900, y: 290 } },
      { type: 'tree', pos: { x: 3870, y: 800 } }, { type: 'tree', pos: { x: 3910, y: 860 } },
      { type: 'goldmine', pos: { x: 4100, y: 550 }, amount: 12500 },
      // Grudge 4 bonus island — rich
      { type: 'tree', pos: { x: 1970, y: 1200 } }, { type: 'tree', pos: { x: 2120, y: 1310 } },
      { type: 'tree', pos: { x: 2300, y: 1180 } }, { type: 'tree', pos: { x: 2480, y: 1280 } },
      { type: 'tree', pos: { x: 2640, y: 1210 } }, { type: 'tree', pos: { x: 2780, y: 1320 } },
      { type: 'goldmine', pos: { x: 2380, y: 1500 }, amount: 15000 },
    ],
    creepCamps: [
      // Grudge 1 easy
      { pos: { x: 1350, y: 350 }, creeps: [{ type: 'goblin', level: 1 }, { type: 'goblin', level: 1 }],
        dropTable: [{ itemId: 'healing_salve', chance: 1.0 }], cleared: false, xpReward: 100, difficulty: 1 },
      // Grudge 1 medium
      { pos: { x: 1500, y: 700 }, creeps: [{ type: 'orc', level: 3 }, { type: 'spearGoblin', level: 2 }],
        dropTable: [{ itemId: 'claws_of_attack', chance: 0.5 }], cleared: false, xpReward: 250, difficulty: 2 },
      // Grudge 2 center hard
      { pos: { x: 2300, y: 350 }, creeps: [{ type: 'yeti', level: 5 }, { type: 'orc', level: 3 }],
        dropTable: [{ itemId: 'tome_of_power', chance: 0.6 }, { itemId: 'amulet_of_mana', chance: 0.3 }],
        cleared: false, xpReward: 400, difficulty: 3 },
      // Grudge 3 easy
      { pos: { x: 3200, y: 350 }, creeps: [{ type: 'skeleton', level: 1 }, { type: 'skeleton', level: 1 }],
        dropTable: [{ itemId: 'mana_potion', chance: 1.0 }], cleared: false, xpReward: 100, difficulty: 1 },
      // Grudge 3 medium
      { pos: { x: 3400, y: 700 }, creeps: [{ type: 'desertScorpio', level: 4 }, { type: 'archerGoblin', level: 2 }],
        dropTable: [{ itemId: 'ring_of_protection', chance: 0.5 }], cleared: false, xpReward: 280, difficulty: 2 },
      // Grudge 4 BOSS — Ogre Boss guards rich island
      { pos: { x: 2380, y: 1400 }, creeps: [{ type: 'ogreBoss', level: 8 }, { type: 'orc', level: 4 }, { type: 'orc', level: 4 }],
        dropTable: [{ itemId: 'crown_of_kings', chance: 0.8 }, { itemId: 'orb_of_fire', chance: 0.4 }],
        cleared: false, xpReward: 800, difficulty: 5 },
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
      { id: 'blue', x: 60,   y: 100, w: 800, h: 1000, faction: 'blue' },
      { id: 'mid',  x: 1000, y: 200, w: 800, h: 800,  faction: 'neutral' },
      { id: 'red',  x: 1940, y: 100, w: 800, h: 1000, faction: 'red' },
    ],
    blueCastle: { x: 200, y: 400 },
    redCastle:  { x: 2560, y: 400 },
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
      { type: 'tree', pos: { x: 650, y: 200 } }, { type: 'tree', pos: { x: 730, y: 280 } },
      { type: 'tree', pos: { x: 600, y: 800 } }, { type: 'tree', pos: { x: 700, y: 880 } },
      { type: 'tree', pos: { x: 780, y: 750 } }, { type: 'tree', pos: { x: 820, y: 900 } },
      { type: 'goldmine', pos: { x: 550, y: 600 }, amount: 10000 },
      { type: 'tree', pos: { x: 1100, y: 300 } }, { type: 'tree', pos: { x: 1300, y: 350 } },
      { type: 'tree', pos: { x: 1500, y: 280 } }, { type: 'tree', pos: { x: 1700, y: 330 } },
      { type: 'tree', pos: { x: 1200, y: 800 } }, { type: 'tree', pos: { x: 1600, y: 850 } },
      { type: 'goldmine', pos: { x: 1400, y: 550 }, amount: 15000 },
      { type: 'tree', pos: { x: 2050, y: 200 } }, { type: 'tree', pos: { x: 2130, y: 280 } },
      { type: 'tree', pos: { x: 2000, y: 800 } }, { type: 'tree', pos: { x: 2100, y: 880 } },
      { type: 'tree', pos: { x: 2200, y: 750 } }, { type: 'tree', pos: { x: 2300, y: 900 } },
      { type: 'goldmine', pos: { x: 2200, y: 600 }, amount: 10000 },
    ],
    creepCamps: [
      { pos: { x: 1300, y: 400 }, creeps: [{ type: 'spearGoblin', level: 2 }, { type: 'goblin', level: 1 }, { type: 'goblin', level: 1 }],
        dropTable: [{ itemId: 'claws_of_attack', chance: 0.6 }, { itemId: 'healing_salve', chance: 1.0 }],
        cleared: false, xpReward: 180, difficulty: 2 },
      { pos: { x: 1500, y: 700 }, creeps: [{ type: 'dragon', level: 6 }],
        dropTable: [{ itemId: 'dragon_heart', chance: 0.5 }, { itemId: 'orb_of_fire', chance: 0.7 }],
        cleared: false, xpReward: 600, difficulty: 4 },
      { pos: { x: 1200, y: 650 }, creeps: [{ type: 'orc', level: 3 }, { type: 'archerGoblin', level: 2 }],
        dropTable: [{ itemId: 'ring_of_protection', chance: 0.5 }],
        cleared: false, xpReward: 250, difficulty: 2 },
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
      { id: 'blue',     x: 80,   y: 300,  w: 900, h: 900, faction: 'blue' },
      { id: 'blueExp',  x: 80,   y: 1400, w: 700, h: 700, faction: 'neutral' },
      { id: 'north1',   x: 1200, y: 80,   w: 700, h: 650, faction: 'neutral' },
      { id: 'center',   x: 2100, y: 800,  w: 1000, h: 1000, faction: 'neutral' },
      { id: 'north2',   x: 3200, y: 80,   w: 700, h: 650, faction: 'neutral' },
      { id: 'south',    x: 2100, y: 2000, w: 900, h: 600, faction: 'neutral' },
      { id: 'redExp',   x: 4420, y: 1400, w: 700, h: 700, faction: 'neutral' },
      { id: 'red',      x: 4320, y: 300,  w: 900, h: 900, faction: 'red' },
    ],
    blueCastle: { x: 250, y: 600 },
    redCastle:  { x: 4950, y: 600 },
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
      { type: 'tree', pos: { x: 750, y: 400 } }, { type: 'tree', pos: { x: 800, y: 500 } }, { type: 'tree', pos: { x: 850, y: 380 } },
      { type: 'tree', pos: { x: 700, y: 950 } }, { type: 'tree', pos: { x: 780, y: 1050 } },
      { type: 'goldmine', pos: { x: 350, y: 1700 }, amount: 8000 },
      { type: 'tree', pos: { x: 200, y: 1500 } }, { type: 'tree', pos: { x: 500, y: 1550 } },
      { type: 'goldmine', pos: { x: 1500, y: 350 }, amount: 8000 },
      { type: 'tree', pos: { x: 1300, y: 200 } }, { type: 'tree', pos: { x: 1700, y: 250 } },
      { type: 'goldmine', pos: { x: 2600, y: 1250 }, amount: 18000 },
      { type: 'tree', pos: { x: 2200, y: 900 } }, { type: 'tree', pos: { x: 2400, y: 950 } }, { type: 'tree', pos: { x: 2800, y: 1000 } },
      { type: 'tree', pos: { x: 2300, y: 1600 } }, { type: 'tree', pos: { x: 2700, y: 1650 } },
      { type: 'goldmine', pos: { x: 3500, y: 350 }, amount: 8000 },
      { type: 'tree', pos: { x: 3300, y: 200 } }, { type: 'tree', pos: { x: 3700, y: 250 } },
      { type: 'goldmine', pos: { x: 2550, y: 2250 }, amount: 10000 },
      { type: 'tree', pos: { x: 2200, y: 2100 } }, { type: 'tree', pos: { x: 2800, y: 2150 } },
      { type: 'goldmine', pos: { x: 4700, y: 1700 }, amount: 8000 },
      { type: 'tree', pos: { x: 4500, y: 1500 } }, { type: 'tree', pos: { x: 4850, y: 1550 } },
      { type: 'goldmine', pos: { x: 4650, y: 750 }, amount: 12000 },
      { type: 'tree', pos: { x: 4450, y: 400 } }, { type: 'tree', pos: { x: 4500, y: 500 } }, { type: 'tree', pos: { x: 4550, y: 950 } },
    ],
    creepCamps: [
      { pos: { x: 350, y: 1650 }, creeps: [{ type: 'pirate', level: 2 }, { type: 'pirate', level: 2 }],
        dropTable: [{ itemId: 'healing_salve', chance: 1.0 }], cleared: false, xpReward: 120, difficulty: 1 },
      { pos: { x: 1450, y: 300 }, creeps: [{ type: 'pirateGunner', level: 3 }, { type: 'pirate', level: 2 }],
        dropTable: [{ itemId: 'boots_of_speed', chance: 0.5 }], cleared: false, xpReward: 200, difficulty: 2 },
      { pos: { x: 2500, y: 1100 }, creeps: [{ type: 'pirateCaptain', level: 6 }, { type: 'pirateGunner', level: 4 }, { type: 'pirateGunner', level: 4 }],
        dropTable: [{ itemId: 'crown_of_kings', chance: 0.7 }, { itemId: 'orb_of_fire', chance: 0.5 }],
        cleared: false, xpReward: 700, difficulty: 5 },
      { pos: { x: 3450, y: 300 }, creeps: [{ type: 'pirateGunner', level: 3 }, { type: 'pirate', level: 2 }],
        dropTable: [{ itemId: 'claws_of_attack', chance: 0.5 }], cleared: false, xpReward: 200, difficulty: 2 },
      { pos: { x: 2500, y: 2200 }, creeps: [{ type: 'giantCrab', level: 5 }, { type: 'slime', level: 2 }],
        dropTable: [{ itemId: 'periapt_of_vitality', chance: 0.6 }], cleared: false, xpReward: 350, difficulty: 3 },
      { pos: { x: 4650, y: 1650 }, creeps: [{ type: 'pirate', level: 2 }, { type: 'pirate', level: 2 }],
        dropTable: [{ itemId: 'mana_potion', chance: 1.0 }], cleared: false, xpReward: 120, difficulty: 1 },
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
      { id: 'blue',  x: 60,   y: 100, w: 800, h: 1200, faction: 'blue' },
      { id: 'gate1', x: 1000, y: 200, w: 600, h: 1000, faction: 'neutral' },
      { id: 'arena', x: 1740, y: 100, w: 700, h: 1200, faction: 'neutral' },
      { id: 'gate2', x: 2580, y: 200, w: 600, h: 1000, faction: 'neutral' },
      { id: 'red',   x: 3320, y: 100, w: 800, h: 1200, faction: 'red' },
    ],
    blueCastle: { x: 200, y: 500 },
    redCastle:  { x: 3900, y: 500 },
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
      { type: 'tree', pos: { x: 650, y: 200 } }, { type: 'tree', pos: { x: 700, y: 300 } },
      { type: 'tree', pos: { x: 750, y: 900 } }, { type: 'tree', pos: { x: 800, y: 1000 } },
      { type: 'tree', pos: { x: 600, y: 1100 } }, { type: 'tree', pos: { x: 700, y: 1150 } },
      { type: 'goldmine', pos: { x: 1250, y: 650 }, amount: 8000 },
      { type: 'tree', pos: { x: 1100, y: 400 } }, { type: 'tree', pos: { x: 1400, y: 350 } },
      { type: 'goldmine', pos: { x: 2080, y: 650 }, amount: 12000 },
      { type: 'tree', pos: { x: 1850, y: 250 } }, { type: 'tree', pos: { x: 2100, y: 300 } },
      { type: 'tree', pos: { x: 2300, y: 1050 } }, { type: 'tree', pos: { x: 1900, y: 1100 } },
      { type: 'goldmine', pos: { x: 2850, y: 650 }, amount: 8000 },
      { type: 'tree', pos: { x: 2700, y: 400 } }, { type: 'tree', pos: { x: 2980, y: 350 } },
      { type: 'goldmine', pos: { x: 3600, y: 700 }, amount: 15000 },
      { type: 'tree', pos: { x: 3450, y: 200 } }, { type: 'tree', pos: { x: 3500, y: 300 } },
      { type: 'tree', pos: { x: 3550, y: 900 } }, { type: 'tree', pos: { x: 3400, y: 1100 } },
    ],
    creepCamps: [
      // Gate 1 — Minotaur boss
      { pos: { x: 1200, y: 500 }, creeps: [{ type: 'minotaur', level: 5 }, { type: 'orc', level: 3 }, { type: 'orc', level: 3 }],
        dropTable: [{ itemId: 'claws_of_attack', chance: 0.8 }, { itemId: 'periapt_of_vitality', chance: 0.5 }],
        cleared: false, xpReward: 400, difficulty: 3 },
      { pos: { x: 1350, y: 900 }, creeps: [{ type: 'skeleton', level: 3 }, { type: 'skeleton', level: 3 }, { type: 'necromancer', level: 4 }],
        dropTable: [{ itemId: 'amulet_of_mana', chance: 0.6 }], cleared: false, xpReward: 300, difficulty: 3 },
      // Arena — Dragon boss
      { pos: { x: 2050, y: 450 }, creeps: [{ type: 'dragon', level: 8 }, { type: 'fireElemental', level: 5 }],
        dropTable: [{ itemId: 'dragon_heart', chance: 0.6 }, { itemId: 'orb_of_fire', chance: 0.8 }],
        cleared: false, xpReward: 800, difficulty: 5 },
      { pos: { x: 2100, y: 950 }, creeps: [{ type: 'demon', level: 6 }, { type: 'armouredDemon', level: 5 }, { type: 'purpleDemon', level: 4 }],
        dropTable: [{ itemId: 'crown_of_kings', chance: 0.5 }, { itemId: 'tome_of_power', chance: 0.7 }],
        cleared: false, xpReward: 700, difficulty: 4 },
      // Gate 2 — Ogre boss
      { pos: { x: 2800, y: 500 }, creeps: [{ type: 'ogreBoss', level: 7 }, { type: 'yeti', level: 4 }, { type: 'yeti', level: 4 }],
        dropTable: [{ itemId: 'boots_of_speed', chance: 0.7 }, { itemId: 'ring_of_protection', chance: 0.6 }],
        cleared: false, xpReward: 500, difficulty: 4 },
      { pos: { x: 2900, y: 900 }, creeps: [{ type: 'mammoth', level: 6 }, { type: 'wendigo', level: 5 }],
        dropTable: [{ itemId: 'periapt_of_vitality', chance: 0.5 }], cleared: false, xpReward: 450, difficulty: 4 },
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
      { id: 'blue', x: 60,   y: 80,  w: 800, h: 840, faction: 'blue' },
      { id: 'bridge', x: 920, y: 320, w: 560, h: 360, faction: 'neutral' },
      { id: 'red',  x: 1540, y: 80,  w: 800, h: 840, faction: 'red' },
    ],
    blueCastle: { x: 200, y: 320 },
    redCastle:  { x: 2100, y: 320 },
    startingResources: { gold: 500, wood: 200 },
    aiAttackInterval: 75,
    startingUnits: [
      { faction: 'blue', type: 'pawn', pos: { x: 380, y: 380 } },
      { faction: 'blue', type: 'pawn', pos: { x: 350, y: 460 } },
      { faction: 'blue', type: 'pawn', pos: { x: 420, y: 450 } },
      { faction: 'blue', type: 'pawn', pos: { x: 300, y: 520 } },
      { faction: 'blue', type: 'pawn', pos: { x: 440, y: 510 } },
      { faction: 'red',  type: 'pawn', pos: { x: 1930, y: 380 } },
      { faction: 'red',  type: 'pawn', pos: { x: 1960, y: 460 } },
      { faction: 'red',  type: 'pawn', pos: { x: 1900, y: 450 } },
      { faction: 'red',  type: 'pawn', pos: { x: 1870, y: 520 } },
      { faction: 'red',  type: 'pawn', pos: { x: 1970, y: 510 } },
    ],
    resources: [
      // Blue
      { type: 'goldmine', pos: { x: 550, y: 500 }, amount: 14000 },
      { type: 'tree', pos: { x: 700, y: 180 } }, { type: 'tree', pos: { x: 780, y: 260 } },
      { type: 'tree', pos: { x: 660, y: 700 } }, { type: 'tree', pos: { x: 740, y: 780 } },
      { type: 'tree', pos: { x: 800, y: 650 } }, { type: 'tree', pos: { x: 820, y: 200 } },
      // Bridge
      { type: 'goldmine', pos: { x: 1200, y: 480 }, amount: 8000 },
      { type: 'tree', pos: { x: 1050, y: 380 } }, { type: 'tree', pos: { x: 1350, y: 400 } },
      // Red
      { type: 'goldmine', pos: { x: 1850, y: 500 }, amount: 14000 },
      { type: 'tree', pos: { x: 1600, y: 180 } }, { type: 'tree', pos: { x: 1680, y: 260 } },
      { type: 'tree', pos: { x: 1640, y: 700 } }, { type: 'tree', pos: { x: 1720, y: 780 } },
      { type: 'tree', pos: { x: 1580, y: 650 } }, { type: 'tree', pos: { x: 1560, y: 200 } },
    ],
    creepCamps: [
      // Bridge guardians
      { pos: { x: 1150, y: 450 }, creeps: [{ type: 'orc', level: 3 }, { type: 'spearGoblin', level: 2 }],
        dropTable: [{ itemId: 'claws_of_attack', chance: 0.6 }, { itemId: 'healing_salve', chance: 1.0 }],
        cleared: false, xpReward: 200, difficulty: 2 },
      { pos: { x: 1280, y: 550 }, creeps: [{ type: 'orc', level: 3 }, { type: 'goblin', level: 2 }],
        dropTable: [{ itemId: 'ring_of_protection', chance: 0.5 }],
        cleared: false, xpReward: 200, difficulty: 2 },
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
      { id: 'blue', x: 400, y: 60,   w: 1400, h: 600, faction: 'blue' },
      { id: 'west', x: 80,  y: 750,  w: 600,  h: 500, faction: 'neutral' },
      { id: 'east', x: 1520, y: 750, w: 600,  h: 500, faction: 'neutral' },
      { id: 'red',  x: 400, y: 1340, w: 1400, h: 600, faction: 'red' },
    ],
    blueCastle: { x: 950, y: 200 },
    redCastle:  { x: 950, y: 1700 },
    startingResources: { gold: 500, wood: 150 },
    aiAttackInterval: 90,
    startingUnits: [
      { faction: 'blue', type: 'pawn', pos: { x: 1130, y: 280 } },
      { faction: 'blue', type: 'pawn', pos: { x: 1100, y: 360 } },
      { faction: 'blue', type: 'pawn', pos: { x: 1170, y: 350 } },
      { faction: 'blue', type: 'pawn', pos: { x: 1050, y: 400 } },
      { faction: 'blue', type: 'pawn', pos: { x: 1200, y: 400 } },
      { faction: 'red',  type: 'pawn', pos: { x: 1130, y: 1720 } },
      { faction: 'red',  type: 'pawn', pos: { x: 1100, y: 1640 } },
      { faction: 'red',  type: 'pawn', pos: { x: 1170, y: 1650 } },
      { faction: 'red',  type: 'pawn', pos: { x: 1050, y: 1600 } },
      { faction: 'red',  type: 'pawn', pos: { x: 1200, y: 1600 } },
    ],
    resources: [
      // Blue peak
      { type: 'goldmine', pos: { x: 700, y: 350 }, amount: 12000 },
      { type: 'tree', pos: { x: 550, y: 150 } }, { type: 'tree', pos: { x: 650, y: 200 } },
      { type: 'tree', pos: { x: 1500, y: 150 } }, { type: 'tree', pos: { x: 1600, y: 200 } },
      { type: 'tree', pos: { x: 1400, y: 500 } }, { type: 'tree', pos: { x: 600, y: 500 } },
      // West island
      { type: 'goldmine', pos: { x: 350, y: 980 }, amount: 10000 },
      { type: 'tree', pos: { x: 180, y: 850 } }, { type: 'tree', pos: { x: 280, y: 800 } },
      { type: 'tree', pos: { x: 500, y: 1100 } }, { type: 'tree', pos: { x: 550, y: 850 } },
      // East island
      { type: 'goldmine', pos: { x: 1850, y: 980 }, amount: 10000 },
      { type: 'tree', pos: { x: 1620, y: 850 } }, { type: 'tree', pos: { x: 1720, y: 800 } },
      { type: 'tree', pos: { x: 1900, y: 1100 } }, { type: 'tree', pos: { x: 2000, y: 850 } },
      // Red peak
      { type: 'goldmine', pos: { x: 700, y: 1650 }, amount: 12000 },
      { type: 'tree', pos: { x: 550, y: 1800 } }, { type: 'tree', pos: { x: 650, y: 1850 } },
      { type: 'tree', pos: { x: 1500, y: 1800 } }, { type: 'tree', pos: { x: 1600, y: 1850 } },
      { type: 'tree', pos: { x: 1400, y: 1450 } }, { type: 'tree', pos: { x: 600, y: 1450 } },
    ],
    creepCamps: [
      // West island
      { pos: { x: 300, y: 900 }, creeps: [{ type: 'goblin', level: 1 }, { type: 'goblin', level: 1 }, { type: 'spearGoblin', level: 2 }],
        dropTable: [{ itemId: 'healing_salve', chance: 1.0 }, { itemId: 'boots_of_speed', chance: 0.4 }],
        cleared: false, xpReward: 150, difficulty: 1 },
      { pos: { x: 450, y: 1050 }, creeps: [{ type: 'orc', level: 3 }, { type: 'archerGoblin', level: 2 }],
        dropTable: [{ itemId: 'claws_of_attack', chance: 0.5 }],
        cleared: false, xpReward: 250, difficulty: 2 },
      // East island
      { pos: { x: 1800, y: 900 }, creeps: [{ type: 'skeleton', level: 1 }, { type: 'skeleton', level: 1 }, { type: 'skeleton', level: 2 }],
        dropTable: [{ itemId: 'mana_potion', chance: 1.0 }, { itemId: 'ring_of_protection', chance: 0.4 }],
        cleared: false, xpReward: 150, difficulty: 1 },
      { pos: { x: 1700, y: 1050 }, creeps: [{ type: 'fireElemental', level: 4 }],
        dropTable: [{ itemId: 'orb_of_fire', chance: 0.5 }],
        cleared: false, xpReward: 300, difficulty: 3 },
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
      { id: 'blue',   x: 60,   y: 80,  w: 900, h: 1040, faction: 'blue' },
      { id: 'center', x: 1100, y: 150, w: 800, h: 900,  faction: 'neutral' },
      { id: 'red',    x: 2040, y: 80,  w: 900, h: 1040, faction: 'red' },
    ],
    blueCastle: { x: 200, y: 400 },
    redCastle:  { x: 2700, y: 400 },
    startingResources: { gold: 500, wood: 150 },
    aiAttackInterval: 80,
    startingUnits: [
      { faction: 'blue', type: 'pawn', pos: { x: 380, y: 460 } },
      { faction: 'blue', type: 'pawn', pos: { x: 350, y: 540 } },
      { faction: 'blue', type: 'pawn', pos: { x: 420, y: 530 } },
      { faction: 'blue', type: 'pawn', pos: { x: 300, y: 580 } },
      { faction: 'blue', type: 'pawn', pos: { x: 440, y: 580 } },
      { faction: 'red',  type: 'pawn', pos: { x: 2580, y: 460 } },
      { faction: 'red',  type: 'pawn', pos: { x: 2610, y: 540 } },
      { faction: 'red',  type: 'pawn', pos: { x: 2550, y: 530 } },
      { faction: 'red',  type: 'pawn', pos: { x: 2630, y: 580 } },
      { faction: 'red',  type: 'pawn', pos: { x: 2520, y: 580 } },
    ],
    resources: [
      // Blue home
      { type: 'goldmine', pos: { x: 600, y: 600 }, amount: 12500 },
      { type: 'tree', pos: { x: 700, y: 180 } }, { type: 'tree', pos: { x: 780, y: 260 } },
      { type: 'tree', pos: { x: 840, y: 170 } }, { type: 'tree', pos: { x: 660, y: 820 } },
      { type: 'tree', pos: { x: 740, y: 890 } }, { type: 'tree', pos: { x: 800, y: 800 } },
      { type: 'tree', pos: { x: 880, y: 720 } }, { type: 'tree', pos: { x: 910, y: 850 } },
      // Center
      { type: 'goldmine', pos: { x: 1500, y: 580 }, amount: 15000 },
      { type: 'tree', pos: { x: 1200, y: 250 } }, { type: 'tree', pos: { x: 1350, y: 300 } },
      { type: 'tree', pos: { x: 1650, y: 280 } }, { type: 'tree', pos: { x: 1800, y: 320 } },
      { type: 'tree', pos: { x: 1250, y: 850 } }, { type: 'tree', pos: { x: 1750, y: 880 } },
      // Red home
      { type: 'goldmine', pos: { x: 2400, y: 600 }, amount: 12500 },
      { type: 'tree', pos: { x: 2120, y: 180 } }, { type: 'tree', pos: { x: 2200, y: 260 } },
      { type: 'tree', pos: { x: 2160, y: 170 } }, { type: 'tree', pos: { x: 2300, y: 820 } },
      { type: 'tree', pos: { x: 2220, y: 890 } }, { type: 'tree', pos: { x: 2160, y: 800 } },
      { type: 'tree', pos: { x: 2100, y: 720 } }, { type: 'tree', pos: { x: 2080, y: 850 } },
    ],
    creepCamps: [
      // Center easy camp
      { pos: { x: 1350, y: 450 }, creeps: [{ type: 'goblin', level: 1 }, { type: 'goblin', level: 1 }, { type: 'spearGoblin', level: 2 }],
        dropTable: [{ itemId: 'claws_of_attack', chance: 0.5 }, { itemId: 'healing_salve', chance: 1.0 }],
        cleared: false, xpReward: 150, difficulty: 1 },
      // Center boss
      { pos: { x: 1500, y: 650 }, creeps: [{ type: 'ogreBoss', level: 6 }, { type: 'orc', level: 3 }, { type: 'orc', level: 3 }],
        dropTable: [{ itemId: 'crown_of_kings', chance: 0.7 }, { itemId: 'tome_of_power', chance: 0.5 }],
        cleared: false, xpReward: 600, difficulty: 4 },
      // Center hard camp
      { pos: { x: 1650, y: 450 }, creeps: [{ type: 'fireElemental', level: 4 }, { type: 'skeleton', level: 2 }],
        dropTable: [{ itemId: 'orb_of_fire', chance: 0.5 }, { itemId: 'mana_potion', chance: 1.0 }],
        cleared: false, xpReward: 300, difficulty: 3 },
    ],
  },
];
