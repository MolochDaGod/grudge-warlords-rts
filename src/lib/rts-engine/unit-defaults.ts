/**
 * Unit & Building display defaults — THE SINGLE SOURCE OF TRUTH.
 *
 * Every unit/building has a display config controlling shadow, scale, hit FX,
 * projectile type, and facing direction. The game renderer reads these via
 * `getUnitDisplay()` / `getBuildingDisplay()`.
 *
 * Admin page can override any value and save to localStorage via `saveDisplayOverrides()`.
 * Saved overrides take priority over coded defaults.
 */

import type { VfxType } from './vfx';

// ── Display config interfaces ──────────────────────────────────────────────────

export interface UnitDisplayConfig {
  shadow: number;           // Shadow offset in px (0 = no shadow)
  scale: number;            // Display scale multiplier (1.0 = default)
  hitFx: VfxType;           // VFX on hit
  projectile: ProjectileStyle; // Projectile visual style
  facingMode: 'movement' | 'target'; // Direction determination
  deathFx: VfxType | null;  // VFX on death (null = default poof)
}

export interface BuildingDisplayConfig {
  shadow: number;
  scale: number;
  activeFx: VfxType | null;    // FX when building is actively training/researching
  damageFx50: VfxType;         // FX below 50% HP
  damageFx25: VfxType;         // FX below 25% HP
  constructionFx: VfxType | null;
}

export type ProjectileStyle = 'arrow' | 'bolt' | 'holy' | 'energy' | 'fire' | 'water' | 'thunder' | 'shadow' | 'none';

// ── Default projectile per unit role ────────────────────────────────────────────

const ROLE_PROJECTILE: Record<string, ProjectileStyle> = {
  worker: 'none', melee: 'none', ranged: 'arrow', caster: 'energy', siege: 'bolt', hero: 'none',
};

// ── Coded unit defaults (best-practice balanced starting point) ──────────────

