import { Link, useRoute } from 'wouter';
import { Badge } from '@/components/ui/badge';

const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: '🏠' },
  { path: '/play', label: 'Play', icon: '🎮' },
  { path: '/designer', label: 'Designer', icon: '🎨' },
  { path: '/map-editor', label: 'Maps', icon: '🗺️' },
  { path: '/codex', label: 'Codex', icon: '📖' },
  { path: '/admin', label: 'Admin', icon: '⚙️' },
] as const;

function NavLink({ path, label, icon }: { path: string; label: string; icon: string }) {
  // Match exact for /, prefix for others
  const [isActive] = useRoute(path === '/' ? path : `${path}/:rest*`);
  const [isExact] = useRoute(path);
  const active = path === '/' ? isExact : (isActive || isExact);

  return (
    <Link href={path}>
      <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
        active
          ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
      }`}>
        <span className="text-sm">{icon}</span>
        <span>{label}</span>
      </button>
    </Link>
  );
}

interface LayoutProps {
  children: React.ReactNode;
  /** If true, hide the nav bar (for fullscreen game view) */
  hideNav?: boolean;
}

export function Layout({ children, hideNav }: LayoutProps) {
  if (hideNav) return <>{children}</>;

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-white">
      {/* Nav bar */}
      <nav className="flex items-center gap-1 px-4 py-1.5 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <Link href="/">
          <span className="text-base font-black mr-3 cursor-pointer">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-red-500">
              Grudge Warlords
            </span>
          </span>
        </Link>
        <div className="flex gap-0.5">
          {NAV_ITEMS.map(item => (
            <NavLink key={item.path} {...item} />
          ))}
        </div>
        <div className="flex-1" />
        <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-700">RTS Engine v1.0</Badge>
      </nav>

      {/* Page content */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
