/**
 * Sailing Ship & Naval System — WC3-Style Island RTS
 *
 * These are WOODEN SAILING SHIPS for the island warfare game mode.
 * For modular spaceships (Grudge Space RTS), see ship-blocks.ts.
 *
 * Ships are built at Docks. Each ship requires a Captain (hero unit).
 * Crew capacity depends on ship size: Sloop=6, WarGalleon=10, PirateFrigate=14.
 * If a ship sinks in open water, all crew dies except the Captain, who
 * washes up on their faction's home island.
 *
 * Ship types:
 *   - FishingBoat: no combat, gathers gold from sea nodes, capacity 2
 *   - Sloop: fast scout, light cannons, capacity 6
 *   - TransportShip: no cannons, high HP, capacity 10
 *   - WarGalleon: broadside cannons, medium speed, capacity 10
 *   - PirateFrigate: heavy cannons, slow, capacity 14
 */

import type { Faction, Vec2, TechTier } from './types';

// ── Ship Types ──────────────────────────────────────────────────────────────────

export type ShipType = 'fishingBoat' | 'sloop' | 'transportShip' | 'warGalleon' | 'pirateFrigate';

export type ShipState = 'idle' | 'moving' | 'attacking' | 'sinking' | 'docked' | 'destroyed';

// ── Ship Config ─────────────────────────────────────────────────────────────────

export interface ShipConfig {
  hp: number;
  speed: number;           // px/sec on water
  turnSpeed: number;       // radians/sec
  cannonDamage: number;    // Per broadside volley
  cannonRange: number;     // px
  cannonCooldown: number;  // seconds between volleys
  cannonCount: number;     // 0 = no combat
  crewCapacity: number;    // Max units (not including captain)
  cost: { gold: number; wood: number };
  buildTime: number;       // seconds
  requiredTier: TechTier;
  /** Sprite CDN path */
  sprite: string;
  spriteW: number;
  spriteH: number;
}

const CDN = 'https://molochdagod.github.io/ObjectStore';

export const SHIP_CONFIGS: Record<ShipType, ShipConfig> = {
  fishingBoat: {
    hp: 80, speed: 100, turnSpeed: 2.0,
    cannonDamage: 0, cannonRange: 0, cannonCooldown: 0, cannonCount: 0,
    crewCapacity: 2,
    cost: { gold: 100, wood: 80 }, buildTime: 15, requiredTier: 1,
    sprite: `${CDN}/sprites/miniworld/Ships/Boat.png`,
    spriteW: 32, spriteH: 32,
  },
  sloop: {
    hp: 200, speed: 140, turnSpeed: 1.8,
    cannonDamage: 25, cannonRange: 200, cannonCooldown: 2.5, cannonCount: 2,
    crewCapacity: 6,
    cost: { gold: 250, wood: 200 }, buildTime: 25, requiredTier: 1,
    sprite: `${CDN}/sprites/miniworld/Ships/Ship_Small.png`,
    spriteW: 48, spriteH: 48,
  },
  transportShip: {
    hp: 400, speed: 80, turnSpeed: 1.2,
    cannonDamage: 0, cannonRange: 0, cannonCooldown: 0, cannonCount: 0,
    crewCapacity: 10,
    cost: { gold: 300, wood: 250 }, buildTime: 35, requiredTier: 2,
    sprite: `${CDN}/sprites/miniworld/Ships/Ship_Medium.png`,
    spriteW: 64, spriteH: 64,
  },
  warGalleon: {
    hp: 500, speed: 90, turnSpeed: 1.0,
    cannonDamage: 50, cannonRange: 280, cannonCooldown: 3.5, cannonCount: 6,
    crewCapacity: 10,
    cost: { gold: 500, wood: 400 }, buildTime: 50, requiredTier: 2,
    sprite: `${CDN}/sprites/miniworld/Ships/Ship_Large.png`,
    spriteW: 80, spriteH: 80,
  },
  pirateFrigate: {
    hp: 700, speed: 70, turnSpeed: 0.8,
    cannonDamage: 75, cannonRange: 320, cannonCooldown: 4.0, cannonCount: 10,
    crewCapacity: 14,
    cost: { gold: 800, wood: 600 }, buildTime: 70, requiredTier: 3,
    sprite: `${CDN}/sprites/miniworld/Ships/Ship_Pirates.png`,
    spriteW: 96, spriteH: 96,
  },
};

// ── Ship Instance ───────────────────────────────────────────────────────────────

export interface Ship {
  id: string;
  faction: Faction;
  type: ShipType;
  pos: Vec2;
  target: Vec2 | null;
  waypoints: Vec2[];
  heading: number;         // radians, 0 = right
  hp: number;
  maxHp: number;
  state: ShipState;
  /** The captain (hero unit ID) controlling this ship. Required. */
  captainId: string;
  /** Embarked unit IDs (crew, NOT including captain) */
  crew: string[];
  /** Attack target ship ID */
  attackTargetId: string | null;
  cannonCooldown: number;
  /** Build progress (0-1, 1 = complete) */
  buildProgress: number;
  /** Sinking timer — after HP=0, ship sinks over 3 seconds */
  sinkTimer: number;
  /** Which docks building spawned this ship */
  docksId: string;
  selected: boolean;
}

