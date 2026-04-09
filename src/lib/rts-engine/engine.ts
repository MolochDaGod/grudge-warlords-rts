import {
  GameState, Unit, Building, Resource, Projectile, FloatingText, VfxEffect, GroundEffect,
  Vec2, Faction, UnitType, BuildingType, AIState, Island, CreepCamp, ItemInstance,
  PlayerResources, TechTier, HERO_XP_TABLE,
} from './types';
import {
  UNIT_CONFIGS, BUILDING_CONFIGS, HERO_CONFIGS, ITEM_DEFS, ABILITY_DEFS,
  WATER_SPEED_MULT, WATER_DAMAGE_RATE, CYCLE_LENGTH, DAY_DURATION,
  UPKEEP_NONE_MAX, UPKEEP_LOW_MAX, UPKEEP_NONE_RATE, UPKEEP_LOW_RATE, UPKEEP_HIGH_RATE,
  PRIEST_HEAL_RANGE, PRIEST_HEAL_AMOUNT, PRIEST_HEAL_PULSE,
} from './constants';
import { MapDef } from './maps';
import { computePathWaypoints, isOnIsland } from './pathfinding';
import { HIT_VFX, randomRetroCrit } from './vfx';
import { fxController } from './fx-controller';
import { getUnitDisplay } from './unit-defaults';
import { islandsToTilemap } from './tilemap';
import type { Ship } from './ships';
import { SHIP_CONFIGS, makeShip, processSinking, updateShipHeading, shipDist, shipNorm, calcBroadsideDamage } from './ships';
import type { ShipBuildOrder } from './ships';
import { getHomeSpawnPoint } from './island-system';

let _nextId = 1;
function uid(): string { return String(_nextId++); }
function dist(a: Vec2, b: Vec2): number { return Math.hypot(a.x - b.x, a.y - b.y); }
function norm(v: Vec2): Vec2 { const d = Math.hypot(v.x, v.y); return d < 0.001 ? { x: 0, y: 0 } : { x: v.x / d, y: v.y / d }; }

// ── Unit factory ───────────────────────────────────────────────────────────────
function makeUnit(faction: Faction, type: UnitType, pos: Vec2, isHero = false): Unit {
  const cfg = UNIT_CONFIGS[type];
  const heroCfg = isHero ? HERO_CONFIGS.find(h => h.type === type) : null;
  const hp = heroCfg?.hp ?? cfg?.hp ?? 50;
  const mana = heroCfg?.mana ?? cfg?.mana ?? 0;

  return {
    id: uid(), faction, type,
    role: isHero ? 'hero' : (cfg?.role ?? 'melee'),
    pos: { ...pos }, target: null, waypoints: [],
    attackTargetId: null, harvestTargetId: null, returnToId: null,
    hp, maxHp: hp, mana, maxMana: mana, armor: heroCfg?.armor ?? cfg?.armor ?? 0,
    state: 'idle',
    anim: { action: 'idle', frame: 0, elapsed: 0, flipX: false },
    carryType: null, carryAmount: 0, attackCooldown: 0,
    selected: false, inWater: false,
    slowTimer: 0, healTimer: 0, stunTimer: 0, aoeTimer: 0,
    buildTargetId: null,
    isHero,
    heroLevel: isHero ? 1 : 0,
    heroXp: 0,
    heroXpToNext: isHero ? HERO_XP_TABLE[1] : 0,
    abilityPoints: isHero ? 1 : 0,
    abilities: heroCfg ? heroCfg.abilities.map(id => ({ abilityId: id, rank: 0, cooldownRemaining: 0 })) : [],
    inventory: isHero ? [null, null, null, null, null, null] : [],
    controlGroup: 0,
    foodCost: isHero ? 5 : (cfg?.foodCost ?? 1),
    kills: 0,
    holdPosition: false,
    deathTimer: 0,
  };
}

function makeBuilding(faction: Faction, type: BuildingType, pos: Vec2, underConstruction = false): Building {
  const cfg = BUILDING_CONFIGS[type];
  return {
    id: uid(), faction, type, pos: { ...pos },
    hp: cfg.hp, maxHp: cfg.hp,
    trainingQueue: [], trainingProgress: 0, rallyPoint: null,
    underConstruction, constructionProgress: underConstruction ? 0 : 1,
    attackCooldown: 0, techTier: cfg.techTier as TechTier,
    upgrading: false, upgradeProgress: 0, upgradeTarget: null,
  };
}

function makeResource(type: 'tree' | 'goldmine', pos: Vec2, amount?: number): Resource {
  const defaultAmount = type === 'tree' ? 220 : 12500;
  const amt = amount ?? defaultAmount;
  return {
    id: uid(), type, pos: { ...pos },
    amount: amt, maxAmount: amt,
    frame: 0, frameElapsed: 0, harvesting: false,
    workerSlots: type === 'goldmine' ? 5 : undefined,
    activeWorkers: 0,
  };
}

// ── Upkeep calculation ─────────────────────────────────────────────────────────
function calcUpkeep(food: number): { level: 'none' | 'low' | 'high'; rate: number } {
  if (food <= UPKEEP_NONE_MAX) return { level: 'none', rate: UPKEEP_NONE_RATE };
  if (food <= UPKEEP_LOW_MAX) return { level: 'low', rate: UPKEEP_LOW_RATE };
  return { level: 'high', rate: UPKEEP_HIGH_RATE };
}

// ── Food count ─────────────────────────────────────────────────────────────────
function countFood(state: GameState, faction: Faction): number {
  let food = 0;
  for (const [, u] of state.units) {
    if (u.faction === faction && u.state !== 'dead') food += u.foodCost;
  }
  return food;
}

function calcMaxFood(state: GameState, faction: Faction): number {
  let max = 0;
  for (const [, b] of state.buildings) {
    if (b.faction === faction && !b.underConstruction) {
      const cfg = BUILDING_CONFIGS[b.type as keyof typeof BUILDING_CONFIGS];
      if (cfg) max += cfg.foodProvided;
    }
  }
  return Math.min(max, 100); // WC3 cap
}

// ── Hero XP & Leveling ────────────────────────────────────────────────────────
function grantXp(unit: Unit, xp: number, state: GameState): void {
  if (!unit.isHero || unit.heroLevel >= 10) return;
  unit.heroXp += xp;
  while (unit.heroLevel < 10 && unit.heroXp >= unit.heroXpToNext) {
    unit.heroLevel++;
    unit.abilityPoints++;
    const heroCfg = HERO_CONFIGS.find(h => h.type === unit.type);
    if (heroCfg) {
      unit.maxHp += heroCfg.hpPerLevel;
      unit.hp = Math.min(unit.hp + heroCfg.hpPerLevel, unit.maxHp);
      unit.maxMana += heroCfg.manaPerLevel;
      unit.mana = Math.min(unit.mana + heroCfg.manaPerLevel, unit.maxMana);
      unit.armor += heroCfg.armorPerLevel;
    }
    unit.heroXpToNext = unit.heroLevel < 10 ? HERO_XP_TABLE[unit.heroLevel] : Infinity;
    // Level up VFX
    state.vfxEffects.set(uid(), { id: uid(), pos: { ...unit.pos }, type: 'level_up', age: 0, duration: 1.2 });
    state.floatingTexts.push({ id: uid(), pos: { ...unit.pos }, text: `Level ${unit.heroLevel}!`, color: '#ffd700', age: 0, maxAge: 2 });
    fxController.playLevelUp({ ...unit.pos });
  }
}

// ── Damage with armor reduction (WC3 formula) ─────────────────────────────────
function calcDamage(baseDmg: number, armor: number): number {
  // WC3: each point of armor reduces damage by ~6%
  const reduction = (0.06 * armor) / (1 + 0.06 * armor);
  return Math.max(1, Math.round(baseDmg * (1 - reduction)));
}

// ── Item drop from creep camp ──────────────────────────────────────────────────
function rollItemDrop(camp: CreepCamp): string | null {
  for (const drop of camp.dropTable) {
    if (Math.random() < drop.chance) return drop.itemId;
  }
  return null;
}

function giveItemToHero(hero: Unit, itemId: string): ItemInstance | null {
  const slot = hero.inventory.findIndex(s => s === null);
  if (slot === -1) return null; // inventory full
  const instance: ItemInstance = { id: uid(), defId: itemId };
  hero.inventory[slot] = instance;
  // Apply permanent stat bonuses
  const def = ITEM_DEFS[itemId];
  if (def) {
    if (def.bonusHp) { hero.maxHp += def.bonusHp; hero.hp += def.bonusHp; }
    if (def.bonusDamage) { /* tracked in combat */ }
    if (def.bonusArmor) hero.armor += def.bonusArmor;
    if (def.bonusMana) { hero.maxMana += def.bonusMana; hero.mana += def.bonusMana; }
  }
  return instance;
}

