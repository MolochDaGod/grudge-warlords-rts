import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, Upload, FileDown, FolderDown, RotateCcw } from 'lucide-react';
import { DesignerCanvas } from '@/components/game-designer/DesignerCanvas';
import { NodePalette } from '@/components/game-designer/NodePalette';
import { PropertiesPanel } from '@/components/game-designer/PropertiesPanel';
import type { DesignerNode, Connection, NodeTemplate, DesignDocument } from '@/lib/rts-engine/designer-types';
import { NODE_DEFAULTS } from '@/lib/rts-engine/designer-types';
import { DEFAULT_FACTION_DESIGNS, getMaxNodeId, type FactionId } from '@/lib/rts-engine/default-designs';

const FACTION_STORAGE_PREFIX = 'grudge_rts_faction_';
const FACTIONS: FactionId[] = ['kingdom', 'legion', 'neutral'];

interface FactionState { nodes: DesignerNode[]; connections: Connection[]; }

function loadFactionDesign(faction: FactionId): FactionState {
  try { const raw = localStorage.getItem(FACTION_STORAGE_PREFIX + faction); if (raw) { const p = JSON.parse(raw); if (p.nodes?.length > 0) return p; } } catch {}
  const def = DEFAULT_FACTION_DESIGNS[faction];
  return { nodes: def.nodes.map(n => ({ ...n })), connections: def.connections.map(c => ({ ...c })) };
}

function saveFactionDesign(faction: FactionId, state: FactionState) { localStorage.setItem(FACTION_STORAGE_PREFIX + faction, JSON.stringify(state)); }
function saveAllFactions(designs: Record<FactionId, FactionState>) { for (const f of FACTIONS) saveFactionDesign(f, designs[f]); }

let _nid = 100;
function seedNodeIdCounter(designs: Record<FactionId, FactionState>) { let max = 0; for (const f of FACTIONS) { const m = getMaxNodeId(designs[f].nodes); if (m > max) max = m; } _nid = max + 1; }
const nodeId = () => `node_${_nid++}`;