const UNIT_DISPLAY_DEFAULTS: Record<string, Partial<UnitDisplayConfig>> = {
  // ── Workers ────────────────────────────────────────────────────────────────
  pawn:       { shadow: 2, scale: 1.0, hitFx: 'retro_blue_b',   projectile: 'none',   facingMode: 'movement' },
  orcPawn:    { shadow: 2, scale: 1.0, hitFx: 'retro_green_b',  projectile: 'none',   facingMode: 'movement' },
  farmer:     { shadow: 2, scale: 0.9, hitFx: 'retro_blue_b',   projectile: 'none',   facingMode: 'movement' },

  // ── Melee ──────────────────────────────────────────────────────────────────
  swordsman:  { shadow: 3, scale: 1.0, hitFx: 'retro_red_b',    projectile: 'none',   facingMode: 'target' },
  spearman:   { shadow: 3, scale: 1.0, hitFx: 'retro_blue_a',   projectile: 'none',   facingMode: 'target' },
  axeman:     { shadow: 3, scale: 1.1, hitFx: 'retro_orange_b', projectile: 'none',   facingMode: 'target' },
  knight:     { shadow: 4, scale: 1.2, hitFx: 'retro_red_a',    projectile: 'none',   facingMode: 'target' },
  assasin:    { shadow: 2, scale: 1.0, hitFx: 'retro_magenta_a',projectile: 'none',   facingMode: 'target' },
  orcWarrior: { shadow: 4, scale: 1.2, hitFx: 'retro_green_a',  projectile: 'none',   facingMode: 'target' },
  orcSpearman:{ shadow: 3, scale: 1.1, hitFx: 'retro_green_b',  projectile: 'none',   facingMode: 'target' },

  // ── Ranged ─────────────────────────────────────────────────────────────────
  bowman:     { shadow: 2, scale: 1.0, hitFx: 'bullet_green',   projectile: 'arrow',  facingMode: 'target' },
  musketeer:  { shadow: 3, scale: 1.0, hitFx: 'bullet_green',   projectile: 'bolt',   facingMode: 'target' },
  orcArcher:  { shadow: 2, scale: 1.0, hitFx: 'bullet_purple',  projectile: 'arrow',  facingMode: 'target' },

  // ── Casters ────────────────────────────────────────────────────────────────
  mage:       { shadow: 2, scale: 1.0, hitFx: 'energy_hit',     projectile: 'energy', facingMode: 'target' },
  orcHealer:  { shadow: 2, scale: 1.0, hitFx: 'holy_heal',      projectile: 'holy',   facingMode: 'target' },
  necromancer:{ shadow: 3, scale: 1.0, hitFx: 'thunder_hit',    projectile: 'shadow', facingMode: 'target' },
  orcMage:    { shadow: 2, scale: 1.0, hitFx: 'firebolt_hit',   projectile: 'fire',   facingMode: 'target' },

  // ── Siege ──────────────────────────────────────────────────────────────────
  ballista:   { shadow: 4, scale: 1.3, hitFx: 'thunder_hit2',   projectile: 'bolt',   facingMode: 'target' },

  // ── Heroes ─────────────────────────────────────────────────────────────────
  warrior:    { shadow: 4, scale: 1.2, hitFx: 'retro_red_a',    projectile: 'none',   facingMode: 'target' },
  archer:     { shadow: 3, scale: 1.1, hitFx: 'bullet_green',   projectile: 'arrow',  facingMode: 'target' },
  lancer:     { shadow: 4, scale: 1.2, hitFx: 'retro_orange_a', projectile: 'none',   facingMode: 'target' },
  priest:     { shadow: 3, scale: 1.1, hitFx: 'holy_heal',      projectile: 'holy',   facingMode: 'target' },
  arthax:     { shadow: 5, scale: 1.3, hitFx: 'slash_red',      projectile: 'none',   facingMode: 'target', deathFx: 'fire_explosion_2' },
  kanji:      { shadow: 4, scale: 1.2, hitFx: 'energy_hit',     projectile: 'energy', facingMode: 'target', deathFx: 'fire_explosion_2' },
  katan:      { shadow: 4, scale: 1.2, hitFx: 'slash_purple',   projectile: 'arrow',  facingMode: 'target', deathFx: 'fire_explosion_2' },
  grum:       { shadow: 5, scale: 1.3, hitFx: 'thunder_hit',    projectile: 'none',   facingMode: 'target', deathFx: 'fire_explosion_2' },
  gangblanc:  { shadow: 3, scale: 1.2, hitFx: 'retro_magenta_a',projectile: 'none',   facingMode: 'target', deathFx: 'fire_explosion_2' },
  okomo:      { shadow: 4, scale: 1.2, hitFx: 'hit_effect_1',   projectile: 'none',   facingMode: 'target', deathFx: 'fire_explosion_2' },
  zhinja:     { shadow: 3, scale: 1.1, hitFx: 'slash_red',      projectile: 'shadow', facingMode: 'target', deathFx: 'fire_explosion_2' },
  borg:       { shadow: 5, scale: 1.4, hitFx: 'retro_red_b',    projectile: 'none',   facingMode: 'target', deathFx: 'fire_explosion_2' },

  // ── Champions / Elite ──────────────────────────────────────────────────────
  minotaur:   { shadow: 5, scale: 1.4, hitFx: 'retro_orange_b', projectile: 'none',   facingMode: 'target' },
  demon:      { shadow: 4, scale: 1.2, hitFx: 'fire_hit',       projectile: 'fire',   facingMode: 'target' },
  mammoth:    { shadow: 6, scale: 1.5, hitFx: 'water_hit',      projectile: 'none',   facingMode: 'target' },
  dragon:     { shadow: 6, scale: 1.6, hitFx: 'fire_hit',       projectile: 'fire',   facingMode: 'target' },

  // ── Creeps / Monsters ──────────────────────────────────────────────────────
  goblin:     { shadow: 2, scale: 0.9, hitFx: 'retro_green_a',  projectile: 'none',   facingMode: 'target' },
  spearGoblin:{ shadow: 2, scale: 0.9, hitFx: 'retro_green_b',  projectile: 'none',   facingMode: 'target' },
  archerGoblin:{ shadow: 2, scale: 0.9, hitFx: 'bullet_green',  projectile: 'arrow',  facingMode: 'target' },
  orc:        { shadow: 3, scale: 1.1, hitFx: 'retro_green_a',  projectile: 'none',   facingMode: 'target' },
  skeleton:   { shadow: 2, scale: 1.0, hitFx: 'retro_magenta_b',projectile: 'none',   facingMode: 'target' },
  slime:      { shadow: 1, scale: 0.8, hitFx: 'water_hit',      projectile: 'none',   facingMode: 'movement' },
  yeti:       { shadow: 4, scale: 1.3, hitFx: 'water_hit',      projectile: 'none',   facingMode: 'target' },
  fireElemental:{ shadow: 3, scale: 1.2, hitFx: 'fire_hit',     projectile: 'fire',   facingMode: 'target' },
  desertScorpio:{ shadow: 3, scale: 1.1, hitFx: 'retro_orange_a',projectile: 'none',  facingMode: 'target' },
  ogreBoss:   { shadow: 6, scale: 1.6, hitFx: 'fire_explosion_2',projectile: 'none',  facingMode: 'target' },
  steampunkMech:{ shadow: 6, scale: 1.5, hitFx: 'thunder_hit2', projectile: 'bolt',   facingMode: 'target' },
  desertVulture:{ shadow: 2, scale: 0.9, hitFx: 'bullet_green', projectile: 'arrow',  facingMode: 'target' },
  mimic:      { shadow: 2, scale: 1.0, hitFx: 'retro_yellow_a', projectile: 'none',   facingMode: 'target' },
  mineElemental:{ shadow: 3, scale: 1.1, hitFx: 'retro_blue_a', projectile: 'none',   facingMode: 'target' },
  pirateCaptainHero:{ shadow: 4, scale: 1.2, hitFx: 'bullet_green',projectile:'bolt', facingMode: 'target' },
  orcShaman:  { shadow: 3, scale: 1.0, hitFx: 'energy_hit',     projectile: 'energy', facingMode: 'target' },
  pirate:     { shadow: 2, scale: 1.0, hitFx: 'retro_blue_b',   projectile: 'none',   facingMode: 'target' },
  pirateGunner:{ shadow: 3, scale: 1.0, hitFx: 'bullet_green',  projectile: 'bolt',   facingMode: 'target' },
  pirateCaptain:{ shadow: 4, scale: 1.2, hitFx: 'slash_red',    projectile: 'none',   facingMode: 'target' },
  wendigo:    { shadow: 4, scale: 1.3, hitFx: 'water_hit',      projectile: 'none',   facingMode: 'target' },
  kamikazeGoblin:{ shadow: 2, scale: 0.9, hitFx: 'fire_explosion_2',projectile:'none',facingMode: 'target' },
  farmerGoblin:{ shadow: 2, scale: 0.8, hitFx: 'retro_green_b', projectile: 'none',   facingMode: 'movement' },
  slimeBlue:  { shadow: 1, scale: 0.8, hitFx: 'water_hit',      projectile: 'none',   facingMode: 'movement' },
  megaSlime:  { shadow: 3, scale: 1.4, hitFx: 'water_hit',      projectile: 'none',   facingMode: 'movement' },
  megaSlimeBlue:{ shadow: 3, scale: 1.4, hitFx: 'water_hit',    projectile: 'none',   facingMode: 'movement' },
  kingSlime:  { shadow: 5, scale: 1.6, hitFx: 'water_hit',      projectile: 'water',  facingMode: 'movement' },
  kingSlimeGreen:{ shadow: 5, scale: 1.6, hitFx: 'water_hit',   projectile: 'water',  facingMode: 'movement' },
  blackDragon:{ shadow: 6, scale: 1.6, hitFx: 'fire_hit',       projectile: 'fire',   facingMode: 'target' },
  blueDragon: { shadow: 6, scale: 1.6, hitFx: 'water_hit',      projectile: 'water',  facingMode: 'target' },
  whiteDragon:{ shadow: 6, scale: 1.6, hitFx: 'water_hit',      projectile: 'water',  facingMode: 'target' },
  yellowDragon:{ shadow: 6, scale: 1.6, hitFx: 'thunder_hit',   projectile: 'thunder',facingMode: 'target' },
  giantCrab:  { shadow: 4, scale: 1.3, hitFx: 'water_hit',      projectile: 'none',   facingMode: 'target' },
  armouredDemon:{ shadow: 4, scale: 1.3, hitFx: 'fire_hit',     projectile: 'fire',   facingMode: 'target' },
  purpleDemon:{ shadow: 4, scale: 1.2, hitFx: 'energy_hit',     projectile: 'shadow', facingMode: 'target' },

  // ── Animals ────────────────────────────────────────────────────────────────
  sheep:      { shadow: 1, scale: 0.7, hitFx: 'retro_white_a',  projectile: 'none',   facingMode: 'movement' },
  hornedSheep:{ shadow: 1, scale: 0.8, hitFx: 'retro_white_b',  projectile: 'none',   facingMode: 'movement' },
  chicken:    { shadow: 0, scale: 0.5, hitFx: 'retro_yellow_a', projectile: 'none',   facingMode: 'movement' },
  chick:      { shadow: 0, scale: 0.4, hitFx: 'retro_yellow_b', projectile: 'none',   facingMode: 'movement' },
  horse:      { shadow: 3, scale: 1.2, hitFx: 'retro_orange_a', projectile: 'none',   facingMode: 'movement' },
  boar:       { shadow: 2, scale: 1.0, hitFx: 'retro_orange_b', projectile: 'none',   facingMode: 'target' },
  pig:        { shadow: 1, scale: 0.7, hitFx: 'retro_white_a',  projectile: 'none',   facingMode: 'movement' },
};

