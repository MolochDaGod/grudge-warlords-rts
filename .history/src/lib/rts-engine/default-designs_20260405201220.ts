// ── Default Faction Designs ─────────────────────────────────────────────────────
// Pre-built tech tree designs for each faction loaded from grudge-rts-design.json
// These serve as the starting point when no saved design exists.

import type { DesignerNode, Connection, DesignDocument } from './designer-types';

export type FactionId = 'kingdom' | 'legion' | 'neutral';

export interface FactionDesign {
  id: FactionId;
  label: string;
  icon: string;
  color: string;       // accent color for tabs
  bgColor: string;     // bg tint for faction tab
  nodes: DesignerNode[];
  connections: Connection[];
}

// ── Kingdom (Human / Blue) — Complete Tech Tree ───────────────────────────────
// Buildings use blue/ Tiny Swords sprites. Units use blue warrior/archer/monk local sprites.

const KINGDOM_NODES: DesignerNode[] = [
  // ── Town Hall line (center column) ──────────────────────────────────────────
  { id: 'k_1', kind: 'building', name: 'Castle', icon: '🏰', x: 340, y: 20, w: 140, h: 90, configKey: 'castle', stats: { hp: 1500, foodProvided: 12, buildTime: 0 }, color: '#92400e', tier: 1, cost: { wood: 0, gold: 0 }, description: 'T1 Town Hall — Trains workers, enables all construction' },
  { id: 'k_2', kind: 'building', name: 'Keep', icon: '🏯', x: 340, y: 160, w: 140, h: 90, configKey: 'keep', stats: { hp: 2000, foodProvided: 12, buildTime: 60 }, color: '#92400e', tier: 2, cost: { wood: 200, gold: 500 }, description: 'T2 Town Hall — Unlocks Sanctum & Chapel upgrades' },
  { id: 'k_3', kind: 'building', name: 'Fortress', icon: '⛩️', x: 340, y: 300, w: 140, h: 90, configKey: 'fortress', stats: { hp: 2500, foodProvided: 12, buildTime: 80 }, color: '#92400e', tier: 3, cost: { wood: 300, gold: 700 }, description: 'T3 Town Hall — Enables Sanctum construction' },
  // ── Workers (trained at Castle) ─────────────────────────────────────────────
  { id: 'k_4', kind: 'unit', name: 'Pawn', icon: '⛏️', x: 150, y: 20, w: 120, h: 80, configKey: 'pawn', stats: { hp: 50, damage: 6, armor: 0, speed: 80, range: 40, foodCost: 1 }, color: '#1e40af', tier: 1, cost: { wood: 0, gold: 75 }, description: 'Worker T1 — Harvests, builds, repairs' },
  { id: 'k_5', kind: 'unit', name: 'Farmer', icon: '🌾', x: 530, y: 20, w: 120, h: 80, configKey: 'farmer', stats: { hp: 30, damage: 4, armor: 0, speed: 75, range: 35, foodCost: 1 }, color: '#1e40af', tier: 1, cost: { wood: 0, gold: 50 }, description: 'Worker T1 — Faster harvest, lower combat' },
  // ── Economy buildings ────────────────────────────────────────────────────────
  { id: 'k_6', kind: 'building', name: 'House', icon: '🏠', x: 60, y: 160, w: 140, h: 90, configKey: 'house', stats: { hp: 200, foodProvided: 10, buildTime: 10 }, color: '#92400e', tier: 1, cost: { wood: 50, gold: 0 }, description: 'T1 Economy — +10 food cap' },
  { id: 'k_7', kind: 'building', name: 'Market', icon: '🏪', x: 60, y: 280, w: 140, h: 90, configKey: 'market', stats: { hp: 300, foodProvided: 0, buildTime: 18 }, color: '#92400e', tier: 1, cost: { wood: 200, gold: 50 }, description: 'T1 Economy — Trade wood for gold' },
  { id: 'k_8', kind: 'building', name: 'Tavern', icon: '🍺', x: 60, y: 400, w: 140, h: 90, configKey: 'tavern', stats: { hp: 300, foodProvided: 0, buildTime: 20 }, color: '#92400e', tier: 1, cost: { wood: 200, gold: 50 }, description: 'T1 Economy — Hero revival discount' },
  // ── Defense ──────────────────────────────────────────────────────────────────
  { id: 'k_9', kind: 'building', name: 'Tower', icon: '🗼', x: 620, y: 160, w: 140, h: 90, configKey: 'tower', stats: { hp: 400, foodProvided: 0, buildTime: 18, attackDamage: 30, attackRange: 220 }, color: '#92400e', tier: 1, cost: { wood: 100, gold: 80 }, description: 'T1 Defense — Attacks enemies within 220 range' },
  // ── Military T1 ──────────────────────────────────────────────────────────────
  { id: 'k_10', kind: 'building', name: 'Barracks', icon: '⚔️', x: 150, y: 160, w: 140, h: 90, configKey: 'barracks', stats: { hp: 500, foodProvided: 0, buildTime: 25 }, color: '#92400e', tier: 1, cost: { wood: 200, gold: 0 }, description: 'T1 Military — Trains melee units' },
  { id: 'k_11', kind: 'building', name: 'Archery', icon: '🏹', x: 530, y: 160, w: 140, h: 90, configKey: 'archery', stats: { hp: 450, foodProvided: 0, buildTime: 25 }, color: '#92400e', tier: 1, cost: { wood: 150, gold: 50 }, description: 'T1 Military — Trains ranged units' },
  // ── Military T2 ──────────────────────────────────────────────────────────────
  { id: 'k_12', kind: 'building', name: 'Chapel', icon: '⛪', x: 150, y: 300, w: 140, h: 90, configKey: 'chapel', stats: { hp: 500, foodProvided: 0, buildTime: 30 }, color: '#92400e', tier: 2, cost: { wood: 200, gold: 100 }, description: 'T2 Military — Trains casters; requires Keep' },
  { id: 'k_13', kind: 'building', name: 'Workshop', icon: '🔧', x: 530, y: 300, w: 140, h: 90, configKey: 'workshop', stats: { hp: 400, foodProvided: 0, buildTime: 28 }, color: '#92400e', tier: 2, cost: { wood: 200, gold: 100 }, description: 'T2 Military — Trains siege; requires Barracks' },
  { id: 'k_14', kind: 'building', name: 'Blacksmith', icon: '⚒️', x: 620, y: 300, w: 140, h: 90, configKey: 'blacksmith', stats: { hp: 400, foodProvided: 0, buildTime: 20 }, color: '#92400e', tier: 1, cost: { wood: 200, gold: 80 }, description: 'T1 Upgrades — Research attack & armor upgrades' },
  // ── Military T3 ──────────────────────────────────────────────────────────────
  { id: 'k_15', kind: 'building', name: 'Sanctum', icon: '🌟', x: 340, y: 440, w: 140, h: 90, configKey: 'sanctum', stats: { hp: 600, foodProvided: 0, buildTime: 50 }, color: '#7c3aed', tier: 3, cost: { wood: 300, gold: 250 }, description: 'T3 Military — Trains elite champions; requires Chapel + Fortress' },
  // ── Hero building ────────────────────────────────────────────────────────────
  { id: 'k_16', kind: 'building', name: 'Altar', icon: '🪦', x: 150, y: 440, w: 140, h: 90, configKey: 'altar', stats: { hp: 600, foodProvided: 0, buildTime: 30 }, color: '#7c3aed', tier: 1, cost: { wood: 200, gold: 150 }, description: 'T1 Heroes — Summon & revive heroes' },
  // ── Docks ────────────────────────────────────────────────────────────────────
  { id: 'k_17', kind: 'building', name: 'Docks', icon: '⚓', x: 530, y: 440, w: 140, h: 90, configKey: 'docks', stats: { hp: 400, foodProvided: 0, buildTime: 22 }, color: '#92400e', tier: 2, cost: { wood: 200, gold: 100 }, description: 'T2 Economy — Enables water trade routes' },
  // ── Units ────────────────────────────────────────────────────────────────────
  { id: 'k_18', kind: 'unit', name: 'Swordsman', icon: '⚔️', x: 60, y: 530, w: 120, h: 80, configKey: 'swordsman', stats: { hp: 90, damage: 12, armor: 1, speed: 82, range: 48, foodCost: 2 }, color: '#1e40af', tier: 1, cost: { wood: 0, gold: 135 }, description: 'Melee T1 — Barracks' },
  { id: 'k_19', kind: 'unit', name: 'Spearman', icon: '🔱', x: 180, y: 530, w: 120, h: 80, configKey: 'spearman', stats: { hp: 100, damage: 15, armor: 1, speed: 78, range: 60, foodCost: 2 }, color: '#1e40af', tier: 1, cost: { wood: 30, gold: 120 }, description: 'Melee T1 — Barracks' },
  { id: 'k_20', kind: 'unit', name: 'Axeman', icon: '🪓', x: 300, y: 530, w: 120, h: 80, configKey: 'axeman', stats: { hp: 120, damage: 18, armor: 2, speed: 76, range: 50, foodCost: 3 }, color: '#1e40af', tier: 1, cost: { wood: 40, gold: 150 }, description: 'Melee T1 — Barracks' },
  { id: 'k_21', kind: 'unit', name: 'Knight', icon: '🐴', x: 420, y: 530, w: 120, h: 80, configKey: 'knight', stats: { hp: 200, damage: 25, armor: 4, speed: 115, range: 55, foodCost: 4 }, color: '#1e40af', tier: 2, cost: { wood: 60, gold: 250 }, description: 'Melee T2 — Barracks (Keep required)' },
  { id: 'k_22', kind: 'unit', name: 'Assassin', icon: '🗡️', x: 540, y: 530, w: 120, h: 80, configKey: 'assasin', stats: { hp: 65, damage: 28, armor: 0, speed: 105, range: 44, foodCost: 2 }, color: '#1e40af', tier: 2, cost: { wood: 30, gold: 180 }, description: 'Melee T2 — Barracks (Keep required)' },
  { id: 'k_23', kind: 'unit', name: 'Bowman', icon: '🏹', x: 660, y: 530, w: 120, h: 80, configKey: 'bowman', stats: { hp: 55, damage: 16, armor: 0, speed: 80, range: 170, foodCost: 2 }, color: '#1e40af', tier: 1, cost: { wood: 30, gold: 130 }, description: 'Ranged T1 — Archery' },
  { id: 'k_24', kind: 'unit', name: 'Musketeer', icon: '🔫', x: 780, y: 530, w: 120, h: 80, configKey: 'musketeer', stats: { hp: 70, damage: 32, armor: 1, speed: 78, range: 210, foodCost: 3 }, color: '#1e40af', tier: 2, cost: { wood: 50, gold: 200 }, description: 'Ranged T2 — Archery (Keep required)' },
  { id: 'k_25', kind: 'unit', name: 'Mage', icon: '✨', x: 60, y: 640, w: 120, h: 80, configKey: 'mage', stats: { hp: 50, damage: 24, armor: 0, speed: 72, range: 200, foodCost: 3 }, color: '#7c3aed', tier: 2, cost: { wood: 20, gold: 220 }, description: 'Caster T2 — Chapel' },
  { id: 'k_26', kind: 'unit', name: 'Ballista', icon: '💣', x: 190, y: 640, w: 120, h: 80, configKey: 'ballista', stats: { hp: 150, damage: 70, armor: 2, speed: 40, range: 300, foodCost: 4 }, color: '#1e40af', tier: 2, cost: { wood: 120, gold: 200 }, description: 'Siege T2 — Workshop' },
  { id: 'k_27', kind: 'unit', name: 'Minotaur', icon: '🐂', x: 310, y: 640, w: 120, h: 80, configKey: 'minotaur', stats: { hp: 350, damage: 45, armor: 4, speed: 90, range: 55, foodCost: 5 }, color: '#7c3aed', tier: 3, cost: { wood: 100, gold: 300 }, description: 'Elite T3 — Sanctum' },
  { id: 'k_28', kind: 'unit', name: 'Dragon', icon: '🐉', x: 430, y: 640, w: 120, h: 80, configKey: 'dragon', stats: { hp: 600, damage: 85, armor: 5, speed: 120, range: 200, foodCost: 8 }, color: '#7c3aed', tier: 3, cost: { wood: 300, gold: 400 }, description: 'Elite T3 — Sanctum' },
];

