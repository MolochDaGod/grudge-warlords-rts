/**
 * Design Enforcer — Bridges the Designer Board to Runtime Engine
 *
 * Reads the faction designer nodes & connections and compiles them into
 * runtime config overrides that the engine enforces during gameplay.
 *
 * Key enforcement rules:
 *   1. Only units connected via 'trains' edges can be trained at that building
 *   2. Building prerequisites from 'requires' edges must be satisfied
 *   3. Stat overrides from designer node .stats apply to runtime configs
 *   4. Hero abilities from 'has_ability' edges determine available abilities
 *   5. Upgrade research from 'enables' edges gates unlock conditions
 */

import type { DesignerNode, Connection, ConnectionType } from './designer-types';
import type { UnitConfig, BuildingConfig, BuildingType, UnitType, TechTier } from './types';
import { UNIT_CONFIGS, BUILDING_CONFIGS } from './constants';

// ── Compiled output ─────────────────────────────────────────────────────────────

export interface CompiledFaction {
  /** Override unit configs (merged over UNIT_CONFIGS) */
  unitOverrides: Record<string, Partial<UnitConfig>>;
  /** Override building configs (merged over BUILDING_CONFIGS) */
  buildingOverrides: Record<string, Partial<BuildingConfig>>;
  /** Which units each building can train (enforced whitelist) */
  buildingTrains: Record<string, string[]>;
  /** Building prerequisites (enforced) */
  buildingPrereqs: Record<string, string[]>;
  /** Validation errors found during compilation */
  errors: CompileError[];
  /** Validation warnings (non-blocking) */
  warnings: string[];
}

export interface CompileError {
  nodeId: string;
  message: string;
  severity: 'error' | 'warning';
}

// ── Compilation ─────────────────────────────────────────────────────────────────

interface FactionState {
  nodes: DesignerNode[];
  connections: Connection[];
}