const BUILDING_DISPLAY_DEFAULTS: Record<string, Partial<BuildingDisplayConfig>> = {
  castle:     { shadow: 6, scale: 1.0, activeFx: null,       damageFx50: 'building_fire', damageFx25: 'building_smoke' },
  keep:       { shadow: 6, scale: 1.0, activeFx: null,       damageFx50: 'building_fire', damageFx25: 'building_smoke' },
  fortress:   { shadow: 6, scale: 1.0, activeFx: 'firespin', damageFx50: 'building_fire', damageFx25: 'building_smoke' },
  barracks:   { shadow: 4, scale: 1.0, activeFx: null,       damageFx50: 'building_fire', damageFx25: 'building_smoke' },
  archery:    { shadow: 4, scale: 1.0, activeFx: null,       damageFx50: 'building_fire', damageFx25: 'building_smoke' },
  chapel:     { shadow: 4, scale: 1.0, activeFx: 'vortex',   damageFx50: 'building_fire', damageFx25: 'building_smoke' },
  workshop:   { shadow: 3, scale: 1.0, activeFx: null,       damageFx50: 'building_fire', damageFx25: 'building_smoke' },
  sanctum:    { shadow: 5, scale: 1.0, activeFx: 'vortex',   damageFx50: 'building_fire', damageFx25: 'building_smoke' },
  tower:      { shadow: 4, scale: 1.0, activeFx: null,       damageFx50: 'building_fire', damageFx25: 'building_smoke' },
  house:      { shadow: 2, scale: 1.0, activeFx: null,       damageFx50: 'building_fire', damageFx25: 'building_smoke' },
  market:     { shadow: 3, scale: 1.0, activeFx: null,       damageFx50: 'building_fire', damageFx25: 'building_smoke' },
  tavern:     { shadow: 3, scale: 1.0, activeFx: null,       damageFx50: 'building_fire', damageFx25: 'building_smoke' },
  docks:      { shadow: 3, scale: 1.0, activeFx: null,       damageFx50: 'building_fire', damageFx25: 'building_smoke' },
  blacksmith: { shadow: 3, scale: 1.0, activeFx: 'firespin', damageFx50: 'building_fire', damageFx25: 'building_smoke' },
  altar:      { shadow: 5, scale: 1.0, activeFx: 'vortex',   damageFx50: 'building_fire', damageFx25: 'building_smoke' },
  goldmine:   { shadow: 2, scale: 1.0, activeFx: null,       damageFx50: 'building_fire', damageFx25: 'building_smoke' },
};