const KINGDOM_CONNECTIONS: Connection[] = [
  // Town hall trains workers
  { id: 'kc_1', fromNodeId: 'k_1', toNodeId: 'k_4', type: 'trains' },
  { id: 'kc_2', fromNodeId: 'k_1', toNodeId: 'k_5', type: 'trains' },
  // Town hall upgrade chain
  { id: 'kc_3', fromNodeId: 'k_1', toNodeId: 'k_2', type: 'requires' },
  { id: 'kc_4', fromNodeId: 'k_2', toNodeId: 'k_3', type: 'requires' },
  // Castle unlocks T1 military & economy
  { id: 'kc_5', fromNodeId: 'k_1', toNodeId: 'k_6', type: 'unlocks' },
  { id: 'kc_6', fromNodeId: 'k_1', toNodeId: 'k_7', type: 'unlocks' },
  { id: 'kc_7', fromNodeId: 'k_1', toNodeId: 'k_8', type: 'unlocks' },
  { id: 'kc_8', fromNodeId: 'k_1', toNodeId: 'k_9', type: 'unlocks' },
  { id: 'kc_9', fromNodeId: 'k_1', toNodeId: 'k_10', type: 'unlocks' },
  { id: 'kc_10', fromNodeId: 'k_1', toNodeId: 'k_11', type: 'unlocks' },
  { id: 'kc_11', fromNodeId: 'k_1', toNodeId: 'k_16', type: 'unlocks' },
  { id: 'kc_12', fromNodeId: 'k_1', toNodeId: 'k_14', type: 'unlocks' },
  // Keep unlocks T2
  { id: 'kc_13', fromNodeId: 'k_2', toNodeId: 'k_12', type: 'unlocks' },
  { id: 'kc_14', fromNodeId: 'k_2', toNodeId: 'k_13', type: 'unlocks' },
  { id: 'kc_15', fromNodeId: 'k_2', toNodeId: 'k_17', type: 'unlocks' },
  // Fortress + Chapel unlocks Sanctum
  { id: 'kc_16', fromNodeId: 'k_3', toNodeId: 'k_15', type: 'requires' },
  { id: 'kc_17', fromNodeId: 'k_12', toNodeId: 'k_15', type: 'requires' },
  // Barracks trains melee
  { id: 'kc_18', fromNodeId: 'k_10', toNodeId: 'k_18', type: 'trains' },
  { id: 'kc_19', fromNodeId: 'k_10', toNodeId: 'k_19', type: 'trains' },
  { id: 'kc_20', fromNodeId: 'k_10', toNodeId: 'k_20', type: 'trains' },
  { id: 'kc_21', fromNodeId: 'k_10', toNodeId: 'k_21', type: 'trains' },
  { id: 'kc_22', fromNodeId: 'k_10', toNodeId: 'k_22', type: 'trains' },
  // Archery trains ranged
  { id: 'kc_23', fromNodeId: 'k_11', toNodeId: 'k_23', type: 'trains' },
  { id: 'kc_24', fromNodeId: 'k_11', toNodeId: 'k_24', type: 'trains' },
  // Chapel trains casters
  { id: 'kc_25', fromNodeId: 'k_12', toNodeId: 'k_25', type: 'trains' },
  // Workshop trains siege
  { id: 'kc_26', fromNodeId: 'k_13', toNodeId: 'k_26', type: 'trains' },
  // Sanctum trains T3 elites
  { id: 'kc_27', fromNodeId: 'k_15', toNodeId: 'k_27', type: 'trains' },
  { id: 'kc_28', fromNodeId: 'k_15', toNodeId: 'k_28', type: 'trains' },
];

