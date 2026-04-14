/**
 * FX Controller — Grudge Studio Best Practices
 *
 * Unified particle, tween, audio, and sprite animation system.
 * Wraps: PixiJS particle-emitter, GSAP, Howler, Tween.js
 *
 * Usage:
 *   import { fxController } from './fx-controller';
 *   fxController.playHit(pos, 'fire');
 *   fxController.playSound('sword_clash');
 *   fxController.shakeCamera(state, 4, 200);
 */

import { Howl, Howler } from 'howler';
import gsap from 'gsap';
import * as TWEEN from '@tweenjs/tween.js';
import type { Vec2 } from './types';
import type { GameState } from './types';
import type { VfxType } from './vfx';

// Audio: local first (fast, no CORS), then R2 CDN, then GitHub Pages fallback
const LOCAL_FX = '/audio/fx';
const CDN_FX = 'https://assets.grudge-studio.com/audio/fx';
const PAGES_FX = 'https://molochdagod.github.io/ObjectStore/audio/fx';

// ══════════════════════════════════════════════════════════════════════════════
// Audio Manager
// ══════════════════════════════════════════════════════════════════════════════

interface SoundDef {
  src: string[];
  volume: number;
  pool?: number;
}

/** Helper: local first, CDN second, Pages third */
function fx(name: string, ext = 'ogg'): string[] {
  return [`${LOCAL_FX}/${name}.${ext}`, `${CDN_FX}/${name}.${ext}`, `${PAGES_FX}/${name}.${ext}`];
}

const SOUND_DEFS: Record<string, SoundDef> = {
  // Combat — mapped to real OGGs from Sound effects Pack 2
  sword_clash:    { src: fx('sword_clash'),    volume: 0.4 },
  arrow_fire:     { src: fx('arrow_fire', 'wav'), volume: 0.3 },
  arrow_hit:      { src: fx('arrow_hit'),      volume: 0.35 },
  magic_cast:     { src: fx('magic_cast'),     volume: 0.4 },
  fire_impact:    { src: fx('fire_impact'),    volume: 0.45 },
  thunder_strike: { src: fx('thunder'),        volume: 0.5 },
  heal_pulse:     { src: fx('heal'),           volume: 0.35 },
  cannon_fire:    { src: fx('cannon_fire'),    volume: 0.5 },
  ship_sink:      { src: fx('ship_sink'),      volume: 0.5 },

  // Units
  unit_select:    { src: fx('select'),         volume: 0.3 },
  unit_move:      { src: fx('move'),           volume: 0.25 },
  unit_death:     { src: fx('death'),          volume: 0.35 },
  hero_levelup:   { src: fx('levelup'),        volume: 0.5 },

  // Buildings
  build_start:    { src: fx('build_start'),    volume: 0.3 },
  build_complete: { src: fx('build_complete'),  volume: 0.4 },
  train_complete: { src: fx('train'),          volume: 0.35 },

  // UI
  click:          { src: fx('click'),          volume: 0.2 },
  error:          { src: fx('error'),          volume: 0.3 },
  victory:        { src: fx('victory'),        volume: 0.6 },
  defeat:         { src: fx('defeat'),         volume: 0.5 },
};

class AudioManager {
  private sounds = new Map<string, Howl>();
  private masterVolume = 0.7;
  private muted = false;

  load(id: string): Howl {
    if (this.sounds.has(id)) return this.sounds.get(id)!;
    const def = SOUND_DEFS[id];
    if (!def) {
      // Fallback silent howl
      const h = new Howl({ src: ['data:audio/mp3;base64,'], volume: 0 });
      this.sounds.set(id, h);
      return h;
    }
    const howl = new Howl({
      src: def.src,
      volume: def.volume * this.masterVolume,
      pool: def.pool ?? 4,
      preload: false, // lazy load
    });
    this.sounds.set(id, howl);
    return howl;
  }

  play(id: string): void {
    if (this.muted) return;
    const h = this.load(id);
    h.play();
  }

  setVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    Howler.volume(this.masterVolume);
  }

  mute(m: boolean): void {
    this.muted = m;
    Howler.mute(m);
  }

  getVolume(): number { return this.masterVolume; }
  isMuted(): boolean { return this.muted; }
}

// ══════════════════════════════════════════════════════════════════════════════
// Particle System (Canvas2D-based, PixiJS-compatible data format)
// ══════════════════════════════════════════════════════════════════════════════

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number; sizeEnd: number;
  color: string; alpha: number;
  rotation: number; rotSpeed: number;
  gravity: number;
}

interface ParticleEmitterConfig {
  count: number;
  lifetime: [number, number]; // min, max
  speed: [number, number];
  size: [number, number];
  sizeEnd?: number;
  color: string[];
  gravity?: number;
  spread?: number; // angle spread in radians
  direction?: number; // base angle in radians
  rotSpeed?: [number, number];
}

const EMITTER_PRESETS: Record<string, ParticleEmitterConfig> = {
  // Combat impacts
  hit_spark: {
    count: 8, lifetime: [0.15, 0.3], speed: [60, 140], size: [2, 5],
    color: ['#fff', '#ffd700', '#ff8c00'], gravity: 80, spread: Math.PI * 2,
  },
  fire_burst: {
    count: 12, lifetime: [0.3, 0.6], speed: [40, 100], size: [3, 8], sizeEnd: 0,
    color: ['#ff4500', '#ff6b00', '#ffa500', '#ff0'], gravity: -30, spread: Math.PI * 2,
  },
  ice_shatter: {
    count: 10, lifetime: [0.2, 0.5], speed: [50, 120], size: [2, 6],
    color: ['#87ceeb', '#add8e6', '#b0e0e6', '#fff'], gravity: 100, spread: Math.PI * 2,
  },
  holy_glow: {
    count: 6, lifetime: [0.4, 0.8], speed: [20, 50], size: [4, 10], sizeEnd: 0,
    color: ['#ffd700', '#fff8dc', '#fffacd'], gravity: -40, spread: Math.PI * 2,
  },
  shadow_wisp: {
    count: 8, lifetime: [0.3, 0.7], speed: [30, 80], size: [3, 7], sizeEnd: 0,
    color: ['#4b0082', '#800080', '#9400d3'], gravity: -20, spread: Math.PI * 2,
  },
  blood_splash: {
    count: 6, lifetime: [0.2, 0.4], speed: [40, 100], size: [2, 5],
    color: ['#8b0000', '#dc143c', '#b22222'], gravity: 120, spread: Math.PI, direction: -Math.PI / 2,
  },

  // Building effects
  construction_dust: {
    count: 5, lifetime: [0.5, 1.0], speed: [10, 30], size: [3, 8], sizeEnd: 0,
    color: ['#d2b48c', '#deb887', '#c4a882'], gravity: -10, spread: Math.PI * 2,
  },
  fire_damage: {
    count: 4, lifetime: [0.5, 1.2], speed: [15, 40], size: [3, 7], sizeEnd: 1,
    color: ['#ff4500', '#ff6b00', '#ffa500'], gravity: -50, spread: Math.PI / 3, direction: -Math.PI / 2,
  },
  smoke_plume: {
    count: 3, lifetime: [0.8, 1.5], speed: [10, 25], size: [5, 12], sizeEnd: 15,
    color: ['#555', '#666', '#777', '#888'], gravity: -30, spread: Math.PI / 4, direction: -Math.PI / 2,
  },

  // Hero abilities
  level_up_burst: {
    count: 20, lifetime: [0.5, 1.2], speed: [40, 120], size: [3, 8], sizeEnd: 0,
    color: ['#ffd700', '#fff', '#ffa500', '#ff0'], gravity: -60, spread: Math.PI * 2,
  },
  teleport_swirl: {
    count: 15, lifetime: [0.3, 0.8], speed: [50, 100], size: [2, 6], sizeEnd: 0,
    color: ['#7b68ee', '#6a5acd', '#9370db'], gravity: 0, spread: Math.PI * 2,
    rotSpeed: [2, 6],
  },
  death_explosion: {
    count: 16, lifetime: [0.3, 0.7], speed: [60, 150], size: [3, 9], sizeEnd: 0,
    color: ['#ff0', '#ff4500', '#ff6b00', '#fff'], gravity: 40, spread: Math.PI * 2,
  },
};

