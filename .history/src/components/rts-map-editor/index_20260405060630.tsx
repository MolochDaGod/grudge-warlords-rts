import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Upload, Trash2, Plus, Eye } from 'lucide-react';
import type { MapDef, ResourceDef, UnitDef } from '@/lib/rts-engine/maps';
import type { UnitType, BuildingType, Faction } from '@/lib/rts-engine/types';

// ── Tile types ──────────────────────────────────────────────────────────────────
type TileType = 'water' | 'grass' | 'rock' | 'sand' | 'snow';

const TILE_COLORS: Record<TileType, string> = {
  water: '#1e6091',
  grass: '#4a7c59',
  rock: '#6b7280',
  sand: '#d4a574',
  snow: '#e2e8f0',
};

type PlacementTool =
  | 'terrain'
  | 'blue_castle' | 'red_castle'
  | 'tree' | 'goldmine'
  | 'blue_unit' | 'red_unit'
  | 'creep_camp'
  | 'eraser';

const TILE_SIZE = 18;
const STORAGE_KEY = 'grudge_rts_map_editor';

interface MapEditorState {
  name: string;
  width: number;
  height: number;
  tiles: TileType[][];
  islands: { id: string; x: number; y: number; w: number; h: number; faction: Faction | 'neutral' }[];
  blueCastle: { x: number; y: number } | null;
  redCastle: { x: number; y: number } | null;
  resources: ResourceDef[];
  startingUnits: UnitDef[];
  creepCamps: { pos: { x: number; y: number }; difficulty: number }[];
  startGold: number;
  startWood: number;
}

function createEmptyMap(w: number, h: number): TileType[][] {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => 'water' as TileType));
}

function loadEditorState(w: number, h: number): MapEditorState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.width === w && parsed.height === h) return parsed;
    }
  } catch {}
  return {
    name: 'Custom Map',
    width: w,
    height: h,
    tiles: createEmptyMap(w, h),
    islands: [],
    blueCastle: null,
    redCastle: null,
    resources: [],
    startingUnits: [],
    creepCamps: [],
    startGold: 500,
    startWood: 150,
  };
}

