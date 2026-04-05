/**
 * Island Weekly System — 8-Node Island Network
 *
 * Each game world has 8 interconnected island nodes forming a network.
 * Islands rotate weekly — new resources, creep camps, and control opportunities.
 *
 * Island types:
 *   - Home Island (2): Faction starting bases (blue, red). Cannot be captured.
 *   - Resource Island (2): Rich gold/wood. Capturable by controlling the flag.
 *   - Contested Island (2): PvP battlegrounds. Weekly creep boss spawns.
 *   - Bonus Island (1): Rare items, high-level creeps. Only accessible by ship.
 *   - Pirate Haven (1): Neutral pirate faction. Can be allied or raided.
 *
 * Weekly rotation resets:
 *   - Resource amounts on resource islands
 *   - Creep camps respawn on all islands
 *   - Control flags on contested islands reset to neutral
 *   - New random boss spawns on bonus island
 *   - Pirate Haven restocks shop items
 *
 * Connection to grudgewarlords.com:
 *   - Player accounts own persistent faction progress
 *   - Island control earns weekly faction points
 *   - Leaderboard tracks island captures per season
 */

import type { Faction, Vec2, UnitType } from './types';

// ── Island Node Types ───────────────────────────────────────────────────────────

export type IslandNodeType = 'home' | 'resource' | 'contested' | 'bonus' | 'pirate_haven';

export type IslandControlState = 'neutral' | 'blue' | 'red' | 'contested_active';

// ── Island Node ─────────────────────────────────────────────────────────────────

export interface IslandNode {
  id: string;
  name: string;
  type: IslandNodeType;
  /** Position in the world map (center of island) */
  pos: Vec2;
  /** Island dimensions */
  width: number;
  height: number;
  /** Current controlling faction */
  control: IslandControlState;
  /** Faction that owns this as home (only for 'home' type) */
  homeFaction?: Faction;
  /** Connected island IDs (reachable by ship) */
  connections: string[];
  /** Sea distance to connected islands (affects travel time) */
  distances: Record<string, number>;
  /** Resources available this week */
  resources: IslandResource[];
  /** Creep camps this week */
  creepCamps: IslandCreepCamp[];
  /** Capture flag position */
  flagPos?: Vec2;
  /** Capture progress: 0 = neutral, 100 = fully captured */
  captureProgress: number;
  /** Which faction is currently capturing */
  capturingFaction: Faction | null;
  /** Weekly point value for controlling this island */
  controlPoints: number;
  /** Special features */
  features: IslandFeature[];
  /** Dock positions for ships */
  dockPositions: Vec2[];
  /** Elevation tier (visual) */
  elevation: number;
}

export interface IslandResource {
  type: 'tree' | 'goldmine' | 'fish_node' | 'rare_ore';
  pos: Vec2;
  amount: number;
  maxAmount: number;
  respawnWeekly: boolean;
}

export interface IslandCreepCamp {
  id: string;
  pos: Vec2;
  creeps: { type: UnitType; level: number }[];
  cleared: boolean;
  bossLevel: boolean;
  xpReward: number;
  lootTable: { itemId: string; chance: number }[];
  /** Respawns on weekly reset */
  respawnsWeekly: boolean;
}

export type IslandFeature =
  | { type: 'pirate_shop'; pos: Vec2; stock: string[] }
  | { type: 'capture_flag'; pos: Vec2 }
  | { type: 'ancient_ruin'; pos: Vec2; bonusType: 'xp' | 'gold' | 'item' }
  | { type: 'shipyard'; pos: Vec2 }   // Can build ships here (even without docks)
  | { type: 'watchtower'; pos: Vec2 }  // Provides vision over surrounding water
  | { type: 'cannon_fort'; pos: Vec2; damage: number; range: number }; // Attacks enemy ships

// ── Sea Route ───────────────────────────────────────────────────────────────────

export interface SeaRoute {
  fromIslandId: string;
  toIslandId: string;
  /** Waypoints along the route (ships follow these) */
  waypoints: Vec2[];
  /** Distance in game units */
  distance: number;
  /** Danger level: 0 = safe, 1-5 = increasingly dangerous (pirates, storms) */
  dangerLevel: number;
}