// ── Create initial state ───────────────────────────────────────────────────────
export function createInitialState(mapDef: MapDef, playerFaction: 'kingdom' | 'legion' = 'kingdom'): GameState {
  const islands: Island[] = mapDef.islands.map(d => ({ ...d }));
  const state: GameState = {
    tick: 0, timeElapsed: 0,
    units: new Map(), buildings: new Map(), resources: new Map(),
    projectiles: new Map(), vfxEffects: new Map(), groundEffects: new Map(),
    floatingTexts: [], creepCamps: [], islands,
    camera: { x: mapDef.blueCastle.x - 400, y: mapDef.blueCastle.y - 250 },
    zoom: 1,
    playerResources: { gold: mapDef.startingResources.gold, wood: mapDef.startingResources.wood, food: 0, maxFood: 12 },
    enemyResources:  { gold: mapDef.startingResources.gold, wood: mapDef.startingResources.wood, food: 0, maxFood: 12 },
    selected: new Set(), dragStart: null, dragEnd: null, buildMode: null,
    winner: null,
    aiState: { phase: 'early', phaseTimer: 0, attackTimer: 0, buildTimer: 0, lastAction: '', heroLevel: 0, techTier: 1, heroSummoned: false, aiAttackInterval: mapDef.aiAttackInterval },
    dayNightCycle: 0, timeOfDay: 'day',
    upkeepLevel: 'none', techTier: 1,
    controlGroups: { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set(), 5: new Set(), 6: new Set(), 7: new Set(), 8: new Set(), 9: new Set() },
    completedUpgrades: new Set(),
    deadHeroes: [],
    playerFaction, popCap: 12, mapId: mapDef.id,
    gameStatus: 'playing',
    selectedBuildingId: null,
    attackMoveMode: false,
    lastEventPos: null,
    buildMenuOpen: false,
    tilemap: islandsToTilemap(islands, mapDef.worldW, mapDef.worldH),
    islandNodes: [],
    seaRoutes: [],
    weeklyState: null,
    compiledFaction: null,
    ships: new Map(),
    shipBuildQueues: new Map(),
  };

  // Castles (pre-built)
  const bc = makeBuilding('blue', 'castle', mapDef.blueCastle);
  const rc = makeBuilding('red',  'castle', mapDef.redCastle);
  state.buildings.set(bc.id, bc);
  state.buildings.set(rc.id, rc);

  // Starting units
  const isLegion = playerFaction === 'legion';
  mapDef.startingUnits.forEach(u => {
    let type: UnitType = u.type;
    if (isLegion && u.faction === 'blue' && u.type === 'pawn') type = 'orcPawn';
    const unit = makeUnit(u.faction, type, u.pos);
    state.units.set(unit.id, unit);
  });

  // Resources
  mapDef.resources.forEach(r => {
    const res = makeResource(r.type, r.pos, r.amount);
    state.resources.set(res.id, res);
  });

  // Creep camps → spawn neutral units
  mapDef.creepCamps.forEach((camp, i) => {
    const campObj: CreepCamp = { id: `camp_${i}`, ...camp };
    state.creepCamps.push(campObj);
    camp.creeps.forEach((c, j) => {
      const offset = { x: camp.pos.x + (j - 1) * 40, y: camp.pos.y + (j % 2) * 30 };
      const creepUnit = makeUnit('neutral', c.type, offset);
      // Scale creep stats by level
      creepUnit.hp = Math.round(creepUnit.hp * (1 + c.level * 0.3));
      creepUnit.maxHp = creepUnit.hp;
      state.units.set(creepUnit.id, creepUnit);
    });
  });

  // Recalc food
  state.playerResources.food = countFood(state, 'blue');
  state.playerResources.maxFood = calcMaxFood(state, 'blue');
  state.enemyResources.food = countFood(state, 'red');
  state.enemyResources.maxFood = calcMaxFood(state, 'red');

  return state;
}

// ── Spawn a unit (checks food cap) ─────────────────────────────────────────────
export function spawnUnit(state: GameState, faction: Faction, type: UnitType, pos: Vec2, isHero = false): Unit | null {
  const res = faction === 'blue' ? state.playerResources : state.enemyResources;
  const cfg = UNIT_CONFIGS[type];
  const foodCost = isHero ? 5 : (cfg?.foodCost ?? 1);
  if (res.food + foodCost > res.maxFood && !isHero) return null;
  const unit = makeUnit(faction, type, pos, isHero);
  state.units.set(unit.id, unit);
  res.food += unit.foodCost;
  return unit;
}