// ── Legion (Orc/Undead) — starter template ──────────────────────────────────────

const LEGION_NODES: DesignerNode[] = [
  { id: 'leg_1', kind: 'building', name: 'Dark Fortress', icon: '💀', x: 319, y: 35, w: 140, h: 90, configKey: 'castle', stats: { hp: 1600, foodProvided: 12, buildTime: 0 }, color: '#7f1d1d', tier: 1, cost: { wood: 0, gold: 0 }, description: 'T1 Structure — Trains: orcPawn' },
  { id: 'leg_2', kind: 'unit', name: 'Orc Pawn', icon: '⛏️', x: 246, y: 135, w: 120, h: 80, configKey: 'orcPawn', stats: { hp: 60, damage: 8, armor: 0, speed: 78, range: 42, foodCost: 1 }, color: '#991b1b', tier: 1, cost: { wood: 0, gold: 75 }, description: 'Worker T1 — Trained at Dark Fortress' },
  { id: 'leg_3', kind: 'building', name: 'War Camp', icon: '⚔️', x: 187, y: 332, w: 140, h: 90, configKey: 'barracks', stats: { hp: 550, foodProvided: 0, buildTime: 25 }, color: '#7f1d1d', tier: 1, cost: { wood: 200, gold: 0 }, description: 'T1 Structure — Trains: orcSpearman, orcWarrior' },
  { id: 'leg_4', kind: 'building', name: 'Shadow Range', icon: '🏹', x: 27, y: 331, w: 140, h: 90, configKey: 'archery', stats: { hp: 450, foodProvided: 0, buildTime: 25 }, color: '#7f1d1d', tier: 1, cost: { wood: 150, gold: 50 }, description: 'T1 Structure — Trains: orcArcher' },
  { id: 'leg_5', kind: 'building', name: 'Dark Keep', icon: '🏯', x: 465, y: 474, w: 140, h: 90, configKey: 'keep', stats: { hp: 2100, foodProvided: 12, buildTime: 60 }, color: '#7f1d1d', tier: 2, cost: { wood: 200, gold: 500 }, description: 'T2 Structure — Upgrades from Dark Fortress' },
  { id: 'leg_6', kind: 'building', name: 'Citadel', icon: '⛩️', x: 700, y: 474, w: 140, h: 90, configKey: 'fortress', stats: { hp: 2600, foodProvided: 12, buildTime: 80 }, color: '#7f1d1d', tier: 3, cost: { wood: 300, gold: 700 }, description: 'T3 Structure — Upgrades from Dark Keep' },
  { id: 'leg_7', kind: 'building', name: 'Dark Chapel', icon: '⛪', x: 71, y: 517, w: 140, h: 90, configKey: 'chapel', stats: { hp: 500, foodProvided: 0, buildTime: 30 }, color: '#7f1d1d', tier: 2, cost: { wood: 200, gold: 100 }, description: 'T2 Structure — Trains: orcHealer, orcMage, necromancer' },
  { id: 'leg_8', kind: 'building', name: 'Hovel', icon: '🏠', x: 500, y: 229, w: 140, h: 90, configKey: 'house', stats: { hp: 200, foodProvided: 10, buildTime: 10 }, color: '#7f1d1d', tier: 1, cost: { wood: 50, gold: 0 }, description: 'T1 Structure — Provides food' },
  { id: 'leg_9', kind: 'building', name: 'Dark Altar', icon: '🪦', x: -104, y: 469, w: 140, h: 90, configKey: 'altar', stats: { hp: 600, foodProvided: 0, buildTime: 30 }, color: '#7f1d1d', tier: 1, cost: { wood: 200, gold: 150 }, description: 'T1 Structure — Summons heroes' },
  { id: 'leg_10', kind: 'building', name: 'Watch Tower', icon: '🗼', x: 324, y: 402, w: 140, h: 90, configKey: 'tower', stats: { hp: 400, foodProvided: 0, buildTime: 18 }, color: '#7f1d1d', tier: 1, cost: { wood: 100, gold: 80 }, description: 'T1 Defense — Attacks enemies' },
  // Legion units
  { id: 'leg_11', kind: 'unit', name: 'Orc Spearman', icon: '🔱', x: 100, y: 450, w: 120, h: 80, configKey: 'orcSpearman', stats: { hp: 180, damage: 22, armor: 2, speed: 82, range: 65, foodCost: 3 }, color: '#991b1b', tier: 1, cost: { wood: 35, gold: 160 }, description: 'Melee T1 — Trained at War Camp' },
  { id: 'leg_12', kind: 'unit', name: 'Orc Warrior', icon: '💪', x: 250, y: 450, w: 120, h: 80, configKey: 'orcWarrior', stats: { hp: 280, damage: 38, armor: 3, speed: 88, range: 52, foodCost: 4 }, color: '#991b1b', tier: 2, cost: { wood: 90, gold: 200 }, description: 'Melee T2 — Trained at War Camp' },
  { id: 'leg_13', kind: 'unit', name: 'Orc Archer', icon: '🏹', x: -60, y: 450, w: 120, h: 80, configKey: 'orcArcher', stats: { hp: 100, damage: 30, armor: 0, speed: 80, range: 210, foodCost: 3 }, color: '#991b1b', tier: 1, cost: { wood: 30, gold: 170 }, description: 'Ranged T1 — Trained at Shadow Range' },
  { id: 'leg_14', kind: 'unit', name: 'Orc Healer', icon: '💜', x: -30, y: 630, w: 120, h: 80, configKey: 'orcHealer', stats: { hp: 90, damage: 15, armor: 0, speed: 74, range: 170, foodCost: 2 }, color: '#7c3aed', tier: 2, cost: { wood: 60, gold: 190 }, description: 'Caster T2 — Trained at Dark Chapel' },
  { id: 'leg_15', kind: 'unit', name: 'Orc Mage', icon: '🔥', x: 100, y: 630, w: 120, h: 80, configKey: 'orcMage', stats: { hp: 65, damage: 28, armor: 0, speed: 70, range: 190, foodCost: 3 }, color: '#7c3aed', tier: 2, cost: { wood: 25, gold: 230 }, description: 'Caster T2 — Trained at Dark Chapel' },
  { id: 'leg_16', kind: 'unit', name: 'Necromancer', icon: '☠️', x: 230, y: 630, w: 120, h: 80, configKey: 'necromancer', stats: { hp: 55, damage: 26, armor: 0, speed: 65, range: 200, foodCost: 3 }, color: '#7c3aed', tier: 2, cost: { wood: 30, gold: 250 }, description: 'Caster T2 — Trained at Dark Chapel' },
];

