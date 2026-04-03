// ── SpriteLoader — Production sprite loading from ObjectStore CDN ──────────────
//
// Best practices implemented:
//   1. Load state tracking: pending → loading → loaded | failed
//   2. Retry with exponential backoff (max 3 retries)
//   3. Priority preloading: heroes > units > buildings > VFX
//   4. Concurrent load throttling (max 6 parallel downloads)
//   5. Global load progress for UI (loading screen)
//   6. Error tracking — failed URLs don't retry forever
//   7. crossOrigin='anonymous' for CDN CORS
//   8. Cache stats for debugging
//

import type { UnitType, BuildingType } from './types';
import { getUnitSprites, getBuildingSprite, UNIT_CONFIGS, BUILDING_CONFIGS, HERO_CONFIGS } from './constants';
import { VFX_CONFIGS } from './vfx';

// ── Load states ─────────────────────────────────────────────────────────────────

type LoadState = 'pending' | 'loading' | 'loaded' | 'failed';

interface CacheEntry {
  img: HTMLImageElement;
  state: LoadState;
  retries: number;
  lastAttempt: number;
  priority: number;  // lower = higher priority
}

// ── Constants ───────────────────────────────────────────────────────────────────

const MAX_CONCURRENT = 6;
const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = [1000, 3000, 8000];  // exponential backoff
const CDN_BASE = 'https://molochdagod.github.io/ObjectStore';

// ── Priority tiers ──────────────────────────────────────────────────────────────

export const PRIORITY = {
  HERO:      0,   // Load first
  UNIT:      1,   // Active gameplay units
  BUILDING:  2,   // Building sprites
  VFX:       3,   // Hit/cast effects
  CREEP:     4,   // Neutral creeps
  AMBIENT:   5,   // Animals, ambient
} as const;

// ── SpriteLoader singleton ──────────────────────────────────────────────────────

class SpriteLoader {
  private cache = new Map<string, CacheEntry>();
  private loadQueue: string[] = [];
  private activeLoads = 0;

  // ── Stats ───────────────────────────────────────────────────────────────────
  private _totalQueued = 0;
  private _totalLoaded = 0;
  private _totalFailed = 0;

  /** Get an image if it's fully loaded, otherwise return null and trigger loading */
  get(src: string, priority = PRIORITY.UNIT): HTMLImageElement | null {
    const entry = this.cache.get(src);

    if (entry) {
      if (entry.state === 'loaded' && entry.img.complete && entry.img.naturalWidth > 0) {
        return entry.img;
      }
      if (entry.state === 'failed') {
        // Check if retry is available
        if (entry.retries < MAX_RETRIES) {
          const backoff = RETRY_BACKOFF_MS[Math.min(entry.retries, RETRY_BACKOFF_MS.length - 1)];
          if (Date.now() - entry.lastAttempt > backoff) {
            this.enqueue(src, priority);
          }
        }
        return null;
      }
      // Still loading
      return null;
    }

    // Not in cache at all — create entry and start loading
    this.createEntry(src, priority);
    this.enqueue(src, priority);
    return null;
  }

  /** Preload a batch of URLs with a given priority. Non-blocking. */
  preload(urls: string[], priority = PRIORITY.UNIT): void {
    for (const src of urls) {
      if (!this.cache.has(src)) {
        this.createEntry(src, priority);
      }
      const entry = this.cache.get(src)!;
      if (entry.state === 'pending') {
        this.enqueue(src, priority);
      }
    }
  }