// ── Main game tick ─────────────────────────────────────────────────────────────
export function updateGame(state: GameState, dt: number): void {
  if (state.gameStatus !== 'playing') return;

  state.tick++;
  state.timeElapsed += dt;

  // Day/Night cycle
  state.dayNightCycle = (state.dayNightCycle + dt) % CYCLE_LENGTH;
  state.timeOfDay = state.dayNightCycle < DAY_DURATION ? 'day' : 'night';

  // Upkeep
  const upkeep = calcUpkeep(state.playerResources.food);
  state.upkeepLevel = upkeep.level;

  // Food recalc
  state.playerResources.food = countFood(state, 'blue');
  state.playerResources.maxFood = calcMaxFood(state, 'blue');
  state.enemyResources.food = countFood(state, 'red');
  state.enemyResources.maxFood = calcMaxFood(state, 'red');
  state.popCap = state.playerResources.maxFood;

  // Mana regen for heroes
  for (const [, u] of state.units) {
    if (u.isHero && u.state !== 'dead' && u.mana < u.maxMana) {
      u.mana = Math.min(u.maxMana, u.mana + 0.6 * dt);
    }
  }

  // Update units
  for (const [, unit] of state.units) {
    if (unit.state === 'dead') continue;

    // Water damage
    unit.inWater = !isOnIsland(unit.pos, state.islands);
    if (unit.inWater) {
      unit.hp -= WATER_DAMAGE_RATE * dt;
      if (unit.hp <= 0) { killUnit(state, unit, null); continue; }
    }

    // Stun timer
    if (unit.stunTimer > 0) {
      unit.stunTimer -= dt;
      unit.state = 'stunned';
      continue;
    }

    // Ability cooldowns
    for (const ab of unit.abilities) {
      if (ab.cooldownRemaining > 0) ab.cooldownRemaining = Math.max(0, ab.cooldownRemaining - dt);
    }

    // Slow / AoE timers
    if (unit.slowTimer > 0) unit.slowTimer = Math.max(0, unit.slowTimer - dt);
    if (unit.aoeTimer > 0) unit.aoeTimer = Math.max(0, unit.aoeTimer - dt);

    // Hero passive auras
    if (unit.isHero && unit.state !== 'dead') {
      // Brilliance Aura (Kanji) — mana regen for nearby allies
      const brillianceAb = unit.abilities.find(a => a.abilityId === 'brilliance_aura' && a.rank > 0);
      if (brillianceAb) {
        const manaRegen = ABILITY_DEFS.brilliance_aura.effectPerRank[brillianceAb.rank - 1] ?? 0;
        for (const [, ally] of state.units) {
          if (ally.faction !== unit.faction || ally.state === 'dead' || ally.maxMana <= 0) continue;
          if (dist(unit.pos, ally.pos) < 250) {
            ally.mana = Math.min(ally.maxMana, ally.mana + manaRegen * dt);
          }
        }
      }
    }

    // Attack cooldown
    if (unit.attackCooldown > 0) unit.attackCooldown -= dt;

    // Movement
    if (unit.state === 'moving' && unit.target) {
      const cfg = UNIT_CONFIGS[unit.type];
      const speed = (cfg?.speed ?? 80) * (unit.inWater ? WATER_SPEED_MULT : 1) * dt;
      const dx = unit.target.x - unit.pos.x;
      const dy = unit.target.y - unit.pos.y;
      const d = Math.hypot(dx, dy);

      if (d < speed) {
        unit.pos = { ...unit.target };
        if (unit.waypoints.length > 0) {
          unit.target = unit.waypoints.shift()!;
        } else {
          unit.target = null;
          unit.state = 'idle';
        }
      } else {
        const n = norm({ x: dx, y: dy });
        unit.pos.x += n.x * speed;
        unit.pos.y += n.y * speed;
        unit.anim.flipX = n.x < 0;
      }
      unit.anim.action = 'run';

      // While still traversing waypoints, check if the assigned attack target
      // has come within attack range — if so stop immediately and engage.
      if (unit.state === 'moving' && unit.attackTargetId) {
        const movingTarget = state.units.get(unit.attackTargetId);
        if (!movingTarget || movingTarget.state === 'dead') {
          unit.attackTargetId = null;
        } else {
          const moveCfg = UNIT_CONFIGS[unit.type];
          const moveHeroCfg = unit.isHero ? HERO_CONFIGS.find(h => h.type === unit.type) : null;
          const engageRange = (moveHeroCfg?.range ?? moveCfg?.range ?? 50) + 10;
          if (dist(unit.pos, movingTarget.pos) <= engageRange) {
            // Cancel remaining waypoints — combat block fires this frame
            unit.target = null;
            unit.waypoints = [];
            unit.state = 'idle';
          }
        }
      }
    }

    // Combat
    if (unit.attackTargetId && unit.state !== 'moving') {
      const target = state.units.get(unit.attackTargetId);
      if (!target || target.state === 'dead') {
        unit.attackTargetId = null;
        unit.state = 'idle';
        continue;
      }
      const cfg = UNIT_CONFIGS[unit.type];
      const heroCfg = unit.isHero ? HERO_CONFIGS.find(h => h.type === unit.type) : null;
      const range = heroCfg?.range ?? cfg?.range ?? 50;
      const d = dist(unit.pos, target.pos);

      if (d <= range + 10) {
        unit.state = 'attacking';
        unit.anim.action = 'attack';
        if (unit.attackCooldown <= 0) {
          const baseDmg = heroCfg?.damage ?? cfg?.damage ?? 10;
          // Add item damage bonuses
          let bonusDmg = 0;
          for (const slot of unit.inventory) {
            if (slot) {
              const def = ITEM_DEFS[slot.defId];
              if (def?.bonusDamage) bonusDmg += def.bonusDamage;
            }
          }
          // Hero level scaling
          const levelDmg = unit.isHero && heroCfg ? heroCfg.damagePerLevel * (unit.heroLevel - 1) : 0;
          const totalDmg = calcDamage(baseDmg + bonusDmg + levelDmg, target.armor);

          // Face toward target
          unit.anim.flipX = target.pos.x < unit.pos.x;

          if (range > 80) {
            // Ranged → fire projectile
            const dir = norm({ x: target.pos.x - unit.pos.x, y: target.pos.y - unit.pos.y });
            const display = getUnitDisplay(unit.type);
            const proj: Projectile = {
              id: uid(), pos: { ...unit.pos },
              vel: { x: dir.x * 400, y: dir.y * 400 },
              targetId: target.id, damage: totalDmg, faction: unit.faction,
              attackerType: unit.type,
              projectileStyle: display.projectile,
            };
            state.projectiles.set(proj.id, proj);
          } else {
            // Evasion passive (Katan) — dodge chance
            const evasionAb = target.isHero ? target.abilities.find(a => a.abilityId === 'evasion' && a.rank > 0) : null;
            if (evasionAb && Math.random() < (ABILITY_DEFS.evasion.effectPerRank[evasionAb.rank - 1] ?? 0) / 100) {
              state.floatingTexts.push({ id: uid(), pos: { ...target.pos }, text: 'EVADE!', color: '#88ffff', age: 0, maxAge: 1 });
            } else {
              // Blade Dance passive — double damage chance (Gangblanc)
              const bladeDanceAb = unit.isHero ? unit.abilities.find(a => a.abilityId === 'blade_dance' && a.rank > 0) : null;
              const doubleDmg = bladeDanceAb && Math.random() < (ABILITY_DEFS.blade_dance.effectPerRank[bladeDanceAb.rank - 1] ?? 0) / 100;
              const finalDmg = doubleDmg ? totalDmg * 2 : totalDmg;

              // Melee → instant damage
              target.hp -= finalDmg;
              state.floatingTexts.push({
                id: uid(), pos: { ...target.pos },
                text: doubleDmg ? `⚔️×2 -${finalDmg}` : `-${totalDmg}`,
                color: doubleDmg ? '#ff00aa' : (unit.faction === 'blue' ? '#ff4444' : '#ff8800'),
                age: 0, maxAge: 1,
              });
              // Hit VFX + particles
              const vfxType = HIT_VFX[unit.type] ?? randomRetroCrit();
              state.vfxEffects.set(uid(), { id: uid(), pos: { ...target.pos }, type: vfxType, age: 0, duration: 0.3 });
              const display = getUnitDisplay(unit.type);
              fxController.playHit({ ...target.pos }, display.projectile, state);

              // Cleave Strike passive — AoE splash (Arthax)
              const cleaveAb = unit.isHero ? unit.abilities.find(a => a.abilityId === 'cleave_strike' && a.rank > 0) : null;
              if (cleaveAb) {
                const cleavePct = (ABILITY_DEFS.cleave_strike.effectPerRank[cleaveAb.rank - 1] ?? 0) / 100;
                const cleaveDmg = Math.max(1, Math.round(totalDmg * cleavePct));
                for (const [, nb] of state.units) {
                  if (nb.id === target.id || nb.faction === unit.faction || nb.state === 'dead') continue;
                  if (dist(unit.pos, nb.pos) < 100) {
                    nb.hp -= cleaveDmg;
                    if (nb.hp <= 0) killUnit(state, nb, unit);
                  }
                }
              }

              // Bash passive — stun chance (Grum)
              const bashAb = unit.isHero ? unit.abilities.find(a => a.abilityId === 'bash' && a.rank > 0) : null;
              if (bashAb && Math.random() < (ABILITY_DEFS.bash.effectPerRank[bashAb.rank - 1] ?? 0) / 100) {
                target.stunTimer = Math.max(target.stunTimer, 1.5);
                state.floatingTexts.push({ id: uid(), pos: { ...target.pos }, text: 'BASH!', color: '#ffff00', age: 0, maxAge: 1 });
              }

              if (target.hp <= 0) killUnit(state, target, unit);
            }
          }
          unit.attackCooldown = heroCfg?.attackSpeed ?? cfg?.attackSpeed ?? 1.0;
        }
      } else {
        // Move toward target (unless holding position)
        if (!unit.holdPosition) {
          unit.target = { ...target.pos };
          unit.waypoints = computePathWaypoints(state.islands, unit.pos, target.pos);
          if (unit.waypoints.length > 0) unit.target = unit.waypoints.shift()!;
          unit.state = 'moving';
        } else {
          // Holding position — drop target if out of range
          unit.attackTargetId = null;
          unit.state = 'idle';
        }
      }
    }

    // Harvesting
    if (unit.role === 'worker' && unit.harvestTargetId) {
      const res = state.resources.get(unit.harvestTargetId);
      if (!res || res.amount <= 0) {
        unit.harvestTargetId = null;
        unit.state = 'idle';
        continue;
      }
      const d = dist(unit.pos, res.pos);
      if (d < 60) {
        unit.state = 'harvesting';
        unit.anim.action = 'interact';
        const cfg = UNIT_CONFIGS[unit.type];
        const harvestAmt = (cfg?.harvestSpeed ?? 10) * dt;
        const gathered = Math.min(harvestAmt, res.amount, (cfg?.carryCapacity ?? 30) - unit.carryAmount);
        res.amount -= gathered;
        unit.carryAmount += gathered;
        unit.carryType = res.type === 'tree' ? 'wood' : 'gold';
        if (unit.carryAmount >= (cfg?.carryCapacity ?? 30) || res.amount <= 0) {
          // Return to nearest castle/keep/fortress
          unit.harvestTargetId = null;
          const returnBuilding = findNearestTownHall(state, unit.faction, unit.pos);
          if (returnBuilding) {
            unit.returnToId = returnBuilding.id;
            unit.target = { ...returnBuilding.pos };
            unit.waypoints = computePathWaypoints(state.islands, unit.pos, returnBuilding.pos);
            if (unit.waypoints.length > 0) unit.target = unit.waypoints.shift()!;
            unit.state = 'moving';
          }
        }
      } else {
        unit.target = { ...res.pos };
        unit.waypoints = computePathWaypoints(state.islands, unit.pos, res.pos);
        if (unit.waypoints.length > 0) unit.target = unit.waypoints.shift()!;
        unit.state = 'moving';
      }
    }

    // Returning resources
    if (unit.returnToId && unit.carryAmount > 0) {
      const bld = state.buildings.get(unit.returnToId);
      if (bld && dist(unit.pos, bld.pos) < 80) {
        const res = unit.faction === 'blue' ? state.playerResources : state.enemyResources;
        if (unit.carryType === 'wood') res.wood += unit.carryAmount;
        else res.gold += Math.round(unit.carryAmount * calcUpkeep(res.food).rate);
        unit.carryAmount = 0;
        unit.carryType = null;
        unit.returnToId = null;
        unit.state = 'idle';
      }
    }

    // Building construction
    if (unit.buildTargetId) {
      const bld = state.buildings.get(unit.buildTargetId);
      if (bld && bld.underConstruction) {
        const d = dist(unit.pos, bld.pos);
        if (d < 80) {
          unit.state = 'building';
          unit.anim.action = 'interact';
          const cfg = BUILDING_CONFIGS[bld.type];
          bld.constructionProgress += dt / cfg.buildTime;
          if (bld.constructionProgress >= 1) {
            bld.constructionProgress = 1;
            bld.underConstruction = false;
            unit.buildTargetId = null;
            unit.state = 'idle';
          }
        } else {
          unit.target = { ...bld.pos };
          unit.state = 'moving';
        }
      } else {
        unit.buildTargetId = null;
        unit.state = 'idle';
      }
    }
  }

  // Update projectiles
  for (const [pid, proj] of state.projectiles) {
    proj.pos.x += proj.vel.x * dt;
    proj.pos.y += proj.vel.y * dt;
    const target = state.units.get(proj.targetId);
    if (!target || target.state === 'dead') { state.projectiles.delete(pid); continue; }
    if (dist(proj.pos, target.pos) < 20) {
      target.hp -= proj.damage;
      state.floatingTexts.push({
        id: uid(), pos: { ...target.pos },
        text: `-${proj.damage}`, color: '#ff4444', age: 0, maxAge: 1,
      });
      const vfxType = HIT_VFX[proj.attackerType ?? ''] ?? randomRetroCrit();
      state.vfxEffects.set(uid(), { id: uid(), pos: { ...target.pos }, type: vfxType, age: 0, duration: 0.3 });
      if (target.hp <= 0) {
        const attacker = findUnitByProjectile(state, proj);
        killUnit(state, target, attacker);
      }
      state.projectiles.delete(pid);
    }
  }

  // Building training
  for (const [, bld] of state.buildings) {
    if (bld.underConstruction || bld.trainingQueue.length === 0) continue;
    const unitType = bld.trainingQueue[0];
    const cfg = UNIT_CONFIGS[unitType];
    if (!cfg) continue;
    bld.trainingProgress += dt / cfg.trainTime;
    if (bld.trainingProgress >= 1) {
      bld.trainingProgress = 0;
      bld.trainingQueue.shift();
      const rally = bld.rallyPoint ?? { x: bld.pos.x + 60, y: bld.pos.y + 80 };
      spawnUnit(state, bld.faction, unitType, rally);
    }
  }

  // Tower auto-attack
  for (const [, bld] of state.buildings) {
    if (!BUILDING_CONFIGS[bld.type].canAttack || bld.underConstruction) continue;
    if (bld.attackCooldown > 0) { bld.attackCooldown -= dt; continue; }
    const range = BUILDING_CONFIGS[bld.type].attackRange ?? 220;
    let closest: Unit | null = null;
    let closestDist = Infinity;
    for (const [, u] of state.units) {
      if (u.faction === bld.faction || u.state === 'dead') continue;
      const d = dist(bld.pos, u.pos);
      if (d < range && d < closestDist) { closest = u; closestDist = d; }
    }
    if (closest) {
      const dmg = BUILDING_CONFIGS[bld.type].attackDamage ?? 30;
      const dir = norm({ x: closest.pos.x - bld.pos.x, y: closest.pos.y - bld.pos.y });
      const proj: Projectile = {
        id: uid(), pos: { ...bld.pos },
        vel: { x: dir.x * 350, y: dir.y * 350 },
        targetId: closest.id, damage: calcDamage(dmg, closest.armor), faction: bld.faction,
        projectileStyle: 'bolt',
      };
      state.projectiles.set(proj.id, proj);
      bld.attackCooldown = 2.0;
    }
  }

  // VFX aging
  for (const [vid, vfx] of state.vfxEffects) {
    vfx.age += dt;
    if (vfx.age >= vfx.duration) state.vfxEffects.delete(vid);
  }

  // Ground effects aging + DOT
  for (const [gid, ge] of state.groundEffects) {
    ge.age += dt;
    ge.dotTimer += dt;
    if (ge.age >= ge.duration) { state.groundEffects.delete(gid); continue; }
    if (ge.dotTimer >= ge.dotInterval) {
      ge.dotTimer = 0;
      for (const [, u] of state.units) {
        if (u.faction === ge.casterFaction || u.state === 'dead') continue;
        if (dist(u.pos, ge.pos) < ge.radius) {
          u.hp -= ge.dotDamage;
          if (u.hp <= 0) killUnit(state, u, null);
        }
      }
    }
  }

  // Floating texts aging
  state.floatingTexts = state.floatingTexts.filter(ft => {
    ft.age += dt;
    ft.pos.y -= 30 * dt;
    return ft.age < ft.maxAge;
  });

  // Dead hero revival timer
  for (const dh of state.deadHeroes) {
    dh.reviveTimer -= dt;
  }
  state.deadHeroes = state.deadHeroes.filter(dh => dh.reviveTimer > 0);

  // Dead unit cleanup (remove after 3 seconds)
  for (const [uid, unit] of state.units) {
    if (unit.state === 'dead') {
      unit.deathTimer += dt;
      if (unit.deathTimer >= 3) {
        state.units.delete(uid);
        state.selected.delete(uid);
      }
    }
  }

  // Auto-aggro: idle military units attack nearby enemies within 200px
  for (const [, unit] of state.units) {
    if (unit.state !== 'idle' || unit.role === 'worker' || unit.faction === 'neutral') continue;
    if (unit.attackTargetId || unit.harvestTargetId || unit.buildTargetId) continue;
    let nearestEnemy: Unit | null = null;
    let nearestDist = 200;
    for (const [, e] of state.units) {
      if (e.faction === unit.faction || e.faction === 'neutral' || e.state === 'dead') continue;
      const d = dist(unit.pos, e.pos);
      if (d < nearestDist) { nearestDist = d; nearestEnemy = e; }
    }
    if (nearestEnemy) {
      unit.attackTargetId = nearestEnemy.id;
    }
  }

  // Healer auto-cast: priest / orcHealer heal nearby wounded allies
  for (const [, unit] of state.units) {
    if (unit.state === 'dead') continue;
    if (unit.type !== 'priest' && unit.type !== 'orcHealer') continue;
    if (unit.attackTargetId || unit.state === 'moving') continue;
    unit.healTimer += dt;
    if (unit.healTimer >= PRIEST_HEAL_PULSE) {
      unit.healTimer = 0;
      for (const [, ally] of state.units) {
        if (ally.faction !== unit.faction || ally.state === 'dead') continue;
        if (ally.hp >= ally.maxHp) continue;
        if (dist(unit.pos, ally.pos) < PRIEST_HEAL_RANGE) {
          ally.hp = Math.min(ally.maxHp, ally.hp + PRIEST_HEAL_AMOUNT);
          state.vfxEffects.set(uid(), { id: uid(), pos: { ...ally.pos }, type: 'holy_heal', age: 0, duration: 0.5 });
        }
      }
    }
  }

  // ── Ship movement & combat ──────────────────────────────────────────────
  for (const [sid, ship] of state.ships) {
    if (ship.state === 'destroyed') continue;

    // Sinking animation
    if (ship.state === 'sinking') {
      ship.sinkTimer += dt;
      if (ship.sinkTimer >= 3) {
        // Process sinking: crew dies, captain washes up
        const result = processSinking(ship);
        for (const crewId of result.crewIds) {
          const crewUnit = state.units.get(crewId);
          if (crewUnit && crewUnit.state !== 'dead') {
            crewUnit.state = 'dead';
            crewUnit.hp = 0;
            crewUnit.deathTimer = 0;
          }
        }
        // Captain survives — teleport to home island
        if (result.captainSurvives && result.captainId) {
          const captain = state.units.get(result.captainId);
          if (captain && captain.state !== 'dead') {
            const spawnPos = getHomeSpawnPoint(state.islandNodes, ship.faction);
            // Fallback to faction castle if no island nodes
            if (spawnPos.x === 0 && spawnPos.y === 0) {
              for (const [, b] of state.buildings) {
                if (b.faction === ship.faction && (b.type === 'castle' || b.type === 'keep' || b.type === 'fortress')) {
                  spawnPos.x = b.pos.x + 60;
                  spawnPos.y = b.pos.y + 60;
                  break;
                }
              }
            }
            captain.pos = spawnPos;
            captain.hp = Math.max(1, Math.round(captain.maxHp * 0.1)); // 10% HP
            captain.state = 'idle';
            captain.anim.action = 'idle';
            state.floatingTexts.push({ id: uid(), pos: { ...spawnPos }, text: `${captain.type} washed ashore!`, color: '#ffd700', age: 0, maxAge: 3 });
          }
        }
        ship.state = 'destroyed';
        state.ships.delete(sid);
      }
      continue;
    }

    // Ship movement
    if (ship.state === 'moving' && ship.target) {
      const cfg = SHIP_CONFIGS[ship.type];
      const dx = ship.target.x - ship.pos.x;
      const dy = ship.target.y - ship.pos.y;
      const d = Math.hypot(dx, dy);
      const targetAngle = Math.atan2(dy, dx);
      ship.heading = updateShipHeading(ship.heading, targetAngle, cfg.turnSpeed, dt);
      const speed = cfg.speed * dt;

      if (d < speed) {
        ship.pos = { ...ship.target };
        if (ship.waypoints.length > 0) {
          ship.target = ship.waypoints.shift()!;
        } else {
          ship.target = null;
          ship.state = 'idle';
        }
      } else {
        ship.pos.x += Math.cos(ship.heading) * speed;
        ship.pos.y += Math.sin(ship.heading) * speed;
      }
    }

    // Ship broadside combat
    if (ship.attackTargetId && ship.state !== 'moving') {
      const target = state.ships.get(ship.attackTargetId);
      if (!target || target.state === 'sinking' || target.state === 'destroyed') {
        ship.attackTargetId = null;
        ship.state = 'idle';
        continue;
      }
      const cfg = SHIP_CONFIGS[ship.type];
      if (cfg.cannonCount === 0) { ship.attackTargetId = null; continue; }

      const d = shipDist(ship.pos, target.pos);
      if (d <= cfg.cannonRange) {
        ship.state = 'attacking';
        if (ship.cannonCooldown <= 0) {
          const dmg = calcBroadsideDamage(ship.type);
          target.hp -= dmg;
          ship.cannonCooldown = cfg.cannonCooldown;
          state.floatingTexts.push({ id: uid(), pos: { ...target.pos }, text: `-${dmg}`, color: '#ff4444', age: 0, maxAge: 1 });
          fxController.playHit({ ...target.pos }, 'bolt', state);
          if (target.hp <= 0) {
            target.hp = 0;
            target.state = 'sinking';
            target.sinkTimer = 0;
          }
        }
      } else {
        // Move toward target
        ship.target = { ...target.pos };
        ship.state = 'moving';
      }
    }

    if (ship.cannonCooldown > 0) ship.cannonCooldown -= dt;
  }

  // ── Docks ship building ──────────────────────────────────────────────────
  for (const [docksId, order] of state.shipBuildQueues) {
    const docks = state.buildings.get(docksId);
    if (!docks || docks.underConstruction || docks.type !== 'docks') {
      state.shipBuildQueues.delete(docksId);
      continue;
    }
    const cfg = SHIP_CONFIGS[order.type];
    order.progress += dt / cfg.buildTime;
    if (order.progress >= 1) {
      const pos = { x: docks.pos.x + 50, y: docks.pos.y + 100 };
      const ship = makeShip(docks.faction, order.type, pos, order.captainId, docksId);
      ship.buildProgress = 1;
      ship.state = 'docked';
      state.ships.set(ship.id, ship);
      state.shipBuildQueues.delete(docksId);
    }
  }

  // AI
  updateAI(state, dt);

  // Win condition
  checkWinCondition(state);
}