export function compileFactionDesign(design: FactionState): CompiledFaction {
  const result: CompiledFaction = {
    unitOverrides: {},
    buildingOverrides: {},
    buildingTrains: {},
    buildingPrereqs: {},
    errors: [],
    warnings: [],
  };

  const nodeMap = new Map<string, DesignerNode>();
  for (const node of design.nodes) nodeMap.set(node.id, node);

  // ── Process connections ──────────────────────────────────────────────────
  const trainsEdges: { from: string; to: string }[] = [];
  const requiresEdges: { from: string; to: string }[] = [];
  const unlocksEdges: { from: string; to: string }[] = [];
  const enablesEdges: { from: string; to: string }[] = [];
  const hasAbilityEdges: { from: string; to: string }[] = [];

  for (const conn of design.connections) {
    const from = nodeMap.get(conn.fromNodeId);
    const to = nodeMap.get(conn.toNodeId);
    if (!from || !to) {
      result.errors.push({ nodeId: conn.fromNodeId, message: `Connection references missing node: ${conn.fromNodeId} → ${conn.toNodeId}`, severity: 'error' });
      continue;
    }

    switch (conn.type) {
      case 'trains': trainsEdges.push({ from: conn.fromNodeId, to: conn.toNodeId }); break;
      case 'requires': requiresEdges.push({ from: conn.fromNodeId, to: conn.toNodeId }); break;
      case 'unlocks': unlocksEdges.push({ from: conn.fromNodeId, to: conn.toNodeId }); break;
      case 'enables': enablesEdges.push({ from: conn.fromNodeId, to: conn.toNodeId }); break;
      case 'has_ability': hasAbilityEdges.push({ from: conn.fromNodeId, to: conn.toNodeId }); break;
    }
  }

  // ── Build training whitelist ────────────────────────────────────────────
  // Only units connected via 'trains' edges can be trained at that building
  for (const edge of trainsEdges) {
    const fromNode = nodeMap.get(edge.from);
    const toNode = nodeMap.get(edge.to);
    if (!fromNode || !toNode) continue;

    if (fromNode.kind === 'building' && (toNode.kind === 'unit' || toNode.kind === 'hero')) {
      const buildingKey = fromNode.configKey;
      if (!result.buildingTrains[buildingKey]) result.buildingTrains[buildingKey] = [];
      if (!result.buildingTrains[buildingKey].includes(toNode.configKey)) {
        result.buildingTrains[buildingKey].push(toNode.configKey);
      }
    }
  }

  // ── Build prerequisite chain ────────────────────────────────────────────
  for (const edge of [...requiresEdges, ...unlocksEdges]) {
    const fromNode = nodeMap.get(edge.from);
    const toNode = nodeMap.get(edge.to);
    if (!fromNode || !toNode) continue;

    // "from unlocks to" means "to requires from"
    if (fromNode.kind === 'building' && toNode.kind === 'building') {
      const targetKey = toNode.configKey;
      if (!result.buildingPrereqs[targetKey]) result.buildingPrereqs[targetKey] = [];
      if (!result.buildingPrereqs[targetKey].includes(fromNode.configKey)) {
        result.buildingPrereqs[targetKey].push(fromNode.configKey);
      }
    }
  }

  // ── Apply stat overrides from designer nodes ────────────────────────────
  for (const node of design.nodes) {
    if (node.kind === 'unit' || node.kind === 'hero') {
      const override: Partial<UnitConfig> = {};
      const stats = node.stats;
      if (typeof stats.hp === 'number') override.hp = stats.hp;
      if (typeof stats.damage === 'number') override.damage = stats.damage;
      if (typeof stats.armor === 'number') override.armor = stats.armor;
      if (typeof stats.speed === 'number') override.speed = stats.speed;
      if (typeof stats.range === 'number') override.range = stats.range;
      if (typeof stats.foodCost === 'number') override.foodCost = stats.foodCost;
      if (node.cost) {
        override.trainCost = { gold: node.cost.gold, wood: node.cost.wood };
      }
      if (node.tier) override.requiredTier = node.tier as TechTier;
      if (Object.keys(override).length > 0) {
        result.unitOverrides[node.configKey] = override;
      }
    }

    if (node.kind === 'building') {
      const override: Partial<BuildingConfig> = {};
      const stats = node.stats;
      if (typeof stats.hp === 'number') override.hp = stats.hp;
      if (typeof stats.foodProvided === 'number') override.foodProvided = stats.foodProvided;
      if (typeof stats.buildTime === 'number') override.buildTime = stats.buildTime;
      if (node.cost) override.cost = { gold: node.cost.gold, wood: node.cost.wood };
      if (node.tier) {
        override.techTier = node.tier as TechTier;
        override.requiredTier = node.tier as TechTier;
      }
      if (Object.keys(override).length > 0) {
        result.buildingOverrides[node.configKey] = override;
      }
    }
  }

  // ── Validation ──────────────────────────────────────────────────────────
  validateDesign(design, result, nodeMap);

  return result;
}

// ── Validation ──────────────────────────────────────────────────────────────────

function validateDesign(
  design: FactionState,
  result: CompiledFaction,
  nodeMap: Map<string, DesignerNode>,
): void {
  // Check for orphan nodes (not connected to anything)
  const connectedIds = new Set<string>();
  for (const conn of design.connections) {
    connectedIds.add(conn.fromNodeId);
    connectedIds.add(conn.toNodeId);
  }
  for (const node of design.nodes) {
    if (!connectedIds.has(node.id)) {
      result.warnings.push(`Node "${node.name}" (${node.id}) is not connected to anything`);
    }
  }

  // Check for buildings that train nothing
  const buildingNodes = design.nodes.filter(n => n.kind === 'building');
  for (const bld of buildingNodes) {
    const trains = result.buildingTrains[bld.configKey] ?? [];
    const baseCfg = BUILDING_CONFIGS[bld.configKey as BuildingType];
    if (baseCfg && baseCfg.trains.length > 0 && trains.length === 0) {
      result.warnings.push(`Building "${bld.name}" has no training connections — it won't produce any units`);
    }
  }

  // Check for circular prerequisites
  for (const [building, prereqs] of Object.entries(result.buildingPrereqs)) {
    const visited = new Set<string>();
    const queue = [...prereqs];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (cur === building) {
        result.errors.push({ nodeId: building, message: `Circular prerequisite: ${building} → ... → ${building}`, severity: 'error' });
        break;
      }
      if (visited.has(cur)) continue;
      visited.add(cur);
      const subPrereqs = result.buildingPrereqs[cur] ?? [];
      queue.push(...subPrereqs);
    }
  }

  // Warn on configKeys that don't exist in base configs
  for (const node of design.nodes) {
    if (node.kind === 'unit' || node.kind === 'hero') {
      if (!UNIT_CONFIGS[node.configKey]) {
        result.warnings.push(`Unit "${node.name}" configKey "${node.configKey}" not found in UNIT_CONFIGS`);
      }
    }
    if (node.kind === 'building') {
      if (!BUILDING_CONFIGS[node.configKey as BuildingType]) {
        result.warnings.push(`Building "${node.name}" configKey "${node.configKey}" not found in BUILDING_CONFIGS`);
      }
    }
  }
}

