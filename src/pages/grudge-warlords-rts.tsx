import { useState, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Download, Upload, Play, Home } from 'lucide-react';
import { Link } from 'wouter';
import { DesignerCanvas } from '@/components/game-designer/DesignerCanvas';
import { NodePalette } from '@/components/game-designer/NodePalette';
import { PropertiesPanel } from '@/components/game-designer/PropertiesPanel';
import { GameCanvas } from '@/components/game-designer/GameCanvas';
import { RTSMapEditor } from '@/components/rts-map-editor';
import { AdminCompendium } from '@/components/admin-compendium';
import type { DesignerNode, Connection, NodeTemplate, DesignDocument } from '@/lib/rts-engine/designer-types';
import { NODE_DEFAULTS } from '@/lib/rts-engine/designer-types';

let _nid = 1;
const nodeId = () => `node_${_nid++}`;

const STORAGE_KEY = 'grudge_rts_design';

function loadDesign(): { nodes: DesignerNode[]; connections: Connection[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { nodes: [], connections: [] };
}

function saveDesign(nodes: DesignerNode[], connections: Connection[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, connections }));
}

export default function GrudgeWarlordsRTS() {
  const initial = loadDesign();
  const [nodes, setNodes] = useState<DesignerNode[]>(initial.nodes);
  const [connections, setConnections] = useState<Connection[]>(initial.connections);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [tab, setTab] = useState('play');

  const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? null;

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
  }, []);

  // ── Node update from properties panel ──────────────────────────────────────
  const handleNodeChange = useCallback((updated: DesignerNode) => {
    setNodes(prev => prev.map(n => n.id === updated.id ? updated : n));
  }, []);

  // ── Save / Export / Import ─────────────────────────────────────────────────
  const handleSave = () => {
    saveDesign(nodes, connections);
  };

  const handleExport = () => {
    const doc: DesignDocument = {
      id: 'grudge-warlords-design',
      name: 'Grudge Warlords RTS Design',
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
    a.download = 'grudge-rts-design.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const doc: DesignDocument = JSON.parse(text);
        setNodes(doc.nodes);
        setConnections(doc.connections);
        saveDesign(doc.nodes, doc.connections);
      } catch {}
    };
    input.click();
  };

  // ── Admin stats ────────────────────────────────────────────────────────────
  const buildingNodes = nodes.filter(n => n.kind === 'building');
  const unitNodes = nodes.filter(n => n.kind === 'unit');
  const heroNodes = nodes.filter(n => n.kind === 'hero');
  const spellNodes = nodes.filter(n => n.kind === 'spell');
  const upgradeNodes = nodes.filter(n => n.kind === 'upgrade');
  const trainConns = connections.filter(c => c.type === 'trains');
  const reqConns = connections.filter(c => c.type === 'requires');

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
        <Button size="sm" variant="outline" onClick={handleSave}><Save className="h-3.5 w-3.5 mr-1" /> Save</Button>
        <Button size="sm" variant="outline" onClick={handleExport}><Download className="h-3.5 w-3.5 mr-1" /> Export</Button>
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

        {/* Designer Tab */}
        <TabsContent value="designer" className="flex-1 flex min-h-0 m-0">
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
