import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Save, RotateCcw } from 'lucide-react';
import { UNIT_CONFIGS, BUILDING_CONFIGS, HERO_CONFIGS, ITEM_DEFS, ABILITY_DEFS, getUnitSprites, getBuildingSprite } from '@/lib/rts-engine/constants';
import { VFX_CONFIGS, type VfxType } from '@/lib/rts-engine/vfx';
import {
  getUnitDisplay, getBuildingDisplay,
  saveUnitDisplayOverrides, saveBuildingDisplayOverrides,
  saveDefaultsAsOverrides, resetOverrides,
  getAllUnitDefaults, getAllBuildingDefaults,
  type UnitDisplayConfig, type BuildingDisplayConfig, type ProjectileStyle,
} from '@/lib/rts-engine/unit-defaults';
import type { BuildingType } from '@/lib/rts-engine/types';

const CDN = 'https://molochdagod.github.io/ObjectStore';

// ── Category definitions ────────────────────────────────────────────────────────
type Category = 'All' | 'Base Units' | 'Champion' | 'Soldier' | 'Legion' | 'Monster' | 'Animal' | 'Buildings';

const UNIT_CATEGORIES: Record<string, Category> = {
  warrior:'Base Units', lancer:'Base Units', archer:'Base Units', priest:'Base Units', pawn:'Base Units',
  arthax:'Champion', gangblanc:'Champion', grum:'Champion', kanji:'Champion', katan:'Champion', okomo:'Champion', zhinja:'Champion', borg:'Champion',
  swordsman:'Soldier', spearman:'Soldier', axeman:'Soldier', assasin:'Soldier', bowman:'Soldier', mage:'Soldier', musketeer:'Soldier', knight:'Soldier', farmer:'Soldier', ballista:'Soldier',
  orcPawn:'Legion', orcWarrior:'Legion', orcSpearman:'Legion', orcArcher:'Legion', orcHealer:'Legion',
  orc:'Monster', goblin:'Monster', spearGoblin:'Monster', archerGoblin:'Monster', orcMage:'Monster', orcShaman:'Monster', farmerGoblin:'Monster', kamikazeGoblin:'Monster',
  minotaur:'Monster', demon:'Monster', armouredDemon:'Monster', purpleDemon:'Monster', skeleton:'Monster', necromancer:'Monster',
  yeti:'Monster', wendigo:'Monster', mammoth:'Monster', pirate:'Monster', pirateGunner:'Monster', pirateCaptain:'Monster',
  slime:'Monster', slimeBlue:'Monster', megaSlime:'Monster', megaSlimeBlue:'Monster', kingSlime:'Monster', kingSlimeGreen:'Monster',
  dragon:'Monster', blackDragon:'Monster', blueDragon:'Monster', whiteDragon:'Monster', yellowDragon:'Monster', giantCrab:'Monster',
  desertScorpio:'Monster', desertVulture:'Monster', fireElemental:'Monster', mimic:'Monster', mineElemental:'Monster', ogreBoss:'Monster', pirateCaptainHero:'Monster', steampunkMech:'Monster',
  sheep:'Animal', hornedSheep:'Animal', chicken:'Animal', chick:'Animal', horse:'Animal', boar:'Animal', pig:'Animal',
};

const DISPLAY_NAMES: Record<string, string> = {
  orcPawn:'Orc Pawn', orcWarrior:'Orc Warrior', orcSpearman:'Orc Spearman', orcArcher:'Orc Archer', orcHealer:'Dark Wizard',
  orcMage:'Orc Mage', orcShaman:'Orc Shaman', spearGoblin:'Spear Goblin', archerGoblin:'Archer Goblin',
  farmerGoblin:'Farmer Goblin', kamikazeGoblin:'Kamikaze', armouredDemon:'Armoured Demon', purpleDemon:'Purple Demon',
  blackDragon:'Black Dragon', blueDragon:'Blue Dragon', whiteDragon:'White Dragon', yellowDragon:'Yellow Dragon',
  giantCrab:'Giant Crab', slimeBlue:'Blue Slime', megaSlime:'Mega Slime', megaSlimeBlue:'Mega Blue',
  kingSlime:'King Slime', kingSlimeGreen:'King Slime G', pirateCaptain:'Pirate Captain', pirateGunner:'Pirate Gunner',
  pirateCaptainHero:'Pirate Captain Hero', fireElemental:'Fire Elemental', mineElemental:'Mine Elemental',
  desertScorpio:'Desert Scorpio', desertVulture:'Desert Vulture', ogreBoss:'Ogre Boss', steampunkMech:'Steampunk Mech',
  hornedSheep:'Horned Sheep', gangblanc:'Gangblanc', borg:'Börg',
};