// ── Weekly State ────────────────────────────────────────────────────────────────

export interface WeeklyState {
  weekNumber: number;
  seasonId: string;
  /** ISO timestamp of when this week started */
  weekStartedAt: string;
  /** ISO timestamp of when this week ends */
  weekEndsAt: string;
  /** Island control scores per faction this week */
  factionScores: Record<string, number>;
  /** Boss spawned on bonus island this week */
  weeklyBoss: { type: UnitType; level: number; name: string } | null;
  /** Events active this week */
  weeklyEvents: WeeklyEvent[];
}

export interface WeeklyEvent {
  id: string;
  name: string;
  description: string;
  type: 'double_resources' | 'boss_invasion' | 'pirate_raid' | 'fog_of_war' | 'alliance_opportunity';
  affectedIslands: string[];
}

// ── Default 8-Node Island Network ───────────────────────────────────────────────

export function createDefaultIslandNetwork(): { islands: IslandNode[]; routes: SeaRoute[] } {
  const islands: IslandNode[] = [
    // Home Islands (can't be captured)
    {
      id: 'home_blue', name: 'Blue Haven', type: 'home',
      pos: { x: 400, y: 1000 }, width: 900, height: 900,
      control: 'blue', homeFaction: 'blue',
      connections: ['resource_west', 'contested_north'],
      distances: { resource_west: 600, contested_north: 800 },
      resources: [
        { type: 'goldmine', pos: { x: 600, y: 1200 }, amount: 15000, maxAmount: 15000, respawnWeekly: true },
        { type: 'tree', pos: { x: 750, y: 900 }, amount: 500, maxAmount: 500, respawnWeekly: true },
        { type: 'tree', pos: { x: 800, y: 1100 }, amount: 500, maxAmount: 500, respawnWeekly: true },
      ],
      creepCamps: [],
      captureProgress: 100, capturingFaction: 'blue',
      controlPoints: 0, features: [],
      dockPositions: [{ x: 850, y: 1500 }, { x: 350, y: 700 }],
      elevation: 1,
    },
    {
      id: 'home_red', name: 'Red Bastion', type: 'home',
      pos: { x: 4600, y: 1000 }, width: 900, height: 900,
      control: 'red', homeFaction: 'red',
      connections: ['resource_east', 'contested_south'],
      distances: { resource_east: 600, contested_south: 800 },
      resources: [
        { type: 'goldmine', pos: { x: 4400, y: 1200 }, amount: 15000, maxAmount: 15000, respawnWeekly: true },
        { type: 'tree', pos: { x: 4250, y: 900 }, amount: 500, maxAmount: 500, respawnWeekly: true },
        { type: 'tree', pos: { x: 4200, y: 1100 }, amount: 500, maxAmount: 500, respawnWeekly: true },
      ],
      creepCamps: [],
      captureProgress: 100, capturingFaction: 'red',
      controlPoints: 0, features: [],
      dockPositions: [{ x: 4150, y: 1500 }, { x: 4650, y: 700 }],
      elevation: 1,
    },

    // Resource Islands (capturable, rich resources)
    {
      id: 'resource_west', name: 'Goldvein Atoll', type: 'resource',
      pos: { x: 1400, y: 500 }, width: 700, height: 600,
      control: 'neutral', connections: ['home_blue', 'contested_north', 'bonus_center'],
      distances: { home_blue: 600, contested_north: 500, bonus_center: 700 },
      resources: [
        { type: 'goldmine', pos: { x: 1500, y: 600 }, amount: 20000, maxAmount: 20000, respawnWeekly: true },
        { type: 'goldmine', pos: { x: 1700, y: 800 }, amount: 15000, maxAmount: 15000, respawnWeekly: true },
        { type: 'rare_ore', pos: { x: 1600, y: 700 }, amount: 5000, maxAmount: 5000, respawnWeekly: true },
      ],
      creepCamps: [
        { id: 'rw_camp1', pos: { x: 1450, y: 550 }, creeps: [{ type: 'orc', level: 3 }, { type: 'goblin', level: 2 }], cleared: false, bossLevel: false, xpReward: 200, lootTable: [{ itemId: 'claws_of_attack', chance: 0.5 }], respawnsWeekly: true },
        { id: 'rw_camp2', pos: { x: 1750, y: 750 }, creeps: [{ type: 'desertScorpio', level: 5 }], cleared: false, bossLevel: true, xpReward: 400, lootTable: [{ itemId: 'tome_of_power', chance: 0.6 }], respawnsWeekly: true },
      ],
      flagPos: { x: 1600, y: 650 },
      captureProgress: 0, capturingFaction: null,
      controlPoints: 50,
      features: [{ type: 'capture_flag', pos: { x: 1600, y: 650 } }],
      dockPositions: [{ x: 1350, y: 900 }],
      elevation: 1,
    },
    {
      id: 'resource_east', name: 'Timber Reef', type: 'resource',
      pos: { x: 3600, y: 1500 }, width: 700, height: 600,
      control: 'neutral', connections: ['home_red', 'contested_south', 'bonus_center'],
      distances: { home_red: 600, contested_south: 500, bonus_center: 700 },
      resources: [
        { type: 'tree', pos: { x: 3700, y: 1600 }, amount: 1000, maxAmount: 1000, respawnWeekly: true },
        { type: 'tree', pos: { x: 3900, y: 1700 }, amount: 1000, maxAmount: 1000, respawnWeekly: true },
        { type: 'goldmine', pos: { x: 3800, y: 1800 }, amount: 12000, maxAmount: 12000, respawnWeekly: true },
      ],
      creepCamps: [
        { id: 're_camp1', pos: { x: 3650, y: 1550 }, creeps: [{ type: 'skeleton', level: 3 }, { type: 'skeleton', level: 3 }], cleared: false, bossLevel: false, xpReward: 200, lootTable: [{ itemId: 'ring_of_protection', chance: 0.5 }], respawnsWeekly: true },
      ],
      flagPos: { x: 3800, y: 1650 },
      captureProgress: 0, capturingFaction: null,
      controlPoints: 50,
      features: [{ type: 'capture_flag', pos: { x: 3800, y: 1650 } }],
      dockPositions: [{ x: 3550, y: 1900 }],
      elevation: 1,
    },

    // Contested Islands (PvP battlegrounds)
    {
      id: 'contested_north', name: 'Warlord\'s Arena', type: 'contested',
      pos: { x: 2500, y: 200 }, width: 800, height: 700,
      control: 'neutral', connections: ['resource_west', 'bonus_center', 'pirate_haven'],
      distances: { resource_west: 500, bonus_center: 600, pirate_haven: 900 },
      resources: [
        { type: 'goldmine', pos: { x: 2600, y: 400 }, amount: 10000, maxAmount: 10000, respawnWeekly: true },
      ],
      creepCamps: [
        { id: 'cn_boss', pos: { x: 2700, y: 500 }, creeps: [{ type: 'dragon', level: 8 }], cleared: false, bossLevel: true, xpReward: 800, lootTable: [{ itemId: 'dragon_heart', chance: 0.5 }, { itemId: 'orb_of_fire', chance: 0.7 }], respawnsWeekly: true },
      ],
      flagPos: { x: 2600, y: 500 },
      captureProgress: 0, capturingFaction: null,
      controlPoints: 100,
      features: [
        { type: 'capture_flag', pos: { x: 2600, y: 500 } },
        { type: 'cannon_fort', pos: { x: 2300, y: 300 }, damage: 60, range: 300 },
      ],
      dockPositions: [{ x: 2200, y: 700 }, { x: 2900, y: 700 }],
      elevation: 2,
    },
    {
      id: 'contested_south', name: 'Grudge Shore', type: 'contested',
      pos: { x: 2500, y: 1600 }, width: 800, height: 700,
      control: 'neutral', connections: ['resource_east', 'bonus_center', 'pirate_haven'],
      distances: { resource_east: 500, bonus_center: 600, pirate_haven: 900 },
      resources: [
        { type: 'goldmine', pos: { x: 2600, y: 1800 }, amount: 10000, maxAmount: 10000, respawnWeekly: true },
      ],
      creepCamps: [
        { id: 'cs_boss', pos: { x: 2700, y: 1900 }, creeps: [{ type: 'ogreBoss', level: 7 }, { type: 'yeti', level: 5 }], cleared: false, bossLevel: true, xpReward: 700, lootTable: [{ itemId: 'crown_of_kings', chance: 0.5 }], respawnsWeekly: true },
      ],
      flagPos: { x: 2600, y: 1900 },
      captureProgress: 0, capturingFaction: null,
      controlPoints: 100,
      features: [
        { type: 'capture_flag', pos: { x: 2600, y: 1900 } },
        { type: 'watchtower', pos: { x: 2800, y: 1700 } },
      ],
      dockPositions: [{ x: 2200, y: 2100 }, { x: 2900, y: 2100 }],
      elevation: 2,
    },

    // Bonus Island (ship access only, rare loot)
    {
      id: 'bonus_center', name: 'Dragon\'s Hoard', type: 'bonus',
      pos: { x: 2500, y: 900 }, width: 600, height: 600,
      control: 'neutral', connections: ['resource_west', 'resource_east', 'contested_north', 'contested_south'],
      distances: { resource_west: 700, resource_east: 700, contested_north: 600, contested_south: 600 },
      resources: [
        { type: 'goldmine', pos: { x: 2600, y: 1000 }, amount: 25000, maxAmount: 25000, respawnWeekly: true },
        { type: 'rare_ore', pos: { x: 2700, y: 1100 }, amount: 10000, maxAmount: 10000, respawnWeekly: true },
      ],
      creepCamps: [
        { id: 'bc_boss', pos: { x: 2650, y: 1050 }, creeps: [{ type: 'dragon', level: 10 }, { type: 'fireElemental', level: 6 }, { type: 'fireElemental', level: 6 }], cleared: false, bossLevel: true, xpReward: 1200, lootTable: [{ itemId: 'dragon_heart', chance: 0.8 }, { itemId: 'crown_of_kings', chance: 0.6 }, { itemId: 'orb_of_fire', chance: 0.9 }], respawnsWeekly: true },
      ],
      captureProgress: 0, capturingFaction: null,
      controlPoints: 200,
      features: [
        { type: 'ancient_ruin', pos: { x: 2550, y: 950 }, bonusType: 'item' },
      ],
      dockPositions: [{ x: 2400, y: 1300 }],
      elevation: 3,
    },

    // Pirate Haven (neutral faction, trade/raid)
    {
      id: 'pirate_haven', name: 'Blackbeard\'s Rest', type: 'pirate_haven',
      pos: { x: 4000, y: 300 }, width: 600, height: 500,
      control: 'neutral', connections: ['contested_north', 'contested_south'],
      distances: { contested_north: 900, contested_south: 900 },
      resources: [],
      creepCamps: [
        { id: 'ph_guard', pos: { x: 4100, y: 400 }, creeps: [{ type: 'pirateCaptain', level: 6 }, { type: 'pirateGunner', level: 4 }, { type: 'pirateGunner', level: 4 }, { type: 'pirate', level: 3 }, { type: 'pirate', level: 3 }], cleared: false, bossLevel: true, xpReward: 600, lootTable: [{ itemId: 'boots_of_speed', chance: 0.7 }, { itemId: 'amulet_of_mana', chance: 0.5 }], respawnsWeekly: true },
      ],
      captureProgress: 0, capturingFaction: null,
      controlPoints: 75,
      features: [
        { type: 'pirate_shop', pos: { x: 4050, y: 450 }, stock: ['healing_salve', 'mana_potion', 'scroll_healing', 'claws_of_attack', 'boots_of_speed'] },
        { type: 'shipyard', pos: { x: 4200, y: 550 } },
      ],
      dockPositions: [{ x: 3950, y: 600 }],
      elevation: 1,
    },
  ];

  // Sea routes connecting islands
  const routes: SeaRoute[] = [
    { fromIslandId: 'home_blue', toIslandId: 'resource_west', waypoints: [{ x: 900, y: 800 }, { x: 1200, y: 600 }], distance: 600, dangerLevel: 0 },
    { fromIslandId: 'home_blue', toIslandId: 'contested_north', waypoints: [{ x: 800, y: 600 }, { x: 1500, y: 400 }, { x: 2200, y: 300 }], distance: 800, dangerLevel: 1 },
    { fromIslandId: 'resource_west', toIslandId: 'contested_north', waypoints: [{ x: 1800, y: 400 }, { x: 2200, y: 300 }], distance: 500, dangerLevel: 1 },
    { fromIslandId: 'resource_west', toIslandId: 'bonus_center', waypoints: [{ x: 1800, y: 700 }, { x: 2200, y: 800 }], distance: 700, dangerLevel: 2 },
    { fromIslandId: 'contested_north', toIslandId: 'bonus_center', waypoints: [{ x: 2500, y: 600 }], distance: 600, dangerLevel: 2 },
    { fromIslandId: 'contested_north', toIslandId: 'pirate_haven', waypoints: [{ x: 3000, y: 200 }, { x: 3500, y: 250 }], distance: 900, dangerLevel: 3 },
    { fromIslandId: 'bonus_center', toIslandId: 'resource_east', waypoints: [{ x: 2900, y: 1200 }, { x: 3300, y: 1400 }], distance: 700, dangerLevel: 2 },
    { fromIslandId: 'bonus_center', toIslandId: 'contested_south', waypoints: [{ x: 2500, y: 1400 }], distance: 600, dangerLevel: 2 },
    { fromIslandId: 'resource_east', toIslandId: 'contested_south', waypoints: [{ x: 3200, y: 1600 }], distance: 500, dangerLevel: 1 },
    { fromIslandId: 'resource_east', toIslandId: 'home_red', waypoints: [{ x: 4100, y: 1400 }, { x: 4400, y: 1200 }], distance: 600, dangerLevel: 0 },
    { fromIslandId: 'contested_south', toIslandId: 'pirate_haven', waypoints: [{ x: 3000, y: 1800 }, { x: 3500, y: 1000 }, { x: 3800, y: 500 }], distance: 900, dangerLevel: 3 },
    { fromIslandId: 'home_red', toIslandId: 'contested_south', waypoints: [{ x: 4200, y: 1400 }, { x: 3500, y: 1700 }], distance: 800, dangerLevel: 1 },
  ];

  return { islands, routes };
}

