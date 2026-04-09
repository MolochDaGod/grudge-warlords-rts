import type { GameState, Unit, Building, Resource, Island, Projectile, VfxEffect } from './types';
import { UNIT_CONFIGS, BUILDING_CONFIGS, HERO_CONFIGS, ITEM_DEFS, getUnitSprites, getLegionSprites, getBuildingSprite, DAY_DURATION, CYCLE_LENGTH } from './constants';
import { VFX_CONFIGS } from './vfx';
import { getUnitDisplay, getBuildingDisplay } from './unit-defaults';
import { spriteLoader, PRIORITY } from './sprite-loader';
import {
  TILESETS, TS_TILE,
  LAYER_FLAT, LAYER_FOAM, LAYER_SHADOW_0, LAYER_SHADOW_1, LAYER_SHADOW_2,
  LAYER_ELEV_1, LAYER_ELEV_2, LAYER_ELEV_3,
  getTile, getFlatTileRect, getElevatedTileRect,
  type TilemapData,
} from './tilemap';

// ── Image loading via SpriteLoader (replaces raw cache) ────────────────────────
function loadImg(src: string, priority: number = PRIORITY.UNIT): HTMLImageElement | null {
  return spriteLoader.get(src, priority);
}

// ── Colors — Tiny Swords palette ────────────────────────────────────────────────
const FACTION_COLORS = { blue: '#3b82f6', red: '#ef4444', neutral: '#f59e0b' };
const WATER_DEEP   = '#3a9fbf';   // Tiny Swords teal
const WATER_MID    = '#4db8d1';
const WATER_LIGHT  = '#6bc8d9';
const GRASS_MAIN   = '#5a9e3e';   // Main grass
const GRASS_LIGHT  = '#6db84a';   // Grass highlight
const GRASS_DARK   = '#3d7a2a';   // Grass shadow
const CLIFF_TOP    = '#7a8b96';   // Stone cliff face
const CLIFF_MID    = '#5e6e78';
const CLIFF_BOTTOM = '#4a5860';
const CLIFF_SHADOW = 'rgba(0,0,0,0.2)';
const GOLD_MINE_COLOR = '#fbbf24';
const CDN = 'https://molochdagod.github.io/ObjectStore';

// ── Miniworld Terrain Tile CDN paths ────────────────────────────────────────────
const TERRAIN = {
  tree1: `${CDN}/sprites/miniworld/Decorations/Trees1.png`,       // pine trees
  tree2: `${CDN}/sprites/miniworld/Decorations/Trees2.png`,       // autumn/leafy trees
  bush: `${CDN}/sprites/miniworld/Decorations/Bushes.png`,
  rock: `${CDN}/sprites/miniworld/Decorations/Rocks.png`,
  flower: `${CDN}/sprites/miniworld/Decorations/Flowers.png`,
  fence: `${CDN}/sprites/miniworld/Decorations/WoodFence.png`,
  sheep: `${CDN}/sprites/miniworld/Animals/Sheep.png`,
};

