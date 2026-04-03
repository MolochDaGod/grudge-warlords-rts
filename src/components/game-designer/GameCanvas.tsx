import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Play, RotateCcw } from 'lucide-react';
import {
  createInitialState, updateGame,
  commandMove, commandAttack, commandHarvest, commandBuild,
  commandTrain, commandSummonHero, commandUpgradeTownHall,
  commandStop, commandHold, commandAttackMove,
} from '@/lib/rts-engine/engine';
import { renderGame } from '@/lib/rts-engine/renderer';
import { MAPS } from '@/lib/rts-engine/maps';
import { fxController } from '@/lib/rts-engine/fx-controller';
import { BUILDING_CONFIGS, HERO_CONFIGS } from '@/lib/rts-engine/constants';
import type { GameState, Vec2, BuildingType, UnitType } from '@/lib/rts-engine/types';

type GamePhase = 'menu' | 'playing' | 'paused';

const EDGE_SCROLL_ZONE = 30;
const EDGE_SCROLL_SPEED = 12;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2.5;

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const animRef = useRef(0);
  const lastTimeRef = useRef(0);
  const canvasSizeRef = useRef({ w: 1200, h: 700 });
  const mouseRef = useRef({ x: 0, y: 0, inCanvas: false });
  const lastClickRef = useRef({ time: 0, unitType: '' });

  const [phase, setPhase] = useState<GamePhase>('menu');
  const [selectedMap, setSelectedMap] = useState(0);
  const [selectedFaction, setSelectedFaction] = useState<'kingdom' | 'legion'>('kingdom');
  const [buildMode, setBuildMode] = useState<BuildingType | null>(null);
  const [attackMoveMode, setAttackMoveMode] = useState(false);
  const [buildMenuOpen, setBuildMenuOpen] = useState(false);
  const [fps, setFps] = useState(0);

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

  // ── Start game ─────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    const mapDef = MAPS[selectedMap];
    stateRef.current = createInitialState(mapDef, selectedFaction);
    setPhase('playing');
    lastTimeRef.current = performance.now();
    setBuildMode(null);
    setAttackMoveMode(false);
    setBuildMenuOpen(false);
  }, [selectedMap, selectedFaction]);

  // ── Game loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let fpsCounter = 0;
    let fpsTimer = 0;

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
      }
      fpsCounter++;
      fpsTimer += dt;
      if (fpsTimer >= 1) { setFps(fpsCounter); fpsCounter = 0; fpsTimer = 0; }
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
    const { h } = canvasSizeRef.current;
    const mw = 176, mh = 110, mx = 8, my = h - mh - 8;
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
  }, [phase, buildMode, attackMoveMode, screenToWorld, isMinimapClick]);

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

      if (e.key === 'Escape') { setBuildMode(null); setAttackMoveMode(false); setBuildMenuOpen(false); return; }

      // Build menu sub-keys
      if (buildMenuOpen) {
        e.preventDefault();
        const map: Record<string, BuildingType> = { b:'barracks', h:'house', t:'tower', a:'altar', k:'blacksmith', r:'archery', c:'chapel', w:'workshop' };
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
  }, [phase, buildMenuOpen]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => e.preventDefault(), []);

  const trainFromSelectedBuilding = (type: UnitType) => {
    if (!stateRef.current || !stateRef.current.selectedBuildingId) return;
    commandTrain(stateRef.current, stateRef.current.selectedBuildingId, type);
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // MENU
  // ══════════════════════════════════════════════════════════════════════════════
  if (phase === 'menu') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-zinc-950 text-white p-8">
        <h1 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-red-500">Grudge Warlords RTS</h1>
        <p className="text-zinc-400 mb-8">WC3-Style Real-Time Strategy</p>
        <div className="flex gap-4 mb-6 flex-wrap justify-center">
          {MAPS.map((m, i) => (
            <Card key={m.id} className={`cursor-pointer w-48 ${i === selectedMap ? 'border-amber-500 bg-zinc-800' : 'border-zinc-700 bg-zinc-900'}`} onClick={() => setSelectedMap(i)}>
              <CardContent className="pt-4 text-center">
                <div className="text-3xl mb-2">{m.thumbnail}</div>
                <div className="font-bold text-sm">{m.name}</div>
                <div className="text-xs text-zinc-400">{m.subtitle}</div>
                <div className="text-[10px] text-zinc-500 mt-2">{m.description.slice(0, 80)}...</div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex gap-4 mb-8">
          {(['kingdom', 'legion'] as const).map(f => (
            <Button key={f} size="lg" variant={selectedFaction === f ? 'default' : 'outline'} onClick={() => setSelectedFaction(f)} className={selectedFaction === f ? 'bg-blue-600' : ''}>
              {f === 'kingdom' ? '🏰 Kingdom' : '💀 Legion'}
            </Button>
          ))}
        </div>
        <Button size="lg" onClick={startGame} className="bg-green-600 hover:bg-green-700 text-lg px-8"><Play className="h-5 w-5 mr-2" /> Start Game</Button>
        <div className="mt-6 text-xs text-zinc-500 max-w-lg text-center leading-relaxed">
          <span className="text-zinc-300 font-bold">Controls:</span>{' '}
          Arrows=pan · Wheel=zoom · Edge=scroll · LClick=select · RClick=move/attack ·
          A=attack-move · S=stop · H=hold · B=build · Ctrl+1-9=group · 1-9=recall ·
          F1-F3=hero · Space=last event · U=upgrade TH
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // GAME
  // ══════════════════════════════════════════════════════════════════════════════
  const selectedBld = stateRef.current?.selectedBuildingId ? stateRef.current.buildings.get(stateRef.current.selectedBuildingId) : null;
  const selectedBldCfg = selectedBld ? BUILDING_CONFIGS[selectedBld.type as keyof typeof BUILDING_CONFIGS] : null;

  return (
    <div className="flex flex-col h-full bg-black relative">
      <div className="flex items-center gap-2 p-1 bg-zinc-900/90 border-b border-zinc-800 z-10 shrink-0">
        <Button size="sm" variant="ghost" onClick={() => { setPhase('menu'); cancelAnimationFrame(animRef.current); }}><RotateCcw className="h-3.5 w-3.5 mr-1" /> Menu</Button>
        <Badge variant="secondary" className="text-[10px]">{fps} FPS</Badge>
        <div className="flex-1" />
        {buildMode && <Badge variant="default" className="text-xs bg-amber-600">Building: {buildMode} — click to place, ESC cancel</Badge>}
        {attackMoveMode && <Badge variant="default" className="text-xs bg-red-600">Attack-Move — click target, ESC cancel</Badge>}
      </div>

      <div ref={containerRef} className="flex-1 relative overflow-hidden" style={{ cursor: buildMode ? 'crosshair' : attackMoveMode ? 'crosshair' : 'default' }}>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ imageRendering: 'pixelated' }}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave} onWheel={handleWheel} onContextMenu={handleContextMenu} />

        {/* Build menu overlay */}
        {buildMenuOpen && (
          <div className="absolute bottom-52 right-4 bg-zinc-900/95 border border-zinc-600 rounded-lg p-3 z-20 w-56">
            <div className="text-xs font-bold text-amber-400 mb-2">BUILD (press key)</div>
            <div className="grid grid-cols-2 gap-1">
              {([['B','barracks','⚔️ Barracks'],['H','house','🏠 House'],['T','tower','🗼 Tower'],['A','altar','🪦 Altar'],
                ['K','blacksmith','⚒️ Smith'],['R','archery','🏹 Archery'],['C','chapel','⛪ Chapel'],['W','workshop','🔧 Workshop'],
              ] as [string, BuildingType, string][]).map(([key, bt, label]) => (
                <Button key={bt} size="sm" variant="ghost" onClick={() => { setBuildMode(bt); setBuildMenuOpen(false); }} className="text-[10px] h-7 justify-start px-2">
                  <span className="text-amber-400 font-bold w-4">{key}</span> {label}
                </Button>
              ))}
            </div>
            <div className="text-[9px] text-zinc-500 mt-2">ESC to close</div>
          </div>
        )}

        {/* Selected building card */}
        {selectedBld && selectedBldCfg && (
          <div className="absolute bottom-2 right-2 bg-zinc-900/95 border border-zinc-600 rounded-lg p-3 z-20 w-64">
            <div className="text-sm font-bold text-zinc-100 mb-1">{selectedBld.type.charAt(0).toUpperCase() + selectedBld.type.slice(1)} <span className="text-zinc-500 text-[10px]">T{selectedBldCfg.techTier}</span></div>
            <div className="h-2 bg-zinc-700 rounded mb-2 overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${(selectedBld.hp / selectedBld.maxHp) * 100}%` }} /></div>
            <div className="text-[10px] text-zinc-400 mb-1">HP: {Math.round(selectedBld.hp)}/{selectedBld.maxHp}</div>
            {selectedBld.trainingQueue.length > 0 && (
              <div className="mb-2">
                <div className="text-[10px] text-zinc-500">Training: {selectedBld.trainingQueue[0]}</div>
                <div className="h-1.5 bg-zinc-700 rounded overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${selectedBld.trainingProgress * 100}%` }} /></div>
              </div>
            )}
            {selectedBldCfg.trains.length > 0 && (
              <div className="grid grid-cols-3 gap-1 mt-1">
                {selectedBldCfg.trains.map(ut => (
                  <Button key={ut} size="sm" variant="ghost" onClick={() => trainFromSelectedBuilding(ut)} className="text-[10px] h-8 px-1 flex flex-col items-center">
                    <span className="text-sm">{ut === 'pawn' ? '⛏️' : ut === 'swordsman' ? '⚔️' : ut === 'bowman' ? '🏹' : ut === 'mage' ? '✨' : ut === 'knight' ? '🐴' : ut === 'ballista' ? '💣' : ut === 'orcPawn' ? '⛏️' : '👤'}</span>
                    <span className="text-[8px] text-zinc-400 truncate w-full text-center">{ut}</span>
                  </Button>
                ))}
              </div>
            )}
            {selectedBld.type === 'altar' && (
              <div className="grid grid-cols-4 gap-1 mt-2">
                {HERO_CONFIGS.map(h => (
                  <Button key={h.type} size="sm" variant="ghost" onClick={() => stateRef.current && commandSummonHero(stateRef.current, h.type)}
                    title={`${h.name} (${h.title})`} className="text-[10px] h-8 px-1 flex flex-col items-center">
                    <span className="text-sm">{h.type === 'arthax' ? '🗡️' : h.type === 'kanji' ? '🔮' : h.type === 'katan' ? '🏹' : h.type === 'grum' ? '🛡️' : h.type === 'gangblanc' ? '🔪' : h.type === 'okomo' ? '👊' : h.type === 'zhinja' ? '🥷' : '⚔️'}</span>
                    <span className="text-[8px] text-zinc-400 truncate w-full text-center">{h.name}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