// ── Capture Mechanics ───────────────────────────────────────────────────────────

const CAPTURE_RATE = 5;      // Points per second per unit near flag
const CAPTURE_MAX = 100;     // Fully captured
const CAPTURE_RADIUS = 150;  // Units must be within this range of flag

export interface CaptureUpdate {
  islandId: string;
  newControl: IslandControlState;
  newProgress: number;
}

/**
 * Update capture progress for an island based on nearby units.
 * Call every game tick for contested/resource islands.
 */
export function updateIslandCapture(
  island: IslandNode,
  blueUnitsNearFlag: number,
  redUnitsNearFlag: number,
  dt: number,
): CaptureUpdate | null {
  if (island.type === 'home') return null; // Home islands can't be captured
  if (!island.flagPos) return null;

  const netBlue = blueUnitsNearFlag - redUnitsNearFlag;

  if (netBlue === 0) return null; // Contested, no progress

  const capturingFaction: Faction = netBlue > 0 ? 'blue' : 'red';
  const captureForce = Math.abs(netBlue);
  const delta = captureForce * CAPTURE_RATE * dt;

  if (island.control === capturingFaction || island.control === 'neutral') {
    // Capturing or maintaining
    if (island.capturingFaction !== capturingFaction && island.captureProgress > 0) {
      // Enemy was capturing — reverse progress first
      island.captureProgress = Math.max(0, island.captureProgress - delta);
      if (island.captureProgress === 0) {
        island.capturingFaction = null;
        island.control = 'neutral';
      }
    } else {
      island.capturingFaction = capturingFaction;
      island.captureProgress = Math.min(CAPTURE_MAX, island.captureProgress + delta);
      if (island.captureProgress >= CAPTURE_MAX) {
        island.control = capturingFaction;
        return { islandId: island.id, newControl: capturingFaction, newProgress: CAPTURE_MAX };
      }
    }
  } else {
    // Enemy controls — must neutralize first
    island.captureProgress = Math.max(0, island.captureProgress - delta);
    if (island.captureProgress <= 0) {
      island.control = 'neutral';
      island.capturingFaction = null;
      island.captureProgress = 0;
    }
  }

  return { islandId: island.id, newControl: island.control, newProgress: island.captureProgress };
}

