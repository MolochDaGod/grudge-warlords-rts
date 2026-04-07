/**
 * Tiny Swords Tilemap System — 9-Layer Terrain Engine
 *
 * Based on the Tiny Swords tilemap guide by PixelFrog:
 *   Layer 0: BG Color (deep water)
 *   Layer 1: Water Foam (128×128 on 64×64 grid, animated)
 *   Layer 2: Flat Ground (16-tile auto-tiling)
 *   Layer 3: Shadow (128×128 on 64×64 grid)
 *   Layer 4: Elevated Ground T1 (24-tile auto-tiling with cliff face)
 *   Layer 5: Shadow T1
 *   Layer 6: Elevated Ground T2
 *   Layer 7: Shadow T2
 *   Layer 8: Elevated Ground T3
 *
 * Auto-tiling uses 4-bit edge bitmask → tile index lookup.
 * Flat ground: 16 tiles (4×4 grid in tileset)
 * Elevated ground: 24 tiles (4×6 grid — adds cliff face rows 17-24)
 */

// ── Tile size constants ─────────────────────────────────────────────────────────
// Tiny Swords Free Pack uses 192×192 tiles (not 64×64)
export const TS_TILE = 64;             // Game-grid tile size (display)
export const TS_SPRITE_TILE = 192;     // Actual spritesheet tile size in source PNG
export const TS_SHADOW_SIZE = 192;     // Shadow.png is 192×192 single sprite
export const TS_FOAM_SIZE = 192;       // Water Foam.png frames are 192×192 (16 frames in 3072×192 strip)

// ── Layer indices ───────────────────────────────────────────────────────────────
export const LAYER_BG = 0;
export const LAYER_FOAM = 1;
export const LAYER_FLAT = 2;
export const LAYER_SHADOW_0 = 3;
export const LAYER_ELEV_1 = 4;
export const LAYER_SHADOW_1 = 5;
export const LAYER_ELEV_2 = 6;
export const LAYER_SHADOW_2 = 7;
export const LAYER_ELEV_3 = 8;
export const LAYER_COUNT = 9;

// ── Tile values ─────────────────────────────────────────────────────────────────
// 0 = empty/water, 1-16 = flat ground tiles, 1-24 = elevated tiles
// Shadow: 0 = none, 1 = shadow present

export type TileValue = number; // 0-24

// ── Tileset paths — local public/ assets from Tiny Swords Free Pack ─────────────
// These are served by Vite from public/sprites/tiny-swords/
export const TILESETS = {
  /** 576×384 (3×2 grid of 192×192 tiles) — contains flat ground + elevated cliff tiles */
  terrain1: '/sprites/tiny-swords/terrain/Tilemap_color1.png',
  terrain2: '/sprites/tiny-swords/terrain/Tilemap_color2.png',
  terrain3: '/sprites/tiny-swords/terrain/Tilemap_color3.png',
  terrain4: '/sprites/tiny-swords/terrain/Tilemap_color4.png',
  terrain5: '/sprites/tiny-swords/terrain/Tilemap_color5.png',
  /** Aliases used by renderer — same PNG contains both flat and elevated sections */
  flatGround: '/sprites/tiny-swords/terrain/Tilemap_color1.png',
  elevatedGround: '/sprites/tiny-swords/terrain/Tilemap_color1.png',
  /** 3072×192 (16 frames of 192×192 animated foam) */
  waterFoam: '/sprites/tiny-swords/terrain/Water Foam.png',
  /** 192×192 single shadow sprite */
  shadow: '/sprites/tiny-swords/terrain/Shadow.png',
  /** Water background solid color reference */
  waterBg: '/sprites/tiny-swords/terrain/Water Background color.png',
};

// ── Tilemap data structure ──────────────────────────────────────────────────────
export interface TilemapData {
  width: number;   // Grid width in tiles
  height: number;  // Grid height in tiles
  layers: Uint8Array[]; // LAYER_COUNT layers, each width*height
}

export function createTilemap(width: number, height: number): TilemapData {
  const layers: Uint8Array[] = [];
  for (let i = 0; i < LAYER_COUNT; i++) {
    layers.push(new Uint8Array(width * height));
  }
  return { width, height, layers };
}

export function getTile(map: TilemapData, layer: number, x: number, y: number): TileValue {
  if (x < 0 || x >= map.width || y < 0 || y >= map.height) return 0;
  return map.layers[layer][y * map.width + x];
}

export function setTile(map: TilemapData, layer: number, x: number, y: number, value: TileValue): void {
  if (x < 0 || x >= map.width || y < 0 || y >= map.height) return;
  map.layers[layer][y * map.width + x] = value;
}