const LEGION_CONNECTIONS: Connection[] = [
  { id: 'lc_1', fromNodeId: 'leg_1', toNodeId: 'leg_2', type: 'trains' },
  { id: 'lc_2', fromNodeId: 'leg_1', toNodeId: 'leg_3', type: 'unlocks' },
  { id: 'lc_3', fromNodeId: 'leg_1', toNodeId: 'leg_4', type: 'unlocks' },
  { id: 'lc_4', fromNodeId: 'leg_1', toNodeId: 'leg_10', type: 'unlocks' },
  { id: 'lc_5', fromNodeId: 'leg_1', toNodeId: 'leg_5', type: 'unlocks' },
  { id: 'lc_6', fromNodeId: 'leg_5', toNodeId: 'leg_6', type: 'unlocks' },
  { id: 'lc_7', fromNodeId: 'leg_5', toNodeId: 'leg_7', type: 'unlocks' },
  // Worker builds
  { id: 'lc_8', fromNodeId: 'leg_2', toNodeId: 'leg_3', type: 'trains' },
  { id: 'lc_9', fromNodeId: 'leg_2', toNodeId: 'leg_4', type: 'trains' },
  { id: 'lc_10', fromNodeId: 'leg_2', toNodeId: 'leg_8', type: 'trains' },
  { id: 'lc_11', fromNodeId: 'leg_2', toNodeId: 'leg_10', type: 'trains' },
  // War Camp trains melee
  { id: 'lc_12', fromNodeId: 'leg_3', toNodeId: 'leg_11', type: 'trains' },
  { id: 'lc_13', fromNodeId: 'leg_3', toNodeId: 'leg_12', type: 'trains' },
  // Shadow Range trains ranged
  { id: 'lc_14', fromNodeId: 'leg_4', toNodeId: 'leg_13', type: 'trains' },
  // Dark Chapel trains casters
  { id: 'lc_15', fromNodeId: 'leg_7', toNodeId: 'leg_14', type: 'trains' },
  { id: 'lc_16', fromNodeId: 'leg_7', toNodeId: 'leg_15', type: 'trains' },
  { id: 'lc_17', fromNodeId: 'leg_7', toNodeId: 'leg_16', type: 'trains' },
  // Altar unlock
  { id: 'lc_18', fromNodeId: 'leg_4', toNodeId: 'leg_9', type: 'unlocks' },
];