// ── Ship Factory ────────────────────────────────────────────────────────────────

let _shipId = 1;
function shipUid(): string { return `ship_${_shipId++}`; }

export function makeShip(
  faction: Faction,
  type: ShipType,
  pos: Vec2,
  captainId: string,
  docksId: string,
): Ship {
  const cfg = SHIP_CONFIGS[type];
  return {
    id: shipUid(),
    faction, type,
    pos: { ...pos },
    target: null, waypoints: [],
    heading: 0,
    hp: cfg.hp, maxHp: cfg.hp,
    state: 'docked',
    captainId,
    crew: [],
    attackTargetId: null,
    cannonCooldown: 0,
    buildProgress: 0,
    sinkTimer: 0,
    docksId,
    selected: false,
  };
}

// ── Ship helpers ────────────────────────────────────────────────────────────────

export function getShipCapacity(type: ShipType): number {
  return SHIP_CONFIGS[type].crewCapacity;
}

export function isShipFull(ship: Ship): boolean {
  return ship.crew.length >= SHIP_CONFIGS[ship.type].crewCapacity;
}

export function canShipAttack(type: ShipType): boolean {
  return SHIP_CONFIGS[type].cannonCount > 0;
}

/** Embark a unit onto a ship. Returns false if ship is full. */
export function embarkUnit(ship: Ship, unitId: string): boolean {
  if (isShipFull(ship)) return false;
  if (ship.crew.includes(unitId)) return false;
  ship.crew.push(unitId);
  return true;
}

/** Disembark a unit from a ship. Returns false if unit not on ship. */
export function disembarkUnit(ship: Ship, unitId: string): boolean {
  const idx = ship.crew.indexOf(unitId);
  if (idx === -1) return false;
  ship.crew.splice(idx, 1);
  return true;
}

/** Disembark ALL crew at a position. Returns list of unit IDs to place. */
export function disembarkAll(ship: Ship): string[] {
  const units = [...ship.crew, ship.captainId];
  ship.crew = [];
  ship.captainId = ''; // Ship is now unmanned
  ship.state = 'docked';
  return units;
}

// ── Sinking mechanic ────────────────────────────────────────────────────────────
/**
 * When a ship's HP reaches 0:
 *   1. Ship enters 'sinking' state with 3-second timer
 *   2. All crew units are killed (removed from game)
 *   3. Captain survives — teleported to home island spawn point
 *   4. Ship becomes 'destroyed' and is removed
 *
 * Returns: { captainId, crewIds } for the engine to process deaths/survival.
 */
export interface SinkResult {
  captainId: string;
  crewIds: string[];       // These units die
  captainSurvives: boolean; // Captain always survives sinking
}

export function processSinking(ship: Ship): SinkResult {
  return {
    captainId: ship.captainId,
    crewIds: [...ship.crew],
    captainSurvives: true, // Captain ALWAYS washes up on home island
  };
}

// ── Ship movement helpers ───────────────────────────────────────────────────────

export function shipDist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function shipNorm(v: Vec2): Vec2 {
  const d = Math.hypot(v.x, v.y);
  return d < 0.001 ? { x: 0, y: 0 } : { x: v.x / d, y: v.y / d };
}

/**
 * Update ship heading toward target with turn speed limit.
 * Returns new heading.
 */
export function updateShipHeading(current: number, targetAngle: number, turnSpeed: number, dt: number): number {
  let diff = targetAngle - current;
  // Normalize to [-PI, PI]
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const maxTurn = turnSpeed * dt;
  if (Math.abs(diff) <= maxTurn) return targetAngle;
  return current + Math.sign(diff) * maxTurn;
}

// ── Ship training at docks ──────────────────────────────────────────────────────

export interface ShipBuildOrder {
  type: ShipType;
  captainId: string;    // Hero unit assigned as captain
  progress: number;     // 0-1
}

/** Check if a docks building can build a specific ship type */
export function canBuildShip(
  type: ShipType,
  techTier: TechTier,
  gold: number,
  wood: number,
): boolean {
  const cfg = SHIP_CONFIGS[type];
  return techTier >= cfg.requiredTier && gold >= cfg.cost.gold && wood >= cfg.cost.wood;
}

// ── Broadside combat ────────────────────────────────────────────────────────────
/**
 * Broadside attack: fires cannons perpendicular to ship heading.
 * Damage = cannonDamage × cannonCount (full broadside)
 * Range check uses distance between ship positions.
 */
export function calcBroadsideDamage(attackerType: ShipType): number {
  const cfg = SHIP_CONFIGS[attackerType];
  return cfg.cannonDamage * cfg.cannonCount;
}

// ── Ship sprite info ────────────────────────────────────────────────────────────
export function getShipSprite(type: ShipType): { src: string; w: number; h: number } {
  const cfg = SHIP_CONFIGS[type];
  return { src: cfg.sprite, w: cfg.spriteW, h: cfg.spriteH };
}