// ── Kill unit ──────────────────────────────────────────────────────────────────
function killUnit(state: GameState, unit: Unit, killer: Unit | null): void {
  unit.state = 'dead';
  unit.hp = 0;
  unit.deathTimer = 0;
  state.lastEventPos = { ...unit.pos };

  // Death FX particles + audio
  fxController.playDeath({ ...unit.pos }, unit.isHero, state);

  if (killer) {
    killer.kills++;
    // XP grant
    const cfg = UNIT_CONFIGS[unit.type];
    const xpValue = unit.isHero ? 200 : Math.round((cfg?.hp ?? 50) * 0.5);
    // Grant XP to all nearby friendly heroes
    for (const [, u] of state.units) {
      if (u.faction === killer.faction && u.isHero && u.state !== 'dead' && dist(u.pos, unit.pos) < 300) {
        grantXp(u, xpValue, state);
      }
    }
    // Passive: Blood Rage (Borg) — heal on kill
    const bloodRageAb = killer.isHero ? killer.abilities.find(a => a.abilityId === 'blood_rage' && a.rank > 0) : null;
    if (bloodRageAb) {
      const brPct = (ABILITY_DEFS.blood_rage.effectPerRank[bloodRageAb.rank - 1] ?? 0) / 100;
      killer.hp = Math.min(killer.hp + Math.round(killer.maxHp * brPct), killer.maxHp);
    }
  }

  // Hero death → add to revival queue
  if (unit.isHero) {
    const heroCfg = HERO_CONFIGS.find(h => h.type === unit.type);
    // Passive: Reincarnation (Grum ultimate) — fast auto-revive
    const reincarnationAb = unit.abilities.find(a => a.abilityId === 'reincarnation' && a.rank > 0 && a.cooldownRemaining <= 0);
    if (reincarnationAb) {
      reincarnationAb.cooldownRemaining = ABILITY_DEFS.reincarnation.cooldown;
      state.deadHeroes.push({ unitId: unit.id, reviveTimer: 5, reviveCost: 0 });
      state.floatingTexts.push({ id: uid(), pos: { ...unit.pos }, text: '♻️ REINCARNATION!', color: '#ffd700', age: 0, maxAge: 2.5 });
    } else {
      state.deadHeroes.push({
        unitId: unit.id,
        reviveTimer: heroCfg?.reviveTime ?? 55,
        reviveCost: heroCfg?.reviveCost ?? 425,
      });
    }
  }

  // Check if this was part of a creep camp
  if (unit.faction === 'neutral') {
    for (const camp of state.creepCamps) {
      if (!camp.cleared && dist(unit.pos, camp.pos) < 120) {
        const campCreepsAlive = [...state.units.values()].some(
          u => u.faction === 'neutral' && u.state !== 'dead' && dist(u.pos, camp.pos) < 120
        );
        if (!campCreepsAlive) {
          camp.cleared = true;
          // Drop item
          const itemId = rollItemDrop(camp);
          if (itemId && killer?.isHero) {
            giveItemToHero(killer, itemId);
            state.floatingTexts.push({ id: uid(), pos: { ...camp.pos }, text: `Found: ${ITEM_DEFS[itemId]?.name}!`, color: '#ffd700', age: 0, maxAge: 3 });
            state.vfxEffects.set(uid(), { id: uid(), pos: { ...camp.pos }, type: 'item_drop', age: 0, duration: 0.5 });
          }
          // Grant camp XP bonus
          if (killer?.isHero) grantXp(killer, camp.xpReward, state);
        }
      }
    }
  }

  // Clean up selection
  state.selected.delete(unit.id);

  // Recalc food
  const res = unit.faction === 'blue' ? state.playerResources : state.enemyResources;
  res.food = countFood(state, unit.faction);
}

// ── AI (WC3-style: phased with hero, tech, economy, defense) ──────────────