// ── Sprite rendering helper ────────────────────────────────────────────────────
function drawSprite(
  ctx: CanvasRenderingContext2D, src: string,
  frameIdx: number, frameW: number, frameH: number,
  dx: number, dy: number, dw: number, dh: number, flipX = false,
) {
  const img = loadImg(src);
  if (!img) return;
  ctx.save();
  if (flipX) {
    ctx.translate(dx + dw, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(img, frameIdx * frameW, 0, frameW, frameH, 0, 0, dw, dh);
  } else {
    ctx.drawImage(img, frameIdx * frameW, 0, frameW, frameH, dx, dy, dw, dh);
  }
  ctx.restore();
}

// ── Main render function ───────────────────────────────────────────────────────
export function renderGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  canvasW: number, canvasH: number,
  dt: number,
) {
  const { camera, zoom } = state;

  // Night overlay alpha
  const nightAlpha = state.timeOfDay === 'night'
    ? 0.3 * Math.min(1, (state.dayNightCycle - DAY_DURATION) / 30)
    : 0;

  ctx.save();
  ctx.translate(-camera.x * zoom, -camera.y * zoom);
  ctx.scale(zoom, zoom);

  // ── Water background — Tiny Swords teal ──────────────────────────────────
  const sx = Math.floor(camera.x);
  const sy = Math.floor(camera.y);
  const ew = Math.ceil(canvasW / zoom) + 128;
  const eh = Math.ceil(canvasH / zoom) + 128;
  ctx.fillStyle = WATER_DEEP;
  ctx.fillRect(sx, sy, ew, eh);
  // Water wave highlights — subtle animated highlights
  const t = performance.now() / 1000;
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = WATER_LIGHT;
  for (let wx = sx - (sx % 96); wx < sx + ew; wx += 96) {
    for (let wy = sy - (sy % 96); wy < sy + eh; wy += 96) {
      const phase = Math.sin(t * 0.8 + wx * 0.01 + wy * 0.015);
      if (phase > 0.3) {
        ctx.beginPath();
        ctx.ellipse(wx + 48, wy + 48, 30 + phase * 10, 8 + phase * 4, phase * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;

  // ── Islands — Tiny Swords grass + cliff edges ─────────────────────────────
  // Use tilemap sprite renderer if tileset images are loaded; else procedural fallback
  const tilemapRendered = state.tilemap ? drawTilemapTerrain(ctx, state.tilemap) : false;
  if (!tilemapRendered) {
    for (const isl of state.islands) {
      drawTinySwordsIsland(ctx, isl, t);
    }
  }

  // ── Y-sorted rendering: resources, buildings, units ──────────────────────
  type Renderable = { y: number; draw: () => void };
  const renderables: Renderable[] = [];

  // Resources
  for (const [, res] of state.resources) {
    if (res.amount <= 0) continue;
    renderables.push({ y: res.pos.y, draw: () => drawResource(ctx, res) });
  }

  // Buildings
  for (const [, bld] of state.buildings) {
    renderables.push({ y: bld.pos.y + 64, draw: () => drawBuilding(ctx, bld) });
  }

  // Units
  for (const [, unit] of state.units) {
    if (unit.state === 'dead') continue;
    renderables.push({ y: unit.pos.y + 32, draw: () => drawUnit(ctx, unit, state) });
  }

  renderables.sort((a, b) => a.y - b.y);
  for (const r of renderables) r.draw();

  // ── Projectiles ──────────────────────────────────────────────────────────
  for (const [, proj] of state.projectiles) {
    drawProjectile(ctx, proj);
  }

  // ── VFX ──────────────────────────────────────────────────────────────────
  for (const [, vfx] of state.vfxEffects) {
    drawVfx(ctx, vfx);
  }

  // ── Floating texts ───────────────────────────────────────────────────────
  for (const ft of state.floatingTexts) {
    ctx.globalAlpha = Math.max(0, 1 - ft.age / ft.maxAge);
    ctx.fillStyle = ft.color;
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(ft.text, ft.pos.x, ft.pos.y);
    ctx.globalAlpha = 1;
  }

  // ── Selected building highlight (world space) ──────────────────────────────
  if (state.selectedBuildingId) {
    const selBld = state.buildings.get(state.selectedBuildingId);
    if (selBld) {
      const selCfg = BUILDING_CONFIGS[selBld.type as keyof typeof BUILDING_CONFIGS];
      if (selCfg) {
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(selBld.pos.x - 4, selBld.pos.y - 4, selCfg.w + 8, selCfg.h + 8);
        ctx.setLineDash([]);
        // Rally point
        if (selBld.rallyPoint) {
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(selBld.pos.x + selCfg.w / 2, selBld.pos.y + selCfg.h / 2);
          ctx.lineTo(selBld.rallyPoint.x, selBld.rallyPoint.y);
          ctx.stroke();
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(selBld.rallyPoint.x, selBld.rallyPoint.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // ── Selection box ──────────────────────────────────────────────────────────
  if (state.dragStart && state.dragEnd) {
    const x1 = Math.min(state.dragStart.x, state.dragEnd.x);
    const y1 = Math.min(state.dragStart.y, state.dragEnd.y);
    const w = Math.abs(state.dragEnd.x - state.dragStart.x);
    const h = Math.abs(state.dragEnd.y - state.dragStart.y);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1;
    ctx.strokeRect(x1, y1, w, h);
    ctx.fillStyle = 'rgba(34,197,94,0.1)';
    ctx.fillRect(x1, y1, w, h);
  }

  ctx.restore();

  // ── Night overlay ────────────────────────────────────────────────────────
  if (nightAlpha > 0) {
    ctx.fillStyle = `rgba(10,10,40,${nightAlpha})`;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  // ── Minimap (canvas-drawn; HUD is handled by React GameHUD overlay) ──────
  drawMinimap(ctx, state, canvasW, canvasH);
}

// ── Tilemap terrain renderer ────────────────────────────────────────────────────
/**
 * Render a single tilemap layer using actual tileset sprite images.
 * Falls back silently (tiles just won't draw) if the image isn't loaded yet.
 *
 * @param ctx      Canvas context
 * @param map      The TilemapData generated from islandsToTilemap()
 * @param layer    Which layer index to draw
 * @param imgSrc   The CDN tileset URL to use
 * @param getRectFn  Tile-index → {sx,sy,sw,sh} in the spritesheet
 * @param srcW     Width of one grid tile in the destination (game world pixels)
 * @param srcH     Height of one grid tile in the destination (game world pixels)
 * @param alpha    Optional draw opacity (default 1)
 */
function drawTilemapLayer(
  ctx: CanvasRenderingContext2D,
  map: TilemapData,
  layer: number,
  imgSrc: string,
  getRectFn: (tileIndex: number) => { sx: number; sy: number; sw: number; sh: number },
  alpha = 1,
  oversize = 1,  // multiplier > 1 draws tiles larger than TS_TILE (for foam/shadow 128px sprites on 64px grid)
) {
  const img = loadImg(imgSrc, PRIORITY.AMBIENT);
  if (!img) return;
  if (alpha !== 1) ctx.globalAlpha = alpha;
  const drawSize = TS_TILE * oversize;
  const offset = TS_TILE * (oversize - 1) * 0.5; // center the oversized sprite on the tile

  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tileIdx = getTile(map, layer, x, y);
      if (tileIdx === 0) continue;
      const { sx, sy, sw, sh } = getRectFn(tileIdx);
      const dx = x * TS_TILE - offset;
      const dy = y * TS_TILE - offset;
      ctx.drawImage(img, sx, sy, sw, sh, dx, dy, drawSize, drawSize);
    }
  }
  if (alpha !== 1) ctx.globalAlpha = 1;
}

/**
 * Render all tilemap terrain layers for the entire world.
 * Call instead of (or with fallback to) drawTinySwordsIsland().
 * Returns true if tileset images were loaded and rendering succeeded.
 */
function drawTilemapTerrain(ctx: CanvasRenderingContext2D, map: TilemapData): boolean {
  const flatImg = spriteLoader.get(TILESETS.flatGround, PRIORITY.AMBIENT);
  const elevImg = spriteLoader.get(TILESETS.elevatedGround, PRIORITY.AMBIENT);
  const foamImg = spriteLoader.get(TILESETS.waterFoam, PRIORITY.AMBIENT);
  const shadowImg = spriteLoader.get(TILESETS.shadow, PRIORITY.AMBIENT);

  // If the primary tile images aren't loaded yet, signal caller to use procedural fallback
  if (!flatImg || !elevImg) return false;

  // Layer order: foam → flat ground → shadows → elevated tiers
  if (foamImg) {
    drawTilemapLayer(ctx, map, LAYER_FOAM, TILESETS.waterFoam, () => ({ sx: 0, sy: 0, sw: 128, sh: 128 }), 1, 2);
  }

  drawTilemapLayer(ctx, map, LAYER_FLAT, TILESETS.flatGround, getFlatTileRect);

  if (shadowImg) {
    drawTilemapLayer(ctx, map, LAYER_SHADOW_0, TILESETS.shadow, () => ({ sx: 0, sy: 0, sw: 128, sh: 128 }), 0.65, 2);
  }

  drawTilemapLayer(ctx, map, LAYER_ELEV_1, TILESETS.elevatedGround, getElevatedTileRect);

  if (shadowImg) {
    drawTilemapLayer(ctx, map, LAYER_SHADOW_1, TILESETS.shadow, () => ({ sx: 0, sy: 0, sw: 128, sh: 128 }), 0.55, 2);
  }

  drawTilemapLayer(ctx, map, LAYER_ELEV_2, TILESETS.elevatedGround, getElevatedTileRect);

  if (shadowImg) {
    drawTilemapLayer(ctx, map, LAYER_SHADOW_2, TILESETS.shadow, () => ({ sx: 0, sy: 0, sw: 128, sh: 128 }), 0.45, 2);
  }

  drawTilemapLayer(ctx, map, LAYER_ELEV_3, TILESETS.elevatedGround, getElevatedTileRect);

  return true;
}

// ── Tiny Swords island renderer ─────────────────────────────────────────────────
function drawTinySwordsIsland(ctx: CanvasRenderingContext2D, isl: Island, t: number) {
  const { x, y, w, h } = isl;
  const r = 20;  // corner radius
  const cliffH = 16;  // cliff drop height

  // ── Cliff shadow (darkest, bottom-most layer) ───────────────────────────
  ctx.fillStyle = CLIFF_SHADOW;
  ctx.beginPath();
  roundRect(ctx, x + 3, y + cliffH + 3, w, h, r);
  ctx.fill();

  // ── Cliff face (stone wall visible from side/bottom) ───────────────────
  ctx.fillStyle = CLIFF_BOTTOM;
  ctx.beginPath();
  roundRect(ctx, x, y + cliffH, w, h, r);
  ctx.fill();

  // Mid cliff band
  ctx.fillStyle = CLIFF_MID;
  ctx.beginPath();
  roundRect(ctx, x, y + cliffH - 4, w, h - 4, r);
  ctx.fill();

  // Top cliff edge
  ctx.fillStyle = CLIFF_TOP;
  ctx.beginPath();
  roundRect(ctx, x, y + 6, w, h - 6, r);
  ctx.fill();

  // ── Grass surface ──────────────────────────────────────────────────────
  ctx.fillStyle = GRASS_MAIN;
  ctx.beginPath();
  roundRect(ctx, x + 2, y + 2, w - 4, h - cliffH, r - 2);
  ctx.fill();

  // Grass highlight patches (lighter splotches for texture)
  ctx.fillStyle = GRASS_LIGHT;
  ctx.globalAlpha = 0.35;
  const seed = x * 7 + y * 13;  // deterministic per-island
  for (let i = 0; i < 12; i++) {
    const px = x + 20 + ((seed + i * 97) % (w - 40));
    const py = y + 15 + ((seed + i * 53) % (h - cliffH - 30));
    const sz = 18 + (i % 5) * 8;
    ctx.beginPath();
    ctx.ellipse(px, py, sz, sz * 0.6, (i * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Grass dark edge (inner border for depth)
  ctx.strokeStyle = GRASS_DARK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  roundRect(ctx, x + 2, y + 2, w - 4, h - cliffH, r - 2);
  ctx.stroke();

  // ── Cliff edge highlight (top edge of cliff face — light stone) ────────
  ctx.strokeStyle = '#8fa3b0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  // Only the bottom and sides of the grass area
  const bx = x + 2, by = y + h - cliffH + 2, bw = w - 4;
  ctx.moveTo(bx, by - 6);
  ctx.lineTo(bx, by + 2);
  ctx.arcTo(bx + bw, by + 2, bx + bw, by - 6, r);
  ctx.lineTo(bx + bw, by - 6);
  ctx.stroke();

  // ── Decorative stone dots on cliff face ────────────────────────────────
  ctx.fillStyle = '#8a9aa4';
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 8; i++) {
    const dx = x + 15 + ((seed + i * 71) % (w - 30));
    const dy = y + h - cliffH + 4 + ((seed + i * 37) % (cliffH - 2));
    ctx.beginPath();
    ctx.arc(dx, dy, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── Faction tint (subtle colored overlay for team islands) ─────────────
  if (isl.faction === 'blue' || isl.faction === 'red') {
    ctx.fillStyle = isl.faction === 'blue' ? 'rgba(59,130,246,0.06)' : 'rgba(239,68,68,0.06)';
    ctx.beginPath();
    roundRect(ctx, x + 2, y + 2, w - 4, h - cliffH, r - 2);
    ctx.fill();
  }
}

// ── Draw individual elements ───────────────────────────────────────────────────
function drawResource(ctx: CanvasRenderingContext2D, res: Resource) {
  const isGold = res.type === 'goldmine';
  if (isGold) {
    // Gold mine — stone circle with gold
    ctx.fillStyle = '#5e6e78';
    ctx.beginPath();
    ctx.arc(res.pos.x, res.pos.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a8b96';
    ctx.beginPath();
    ctx.arc(res.pos.x, res.pos.y - 2, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = GOLD_MINE_COLOR;
    ctx.beginPath();
    ctx.arc(res.pos.x, res.pos.y - 2, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d4a017';
    ctx.beginPath();
    ctx.arc(res.pos.x - 3, res.pos.y - 5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(res.pos.x + 4, res.pos.y - 1, 4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Tree — Tiny Swords style: try CDN sprite, fallback to procedural pixel tree
    const treeImg = loadImg(TERRAIN.tree1, PRIORITY.BUILDING);
    if (treeImg) {
      // Tree1.png is a 4-frame strip of 32x32 pine trees
      const treeVariant = ((res.pos.x * 7 + res.pos.y * 3) | 0) % 4;
      ctx.drawImage(treeImg, treeVariant * 32, 0, 32, 32, res.pos.x - 24, res.pos.y - 40, 48, 48);
    } else {
      // Procedural pixel-art tree (green canopy + brown trunk)
      // Trunk
      ctx.fillStyle = '#5b3a1a';
      ctx.fillRect(res.pos.x - 3, res.pos.y - 4, 6, 14);
      // Canopy layers (dark → light, bottom → top)
      ctx.fillStyle = '#2d6b1b';
      ctx.beginPath();
      ctx.ellipse(res.pos.x, res.pos.y - 14, 16, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3d8c28';
      ctx.beginPath();
      ctx.ellipse(res.pos.x, res.pos.y - 20, 13, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4da832';
      ctx.beginPath();
      ctx.ellipse(res.pos.x - 1, res.pos.y - 26, 9, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      // Highlight
      ctx.fillStyle = '#6bc84a';
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.ellipse(res.pos.x - 3, res.pos.y - 22, 5, 4, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  // Amount label
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(res.amount)}`, res.pos.x, res.pos.y + (isGold ? 28 : 18));
  ctx.textAlign = 'left';
}

function drawBuilding(ctx: CanvasRenderingContext2D, bld: Building) {
  const cfg = BUILDING_CONFIGS[bld.type as keyof typeof BUILDING_CONFIGS];
  if (!cfg) return;
  const w = cfg.w;
  const h = cfg.h;
  const alpha = bld.underConstruction ? 0.5 + 0.5 * bld.constructionProgress : 1;
  ctx.globalAlpha = alpha;

  // Try Miniworld sprite rendering
  const sprite = getBuildingSprite(bld.faction as 'blue' | 'red' | 'neutral', bld.type);
  const sprImg = sprite ? loadImg(sprite.sheet) : null;

  if (sprite && sprImg) {
    // Render building from spritesheet with correct frame extraction
    ctx.drawImage(
      sprImg,
      sprite.sx, sprite.sy, sprite.sw, sprite.sh,  // Source rect
      bld.pos.x, bld.pos.y, w, h,                  // Destination rect
    );
  } else {
    // Fallback: colored rectangle
    ctx.fillStyle = bld.faction === 'blue' ? '#1e3a5f' : bld.faction === 'red' ? '#5f1e1e' : '#3f3f3f';
    ctx.beginPath();
    roundRect(ctx, bld.pos.x, bld.pos.y, w, h, 6);
    ctx.fill();
    ctx.strokeStyle = FACTION_COLORS[bld.faction];
    ctx.lineWidth = 2;
    ctx.stroke();
    // Building name (only for fallback)
    ctx.fillStyle = '#e4e4e7';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(bld.type.toUpperCase(), bld.pos.x + w / 2, bld.pos.y + h / 2 + 4);
    ctx.textAlign = 'left';
  }

  // Construction progress bar
  if (bld.underConstruction) {
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(bld.pos.x, bld.pos.y + h + 2, w * bld.constructionProgress, 4);
    ctx.strokeStyle = '#333';
    ctx.strokeRect(bld.pos.x, bld.pos.y + h + 2, w, 4);
  }

  // HP bar
  const hpPct = bld.hp / bld.maxHp;
  ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#f59e0b' : '#ef4444';
  ctx.fillRect(bld.pos.x, bld.pos.y - 6, w * hpPct, 4);
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(bld.pos.x, bld.pos.y - 6, w, 4);

  // ── Building damage FX: fire below 50%, heavy smoke + fire below 25% ──────
  if (!bld.underConstruction && hpPct < 0.5) {
    const fireCfg = VFX_CONFIGS['building_fire'];
    const fireImg = loadImg(fireCfg.src);
    if (fireImg) {
      const t = performance.now() / 1000;
      const frame = Math.floor((t * 3) % fireCfg.cols);
      const fireAlpha = hpPct < 0.25 ? 0.9 : 0.5;
      ctx.globalAlpha = fireAlpha;
      ctx.drawImage(fireImg, frame * fireCfg.frameW, 0, fireCfg.frameW, fireCfg.frameH,
        bld.pos.x + w * 0.2, bld.pos.y - 10, fireCfg.displaySize, fireCfg.displaySize);
      // Second fire source on large buildings
      if (w > 64) {
        ctx.drawImage(fireImg, ((frame + 2) % fireCfg.cols) * fireCfg.frameW, 0, fireCfg.frameW, fireCfg.frameH,
          bld.pos.x + w * 0.6, bld.pos.y + h * 0.1, fireCfg.displaySize * 0.8, fireCfg.displaySize * 0.8);
      }
    }
    // Heavy smoke below 25%
    if (hpPct < 0.25) {
      const smokeCfg = VFX_CONFIGS['building_smoke'];
      const smokeImg = loadImg(smokeCfg.src);
      if (smokeImg) {
        const t = performance.now() / 1000;
        const sFrame = Math.floor((t * 2) % smokeCfg.cols);
        ctx.globalAlpha = 0.6;
        ctx.drawImage(smokeImg, sFrame * smokeCfg.frameW, 0, smokeCfg.frameW, smokeCfg.frameH,
          bld.pos.x + w * 0.3, bld.pos.y - 20, smokeCfg.displaySize, smokeCfg.displaySize);
      }
    }
  }

  ctx.globalAlpha = 1;

  // Training progress
  if (bld.trainingQueue.length > 0) {
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(bld.pos.x, bld.pos.y + h + 8, w * bld.trainingProgress, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Training: ${bld.trainingQueue[0]}`, bld.pos.x + w / 2, bld.pos.y + h + 20);
    ctx.textAlign = 'left';
  }
}

function drawUnit(ctx: CanvasRenderingContext2D, unit: Unit, state: GameState) {
  const display = getUnitDisplay(unit.type);
  const baseSize = unit.isHero ? 52 : 38;
  const size = Math.round(baseSize * display.scale);
  const half = size / 2;

  // ── Faction colored ring (always visible — key for identification) ────────
  const factionColor = FACTION_COLORS[unit.faction] || '#888';
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = factionColor;
  ctx.lineWidth = unit.isHero ? 2.5 : 1.5;
  ctx.beginPath();
  ctx.ellipse(unit.pos.x, unit.pos.y + half * 0.35, half * 0.6, half * 0.2, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Fill faction disc (subtle)
  ctx.fillStyle = factionColor;
  ctx.globalAlpha = 0.12;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Shadow
  if (display.shadow > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(unit.pos.x, unit.pos.y + half * 0.4, half * 0.55, half * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Try sprite rendering — pass actual faction so local TS sprites use correct color
  const sprites = getUnitSprites(unit.faction, unit.type);
  const animKey = unit.anim.action === 'run' ? 'run' : unit.anim.action === 'attack' ? 'attack' :
    unit.anim.action === 'interact' ? 'interact' : 'idle';
  const sprCfg = sprites?.[animKey] ?? sprites?.['idle'];

  if (sprCfg) {
    const elapsed = unit.anim.elapsed * 1000;
    const frameIdx = Math.floor(elapsed / sprCfg.msPerFrame) % sprCfg.frames;
    drawSprite(ctx, sprCfg.src, frameIdx, sprCfg.frameW, sprCfg.frameH,
      unit.pos.x - half, unit.pos.y - half, size, size, unit.anim.flipX);
  } else {
    // Fallback: styled circle with icon
    ctx.fillStyle = factionColor;
    ctx.beginPath();
    ctx.arc(unit.pos.x, unit.pos.y, half * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `${unit.isHero ? 18 : 12}px sans-serif`;
    ctx.textAlign = 'center';
    const icon = unit.role === 'worker' ? '⛏️' : unit.role === 'melee' ? '⚔️' :
      unit.role === 'ranged' ? '🏹' : unit.role === 'caster' ? '✨' :
      unit.role === 'siege' ? '💣' : unit.role === 'hero' ? '👑' : '•';
    ctx.fillText(icon, unit.pos.x, unit.pos.y + 5);
    ctx.textAlign = 'left';
  }

  // Selection ring
  if (unit.selected) {
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(unit.pos.x, unit.pos.y + half * 0.3, half * 0.8, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ── HP bar ───────────────────────────────────────────────────────────────
  const barW = size * 0.8;
  const hpPct = unit.hp / unit.maxHp;
  ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#f59e0b' : '#ef4444';
  ctx.fillRect(unit.pos.x - barW / 2, unit.pos.y - half - 8, barW * hpPct, 3);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(unit.pos.x - barW / 2, unit.pos.y - half - 8, barW, 3);

  // ── Hero level badge ─────────────────────────────────────────────────────
  if (unit.isHero) {
    ctx.fillStyle = '#7c3aed';
    ctx.beginPath();
    ctx.arc(unit.pos.x + half * 0.6, unit.pos.y - half * 0.6, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${unit.heroLevel}`, unit.pos.x + half * 0.6, unit.pos.y - half * 0.6 + 3);
    ctx.textAlign = 'left';

    // Mana bar
    if (unit.maxMana > 0) {
      const manaPct = unit.mana / unit.maxMana;
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(unit.pos.x - barW / 2, unit.pos.y - half - 4, barW * manaPct, 2);
    }

    // XP bar
    if (unit.heroLevel < 10) {
      const xpPct = unit.heroXp / unit.heroXpToNext;
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(unit.pos.x - barW / 2, unit.pos.y - half - 1, barW * xpPct, 1);
    }

    // Hero name label
    const heroCfg = HERO_CONFIGS.find(h => h.type === unit.type);
    if (heroCfg) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(heroCfg.name, unit.pos.x, unit.pos.y + half + 12);
      ctx.textAlign = 'left';
    }
  }

  // ── Unit type label (non-hero, non-worker) ───────────────────────────────
  if (!unit.isHero && unit.role !== 'worker') {
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(unit.type, unit.pos.x, unit.pos.y + half + 8);
    ctx.textAlign = 'left';
  }

  // Carry indicator
  if (unit.carryAmount > 0) {
    ctx.fillStyle = unit.carryType === 'gold' ? '#fbbf24' : '#22c55e';
    ctx.beginPath();
    ctx.arc(unit.pos.x - half * 0.5, unit.pos.y - half * 0.5, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawProjectile(ctx: CanvasRenderingContext2D, proj: Projectile) {
  const style = proj.projectileStyle ?? 'none';
  const angle = Math.atan2(proj.vel.y, proj.vel.x);
  const tailX = proj.pos.x - proj.vel.x * 0.04;
  const tailY = proj.pos.y - proj.vel.y * 0.04;

  ctx.save();

  if (style === 'arrow') {
    // Arrow shaft + head
    ctx.translate(proj.pos.x, proj.pos.y);
    ctx.rotate(angle);
    ctx.strokeStyle = '#c4a35a';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(0, 0); ctx.stroke();
    // Arrowhead
    ctx.fillStyle = '#ddd';
    ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-2, -3); ctx.lineTo(-2, 3); ctx.closePath(); ctx.fill();
    // Fletching
    ctx.strokeStyle = '#8b5e3c';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-16, -3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-16, 3); ctx.stroke();
  } else if (style === 'bolt') {
    // Crossbow bolt / ballista bolt — thicker, metallic
    ctx.translate(proj.pos.x, proj.pos.y);
    ctx.rotate(angle);
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(0, 0); ctx.stroke();
    ctx.fillStyle = '#e0e0e0';
    ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-1, -3); ctx.lineTo(-1, 3); ctx.closePath(); ctx.fill();
    // Glow
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 4;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.shadowBlur = 0;
  } else if (style === 'fire') {
    // Fireball with glow
    const grad = ctx.createRadialGradient(proj.pos.x, proj.pos.y, 1, proj.pos.x, proj.pos.y, 10);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.3, '#ff6b00');
    grad.addColorStop(0.7, '#ff2200');
    grad.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(proj.pos.x, proj.pos.y, 10, 0, Math.PI * 2); ctx.fill();
    // Fire trail
    ctx.strokeStyle = 'rgba(255,100,0,0.5)';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(proj.pos.x, proj.pos.y); ctx.lineTo(tailX, tailY); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,200,0,0.3)';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(proj.pos.x, proj.pos.y); ctx.lineTo(tailX, tailY); ctx.stroke();
  } else if (style === 'energy') {
    // Arcane energy orb
    const grad = ctx.createRadialGradient(proj.pos.x, proj.pos.y, 0, proj.pos.x, proj.pos.y, 8);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.4, '#7c3aed');
    grad.addColorStop(1, 'rgba(124,58,237,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(proj.pos.x, proj.pos.y, 8, 0, Math.PI * 2); ctx.fill();
    // Sparkle trail
    ctx.strokeStyle = 'rgba(167,139,250,0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(proj.pos.x, proj.pos.y); ctx.lineTo(tailX, tailY); ctx.stroke();
  } else if (style === 'holy') {
    // Golden holy bolt
    const grad = ctx.createRadialGradient(proj.pos.x, proj.pos.y, 0, proj.pos.x, proj.pos.y, 7);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.3, '#ffd700');
    grad.addColorStop(1, 'rgba(255,215,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(proj.pos.x, proj.pos.y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,0,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(proj.pos.x, proj.pos.y); ctx.lineTo(tailX, tailY); ctx.stroke();
  } else if (style === 'water') {
    // Ice/water shard
    const grad = ctx.createRadialGradient(proj.pos.x, proj.pos.y, 0, proj.pos.x, proj.pos.y, 7);
    grad.addColorStop(0, '#e0f7ff');
    grad.addColorStop(0.4, '#38bdf8');
    grad.addColorStop(1, 'rgba(56,189,248,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(proj.pos.x, proj.pos.y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(56,189,248,0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(proj.pos.x, proj.pos.y); ctx.lineTo(tailX, tailY); ctx.stroke();
  } else if (style === 'thunder') {
    // Lightning bolt — jagged line
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#60a5fa';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(proj.pos.x, proj.pos.y);
    const mx = (proj.pos.x + tailX) / 2 + (Math.random() - 0.5) * 8;
    const my = (proj.pos.y + tailY) / 2 + (Math.random() - 0.5) * 8;
    ctx.lineTo(mx, my);
    ctx.lineTo(tailX, tailY);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Core glow
    ctx.fillStyle = '#bfdbfe';
    ctx.beginPath(); ctx.arc(proj.pos.x, proj.pos.y, 3, 0, Math.PI * 2); ctx.fill();
  } else if (style === 'shadow') {
    // Dark shadow wisp
    const grad = ctx.createRadialGradient(proj.pos.x, proj.pos.y, 0, proj.pos.x, proj.pos.y, 8);
    grad.addColorStop(0, '#9333ea');
    grad.addColorStop(0.5, '#581c87');
    grad.addColorStop(1, 'rgba(88,28,135,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(proj.pos.x, proj.pos.y, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(147,51,234,0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(proj.pos.x, proj.pos.y); ctx.lineTo(tailX, tailY); ctx.stroke();
  } else {
    // Default: faction-colored dot with trail
    ctx.fillStyle = proj.faction === 'blue' ? '#60a5fa' : '#f87171';
    ctx.beginPath();
    ctx.arc(proj.pos.x, proj.pos.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = proj.faction === 'blue' ? 'rgba(96,165,250,0.3)' : 'rgba(248,113,113,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(proj.pos.x, proj.pos.y); ctx.lineTo(tailX, tailY); ctx.stroke();
  }

  ctx.restore();
}

function drawVfx(ctx: CanvasRenderingContext2D, vfx: VfxEffect) {
  const cfg = VFX_CONFIGS[vfx.type as keyof typeof VFX_CONFIGS];
  if (!cfg) return;
  const progress = vfx.age / vfx.duration;
  const alpha = Math.max(0, 1 - progress);
  const size = cfg.growing ? cfg.displaySize * progress : cfg.displaySize;

  ctx.globalAlpha = alpha;
  const img = loadImg(cfg.src);
  if (img) {
    const frameIdx = cfg.singleFrame ? 0 : Math.floor(progress * cfg.cols) % cfg.cols;
    ctx.drawImage(img, frameIdx * cfg.frameW, 0, cfg.frameW, cfg.frameH,
      vfx.pos.x - size / 2, vfx.pos.y - size / 2, size, size);
  } else {
    // Fallback glow
    ctx.fillStyle = '#ff0';
    ctx.beginPath();
    ctx.arc(vfx.pos.x, vfx.pos.y, size / 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}


// ── Minimap ────────────────────────────────────────────────────────────────────
function drawMinimap(ctx: CanvasRenderingContext2D, state: GameState, cw: number, ch: number) {
  const mw = 176;
  const mh = 110;
  const mx = cw - mw - 8;  // bottom-right, clear of the React SelectionPanel (bottom-left)
  const my = ch - mh - 8;

  // Find world bounds
  let worldW = 3600, worldH = 2100;
  for (const isl of state.islands) {
    worldW = Math.max(worldW, isl.x + isl.w + 100);
    worldH = Math.max(worldH, isl.y + isl.h + 100);
  }

  const scaleX = mw / worldW;
  const scaleY = mh / worldH;

  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = '#3f3f46';
  ctx.strokeRect(mx, my, mw, mh);

  // Islands
  for (const isl of state.islands) {
    ctx.fillStyle = '#2d5a3e';
    ctx.fillRect(mx + isl.x * scaleX, my + isl.y * scaleY, isl.w * scaleX, isl.h * scaleY);
  }

  // Units as dots
  for (const [, u] of state.units) {
    if (u.state === 'dead') continue;
    ctx.fillStyle = FACTION_COLORS[u.faction] || '#888';
    const dotSize = u.isHero ? 4 : 2;
    ctx.fillRect(mx + u.pos.x * scaleX - dotSize / 2, my + u.pos.y * scaleY - dotSize / 2, dotSize, dotSize);
  }

  // Buildings
  for (const [, b] of state.buildings) {
    ctx.fillStyle = FACTION_COLORS[b.faction] || '#888';
    ctx.fillRect(mx + b.pos.x * scaleX, my + b.pos.y * scaleY, 4, 4);
  }

  // Camera viewport
  const vx = mx + state.camera.x * scaleX;
  const vy = my + state.camera.y * scaleY;
  const vw = (cw / state.zoom) * scaleX;
  const vh = (ch / state.zoom) * scaleY;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.strokeRect(vx, vy, vw, vh);
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
}