// ── Auto-tiling bitmask ─────────────────────────────────────────────────────────
/**
 * 4-bit edge bitmask (N=1, E=2, S=4, W=8):
 *   Check if neighbor tile is solid in same layer.
 *   Map bitmask → tile index (1-16 for flat, 1-24 for elevated).
 *
 * Flat Ground Tileset Layout (4 columns × 4 rows):
 *   1  2  3  13     (top-left corner, top edge, top-right corner, peninsula-top)
 *   4  5  6  14     (left edge, center, right edge, peninsula-right)
 *   7  8  9  15     (bottom-left corner, bottom edge, bottom-right corner, peninsula-bottom)
 *  10 11 12  16     (peninsula-BL, peninsula-B, peninsula-BR, island/single)
 *
 * Elevated Ground adds rows 5-6 for cliff faces:
 *  17 18 19  20     (cliff top-left, cliff top, cliff top-right, cliff single)
 *  21 22 23  24     (cliff bottom-left, cliff bottom, cliff bottom-right, cliff overhang)
 */

// Edge bitmask: N=bit0, E=bit1, S=bit2, W=bit3
function getEdgeMask(map: TilemapData, layer: number, x: number, y: number): number {
  let mask = 0;
  if (getTile(map, layer, x, y - 1) > 0) mask |= 1;  // North
  if (getTile(map, layer, x + 1, y) > 0) mask |= 2;  // East
  if (getTile(map, layer, x, y + 1) > 0) mask |= 4;  // South
  if (getTile(map, layer, x - 1, y) > 0) mask |= 8;  // West
  return mask;
}

/**
 * Map 4-bit edge bitmask (NESW) to flat ground tile index (1-16).
 *
 * Corrected mapping: think of it as "which edges are covered"
 * If N+S are covered, we're in the middle vertically. If E+W covered, middle horizontally.
 * The tile position in the tileset grid:
 *   Row 0 (top): tiles with NO north neighbor (top row of island)
 *   Row 2 (bottom): tiles with NO south neighbor (bottom row)
 *   Col 0 (left): tiles with NO west neighbor
 *   Col 2 (right): tiles with NO east neighbor
 */
const FLAT_TILE_MAP: Record<number, number> = {
  0b0000: 16, // Isolated single tile
  0b0001: 11, // Only N → peninsula pointing down
  0b0010: 13, // Only E → peninsula pointing left
  0b0100: 15, // Only S → peninsula pointing up
  0b1000: 14, // Only W → peninsula pointing right
  0b0011:  7, // N+E → bottom-left corner
  0b0101:  5, // N+S → vertical corridor (center)
  0b1001:  9, // N+W → bottom-right corner
  0b0110:  1, // E+S → top-left corner
  0b1010:  5, // E+W → horizontal corridor (center)
  0b1100:  3, // S+W → top-right corner
  0b0111:  4, // N+E+S → left edge
  0b1011:  8, // N+E+W → bottom edge
  0b1101:  6, // N+S+W → right edge
  0b1110:  2, // E+S+W → top edge
  0b1111:  5, // All → center
};

/**
 * For elevated ground, same as flat for tiles 1-16, plus cliff face tiles 17-24.
 * Cliff face appears on the SOUTH side of elevated ground (visible when looking down).
 * Tiles 17-20: cliff top row, 21-24: cliff bottom row.
 */
function getElevatedTileIndex(mask: number, hasSouthCliff: boolean): number {
  if (!hasSouthCliff) return FLAT_TILE_MAP[mask] ?? 5;
  // If this tile has a cliff face below it, use cliff variants
  const base = FLAT_TILE_MAP[mask] ?? 5;
  // Cliff tiles map: regular tile + 12 for cliff variant (rows 5-6)
  if (base >= 7 && base <= 9) return base + 10;   // 17-19 cliff top
  if (base >= 10 && base <= 12) return base + 11;  // 21-23 cliff bottom
  return base; // Non-cliff edge tiles stay the same
}

// ── Auto-tile a single cell ─────────────────────────────────────────────────────
export function autoTileCell(map: TilemapData, layer: number, x: number, y: number): void {
  const current = getTile(map, layer, x, y);
  if (current === 0) return; // Empty, nothing to auto-tile

  const mask = getEdgeMask(map, layer, x, y);

  if (layer === LAYER_FLAT) {
    setTile(map, layer, x, y, FLAT_TILE_MAP[mask] ?? 5);
  } else if (layer === LAYER_ELEV_1 || layer === LAYER_ELEV_2 || layer === LAYER_ELEV_3) {
    // Check if tile below (south) is empty → cliff face
    const hasSouthCliff = getTile(map, layer, x, y + 1) === 0;
    setTile(map, layer, x, y, getElevatedTileIndex(mask, hasSouthCliff));
  }
}

