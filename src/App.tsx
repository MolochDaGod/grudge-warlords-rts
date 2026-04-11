import { Route, Switch, Redirect } from 'wouter';
import { Layout } from './components/Layout';
import { lazy, Suspense, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

// Each page is its own dedicated component — no shared monolithic page
const HomePage = lazy(() => import('./pages/home'));
const PlayPage = lazy(() => import('./pages/play'));
const DesignerPage = lazy(() => import('./pages/designer'));
const MapEditorPage = lazy(() => import('./pages/map-editor'));
const AdminPage = lazy(() => import('./pages/admin'));
const CodexPage = lazy(() => import('./pages/codex'));
const ShipBuilderPage = lazy(() => import('./pages/ship-builder'));

function Loading() {
  return (
    <div className="flex items-center justify-center h-screen bg-zinc-950 text-white">
      <div className="text-3xl mb-2">⚔️</div>
    </div>
  );
}

// ── Error Boundary — catches runtime crashes so users see a message, not a blank page ──
interface EBState { hasError: boolean; error: Error | null }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('[Grudge Warlords] Uncaught error:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-zinc-950 text-white p-8">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-400 mb-2">Something went wrong</h1>
          <p className="text-zinc-400 text-sm mb-4 max-w-md text-center">
            {this.state.error?.message ?? 'Unknown error'}
          </p>
          <pre className="text-xs text-zinc-500 bg-zinc-900 rounded p-3 max-w-lg overflow-auto max-h-48 mb-4">
            {this.state.error?.stack?.slice(0, 600)}
          </pre>
          <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
            className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-lg font-bold">
            Return Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
    <Suspense fallback={<Loading />}>
      <Switch>
        {/* Home */}
        <Route path="/">
          <Layout><HomePage /></Layout>
        </Route>

        {/* Play — FULLSCREEN, no Layout nav bar */}
        <Route path="/play">
          <PlayPage />
        </Route>

        {/* Designer */}
        <Route path="/designer">
          <Layout><DesignerPage /></Layout>
        </Route>
        <Route path="/designer/:faction">
          <Layout><DesignerPage /></Layout>
        </Route>

        {/* Map Editor */}
        <Route path="/map-editor">
          <Layout><MapEditorPage /></Layout>
        </Route>

        {/* Admin */}
        <Route path="/admin">
          <Layout><AdminPage /></Layout>
        </Route>

        {/* Ship Builder */}
        <Route path="/ship-builder">
          <Layout><ShipBuilderPage /></Layout>
        </Route>

        {/* Codex */}
        <Route path="/codex">
          <Layout><CodexPage /></Layout>
        </Route>

        {/* Legacy redirects */}
        <Route path="/game"><Redirect to="/play" /></Route>

        {/* 404 */}
        <Route>
          <Layout>
            <div className="flex items-center justify-center h-full bg-zinc-950 text-white">
              <h1 className="text-2xl font-bold mb-2">404 — Not Found</h1>
              <a href="/" className="text-blue-400 hover:underline ml-4">Home</a>
            </div>
          </Layout>
        </Route>
      </Switch>
    </Suspense>
    </ErrorBoundary>
  );
}