/** Place a building near the AI castle with offset based on building type and count */
function aiPlaceBuilding(state: GameState, castle: Building, type: BuildingType, index: number): void {
  const res = state.enemyResources;
  const cfg = BUILDING_CONFIGS[type];
  if (res.gold < cfg.cost.gold || res.wood < cfg.cost.wood) return;

  // Already have one under construction?
  const existing = [...state.buildings.values()].some(
    b => b.faction === 'red' && b.type === type && b.underConstruction
  );
  if (existing) return;

  // Offset grid around castle
  const offsets: Record<string, { x: number; y: number }[]> = {
    barracks:   [{ x: 150, y: 100 }],
    archery:    [{ x: 150, y: -100 }],
    altar:      [{ x: -140, y: 100 }],
    chapel:     [{ x: 150, y: 220 }],
    workshop:   [{ x: 150, y: -220 }],
    sanctum:    [{ x: -140, y: -100 }],
    blacksmith: [{ x: -140, y: 220 }],
    tower:      [{ x: -80 + index * 100, y: -160 }, { x: -80 + index * 100, y: 260 }],
    house:      [
      { x: -200, y: -60 + index * 80 },
      { x: -200, y: 20 + index * 80 },
      { x: -200, y: 100 + index * 80 },
      { x: -280, y: -60 + index * 80 },
      { x: -280, y: 20 + index * 80 },
      { x: -280, y: 100 + index * 80 },
    ],
  };

  const off = offsets[type]?.[Math.min(index, (offsets[type]?.length ?? 1) - 1)] ?? { x: 150 + index * 100, y: 100 };
  const pos = { x: castle.pos.x + off.x, y: castle.pos.y + off.y };

  res.gold -= cfg.cost.gold;
  res.wood -= cfg.cost.wood;
  const bld = makeBuilding('red', type, pos, true);
  state.buildings.set(bld.id, bld);

  // Assign an idle worker to build
  const worker = [...state.units.values()].find(
    u => u.faction === 'red' && u.role === 'worker' && u.state === 'idle' && !u.buildTargetId
  );
  if (worker) {
    worker.buildTargetId = bld.id;
    worker.harvestTargetId = null;
    worker.attackTargetId = null;
    worker.target = { ...pos };
    worker.waypoints = computePathWaypoints(state.islands, worker.pos, pos);
    if (worker.waypoints.length > 0) worker.target = worker.waypoints.shift()!;
    worker.state = 'moving';
  }
}

/** Find nearest uncleared creep camp to a position */
function findNearestUnclearedCamp(state: GameState, pos: Vec2): CreepCamp | null {
  let best: CreepCamp | null = null;
  let bestD = Infinity;
  for (const camp of state.creepCamps) {
    if (camp.cleared) continue;
    const d = dist(pos, camp.pos);
    if (d < bestD) { bestD = d; best = camp; }
  }
  return best;
}