// ── Neutral (Creeps/Monsters) — starter template ────────────────────────────────

const NEUTRAL_NODES: DesignerNode[] = [
  { id: 'neu_1', kind: 'building', name: 'Creep Camp', icon: '🏕️', x: 300, y: 50, w: 140, h: 90, configKey: 'tavern', stats: { hp: 999, foodProvided: 0, buildTime: 0 }, color: '#4a5568', tier: 1, cost: { wood: 0, gold: 0 }, description: 'Neutral Camp — Spawns creeps' },
  // T1 creeps
  { id: 'neu_2', kind: 'unit', name: 'Goblin', icon: '👺', x: 100, y: 180, w: 120, h: 80, configKey: 'goblin', stats: { hp: 40, damage: 10, armor: 0, speed: 100, range: 40, foodCost: 0 }, color: '#4a5568', tier: 1, cost: { wood: 0, gold: 0 }, description: 'T1 Creep — Light melee' },
  { id: 'neu_3', kind: 'unit', name: 'Skeleton', icon: '💀', x: 250, y: 180, w: 120, h: 80, configKey: 'skeleton', stats: { hp: 60, damage: 16, armor: 1, speed: 70, range: 48, foodCost: 0 }, color: '#4a5568', tier: 1, cost: { wood: 0, gold: 0 }, description: 'T1 Creep — Undead melee' },
  { id: 'neu_4', kind: 'unit', name: 'Slime', icon: '🟢', x: 400, y: 180, w: 120, h: 80, configKey: 'slime', stats: { hp: 40, damage: 10, armor: 0, speed: 60, range: 36, foodCost: 0 }, color: '#4a5568', tier: 1, cost: { wood: 0, gold: 0 }, description: 'T1 Creep — Slow melee' },
  { id: 'neu_5', kind: 'unit', name: 'Archer Goblin', icon: '🏹', x: 550, y: 180, w: 120, h: 80, configKey: 'archerGoblin', stats: { hp: 35, damage: 12, armor: 0, speed: 95, range: 140, foodCost: 0 }, color: '#4a5568', tier: 1, cost: { wood: 0, gold: 0 }, description: 'T1 Creep — Ranged' },
  // T2 creeps
  { id: 'neu_6', kind: 'unit', name: 'Orc', icon: '👹', x: 100, y: 340, w: 120, h: 80, configKey: 'orc', stats: { hp: 100, damage: 20, armor: 1, speed: 85, range: 50, foodCost: 0 }, color: '#4a5568', tier: 2, cost: { wood: 0, gold: 0 }, description: 'T2 Creep — Tough melee' },
  { id: 'neu_7', kind: 'unit', name: 'Yeti', icon: '🦣', x: 250, y: 340, w: 120, h: 80, configKey: 'yeti', stats: { hp: 220, damage: 35, armor: 3, speed: 80, range: 52, foodCost: 0 }, color: '#4a5568', tier: 2, cost: { wood: 0, gold: 0 }, description: 'T2 Creep — Heavy melee' },
  { id: 'neu_8', kind: 'unit', name: 'Fire Elemental', icon: '🔥', x: 400, y: 340, w: 120, h: 80, configKey: 'fireElemental', stats: { hp: 250, damage: 40, armor: 2, speed: 70, range: 50, foodCost: 0 }, color: '#4a5568', tier: 2, cost: { wood: 0, gold: 0 }, description: 'T2 Creep — Fire damage' },
  // T3 bosses
  { id: 'neu_9', kind: 'unit', name: 'Ogre Boss', icon: '👑', x: 180, y: 500, w: 120, h: 80, configKey: 'ogreBoss', stats: { hp: 700, damage: 65, armor: 5, speed: 65, range: 65, foodCost: 0 }, color: '#b45309', tier: 3, cost: { wood: 0, gold: 0 }, description: 'Boss — Drops epic items' },
  { id: 'neu_10', kind: 'unit', name: 'Dragon', icon: '🐉', x: 380, y: 500, w: 120, h: 80, configKey: 'dragon', stats: { hp: 600, damage: 85, armor: 5, speed: 120, range: 200, foodCost: 0 }, color: '#b45309', tier: 3, cost: { wood: 0, gold: 0 }, description: 'Boss — Drops legendary items' },
  { id: 'neu_11', kind: 'unit', name: 'Steampunk Mech', icon: '🤖', x: 560, y: 500, w: 120, h: 80, configKey: 'steampunkMech', stats: { hp: 900, damage: 85, armor: 6, speed: 55, range: 100, foodCost: 0 }, color: '#b45309', tier: 3, cost: { wood: 0, gold: 0 }, description: 'Boss — Drops legendary items' },
];

