import type { GameState, Unit, Building, Resource, Island, Projectile, VfxEffect } from './types';
import { UNIT_CONFIGS, BUILDING_CONFIGS, HERO_CONFIGS, ITEM_DEFS, getUnitSprites, getLegionSprites, getBuildingSprite, DAY_DURATION, CYCLE_LENGTH } from './constants';
import { VFX_CONFIGS } from './vfx';
import { getUnitDisplay, getBuildingDisplay } from './unit-defaults';

// ── Image cache ────────────────────────────────────────────────────────────────
const _imgCache = new Map<string, HTMLImageElement>();
function loadImg(src: string): HTMLImageElement | null {
  if (_imgCache.has(src)) {
    const img = _imgCache.get(src)!;
    return img.complete && img.naturalWidth > 0 ? img : null;
  }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = src;
  _imgCache.set(src, img);
  return null;
}

// ── Colors ─────────────────────────────────────────────────────────────────────
const FACTION_COLORS = { blue: '#3b82f6', red: '#ef4444', neutral: '#f59e0b' };
const WATER_COLOR = '#1e6091';
const ISLAND_COLOR = '#4a7c59';
const GOLD_MINE_COLOR = '#fbbf24';
const TREE_COLOR = '#166534';
const GRID_COLOR = 'rgba(255,255,255,0.04)';

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

  // ── Water background ─────────────────────────────────────────────────────
  const sx = Math.floor(camera.x);
  const sy = Math.floor(camera.y);
  const ew = Math.ceil(canvasW / zoom) + 128;
  const eh = Math.ceil(canvasH / zoom) + 128;
  ctx.fillStyle = WATER_COLOR;
  ctx.fillRect(sx, sy, ew, eh);
  // Water grid
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 0.5;
  for (let x = sx - (sx % 64); x < sx + ew; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, sy); ctx.lineTo(x, sy + eh); ctx.stroke();
  }
  for (let y = sy - (sy % 64); y < sy + eh; y += 64) {
    ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx + ew, y); ctx.stroke();
  }

  // ── Islands ──────────────────────────────────────────────────────────────
  for (const isl of state.islands) {
    ctx.fillStyle = ISLAND_COLOR;
    ctx.beginPath();
    roundRect(ctx, isl.x, isl.y, isl.w, isl.h, 16);
    ctx.fill();
    // Island border
    ctx.strokeStyle = '#2d5a3e';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Island label
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = '10px sans-serif';
    ctx.fillText(isl.id, isl.x + 8, isl.y + 16);
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

  // ── HUD ──────────────────────────────────────────────────────────────────
  drawHUD(ctx, state, canvasW, canvasH);
  drawMinimap(ctx, state, canvasW, canvasH);
}

