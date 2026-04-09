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

import { memo, type JSX } from 'react';
import type { GameState, Unit, Building, UnitType, BuildingType } from '@/lib/rts-engine/types';
import { UNIT_CONFIGS, BUILDING_CONFIGS, HERO_CONFIGS, ABILITY_DEFS } from '@/lib/rts-engine/constants';

// ── Faction constants ───────────────────────────────────────────────────────────
const UNIT_ICONS: Record<string, string> = {
  pawn: '⛏️', orcPawn: '⛏️', farmer: '🌾',
  swordsman: '⚔️', spearman: '🗡️', axeman: '🪓', orcWarrior: '⚔️', orcSpearman: '🗡️', knight: '🐴', assasin: '🔪',
  bowman: '🏹', orcArcher: '🏹', musketeer: '🔫',
  mage: '✨', orcHealer: '💚', necromancer: '💀', orcMage: '🔮',
  ballista: '💣', minotaur: '🐂', demon: '👿', mammoth: '🐘', dragon: '🐉',
};
const KINGDOM_TRAINS = new Set(['pawn', 'farmer', 'swordsman', 'spearman', 'axeman', 'knight', 'assasin', 'bowman', 'musketeer', 'mage', 'necromancer', 'ballista', 'minotaur', 'dragon']);
const LEGION_TRAINS = new Set(['orcPawn', 'orcWarrior', 'orcSpearman', 'orcArcher', 'orcHealer', 'orcMage', 'demon', 'mammoth']);
const KINGDOM_HEROES = ['arthax', 'kanji', 'katan'];
const LEGION_HEROES = ['grum', 'gangblanc', 'okomo', 'zhinja', 'borg'];
const HERO_ICONS: Record<string, string> = {
  arthax: '🗡️', kanji: '🔮', katan: '🏹', grum: '🛡️',
  gangblanc: '🔪', okomo: '👊', zhinja: '🥷', borg: '⚔️',
};

// ── Props ───────────────────────────────────────────────────────────────────────
interface GameHUDProps {
  state: GameState | null;
  tick: number; // increments each HUD frame, breaks memo on stateRef children
  onTrain: (buildingId: string, unitType: UnitType) => void;
  onSummonHero: (heroType: UnitType) => void;
  onBuild: (type: BuildingType) => void;
  onStop: () => void;
  onHold: () => void;
  onAttackMove: () => void;
  onCastAbility: (heroId: string, abilityIdx: number) => void;
  onRankUpAbility: (heroId: string, abilityIdx: number) => void;
  buildMode: BuildingType | null;
  attackMoveMode: boolean;
  setBuildMode: (bt: BuildingType | null) => void;
  buildMenuOpen: boolean;
  setBuildMenuOpen: (open: boolean) => void;
}

// ── Resource Bar (Top) ──────────────────────────────────────────────────────────
// Not memoized — state is a mutable ref object; reference equality never changes.
function ResourceBar({ state }: { state: GameState }): JSX.Element {
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
}

// ── Hero Portraits ──────────────────────────────────────────────────────────────
function HeroPortraits({ state }: { state: GameState }): JSX.Element | null {
  const heroes: Unit[] = [];
  for (const [, u] of state.units) {
    if (u.faction === 'blue' && u.isHero && u.state !== 'dead') heroes.push(u);
  }
  if (heroes.length === 0) return null;

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
}

// ── Hero Ability Panel ──────────────────────────────────────────────────────────
const ABILITY_KEYS = ['Q', 'W', 'E', 'R'] as const;

