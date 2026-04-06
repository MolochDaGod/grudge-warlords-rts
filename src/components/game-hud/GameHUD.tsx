/**
 * GameHUD — Single React overlay layer for all game UI.
 *
 * Replaces the duplicate canvas-drawn HUD in renderer.ts.
 * All UI is positioned absolutely over the game canvas.
 *
 * Sections:
 *   1. Top Bar: Resources, upkeep, tech tier, day/night, time
 *   2. Hero Portraits: Top-left under resource bar
 *   3. Selection Panel: Bottom-left (unit/building details)
 *   4. Action Bar: Bottom-center (attack, defend, patrol, stop, hold)
 *   5. Build Menu: Bottom-right (building construction)
 *   6. Minimap: Bottom-right corner
 */

import { memo, useCallback, useMemo } from 'react';
import type { GameState, Unit, Building, UnitType, BuildingType } from '@/lib/rts-engine/types';
import { UNIT_CONFIGS, BUILDING_CONFIGS, HERO_CONFIGS } from '@/lib/rts-engine/constants';

// ── Props ───────────────────────────────────────────────────────────────────────
interface GameHUDProps {
  state: GameState | null;
  onTrain: (buildingId: string, unitType: UnitType) => void;
  onSummonHero: (heroType: UnitType) => void;
  onBuild: (type: BuildingType) => void;
  onStop: () => void;
  onHold: () => void;
  onAttackMove: () => void;
  buildMode: BuildingType | null;
  attackMoveMode: boolean;
  setBuildMode: (bt: BuildingType | null) => void;
  buildMenuOpen: boolean;
  setBuildMenuOpen: (open: boolean) => void;
}

// ── Resource Bar (Top) ──────────────────────────────────────────────────────────
const ResourceBar = memo(({ state }: { state: GameState }) => {
  const res = state.playerResources;
  const upkeepColor = state.upkeepLevel === 'none' ? 'text-green-400' : state.upkeepLevel === 'low' ? 'text-amber-400' : 'text-red-400';
  const dayIcon = state.timeOfDay === 'day' ? '☀️' : '🌙';
  const minutes = Math.floor(state.timeElapsed / 60);
  const seconds = String(Math.floor(state.timeElapsed % 60)).padStart(2, '0');

  return (
    <div className="absolute top-0 left-0 right-0 h-9 bg-black/85 border-b border-zinc-800 flex items-center px-4 gap-6 z-30 pointer-events-auto">
      <div className="flex items-center gap-1.5">
        <span className="text-sm">🪙</span>
        <span className="text-sm font-bold text-amber-400">{res.gold}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-sm">🪵</span>
        <span className="text-sm font-bold text-green-400">{res.wood}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-sm">🍗</span>
        <span className="text-sm font-bold text-orange-400">{res.food}/{res.maxFood}</span>
      </div>
      <div className={`text-xs font-bold ${upkeepColor}`}>
        {state.upkeepLevel.toUpperCase()}
      </div>
      <div className="flex-1" />
      <div className="text-xs text-purple-400 font-bold">T{state.techTier}</div>
      <div className="text-xs text-zinc-400">{dayIcon} {minutes}:{seconds}</div>
    </div>
  );
});

