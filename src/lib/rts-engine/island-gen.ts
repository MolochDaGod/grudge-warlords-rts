/**
 * Island Generation — Procedural Unique Islands from Seeds
 *
 * Each island is generated deterministically from a single seed number.
 * The seed drives a PRNG that produces:
 *   - Biome (which Tiny Swords terrain color variant)
 *   - Coastline shape (noise-based organic outline)
 *   - Elevation map (cliff placement)
 *   - Decoration placement (trees, rocks, bushes)
 *   - Feature locations (ruins, watchtowers, docks)
 *   - Resource deposits
 *
 * Two identical seeds always produce the exact same island.
 * This makes islands suitable for cNFTs — the seed IS the NFT.
 */

import {
  createTilemap, setTile, regenerateTilemap,
  LAYER_FLAT, LAYER_ELEV_1, LAYER_ELEV_2,
  TS_TILE, type TilemapData,
} from './tilemap';
import { TILESETS } from './tilemap';
import type { Vec2, UnitType } from './types';
import type { IslandFeature } from './island-system';

// ══════════════════════════════════════════════════════════════════════════════
// Seeded PRNG (Mulberry32 — fast, deterministic, 32-bit)
// ══════════════════════════════════════════════════════════════════════════════

export class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed | 0;
  }

  /** Returns 0..1 */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6D2B79F5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns min..max (inclusive) */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Returns integer min..max (inclusive) */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** Pick random element from array */
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  /** Returns true with given probability (0-1) */
  chance(prob: number): boolean {
    return this.next() < prob;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Simplex-like 2D noise (value noise with smooth interpolation)
// ══════════════════════════════════════════════════════════════════════════════

function hashNoise(x: number, y: number, seed: number): number {
  let h = seed + x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h & 0x7fffffff) / 0x7fffffff;
}

function smoothNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  // Smoothstep
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const n00 = hashNoise(ix, iy, seed);
  const n10 = hashNoise(ix + 1, iy, seed);
  const n01 = hashNoise(ix, iy + 1, seed);
  const n11 = hashNoise(ix + 1, iy + 1, seed);
  return n00 * (1 - sx) * (1 - sy) + n10 * sx * (1 - sy) + n01 * (1 - sx) * sy + n11 * sx * sy;
}

/** Multi-octave noise (fbm) for natural-looking terrain */
function fbmNoise(x: number, y: number, seed: number, octaves = 4): number {
  let value = 0, amplitude = 1, frequency = 1, maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    value += smoothNoise(x * frequency, y * frequency, seed + i * 1000) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / maxValue;
}

// ══════════════════════════════════════════════════════════════════════════════
// Biomes — maps to Tiny Swords terrain color variants
// ══════════════════════════════════════════════════════════════════════════════

export type IslandBiome = 'grassland' | 'autumn' | 'desert' | 'snow' | 'volcanic';

export const BIOME_TILESETS: Record<IslandBiome, string> = {
  grassland: TILESETS.terrain1,  // Green — Tilemap_color1.png
  autumn:    TILESETS.terrain2,  // Orange/brown — Tilemap_color2.png
  desert:    TILESETS.terrain3,  // Sandy — Tilemap_color3.png
  snow:      TILESETS.terrain4,  // White/blue — Tilemap_color4.png
  volcanic:  TILESETS.terrain5,  // Dark/red — Tilemap_color5.png
};

const ALL_BIOMES: IslandBiome[] = ['grassland', 'autumn', 'desert', 'snow', 'volcanic'];

// ══════════════════════════════════════════════════════════════════════════════
// Island DNA — everything needed to recreate an island from its seed
// ══════════════════════════════════════════════════════════════════════════════

export type IslandRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface IslandDNA {
  /** The seed that generates this island (the NFT identity) */
  seed: number;
  /** Generated name */
  name: string;
  /** Biome determines tileset color */
  biome: IslandBiome;
  /** Rarity tier based on features + resources */
  rarity: IslandRarity;
  /** Grid dimensions */
  gridW: number;
  gridH: number;
  /** Coastline mask (true = land, false = water) */
  coastline: boolean[];
  /** Elevation mask (true = elevated, for tiles inside coastline) */
  elevation: boolean[];
  /** Second elevation tier */
  elevation2: boolean[];
  /** Decoration placements */
  decorations: IslandDecoration[];
  /** Feature placements */
  features: IslandFeatureGen[];
  /** Resource deposits */
  resources: IslandResourceGen[];
  /** Total resource value (used for rarity) */
  resourceValue: number;
  /** Dock positions */
  docks: Vec2[];
}

