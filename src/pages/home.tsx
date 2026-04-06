import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';

const SECTIONS = [
  { path: '/play', icon: '🎮', title: 'Play Game', desc: 'WC3-style RTS with 80+ units, heroes, naval combat, and 8-node island warfare.', color: 'from-green-600 to-green-800' },
  { path: '/designer', icon: '🎨', title: 'Faction Designer', desc: 'Design tech trees, training links, and unit stats for Kingdom, Legion, and Neutral factions.', color: 'from-amber-600 to-amber-800' },
  { path: '/map-editor', icon: '🗺️', title: 'Map Editor', desc: 'Paint terrain with Tiny Swords tiles, place resources, creep camps, and sea routes.', color: 'from-blue-600 to-blue-800' },
  { path: '/ship-builder', icon: '🚀', title: 'Space Ship Builder', desc: 'Grudge Space RTS — assemble modular spaceships from 95 blocks. Cockpits, fuselage, wings, thrusters, cannons.', color: 'from-cyan-600 to-cyan-800' },
  { path: '/codex', icon: '📖', title: 'Codex', desc: 'Browse all units, buildings, heroes, items, and ships with animated sprite previews.', color: 'from-purple-600 to-purple-800' },
  { path: '/admin', icon: '⚙️', title: 'Admin Compendium', desc: 'Configure display settings, shadows, VFX, projectile styles for all entities.', color: 'from-red-600 to-red-800' },
] as const;

const FEATURES = [
  { icon: '⚔️', title: '80+ Unit Types', desc: 'Warriors, mages, siege, champions, creeps, animals' },
  { icon: '👑', title: '8 Heroes', desc: 'Unique abilities, XP progression, item inventory' },
  { icon: '🚢', title: 'Naval Combat', desc: '5 ship types with captain-based crew and broadside cannons' },
  { icon: '🏝️', title: '8-Node Islands', desc: 'Weekly rotation, capture flags, pirate haven, bonus island' },
  { icon: '🌊', title: 'Tiny Swords Tiles', desc: '9-layer tilemap with auto-tiling, elevation, shadows' },
  { icon: '🎯', title: 'Designer Enforced', desc: 'Tech trees from designer boards enforced at runtime' },
] as const;

export default function HomePage() {
  return (
    <div className="h-full overflow-auto" style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
      {/* Hero */}
      <div className="text-center pt-12 pb-8 px-4">
        <div className="inline-block bg-zinc-800/80 border border-zinc-600/50 rounded-2xl px-10 py-6 shadow-2xl mb-6">
          <h1 className="text-5xl font-black">
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600">
              Grudge
            </span>
            {' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-red-400 via-red-500 to-red-700" style={{ fontStyle: 'italic' }}>
              Warlords
            </span>
          </h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
            <span className="text-xs text-amber-400/80 font-semibold tracking-widest uppercase">Real-Time Strategy</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
          </div>
          <p className="text-zinc-400 text-sm mt-3 max-w-lg mx-auto">
            WC3-style island RTS with naval warfare, 8-node weekly island system,
            Tiny Swords pixel art, and faction designer boards.
          </p>
        </div>
      </div>

      {/* Section cards */}
      <div className="max-w-5xl mx-auto px-6 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SECTIONS.map(s => (
            <Link key={s.path} href={s.path}>
              <Card className="cursor-pointer border-zinc-700/50 bg-zinc-900/80 hover:border-zinc-500 hover:scale-[1.02] transition-all h-full">
                <CardContent className="pt-5 pb-4">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} text-2xl mb-3`}>
                    {s.icon}
                  </div>
                  <h3 className="text-lg font-bold text-zinc-100">{s.title}</h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{s.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Feature grid */}
      <div className="max-w-5xl mx-auto px-6 pb-12">
        <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Engine Features</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">{f.icon}</div>
              <div className="text-xs font-bold text-zinc-200">{f.title}</div>
              <div className="text-[10px] text-zinc-500 mt-0.5 leading-snug">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-6 text-[10px] text-zinc-600">
        Created by Racalvin The Pirate King · Grudge Studio · grudgewarlords.com
      </div>
    </div>
  );
}