class ParticleManager {
  private particles: Particle[] = [];

  emit(preset: string, pos: Vec2): void {
    const cfg = EMITTER_PRESETS[preset];
    if (!cfg) return;
    for (let i = 0; i < cfg.count; i++) {
      const angle = (cfg.direction ?? 0) + (Math.random() - 0.5) * (cfg.spread ?? Math.PI * 2);
      const speed = cfg.speed[0] + Math.random() * (cfg.speed[1] - cfg.speed[0]);
      const life = cfg.lifetime[0] + Math.random() * (cfg.lifetime[1] - cfg.lifetime[0]);
      const size = cfg.size[0] + Math.random() * (cfg.size[1] - cfg.size[0]);
      const rotSpeed = cfg.rotSpeed ? cfg.rotSpeed[0] + Math.random() * (cfg.rotSpeed[1] - cfg.rotSpeed[0]) : 0;
      this.particles.push({
        x: pos.x, y: pos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life, maxLife: life,
        size, sizeEnd: cfg.sizeEnd ?? size * 0.3,
        color: cfg.color[Math.floor(Math.random() * cfg.color.length)],
        alpha: 1, rotation: Math.random() * Math.PI * 2,
        rotSpeed,
        gravity: cfg.gravity ?? 0,
      });
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.rotSpeed * dt;
      const t = 1 - p.life / p.maxLife;
      p.alpha = 1 - t;
      p.size = p.size + (p.sizeEnd - p.size) * t;
    }
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number): void {
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate((p.x - camX) * zoom, (p.y - camY) * zoom);
      ctx.rotate(p.rotation);
      const s = p.size * zoom;
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  get count(): number { return this.particles.length; }
}

// ══════════════════════════════════════════════════════════════════════════════
// Screen Effects (GSAP-powered)
// ══════════════════════════════════════════════════════════════════════════════

class ScreenFX {
  /** Camera shake — displaces camera temporarily */
  shakeCamera(state: GameState, intensity = 4, durationMs = 200): void {
    const origX = state.camera.x;
    const origY = state.camera.y;
    const tl = gsap.timeline();
    const steps = Math.floor(durationMs / 30);
    for (let i = 0; i < steps; i++) {
      tl.to(state.camera, {
        x: origX + (Math.random() - 0.5) * intensity * 2,
        y: origY + (Math.random() - 0.5) * intensity * 2,
        duration: 0.03,
        ease: 'none',
      });
    }
    tl.to(state.camera, { x: origX, y: origY, duration: 0.05, ease: 'power2.out' });
  }

  /** Flash overlay — brief color flash on canvas */
  flashOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, color = 'rgba(255,255,255,0.3)', durationMs = 100): void {
    const obj = { alpha: 0.3 };
    ctx.fillStyle = color;
    ctx.globalAlpha = obj.alpha;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    gsap.to(obj, {
      alpha: 0,
      duration: durationMs / 1000,
      ease: 'power2.out',
    });
  }

  /** Zoom pulse — brief zoom in/out effect */
  zoomPulse(state: GameState, scale = 1.05, durationMs = 300): void {
    const origZoom = state.zoom;
    gsap.to(state, {
      zoom: origZoom * scale,
      duration: durationMs / 2000,
      ease: 'power2.out',
      yoyo: true,
      repeat: 1,
      onComplete: () => { state.zoom = origZoom; },
    });
  }