export default function DesignerPage() {
  const [factionDesigns, setFactionDesigns] = useState<Record<FactionId, FactionState>>(() => {
    const designs = { kingdom: loadFactionDesign('kingdom'), legion: loadFactionDesign('legion'), neutral: loadFactionDesign('neutral') };
    seedNodeIdCounter(designs);
    return designs;
  });
  const [activeFaction, setActiveFaction] = useState<FactionId>('kingdom');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState('');
  const [dirty, setDirty] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const currentDesign = factionDesigns[activeFaction];
  const nodes = currentDesign.nodes;
  const connections = currentDesign.connections;
  const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? null;
  const factionMeta = DEFAULT_FACTION_DESIGNS[activeFaction];

  const setNodes = useCallback((updater: DesignerNode[] | ((prev: DesignerNode[]) => DesignerNode[])) => {
    setFactionDesigns(prev => { const c = prev[activeFaction]; const n = typeof updater === 'function' ? updater(c.nodes) : updater; return { ...prev, [activeFaction]: { ...c, nodes: n } }; });
    setDirty(true);
  }, [activeFaction]);

  const setConnections = useCallback((updater: Connection[] | ((prev: Connection[]) => Connection[])) => {
    setFactionDesigns(prev => { const c = prev[activeFaction]; const n = typeof updater === 'function' ? updater(c.connections) : updater; return { ...prev, [activeFaction]: { ...c, connections: n } }; });
    setDirty(true);
  }, [activeFaction]);

  const handleFactionChange = useCallback((faction: FactionId) => {
    setFactionDesigns(prev => { saveFactionDesign(activeFaction, prev[activeFaction]); return prev; });
    setSelectedNodeId(null); setActiveFaction(faction); setConfirmReset(false);
  }, [activeFaction]);

  const handleDropNode = useCallback((kindData: string, x: number, y: number) => {
    try {
      const template: NodeTemplate = JSON.parse(kindData);
      const defaults = NODE_DEFAULTS[template.kind];
      setNodes(prev => [...prev, { id: nodeId(), kind: template.kind, name: template.name, icon: template.icon, x: x - defaults.w / 2, y: y - defaults.h / 2, w: defaults.w, h: defaults.h, configKey: template.configKey, stats: { ...template.defaultStats }, color: template.color, tier: template.defaultTier, cost: template.defaultCost ? { ...template.defaultCost } : undefined, description: template.description }]);
    } catch {}
  }, [setNodes]);

  const handleNodeChange = useCallback((updated: DesignerNode) => { setNodes(prev => prev.map(n => n.id === updated.id ? updated : n)); }, [setNodes]);
  const handleSave = useCallback(() => { saveAllFactions(factionDesigns); setDirty(false); setSaveMsg('Saved!'); setTimeout(() => setSaveMsg(''), 2000); }, [factionDesigns]);

  useEffect(() => { const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); } }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [handleSave]);

  const handleResetFaction = () => {
    if (!confirmReset) { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 3000); return; }
    const def = DEFAULT_FACTION_DESIGNS[activeFaction];
    setFactionDesigns(prev => ({ ...prev, [activeFaction]: { nodes: def.nodes.map(n => ({ ...n })), connections: def.connections.map(c => ({ ...c })) } }));
    setSelectedNodeId(null); setConfirmReset(false); setDirty(true);
  };

  const buildingCount = nodes.filter(n => n.kind === 'building').length;
  const unitCount = nodes.filter(n => n.kind === 'unit').length;
  const heroCount = nodes.filter(n => n.kind === 'hero').length;

  return (
    <div className="h-full flex flex-col">
      {/* Faction selector + actions */}
      <div className="flex items-center gap-1 px-4 py-1.5 bg-zinc-900/60 border-b border-zinc-800 shrink-0">
        {FACTIONS.map(f => {
          const meta = DEFAULT_FACTION_DESIGNS[f];
          const isActive = activeFaction === f;
          return (
            <button key={f} onClick={() => handleFactionChange(f)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-t-lg text-sm font-semibold transition-all ${isActive ? 'text-white border-b-2' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
              style={isActive ? { borderColor: meta.color, backgroundColor: meta.bgColor + '40' } : {}}>
              <span className="text-base">{meta.icon}</span><span>{meta.label}</span>
            </button>
          );
        })}
        <div className="flex-1" />
        <Badge variant="outline" className="text-[10px]" style={{ borderColor: factionMeta.color, color: factionMeta.color }}>
          {buildingCount}B · {unitCount}U · {heroCount}H · {connections.length} links
        </Badge>
        {saveMsg && <Badge className="text-xs bg-green-600">{saveMsg}</Badge>}
        {dirty && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
        <Button size="sm" variant="outline" onClick={handleSave}><Save className="h-3.5 w-3.5 mr-1" /> Save</Button>
        <Button size="sm" variant="ghost" onClick={handleResetFaction}
          className={`text-[10px] h-6 px-2 ${confirmReset ? 'text-red-400 bg-red-400/10' : 'text-zinc-500 hover:text-red-400'}`}>
          <RotateCcw className="h-3 w-3 mr-1" /> {confirmReset ? 'Confirm?' : 'Reset'}
        </Button>
      </div>

      {/* Designer workspace */}
      <div className="flex-1 flex min-h-0">
        <NodePalette />
        <div className="flex-1 min-w-0">
          <DesignerCanvas nodes={nodes} connections={connections} onNodesChange={setNodes} onConnectionsChange={setConnections}
            onSelectNode={setSelectedNodeId} selectedNodeId={selectedNodeId} onDropNode={handleDropNode} />
        </div>
        <PropertiesPanel node={selectedNode} connections={connections} allNodes={nodes} onNodeChange={handleNodeChange} />
      </div>
    </div>
  );
}