const NEUTRAL_CONNECTIONS: Connection[] = [
  { id: 'nc_1', fromNodeId: 'neu_1', toNodeId: 'neu_2', type: 'trains' },
  { id: 'nc_2', fromNodeId: 'neu_1', toNodeId: 'neu_3', type: 'trains' },
  { id: 'nc_3', fromNodeId: 'neu_1', toNodeId: 'neu_4', type: 'trains' },
  { id: 'nc_4', fromNodeId: 'neu_1', toNodeId: 'neu_5', type: 'trains' },
  { id: 'nc_5', fromNodeId: 'neu_1', toNodeId: 'neu_6', type: 'trains' },
  { id: 'nc_6', fromNodeId: 'neu_1', toNodeId: 'neu_7', type: 'trains' },
  { id: 'nc_7', fromNodeId: 'neu_1', toNodeId: 'neu_8', type: 'trains' },
  { id: 'nc_8', fromNodeId: 'neu_1', toNodeId: 'neu_9', type: 'trains' },
  { id: 'nc_9', fromNodeId: 'neu_1', toNodeId: 'neu_10', type: 'trains' },
  { id: 'nc_10', fromNodeId: 'neu_1', toNodeId: 'neu_11', type: 'trains' },
];

// ── Exported defaults ───────────────────────────────────────────────────────────