// ── Auto-tile entire layer ──────────────────────────────────────────────────────
export function autoTileLayer(map: TilemapData, layer: number): void {
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      autoTileCell(map, layer, x, y);
    }
  }
}

// ── Auto-generate shadows ───────────────────────────────────────────────────────
/**
 * Shadow is placed on tiles adjacent to (and below) elevated ground.
 * Shadow layer N corresponds to elevated layer N-1.
 */
export function generateShadows(map: TilemapData, elevLayer: number, shadowLayer: number): void {
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      // Shadow appears where there's NO elevated ground but elevated ground exists nearby (N, NE, NW)
      const isElevated = getTile(map, elevLayer, x, y) > 0;
      if (isElevated) {
        setTile(map, shadowLayer, x, y, 0); // No shadow on elevated ground itself
        continue;
      }
      const hasElevNorth = getTile(map, elevLayer, x, y - 1) > 0;
      const hasElevNW = getTile(map, elevLayer, x - 1, y - 1) > 0;
      const hasElevNE = getTile(map, elevLayer, x + 1, y - 1) > 0;
      const hasElevWest = getTile(map, elevLayer, x - 1, y) > 0;
      if (hasElevNorth || hasElevNW || hasElevNE || hasElevWest) {
        setTile(map, shadowLayer, x, y, 1);
      } else {
        setTile(map, shadowLayer, x, y, 0);
      }
    }
  }
}

// ── Auto-generate water foam ────────────────────────────────────────────────────
/**
 * Foam appears on water tiles adjacent to any ground tile.
 */
export function generateFoam(map: TilemapData): void {
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const isGround = getTile(map, LAYER_FLAT, x, y) > 0 ||
                        getTile(map, LAYER_ELEV_1, x, y) > 0;
      if (isGround) {
        setTile(map, LAYER_FOAM, x, y, 0); // No foam on ground
        continue;
      }
      // Check if any neighbor is ground
      let nearGround = false;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (getTile(map, LAYER_FLAT, x + dx, y + dy) > 0 ||
              getTile(map, LAYER_ELEV_1, x + dx, y + dy) > 0) {
            nearGround = true;
          }
        }
      }
      setTile(map, LAYER_FOAM, x, y, nearGround ? 1 : 0);
    }
  }
}

// ── Generate complete tilemap from painted ground ───────────────────────────────
export function regenerateTilemap(map: TilemapData): void {
  autoTileLayer(map, LAYER_FLAT);
  autoTileLayer(map, LAYER_ELEV_1);
  autoTileLayer(map, LAYER_ELEV_2);
  autoTileLayer(map, LAYER_ELEV_3);
  generateShadows(map, LAYER_ELEV_1, LAYER_SHADOW_0);
  generateShadows(map, LAYER_ELEV_2, LAYER_SHADOW_1);
  generateShadows(map, LAYER_ELEV_3, LAYER_SHADOW_2);
  generateFoam(map);
}

// ── Tileset source rect lookup ──────────────────────────────────────────────────
/**
 * Given a tile index (1-16 for flat, 1-24 for elevated), return the source
 * rectangle in the tileset spritesheet.
 *
 * Flat ground tileset: 4 columns × 4 rows, each cell is 64×64
 * Elevated tileset: 4 columns × 6 rows, each cell is 64×64
 */
export interface TileSourceRect {
  sx: number; sy: number; sw: number; sh: number;
}

/**
 * Tiny Swords Free Pack tileset layout (Tilemap_color1.png = 576×384):
 *
 * The 576×384 sheet contains a 3×2 grid of 192×192 tile sections:
 *   [0,0] Flat ground top-left     [1,0] Flat ground full    [2,0] Elevated top
 *   [0,1] Flat ground bottom-left  [1,1] Stairs/connecting   [2,1] Elevated bottom (cliff face)
 *
 * For auto-tiling, we use sections of the tileset to draw ground and elevation.
 * Each 192×192 section is drawn scaled down to TS_TILE (64px) in-game.
 */
const T = TS_SPRITE_TILE; // 192