function updateAI(state: GameState, dt: number): void {
  const ai = state.aiState;
  ai.phaseTimer += dt;
  ai.attackTimer += dt;
  ai.buildTimer += dt;

  // ── Census ───────────────────────────────────────────────────────────────────
  let workerCount = 0, armyCount = 0, heroCount = 0;
  let hasBarracks = false, hasArchery = false, hasAltar = false, hasChapel = false;
  let hasWorkshop = false, hasSanctum = false;
  let houseCount = 0, towerCount = 0;
  const aiHeroes: Unit[] = [];

  for (const [, u] of state.units) {
    if (u.faction !== 'red' || u.state === 'dead') continue;
    if (u.isHero) { heroCount++; aiHeroes.push(u); }
    else if (u.role === 'worker') workerCount++;
    else armyCount++;
  }
  for (const [, b] of state.buildings) {
    if (b.faction !== 'red') continue;
    const done = !b.underConstruction;
    if (b.type === 'barracks' && done) hasBarracks = true;
    if (b.type === 'archery' && done) hasArchery = true;
    if (b.type === 'altar' && done) hasAltar = true;
    if (b.type === 'chapel' && done) hasChapel = true;
    if (b.type === 'workshop' && done) hasWorkshop = true;
    if (b.type === 'sanctum' && done) hasSanctum = true;
    if (b.type === 'house') houseCount++;
    if (b.type === 'tower') towerCount++;
  }

  const res = state.enemyResources;
  const castle = [...state.buildings.values()].find(
    b => b.faction === 'red' && (b.type === 'castle' || b.type === 'keep' || b.type === 'fortress')
  );
  if (!castle) return;

  // ── Phase transitions ──────────────────────────────────────────────────────
  if (ai.phase === 'early' && ai.phaseTimer > 30 && hasBarracks) {
    ai.phase = 'creep';
    ai.phaseTimer = 0;
  } else if (ai.phase === 'creep' && ai.phaseTimer > 60) {
    ai.phase = 'expand';
    ai.phaseTimer = 0;
  } else if (ai.phase === 'expand' && ai.techTier >= 2 && armyCount >= 6) {
    ai.phase = 'harass';
    ai.phaseTimer = 0;
  } else if (ai.phase === 'harass' && (ai.techTier >= 3 || armyCount >= 12)) {
    ai.phase = 'push';
    ai.phaseTimer = 0;
  }

  // Throttle building actions to every 2 seconds
  if (ai.buildTimer < 2) {
    // Skip to attack/harvest logic below
  } else {
    ai.buildTimer = 0;

    // ── Train workers (cap at 8) ───────────────────────────────────────────────
    if (workerCount < 8 && castle.trainingQueue.length === 0 && res.gold >= 75) {
      castle.trainingQueue.push('pawn');
      res.gold -= 75;
    }

    // ── Build houses when food cap is tight ─────────────────────────────────
    if (res.food + 4 >= res.maxFood && res.wood >= 50 && houseCount < 6) {
      aiPlaceBuilding(state, castle, 'house', houseCount);
    }

    // ── Build barracks ─────────────────────────────────────────────────────
    if (!hasBarracks && res.wood >= 200 && ai.phaseTimer > 10) {
      aiPlaceBuilding(state, castle, 'barracks', 0);
    }

    // ── Build altar for heroes ─────────────────────────────────────────────
    if (!hasAltar && hasBarracks && res.wood >= 200 && res.gold >= 150) {
      aiPlaceBuilding(state, castle, 'altar', 0);
    }

    // ── Build archery range ────────────────────────────────────────────────
    if (!hasArchery && hasBarracks && res.wood >= 150 && res.gold >= 50) {
      aiPlaceBuilding(state, castle, 'archery', 0);
    }

    // ── Tech progression (expand phase+) ──────────────────────────────────
    if (ai.phase === 'expand' || ai.phase === 'harass' || ai.phase === 'push') {
      // Upgrade castle → keep
      if (castle.type === 'castle' && res.gold >= 500 && res.wood >= 200) {
        const cfg = BUILDING_CONFIGS['keep'];
        res.gold -= cfg.cost.gold;
        res.wood -= cfg.cost.wood;
        castle.type = 'keep';
        castle.maxHp = cfg.hp;
        castle.hp = cfg.hp;
        castle.techTier = cfg.techTier as TechTier;
        ai.techTier = 2;
      }
      // Build chapel (T2)
      if (!hasChapel && ai.techTier >= 2 && hasBarracks && res.wood >= 200 && res.gold >= 100) {
        aiPlaceBuilding(state, castle, 'chapel', 0);
      }
      // Build workshop (T2)
      if (!hasWorkshop && ai.techTier >= 2 && hasBarracks && res.wood >= 200 && res.gold >= 100) {
        aiPlaceBuilding(state, castle, 'workshop', 0);
      }
      // Upgrade keep → fortress
      if (castle.type === 'keep' && res.gold >= 700 && res.wood >= 300 && ai.phaseTimer > 30) {
        const cfg = BUILDING_CONFIGS['fortress'];
        res.gold -= cfg.cost.gold;
        res.wood -= cfg.cost.wood;
        castle.type = 'fortress';
        castle.maxHp = cfg.hp;
        castle.hp = cfg.hp;
        castle.techTier = cfg.techTier as TechTier;
        ai.techTier = 3;
      }
      // Build sanctum (T3)
      if (!hasSanctum && ai.techTier >= 3 && hasChapel && res.wood >= 300 && res.gold >= 250) {
        aiPlaceBuilding(state, castle, 'sanctum', 0);
      }
    }

    // ── Build towers near base (max 2) ───────────────────────────────────
    if (towerCount < 2 && hasBarracks && res.wood >= 100 && res.gold >= 80) {
      aiPlaceBuilding(state, castle, 'tower', towerCount);
    }

    // ── Train army: barracks (melee mix) ─────────────────────────────────
    const barracks = [...state.buildings.values()].find(
      b => b.faction === 'red' && b.type === 'barracks' && !b.underConstruction
    );
    if (barracks && barracks.trainingQueue.length < 2) {
      const roll = Math.random();
      let unitType: UnitType = 'swordsman';
      if (ai.techTier >= 2 && roll < 0.3) unitType = 'knight';
      else if (ai.techTier >= 2 && roll < 0.5) unitType = 'orcWarrior';
      else if (roll < 0.7) unitType = 'spearman';

      const cfg = UNIT_CONFIGS[unitType];
      if (cfg && res.gold >= cfg.trainCost.gold && res.wood >= cfg.trainCost.wood
          && res.food + cfg.foodCost <= res.maxFood) {
        barracks.trainingQueue.push(unitType);
        res.gold -= cfg.trainCost.gold;
        res.wood -= cfg.trainCost.wood;
      }
    }

    // ── Train army: archery (ranged) ─────────────────────────────────────
    const archeryBld = [...state.buildings.values()].find(
      b => b.faction === 'red' && b.type === 'archery' && !b.underConstruction
    );
    if (archeryBld && archeryBld.trainingQueue.length < 2) {
      const unitType: UnitType = ai.techTier >= 2 && Math.random() < 0.4 ? 'musketeer' : 'bowman';
      const cfg = UNIT_CONFIGS[unitType];
      if (cfg && res.gold >= cfg.trainCost.gold && res.wood >= cfg.trainCost.wood
          && res.food + cfg.foodCost <= res.maxFood) {
        archeryBld.trainingQueue.push(unitType);
        res.gold -= cfg.trainCost.gold;
        res.wood -= cfg.trainCost.wood;
      }
    }

    // ── Train army: chapel (casters) ─────────────────────────────────────
    const chapelBld = [...state.buildings.values()].find(
      b => b.faction === 'red' && b.type === 'chapel' && !b.underConstruction
    );
    if (chapelBld && chapelBld.trainingQueue.length < 2) {
      const unitType: UnitType = Math.random() < 0.5 ? 'mage' : 'orcHealer';
      const cfg = UNIT_CONFIGS[unitType];
      if (cfg && res.gold >= cfg.trainCost.gold && res.wood >= cfg.trainCost.wood
          && res.food + cfg.foodCost <= res.maxFood) {
        chapelBld.trainingQueue.push(unitType);
        res.gold -= cfg.trainCost.gold;
        res.wood -= cfg.trainCost.wood;
      }
    }

    // ── Train army: sanctum (elites) ─────────────────────────────────────
    const sanctumBld = [...state.buildings.values()].find(
      b => b.faction === 'red' && b.type === 'sanctum' && !b.underConstruction
    );
    if (sanctumBld && sanctumBld.trainingQueue.length < 1) {
      const roll = Math.random();
      const unitType: UnitType = roll < 0.3 ? 'minotaur' : roll < 0.6 ? 'demon' : roll < 0.9 ? 'mammoth' : 'dragon';
      const cfg = UNIT_CONFIGS[unitType];
      if (cfg && res.gold >= cfg.trainCost.gold && res.wood >= cfg.trainCost.wood
          && res.food + cfg.foodCost <= res.maxFood) {
        sanctumBld.trainingQueue.push(unitType);
        res.gold -= cfg.trainCost.gold;
        res.wood -= cfg.trainCost.wood;
      }
    }
  }

  // ── Hero: summon and send to creep camps ──────────────────────────────
  if ((ai.phase === 'creep' || ai.phase === 'expand') && heroCount === 0 && hasAltar && !ai.heroSummoned) {
    const altar = [...state.buildings.values()].find(
      b => b.faction === 'red' && b.type === 'altar' && !b.underConstruction
    );
    if (altar) {
      const pos = { x: altar.pos.x + 60, y: altar.pos.y + 60 };
      const hero = spawnUnit(state, 'red', 'arthax', pos, true);
      if (hero) ai.heroSummoned = true;
    }
  }

  // Send idle heroes to clear nearby creep camps
  for (const hero of aiHeroes) {
    if (hero.state === 'idle' && !hero.attackTargetId) {
      const camp = findNearestUnclearedCamp(state, hero.pos);
      if (camp) {
        let nearestCreep: Unit | null = null;
        let nearestDist = Infinity;
        for (const [, u] of state.units) {
          if (u.faction === 'neutral' && u.state !== 'dead' && dist(u.pos, camp.pos) < 150) {
            const d = dist(hero.pos, u.pos);
            if (d < nearestDist) { nearestDist = d; nearestCreep = u; }
          }
        }
        if (nearestCreep) {
          hero.attackTargetId = nearestCreep.id;
        } else {
          hero.target = { ...camp.pos };
          hero.waypoints = computePathWaypoints(state.islands, hero.pos, camp.pos);
          if (hero.waypoints.length > 0) hero.target = hero.waypoints.shift()!;
          hero.state = 'moving';
        }
      }
    }
  }

  // ── Attack waves (uses map's aiAttackInterval) ────────────────────────
  const attackInterval = ai.aiAttackInterval * (ai.phase === 'push' ? 0.5 : ai.phase === 'harass' ? 0.7 : 1.0);
  const minArmy = ai.phase === 'push' ? 3 : ai.phase === 'harass' ? 5 : 6;

  if (ai.attackTimer > attackInterval && armyCount >= minArmy) {
    ai.attackTimer = 0;
    const blueCastle = [...state.buildings.values()].find(
      b => b.faction === 'blue' && (b.type === 'castle' || b.type === 'keep' || b.type === 'fortress')
    );
    if (blueCastle) {
      for (const [, u] of state.units) {
        if (u.faction === 'red' && u.role !== 'worker' && u.state !== 'dead' && !u.isHero) {
          u.attackTargetId = null;
          let nearestEnemy: Unit | null = null;
          let nearestDist = Infinity;
          for (const [, e] of state.units) {
            if (e.faction === 'blue' && e.state !== 'dead') {
              const d = dist(u.pos, e.pos);
              if (d < nearestDist) { nearestDist = d; nearestEnemy = e; }
            }
          }
          if (nearestEnemy) {
            u.attackTargetId = nearestEnemy.id;
          } else {
            u.target = { ...blueCastle.pos };
            u.waypoints = computePathWaypoints(state.islands, u.pos, blueCastle.pos);
            if (u.waypoints.length > 0) u.target = u.waypoints.shift()!;
            u.state = 'moving';
          }
        }
      }
      // Heroes join push waves
      if (ai.phase === 'push') {
        for (const hero of aiHeroes) {
          if (hero.state !== 'dead') {
            hero.attackTargetId = null;
            hero.target = { ...blueCastle.pos };
            hero.waypoints = computePathWaypoints(state.islands, hero.pos, blueCastle.pos);
            if (hero.waypoints.length > 0) hero.target = hero.waypoints.shift()!;
            hero.state = 'moving';
          }
        }
      }
    }
  }

  // ── Reactive defense: mobilise idle units when enemies enter base radius ──
  const DEFENSE_RADIUS = 380;
  let baseThreat: Unit | null = null;
  for (const [, threat] of state.units) {
    if (threat.faction !== 'blue' || threat.state === 'dead') continue;
    if (dist(threat.pos, castle.pos) < DEFENSE_RADIUS) { baseThreat = threat; break; }
  }
  if (baseThreat) {
    for (const [, defender] of state.units) {
      if (defender.faction !== 'red' || defender.role === 'worker' || defender.state === 'dead') continue;
      if (defender.attackTargetId) continue; // already engaging a target
      // Find the nearest blue threat within extended radius for this defender
      let closestThreat: Unit | null = null;
      let closestDist = Infinity;
      for (const [, e] of state.units) {
        if (e.faction !== 'blue' || e.state === 'dead') continue;
        if (dist(e.pos, castle.pos) > DEFENSE_RADIUS * 1.5) continue;
        const d = dist(defender.pos, e.pos);
        if (d < closestDist) { closestDist = d; closestThreat = e; }
      }
      if (closestThreat) defender.attackTargetId = closestThreat.id;
    }
  }

  // ── Auto-harvest: idle workers seek resources (prefer same island, gold when low) ────
  for (const [, u] of state.units) {
    if (u.faction !== 'red' || u.role !== 'worker' || u.state !== 'idle' || u.buildTargetId) continue;
    // Return carried resources first
    if (u.carryAmount > 0 && !u.returnToId) {
      const th = findNearestTownHall(state, 'red', u.pos);
      if (th) {
        u.returnToId = th.id;
        u.target = { ...th.pos };
        u.waypoints = computePathWaypoints(state.islands, u.pos, th.pos);
        if (u.waypoints.length > 0) u.target = u.waypoints.shift()!;
        u.state = 'moving';
      }
      continue;
    }

    const preferGold = res.gold < 300;
    // Determine which island the worker is currently on
    const workerIsland = state.islands.find(i =>
      u.pos.x >= i.x && u.pos.x <= i.x + i.w &&
      u.pos.y >= i.y && u.pos.y <= i.y + i.h
    ) ?? null;

    let nearestRes: Resource | null = null;
    let nearestDist = Infinity;

    // First pass: same island, preferred type
    for (const [, r] of state.resources) {
      if (r.amount <= 0) continue;
      if (preferGold && r.type !== 'goldmine') continue;
      if (workerIsland) {
        if (r.pos.x < workerIsland.x || r.pos.x > workerIsland.x + workerIsland.w) continue;
        if (r.pos.y < workerIsland.y || r.pos.y > workerIsland.y + workerIsland.h) continue;
      }
      const d = dist(u.pos, r.pos);
      if (d < nearestDist) { nearestDist = d; nearestRes = r; }
    }
    // Second pass: any type on same island
    if (!nearestRes && workerIsland) {
      nearestDist = Infinity;
      for (const [, r] of state.resources) {
        if (r.amount <= 0) continue;
        if (r.pos.x < workerIsland.x || r.pos.x > workerIsland.x + workerIsland.w) continue;
        if (r.pos.y < workerIsland.y || r.pos.y > workerIsland.y + workerIsland.h) continue;
        const d = dist(u.pos, r.pos);
        if (d < nearestDist) { nearestDist = d; nearestRes = r; }
      }
    }
    // Final fallback: any reachable resource anywhere
    if (!nearestRes) {
      nearestDist = Infinity;
      for (const [, r] of state.resources) {
        if (r.amount <= 0) continue;
        const d = dist(u.pos, r.pos);
        if (d < nearestDist) { nearestDist = d; nearestRes = r; }
      }
    }
    if (nearestRes) {
      u.harvestTargetId = nearestRes.id;
    }
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function findNearestTownHall(state: GameState, faction: Faction, pos: Vec2): Building | null {
  let best: Building | null = null;
  let bestD = Infinity;
  for (const [, b] of state.buildings) {
    if (b.faction !== faction || b.underConstruction) continue;
    if (b.type === 'castle' || b.type === 'keep' || b.type === 'fortress') {
      const d = dist(pos, b.pos);
      if (d < bestD) { bestD = d; best = b; }
    }
  }
  return best;
}

function findUnitByProjectile(state: GameState, proj: Projectile): Unit | null {
  for (const [, u] of state.units) {
    if (u.faction === proj.faction && u.state !== 'dead' && dist(u.pos, proj.pos) < 200) return u;
  }
  return null;
}

function checkWinCondition(state: GameState): void {
  let blueHasCastle = false, redHasCastle = false;
  for (const [, b] of state.buildings) {
    if (b.type === 'castle' || b.type === 'keep' || b.type === 'fortress') {
      if (b.faction === 'blue') blueHasCastle = true;
      if (b.faction === 'red') redHasCastle = true;
    }
  }
  if (!blueHasCastle) { state.winner = 'red'; state.gameStatus = 'lost'; }
  if (!redHasCastle)  { state.winner = 'blue'; state.gameStatus = 'won'; }
}

// ── Player commands ────────────────────────────────────────────────────────────
export function commandMove(state: GameState, targetPos: Vec2): void {
  for (const uid of state.selected) {
    const unit = state.units.get(uid);
    if (!unit || unit.state === 'dead') continue;
    unit.attackTargetId = null;
    unit.harvestTargetId = null;
    unit.holdPosition = false;
    unit.waypoints = computePathWaypoints(state.islands, unit.pos, targetPos);
    unit.target = unit.waypoints.length > 0 ? unit.waypoints.shift()! : { ...targetPos };
    unit.state = 'moving';
  }
}

export function commandAttack(state: GameState, targetId: string): void {
  for (const uid of state.selected) {
    const unit = state.units.get(uid);
    if (!unit || unit.state === 'dead') continue;
    unit.attackTargetId = targetId;
    unit.harvestTargetId = null;
  }
}

export function commandHarvest(state: GameState, resourceId: string): void {
  for (const uid of state.selected) {
    const unit = state.units.get(uid);
    if (!unit || unit.state === 'dead' || unit.role !== 'worker') continue;
    unit.harvestTargetId = resourceId;
    unit.attackTargetId = null;
  }
}

export function commandBuild(state: GameState, type: BuildingType, pos: Vec2): boolean {
  const cfg = BUILDING_CONFIGS[type];
  const res = state.playerResources;

  // Check prerequisites
  if (cfg.requiredTier > state.techTier) return false;
  for (const prereq of cfg.prerequisites) {
    const hasPrereq = [...state.buildings.values()].some(
      b => b.faction === 'blue' && b.type === prereq && !b.underConstruction
    );
    if (!hasPrereq) return false;
  }

  // Check cost
  if (res.gold < cfg.cost.gold || res.wood < cfg.cost.wood) return false;

  res.gold -= cfg.cost.gold;
  res.wood -= cfg.cost.wood;

  const bld = makeBuilding('blue', type, pos, true);
  state.buildings.set(bld.id, bld);

  // Assign selected worker to build
  for (const uid of state.selected) {
    const unit = state.units.get(uid);
    if (unit && unit.role === 'worker' && unit.state !== 'dead') {
      unit.buildTargetId = bld.id;
      unit.target = { ...pos };
      unit.waypoints = computePathWaypoints(state.islands, unit.pos, pos);
      if (unit.waypoints.length > 0) unit.target = unit.waypoints.shift()!;
      unit.state = 'moving';
      break;
    }
  }
  return true;
}

export function commandTrain(state: GameState, buildingId: string, unitType: UnitType): boolean {
  const bld = state.buildings.get(buildingId);
  if (!bld || bld.underConstruction || bld.faction !== 'blue') return false;

  const cfg = UNIT_CONFIGS[unitType];
  if (!cfg) return false;

  const res = state.playerResources;
  if (res.gold < cfg.trainCost.gold || res.wood < cfg.trainCost.wood) return false;
  if (res.food + cfg.foodCost > res.maxFood) return false;

  res.gold -= cfg.trainCost.gold;
  res.wood -= cfg.trainCost.wood;
  bld.trainingQueue.push(unitType);
  return true;
}

export function commandSummonHero(state: GameState, heroType: UnitType): boolean {
  const heroCfg = HERO_CONFIGS.find(h => h.type === heroType);
  if (!heroCfg) return false;

  // Check if altar exists
  const altar = [...state.buildings.values()].find(
    b => b.faction === 'blue' && b.type === 'altar' && !b.underConstruction
  );
  if (!altar) return false;

  // Check if this hero already alive
  const existing = [...state.units.values()].find(
    u => u.faction === 'blue' && u.type === heroType && u.state !== 'dead'
  );
  if (existing) return false;

  // Max 3 heroes
  const heroCount = [...state.units.values()].filter(
    u => u.faction === 'blue' && u.isHero && u.state !== 'dead'
  ).length;
  if (heroCount >= 3) return false;

  const pos = { x: altar.pos.x + 60, y: altar.pos.y + 60 };
  spawnUnit(state, 'blue', heroType, pos, true);
  return true;
}

export function commandStop(state: GameState): void {
  for (const uid of state.selected) {
    const unit = state.units.get(uid);
    if (!unit || unit.state === 'dead') continue;
    unit.attackTargetId = null;
    unit.harvestTargetId = null;
    unit.returnToId = null;
    unit.buildTargetId = null;
    unit.target = null;
    unit.waypoints = [];
    unit.state = 'idle';
    unit.anim.action = 'idle';
  }
}

export function commandHold(state: GameState): void {
  for (const uid of state.selected) {
    const unit = state.units.get(uid);
    if (!unit || unit.state === 'dead') continue;
    unit.holdPosition = true;
    unit.target = null;
    unit.waypoints = [];
    unit.state = 'idle';
    unit.anim.action = 'idle';
  }
}

export function commandAttackMove(state: GameState, targetPos: Vec2): void {
  for (const uid of state.selected) {
    const unit = state.units.get(uid);
    if (!unit || unit.state === 'dead') continue;
    unit.holdPosition = false;
    unit.harvestTargetId = null;
    unit.waypoints = computePathWaypoints(state.islands, unit.pos, targetPos);
    unit.target = unit.waypoints.length > 0 ? unit.waypoints.shift()! : { ...targetPos };
    unit.state = 'moving';
    // Units will auto-aggro enemies they encounter on the way
  }
}

export function commandUpgradeTownHall(state: GameState): boolean {
  const th = [...state.buildings.values()].find(
    b => b.faction === 'blue' && (b.type === 'castle' || b.type === 'keep') && !b.underConstruction
  );
  if (!th) return false;

  const nextType: BuildingType = th.type === 'castle' ? 'keep' : 'fortress';
  const cfg = BUILDING_CONFIGS[nextType];
  const res = state.playerResources;
  if (res.gold < cfg.cost.gold || res.wood < cfg.cost.wood) return false;

  res.gold -= cfg.cost.gold;
  res.wood -= cfg.cost.wood;
  th.type = nextType;
  th.maxHp = cfg.hp;
  th.hp = cfg.hp;
  th.techTier = cfg.techTier as TechTier;
  state.techTier = th.techTier;
  return true;
}

// ── Hero Abilities ─────────────────────────────────────────────────────────────

export function commandRankUpAbility(
  state: GameState,
  heroId: string,
  abilityIdx: number,
): boolean {
  const hero = state.units.get(heroId);
  if (!hero || !hero.isHero || hero.abilityPoints <= 0) return false;
  const aState = hero.abilities[abilityIdx];
  if (!aState) return false;
  const def = ABILITY_DEFS[aState.abilityId];
  if (!def) return false;
  if (aState.rank >= def.maxRank) return false;
  if (hero.heroLevel < def.levelRequired) return false;
  if (def.isUltimate && hero.heroLevel < 6) return false;

  hero.abilityPoints--;
  aState.rank++;
  state.floatingTexts.push({
    id: uid(), pos: { ...hero.pos },
    text: `${def.name} Rank ${aState.rank}!`, color: '#ffd700', age: 0, maxAge: 2,
  });
  return true;
}

export function commandCastAbility(
  state: GameState,
  heroId: string,
  abilityIdx: number,
  targetPos?: Vec2,
  targetUnitId?: string,
): boolean {
  const hero = state.units.get(heroId);
  if (!hero || !hero.isHero || hero.state === 'dead' || hero.stunTimer > 0) return false;
  const aState = hero.abilities[abilityIdx];
  if (!aState || aState.rank === 0) return false;
  const def = ABILITY_DEFS[aState.abilityId];
  if (!def) return false;
  // Passives can't be manually cast
  if (def.cooldown === 0 && def.manaCost === 0) return false;
  if (aState.cooldownRemaining > 0) return false;
  if (hero.mana < def.manaCost) return false;

  hero.mana -= def.manaCost;
  aState.cooldownRemaining = def.cooldown;
  const rank = Math.max(1, aState.rank);
  const effect = def.effectPerRank[rank - 1] ?? def.effectPerRank[0] ?? 0;

  // ── Helpers ────────────────────────────────────────────────────────────────
  function ft(pos: Vec2, text: string, color: string, maxAge = 1.5): void {
    state.floatingTexts.push({ id: uid(), pos: { ...pos }, text, color, age: 0, maxAge });
  }
  function vfxAt(pos: Vec2, type: string, duration = 0.5): void {
    const vid = uid();
    state.vfxEffects.set(vid, { id: vid, pos: { ...pos }, type, age: 0, duration });
  }
  function gfxAt(pos: Vec2, radius: number, dotDmg: number, duration: number, vfxType: string): void {
    const gid = uid();
    state.groundEffects.set(gid, { id: gid, pos: { ...pos }, radius, vfxType, age: 0, duration, dotDamage: dotDmg, dotInterval: 0.5, dotTimer: 0, casterFaction: hero.faction });
  }
  function aoeEnemies(center: Vec2, radius: number): Unit[] {
    const out: Unit[] = [];
    for (const [, u] of state.units) {
      if (u.faction === hero.faction || u.state === 'dead') continue;
      if (dist(u.pos, center) <= radius) out.push(u);
    }
    return out;
  }
  function getEnemy(): Unit | null {
    if (!targetUnitId) return null;
    const t = state.units.get(targetUnitId);
    return (t && t.state !== 'dead' && t.faction !== hero.faction) ? t : null;
  }
  function getFriend(): Unit | null {
    if (!targetUnitId) return null;
    const t = state.units.get(targetUnitId);
    return (t && t.state !== 'dead' && t.faction === hero.faction) ? t : null;
  }
  function fireProjectile(from: Vec2, to: Vec2, targetId: string, dmg: number): void {
    const dx = to.x - from.x, dy = to.y - from.y;
    const d = Math.hypot(dx, dy) || 1;
    const pid = uid();
    state.projectiles.set(pid, { id: pid, pos: { ...from }, vel: { x: dx / d * 420, y: dy / d * 420 }, targetId, damage: dmg, faction: hero.faction, projectileStyle: 'arrow' });
  }

  // ── Ability effects ────────────────────────────────────────────────────────
  switch (aState.abilityId) {

    // ─── Arthax (Warrior) ─────────────────────────────────────────────────
    case 'storm_bolt': {
      const t = getEnemy();
      if (t) {
        const dmg = Math.max(1, effect - t.armor * 2);
        t.hp -= dmg; t.stunTimer = Math.max(t.stunTimer, 2);
        ft(t.pos, `⚡${Math.round(dmg)}`, '#ffff00');
        vfxAt(t.pos, 'hit', 0.4);
        if (t.hp <= 0) killUnit(state, t, hero);
      }
      break;
    }
    case 'war_stomp': {
      for (const t of aoeEnemies(hero.pos, 130)) {
        const dmg = Math.max(1, Math.round(effect * 0.6) - t.armor);
        t.hp -= dmg; t.stunTimer = Math.max(t.stunTimer, 1.5);
        ft(t.pos, `💥${Math.round(dmg)}`, '#ff8800');
        if (t.hp <= 0) killUnit(state, t, hero);
      }
      vfxAt(hero.pos, 'groundSlam', 0.8);
      ft(hero.pos, '💥 WAR STOMP!', '#ff5500', 2);
      break;
    }
    case 'avatar': {
      hero.maxHp += effect; hero.hp = Math.min(hero.hp + effect, hero.maxHp);
      ft(hero.pos, `🗡️ AVATAR! +${effect}HP`, '#ffd700', 2.5);
      vfxAt(hero.pos, 'level_up', 1.0);
      break;
    }

    // ─── Kanji (Mage) ─────────────────────────────────────────────────────
    case 'arcane_blast': {
      const t = getEnemy();
      if (t) {
        t.hp -= effect;
        ft(t.pos, `✨${Math.round(effect)}`, '#aa88ff');
        vfxAt(t.pos, 'hit', 0.4);
        if (t.hp <= 0) killUnit(state, t, hero);
      }
      break;
    }
    case 'blizzard': {
      const pos = targetPos ?? hero.pos;
      gfxAt(pos, 110, Math.round(effect * 0.25), 4, 'blizzard');
      for (const t of aoeEnemies(pos, 110)) t.slowTimer = Math.max(t.slowTimer, 3);
      ft(pos, '❄️ BLIZZARD!', '#88aaff', 2);
      vfxAt(pos, 'groundSlam', 0.8);
      break;
    }
    case 'mass_teleport': {
      const pos = targetPos ?? hero.pos;
      for (const uid_ of state.selected) {
        const u = state.units.get(uid_);
        if (!u || u.state === 'dead') continue;
        u.pos = { x: pos.x + (Math.random() - 0.5) * 60, y: pos.y + (Math.random() - 0.5) * 60 };
        u.target = null; u.waypoints = [];
      }
      ft(hero.pos, '🌀 MASS TELEPORT!', '#aa88ff', 2);
      vfxAt(pos, 'level_up', 0.8);
      break;
    }

    // ─── Katan (Ranger) ───────────────────────────────────────────────────
    case 'multishot': {
      let count = 0;
      for (const [, u] of state.units) {
        if (u.faction === hero.faction || u.state === 'dead') continue;
        if (dist(u.pos, hero.pos) > 350) continue;
        fireProjectile(hero.pos, u.pos, u.id, effect);
        if (++count >= rank + 2) break;
      }
      ft(hero.pos, '🏹 MULTISHOT!', '#88ff88', 1.5);
      break;
    }
    case 'shadow_strike': {
      const t = getEnemy();
      if (t) {
        const dmg = Math.max(1, Math.round(effect * 0.4) - t.armor);
        t.hp -= dmg; t.slowTimer = Math.max(t.slowTimer, 4);
        gfxAt(t.pos, 25, Math.round(effect * 0.15), 4, 'poison');
        ft(t.pos, `🗡️${Math.round(dmg)} + poison`, '#aa5500');
        if (t.hp <= 0) killUnit(state, t, hero);
      }
      break;
    }
    case 'rain_of_arrows': {
      const pos = targetPos ?? hero.pos;
      for (const t of aoeEnemies(pos, 150)) {
        const dmg = Math.max(1, Math.round(effect * 0.4) - t.armor);
        t.hp -= dmg;
        ft(t.pos, `🌧️${Math.round(dmg)}`, '#88ff00');
        if (t.hp <= 0) killUnit(state, t, hero);
      }
      ft(pos, '🌧️ RAIN OF ARROWS!', '#88ff00', 2);
      vfxAt(pos, 'groundSlam', 1.0);
      break;
    }

    // ─── Grum (Tank) ──────────────────────────────────────────────────────
    case 'thunder_clap': {
      for (const t of aoeEnemies(hero.pos, 130)) {
        const dmg = Math.max(1, Math.round(effect * 0.7) - t.armor);
        t.hp -= dmg; t.slowTimer = Math.max(t.slowTimer, 2.5);
        ft(t.pos, `⚡${Math.round(dmg)}`, '#ffff00');
        if (t.hp <= 0) killUnit(state, t, hero);
      }
      ft(hero.pos, '⚡ THUNDER CLAP!', '#ffff00', 2);
      vfxAt(hero.pos, 'groundSlam', 0.8);
      break;
    }

    // ─── Gangblanc (Assassin) ─────────────────────────────────────────────
    case 'backstab': {
      const t = getEnemy();
      if (t) {
        const dx = hero.pos.x - t.pos.x, dy = hero.pos.y - t.pos.y;
        const d = Math.hypot(dx, dy) || 1;
        hero.pos = { x: t.pos.x + dx / d * 30, y: t.pos.y + dy / d * 30 };
        t.hp -= effect;
        ft(t.pos, `🔪${Math.round(effect)}`, '#ff3355');
        vfxAt(t.pos, 'hit', 0.4);
        if (t.hp <= 0) killUnit(state, t, hero);
      }
      break;
    }
    case 'smoke_bomb': {
      const pos = targetPos ?? hero.pos;
      for (const [, u] of state.units) {
        if (u.faction !== hero.faction || u.state === 'dead') continue;
        if (dist(u.pos, pos) <= 100) u.aoeTimer = Math.max(u.aoeTimer, effect);
      }
      ft(pos, '💨 SMOKE BOMB!', '#aaaaaa', 2);
      break;
    }
    case 'death_mark': {
      const t = getEnemy();
      if (t) {
        gfxAt(t.pos, 30, Math.round(effect / 6), 3, 'death_mark');
        ft(t.pos, '💀 DEATH MARK!', '#ff0000', 2);
      }
      break;
    }

    // ─── Okomo (Monk) ─────────────────────────────────────────────────────
    case 'spirit_punch': {
      const t = getEnemy();
      if (t) {
        const dmg = Math.max(1, effect - t.armor);
        t.hp -= dmg;
        ft(t.pos, `👊${Math.round(dmg)}`, '#ff8800');
        vfxAt(t.pos, 'hit', 0.4);
        if (t.hp <= 0) killUnit(state, t, hero);
      }
      break;
    }
    case 'inner_fire': {
      const t = getFriend() ?? hero;
      t.armor += effect;
      t.healTimer = Math.max(t.healTimer, 8);
      ft(t.pos, `🔥+${effect} armor`, '#ff8800', 2);
      vfxAt(t.pos, 'holy_heal', 0.6);
      break;
    }
    case 'windwalk': {
      hero.healTimer = Math.max(hero.healTimer, 5);
      hero.aoeTimer = Math.max(hero.aoeTimer, effect / 100 + 3);
      ft(hero.pos, '🌬️ WINDWALK!', '#88ffff', 2);
      vfxAt(hero.pos, 'level_up', 0.6);
      break;
    }
    case 'fury_of_spirits': {
      for (const t of aoeEnemies(hero.pos, 160)) {
        const dmg = Math.max(1, Math.round(effect * 0.5) - t.armor);
        t.hp -= dmg;
        ft(t.pos, `👻${Math.round(dmg)}`, '#aa88ff');
        if (t.hp <= 0) killUnit(state, t, hero);
      }
      ft(hero.pos, '👻 FURY OF SPIRITS!', '#aa88ff', 2);
      vfxAt(hero.pos, 'groundSlam', 1.0);
      break;
    }

    // ─── Zhinja (Ninja) ───────────────────────────────────────────────────
    case 'shuriken_toss': {
      const t = getEnemy();
      if (t) {
        const hitSet = new Set([hero.id, t.id]);
        let prev: Unit = hero, cur: Unit = t;
        for (let bounce = 0; bounce <= rank; bounce++) {
          const dmg = Math.max(1, Math.round(effect * (1 - bounce * 0.2)));
          fireProjectile(prev.pos, cur.pos, cur.id, dmg);
          let next: Unit | null = null, minD = 200;
          for (const [, u] of state.units) {
            if (u.faction === hero.faction || u.state === 'dead' || hitSet.has(u.id)) continue;
            const d2 = dist(u.pos, cur.pos);
            if (d2 < minD) { minD = d2; next = u; }
          }
          if (!next) break;
          hitSet.add(next.id); prev = cur; cur = next;
        }
        ft(t.pos, '🌀 SHURIKEN!', '#00ffff', 1.5);
      }
      break;
    }
    case 'shadow_step': {
      const pos = targetPos ?? hero.pos;
      hero.pos = { ...pos };
      hero.target = null; hero.waypoints = [];
      ft(pos, '👤 SHADOW STEP', '#8888ff', 1.5);
      vfxAt(pos, 'level_up', 0.4);
      break;
    }
    case 'wind_slash': {
      const pos = targetPos ?? { x: hero.pos.x + 200, y: hero.pos.y };
      const dx = pos.x - hero.pos.x, dy = pos.y - hero.pos.y;
      const lineLen = Math.hypot(dx, dy) || 1;
      const dir = { x: dx / lineLen, y: dy / lineLen };
      for (const [, u] of state.units) {
        if (u.faction === hero.faction || u.state === 'dead') continue;
        const ax = u.pos.x - hero.pos.x, ay = u.pos.y - hero.pos.y;
        const t = Math.max(0, Math.min(lineLen, ax * dir.x + ay * dir.y));
        if (Math.hypot(hero.pos.x + dir.x * t - u.pos.x, hero.pos.y + dir.y * t - u.pos.y) > 60) continue;
        const dmg = Math.max(1, effect - u.armor);
        u.hp -= dmg;
        ft(u.pos, `💨${Math.round(dmg)}`, '#88ffff');
        if (u.hp <= 0) killUnit(state, u, hero);
      }
      ft(pos, '💨 WIND SLASH!', '#88ffff', 1.5);
      break;
    }
    case 'shadow_clone': {
      for (const t of aoeEnemies(hero.pos, 180)) {
        const dmg = Math.max(1, 60 - t.armor);
        t.hp -= dmg;
        if (t.hp <= 0) killUnit(state, t, hero);
      }
      hero.hp = Math.min(hero.hp + 100, hero.maxHp);
      ft(hero.pos, '🥷 SHADOW CLONE!', '#8888ff', 2);
      vfxAt(hero.pos, 'level_up', 0.8);
      break;
    }

    // ─── Borg (Berserker) ─────────────────────────────────────────────────
    case 'raging_charge': {
      const t = getEnemy();
      if (t) {
        const dx = t.pos.x - hero.pos.x, dy = t.pos.y - hero.pos.y;
        const d = Math.hypot(dx, dy) || 1;
        hero.pos = { x: t.pos.x - dx / d * 35, y: t.pos.y - dy / d * 35 };
        const dmg = Math.max(1, effect - t.armor);
        t.hp -= dmg; t.stunTimer = Math.max(t.stunTimer, 1.5);
        ft(t.pos, `🐂${Math.round(dmg)}`, '#ff4400');
        vfxAt(t.pos, 'hit', 0.4);
        if (t.hp <= 0) killUnit(state, t, hero);
      }
      break;
    }
    case 'battle_roar': {
      for (const [, u] of state.units) {
        if (u.faction !== hero.faction || u.state === 'dead') continue;
        if (dist(u.pos, hero.pos) > 160) continue;
        u.healTimer = Math.max(u.healTimer, 8);
        ft(u.pos, `🦁+${effect}%`, '#ff8800', 1.5);
      }
      ft(hero.pos, '🦁 BATTLE ROAR!', '#ff8800', 2);
      vfxAt(hero.pos, 'groundSlam', 0.6);
      break;
    }
    case 'apocalypse': {
      for (const t of aoeEnemies(hero.pos, 200)) {
        const dmg = Math.max(1, Math.round(effect) - t.armor * 2);
        t.hp -= dmg;
        ft(t.pos, `☠️${Math.round(dmg)}`, '#ff0000');
        if (t.hp <= 0) killUnit(state, t, hero);
      }
      ft(hero.pos, '☠️ APOCALYPSE!', '#ff0000', 2.5);
      vfxAt(hero.pos, 'groundSlam', 1.2);
      break;
    }
  }

  state.lastEventPos = { ...hero.pos };
  return true;
}