export const DEFAULT_FACTION_DESIGNS: Record<FactionId, FactionDesign> = {
  kingdom: {
    id: 'kingdom',
    label: 'Kingdom',
    icon: '🏰',
    color: '#2563eb',
    bgColor: '#1e3a5f',
    nodes: KINGDOM_NODES,
    connections: KINGDOM_CONNECTIONS,
  },
  legion: {
    id: 'legion',
    label: 'Legion',
    icon: '💀',
    color: '#dc2626',
    bgColor: '#5f1e1e',
    nodes: LEGION_NODES,
    connections: LEGION_CONNECTIONS,
  },
  neutral: {
    id: 'neutral',
    label: 'Neutral',
    icon: '🐉',
    color: '#71717a',
    bgColor: '#2d2d30',
    nodes: NEUTRAL_NODES,
    connections: NEUTRAL_CONNECTIONS,
  },
};

/** Get the max numeric suffix from a node list to seed the ID counter */
export function getMaxNodeId(nodes: DesignerNode[]): number {
  let max = 0;
  for (const n of nodes) {
    // Handle various id formats: node_X, leg_X, neu_X, etc.
    const parts = n.id.split('_');
    const num = parseInt(parts[parts.length - 1]);
    if (!isNaN(num) && num > max) max = num;
  }
  return max;
}