export interface IslandDecoration {
  type: 'tree1' | 'tree2' | 'tree3' | 'tree4' | 'bush1' | 'bush2' | 'rock1' | 'rock2' | 'rock3' | 'sheep';
  gridX: number;
  gridY: number;
}

export interface IslandFeatureGen {
  type: IslandFeature['type'];
  gridX: number;
  gridY: number;
}

export interface IslandResourceGen {
  type: 'goldmine' | 'tree' | 'fish_node' | 'rare_ore';
  gridX: number;
  gridY: number;
  amount: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// Name generation
// ══════════════════════════════════════════════════════════════════════════════

const NAME_PREFIXES = [
  'Storm', 'Shadow', 'Iron', 'Crystal', 'Ember', 'Frost', 'Thunder', 'Golden',
  'Crimson', 'Silver', 'Dragon', 'Serpent', 'Whale', 'Coral', 'Skull', 'Ancient',
  'Lost', 'Cursed', 'Sacred', 'Forgotten', 'Sunken', 'Wild', 'Bone', 'Grudge',
  'Blood', 'Ghost', 'Pirate', 'Kraken', 'Titan', 'Raven', 'Wolf', 'Scorched',
];

const NAME_SUFFIXES = [
  'Isle', 'Atoll', 'Reef', 'Cove', 'Haven', 'Rock', 'Peak', 'Shore',
  'Point', 'Bay', 'Hollow', 'Reach', 'Watch', 'Bastion', 'Cairn', 'Throne',
  'Harbor', 'Anchor', 'Strand', 'Depths', 'Spire', 'Sanctum', 'Keep', 'Fang',
];

function generateIslandName(rng: SeededRNG): string {
  return `${rng.pick(NAME_PREFIXES)} ${rng.pick(NAME_SUFFIXES)}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// Island Generation Pipeline
// ══════════════════════════════════════════════════════════════════════════════

export interface IslandGenConfig {
  /** Grid size (tiles). Larger = bigger island. 8-20 typical. */
  minSize?: number;
  maxSize?: number;
  /** Noise frequency for coastline (higher = more jagged) */
  coastlineFrequency?: number;
  /** Threshold for land (0-1, lower = more land) */
  coastlineThreshold?: number;
  /** Chance of elevation per land tile (0-1) */
  elevationChance?: number;
  /** Max decorations to scatter */
  maxDecorations?: number;
}

const DEFAULT_CONFIG: Required<IslandGenConfig> = {
  minSize: 10,
  maxSize: 18,
  coastlineFrequency: 0.25,
  coastlineThreshold: 0.38,
  elevationChance: 0.35,
  maxDecorations: 30,
};

/**
 * Generate a complete island from a seed number.
 * Deterministic — same seed always produces the same island.
 */
export function generateIsland(seed: number, config: IslandGenConfig = {}): IslandDNA {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const rng = new SeededRNG(seed);

  // ── Dimensions ──────────────────────────────────────────────────────────
  const gridW = rng.int(cfg.minSize, cfg.maxSize);
  const gridH = rng.int(cfg.minSize, cfg.maxSize);

  // ── Biome ───────────────────────────────────────────────────────────────
  const biome = rng.pick(ALL_BIOMES);

  // ── Name ────────────────────────────────────────────────────────────────
  const name = generateIslandName(rng);

  // ── Coastline (noise-based organic shape) ───────────────────────────────
  const coastline: boolean[] = new Array(gridW * gridH).fill(false);
  const cx = gridW / 2, cy = gridH / 2;
  const maxR = Math.min(gridW, gridH) / 2 - 0.5;

  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      // Distance from center (normalized 0-1)
      const dx = (x - cx) / maxR;
      const dy = (y - cy) / maxR;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Noise-modulated radius
      const noise = fbmNoise(x * cfg.coastlineFrequency, y * cfg.coastlineFrequency, seed, 4);
      const threshold = cfg.coastlineThreshold + noise * 0.35;

      // Land if within noisy radius
      coastline[y * gridW + x] = dist < (1.0 - threshold + 0.1);
    }
  }

  // Ensure center is always land
  const centerTiles = [
    { x: Math.floor(cx), y: Math.floor(cy) },
    { x: Math.floor(cx) + 1, y: Math.floor(cy) },
    { x: Math.floor(cx), y: Math.floor(cy) + 1 },
    { x: Math.floor(cx) + 1, y: Math.floor(cy) + 1 },
  ];
  for (const t of centerTiles) {
    if (t.x >= 0 && t.x < gridW && t.y >= 0 && t.y < gridH) {
      coastline[t.y * gridW + t.x] = true;
    }
  }

  // ── Elevation (inner areas become elevated) ─────────────────────────────
  const elevation: boolean[] = new Array(gridW * gridH).fill(false);
  const elevation2: boolean[] = new Array(gridW * gridH).fill(false);

  for (let y = 1; y < gridH - 1; y++) {
    for (let x = 1; x < gridW - 1; x++) {
      if (!coastline[y * gridW + x]) continue;
      // Check if all 4-neighbors are also land (interior tile)
      const allNeighborsLand =
        coastline[(y - 1) * gridW + x] &&
        coastline[(y + 1) * gridW + x] &&
        coastline[y * gridW + (x - 1)] &&
        coastline[y * gridW + (x + 1)];
      if (allNeighborsLand && rng.chance(cfg.elevationChance)) {
        elevation[y * gridW + x] = true;
      }
    }
  }

  // Second tier: inner elevated tiles
  for (let y = 2; y < gridH - 2; y++) {
    for (let x = 2; x < gridW - 2; x++) {
      if (!elevation[y * gridW + x]) continue;
      const allElevNeighbors =
        elevation[(y - 1) * gridW + x] &&
        elevation[(y + 1) * gridW + x] &&
        elevation[y * gridW + (x - 1)] &&
        elevation[y * gridW + (x + 1)];
      if (allElevNeighbors && rng.chance(0.3)) {
        elevation2[y * gridW + x] = true;
      }
    }
  }

  // ── Decorations ─────────────────────────────────────────────────────────
  const DECO_TYPES_BY_BIOME: Record<IslandBiome, IslandDecoration['type'][]> = {
    grassland: ['tree1', 'tree2', 'bush1', 'bush2', 'rock1', 'sheep'],
    autumn:    ['tree3', 'tree4', 'bush1', 'rock1', 'rock2'],
    desert:    ['rock1', 'rock2', 'rock3', 'bush1'],
    snow:      ['tree1', 'tree2', 'rock1', 'rock2', 'rock3'],
    volcanic:  ['rock1', 'rock2', 'rock3'],
  };

  const decorations: IslandDecoration[] = [];
  const decoTypes = DECO_TYPES_BY_BIOME[biome];
  let decoAttempts = 0;
  while (decorations.length < cfg.maxDecorations && decoAttempts < cfg.maxDecorations * 3) {
    decoAttempts++;
    const gx = rng.int(0, gridW - 1);
    const gy = rng.int(0, gridH - 1);
    if (!coastline[gy * gridW + gx]) continue;
    // Don't place on elevation
    if (elevation[gy * gridW + gx]) continue;
    // Don't overlap existing decorations
    if (decorations.some(d => d.gridX === gx && d.gridY === gy)) continue;
    decorations.push({ type: rng.pick(decoTypes), gridX: gx, gridY: gy });
  }

  // ── Resources ───────────────────────────────────────────────────────────
  const resources: IslandResourceGen[] = [];
  // 1-3 gold mines
  const goldCount = rng.int(1, 3);
  for (let i = 0; i < goldCount; i++) {
    const pos = findOpenLandTile(rng, coastline, elevation, gridW, gridH, decorations, resources);
    if (pos) resources.push({ type: 'goldmine', gridX: pos.x, gridY: pos.y, amount: rng.int(5000, 20000) });
  }
  // 2-5 tree groves
  const treeCount = rng.int(2, 5);
  for (let i = 0; i < treeCount; i++) {
    const pos = findOpenLandTile(rng, coastline, elevation, gridW, gridH, decorations, resources);
    if (pos) resources.push({ type: 'tree', gridX: pos.x, gridY: pos.y, amount: rng.int(200, 800) });
  }
  // Rare: fish nodes on coast tiles
  if (rng.chance(0.4)) {
    const pos = findCoastTile(rng, coastline, gridW, gridH);
    if (pos) resources.push({ type: 'fish_node', gridX: pos.x, gridY: pos.y, amount: rng.int(3000, 8000) });
  }
  // Very rare: rare ore on elevated tiles
  if (rng.chance(0.15)) {
    const pos = findElevatedTile(rng, elevation, gridW, gridH);
    if (pos) resources.push({ type: 'rare_ore', gridX: pos.x, gridY: pos.y, amount: rng.int(2000, 10000) });
  }

  // ── Features ────────────────────────────────────────────────────────────
  const features: IslandFeatureGen[] = [];
  // Always has a capture flag at center
  features.push({ type: 'capture_flag', gridX: Math.floor(cx), gridY: Math.floor(cy) });
  // 30% watchtower on elevated tile
  if (rng.chance(0.3)) {
    const pos = findElevatedTile(rng, elevation, gridW, gridH);
    if (pos) features.push({ type: 'watchtower', gridX: pos.x, gridY: pos.y });
  }
  // 20% ancient ruin
  if (rng.chance(0.2)) {
    const pos = findOpenLandTile(rng, coastline, elevation, gridW, gridH, decorations, resources);
    if (pos) features.push({ type: 'ancient_ruin', gridX: pos.x, gridY: pos.y });
  }
  // 15% cannon fort on coast
  if (rng.chance(0.15)) {
    const pos = findCoastTile(rng, coastline, gridW, gridH);
    if (pos) features.push({ type: 'cannon_fort', gridX: pos.x, gridY: pos.y });
  }
  // 10% pirate shop (only volcanic/autumn)
  if ((biome === 'volcanic' || biome === 'autumn') && rng.chance(0.1)) {
    const pos = findOpenLandTile(rng, coastline, elevation, gridW, gridH, decorations, resources);
    if (pos) features.push({ type: 'pirate_shop', gridX: pos.x, gridY: pos.y });
  }

  // ── Docks (on coast tiles adjacent to water) ────────────────────────────
  const docks: Vec2[] = [];
  const dockCount = rng.int(1, 3);
  for (let i = 0; i < dockCount; i++) {
    const pos = findCoastTile(rng, coastline, gridW, gridH);
    if (pos && !docks.some(d => d.x === pos.x && d.y === pos.y)) {
      docks.push(pos);
    }
  }

  // ── Resource value & rarity ─────────────────────────────────────────────
  const resourceValue = resources.reduce((sum, r) => sum + r.amount, 0);
  const featureScore = features.length * 5000;
  const totalScore = resourceValue + featureScore;

  let rarity: IslandRarity = 'common';
  if (totalScore > 60000) rarity = 'legendary';
  else if (totalScore > 40000) rarity = 'epic';
  else if (totalScore > 25000) rarity = 'rare';
  else if (totalScore > 15000) rarity = 'uncommon';

  return {
    seed, name, biome, rarity,
    gridW, gridH,
    coastline, elevation, elevation2,
    decorations, features, resources,
    resourceValue, docks,
  };
}

// ── Tile finder helpers ─────────────────────────────────────────────────────────

function findOpenLandTile(
  rng: SeededRNG, coastline: boolean[], elevation: boolean[],
  w: number, h: number,
  decorations: IslandDecoration[], resources: IslandResourceGen[],
): Vec2 | null {
  for (let attempts = 0; attempts < 50; attempts++) {
    const x = rng.int(1, w - 2), y = rng.int(1, h - 2);
    if (!coastline[y * w + x]) continue;
    if (elevation[y * w + x]) continue;
    if (decorations.some(d => d.gridX === x && d.gridY === y)) continue;
    if (resources.some(r => r.gridX === x && r.gridY === y)) continue;
    return { x, y };
  }
  return null;
}

function findCoastTile(rng: SeededRNG, coastline: boolean[], w: number, h: number): Vec2 | null {
  for (let attempts = 0; attempts < 50; attempts++) {
    const x = rng.int(0, w - 1), y = rng.int(0, h - 1);
    if (!coastline[y * w + x]) continue;
    // Must have at least one water neighbor
    const hasWaterNeighbor =
      (x > 0 && !coastline[y * w + (x - 1)]) ||
      (x < w - 1 && !coastline[y * w + (x + 1)]) ||
      (y > 0 && !coastline[(y - 1) * w + x]) ||
      (y < h - 1 && !coastline[(y + 1) * w + x]);
    if (hasWaterNeighbor) return { x, y };
  }
  return null;
}

function findElevatedTile(rng: SeededRNG, elevation: boolean[], w: number, h: number): Vec2 | null {
  for (let attempts = 0; attempts < 50; attempts++) {
    const x = rng.int(1, w - 2), y = rng.int(1, h - 2);
    if (elevation[y * w + x]) return { x, y };
  }
  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// Convert IslandDNA → TilemapData (for the game renderer)
// ══════════════════════════════════════════════════════════════════════════════

export function islandDNAToTilemap(dna: IslandDNA): TilemapData {
  const map = createTilemap(dna.gridW, dna.gridH);

  for (let y = 0; y < dna.gridH; y++) {
    for (let x = 0; x < dna.gridW; x++) {
      const idx = y * dna.gridW + x;
      if (dna.coastline[idx]) {
        setTile(map, LAYER_FLAT, x, y, 1);
      }
      if (dna.elevation[idx]) {
        setTile(map, LAYER_ELEV_1, x, y, 1);
      }
      if (dna.elevation2[idx]) {
        setTile(map, LAYER_ELEV_2, x, y, 1);
      }
    }
  }

  regenerateTilemap(map);
  return map;
}

// ══════════════════════════════════════════════════════════════════════════════
// cNFT Metadata (Metaplex-compatible JSON structure)
// ══════════════════════════════════════════════════════════════════════════════

export interface IslandNFTMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;           // URL to rendered preview image
  external_url: string;    // Link to grudgewarlords.com island viewer
  attributes: {
    trait_type: string;
    value: string | number;
  }[];
  properties: {
    files: { uri: string; type: string }[];
    category: string;
    creators: { address: string; share: number }[];
  };
}

export function generateNFTMetadata(
  dna: IslandDNA,
  imageUrl: string,
  creatorAddress: string,
): IslandNFTMetadata {
  const landTiles = dna.coastline.filter(Boolean).length;
  const elevatedTiles = dna.elevation.filter(Boolean).length;

  return {
    name: dna.name,
    symbol: 'GISLE',
    description: `${dna.name} — A ${dna.rarity} ${dna.biome} island in the Grudge Warlords archipelago. ${landTiles} land tiles, ${dna.resources.length} resource deposits, ${dna.features.length} special features.`,
    image: imageUrl,
    external_url: `https://grudgewarlords.com/island/${dna.seed}`,
    attributes: [
      { trait_type: 'Seed', value: dna.seed },
      { trait_type: 'Biome', value: dna.biome },
      { trait_type: 'Rarity', value: dna.rarity },
      { trait_type: 'Size', value: `${dna.gridW}x${dna.gridH}` },
      { trait_type: 'Land Tiles', value: landTiles },
      { trait_type: 'Elevated Tiles', value: elevatedTiles },
      { trait_type: 'Resources', value: dna.resources.length },
      { trait_type: 'Resource Value', value: dna.resourceValue },
      { trait_type: 'Features', value: dna.features.length },
      { trait_type: 'Docks', value: dna.docks.length },
      { trait_type: 'Decorations', value: dna.decorations.length },
      { trait_type: 'Gold Mines', value: dna.resources.filter(r => r.type === 'goldmine').length },
      { trait_type: 'Has Rare Ore', value: dna.resources.some(r => r.type === 'rare_ore') ? 'Yes' : 'No' },
      { trait_type: 'Has Watchtower', value: dna.features.some(f => f.type === 'watchtower') ? 'Yes' : 'No' },
      { trait_type: 'Has Cannon Fort', value: dna.features.some(f => f.type === 'cannon_fort') ? 'Yes' : 'No' },
      { trait_type: 'Has Pirate Shop', value: dna.features.some(f => f.type === 'pirate_shop') ? 'Yes' : 'No' },
    ],
    properties: {
      files: [{ uri: imageUrl, type: 'image/png' }],
      category: 'image',
      creators: [{ address: creatorAddress, share: 100 }],
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// Batch generation (for creating a collection)
// ══════════════════════════════════════════════════════════════════════════════

export function generateIslandCollection(count: number, startSeed = 1): IslandDNA[] {
  const islands: IslandDNA[] = [];
  for (let i = 0; i < count; i++) {
    islands.push(generateIsland(startSeed + i));
  }
  return islands;
}

/** Get rarity distribution for a collection */
export function getRarityDistribution(islands: IslandDNA[]): Record<IslandRarity, number> {
  const dist: Record<IslandRarity, number> = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
  for (const isl of islands) dist[isl.rarity]++;
  return dist;
}
