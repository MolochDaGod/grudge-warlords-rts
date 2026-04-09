import { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Play, RotateCcw, Home } from 'lucide-react';
import {
  createInitialState, updateGame,
  commandMove, commandAttack, commandHarvest, commandBuild,
  commandTrain, commandSummonHero, commandUpgradeTownHall,
  commandStop, commandHold, commandAttackMove,
  commandCastAbility, commandRankUpAbility,
} from '@/lib/rts-engine/engine';
import { renderGame } from '@/lib/rts-engine/renderer';
import { MAPS } from '@/lib/rts-engine/maps';
import { fxController } from '@/lib/rts-engine/fx-controller';
import { BUILDING_CONFIGS, ABILITY_DEFS } from '@/lib/rts-engine/constants';
import { spriteLoader } from '@/lib/rts-engine/sprite-loader';
import { GameHUD } from '@/components/game-hud/GameHUD';
import type { GameState, Vec2, BuildingType, UnitType } from '@/lib/rts-engine/types';

type GamePhase = 'menu' | 'loading' | 'playing' | 'paused';

const EDGE_SCROLL_ZONE = 30;
const EDGE_SCROLL_SPEED = 12;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2.5;

// ── Game-over overlay — separate component to keep clean JSX ─────────────────
function GameOverlay({ result, onReturn }: {
  result: 'playing' | 'won' | 'lost';
  onReturn: () => void;
}) {
  if (result === 'won') {
    return (
      <div className= "absolute inset-0 bg-black/75 z-50 flex items-center justify-center pointer-events-auto" >
      <div className="text-center" >
        <div className="text-7xl mb-4" >🏆</div>
      < h2 className = "text-5xl font-black text-amber-400 mb-3" > VICTORY! </h2>
        < p className = "text-zinc-300 text-lg mb-8" > Your castle stands supreme.</p>
              < Button size = "lg" className = "bg-amber-600 hover:bg-amber-500 text-white px-10 font-bold" onClick = { onReturn } >
                Return to Menu
                  </Button>
                  </div>
                  </div>
    );
  }
  if (result === 'lost') {
    return (
      <div className= "absolute inset-0 bg-black/85 z-50 flex items-center justify-center pointer-events-auto" >
      <div className="text-center" >
        <div className="text-7xl mb-4" >💀</div>
      < h2 className = "text-5xl font-black text-red-500 mb-3" > DEFEATED </h2>
        < p className = "text-zinc-300 text-lg mb-8" > Your castle has fallen.</p>
              < Button size = "lg" className = "bg-red-700 hover:bg-red-600 text-white px-10 font-bold" onClick = { onReturn } >
                Return to Menu
                  </Button>
                  </div>
                  </div>
    );
  }
  return null;
}

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const animRef = useRef(0);
  const lastTimeRef = useRef(0);
  const canvasSizeRef = useRef({ w: 1200, h: 700 });
  const mouseRef = useRef({ x: 0, y: 0, inCanvas: false });
  const lastClickRef = useRef({ time: 0, unitType: '' });
  const prevGameResultRef = useRef<'playing' | 'won' | 'lost'>('playing');

  const [phase, setPhase] = useState<GamePhase>('menu');
  const [gameResult, setGameResult] = useState<'playing' | 'won' | 'lost'>('playing');
  const [selectedMap, setSelectedMap] = useState(0);
  const [selectedFaction, setSelectedFaction] = useState<'kingdom' | 'legion'>('kingdom');
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [buildMode, setBuildMode] = useState<BuildingType | null>(null);
  const [attackMoveMode, setAttackMoveMode] = useState(false);
  const [abilityMode, setAbilityMode] = useState<{ heroId: string; abilityIdx: number } | null>(null);
  const [buildMenuOpen, setBuildMenuOpen] = useState(false);
  const [fps, setFps] = useState(0);
  const [loadProgress, setLoadProgress] = useState(0);
  const [hudTick, setHudTick] = useState(0);

  // ── Responsive canvas sizing ──────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const w = Math.floor(width);
        const h = Math.floor(height);
        canvasSizeRef.current = { w, h };
        const canvas = canvasRef.current;
        if (canvas) { canvas.width = w; canvas.height = h; }
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [phase]);

  // ── Start game (with preload phase) ────────────────────────────────────────
  const startGame = useCallback(() => {
    // Reset game result state so no stale overlay appears on new game
    prevGameResultRef.current = 'playing';
    setGameResult('playing');
    // Trigger sprite preload and enter loading phase
    spriteLoader.preloadAll();
    setPhase('loading');
    setLoadProgress(0);
    const mapDef = MAPS[selectedMap];
    stateRef.current = createInitialState(mapDef, selectedFaction);
    // Apply difficulty modifiers
    if (stateRef.current) {
      const ai = stateRef.current.aiState;
      if (difficulty === 'easy') {
        ai.aiAttackInterval = (ai.aiAttackInterval ?? 90) * 2;
        stateRef.current.enemyResources.gold = Math.round(stateRef.current.enemyResources.gold * 0.6);
        stateRef.current.enemyResources.wood = Math.round(stateRef.current.enemyResources.wood * 0.6);
      } else if (difficulty === 'hard') {
        ai.aiAttackInterval = (ai.aiAttackInterval ?? 90) * 0.55;
        stateRef.current.enemyResources.gold += 400;
        stateRef.current.enemyResources.wood += 150;
      }
    }
    lastTimeRef.current = performance.now();
    setBuildMode(null);
    setAttackMoveMode(false);
    setAbilityMode(null);
    setBuildMenuOpen(false);
  }, [selectedMap, selectedFaction, difficulty]);

  // ── Loading phase: poll progress until enough assets are loaded ────────────
  useEffect(() => {
    if (phase !== 'loading') return;
    const poll = setInterval(() => {
      const p = spriteLoader.progress;
      setLoadProgress(p);
      // Start playing once 60% loaded (heroes + units + buildings ready)
      // Remaining VFX/creeps continue loading in background
      if (p >= 0.6 || !spriteLoader.isLoading) {
        clearInterval(poll);
        setPhase('playing');
      }
    }, 100);
    return () => clearInterval(poll);
  }, [phase]);

  // ── Game loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let fpsCounter = 0;
    let fpsTimer = 0;
    let hudFrame = 0;

    const loop = (now: number) => {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = now;
      const { w, h } = canvasSizeRef.current;

      if (stateRef.current) {
        // Edge-scroll
        if (mouseRef.current.inCanvas) {
          const mx = mouseRef.current.x;
          const my = mouseRef.current.y;
          if (mx < EDGE_SCROLL_ZONE) stateRef.current.camera.x -= EDGE_SCROLL_SPEED;
          if (mx > w - EDGE_SCROLL_ZONE) stateRef.current.camera.x += EDGE_SCROLL_SPEED;
          if (my < EDGE_SCROLL_ZONE) stateRef.current.camera.y -= EDGE_SCROLL_SPEED;
          if (my > h - EDGE_SCROLL_ZONE) stateRef.current.camera.y += EDGE_SCROLL_SPEED;
        }
        for (const [, u] of stateRef.current.units) {
          if (u.state !== 'dead') u.anim.elapsed += dt;
        }
        updateGame(stateRef.current, dt);
        fxController.update(dt);
        renderGame(ctx, stateRef.current, w, h, dt);
        fxController.renderParticles(ctx, stateRef.current.camera.x, stateRef.current.camera.y, stateRef.current.zoom);
        // Detect win / loss — only fire setGameResult once per transition
        const gs = stateRef.current.gameStatus;
        if ((gs === 'won' || gs === 'lost') && gs !== prevGameResultRef.current) {
          prevGameResultRef.current = gs;
          setGameResult(gs);
        }
      }
      fpsCounter++;
      fpsTimer += dt;
      if (fpsTimer >= 1) { setFps(fpsCounter); fpsCounter = 0; fpsTimer = 0; }
      hudFrame++;
      if (hudFrame >= 6) { hudFrame = 0; setHudTick(t => (t + 1) & 255); }
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [phase]);

  // ── Screen → world ─────────────────────────────────────────────────────────
  const screenToWorld = useCallback((e: React.MouseEvent): Vec2 => {
    const canvas = canvasRef.current;
    if (!canvas || !stateRef.current) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { camera, zoom } = stateRef.current;
    return { x: sx / zoom + camera.x, y: sy / zoom + camera.y };
  }, []);

  // ── Minimap hit test ───────────────────────────────────────────────────────
  const isMinimapClick = useCallback((e: React.MouseEvent): Vec2 | null => {
    if (!stateRef.current) return null;
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { w, h } = canvasSizeRef.current;
    const mw = 176, mh = 110, mx = w - mw - 8, my = h - mh - 8;
    if (sx >= mx && sx <= mx + mw && sy >= my && sy <= my + mh) {
      let worldW = 3600, worldH = 2100;
      for (const isl of stateRef.current.islands) {
        worldW = Math.max(worldW, isl.x + isl.w + 100);
        worldH = Math.max(worldH, isl.y + isl.h + 100);
      }
      return { x: ((sx - mx) / mw) * worldW, y: ((sy - my) / mh) * worldH };
    }
    return null;
  }, []);

  // ── Mouse down ─────────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!stateRef.current || phase !== 'playing') return;
    const state = stateRef.current;
    const world = screenToWorld(e);

    if (e.button === 0) {
      const minimapPos = isMinimapClick(e);
      if (minimapPos) {
        const { w, h } = canvasSizeRef.current;
        state.camera.x = minimapPos.x - (w / state.zoom) / 2;
        state.camera.y = minimapPos.y - (h / state.zoom) / 2;
        return;
      }
      if (attackMoveMode) { commandAttackMove(state, world); setAttackMoveMode(false); return; }
      if (abilityMode) {
        const { heroId, abilityIdx } = abilityMode;
        const hero = state.units.get(heroId);
        if (hero) {
          // Check if clicking a unit target
          let targetUnitId: string | undefined;
          for (const [, u] of state.units) {
            if (u.state !== 'dead' && Math.hypot(u.pos.x - world.x, u.pos.y - world.y) < 24) {
              targetUnitId = u.id;
              break;
            }
          }
          commandCastAbility(state, heroId, abilityIdx, world, targetUnitId);
        }
        setAbilityMode(null);
        return;
      }
      if (buildMode) { commandBuild(state, buildMode, world); setBuildMode(null); setBuildMenuOpen(false); return; }
      state.dragStart = { ...world };
      state.dragEnd = { ...world };
    }

    if (e.button === 2) {
      e.preventDefault();
      if (state.selected.size === 0) return;
      for (const [, u] of state.units) {
        if (u.state === 'dead') continue;
        if (Math.hypot(u.pos.x - world.x, u.pos.y - world.y) < 24 && u.faction !== 'blue') {
          commandAttack(state, u.id); return;
        }
      }
      for (const [, r] of state.resources) {
        if (r.amount <= 0) continue;
        if (Math.hypot(r.pos.x - world.x, r.pos.y - world.y) < 40) { commandHarvest(state, r.id); return; }
      }
      commandMove(state, world);
    }
  }, [phase, buildMode, attackMoveMode, abilityMode, screenToWorld, isMinimapClick]);

  // ── Mouse move ─────────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, inCanvas: true };
    }
    if (!stateRef.current) return;
    const minimapPos = isMinimapClick(e);
    if (minimapPos && e.buttons === 1) {
      const { w, h } = canvasSizeRef.current;
      stateRef.current.camera.x = minimapPos.x - (w / stateRef.current.zoom) / 2;
      stateRef.current.camera.y = minimapPos.y - (h / stateRef.current.zoom) / 2;
      return;
    }
    if (stateRef.current.dragStart) stateRef.current.dragEnd = screenToWorld(e);
  }, [screenToWorld, isMinimapClick]);

  // ── Mouse up ───────────────────────────────────────────────────────────────
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!stateRef.current) return;
    const state = stateRef.current;
    if (e.button === 0 && state.dragStart && state.dragEnd) {
      const x1 = Math.min(state.dragStart.x, state.dragEnd.x);
      const y1 = Math.min(state.dragStart.y, state.dragEnd.y);
      const x2 = Math.max(state.dragStart.x, state.dragEnd.x);
      const y2 = Math.max(state.dragStart.y, state.dragEnd.y);
      const boxW = x2 - x1, boxH = y2 - y1;

      for (const [, u] of state.units) u.selected = false;
      state.selected.clear();
      state.selectedBuildingId = null;

      const world = screenToWorld(e);
      if (boxW < 5 && boxH < 5) {
        // Click — try building selection
        for (const [, b] of state.buildings) {
          if (b.faction !== 'blue' || b.underConstruction) continue;
          const cfg = BUILDING_CONFIGS[b.type as keyof typeof BUILDING_CONFIGS];
          if (!cfg) continue;
          if (world.x >= b.pos.x && world.x <= b.pos.x + cfg.w && world.y >= b.pos.y && world.y <= b.pos.y + cfg.h) {
            state.selectedBuildingId = b.id;
            state.dragStart = null; state.dragEnd = null;
            return;
          }
        }
        // Click — unit selection
        for (const [, u] of state.units) {
          if (u.faction === 'blue' && u.state !== 'dead' && Math.hypot(u.pos.x - world.x, u.pos.y - world.y) < 24) {
            u.selected = true;
            state.selected.add(u.id);
            // Double-click: select all visible same type
            const now = Date.now();
            if (now - lastClickRef.current.time < 400 && lastClickRef.current.unitType === u.type) {
              const { camera, zoom } = state;
              const { w, h } = canvasSizeRef.current;
              for (const [, o] of state.units) {
                if (o.faction === 'blue' && o.type === u.type && o.state !== 'dead') {
                  const sx = (o.pos.x - camera.x) * zoom, sy = (o.pos.y - camera.y) * zoom;
                  if (sx >= 0 && sx <= w && sy >= 0 && sy <= h) { o.selected = true; state.selected.add(o.id); }
                }
              }
            }
            lastClickRef.current = { time: Date.now(), unitType: u.type };
            break;
          }
        }
      } else {
        for (const [, u] of state.units) {
          if (u.faction === 'blue' && u.state !== 'dead' && u.pos.x >= x1 && u.pos.x <= x2 && u.pos.y >= y1 && u.pos.y <= y2) {
            u.selected = true; state.selected.add(u.id);
          }
        }
      }
      state.dragStart = null; state.dragEnd = null;
    }
  }, [screenToWorld]);

  const handleMouseLeave = useCallback(() => { mouseRef.current.inCanvas = false; }, []);

  // ── Scroll wheel zoom ──────────────────────────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!stateRef.current) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.92 : 1.08;
    stateRef.current.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, stateRef.current.zoom * delta));
  }, []);

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    const keys = new Set<string>();

    const onKeyDown = (e: KeyboardEvent) => {
      keys.add(e.key);
      if (!stateRef.current) return;
      const state = stateRef.current;

      if (e.key === 'Escape') {
        if (buildMode || attackMoveMode || abilityMode) {
          setBuildMode(null); setAttackMoveMode(false); setAbilityMode(null); setBuildMenuOpen(false);
        } else if (phase === 'playing') {
          setPhase('paused');
        } else if (phase === 'paused') {
          setPhase('playing');
        }
        return;
      }
      if (phase === 'paused') return;

      // Build menu sub-keys
      if (buildMenuOpen) {
        e.preventDefault();
        const map: Record<string, BuildingType> = { b: 'barracks', h: 'house', t: 'tower', a: 'altar', k: 'blacksmith', r: 'archery', c: 'chapel', w: 'workshop', d: 'docks' };
        const bt = map[e.key.toLowerCase()];
        if (bt) { setBuildMode(bt); setBuildMenuOpen(false); }
        if (e.key === 'Escape') setBuildMenuOpen(false);
        return;
      }

      if (e.key.toLowerCase() === 's' && !e.ctrlKey) { commandStop(state); return; }
      if (e.key.toLowerCase() === 'a' && !e.ctrlKey) { setAttackMoveMode(true); return; }
      if (e.key.toLowerCase() === 'h' && !e.ctrlKey) { commandHold(state); return; }
      if (e.key.toLowerCase() === 'b' && !e.ctrlKey) {
        if ([...state.selected].some(id => { const u = state.units.get(id); return u && u.role === 'worker'; })) {
          setBuildMenuOpen(true); return;
        }
      }
      if (e.key.toLowerCase() === 'u') { commandUpgradeTownHall(state); return; }
      // Q/W/E/R — cast hero abilities
      if (!e.ctrlKey && 'qwer'.includes(e.key.toLowerCase()) && e.key.length === 1) {
        const abilityIdx = 'qwer'.indexOf(e.key.toLowerCase());
        const heroes = [...state.selected].map(id => state.units.get(id)).filter(
          (u): u is NonNullable<typeof u> => !!(u?.isHero && u.state !== 'dead')
        );
        if (heroes.length > 0) {
          handleHUDCastAbility(heroes[0].id, abilityIdx);
        }
        return;
      }

      // Ctrl+1-9 assign group
      if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        state.controlGroups[parseInt(e.key)] = new Set(state.selected);
        return;
      }
      // 1-9 recall group
      if (!e.ctrlKey && e.key >= '1' && e.key <= '9') {
        const g = state.controlGroups[parseInt(e.key)];
        if (g && g.size > 0) {
          for (const [, u] of state.units) u.selected = false;
          state.selected.clear(); state.selectedBuildingId = null;
          let cx = 0, cy = 0, n = 0;
          for (const uid of g) {
            const u = state.units.get(uid);
            if (u && u.state !== 'dead') { u.selected = true; state.selected.add(uid); cx += u.pos.x; cy += u.pos.y; n++; }
          }
          if (n > 0) {
            const { w, h } = canvasSizeRef.current;
            state.camera.x = cx / n - (w / state.zoom) / 2;
            state.camera.y = cy / n - (h / state.zoom) / 2;
          }
          return;
        }
      }
      // F1-F3 hero select
      if (e.key === 'F1' || e.key === 'F2' || e.key === 'F3') {
        e.preventDefault();
        const heroes = [...state.units.values()].filter(u => u.faction === 'blue' && u.isHero && u.state !== 'dead');
        const idx = parseInt(e.key.slice(1)) - 1;
        if (idx < heroes.length) {
          for (const [, u] of state.units) u.selected = false;
          state.selected.clear(); state.selectedBuildingId = null;
          const hero = heroes[idx]; hero.selected = true; state.selected.add(hero.id);
          const { w, h } = canvasSizeRef.current;
          state.camera.x = hero.pos.x - (w / state.zoom) / 2;
          state.camera.y = hero.pos.y - (h / state.zoom) / 2;
        }
        return;
      }
      // Space = last event
      if (e.key === ' ') {
        e.preventDefault();
        if (state.lastEventPos) {
          const { w, h } = canvasSizeRef.current;
          state.camera.x = state.lastEventPos.x - (w / state.zoom) / 2;
          state.camera.y = state.lastEventPos.y - (h / state.zoom) / 2;
        }
        return;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key);

    const panInterval = setInterval(() => {
      if (!stateRef.current) return;
      const spd = 10;
      if (keys.has('ArrowLeft')) stateRef.current.camera.x -= spd;
      if (keys.has('ArrowRight')) stateRef.current.camera.x += spd;
      if (keys.has('ArrowUp')) stateRef.current.camera.y -= spd;
      if (keys.has('ArrowDown')) stateRef.current.camera.y += spd;
    }, 16);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); clearInterval(panInterval); };
  }, [phase, buildMenuOpen, buildMode, attackMoveMode, abilityMode, handleHUDCastAbility]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => e.preventDefault(), []);

  // ── HUD + menu-return handlers — must be declared BEFORE any early returns ───
  const handleHUDBuild = useCallback((bt: BuildingType) => {
    setBuildMode(bt);
    setBuildMenuOpen(false);
  }, []);

  const handleHUDTrain = useCallback((buildingId: string, unitType: UnitType) => {
    if (stateRef.current) commandTrain(stateRef.current, buildingId, unitType);
  }, []);

  const handleHUDSummonHero = useCallback((heroType: UnitType) => {
    if (stateRef.current) commandSummonHero(stateRef.current, heroType);
  }, []);

  const handleHUDStop = useCallback(() => {
    if (stateRef.current) commandStop(stateRef.current);
  }, []);

  const handleHUDHold = useCallback(() => {
    if (stateRef.current) commandHold(stateRef.current);
  }, []);

  const handleHUDAttackMove = useCallback(() => {
    setAttackMoveMode(true);
  }, []);

  const handleHUDCastAbility = useCallback((heroId: string, abilityIdx: number) => {
    if (!stateRef.current) return;
    const state = stateRef.current;
    const hero = state.units.get(heroId);
    if (!hero) return;
    const ab = hero.abilities[abilityIdx];
    if (!ab) return;
    const def = ABILITY_DEFS[ab.abilityId];
    if (!def || ab.rank === 0) return;
    // Abilities that need a target → enter ability targeting mode
    if (def.targetType === 'point' || def.targetType === 'unit') {
      setAbilityMode({ heroId, abilityIdx });
    } else {
      // Self / no-target — cast immediately
      commandCastAbility(state, heroId, abilityIdx);
    }
  }, []);

  const handleHUDRankUpAbility = useCallback((heroId: string, abilityIdx: number) => {
    if (stateRef.current) commandRankUpAbility(stateRef.current, heroId, abilityIdx);
  }, []);

  const handleMenuReturn = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    prevGameResultRef.current = 'playing';
    setGameResult('playing');
    setPhase('menu');
  }, []);

  // ══════════════════════════════════════════════════════════════════════════════
  // MENU
  // ══════════════════════════════════════════════════════════════════════════════
  if (phase === 'menu') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white p-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #2d8a9e 0%, #3a9fbf 30%, #4db8d1 70%, #3a9fbf 100%)' }}>
        {/* Decorative water shimmer */}
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: 'radial-gradient(ellipse 80px 20px at 50% 50%, #fff 0%, transparent 70%)',
          backgroundSize: '120px 80px',
          animation: 'none',
        }} />

        {/* Title badge — shield style inspired by Tiny Swords */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-600 to-zinc-800 rounded-2xl transform rotate-1 scale-105 opacity-40" />
          <div className="relative bg-gradient-to-b from-zinc-700/90 to-zinc-800/90 border-2 border-zinc-500/50 rounded-2xl px-10 py-5 shadow-2xl">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-zinc-600 border border-zinc-500 rounded-full px-4 py-0.5">
              <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">WC3-Style RTS</span>
            </div>
            <h1 className="text-5xl font-black tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600"
                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)', WebkitTextStroke: '1px rgba(139,69,19,0.3)' }}>
                Grudge
              </span>
              {' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-red-400 via-red-500 to-red-700"
                style={{ fontStyle: 'italic' }}>
                Warlords
              </span>
            </h1>
            <div className="flex items-center justify-center gap-2 mt-1">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
              <span className="text-xs text-amber-400/80 font-semibold">REAL-TIME STRATEGY</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
            </div>
          </div>
        </div>

        {/* Map selection — island cards */}
        <div className="flex gap-3 mb-5 flex-wrap justify-center">
          {MAPS.map((m, i) => (
            <Card key={m.id}
              className={`cursor-pointer w-44 transition-all duration-150 hover:scale-105 ${
                i === selectedMap
                  ? 'border-amber-400 bg-zinc-800/90 shadow-lg shadow-amber-500/20 ring-1 ring-amber-400/30'
                  : 'border-zinc-600/50 bg-zinc-800/60 hover:border-zinc-500'
              }`}
              onClick={() => setSelectedMap(i)}>
              <CardContent className="pt-3 pb-2 text-center">
                <div className="text-2xl mb-1">{m.thumbnail}</div>
                <div className="font-bold text-sm text-zinc-100">{m.name}</div>
                <div className="text-[11px] text-amber-400/70">{m.subtitle}</div>
                <div className="text-[9px] text-zinc-500 mt-1 leading-snug">{m.description.slice(0, 60)}...</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Faction picker */}
        <div className="flex gap-3 mb-6">
          {(['kingdom', 'legion'] as const).map(f => (
            <button key={f}
              onClick={() => setSelectedFaction(f)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all border-2 ${
                selectedFaction === f
                  ? f === 'kingdom'
                    ? 'bg-blue-600/90 border-blue-400 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-red-600/90 border-red-400 text-white shadow-lg shadow-red-500/30'
                  : 'bg-zinc-800/60 border-zinc-600/50 text-zinc-300 hover:bg-zinc-700/60'
              }`}>
              <span className="text-xl">{f === 'kingdom' ? '🏰' : '💀'}</span>
              {f === 'kingdom' ? 'Kingdom' : 'Legion'}
            </button>
          ))}
        </div>

{/* Difficulty picker */ }
<div className="flex gap-2 mb-5" >
  {(['easy', 'normal', 'hard'] as const).map(d => (
    <button key= { d } onClick = {() => setDifficulty(d)}
    className = {`px-5 py-2 rounded-xl text-sm font-bold border-2 transition-all ${difficulty === d
        ? d === 'easy' ? 'bg-green-700/80 border-green-400 text-white' : d === 'normal' ? 'bg-amber-700/80 border-amber-400 text-white' : 'bg-red-700/80 border-red-400 text-white'
        : 'bg-zinc-800/60 border-zinc-600/50 text-zinc-400 hover:bg-zinc-700/60'
      }`}>
        { d === 'easy' ? '🟢 Easy' : d === 'normal' ? '🟡 Normal' : '🔴 Hard'}
    </button>
  ))}
</div>

        {/* Start button — large, golden */}
        <Button size="lg" onClick={startGame}
          className="bg-gradient-to-b from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 text-lg px-10 py-3 font-bold shadow-xl shadow-green-600/30 border border-green-400/30 rounded-xl">
          <Play className="h-5 w-5 mr-2" /> Start Game
        </Button>

{/* Home link */ }
<Link href="/" >
  <Button size="sm" variant = "ghost" className = "mt-3 text-white/40 hover:text-white/70 text-xs" >
    <Home className="h-3.5 w-3.5 mr-1" /> Back to Home
      </Button>
      </Link>

        {/* Controls */}
        <div className="mt-5 text-[10px] text-white/30 max-w-md text-center leading-relaxed bg-black/10 rounded-lg px-4 py-2">
          <span className="text-white/50 font-bold">Controls:</span>{' '}
          Arrows=pan · Wheel=zoom · Edge=scroll · LClick=select · RClick=move/attack ·
          A=attack-move · S=stop · H=hold · B=build · Ctrl+1-9=group · 1-9=recall ·
          F1-F3=hero · Space=last event · U=upgrade TH
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // LOADING
  // ══════════════════════════════════════════════════════════════════════════════
  if (phase === 'loading') {
    const pct = Math.round(loadProgress * 100);
    const stats = spriteLoader.getStats();
    return (
      <div className="flex flex-col items-center justify-center h-full text-white"
        style={{ background: 'linear-gradient(180deg, #2d8a9e 0%, #3a9fbf 50%, #2d8a9e 100%)' }}>
        <div className="text-4xl mb-4">⚔️</div>
        <h2 className="text-xl font-bold mb-4 text-amber-300">
          Preparing the Battlefield
        </h2>
        <div className="w-72 h-2.5 bg-black/30 rounded-full overflow-hidden mb-3 border border-white/10">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-green-400 transition-all duration-200 rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-xs text-white/50 mb-1">{pct}% — {stats.cached} sprites loaded</div>
        <div className="text-[10px] text-white/25">Loading from ObjectStore CDN</div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // GAME — Canvas + React HUD overlay (single clean layer)
// ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="h-full bg-black relative">
  <div
        ref={ containerRef }
className = "absolute inset-0 overflow-hidden"
style = {{ cursor: buildMode || attackMoveMode || abilityMode ? 'crosshair' : 'default' }}
      >
  <canvas
          ref={ canvasRef }
className = "absolute inset-0 w-full h-full"
style = {{ imageRendering: 'pixelated' }}
onMouseDown = { handleMouseDown }
onMouseMove = { handleMouseMove }
onMouseUp = { handleMouseUp }
onMouseLeave = { handleMouseLeave }
onWheel = { handleWheel }
onContextMenu = { handleContextMenu }
  />
      </div>

{/* React HUD overlay */ }
      <GameHUD
        state={stateRef.current}
tick = { hudTick }
        onTrain={handleHUDTrain}
        onSummonHero={handleHUDSummonHero}
        onBuild={handleHUDBuild}
        onStop={handleHUDStop}
        onHold={handleHUDHold}
        onAttackMove={handleHUDAttackMove}
onCastAbility = { handleHUDCastAbility }
onRankUpAbility = { handleHUDRankUpAbility }
        buildMode={buildMode}
        attackMoveMode={attackMoveMode}
        setBuildMode={setBuildMode}
        buildMenuOpen={buildMenuOpen}
        setBuildMenuOpen={setBuildMenuOpen}
      />

  {/* Ability targeting mode indicator */ }
{
  abilityMode && (
    <div className="absolute top-11 left-1/2 -translate-x-1/2 bg-purple-700/90 text-white text-xs font-bold px-4 py-1.5 rounded-lg pointer-events-auto z-30" >
      Click target for ability — ESC cancel
        </div>
      )
}

{/* Pause overlay */ }
{
  phase === 'paused' && (
    <div className="absolute inset-0 bg-black/70 z-50 flex items-center justify-center pointer-events-auto" >
      <div className="bg-zinc-900 border border-zinc-600 rounded-2xl p-8 flex flex-col gap-3 items-center min-w-52 shadow-2xl" >
        <h2 className="text-2xl font-black text-amber-400" >⏸ PAUSED </h2>
          < Button className = "w-full" onClick = {() => setPhase('playing')
}>▶ Resume </Button>
  < Button variant = "outline" className = "w-full" onClick = { startGame } >↺ Restart </Button>
    < Button variant = "ghost" className = "w-full" onClick = { handleMenuReturn } >🏠 Main Menu </Button>
      </div>
      </div>
      )}

  {/* Victory / Defeat overlay */ }
  < GameOverlay result = { gameResult } onReturn = { handleMenuReturn } />

        {/* FPS counter + Menu button */ }
      <div className="absolute top-1 right-2 flex items-center gap-2 z-40 pointer-events-auto">
  <Badge variant="secondary" className = "text-[9px] bg-black/60 border-zinc-700" >
    { fps } FPS
      </Badge>
  < Button size = "sm" variant = "ghost" className = "h-7 text-[10px] bg-black/60 hover:bg-zinc-800" onClick = { handleMenuReturn } >
          <RotateCcw className="h-3 w-3 mr-1" /> Menu
            </Button>
      </div>
    </div>
  );
}
