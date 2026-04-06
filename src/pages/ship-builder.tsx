import { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  SHIP_BLOCKS, SHIP_TEMPLATES,
  getBlock, getBlocksByCategory, computeBlueprintStats, computeBlueprintCost,
  type ShipBlock, type PlacedBlock, type BlockCategory,
} from '@/lib/rts-engine/ship-blocks';

const GRID_SIZE = 48;
const GRID_W = 10;
const GRID_H = 7;

const CAT_LABELS: Record<BlockCategory, { label: string; icon: string }> = {
  structure: { label: 'Structure', icon: '🔩' },
  propulsion: { label: 'Propulsion', icon: '🔥' },
  weapon: { label: 'Weapons', icon: '💥' },
  misc: { label: 'Misc', icon: '📡' },
};

const SIZE_COLORS: Record<string, string> = {
  small: 'border-zinc-600', medium: 'border-blue-600', large: 'border-amber-600',
};

export default function ShipBuilderPage() {
  const [placed, setPlaced] = useState<PlacedBlock[]>([]);
  const [category, setCategory] = useState<BlockCategory>('structure');
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);

  const stats = computeBlueprintStats(placed);
  const cost = computeBlueprintCost(placed);
  const blocks = getBlocksByCategory(category);

  const placeBlock = useCallback((gridX: number, gridY: number) => {
    if (!selectedBlock) return;
    // Check if cell is occupied
    if (placed.some(p => p.gridX === gridX && p.gridY === gridY)) return;
    setPlaced(prev => [...prev, { blockId: selectedBlock, gridX, gridY, rotation: 0 }]);
  }, [selectedBlock, placed]);

  const removeBlock = useCallback((gridX: number, gridY: number) => {
    setPlaced(prev => prev.filter(p => !(p.gridX === gridX && p.gridY === gridY)));
  }, []);

  const loadTemplate = useCallback((idx: number) => {
    setPlaced([...SHIP_TEMPLATES[idx].blocks]);
  }, []);

  const clearAll = useCallback(() => setPlaced([]), []);

  // Grid cell map for quick lookup
  const cellMap = new Map<string, PlacedBlock>();
  for (const p of placed) cellMap.set(`${p.gridX},${p.gridY}`, p);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <h2 className="text-sm font-bold text-zinc-100">🚀 SPACE SHIP BUILDER</h2>
        <Badge variant="outline" className="text-[9px] border-cyan-500/40 text-cyan-400">Grudge Space RTS</Badge>
        <Badge variant="outline" className="text-[10px]">{placed.length} blocks</Badge>
        <div className="flex-1" />
        <div className="flex gap-4 text-[10px]">
          <span className="text-red-400">HP: {stats.hp}</span>
          <span className="text-green-400">SPD: {stats.speed}</span>
          <span className="text-orange-400">DMG: {stats.cannonDamage}</span>
          <span className="text-purple-400">RNG: {stats.cannonRange}</span>
          <span className="text-blue-400">Crew: {stats.crewCapacity}</span>
          <span className="text-amber-400">Cargo: {stats.cargoCapacity}</span>
        </div>
        <div className="text-[10px] text-zinc-500 ml-4">Cost: 🪙{cost.gold} 🪵{cost.wood}</div>
        <Button size="sm" variant="ghost" className="text-[10px] h-6 text-red-400" onClick={clearAll}>Clear</Button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Block Palette (left) */}
        <div className="w-64 bg-zinc-900 border-r border-zinc-700 flex flex-col shrink-0">
          {/* Category tabs */}
          <div className="flex border-b border-zinc-700">
            {(Object.entries(CAT_LABELS) as [BlockCategory, { label: string; icon: string }][]).map(([cat, { label, icon }]) => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`flex-1 py-2 text-[9px] font-bold uppercase transition-all ${category === cat ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Block list */}
          <div className="flex-1 overflow-auto p-2 space-y-1">
            {blocks.map(b => (
              <div key={b.id} onClick={() => setSelectedBlock(b.id)}
                className={`p-2 rounded-lg border cursor-pointer transition-all ${
                  selectedBlock === b.id ? 'bg-zinc-800 border-amber-500' : `bg-zinc-900/50 ${SIZE_COLORS[b.size]} hover:bg-zinc-800`
                }`}>
                <div className="flex items-center gap-2">
                  <span className="text-base">{b.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-zinc-200 truncate">{b.name}</div>
                    <div className="text-[9px] text-zinc-500">{b.slot} · {b.size}</div>
                  </div>
                  <Badge variant="outline" className="text-[8px] h-4 px-1">{b.size[0].toUpperCase()}</Badge>
                </div>
                <div className="flex gap-2 mt-1 text-[8px] text-zinc-400">
                  {b.stats.hp ? <span className="text-red-400">+{b.stats.hp}HP</span> : null}
                  {b.stats.speed ? <span className="text-green-400">+{b.stats.speed}SPD</span> : null}
                  {b.stats.cannonDamage ? <span className="text-orange-400">+{b.stats.cannonDamage}DMG</span> : null}
                  {b.stats.crewCapacity ? <span className="text-blue-400">+{b.stats.crewCapacity}🧑</span> : null}
                </div>
                <div className="text-[8px] text-zinc-600 mt-0.5">🪙{b.cost.gold} 🪵{b.cost.wood}</div>
              </div>
            ))}
          </div>

          {/* Templates */}
          <div className="border-t border-zinc-700 p-2 space-y-1">
            <div className="text-[9px] font-bold text-zinc-500 uppercase mb-1">Templates</div>
            {SHIP_TEMPLATES.map((t, i) => (
              <Button key={i} size="sm" variant="ghost" onClick={() => loadTemplate(i)}
                className="w-full text-[10px] h-7 justify-start px-2">
                {t.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Build Grid (center) */}
        <div className="flex-1 flex items-center justify-center bg-zinc-950 p-4 overflow-auto">
          <div className="relative" style={{ width: GRID_W * GRID_SIZE, height: GRID_H * GRID_SIZE }}>
            {/* Grid background */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.15 }}>
              {Array.from({ length: GRID_W + 1 }, (_, i) => (
                <line key={`v${i}`} x1={i * GRID_SIZE} y1={0} x2={i * GRID_SIZE} y2={GRID_H * GRID_SIZE} stroke="#555" strokeWidth={1} />
              ))}
              {Array.from({ length: GRID_H + 1 }, (_, i) => (
                <line key={`h${i}`} x1={0} y1={i * GRID_SIZE} x2={GRID_W * GRID_SIZE} y2={i * GRID_SIZE} stroke="#555" strokeWidth={1} />
              ))}
            </svg>

            {/* Placed blocks */}
            {placed.map((p, i) => {
              const b = getBlock(p.blockId);
              if (!b) return null;
              const catColor = b.category === 'structure' ? '#3b82f6' : b.category === 'propulsion' ? '#f97316' : b.category === 'weapon' ? '#ef4444' : '#8b5cf6';
              return (
                <div key={i} className="absolute cursor-pointer group"
                  style={{ left: p.gridX * GRID_SIZE, top: p.gridY * GRID_SIZE, width: GRID_SIZE, height: GRID_SIZE }}
                  onClick={() => removeBlock(p.gridX, p.gridY)}
                  title={`${b.name} — click to remove`}>
                  <div className="w-full h-full rounded-md border-2 flex items-center justify-center transition-all group-hover:scale-110"
                    style={{ borderColor: catColor, backgroundColor: catColor + '20' }}>
                    <span className="text-lg">{b.icon}</span>
                  </div>
                  <div className="absolute -bottom-3 left-0 right-0 text-center text-[7px] text-zinc-500 truncate pointer-events-none">
                    {b.name.split(' ').slice(0, 2).join(' ')}
                  </div>
                </div>
              );
            })}

            {/* Click areas for empty cells */}
            {Array.from({ length: GRID_W * GRID_H }, (_, idx) => {
              const x = idx % GRID_W, y = Math.floor(idx / GRID_W);
              const key = `${x},${y}`;
              if (cellMap.has(key)) return null;
              const isHover = hoverCell?.x === x && hoverCell?.y === y;
              return (
                <div key={key} className="absolute cursor-crosshair"
                  style={{ left: x * GRID_SIZE, top: y * GRID_SIZE, width: GRID_SIZE, height: GRID_SIZE }}
                  onMouseEnter={() => setHoverCell({ x, y })}
                  onMouseLeave={() => setHoverCell(null)}
                  onClick={() => placeBlock(x, y)}>
                  {isHover && selectedBlock && (
                    <div className="w-full h-full rounded-md border-2 border-dashed border-amber-400/40 bg-amber-400/10 flex items-center justify-center">
                      <span className="text-sm opacity-50">{getBlock(selectedBlock)?.icon}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats Panel (right) */}
        <div className="w-56 bg-zinc-900 border-l border-zinc-700 p-3 space-y-3 shrink-0 overflow-auto">
          <div className="text-xs font-bold text-zinc-300">Ship Stats</div>
          <div className="space-y-2">
            {[
              { label: 'Hull HP', value: stats.hp, color: 'bg-red-500', icon: '❤️' },
              { label: 'Speed', value: stats.speed, color: 'bg-green-500', icon: '💨' },
              { label: 'Turn Rate', value: stats.turnSpeed.toFixed(2), color: 'bg-cyan-500', icon: '🔄' },
              { label: 'Weapon DMG', value: stats.cannonDamage, color: 'bg-orange-500', icon: '💥' },
              { label: 'Weapon Range', value: stats.cannonRange, color: 'bg-purple-500', icon: '🎯' },
              { label: 'Crew Cap', value: stats.crewCapacity, color: 'bg-blue-500', icon: '🧑' },
              { label: 'Cargo Cap', value: stats.cargoCapacity, color: 'bg-amber-500', icon: '📦' },
            ].map(s => (
              <div key={s.label}>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-zinc-400">{s.icon} {s.label}</span>
                  <span className="text-zinc-200 font-bold">{s.value}</span>
                </div>
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className={`h-full ${s.color} rounded-full`} style={{ width: `${Math.min(100, (Number(s.value) / 500) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-zinc-700 pt-3">
            <div className="text-xs font-bold text-zinc-300 mb-2">Build Cost</div>
            <div className="flex gap-3 text-sm">
              <span className="text-amber-400 font-bold">🪙 {cost.gold}</span>
              <span className="text-green-400 font-bold">🪵 {cost.wood}</span>
            </div>
          </div>

          <div className="border-t border-zinc-700 pt-3">
            <div className="text-xs font-bold text-zinc-300 mb-2">Block Count</div>
            <div className="grid grid-cols-2 gap-1 text-[9px]">
              {(['structure', 'propulsion', 'weapon', 'misc'] as BlockCategory[]).map(cat => {
                const count = placed.filter(p => getBlock(p.blockId)?.category === cat).length;
                return (
                  <div key={cat} className="bg-zinc-800 rounded px-2 py-1">
                    <span className="text-zinc-500">{CAT_LABELS[cat].icon}</span> {count}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected block info */}
          {selectedBlock && (() => {
            const b = getBlock(selectedBlock);
            if (!b) return null;
            return (
              <div className="border-t border-zinc-700 pt-3">
                <div className="text-xs font-bold text-zinc-300 mb-1">{b.icon} {b.name}</div>
                <div className="text-[9px] text-zinc-400 mb-2">{b.description}</div>
                <div className="text-[8px] text-zinc-500">Click on grid to place · Click placed block to remove</div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