// ── Hero Portraits ──────────────────────────────────────────────────────────────
const HeroPortraits = memo(({ state }: { state: GameState }) => {
  const heroes: Unit[] = [];
  for (const [, u] of state.units) {
    if (u.faction === 'blue' && u.isHero && u.state !== 'dead') heroes.push(u);
  }
  if (heroes.length === 0) return null;

  const HERO_ICONS: Record<string, string> = {
    arthax: '🗡️', kanji: '🔮', katan: '🏹', grum: '🛡️',
    gangblanc: '🔪', okomo: '👊', zhinja: '🥷', borg: '⚔️',
  };

  return (
    <div className="absolute top-11 left-4 flex gap-1 z-30 pointer-events-auto">
      {heroes.map(h => (
        <div key={h.id} className={`w-12 h-14 rounded-md border-2 flex flex-col items-center justify-center cursor-pointer ${
          h.selected ? 'border-green-400 bg-zinc-900/90' : 'border-purple-600/60 bg-zinc-900/80'
        }`}>
          <span className="text-lg">{HERO_ICONS[h.type] ?? '👑'}</span>
          <span className="text-[8px] text-zinc-300 font-bold">Lv{h.heroLevel}</span>
          <div className="w-10 h-1 bg-zinc-700 rounded-full mt-0.5">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${(h.hp / h.maxHp) * 100}%` }} />
          </div>
          <div className="w-10 h-0.5 bg-zinc-700 rounded-full mt-px">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(h.mana / h.maxMana) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
});

// ── Selection Panel (Bottom-Left) ───────────────────────────────────────────────
const SelectionPanel = memo(({ state }: { state: GameState }) => {
  const selectedUnits: Unit[] = [];
  for (const uid of state.selected) {
    const u = state.units.get(uid);
    if (u && u.state !== 'dead') selectedUnits.push(u);
  }

  const selectedBld = state.selectedBuildingId ? state.buildings.get(state.selectedBuildingId) : null;

  if (selectedUnits.length === 0 && !selectedBld) return null;

  return (
    <div className="absolute bottom-2 left-2 w-72 bg-black/90 border border-zinc-700 rounded-lg p-3 z-30 pointer-events-auto backdrop-blur-sm">
      {/* Single unit */}
      {selectedUnits.length === 1 && (() => {
        const u = selectedUnits[0];
        const cfg = UNIT_CONFIGS[u.type];
        const heroCfg = u.isHero ? HERO_CONFIGS.find(h => h.type === u.type) : null;
        return (
          <div>
            <div className="flex justify-between items-start mb-1.5">
              <div>
                <span className="text-sm font-bold text-zinc-100">
                  {heroCfg?.name ?? u.type}
                </span>
                {heroCfg && <span className="text-[10px] text-purple-400 ml-1.5">Lv{u.heroLevel}</span>}
              </div>
              {u.holdPosition && <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">HOLD</span>}
            </div>
            <div className="flex gap-2 text-[10px] text-zinc-400 mb-2">
              <span>HP:{Math.round(u.hp)}/{u.maxHp}</span>
              <span>DMG:{cfg?.damage ?? '?'}</span>
              <span>ARM:{u.armor}</span>
              <span>SPD:{cfg?.speed ?? '?'}</span>
            </div>
            {/* HP Bar */}
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-1">
              <div className={`h-full rounded-full ${u.hp / u.maxHp > 0.5 ? 'bg-green-500' : u.hp / u.maxHp > 0.25 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${(u.hp / u.maxHp) * 100}%` }} />
            </div>
            {/* Mana Bar (heroes) */}
            {u.isHero && u.maxMana > 0 && (
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden mb-1">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(u.mana / u.maxMana) * 100}%` }} />
              </div>
            )}
            {/* Inventory (heroes, 6 slots) */}
            {u.isHero && (
              <div className="flex gap-1 mt-2">
                {u.inventory.map((slot, i) => (
                  <div key={i} className={`w-7 h-7 rounded border ${slot ? 'bg-zinc-800 border-zinc-600' : 'bg-zinc-900/50 border-zinc-800'} flex items-center justify-center text-xs`}>
                    {slot ? '📦' : ''}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Multi-select */}
      {selectedUnits.length > 1 && (
        <div>
          <div className="text-xs font-bold text-zinc-300 mb-2">{selectedUnits.length} units selected</div>
          <div className="grid grid-cols-8 gap-1">
            {selectedUnits.slice(0, 24).map(u => (
              <div key={u.id} className={`w-7 h-7 rounded border flex items-center justify-center text-sm ${
                u.isHero ? 'border-purple-500 bg-purple-900/30' : 'border-zinc-700 bg-zinc-900/50'
              }`}>
                {u.role === 'worker' ? '⛏️' : u.role === 'melee' ? '⚔️' : u.role === 'ranged' ? '🏹' :
                  u.role === 'caster' ? '✨' : u.role === 'siege' ? '💣' : u.isHero ? '👑' : '•'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected building */}
      {selectedBld && (() => {
        const cfg = BUILDING_CONFIGS[selectedBld.type as keyof typeof BUILDING_CONFIGS];
        if (!cfg) return null;
        return (
          <div>
            <div className="text-sm font-bold text-zinc-100 mb-1">
              {selectedBld.type.charAt(0).toUpperCase() + selectedBld.type.slice(1)}
              <span className="text-[10px] text-zinc-500 ml-2">T{cfg.techTier}</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-1">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${(selectedBld.hp / selectedBld.maxHp) * 100}%` }} />
            </div>
            <div className="text-[10px] text-zinc-400 mb-2">HP: {Math.round(selectedBld.hp)}/{selectedBld.maxHp}</div>
            {/* Training progress */}
            {selectedBld.trainingQueue.length > 0 && (
              <div className="mb-2">
                <div className="text-[10px] text-zinc-500 mb-0.5">Training: {selectedBld.trainingQueue[0]}</div>
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${selectedBld.trainingProgress * 100}%` }} />
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
});

// ── Action Bar (Bottom-Center) ──────────────────────────────────────────────────
const ActionBar = memo(({ onStop, onHold, onAttackMove }: Pick<GameHUDProps, 'onStop' | 'onHold' | 'onAttackMove'>) => (
  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 bg-black/85 border border-zinc-700 rounded-xl px-3 py-2 z-30 pointer-events-auto backdrop-blur-sm">
    {[
      { key: 'A', label: 'ATTACK', icon: '⚔️', color: 'hover:bg-red-500/20 hover:text-red-400', fn: onAttackMove },
      { key: 'S', label: 'STOP', icon: '⏹️', color: 'hover:bg-zinc-700/50', fn: onStop },
      { key: 'H', label: 'HOLD', icon: '🛡️', color: 'hover:bg-blue-500/20 hover:text-blue-400', fn: onHold },
    ].map(btn => (
      <button key={btn.key} onClick={btn.fn}
        className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-zinc-400 transition-all ${btn.color}`}>
        <span className="text-base">{btn.icon}</span>
        <span className="text-[8px] font-bold">{btn.label}</span>
        <span className="text-[7px] text-zinc-600">[{btn.key}]</span>
      </button>
    ))}
  </div>
));

// ── Build Menu (Bottom-Right) ───────────────────────────────────────────────────
const BUILD_ITEMS: [string, BuildingType, string][] = [
  ['B', 'barracks', '⚔️ Barracks'], ['H', 'house', '🏠 House'],
  ['T', 'tower', '🗼 Tower'], ['A', 'altar', '🪦 Altar'],
  ['K', 'blacksmith', '⚒️ Smith'], ['R', 'archery', '🏹 Archery'],
  ['C', 'chapel', '⛪ Chapel'], ['W', 'workshop', '🔧 Workshop'],
  ['D', 'docks', '⚓ Docks'],
];

const BuildMenu = memo(({ open, onBuild, onClose }: { open: boolean; onBuild: (bt: BuildingType) => void; onClose: () => void }) => {
  if (!open) return null;
  return (
    <div className="absolute bottom-48 right-4 bg-black/90 border border-zinc-600 rounded-lg p-3 z-30 pointer-events-auto backdrop-blur-sm w-56">
      <div className="text-[10px] font-bold text-amber-400 mb-2">BUILD (press key)</div>
      <div className="grid grid-cols-2 gap-1">
        {BUILD_ITEMS.map(([key, bt, label]) => (
          <button key={bt} onClick={() => onBuild(bt)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded text-[10px] text-zinc-300 hover:bg-zinc-700/60 hover:text-white transition-all">
            <span className="text-amber-400 font-bold w-3">{key}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="text-[8px] text-zinc-600 mt-2">ESC to close</div>
    </div>
  );
});

// ── Main HUD Export ─────────────────────────────────────────────────────────────
export function GameHUD({
  state, onTrain, onSummonHero, onBuild, onStop, onHold, onAttackMove,
  buildMode, attackMoveMode, setBuildMode, buildMenuOpen, setBuildMenuOpen,
}: GameHUDProps) {
  if (!state) return null;

  return (
    <div className="absolute inset-0 pointer-events-none text-white z-20">
      <ResourceBar state={state} />
      <HeroPortraits state={state} />
      <SelectionPanel state={state} />
      <ActionBar onStop={onStop} onHold={onHold} onAttackMove={onAttackMove} />
      <BuildMenu open={buildMenuOpen} onBuild={onBuild} onClose={() => setBuildMenuOpen(false)} />

      {/* Mode indicators */}
      {buildMode && (
        <div className="absolute top-11 left-1/2 -translate-x-1/2 bg-amber-600/90 text-white text-xs font-bold px-4 py-1.5 rounded-lg pointer-events-auto z-30">
          Building: {buildMode} — click to place, ESC cancel
        </div>
      )}
      {attackMoveMode && (
        <div className="absolute top-11 left-1/2 -translate-x-1/2 bg-red-600/90 text-white text-xs font-bold px-4 py-1.5 rounded-lg pointer-events-auto z-30">
          Attack-Move — click target, ESC cancel
        </div>
      )}
    </div>
  );
}