  /** Slow-motion effect — temporarily reduces game speed */
  slowMotion(callback: (speed: number) => void, durationMs = 500, slowFactor = 0.3): void {
    callback(slowFactor);
    gsap.delayedCall(durationMs / 1000, () => callback(1.0));
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Tween Manager (smooth value interpolation)
// ══════════════════════════════════════════════════════════════════════════════

class TweenManager {
  update(): void {
    TWEEN.update();
  }

  /** Smooth number interpolation */
  tween(obj: Record<string, number>, target: Record<string, number>, durationMs: number, easing = TWEEN.Easing.Quadratic.Out): void {
    new TWEEN.Tween(obj).to(target, durationMs).easing(easing).start();
  }

  /** Bounce tween for UI elements */
  bounce(obj: { scale: number }, targetScale: number, durationMs = 300): void {
    new TWEEN.Tween(obj)
      .to({ scale: targetScale }, durationMs)
      .easing(TWEEN.Easing.Elastic.Out)
      .start();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Projectile FX mapping (visual style → particle preset + sound)
// ══════════════════════════════════════════════════════════════════════════════

const PROJECTILE_HIT_FX: Record<string, { particles: string; sound: string }> = {
  arrow:   { particles: 'hit_spark',    sound: 'arrow_hit' },
  bolt:    { particles: 'hit_spark',    sound: 'arrow_hit' },
  holy:    { particles: 'holy_glow',    sound: 'heal_pulse' },
  energy:  { particles: 'hit_spark',    sound: 'magic_cast' },
  fire:    { particles: 'fire_burst',   sound: 'fire_impact' },
  water:   { particles: 'ice_shatter',  sound: 'magic_cast' },
  thunder: { particles: 'hit_spark',    sound: 'thunder_strike' },
  shadow:  { particles: 'shadow_wisp',  sound: 'magic_cast' },
  none:    { particles: 'hit_spark',    sound: 'sword_clash' },
};

// ══════════════════════════════════════════════════════════════════════════════
// Main FX Controller (singleton)
// ══════════════════════════════════════════════════════════════════════════════

class FxController {
  readonly audio = new AudioManager();
  readonly particles = new ParticleManager();
  readonly screen = new ScreenFX();
  readonly tweens = new TweenManager();

  /** Play a hit effect at position — particles + sound based on projectile style */
  playHit(pos: Vec2, projectileStyle: string, state?: GameState): void {
    const fx = PROJECTILE_HIT_FX[projectileStyle] ?? PROJECTILE_HIT_FX['none'];
    this.particles.emit(fx.particles, pos);
    this.audio.play(fx.sound);
    // Small screen shake for big hits
    if (state && (projectileStyle === 'fire' || projectileStyle === 'thunder')) {
      this.screen.shakeCamera(state, 2, 100);
    }
  }

  /** Play death effect */
  playDeath(pos: Vec2, isHero: boolean, state?: GameState): void {
    this.particles.emit(isHero ? 'death_explosion' : 'blood_splash', pos);
    this.audio.play('unit_death');
    if (isHero && state) {
      this.screen.shakeCamera(state, 6, 300);
    }
  }

  /** Play level up */
  playLevelUp(pos: Vec2): void {
    this.particles.emit('level_up_burst', pos);
    this.audio.play('hero_levelup');
  }

  /** Play building damage (ongoing) */
  playBuildingDamage(pos: Vec2, hpPct: number): void {
    if (hpPct < 0.25) {
      this.particles.emit('smoke_plume', pos);
      this.particles.emit('fire_damage', pos);
    } else if (hpPct < 0.5) {
      this.particles.emit('fire_damage', pos);
    }
  }

  /** Play construction dust */
  playConstruction(pos: Vec2): void {
    this.particles.emit('construction_dust', pos);
  }

  /** Update all systems — call once per frame */
  update(dt: number): void {
    this.particles.update(dt);
    this.tweens.update();
  }

  /** Render particles — call after main game render */
  renderParticles(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number): void {
    this.particles.render(ctx, camX, camY, zoom);
  }
}

// ── Singleton export ────────────────────────────────────────────────────────────

export const fxController = new FxController();

// Re-export for direct access
export { EMITTER_PRESETS, SOUND_DEFS, PROJECTILE_HIT_FX };
export type { ParticleEmitterConfig, SoundDef };