function saveEditorState(state: MapEditorState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

interface RTSMapEditorProps {
  width?: number;
  height?: number;
}

export function RTSMapEditor({ width = 60, height = 40 }: RTSMapEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<MapEditorState>(() => loadEditorState(width, height));
  const [tool, setTool] = useState<PlacementTool>('terrain');
  const [terrainBrush, setTerrainBrush] = useState<TileType>('grass');
  const [brushSize, setBrushSize] = useState(3);
  const [isPainting, setIsPainting] = useState(false);
  const [showGrid, setShowGrid] = useState(true);

  // ── Auto-save ───────────────────────────────────────────────────────────────
  useEffect(() => {
    saveEditorState(state);
  }, [state]);

  // ── Render canvas ───────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = state.width * TILE_SIZE;
    const ch = state.height * TILE_SIZE;
    canvas.width = cw;
    canvas.height = ch;

    // Draw tiles
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const tile = state.tiles[y]?.[x] ?? 'water';
        ctx.fillStyle = TILE_COLORS[tile];
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }

    // Grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= state.width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * TILE_SIZE, 0);
        ctx.lineTo(x * TILE_SIZE, ch);
        ctx.stroke();
      }
      for (let y = 0; y <= state.height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * TILE_SIZE);
        ctx.lineTo(cw, y * TILE_SIZE);
        ctx.stroke();
      }
    }

    // Islands overlay
    for (const isl of state.islands) {
      ctx.strokeStyle = isl.faction === 'blue' ? '#3b82f6' : isl.faction === 'red' ? '#ef4444' : '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.strokeRect(isl.x, isl.y, isl.w, isl.h);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '10px sans-serif';
      ctx.fillText(isl.id, isl.x + 4, isl.y + 12);
    }

    // Castles
    if (state.blueCastle) {
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(state.blueCastle.x - 8, state.blueCastle.y - 8, 16, 16);
      ctx.fillStyle = '#fff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏰', state.blueCastle.x, state.blueCastle.y + 4);
      ctx.textAlign = 'left';
    }
    if (state.redCastle) {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(state.redCastle.x - 8, state.redCastle.y - 8, 16, 16);
      ctx.fillStyle = '#fff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏰', state.redCastle.x, state.redCastle.y + 4);
      ctx.textAlign = 'left';
    }

    // Resources
    for (const res of state.resources) {
      if (res.type === 'tree') {
        ctx.fillStyle = '#166534';
        ctx.beginPath();
        ctx.moveTo(res.pos.x, res.pos.y - 6);
        ctx.lineTo(res.pos.x - 4, res.pos.y + 2);
        ctx.lineTo(res.pos.x + 4, res.pos.y + 2);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(res.pos.x, res.pos.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Starting units
    for (const u of state.startingUnits) {
      ctx.fillStyle = u.faction === 'blue' ? '#60a5fa' : '#f87171';
      ctx.beginPath();
      ctx.arc(u.pos.x, u.pos.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Creep camps
    for (const camp of state.creepCamps) {
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(camp.pos.x, camp.pos.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#000';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${camp.difficulty}`, camp.pos.x, camp.pos.y + 3);
      ctx.textAlign = 'left';
    }
  }, [state, showGrid]);

  // ── Paint tile ──────────────────────────────────────────────────────────────
  const paintAt = useCallback((px: number, py: number) => {
    const tileX = Math.floor(px / TILE_SIZE);
    const tileY = Math.floor(py / TILE_SIZE);
    const half = Math.floor(brushSize / 2);

    if (tool === 'terrain') {
      setState(prev => {
        const newTiles = prev.tiles.map(row => [...row]);
        for (let dy = -half; dy <= half; dy++) {
          for (let dx = -half; dx <= half; dx++) {
            const tx = tileX + dx;
            const ty = tileY + dy;
            if (tx >= 0 && tx < prev.width && ty >= 0 && ty < prev.height) {
              newTiles[ty][tx] = terrainBrush;
            }
          }
        }
        return { ...prev, tiles: newTiles };
      });
    } else if (tool === 'eraser') {
      setState(prev => {
        const newTiles = prev.tiles.map(row => [...row]);
        for (let dy = -half; dy <= half; dy++) {
          for (let dx = -half; dx <= half; dx++) {
            const tx = tileX + dx;
            const ty = tileY + dy;
            if (tx >= 0 && tx < prev.width && ty >= 0 && ty < prev.height) {
              newTiles[ty][tx] = 'water';
            }
          }
        }
        return { ...prev, tiles: newTiles };
      });
    } else if (tool === 'blue_castle') {
      setState(prev => ({ ...prev, blueCastle: { x: px, y: py } }));
    } else if (tool === 'red_castle') {
      setState(prev => ({ ...prev, redCastle: { x: px, y: py } }));
    } else if (tool === 'tree') {
      setState(prev => ({
        ...prev,
        resources: [...prev.resources, { type: 'tree', pos: { x: px, y: py } }],
      }));
    } else if (tool === 'goldmine') {
      setState(prev => ({
        ...prev,
        resources: [...prev.resources, { type: 'goldmine', pos: { x: px, y: py }, amount: 12500 }],
      }));
    } else if (tool === 'blue_unit') {
      setState(prev => ({
        ...prev,
        startingUnits: [...prev.startingUnits, { faction: 'blue', type: 'pawn' as UnitType, pos: { x: px, y: py } }],
      }));
    } else if (tool === 'red_unit') {
      setState(prev => ({
        ...prev,
        startingUnits: [...prev.startingUnits, { faction: 'red', type: 'pawn' as UnitType, pos: { x: px, y: py } }],
      }));
    } else if (tool === 'creep_camp') {
      setState(prev => ({
        ...prev,
        creepCamps: [...prev.creepCamps, { pos: { x: px, y: py }, difficulty: 1 }],
      }));
    }
  }, [tool, terrainBrush, brushSize]);

  // ── Mouse handlers ──────────────────────────────────────────────────────────
  const getCanvasPos = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPainting(true);
    const pos = getCanvasPos(e);
    paintAt(pos.x, pos.y);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPainting) return;
    if (tool !== 'terrain' && tool !== 'eraser') return;
    const pos = getCanvasPos(e);
    paintAt(pos.x, pos.y);
  };

  const handleMouseUp = () => setIsPainting(false);

  // ── Auto-detect islands from grass regions ──────────────────────────────────
  const detectIslands = () => {
    const visited = Array.from({ length: state.height }, () => Array(state.width).fill(false));
    const islands: MapEditorState['islands'] = [];
    let idx = 0;

    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        if (visited[y][x] || state.tiles[y][x] === 'water') continue;
        // BFS flood fill
        const queue = [{ x, y }];
        visited[y][x] = true;
        let minX = x, maxX = x, minY = y, maxY = y;
        while (queue.length > 0) {
          const cur = queue.shift()!;
          minX = Math.min(minX, cur.x);
          maxX = Math.max(maxX, cur.x);
          minY = Math.min(minY, cur.y);
          maxY = Math.max(maxY, cur.y);
          for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
            const nx = cur.x + dx;
            const ny = cur.y + dy;
            if (nx >= 0 && nx < state.width && ny >= 0 && ny < state.height && !visited[ny][nx] && state.tiles[ny][nx] !== 'water') {
              visited[ny][nx] = true;
              queue.push({ x: nx, y: ny });
            }
          }
        }
        islands.push({
          id: `island_${idx}`,
          x: minX * TILE_SIZE,
          y: minY * TILE_SIZE,
          w: (maxX - minX + 1) * TILE_SIZE,
          h: (maxY - minY + 1) * TILE_SIZE,
          faction: (idx === 0 ? 'blue' : idx === islands.length ? 'red' : 'neutral') as Faction | 'neutral',
        });
        idx++;
      }
    }
    setState(prev => ({ ...prev, islands }));
  };

  // ── Export as MapDef JSON ────────────────────────────────────────────────────
  const exportMap = () => {
    const mapDef: MapDef = {
      id: state.name.toLowerCase().replace(/\s+/g, '_'),
      name: state.name,
      subtitle: `${state.islands.length}-Island Map`,
      description: `Custom map with ${state.islands.length} islands, ${state.resources.length} resources, ${state.creepCamps.length} creep camps`,
      worldW: state.width * TILE_SIZE,
      worldH: state.height * TILE_SIZE,
      islands: state.islands.map(i => ({ ...i })),
      blueCastle: state.blueCastle ?? { x: 200, y: 300 },
      redCastle: state.redCastle ?? { x: state.width * TILE_SIZE - 200, y: 300 },
      startingUnits: state.startingUnits,
      resources: state.resources,
      creepCamps: state.creepCamps.map(c => ({
        pos: c.pos,
        creeps: [
          { type: 'goblin' as UnitType, level: c.difficulty },
          { type: 'goblin' as UnitType, level: c.difficulty },
        ],
        dropTable: [{ itemId: 'healing_salve', chance: 1.0 }],
        cleared: false,
        xpReward: c.difficulty * 100,
        difficulty: c.difficulty,
      })),
      startingResources: { gold: state.startGold, wood: state.startWood },
      aiAttackInterval: 90,
      thumbnail: '🗺️',
    };
    const blob = new Blob([JSON.stringify(mapDef, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mapDef.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Clear map ───────────────────────────────────────────────────────────────
  const clearMap = () => {
    setState({
      name: 'Custom Map',
      width: state.width,
      height: state.height,
      tiles: createEmptyMap(state.width, state.height),
      islands: [],
      blueCastle: null,
      redCastle: null,
      resources: [],
      startingUnits: [],
      creepCamps: [],
      startGold: 500,
      startWood: 150,
    });
  };

  return (
    <div className="flex gap-4 h-full">
      {/* Toolbar sidebar */}
      <div className="w-64 space-y-3 shrink-0">
        <Card className="bg-zinc-900 border-zinc-700">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Map Editor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            <div>
              <Label className="text-xs text-zinc-400">Map Name</Label>
              <Input className="h-7 text-xs bg-zinc-800 border-zinc-700 mt-1"
                value={state.name}
                onChange={e => setState(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-zinc-500">Start Gold</Label>
                <Input className="h-7 text-xs bg-zinc-800 border-zinc-700" type="number"
                  value={state.startGold}
                  onChange={e => setState(prev => ({ ...prev, startGold: Number(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label className="text-[10px] text-zinc-500">Start Wood</Label>
                <Input className="h-7 text-xs bg-zinc-800 border-zinc-700" type="number"
                  value={state.startWood}
                  onChange={e => setState(prev => ({ ...prev, startWood: Number(e.target.value) || 0 }))} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Terrain Tools */}
        <Card className="bg-zinc-900 border-zinc-700">
          <CardHeader className="py-2 px-4">
            <CardTitle className="text-xs">Terrain</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-2">
            <div className="flex flex-wrap gap-1">
              {(Object.keys(TILE_COLORS) as TileType[]).map(t => (
                <button key={t}
                  className={`w-7 h-7 rounded border-2 text-[9px] bg-[var(--tile-color)] ${tool === 'terrain' && terrainBrush === t ? 'border-white' : 'border-zinc-600'}`}
                  style={{ '--tile-color': TILE_COLORS[t] } as React.CSSProperties}
                  onClick={() => { setTool('terrain'); setTerrainBrush(t); }}
                  title={t}
                />
              ))}
              <button
                className={`w-7 h-7 rounded border-2 text-[9px] flex items-center justify-center ${tool === 'eraser' ? 'border-white bg-zinc-700' : 'border-zinc-600 bg-zinc-800'}`}
                onClick={() => setTool('eraser')}
                title="Eraser">
                🧹
              </button>
            </div>
            <div>
              <Label className="text-[10px] text-zinc-500">Brush Size: {brushSize}</Label>
              <input type="range" min="1" max="8" value={brushSize}
                onChange={e => setBrushSize(Number(e.target.value))}
                title="Brush size"
                className="w-full h-1 mt-1" />
            </div>
          </CardContent>
        </Card>

        {/* Placement Tools */}
        <Card className="bg-zinc-900 border-zinc-700">
          <CardHeader className="py-2 px-4">
            <CardTitle className="text-xs">Placement</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="grid grid-cols-2 gap-1">
              {([
                ['blue_castle', '🏰 Blue Base', '#3b82f6'],
                ['red_castle', '🏰 Red Base', '#ef4444'],
                ['tree', '🌲 Tree', '#166534'],
                ['goldmine', '💰 Gold Mine', '#fbbf24'],
                ['blue_unit', '🔵 Blue Unit', '#3b82f6'],
                ['red_unit', '🔴 Red Unit', '#ef4444'],
                ['creep_camp', '💀 Creep Camp', '#f59e0b'],
              ] as [PlacementTool, string, string][]).map(([t, label, color]) => (
                <Button key={t} size="sm" variant={tool === t ? 'default' : 'ghost'}
                  onClick={() => setTool(t)}
                  className="text-[10px] h-7 justify-start px-2"
                  style={tool === t ? { backgroundColor: color } : {}}>
                  {label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="bg-zinc-900 border-zinc-700">
          <CardContent className="px-4 py-3 space-y-2">
            <Button size="sm" variant="outline" className="w-full text-xs" onClick={detectIslands}>
              <Eye className="h-3 w-3 mr-1" /> Detect Islands
            </Button>
            <Button size="sm" variant="outline" className="w-full text-xs" onClick={exportMap}>
              <Download className="h-3 w-3 mr-1" /> Export MapDef
            </Button>
            <Button size="sm" variant="outline" className="w-full text-xs text-red-400" onClick={clearMap}>
              <Trash2 className="h-3 w-3 mr-1" /> Clear Map
            </Button>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="show-grid" title="Show tile grid" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} />
              <Label htmlFor="show-grid" className="text-[10px] text-zinc-400">Show Grid</Label>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="text-[10px] text-zinc-500 space-y-0.5 px-1">
          <div>Islands: <span className="text-zinc-300">{state.islands.length}</span></div>
          <div>Resources: <span className="text-zinc-300">{state.resources.length}</span></div>
          <div>Units: <span className="text-zinc-300">{state.startingUnits.length}</span></div>
          <div>Camps: <span className="text-zinc-300">{state.creepCamps.length}</span></div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto border border-zinc-700 rounded-lg bg-zinc-950">
        <canvas
          ref={canvasRef}
          className="cursor-crosshair [image-rendering:pixelated]"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
    </div>
  );
}