// ── Draw individual elements ───────────────────────────────────────────────────
function drawResource(ctx: CanvasRenderingContext2D, res: Resource) {
  const isGold = res.type === 'goldmine';
  const size = isGold ? 40 : 28;
  ctx.fillStyle = isGold ? GOLD_MINE_COLOR : TREE_COLOR;
  if (isGold) {
    ctx.beginPath();
    ctx.arc(res.pos.x, res.pos.y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#92400e';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💰', res.pos.x, res.pos.y + 6);
    ctx.textAlign = 'left';
  } else {
    ctx.beginPath();
    ctx.moveTo(res.pos.x, res.pos.y - size);
    ctx.lineTo(res.pos.x - size / 2, res.pos.y);
    ctx.lineTo(res.pos.x + size / 2, res.pos.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5b3a1a';
    ctx.fillRect(res.pos.x - 3, res.pos.y, 6, 10);
  }
  // Amount label
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(res.amount)}`, res.pos.x, res.pos.y + (isGold ? 28 : 20));
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

  // Shadow
  if (display.shadow > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(unit.pos.x, unit.pos.y + half * 0.4, half * 0.55, half * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Try sprite rendering — use neutral sprites too (all units get sprites)
  const faction = unit.faction === 'blue' ? 'blue' : 'red';
  const sprites = getUnitSprites(faction as 'blue' | 'red', unit.type);
  const animKey = unit.anim.action === 'run' ? 'run' : unit.anim.action === 'attack' ? 'attack' :
    unit.anim.action === 'interact' ? 'interact' : 'idle';
  const sprCfg = sprites?.[animKey] ?? sprites?.['idle'];

  if (sprCfg) {
    const elapsed = unit.anim.elapsed * 1000;
    const frameIdx = Math.floor(elapsed / sprCfg.msPerFrame) % sprCfg.frames;
    // Scale sprite to consistent display size regardless of source resolution
    drawSprite(ctx, sprCfg.src, frameIdx, sprCfg.frameW, sprCfg.frameH,
      unit.pos.x - half, unit.pos.y - half, size, size, unit.anim.flipX);
  } else {
    // Fallback: colored circle
    ctx.fillStyle = FACTION_COLORS[unit.faction] || '#888';
    ctx.beginPath();
    ctx.arc(unit.pos.x, unit.pos.y, half * 0.7, 0, Math.PI * 2);
    ctx.fill();
    // Role icon
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

  // HP bar
  const barW = size * 0.8;
  const hpPct = unit.hp / unit.maxHp;
  ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#f59e0b' : '#ef4444';
  ctx.fillRect(unit.pos.x - barW / 2, unit.pos.y - half - 8, barW * hpPct, 3);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(unit.pos.x - barW / 2, unit.pos.y - half - 8, barW, 3);

  // Hero level badge
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
  ctx.fillStyle = proj.faction === 'blue' ? '#60a5fa' : '#f87171';
  ctx.beginPath();
  ctx.arc(proj.pos.x, proj.pos.y, 3, 0, Math.PI * 2);
  ctx.fill();
  // Trail
  ctx.strokeStyle = proj.faction === 'blue' ? 'rgba(96,165,250,0.3)' : 'rgba(248,113,113,0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(proj.pos.x, proj.pos.y);
  ctx.lineTo(proj.pos.x - proj.vel.x * 0.03, proj.pos.y - proj.vel.y * 0.03);
  ctx.stroke();
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

// ── HUD ────────────────────────────────────────────────────────────────────────
function drawHUD(ctx: CanvasRenderingContext2D, state: GameState, cw: number, ch: number) {
  const res = state.playerResources;

  // ── Top bar ────────────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(0, 0, cw, 32);
  ctx.strokeStyle = '#3f3f46';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 32); ctx.lineTo(cw, 32); ctx.stroke();

  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(`🪙 ${res.gold}`, 16, 22);
  ctx.fillStyle = '#22c55e';
  ctx.fillText(`🪵 ${res.wood}`, 130, 22);
  ctx.fillStyle = '#f97316';
  ctx.fillText(`🍗 ${res.food}/${res.maxFood}`, 244, 22);

  const upkeepColor = state.upkeepLevel === 'none' ? '#22c55e' : state.upkeepLevel === 'low' ? '#f59e0b' : '#ef4444';
  ctx.fillStyle = upkeepColor;
  ctx.fillText(`Upkeep: ${state.upkeepLevel.toUpperCase()}`, 370, 22);

  const dayIcon = state.timeOfDay === 'day' ? '☀️' : '🌙';
  ctx.fillStyle = '#a1a1aa';
  ctx.fillText(`${dayIcon} ${Math.floor(state.timeElapsed / 60)}:${String(Math.floor(state.timeElapsed % 60)).padStart(2, '0')}`, cw - 130, 22);
  ctx.fillStyle = '#a855f7';
  ctx.fillText(`T${state.techTier}`, cw - 210, 22);

  // ── Idle worker button (top-left under resource bar) ──────────────────────
  let idleWorkers = 0;
  for (const [, u] of state.units) {
    if (u.faction === 'blue' && u.role === 'worker' && u.state === 'idle' && !u.buildTargetId && !u.harvestTargetId) idleWorkers++;
  }
  if (idleWorkers > 0) {
    const flash = Math.sin(performance.now() / 300) > 0;
    ctx.fillStyle = flash ? '#fbbf24' : '#92400e';
    ctx.beginPath();
    roundRect(ctx, 16, 38, 48, 28, 4);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`⛏️${idleWorkers}`, 40, 56);
    ctx.textAlign = 'left';
  }

  // ── Hero portraits (top-left) ─────────────────────────────────────────────
  let heroX = 72;
  for (const [, u] of state.units) {
    if (u.faction !== 'blue' || !u.isHero || u.state === 'dead') continue;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(heroX, 38, 50, 50);
    ctx.strokeStyle = u.selected ? '#22c55e' : '#7c3aed';
    ctx.lineWidth = u.selected ? 2.5 : 1.5;
    ctx.strokeRect(heroX, 38, 50, 50);
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(u.type === 'arthax' ? '🗡️' : u.type === 'kanji' ? '🔮' : u.type === 'katan' ? '🏹' :
      u.type === 'grum' ? '🛡️' : u.type === 'gangblanc' ? '🔪' : u.type === 'okomo' ? '👊' :
      u.type === 'zhinja' ? '🥷' : '⚔️', heroX + 25, 65);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText(`Lv${u.heroLevel}`, heroX + 2, 84);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(heroX, 88, 50 * (u.hp / u.maxHp), 3);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(heroX, 92, 50 * (u.mana / u.maxMana), 2);
    heroX += 56;
  }

  // ── Bottom panel (WC3-style) ──────────────────────────────────────────────
  const bpH = 110;
  const bpY = ch - bpH;
  ctx.fillStyle = 'rgba(0,0,0,0.88)';
  ctx.fillRect(0, bpY, cw, bpH);
  ctx.strokeStyle = '#3f3f46';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, bpY); ctx.lineTo(cw, bpY); ctx.stroke();

  // ── Selected unit info (bottom panel center-left) ─────────────────────────
  const selected = [...state.selected].map(id => state.units.get(id)).filter(u => u && u.state !== 'dead');
  if (selected.length === 1) {
    const u = selected[0]!;
    const px = 200;
    ctx.fillStyle = '#e4e4e7';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`${u.type.charAt(0).toUpperCase() + u.type.slice(1)}${u.isHero ? ` (Lv${u.heroLevel})` : ''}`, px, bpY + 20);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#a1a1aa';
    ctx.fillText(`HP: ${Math.round(u.hp)}/${u.maxHp}  DMG: ${UNIT_CONFIGS[u.type]?.damage ?? '?'}  ARM: ${u.armor}  SPD: ${UNIT_CONFIGS[u.type]?.speed ?? '?'}`, px, bpY + 36);
    // HP bar
    const barW = 200;
    const hpPct = u.hp / u.maxHp;
    ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#f59e0b' : '#ef4444';
    ctx.fillRect(px, bpY + 42, barW * hpPct, 6);
    ctx.strokeStyle = '#3f3f46';
    ctx.strokeRect(px, bpY + 42, barW, 6);
    if (u.isHero) {
      // Mana bar
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(px, bpY + 52, barW * (u.mana / u.maxMana), 4);
      ctx.strokeRect(px, bpY + 52, barW, 4);
      ctx.fillStyle = '#a1a1aa';
      ctx.font = '10px sans-serif';
      ctx.fillText(`Mana: ${Math.round(u.mana)}/${u.maxMana}  XP: ${u.heroXp}/${u.heroXpToNext}  Kills: ${u.kills}`, px, bpY + 72);
      // Inventory
      let ix = px;
      for (let s = 0; s < 6; s++) {
        ctx.fillStyle = u.inventory[s] ? '#1e3a5f' : '#18181b';
        ctx.fillRect(ix, bpY + 78, 24, 24);
        ctx.strokeStyle = '#3f3f46';
        ctx.strokeRect(ix, bpY + 78, 24, 24);
        if (u.inventory[s]) {
          const def = ITEM_DEFS[u.inventory[s]!.defId];
          if (def) {
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(def.icon, ix + 12, bpY + 96);
            ctx.textAlign = 'left';
          }
        }
        ix += 28;
      }
    }
    // Hold indicator
    if (u.holdPosition) {
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('HOLD', px + barW + 8, bpY + 48);
    }
  } else if (selected.length > 1) {
    // Group display — grid of unit icons
    const px = 200;
    ctx.fillStyle = '#e4e4e7';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`${selected.length} units selected`, px, bpY + 18);
    let gx = px, gy = bpY + 24;
    for (let i = 0; i < Math.min(selected.length, 24); i++) {
      const u = selected[i]!;
      ctx.fillStyle = u.isHero ? '#2d1b69' : '#18181b';
      ctx.fillRect(gx, gy, 28, 28);
      ctx.strokeStyle = u.isHero ? '#7c3aed' : '#3f3f46';
      ctx.strokeRect(gx, gy, 28, 28);
      // Mini HP bar
      const hp = u.hp / u.maxHp;
      ctx.fillStyle = hp > 0.5 ? '#22c55e' : '#ef4444';
      ctx.fillRect(gx, gy + 26, 28 * hp, 2);
      // Icon
      ctx.fillStyle = '#e4e4e7';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      const icon = u.role === 'worker' ? '⛏️' : u.role === 'melee' ? '⚔️' : u.role === 'ranged' ? '🏹' :
        u.role === 'caster' ? '✨' : u.role === 'siege' ? '💣' : u.isHero ? '👑' : '•';
      ctx.fillText(icon, gx + 14, gy + 19);
      ctx.textAlign = 'left';
      gx += 32;
      if (gx > px + 320) { gx = px; gy += 34; }
    }
  }

  // ── Selected building highlight on map ─────────────────────────────────────
  // (drawn in world space via main render, but we show info in bottom panel)
  if (state.selectedBuildingId) {
    const bld = state.buildings.get(state.selectedBuildingId);
    if (bld) {
      const cfg = BUILDING_CONFIGS[bld.type as keyof typeof BUILDING_CONFIGS];
      if (cfg) {
        const px = 200;
        ctx.fillStyle = '#e4e4e7';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(`${bld.type.charAt(0).toUpperCase() + bld.type.slice(1)}`, px, bpY + 20);
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#a1a1aa';
        ctx.fillText(`HP: ${Math.round(bld.hp)}/${bld.maxHp}  Tier: ${cfg.techTier}`, px, bpY + 36);
        const barW = 200;
        const hpPct = bld.hp / bld.maxHp;
        ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#f59e0b' : '#ef4444';
        ctx.fillRect(px, bpY + 42, barW * hpPct, 6);
        ctx.strokeStyle = '#3f3f46';
        ctx.strokeRect(px, bpY + 42, barW, 6);
        if (bld.trainingQueue.length > 0) {
          ctx.fillStyle = '#3b82f6';
          ctx.fillRect(px, bpY + 52, barW * bld.trainingProgress, 4);
          ctx.strokeRect(px, bpY + 52, barW, 4);
          ctx.fillStyle = '#a1a1aa';
          ctx.font = '10px sans-serif';
          ctx.fillText(`Training: ${bld.trainingQueue[0]} (${bld.trainingQueue.length} queued)`, px, bpY + 70);
        }
        if (cfg.trains.length > 0) {
          ctx.fillStyle = '#71717a';
          ctx.font = '9px sans-serif';
          ctx.fillText(`Trains: ${cfg.trains.join(', ')}`, px, bpY + 86);
        }
      }
    }
  }

  // Win/Lose overlay
  if (state.gameStatus === 'won' || state.gameStatus === 'lost') {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = state.gameStatus === 'won' ? '#22c55e' : '#ef4444';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.gameStatus === 'won' ? 'VICTORY' : 'DEFEAT', cw / 2, ch / 2);
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#a1a1aa';
    ctx.fillText('Press Menu to return', cw / 2, ch / 2 + 40);
    ctx.textAlign = 'left';
  }
}

// ── Minimap ────────────────────────────────────────────────────────────────────
function drawMinimap(ctx: CanvasRenderingContext2D, state: GameState, cw: number, ch: number) {
  const mw = 176;
  const mh = 110;
  const mx = 8;
  const bpH = 110; // bottom panel height
  const my = ch - bpH; // sit inside the bottom panel left side

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