export function getFlatTileRect(tileIndex: number): TileSourceRect {
  // Map tile index to a source rect within the 576×384 tileset
  // Flat ground occupies the left 2 columns (384×384 area)
  // We subdivide each 192×192 section into a conceptual grid
  if (tileIndex < 1 || tileIndex > 16) return { sx: T, sy: 0, sw: T, sh: T }; // center fill fallback

  // Simplified mapping: just use the main 192×192 sections
  // Tile 5 (center) → full grass section [1,0]
  // Tiles 1-4 (top/corners) → top-left section [0,0]
  // Tiles 7-9 (bottom corners) → bottom-left section [0,1]
  // Tiles 13-16 (peninsulas) → stairs section [1,1]
  const sectionMap: Record<number, { col: number; row: number }> = {
    1: { col: 0, row: 0 }, 2: { col: 1, row: 0 }, 3: { col: 0, row: 0 },
    4: { col: 0, row: 0 }, 5: { col: 1, row: 0 }, 6: { col: 0, row: 0 },
    7: { col: 0, row: 1 }, 8: { col: 1, row: 0 }, 9: { col: 0, row: 1 },
   10: { col: 0, row: 1 }, 11: { col: 1, row: 1 }, 12: { col: 0, row: 1 },
   13: { col: 1, row: 1 }, 14: { col: 1, row: 1 }, 15: { col: 1, row: 1 },
   16: { col: 1, row: 1 },
  };
  const s = sectionMap[tileIndex] ?? { col: 1, row: 0 };
  return { sx: s.col * T, sy: s.row * T, sw: T, sh: T };
}

export function getElevatedTileRect(tileIndex: number): TileSourceRect {
  // Elevated tiles use the right column of the tileset
  // [2,0] = elevated grass top, [2,1] = cliff face bottom
  if (tileIndex < 1 || tileIndex > 26) return { sx: 2 * T, sy: 0, sw: T, sh: T };
  if (tileIndex >= 17) {
    // Cliff face tiles → bottom-right section [2,1]
    return { sx: 2 * T, sy: T, sw: T, sh: T };
  }
  // Regular elevated ground → top-right section [2,0]
  return { sx: 2 * T, sy: 0, sw: T, sh: T };
}

// ── Convert Island[] to tilemap ─────────────────────────────────────────────────
/**
 * Bridge: convert old-style Island[] definitions into a tilemap.
 * Each island becomes flat ground. If island is large enough, center gets elevated.
 */
import type { Island } from './types';

export function islandsToTilemap(islands: Island[], worldW: number, worldH: number): TilemapData {
  const w = Math.ceil(worldW / TS_TILE);
  const h = Math.ceil(worldH / TS_TILE);
  const map = createTilemap(w, h);

  for (const isl of islands) {
    const x0 = Math.floor(isl.x / TS_TILE);
    const y0 = Math.floor(isl.y / TS_TILE);
    const x1 = Math.ceil((isl.x + isl.w) / TS_TILE);
    const y1 = Math.ceil((isl.y + isl.h) / TS_TILE);

    // Paint flat ground
    for (let y = y0; y < y1 && y < h; y++) {
      for (let x = x0; x < x1 && x < w; x++) {
        setTile(map, LAYER_FLAT, x, y, 1); // Mark as ground (will be auto-tiled)
      }
    }

    // If island is large enough, add elevated center
    const islW = x1 - x0;
    const islH = y1 - y0;
    if (islW >= 6 && islH >= 6) {
      const margin = 2;
      for (let y = y0 + margin; y < y1 - margin && y < h; y++) {
        for (let x = x0 + margin; x < x1 - margin && x < w; x++) {
          setTile(map, LAYER_ELEV_1, x, y, 1);
        }
      }
    }
  }

  regenerateTilemap(map);
  return map;
}

// ── Stair types ─────────────────────────────────────────────────────────────────
export interface Stair {
  x: number;        // Grid x position
  y: number;        // Grid y position
  direction: 'left' | 'right';
  fromLayer: number; // Lower elevation layer
  toLayer: number;   // Higher elevation layer
}

/**
 * Place a stair connecting two elevation layers.
 * Stairs must be placed at the edge of elevated ground.
 */
export function placeStair(map: TilemapData, stair: Stair): boolean {
  const { x, y, toLayer } = stair;
  // Validate: stair position must be at the south edge of the elevated layer
  const isElevated = getTile(map, toLayer, x, y) > 0;
  const belowEmpty = getTile(map, toLayer, x, y + 1) === 0;
  if (!isElevated || !belowEmpty) return false;
  // Stair is valid — mark the cell (renderer will draw stair sprite)
  // Use a special tile value (25 for left stair, 26 for right stair)
  setTile(map, toLayer, x, y, stair.direction === 'left' ? 25 : 26);
  return true;
}

// ── Serialization ───────────────────────────────────────────────────────────────
export function serializeTilemap(map: TilemapData): string {
  const data = {
    width: map.width,
    height: map.height,
    layers: map.layers.map(l => Array.from(l)),
  };
  return JSON.stringify(data);
}

export function deserializeTilemap(json: string): TilemapData {
  const data = JSON.parse(json);
  return {
    width: data.width,
    height: data.height,
    layers: data.layers.map((l: number[]) => new Uint8Array(l)),
  };
}