  /** Preload all game sprites grouped by priority */
  preloadAll(): void {
    const heroUrls: string[] = [];
    const unitUrls: string[] = [];
    const buildingUrls: string[] = [];
    const vfxUrls: string[] = [];
    const creepUrls: string[] = [];

    // Heroes
    for (const hero of HERO_CONFIGS) {
      const sprites = getUnitSprites('blue', hero.type);
      for (const cfg of Object.values(sprites)) {
        heroUrls.push(cfg.src);
      }
    }

    // Trainable units
    const trainableUnits = new Set<string>();
    for (const cfg of Object.values(BUILDING_CONFIGS)) {
      for (const ut of cfg.trains) trainableUnits.add(ut);
    }
    for (const ut of trainableUnits) {
      const sprites = getUnitSprites('blue', ut as UnitType);
      for (const cfg of Object.values(sprites)) unitUrls.push(cfg.src);
      const redSprites = getUnitSprites('red', ut as UnitType);
      for (const cfg of Object.values(redSprites)) unitUrls.push(cfg.src);
    }

    // Buildings
    for (const bType of Object.keys(BUILDING_CONFIGS) as BuildingType[]) {
      for (const faction of ['blue', 'red', 'neutral'] as const) {
        const spr = getBuildingSprite(faction, bType);
        if (spr) buildingUrls.push(spr.sheet);
      }
    }

    // VFX
    for (const cfg of Object.values(VFX_CONFIGS)) {
      vfxUrls.push(cfg.src);
    }

    // Creep-only units (0 food cost, not trainable)
    for (const [key, cfg] of Object.entries(UNIT_CONFIGS)) {
      if (cfg.foodCost === 0 && !trainableUnits.has(key)) {
        const sprites = getUnitSprites('red', key as UnitType);
        for (const s of Object.values(sprites)) creepUrls.push(s.src);
      }
    }

    // Deduplicate each set
    this.preload([...new Set(heroUrls)], PRIORITY.HERO);
    this.preload([...new Set(unitUrls)], PRIORITY.UNIT);
    this.preload([...new Set(buildingUrls)], PRIORITY.BUILDING);
    this.preload([...new Set(vfxUrls)], PRIORITY.VFX);
    this.preload([...new Set(creepUrls)], PRIORITY.CREEP);
  }

  // ── Progress API ──────────────────────────────────────────────────────────────

  get totalQueued() { return this._totalQueued; }
  get totalLoaded() { return this._totalLoaded; }
  get totalFailed() { return this._totalFailed; }
  get pending() { return this._totalQueued - this._totalLoaded - this._totalFailed; }

  /** 0-1 progress value (1 = all done) */
  get progress(): number {
    if (this._totalQueued === 0) return 1;
    return (this._totalLoaded + this._totalFailed) / this._totalQueued;
  }

  get isLoading(): boolean {
    return this.activeLoads > 0 || this.loadQueue.length > 0;
  }

  /** Human-readable cache stats */
  getStats(): { cached: number; loading: number; failed: number; queueSize: number } {
    let cached = 0, loading = 0, failed = 0;
    for (const e of this.cache.values()) {
      if (e.state === 'loaded') cached++;
      else if (e.state === 'loading') loading++;
      else if (e.state === 'failed') failed++;
    }
    return { cached, loading, failed, queueSize: this.loadQueue.length };
  }

  /** Clear entire cache (useful for hot reload / testing) */
  clear(): void {
    this.cache.clear();
    this.loadQueue = [];
    this.activeLoads = 0;
    this._totalQueued = 0;
    this._totalLoaded = 0;
    this._totalFailed = 0;
  }

  // ── Internals ─────────────────────────────────────────────────────────────────

  private createEntry(src: string, priority: number): void {
    if (this.cache.has(src)) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    this.cache.set(src, {
      img,
      state: 'pending',
      retries: 0,
      lastAttempt: 0,
      priority,
    });
  }

  private enqueue(src: string, priority: number): void {
    const entry = this.cache.get(src);
    if (!entry || entry.state === 'loading' || entry.state === 'loaded') return;

    entry.priority = Math.min(entry.priority, priority);
    if (!this.loadQueue.includes(src)) {
      this.loadQueue.push(src);
      this._totalQueued++;
    }
    // Sort queue by priority (lower = first)
    this.loadQueue.sort((a, b) => {
      const pa = this.cache.get(a)?.priority ?? 99;
      const pb = this.cache.get(b)?.priority ?? 99;
      return pa - pb;
    });
    this.processQueue();
  }

  private processQueue(): void {
    while (this.activeLoads < MAX_CONCURRENT && this.loadQueue.length > 0) {
      const src = this.loadQueue.shift()!;
      const entry = this.cache.get(src);
      if (!entry || entry.state === 'loaded') continue;

      entry.state = 'loading';
      entry.lastAttempt = Date.now();
      this.activeLoads++;

      entry.img.onload = () => {
        entry.state = 'loaded';
        this.activeLoads--;
        this._totalLoaded++;
        this.processQueue();
      };

      entry.img.onerror = () => {
        entry.retries++;
        this.activeLoads--;
        if (entry.retries >= MAX_RETRIES) {
          entry.state = 'failed';
          this._totalFailed++;
          if (import.meta.env.DEV) {
            console.warn(`[SpriteLoader] Failed after ${MAX_RETRIES} retries: ${src}`);
          }
        } else {
          entry.state = 'pending';
          // Re-enqueue with backoff (handled by get() on next access)
        }
        this.processQueue();
      };

      // Start the actual load
      entry.img.src = src;
    }
  }
}

// ── Singleton export ────────────────────────────────────────────────────────────

export const spriteLoader = new SpriteLoader();