const ALL_UNITS = Object.keys(UNIT_CATEGORIES);
const ALL_BUILDINGS = Object.keys(BUILDING_CONFIGS) as BuildingType[];

const PROJECTILE_OPTIONS: ProjectileStyle[] = ['none','arrow','bolt','holy','energy','fire','water','thunder','shadow'];
const FX_OPTIONS: VfxType[] = ['retro_red_a','retro_red_b','retro_blue_a','retro_blue_b','retro_green_a','retro_green_b',
  'retro_magenta_a','retro_magenta_b','retro_orange_a','retro_orange_b','retro_yellow_a','retro_yellow_b',
  'retro_white_a','retro_white_b','retro_white_c','slash_red','slash_purple','hit_effect_1',
  'fire_hit','firebolt_hit','energy_hit','thunder_hit','thunder_hit2','bullet_green','bullet_purple',
  'water_hit','holy_heal','fire_explosion_2','building_fire','building_smoke','firespin','vortex'];

// ── FX preview canvas ────────────────────────────────────────────────────────────
function FxPreview({ type }: { type: VfxType }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cfg = VFX_CONFIGS[type];
    if (!cfg) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = cfg.src;
    let raf = 0;
    img.onload = () => {
      const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, 48, 48);
        const t = performance.now() / 1000;
        const frame = Math.floor((t * 4) % cfg.cols);
        ctx.drawImage(img, frame * cfg.frameW, 0, cfg.frameW, cfg.frameH, 0, 0, 48, 48);
        raf = requestAnimationFrame(draw);
      };
      draw();
    };
    return () => cancelAnimationFrame(raf);
  }, [type]);
  return <canvas ref={canvasRef} width={48} height={48} className="border border-zinc-700 rounded" />;
}

// ── Unit sprite preview canvas ───────────────────────────────────────────────────
function UnitSpritePreview({ unitKey, size = 56 }: { unitKey: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const sprites = getUnitSprites('blue', unitKey as never);
    const cfg = sprites.idle;
    if (!cfg) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = cfg.src;
    let raf = 0;
    img.onload = () => {
      const fps = 1000 / (cfg.msPerFrame ?? 160);
      const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, size, size);
        const frame = Math.floor((performance.now() / (cfg.msPerFrame ?? 160)) % cfg.frames);
        ctx.drawImage(img, frame * cfg.frameW, 0, cfg.frameW, cfg.frameH, 0, 0, size, size);
        raf = requestAnimationFrame(draw);
      };
      void fps;
      draw();
    };
    return () => cancelAnimationFrame(raf);
  }, [unitKey, size]);
  return <canvas ref={canvasRef} width={size} height={size} className="rounded" style={{ imageRendering: 'pixelated' }} />;
}

// ── Building sprite preview canvas ──────────────────────────────────────────────
function BuildingSpritePreview({ bldKey, size = 56 }: { bldKey: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    // Try blue faction first, fall back to neutral
    const sprite = getBuildingSprite('blue', bldKey as never) ?? getBuildingSprite('neutral', bldKey as never);
    if (!sprite) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = sprite.sheet;
    let raf = 0;
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, sprite.sx, sprite.sy, sprite.sw, sprite.sh, 0, 0, size, size);
      raf = requestAnimationFrame(() => {});
    };
    return () => cancelAnimationFrame(raf);
  }, [bldKey, size]);
  return <canvas ref={canvasRef} width={size} height={size} className="rounded" style={{ imageRendering: 'pixelated' }} />;
}