function HeroAbilityPanel({ hero, state, onCast, onRankUp }: {
  hero: Unit;
  state: GameState;
  onCast: (idx: number) => void;
  onRankUp: (idx: number) => void;
}): JSX.Element | null {
  if (!hero.isHero || hero.abilities.length === 0) return null;

  return (
    <div className= "mt-2 border-t border-zinc-700/50 pt-2" >
    {
      hero.abilityPoints > 0 && (
        <div className="text-[9px] font-bold text-amber-400 mb-1 text-center animate-pulse">
          ✨ { hero.abilityPoints } ability point{ hero.abilityPoints > 1 ? 's' : '' } available!
    </div>
      )
}
<div className="grid grid-cols-4 gap-1" >
{
  hero.abilities.slice(0, 4).map((aState, idx) => {
    const def = ABILITY_DEFS[aState.abilityId];
    if (!def) return null;
    const isPassive = def.cooldown === 0 && def.manaCost === 0;
    const isLocked = aState.rank === 0;
    const onCooldown = aState.cooldownRemaining > 0;
    const noMana = hero.mana < def.manaCost;
    const levelLocked = hero.heroLevel < def.levelRequired || (def.isUltimate && hero.heroLevel < 6);
    const canRankUp = hero.abilityPoints > 0 && aState.rank < def.maxRank && !levelLocked;
    const disabled = isPassive || isLocked || (onCooldown && !isPassive) || noMana;

    return (
      <div key= { aState.abilityId } className = "relative" >
        <button
                onClick={ () => !isPassive && !isLocked && !onCooldown && !noMana && onCast(idx) }
    title = {`${def.name}${def.description ? ' — ' + def.description : ''}${def.manaCost > 0 ? ` (${def.manaCost} mana)` : ''}${def.cooldown > 0 ? ` [${def.cooldown}s CD]` : ''}`
  }
                className = {`w-full aspect-square rounded border flex flex-col items-center justify-center transition-all relative overflow-hidden ${isLocked || levelLocked
      ? 'bg-zinc-900 border-zinc-800 opacity-40'
      : isPassive
        ? 'bg-emerald-900/40 border-emerald-700/60 cursor-default'
        : onCooldown
          ? 'bg-zinc-800 border-zinc-600 opacity-60 cursor-not-allowed'
          : noMana
            ? 'bg-zinc-800 border-blue-900/50 opacity-60 cursor-not-allowed'
            : 'bg-zinc-800 border-amber-600/50 hover:bg-zinc-700 hover:border-amber-500 cursor-pointer'
      }`}
  >
  {/* Cooldown overlay */ }
{
  onCooldown && !isPassive && def.cooldown > 0 && (
    <div
                    className="absolute inset-0 bg-black/60 flex items-end justify-center pb-0.5"
  style = {{ clipPath: `inset(${((1 - aState.cooldownRemaining / def.cooldown) * 100).toFixed(0)}% 0 0 0)` }
}
                  >
  <span className="text-[8px] font-bold text-white" > { Math.ceil(aState.cooldownRemaining) } </span>
    </div>
                )}
<span className="text-base leading-none" > { def.icon } </span>
{/* Rank dots */ }
<div className="flex gap-px mt-0.5" >
  {
    Array.from({ length: def.maxRank }).map((_, r) => (
      <div key= { r } className = {`w-1 h-1 rounded-full ${r < aState.rank ? 'bg-amber-400' : 'bg-zinc-600'}`} />
                  ))}
</div>
  </button>
{/* Key label */ }
<div className="absolute top-0.5 left-0.5 text-[7px] font-bold text-zinc-400" > { ABILITY_KEYS[idx]} </div>
{/* Passive indicator */ }
{
  isPassive && aState.rank > 0 && (
    <div className="absolute bottom-0.5 right-0.5 text-[7px] text-emerald-400" > P </div>
              )
}
{/* Rank-up button */ }
{
  canRankUp && (
    <button
                  onClick={ e => { e.stopPropagation(); onRankUp(idx); } }
  className = "absolute -top-1 -right-1 w-4 h-4 bg-amber-500 hover:bg-amber-400 rounded-full flex items-center justify-center text-[8px] font-black text-zinc-900 z-10 shadow"
    > +</button>
              )
}
{/* Cooldown text below */ }
{
  !isLocked && !levelLocked && (
    <div className="text-[7px] text-center text-zinc-500 truncate leading-tight mt-px px-0.5" >
      { isPassive? 'PASSIVE': onCooldown ? `${Math.ceil(aState.cooldownRemaining)}s` : def.name.slice(0, 8) }
      </div>
              )
}
{
  levelLocked && (
    <div className="text-[7px] text-center text-zinc-600 leading-tight mt-px" > Lv{ def.isUltimate ? 6 : def.levelRequired } </div>
              )
}
</div>
          );
        })}
</div>
  </div>
  );
}

// ── Dead Hero Revival Panel ─────────────────────────────────────────────────────
function DeadHeroPanel({ state }: { state: GameState }): JSX.Element | null {
  const dead = state.deadHeroes;
  if (dead.length === 0) return null;

  return (
    <div className= "absolute top-28 left-4 flex flex-col gap-1 z-30 pointer-events-none" >
    {
      dead.map(dh => {
        const hero = state.units.get(dh.unitId);
        if (!hero) return null;
        const heroCfg = HERO_CONFIGS.find(h => h.type === hero.type);
        return (
          <div key= { dh.unitId } className = "bg-red-950/85 border border-red-800/60 rounded-md px-2.5 py-1.5 text-[10px]" >
            <div className="text-red-400 font-bold" > { heroCfg?.name ?? hero.type
      } 💀</div>
      < div className = "text-zinc-400" > Reviving in { Math.ceil(dh.reviveTimer) }s{ dh.reviveCost > 0 ? ` (${dh.reviveCost}g)` : '' } </div>
      < div className = "h-0.5 bg-zinc-700 mt-1 rounded-full overflow-hidden" >
      <div className="h-full bg-red-500 rounded-full transition-all"
                style = {{ width: `${Math.max(0, 100 - (dh.reviveTimer / (HERO_CONFIGS.find(h => h.type === hero.type)?.reviveTime ?? 55)) * 100)}%` }} />
    </div>
    </div>
        );
})}
</div>
  );
}

