import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UNIT_CONFIGS, BUILDING_CONFIGS, HERO_CONFIGS, ABILITY_DEFS, ITEM_DEFS, UPGRADE_DEFS } from '@/lib/rts-engine/constants';
import { SHIP_CONFIGS, type ShipType } from '@/lib/rts-engine/ships';
import type { BuildingType, ItemRarity } from '@/lib/rts-engine/types';

type CodexTab = 'units' | 'buildings' | 'heroes' | 'items' | 'ships' | 'upgrades';

const RARITY_COLORS: Record<ItemRarity, string> = {
  common: '#9ca3af', uncommon: '#22c55e', rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b',
};

const ROLE_ICONS: Record<string, string> = {
  worker: '⛏️', melee: '⚔️', ranged: '🏹', caster: '✨', siege: '💣', hero: '👑',
};

export default function CodexPage() {
  const [tab, setTab] = useState<CodexTab>('units');
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const lowerSearch = search.toLowerCase();

  const allUnits = Object.entries(UNIT_CONFIGS).filter(([k]) => k.toLowerCase().includes(lowerSearch));
  const allBuildings = (Object.entries(BUILDING_CONFIGS) as [BuildingType, typeof BUILDING_CONFIGS[BuildingType]][]).filter(([k]) => k.toLowerCase().includes(lowerSearch));
  const allHeroes = HERO_CONFIGS.filter(h => h.name.toLowerCase().includes(lowerSearch) || h.type.toLowerCase().includes(lowerSearch));
  const allItems = Object.entries(ITEM_DEFS).filter(([k, v]) => k.toLowerCase().includes(lowerSearch) || v.name.toLowerCase().includes(lowerSearch));
  const allShips = (Object.entries(SHIP_CONFIGS) as [ShipType, typeof SHIP_CONFIGS[ShipType]][]).filter(([k]) => k.toLowerCase().includes(lowerSearch));
  const allUpgrades = Object.entries(UPGRADE_DEFS).filter(([k, v]) => k.toLowerCase().includes(lowerSearch) || v.name.toLowerCase().includes(lowerSearch));

  const tabs: { key: CodexTab; label: string; count: number }[] = [
    { key: 'units', label: 'Units', count: allUnits.length },
    { key: 'buildings', label: 'Buildings', count: allBuildings.length },
    { key: 'heroes', label: 'Heroes', count: allHeroes.length },
    { key: 'items', label: 'Items', count: allItems.length },
    { key: 'ships', label: 'Ships', count: allShips.length },
    { key: 'upgrades', label: 'Upgrades', count: allUpgrades.length },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <h2 className="text-sm font-bold text-zinc-100">📖 CODEX</h2>
        <Input
          className="h-7 w-64 text-xs bg-zinc-800 border-zinc-700"
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex gap-1">
          {tabs.map(t => (
            <Button key={t.key} size="sm" variant={tab === t.key ? 'default' : 'ghost'}
              onClick={() => { setTab(t.key); setSelectedKey(null); }}
              className="text-[10px] h-7">
              {t.label} ({t.count})
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Grid */}
        <div className="flex-1 overflow-auto p-3">
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 gap-2">

            {tab === 'units' && allUnits.map(([key, cfg]) => (
              <Card key={key} className={`cursor-pointer ${selectedKey === key ? 'border-amber-500 bg-zinc-800' : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'}`}
                onClick={() => setSelectedKey(key)}>
                <CardContent className="p-2 text-center">
                  <div className="text-lg">{ROLE_ICONS[cfg.role] ?? '•'}</div>
                  <div className="text-xs font-bold text-zinc-200 truncate">{key}</div>
                  <div className="text-[8px] text-zinc-500">{cfg.role} · T{cfg.requiredTier}</div>
                  <div className="text-[8px] text-zinc-600">HP:{cfg.hp} DMG:{cfg.damage}</div>
                </CardContent>
              </Card>
            ))}

            {tab === 'buildings' && allBuildings.map(([key, cfg]) => (
              <Card key={key} className={`cursor-pointer ${selectedKey === key ? 'border-amber-500 bg-zinc-800' : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'}`}
                onClick={() => setSelectedKey(key)}>
                <CardContent className="p-2 text-center">
                  <div className="text-lg">🏗️</div>
                  <div className="text-xs font-bold text-zinc-200 truncate">{key}</div>
                  <div className="text-[8px] text-zinc-500">T{cfg.techTier} · HP:{cfg.hp}</div>
                  <div className="text-[8px] text-zinc-600">Trains: {cfg.trains.length}</div>
                </CardContent>
              </Card>
            ))}

            {tab === 'heroes' && allHeroes.map(h => (
              <Card key={h.type} className={`cursor-pointer ${selectedKey === h.type ? 'border-amber-500 bg-zinc-800' : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'}`}
                onClick={() => setSelectedKey(h.type)}>
                <CardContent className="p-2 text-center">
                  <div className="text-lg">👑</div>
                  <div className="text-xs font-bold text-zinc-200 truncate">{h.name}</div>
                  <div className="text-[8px] text-purple-400">{h.title}</div>
                  <div className="text-[8px] text-zinc-600">HP:{h.hp} DMG:{h.damage}</div>
                </CardContent>
              </Card>
            ))}

            {tab === 'items' && allItems.map(([key, item]) => (
              <Card key={key} className={`cursor-pointer ${selectedKey === key ? 'border-amber-500 bg-zinc-800' : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'}`}
                onClick={() => setSelectedKey(key)}>
                <CardContent className="p-2 text-center">
                  <div className="text-lg">{item.icon}</div>
                  <div className="text-xs font-bold truncate" style={{ color: RARITY_COLORS[item.rarity] }}>{item.name}</div>
                  <div className="text-[8px] text-zinc-500">{item.rarity} · {item.slot}</div>
                </CardContent>
              </Card>
            ))}

            {tab === 'ships' && allShips.map(([key, cfg]) => (
              <Card key={key} className={`cursor-pointer ${selectedKey === key ? 'border-amber-500 bg-zinc-800' : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'}`}
                onClick={() => setSelectedKey(key)}>
                <CardContent className="p-2 text-center">
                  <div className="text-lg">🚢</div>
                  <div className="text-xs font-bold text-zinc-200 truncate">{key}</div>
                  <div className="text-[8px] text-zinc-500">Crew:{cfg.crewCapacity} · T{cfg.requiredTier}</div>
                  <div className="text-[8px] text-zinc-600">HP:{cfg.hp} Cannons:{cfg.cannonCount}</div>
                </CardContent>
              </Card>
            ))}

            {tab === 'upgrades' && allUpgrades.map(([key, upg]) => (
              <Card key={key} className={`cursor-pointer ${selectedKey === key ? 'border-amber-500 bg-zinc-800' : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'}`}
                onClick={() => setSelectedKey(key)}>
                <CardContent className="p-2 text-center">
                  <div className="text-lg">{upg.icon}</div>
                  <div className="text-xs font-bold text-zinc-200 truncate">{upg.name}</div>
                  <div className="text-[8px] text-zinc-500">T{upg.requiredTier} · {upg.building}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="w-80 bg-zinc-900 border-l border-zinc-700 overflow-auto shrink-0 p-3 space-y-3">
          {!selectedKey && <p className="text-zinc-500 text-sm text-center mt-8">Select an item to view details</p>}

          {selectedKey && tab === 'units' && UNIT_CONFIGS[selectedKey] && (() => {
            const cfg = UNIT_CONFIGS[selectedKey];
            return (
              <div className="space-y-3">
                <div className="text-lg font-bold text-zinc-100">{selectedKey}</div>
                <Badge variant="outline">{cfg.role} · T{cfg.requiredTier}</Badge>
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  <div className="bg-zinc-800 p-1.5 rounded text-center"><span className="text-red-400">HP</span> {cfg.hp}</div>
                  <div className="bg-zinc-800 p-1.5 rounded text-center"><span className="text-orange-400">DMG</span> {cfg.damage}</div>
                  <div className="bg-zinc-800 p-1.5 rounded text-center"><span className="text-blue-400">ARM</span> {cfg.armor}</div>
                  <div className="bg-zinc-800 p-1.5 rounded text-center"><span className="text-green-400">SPD</span> {cfg.speed}</div>
                  <div className="bg-zinc-800 p-1.5 rounded text-center"><span className="text-purple-400">RNG</span> {cfg.range}</div>
                  <div className="bg-zinc-800 p-1.5 rounded text-center"><span className="text-yellow-400">ATK</span> {cfg.attackSpeed}/s</div>
                </div>
                <div className="text-[10px] text-zinc-400">
                  <div>Food: {cfg.foodCost} · Train: {cfg.trainTime}s</div>
                  <div>Cost: 🪙{cfg.trainCost.gold} 🪵{cfg.trainCost.wood}</div>
                  <div>Trained at: {cfg.trainedAt}</div>
                </div>
              </div>
            );
          })()}

          {selectedKey && tab === 'heroes' && (() => {
            const h = HERO_CONFIGS.find(x => x.type === selectedKey);
            if (!h) return null;
            return (
              <div className="space-y-3">
                <div className="text-lg font-bold text-zinc-100">{h.name}</div>
                <Badge variant="secondary" className="text-purple-400">{h.title}</Badge>
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  <div className="bg-zinc-800 p-1.5 rounded text-center"><span className="text-red-400">HP</span> {h.hp}</div>
                  <div className="bg-zinc-800 p-1.5 rounded text-center"><span className="text-blue-400">MANA</span> {h.mana}</div>
                  <div className="bg-zinc-800 p-1.5 rounded text-center"><span className="text-orange-400">DMG</span> {h.damage}</div>
                  <div className="bg-zinc-800 p-1.5 rounded text-center"><span className="text-blue-400">ARM</span> {h.armor}</div>
                  <div className="bg-zinc-800 p-1.5 rounded text-center"><span className="text-green-400">SPD</span> {h.speed}</div>
                  <div className="bg-zinc-800 p-1.5 rounded text-center"><span className="text-purple-400">RNG</span> {h.range}</div>
                </div>
                <div className="text-[10px] text-zinc-400">
                  <div>Per Level: +{h.hpPerLevel}HP +{h.manaPerLevel}MP +{h.damagePerLevel}DMG +{h.armorPerLevel}ARM</div>
                  <div>Revive: {h.reviveTime}s · Cost: 🪙{h.reviveCost}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-zinc-300">Abilities</div>
                  {h.abilities.map(aId => {
                    const ab = ABILITY_DEFS[aId];
                    if (!ab) return null;
                    return (
                      <div key={aId} className="bg-zinc-800 rounded p-2">
                        <div className="text-xs font-bold text-zinc-200">{ab.icon} {ab.name} {ab.isUltimate && <Badge variant="secondary" className="text-[8px] ml-1">ULT</Badge>}</div>
                        <div className="text-[9px] text-zinc-400 mt-0.5">{ab.description}</div>
                        <div className="text-[8px] text-zinc-500 mt-0.5">CD:{ab.cooldown}s · Mana:{ab.manaCost} · Max Rank:{ab.maxRank}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {selectedKey && tab === 'ships' && SHIP_CONFIGS[selectedKey as ShipType] && (() => {
            const cfg = SHIP_CONFIGS[selectedKey as ShipType];
            return (
              <div className="space-y-3">
                <div className="text-lg font-bold text-zinc-100">{selectedKey}</div>
                <Badge variant="outline">T{cfg.requiredTier} · Crew: {cfg.crewCapacity}</Badge>
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  <div className="bg-zinc-800 p-1.5 rounded text-center"><span className="text-red-400">HP</span> {cfg.hp}</div>
                  <div className="bg-zinc-800 p-1.5 rounded text-center"><span className="text-green-400">SPD</span> {cfg.speed}</div>
                  <div className="bg-zinc-800 p-1.5 rounded text-center"><span className="text-orange-400">DMG</span> {cfg.cannonDamage}×{cfg.cannonCount}</div>
                </div>
                <div className="text-[10px] text-zinc-400">
                  <div>Cannon Range: {cfg.cannonRange}px · Cooldown: {cfg.cannonCooldown}s</div>
                  <div>Turn Speed: {cfg.turnSpeed} rad/s</div>
                  <div>Cost: 🪙{cfg.cost.gold} 🪵{cfg.cost.wood} · Build: {cfg.buildTime}s</div>
                  <div>Crew Capacity: {cfg.crewCapacity} units + 1 captain</div>
                </div>
                <div className="bg-zinc-800 rounded p-2 text-[9px] text-amber-400">
                  ⚠️ Captain (hero) required. If ship sinks, crew dies but captain washes ashore at home island.
                </div>
              </div>
            );
          })()}

          {selectedKey && tab === 'items' && ITEM_DEFS[selectedKey] && (() => {
            const item = ITEM_DEFS[selectedKey];
            return (
              <div className="space-y-3">
                <div className="text-lg font-bold" style={{ color: RARITY_COLORS[item.rarity] }}>{item.icon} {item.name}</div>
                <div className="flex gap-2">
                  <Badge variant="outline" style={{ borderColor: RARITY_COLORS[item.rarity], color: RARITY_COLORS[item.rarity] }}>{item.rarity}</Badge>
                  <Badge variant="outline">{item.slot}</Badge>
                </div>
                <p className="text-xs text-zinc-300">{item.description}</p>
                <div className="text-[10px] text-zinc-400 space-y-0.5">
                  {item.bonusHp && <div>+{item.bonusHp} HP</div>}
                  {item.bonusDamage && <div>+{item.bonusDamage} Damage</div>}
                  {item.bonusArmor && <div>+{item.bonusArmor} Armor</div>}
                  {item.bonusSpeed && <div>+{item.bonusSpeed} Speed</div>}
                  {item.bonusMana && <div>+{item.bonusMana} Mana</div>}
                  {item.healAmount && <div>Heals {item.healAmount} HP</div>}
                  {item.manaRestore && <div>Restores {item.manaRestore} Mana</div>}
                  <div>Sell: 🪙{item.goldValue}</div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