export function AdminCompendium() {
  const [category, setCategory] = useState<Category>('All');
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedAll, setSelectedAll] = useState<Set<string>>(new Set());
  const [unitEdits, setUnitEdits] = useState<Record<string, Partial<UnitDisplayConfig>>>({});
  const [buildingEdits, setBuildingEdits] = useState<Record<string, Partial<BuildingDisplayConfig>>>({});
  const [savedMsg, setSavedMsg] = useState('');

  // Load current state on mount
  useEffect(() => {
    const ue: Record<string, Partial<UnitDisplayConfig>> = {};
    ALL_UNITS.forEach(u => { ue[u] = getUnitDisplay(u); });
    setUnitEdits(ue);
    const be: Record<string, Partial<BuildingDisplayConfig>> = {};
    ALL_BUILDINGS.forEach(b => { be[b] = getBuildingDisplay(b); });
    setBuildingEdits(be);
  }, []);

  // ── Filtered items ──────────────────────────────────────────────────────────
  const filteredUnits = category === 'All' ? ALL_UNITS :
    category === 'Buildings' ? [] :
    ALL_UNITS.filter(u => UNIT_CATEGORIES[u] === category);
  const showBuildings = category === 'All' || category === 'Buildings';

  // ── Keybinds: S=save, A=select all in category, Esc=clear ──────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        // Select all in current category for mass shadow editing
        const items = category === 'Buildings' ? ALL_BUILDINGS : filteredUnits;
        setSelectedAll(new Set(items));
      }
      if (e.key === 'Escape') {
        setSelected(null);
        setSelectedAll(new Set());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ── Save handler ────────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    saveUnitDisplayOverrides(unitEdits);
    saveBuildingDisplayOverrides(buildingEdits);
    setSavedMsg('Saved!');
    setTimeout(() => setSavedMsg(''), 2000);
  }, [unitEdits, buildingEdits]);

  const handleSaveDefaults = () => {
    saveDefaultsAsOverrides();
    setSavedMsg('Defaults saved!');
    setTimeout(() => setSavedMsg(''), 2000);
  };

  const handleReset = () => {
    resetOverrides();
    const ue: Record<string, Partial<UnitDisplayConfig>> = {};
    ALL_UNITS.forEach(u => { ue[u] = getUnitDisplay(u); });
    setUnitEdits(ue);
    const be: Record<string, Partial<BuildingDisplayConfig>> = {};
    ALL_BUILDINGS.forEach(b => { be[b] = getBuildingDisplay(b); });
    setBuildingEdits(be);
    setSavedMsg('Reset to defaults');
    setTimeout(() => setSavedMsg(''), 2000);
  };

  // ── Mass edit shadow for selected-all ────────────────────────────────────────
  const massEditShadow = (delta: number) => {
    if (selectedAll.size === 0) return;
    if (category === 'Buildings') {
      setBuildingEdits(prev => {
        const next = { ...prev };
        selectedAll.forEach(k => {
          const cur = next[k] ?? {};
          next[k] = { ...cur, shadow: Math.max(0, (cur.shadow ?? 3) + delta) };
        });
        return next;
      });
    } else {
      setUnitEdits(prev => {
        const next = { ...prev };
        selectedAll.forEach(k => {
          const cur = next[k] ?? {};
          next[k] = { ...cur, shadow: Math.max(0, (cur.shadow ?? 2) + delta) };
        });
        return next;
      });
    }
  };

  // ── Edit single unit field ──────────────────────────────────────────────────
  const editUnit = (key: string, field: keyof UnitDisplayConfig, value: number | string) => {
    setUnitEdits(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const editBuilding = (key: string, field: keyof BuildingDisplayConfig, value: number | string | null) => {
    setBuildingEdits(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const selectedUnit = selected && UNIT_CATEGORIES[selected] ? unitEdits[selected] : null;
  const selectedBuilding = selected && ALL_BUILDINGS.includes(selected as BuildingType) ? buildingEdits[selected] : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="flex items-center gap-2 p-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <h2 className="text-sm font-bold text-zinc-100">ADMIN COMPENDIUM</h2>
        <Badge variant="secondary" className="text-[10px]">{ALL_UNITS.length + ALL_BUILDINGS.length} items</Badge>
        <div className="text-[10px] text-zinc-500">
          ↑↓ shadow · ←→ scale · <span className="text-amber-400 font-bold">S</span> save · <span className="text-blue-400 font-bold">A</span> select all · Esc clear
        </div>
        <div className="flex-1" />
        {savedMsg && <Badge variant="default" className="text-xs bg-green-600">{savedMsg}</Badge>}
        {selectedAll.size > 0 && (
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-[10px]">{selectedAll.size} selected</Badge>
            <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => massEditShadow(-1)}>Shadow −</Button>
            <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => massEditShadow(1)}>Shadow +</Button>
          </div>
        )}
        <Button size="sm" variant="outline" onClick={handleSave}><Save className="h-3 w-3 mr-1" />Save (S)</Button>
        <Button size="sm" variant="outline" onClick={handleSaveDefaults}>Save Defaults</Button>
        <Button size="sm" variant="ghost" className="text-red-400" onClick={handleReset}><RotateCcw className="h-3 w-3 mr-1" />Reset</Button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 p-2 bg-zinc-900 border-b border-zinc-800 shrink-0 flex-wrap">
        {(['All','Base Units','Champion','Soldier','Legion','Monster','Animal','Buildings'] as Category[]).map(c => (
          <Button key={c} size="sm" variant={category === c ? 'default' : 'ghost'}
            onClick={() => { setCategory(c); setSelected(null); setSelectedAll(new Set()); }}
            className="text-[10px] h-7">
            {c} {c === 'Buildings' ? `(${ALL_BUILDINGS.length})` : c === 'All' ? `(${ALL_UNITS.length})` : `(${ALL_UNITS.filter(u => UNIT_CATEGORIES[u] === c).length})`}
          </Button>
        ))}
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Grid */}
        <div className="flex-1 overflow-auto p-3">
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 gap-2">
            {/* Unit cards */}
            {filteredUnits.map(key => {
              const cfg = UNIT_CONFIGS[key];
              const display = unitEdits[key] ?? getUnitDisplay(key);
              const isSelected = selected === key || selectedAll.has(key);
              const name = DISPLAY_NAMES[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
              return (
                <Card key={key}
                  className={`cursor-pointer transition-all ${isSelected ? 'border-amber-500 bg-zinc-800' : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'}`}
                  onClick={() => setSelected(key)}>
                  <CardContent className="p-2 text-center">
                    <div className="flex justify-center mb-1">
                      <UnitSpritePreview unitKey={key} size={40} />
                    </div>
                    <div className="text-xs font-bold text-zinc-200 truncate">{name}</div>
                    <div className="text-[9px] text-zinc-500">{UNIT_CATEGORIES[key]}</div>
                    {cfg && (
                      <div className="text-[8px] text-zinc-600 mt-1">
                        HP:{cfg.hp} DMG:{cfg.damage}
                      </div>
                    )}
                    <div className="flex gap-1 mt-1 justify-center flex-wrap">
                      <Badge variant="outline" className="text-[8px] h-3 px-1">sh:{display.shadow ?? 2}</Badge>
                      <Badge variant="outline" className="text-[8px] h-3 px-1">×{display.scale ?? 1}</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Building cards */}
            {showBuildings && ALL_BUILDINGS.map(key => {
              const cfg = BUILDING_CONFIGS[key];
              const display = buildingEdits[key] ?? getBuildingDisplay(key);
              const isSelected = selected === key || selectedAll.has(key);
              return (
                <Card key={key}
                  className={`cursor-pointer transition-all ${isSelected ? 'border-amber-500 bg-zinc-800' : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'}`}
                  onClick={() => setSelected(key)}>
                  <CardContent className="p-2 text-center">
                    <div className="flex justify-center mb-1">
                      <BuildingSpritePreview bldKey={key} size={40} />
                    </div>
                    <div className="text-xs font-bold text-zinc-200 truncate">{key.charAt(0).toUpperCase() + key.slice(1)}</div>
                    <div className="text-[9px] text-zinc-500">Building T{cfg.techTier}</div>
                    <div className="text-[8px] text-zinc-600 mt-1">
                      HP:{cfg.hp} Food:{cfg.foodProvided}
                    </div>
                    <div className="flex gap-1 mt-1 justify-center flex-wrap">
                      <Badge variant="outline" className="text-[8px] h-3 px-1">sh:{display.shadow ?? 3}</Badge>
                      {display.activeFx && <Badge variant="outline" className="text-[8px] h-3 px-1 text-amber-400">FX</Badge>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Properties panel */}
        <div className="w-80 bg-zinc-900 border-l border-zinc-700 overflow-auto shrink-0 p-3 space-y-3">
          {!selected && <p className="text-zinc-500 text-sm text-center mt-8">Select a unit or building</p>}

          {/* Unit properties */}
          {selected && selectedUnit && (() => {
            const cfg = UNIT_CONFIGS[selected];
            const display = selectedUnit as UnitDisplayConfig;
            const heroConfig = HERO_CONFIGS.find(h => h.type === selected);
            const name = DISPLAY_NAMES[selected] ?? selected.charAt(0).toUpperCase() + selected.slice(1);
            return (
              <div className="space-y-3">
                <div className="text-center">
                  <div className="flex justify-center mb-2">
                    <UnitSpritePreview unitKey={selected} size={72} />
                  </div>
                  {heroConfig && <Badge variant="secondary" className="text-[10px] ml-1">HERO</Badge>}
                </div>

                {/* Stats */}
                {cfg && (
                  <div className="grid grid-cols-3 gap-1 text-[10px]">
                    <div className="bg-zinc-800 p-1 rounded text-center"><span className="text-red-400">HP</span> {cfg.hp}</div>
                    <div className="bg-zinc-800 p-1 rounded text-center"><span className="text-orange-400">DMG</span> {cfg.damage}</div>
                    <div className="bg-zinc-800 p-1 rounded text-center"><span className="text-blue-400">ARM</span> {cfg.armor}</div>
                    <div className="bg-zinc-800 p-1 rounded text-center"><span className="text-green-400">SPD</span> {cfg.speed}</div>
                    <div className="bg-zinc-800 p-1 rounded text-center"><span className="text-purple-400">RNG</span> {cfg.range}</div>
                    <div className="bg-zinc-800 p-1 rounded text-center"><span className="text-yellow-400">ATK</span> {cfg.attackSpeed}/s</div>
                  </div>
                )}

                {/* Display controls */}
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400 font-bold">Display Controls</Label>
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] text-zinc-500 w-16">Shadow</Label>
                    <input type="range" min="0" max="10" value={display.shadow ?? 2} className="flex-1 h-1"
                      title="Shadow offset in pixels"
                      onChange={e => editUnit(selected, 'shadow', Number(e.target.value))} />
                    <span className="text-[10px] text-zinc-300 w-6 text-right">{display.shadow ?? 2}px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] text-zinc-500 w-16">Scale</Label>
                    <input type="range" min="0.3" max="2.0" step="0.1" value={display.scale ?? 1.0} className="flex-1 h-1"
                      title="Display scale multiplier"
                      onChange={e => editUnit(selected, 'scale', Number(e.target.value))} />
                    <span className="text-[10px] text-zinc-300 w-6 text-right">×{display.scale ?? 1}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] text-zinc-500 w-16">Facing</Label>
                    <select value={display.facingMode ?? 'target'} className="flex-1 h-6 text-[10px] bg-zinc-800 border border-zinc-700 rounded"
                      title="Facing mode"
                      onChange={e => editUnit(selected, 'facingMode', e.target.value)}>
                      <option value="target">Face Target</option>
                      <option value="movement">Face Movement</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] text-zinc-500 w-16">Projectile</Label>
                    <select value={display.projectile ?? 'none'} className="flex-1 h-6 text-[10px] bg-zinc-800 border border-zinc-700 rounded"
                      title="Projectile style"
                      onChange={e => editUnit(selected, 'projectile', e.target.value)}>
                      {PROJECTILE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                {/* Hit FX */}
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400 font-bold">Hit FX</Label>
                  <div className="flex items-center gap-2">
                    <FxPreview type={(display.hitFx ?? 'retro_white_a') as VfxType} />
                    <select value={display.hitFx ?? 'retro_white_a'} className="flex-1 h-6 text-[10px] bg-zinc-800 border border-zinc-700 rounded"
                      title="Hit visual effect"
                      onChange={e => editUnit(selected, 'hitFx', e.target.value)}>
                      {FX_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>

                {/* FX Library preview */}
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400 font-bold">FX Library</Label>
                  <div className="grid grid-cols-4 gap-1">
                    {['firespin','vortex','building_fire','building_smoke','fire_explosion_2','slash_red','slash_purple','energy_hit'].map(fx => (
                      <div key={fx} className="cursor-pointer text-center" onClick={() => editUnit(selected, 'hitFx', fx)}
                        title={fx}>
                        <FxPreview type={fx as VfxType} />
                        <div className="text-[7px] text-zinc-500 truncate">{fx}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Building properties */}
          {selected && selectedBuilding && (() => {
            const cfg = BUILDING_CONFIGS[selected as BuildingType];
            const display = selectedBuilding as BuildingDisplayConfig;
            return (
              <div className="space-y-3">
                <div className="text-center">
                  <div className="flex justify-center mb-2">
                    <BuildingSpritePreview bldKey={selected} size={72} />
                  </div>
                  <div className="text-lg font-bold text-zinc-100">{selected.charAt(0).toUpperCase() + selected.slice(1)}</div>
                  <Badge variant="outline" className="text-[10px]">Building T{cfg.techTier}</Badge>
                </div>

                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  <div className="bg-zinc-800 p-1 rounded text-center"><span className="text-red-400">HP</span> {cfg.hp}</div>
                  <div className="bg-zinc-800 p-1 rounded text-center"><span className="text-yellow-400">Gold</span> {cfg.cost.gold}</div>
                  <div className="bg-zinc-800 p-1 rounded text-center"><span className="text-green-400">Wood</span> {cfg.cost.wood}</div>
                </div>

                {cfg.trains.length > 0 && (
                  <div>
                    <Label className="text-[10px] text-zinc-500">Trains</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {cfg.trains.map(t => <Badge key={t} variant="outline" className="text-[8px]">{t}</Badge>)}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400 font-bold">Display Controls</Label>
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] text-zinc-500 w-16">Shadow</Label>
                    <input type="range" min="0" max="10" value={display.shadow ?? 3} className="flex-1 h-1"
                      title="Shadow offset in pixels"
                      onChange={e => editBuilding(selected, 'shadow', Number(e.target.value))} />
                    <span className="text-[10px] text-zinc-300 w-6 text-right">{display.shadow ?? 3}px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] text-zinc-500 w-16">Scale</Label>
                    <input type="range" min="0.5" max="2.0" step="0.1" value={display.scale ?? 1.0} className="flex-1 h-1"
                      title="Display scale multiplier"
                      onChange={e => editBuilding(selected, 'scale', Number(e.target.value))} />
                    <span className="text-[10px] text-zinc-300 w-6 text-right">×{display.scale ?? 1}</span>
                  </div>
                </div>

                {/* Damage FX preview */}
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400 font-bold">Damage FX</Label>
                  <div className="flex gap-3">
                    <div className="text-center">
                      <div className="text-[9px] text-zinc-500 mb-1">&lt;50% HP</div>
                      <FxPreview type={(display.damageFx50 ?? 'building_fire') as VfxType} />
                    </div>
                    <div className="text-center">
                      <div className="text-[9px] text-zinc-500 mb-1">&lt;25% HP</div>
                      <FxPreview type={(display.damageFx25 ?? 'building_smoke') as VfxType} />
                    </div>
                    {display.activeFx && (
                      <div className="text-center">
                        <div className="text-[9px] text-zinc-500 mb-1">Active</div>
                        <FxPreview type={display.activeFx as VfxType} />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] text-zinc-500 w-16">Active FX</Label>
                    <select value={display.activeFx ?? ''} className="flex-1 h-6 text-[10px] bg-zinc-800 border border-zinc-700 rounded"
                      title="Active visual effect"
                      onChange={e => editBuilding(selected, 'activeFx', e.target.value || null)}>
                      <option value="">None</option>
                      {['firespin','vortex','building_fire','building_smoke'].map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>

                {/* Spinning FX library */}
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-400 font-bold">Spinning & Whirling FX</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {['firespin','vortex','fire_explosion_2'].map(fx => (
                      <div key={fx} className="cursor-pointer text-center border border-zinc-700 rounded p-1 hover:border-amber-500"
                        onClick={() => editBuilding(selected, 'activeFx', fx)} title={fx}>
                        <FxPreview type={fx as VfxType} />
                        <div className="text-[8px] text-zinc-500">{fx}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