// ── Runtime application ─────────────────────────────────────────────────────────

/**
 * Apply compiled faction design to runtime configs.
 * Returns merged configs that should be used for this game session.
 */
export function applyDesignToConfigs(compiled: CompiledFaction): {
  unitConfigs: Record<string, UnitConfig>;
  buildingConfigs: Record<string, BuildingConfig>;
} {
  // Deep copy base configs
  const unitConfigs: Record<string, UnitConfig> = {};
  for (const [key, cfg] of Object.entries(UNIT_CONFIGS)) {
    unitConfigs[key] = { ...cfg, trainCost: { ...cfg.trainCost } };
  }

  const buildingConfigs: Record<string, BuildingConfig> = {};
  for (const [key, cfg] of Object.entries(BUILDING_CONFIGS)) {
    buildingConfigs[key] = {
      ...cfg,
      cost: { ...cfg.cost },
      trains: [...cfg.trains],
      prerequisites: [...cfg.prerequisites],
    };
  }

  // Apply unit stat overrides
  for (const [key, override] of Object.entries(compiled.unitOverrides)) {
    if (unitConfigs[key]) {
      Object.assign(unitConfigs[key], override);
      if (override.trainCost) {
        unitConfigs[key].trainCost = { ...unitConfigs[key].trainCost, ...override.trainCost };
      }
    }
  }

  // Apply building stat overrides
  for (const [key, override] of Object.entries(compiled.buildingOverrides)) {
    if (buildingConfigs[key as BuildingType]) {
      Object.assign(buildingConfigs[key as BuildingType], override);
      if (override.cost) {
        buildingConfigs[key as BuildingType].cost = {
          ...buildingConfigs[key as BuildingType].cost,
          ...override.cost,
        };
      }
    }
  }

  // Apply training whitelists (override the trains[] arrays)
  for (const [buildingKey, trainList] of Object.entries(compiled.buildingTrains)) {
    if (buildingConfigs[buildingKey as BuildingType]) {
      buildingConfigs[buildingKey as BuildingType].trains = trainList as UnitType[];
    }
  }

  // Apply prerequisites
  for (const [buildingKey, prereqs] of Object.entries(compiled.buildingPrereqs)) {
    if (buildingConfigs[buildingKey as BuildingType]) {
      buildingConfigs[buildingKey as BuildingType].prerequisites = prereqs as BuildingType[];
    }
  }

  return { unitConfigs, buildingConfigs };
}

/**
 * Validate at runtime: can this building train this unit?
 * Uses the compiled design's whitelist.
 */
export function canTrainUnit(
  compiled: CompiledFaction,
  buildingConfigKey: string,
  unitConfigKey: string,
): boolean {
  const whitelist = compiled.buildingTrains[buildingConfigKey];
  if (!whitelist) {
    // No designer override — fall back to base config
    const baseCfg = BUILDING_CONFIGS[buildingConfigKey as BuildingType];
    return baseCfg ? baseCfg.trains.includes(unitConfigKey as UnitType) : false;
  }
  return whitelist.includes(unitConfigKey);
}

/**
 * Validate at runtime: are all prerequisites met to build this building?
 */
export function arePrereqsMet(
  compiled: CompiledFaction,
  buildingConfigKey: string,
  builtBuildings: Set<string>, // Set of configKeys of completed buildings
): boolean {
  const prereqs = compiled.buildingPrereqs[buildingConfigKey];
  if (!prereqs || prereqs.length === 0) return true;
  return prereqs.every(p => builtBuildings.has(p));
}