// ── Fallback defaults ──────────────────────────────────────────────────────────

const DEFAULT_UNIT: UnitDisplayConfig = {
  shadow: 2, scale: 1.0, hitFx: 'retro_white_a', projectile: 'none',
  facingMode: 'target', deathFx: null,
};

const DEFAULT_BUILDING: BuildingDisplayConfig = {
  shadow: 3, scale: 1.0, activeFx: null, damageFx50: 'building_fire',
  damageFx25: 'building_smoke', constructionFx: null,
};

// ── localStorage persistence ────────────────────────────────────────────────────

const STORAGE_KEY_UNITS = 'grudge_admin_unit_display';
const STORAGE_KEY_BUILDINGS = 'grudge_admin_building_display';

function loadOverrides<T>(key: string): Record<string, Partial<T>> {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveOverrides<T>(key: string, data: Record<string, Partial<T>>): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ── Public API ──────────────────────────────────────────────────────────────────

/** Get resolved display config for a unit. Admin overrides > coded defaults > fallback. */
export function getUnitDisplay(type: string): UnitDisplayConfig {
  const overrides = loadOverrides<UnitDisplayConfig>(STORAGE_KEY_UNITS);
  const coded = UNIT_DISPLAY_DEFAULTS[type] ?? {};
  const saved = overrides[type] ?? {};
  return { ...DEFAULT_UNIT, ...coded, ...saved };
}

/** Get resolved display config for a building. */
export function getBuildingDisplay(type: string): BuildingDisplayConfig {
  const overrides = loadOverrides<BuildingDisplayConfig>(STORAGE_KEY_BUILDINGS);
  const coded = BUILDING_DISPLAY_DEFAULTS[type] ?? {};
  const saved = overrides[type] ?? {};
  return { ...DEFAULT_BUILDING, ...coded, ...saved };
}

/** Save admin unit display overrides to localStorage. */
export function saveUnitDisplayOverrides(data: Record<string, Partial<UnitDisplayConfig>>): void {
  saveOverrides(STORAGE_KEY_UNITS, data);
}

/** Save admin building display overrides to localStorage. */
export function saveBuildingDisplayOverrides(data: Record<string, Partial<BuildingDisplayConfig>>): void {
  saveOverrides(STORAGE_KEY_BUILDINGS, data);
}

/** Get all coded unit defaults (for admin UI initial state). */
export function getAllUnitDefaults(): Record<string, Partial<UnitDisplayConfig>> {
  return { ...UNIT_DISPLAY_DEFAULTS };
}

/** Get all coded building defaults. */
export function getAllBuildingDefaults(): Record<string, Partial<BuildingDisplayConfig>> {
  return { ...BUILDING_DISPLAY_DEFAULTS };
}

/** Get all current overrides (for admin display). */
export function getUnitOverrides(): Record<string, Partial<UnitDisplayConfig>> {
  return loadOverrides<UnitDisplayConfig>(STORAGE_KEY_UNITS);
}

export function getBuildingOverrides(): Record<string, Partial<BuildingDisplayConfig>> {
  return loadOverrides<BuildingDisplayConfig>(STORAGE_KEY_BUILDINGS);
}

/** Save the current coded defaults as the "default save" — writes all defaults to localStorage. */
export function saveDefaultsAsOverrides(): void {
  saveOverrides(STORAGE_KEY_UNITS, UNIT_DISPLAY_DEFAULTS);
  saveOverrides(STORAGE_KEY_BUILDINGS, BUILDING_DISPLAY_DEFAULTS);
}

/** Reset all overrides back to coded defaults. */
export function resetOverrides(): void {
  localStorage.removeItem(STORAGE_KEY_UNITS);
  localStorage.removeItem(STORAGE_KEY_BUILDINGS);
}
