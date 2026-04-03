import { useState, useCallback, useRef, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Download, Upload, Play, Home, RotateCcw } from 'lucide-react';
import { Link } from 'wouter';
import { DesignerCanvas } from '@/components/game-designer/DesignerCanvas';
import { NodePalette } from '@/components/game-designer/NodePalette';
import { PropertiesPanel } from '@/components/game-designer/PropertiesPanel';
import { GameCanvas } from '@/components/game-designer/GameCanvas';
import { RTSMapEditor } from '@/components/rts-map-editor';
import { AdminCompendium } from '@/components/admin-compendium';
import type { DesignerNode, Connection, NodeTemplate, DesignDocument } from '@/lib/rts-engine/designer-types';
import { NODE_DEFAULTS } from '@/lib/rts-engine/designer-types';
import { DEFAULT_FACTION_DESIGNS, getMaxNodeId, type FactionId } from '@/lib/rts-engine/default-designs';

// ── Per-faction storage keys ──────────────────────────────────────────────────
const FACTION_STORAGE_PREFIX = 'grudge_rts_faction_';
const FACTIONS: FactionId[] = ['kingdom', 'legion', 'neutral'];

interface FactionState {
  nodes: DesignerNode[];
  connections: Connection[];
}

function loadFactionDesign(faction: FactionId): FactionState {
  try {
    const raw = localStorage.getItem(FACTION_STORAGE_PREFIX + faction);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.nodes?.length > 0) return parsed;
    }
  } catch {}
  // Fall back to built-in defaults
  const def = DEFAULT_FACTION_DESIGNS[faction];
  return {
    nodes: def.nodes.map(n => ({ ...n })),
    connections: def.connections.map(c => ({ ...c })),
  };
}

function saveFactionDesign(faction: FactionId, state: FactionState) {
  localStorage.setItem(FACTION_STORAGE_PREFIX + faction, JSON.stringify(state));
}

function saveAllFactions(designs: Record<FactionId, FactionState>) {
  for (const f of FACTIONS) {
    saveFactionDesign(f, designs[f]);
  }
}

// ── Node ID counter seeded from loaded designs ─────────────────────────────────
let _nid = 100;
function seedNodeIdCounter(designs: Record<FactionId, FactionState>) {
  let max = 0;
  for (const f of FACTIONS) {
    const m = getMaxNodeId(designs[f].nodes);
    if (m > max) max = m;
  }
  _nid = max + 1;
}

const nodeId = () => `node_${_nid++}`;