// ── Weekly Reset ────────────────────────────────────────────────────────────────

const WEEKLY_BOSSES: { type: UnitType; level: number; name: string }[] = [
  { type: 'dragon', level: 10, name: 'Scorchfang the Elder' },
  { type: 'ogreBoss', level: 9, name: 'Crushbone the Mighty' },
  { type: 'steampunkMech', level: 10, name: 'Iron Titan MK-VII' },
  { type: 'pirateCaptainHero', level: 8, name: 'Dreadbeard the Cursed' },
];

export function performWeeklyReset(islands: IslandNode[]): WeeklyState {
  const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Reset resources
  for (const island of islands) {
    for (const res of island.resources) {
      if (res.respawnWeekly) res.amount = res.maxAmount;
    }
    // Reset creep camps
    for (const camp of island.creepCamps) {
      if (camp.respawnsWeekly) camp.cleared = false;
    }
    // Reset contested islands to neutral
    if (island.type === 'contested') {
      island.control = 'neutral';
      island.captureProgress = 0;
      island.capturingFaction = null;
    }
  }

  // Pick weekly boss
  const boss = WEEKLY_BOSSES[weekNum % WEEKLY_BOSSES.length];

  return {
    weekNumber: weekNum,
    seasonId: `season_${Math.floor(weekNum / 12)}`, // 12-week seasons
    weekStartedAt: now.toISOString(),
    weekEndsAt: weekEnd.toISOString(),
    factionScores: { blue: 0, red: 0 },
    weeklyBoss: boss,
    weeklyEvents: [],
  };
}