// ── Selection Panel (Bottom-Left) ───────────────────────────────────────────────
// Not memoized — receives mutable state ref, must re-render on tick.
function SelectionPanel({ state, onTrain, onSummonHero, onCastAbility, onRankUpAbility }: {
  state: GameState;
  onTrain: (buildingId: string, unitType: UnitType) => void;
  onSummonHero: (heroType: UnitType) => void;
  onCastAbility: (heroId: string, abilityIdx: number) => void;
  onRankUpAbility: (heroId: string, abilityIdx: number) => void;
}) {
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
{/* Hero ability panel */ }
{
  u.isHero && (
    <HeroAbilityPanel
                hero={ u }
  state = { state }
  onCast = { idx => onCastAbility(u.id, idx) }
  onRankUp = { idx => onRankUpAbility(u.id, idx) }
    />
            )
}
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
            {/* Train buttons (faction-filtered) */}
            {(() => {
              const fFilter = state.playerFaction === 'kingdom' ? KINGDOM_TRAINS : LEGION_TRAINS;
              const trainable = cfg.trains.filter(t => fFilter.has(t));
              if (trainable.length === 0) return null;
              return (
                <div className="mt-1">
                  <div className="text-[9px] text-zinc-500 mb-1">TRAIN</div>
                  <div className="flex flex-wrap gap-1">
                    {trainable.map(ut => {
                      const ucfg = UNIT_CONFIGS[ut]; if (!ucfg) return null;
                      const canAfford = state.playerResources.gold >= ucfg.trainCost.gold && state.playerResources.wood >= ucfg.trainCost.wood;
                      const queueFull = selectedBld.trainingQueue.length >= 5;
                      return (
                        <button key={ut} onClick={() => canAfford && !queueFull && onTrain(selectedBld.id, ut as UnitType)}
                          className={`px-2 py-1 rounded text-[9px] font-bold transition-all ${canAfford && !queueFull ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'bg-zinc-900/50 text-zinc-600 cursor-not-allowed'}`}>
                          <div>{UNIT_ICONS[ut] ?? '⚔️'} {ut}</div>
                          <div className="text-[8px] text-amber-400">🪙{ucfg.trainCost.gold}{ucfg.trainCost.wood > 0 ? ` 🪵${ucfg.trainCost.wood}` : ''}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            {/* Hero summon (altar only) */}
            {selectedBld.type === 'altar' && (() => {
              const aliveHeroes = [...state.units.values()].filter(u => u.faction === 'blue' && u.isHero && u.state !== 'dead');
              const heroPool = state.playerFaction === 'kingdom' ? KINGDOM_HEROES : LEGION_HEROES;
              return (
                <div className="mt-2">
                  <div className="text-[9px] text-zinc-500 mb-1">SUMMON HERO ({aliveHeroes.length}/3)</div>
                  {heroPool.map(ht => {
                    const hc = HERO_CONFIGS.find(h => h.type === ht); if (!hc) return null;
                    const alive = aliveHeroes.some(u => u.type === ht);
                    const full = !alive && aliveHeroes.length >= 3;
                    return (
                      <button key={ht} onClick={() => !alive && !full && onSummonHero(ht as UnitType)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] w-full mb-0.5 transition-all ${alive || full ? 'bg-zinc-900 text-zinc-600 cursor-default' : 'bg-purple-900/40 hover:bg-purple-800/50 text-purple-200 cursor-pointer'}`}>
                        <span>{HERO_ICONS[ht] ?? '👑'}</span>
                        <span className="font-bold">{hc.name}</span>
                        <span className="text-zinc-500 text-[8px]">— {hc.title}</span>
                        {alive && <span className="ml-auto text-green-400 text-[8px] font-bold">ALIVE</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        );
      })()}
    </div>
  );
}

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
  state, tick: _tick, onTrain, onSummonHero, onBuild, onStop, onHold, onAttackMove,
  onCastAbility, onRankUpAbility,
  buildMode, attackMoveMode, setBuildMode, buildMenuOpen, setBuildMenuOpen,
}: GameHUDProps) {
  if (!state) return null;

  return (
    <div className="absolute inset-0 pointer-events-none text-white z-20">
      <ResourceBar state={state} />
      <HeroPortraits state={state} />
    <DeadHeroPanel state={ state } />
      < SelectionPanel state = { state } onTrain = { onTrain } onSummonHero = { onSummonHero } onCastAbility = { onCastAbility } onRankUpAbility = { onRankUpAbility } />
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