export default function GrudgeWarlordsRTS() {
  // ── Load all faction designs on mount ────────────────────────────────────────
  const [factionDesigns, setFactionDesigns] = useState<Record<FactionId, FactionState>>(() => {
    const designs = {
      kingdom: loadFactionDesign('kingdom'),
      legion: loadFactionDesign('legion'),
      neutral: loadFactionDesign('neutral'),
    };
    seedNodeIdCounter(designs);
    return designs;
  });

  const [activeFaction, setActiveFaction] = useState<FactionId>('kingdom');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [tab, setTab] = useState('play');
  const [saveMsg, setSaveMsg] = useState('');

  // Current faction data shortcuts
  const currentDesign = factionDesigns[activeFaction];
  const nodes = currentDesign.nodes;
  const connections = currentDesign.connections;
  const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? null;
  const factionMeta = DEFAULT_FACTION_DESIGNS[activeFaction];

  // ── Update helpers that write to the active faction ──────────────────────────
  const updateFaction = useCallback((faction: FactionId, updater: (prev: FactionState) => FactionState) => {
    setFactionDesigns(prev => ({
      ...prev,
      [faction]: updater(prev[faction]),
    }));
  }, []);

  const setNodes = useCallback((updater: DesignerNode[] | ((prev: DesignerNode[]) => DesignerNode[])) => {
    setFactionDesigns(prev => {
      const current = prev[activeFaction];
      const newNodes = typeof updater === 'function' ? updater(current.nodes) : updater;
      return { ...prev, [activeFaction]: { ...current, nodes: newNodes } };
    });
  }, [activeFaction]);

  const setConnections = useCallback((updater: Connection[] | ((prev: Connection[]) => Connection[])) => {
    setFactionDesigns(prev => {
      const current = prev[activeFaction];
      const newConns = typeof updater === 'function' ? updater(current.connections) : updater;
      return { ...prev, [activeFaction]: { ...current, connections: newConns } };
    });
  }, [activeFaction]);

  // ── Clear selection when switching factions ─────────────────────────────────
  const handleFactionChange = useCallback((faction: FactionId) => {
    setSelectedNodeId(null);
    setActiveFaction(faction);
  }, []);

  // ── Drop handler: create node from palette template ────────────────────────
  const handleDropNode = useCallback((kindData: string, x: number, y: number) => {
    try {
      const template: NodeTemplate = JSON.parse(kindData);
      const defaults = NODE_DEFAULTS[template.kind];
      const newNode: DesignerNode = {
        id: nodeId(),
        kind: template.kind,
        name: template.name,
        icon: template.icon,
        x: x - defaults.w / 2,
        y: y - defaults.h / 2,
        w: defaults.w,
        h: defaults.h,
        configKey: template.configKey,
        stats: { ...template.defaultStats },
        color: template.color,
        tier: template.defaultTier,
        cost: template.defaultCost ? { ...template.defaultCost } : undefined,
        description: template.description,
      };
      setNodes(prev => [...prev, newNode]);
    } catch {}
  }, [setNodes]);

  // ── Node update from properties panel ──────────────────────────────────────
  const handleNodeChange = useCallback((updated: DesignerNode) => {
    setNodes(prev => prev.map(n => n.id === updated.id ? updated : n));
  }, [setNodes]);

  // ── Save all factions ──────────────────────────────────────────────────────
  const handleSave = () => {
    saveAllFactions(factionDesigns);
    setSaveMsg('All factions saved!');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  // ── Export current faction ──────────────────────────────────────────────────
  const handleExport = () => {
    const doc: DesignDocument = {
      id: `grudge-warlords-${activeFaction}`,
      name: `Grudge Warlords — ${factionMeta.label} Design`,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes,
      connections,
      viewport: { panX: 0, panY: 0, zoom: 1 },
    };
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grudge-rts-${activeFaction}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Export all factions ────────────────────────────────────────────────────
  const handleExportAll = () => {
    const allDoc = {
      id: 'grudge-warlords-all-factions',
      name: 'Grudge Warlords — All Factions',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      factions: Object.fromEntries(
        FACTIONS.map(f => [f, { nodes: factionDesigns[f].nodes, connections: factionDesigns[f].connections }])
      ),
    };
    const blob = new Blob([JSON.stringify(allDoc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'grudge-rts-all-factions.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Import (detects single-faction or all-factions format) ─────────────────
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const doc = JSON.parse(text);
        if (doc.factions) {
          // All-factions import
          setFactionDesigns(prev => {
            const next = { ...prev };
            for (const f of FACTIONS) {
              if (doc.factions[f]) {
                next[f] = { nodes: doc.factions[f].nodes, connections: doc.factions[f].connections };
              }
            }
            seedNodeIdCounter(next);
            return next;
          });
          setSaveMsg('All factions imported!');
        } else if (doc.nodes) {
          // Single-faction import into current faction
          updateFaction(activeFaction, () => ({ nodes: doc.nodes, connections: doc.connections }));
          setSaveMsg(`Imported into ${factionMeta.label}!`);
        }
        setTimeout(() => setSaveMsg(''), 2000);
      } catch {}
    };
    input.click();
  };

  // ── Reset current faction to defaults ──────────────────────────────────────
  const handleResetFaction = () => {
    const def = DEFAULT_FACTION_DESIGNS[activeFaction];
    updateFaction(activeFaction, () => ({
      nodes: def.nodes.map(n => ({ ...n })),
      connections: def.connections.map(c => ({ ...c })),
    }));
    setSelectedNodeId(null);
    setSaveMsg(`${factionMeta.label} reset to defaults`);
    setTimeout(() => setSaveMsg(''), 2000);
  };

  // ── Faction stats ──────────────────────────────────────────────────────────
  const buildingCount = nodes.filter(n => n.kind === 'building').length;
  const unitCount = nodes.filter(n => n.kind === 'unit').length;
  const heroCount = nodes.filter(n => n.kind === 'hero').length;

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <Link href="/">
          <Button size="sm" variant="ghost"><Home className="h-4 w-4 mr-1" /> Home</Button>
        </Link>
        <h1 className="text-lg font-bold text-zinc-100">Grudge Warlords — RTS Game Designer</h1>
        <Badge variant="outline" className="text-xs">WC3-Style</Badge>
        <div className="flex-1" />
        {saveMsg && <Badge variant="default" className="text-xs bg-green-600 animate-pulse">{saveMsg}</Badge>}
        <Button size="sm" variant="outline" onClick={handleSave}><Save className="h-3.5 w-3.5 mr-1" /> Save All</Button>
        <Button size="sm" variant="outline" onClick={handleExport}><Download className="h-3.5 w-3.5 mr-1" /> Export</Button>
        <Button size="sm" variant="outline" onClick={handleExportAll}><Download className="h-3.5 w-3.5 mr-1" /> Export All</Button>
        <Button size="sm" variant="outline" onClick={handleImport}><Upload className="h-3.5 w-3.5 mr-1" /> Import</Button>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-2 w-fit bg-zinc-800">
          <TabsTrigger value="play" className="text-xs">🎮 Play Game</TabsTrigger>
          <TabsTrigger value="designer" className="text-xs">🎨 Designer</TabsTrigger>
          <TabsTrigger value="map" className="text-xs">🗺️ Map Editor</TabsTrigger>
          <TabsTrigger value="admin" className="text-xs">⚙️ Admin</TabsTrigger>
        </TabsList>

        {/* Play Tab */}
        <TabsContent value="play" className="flex-1 min-h-0 m-0">
          <GameCanvas />
        </TabsContent>

        {/* Designer Tab — with Faction Tabs */}
        <TabsContent value="designer" className="flex-1 flex flex-col min-h-0 m-0">
          {/* Faction selector bar */}
          <div className="flex items-center gap-1 px-4 py-1.5 bg-zinc-900/60 border-b border-zinc-800">
            {FACTIONS.map(f => {
              const meta = DEFAULT_FACTION_DESIGNS[f];
              const isActive = activeFaction === f;
              const fNodes = factionDesigns[f].nodes;
              const bCount = fNodes.filter(n => n.kind === 'building').length;
              const uCount = fNodes.filter(n => n.kind === 'unit').length;
              return (
                <button
                  key={f}
                  onClick={() => handleFactionChange(f)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-t-lg text-sm font-semibold transition-all ${
                    isActive
                      ? 'text-white border-b-2'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
                  style={isActive ? { borderColor: meta.color, backgroundColor: meta.bgColor + '40' } : {}}
                >
                  <span className="text-base">{meta.icon}</span>
                  <span>{meta.label}</span>
                  <span className="text-[10px] text-zinc-500 ml-1">{bCount}B {uCount}U</span>
                </button>
              );
            })}
            <div className="flex-1" />
            <Badge variant="outline" className="text-[10px]" style={{ borderColor: factionMeta.color, color: factionMeta.color }}>
              {factionMeta.icon} {factionMeta.label}: {buildingCount} buildings · {unitCount} units · {heroCount} heroes · {connections.length} links
            </Badge>
            <Button size="sm" variant="ghost" onClick={handleResetFaction} className="text-[10px] h-6 px-2 text-zinc-500 hover:text-red-400">
              <RotateCcw className="h-3 w-3 mr-1" /> Reset
            </Button>
          </div>

          {/* Designer workspace */}
          <div className="flex-1 flex min-h-0">
            <NodePalette />
            <div className="flex-1 min-w-0">
              <DesignerCanvas
                nodes={nodes} connections={connections}
                onNodesChange={setNodes} onConnectionsChange={setConnections}
                onSelectNode={setSelectedNodeId} selectedNodeId={selectedNodeId}
                onDropNode={handleDropNode}
              />
            </div>
            <PropertiesPanel node={selectedNode} connections={connections}
              allNodes={nodes} onNodeChange={handleNodeChange} />
          </div>
        </TabsContent>

        {/* Map Editor Tab */}
        <TabsContent value="map" className="flex-1 p-4 overflow-auto m-0">
          <RTSMapEditor width={60} height={40} />
        </TabsContent>

        {/* Admin Tab */}
        <TabsContent value="admin" className="flex-1 min-h-0 m-0">
          <AdminCompendium />
        </TabsContent>
      </Tabs>
    </div>
  );
}