// ── Score calculation ───────────────────────────────────────────────────────────

export function calcWeeklyScores(islands: IslandNode[]): Record<string, number> {
  const scores: Record<string, number> = { blue: 0, red: 0 };
  for (const island of islands) {
    if (island.control === 'blue') scores.blue += island.controlPoints;
    if (island.control === 'red') scores.red += island.controlPoints;
  }
  return scores;
}

// ── Island network graph helpers ────────────────────────────────────────────────

/** Find shortest sea route between two islands using BFS on the network */
export function findSeaPath(
  islands: IslandNode[],
  fromId: string,
  toId: string,
): string[] {
  const adj = new Map<string, string[]>();
  for (const isl of islands) adj.set(isl.id, isl.connections);

  const prev = new Map<string, string | null>([[fromId, null]]);
  const queue = [fromId];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur === toId) break;
    for (const nb of adj.get(cur) ?? []) {
      if (!prev.has(nb)) {
        prev.set(nb, cur);
        queue.push(nb);
      }
    }
  }

  if (!prev.has(toId)) return []; // No path

  const path: string[] = [];
  let cur: string | null = toId;
  while (cur) {
    path.unshift(cur);
    cur = prev.get(cur) ?? null;
  }
  return path;
}

/** Get the home island for a faction */
export function getHomeIsland(islands: IslandNode[], faction: Faction): IslandNode | null {
  return islands.find(i => i.type === 'home' && i.homeFaction === faction) ?? null;
}

/** Get home island spawn point (for captain wash-up after sinking) */
export function getHomeSpawnPoint(islands: IslandNode[], faction: Faction): Vec2 {
  const home = getHomeIsland(islands, faction);
  if (!home) return { x: 0, y: 0 };
  // Spawn near the first dock
  if (home.dockPositions.length > 0) {
    return { ...home.dockPositions[0] };
  }
  return { x: home.pos.x, y: home.pos.y };
}

export { CAPTURE_RADIUS };
