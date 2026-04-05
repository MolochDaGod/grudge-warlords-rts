import { Route, Switch } from 'wouter';
import { Layout } from './components/Layout';
import { lazy, Suspense } from 'react';

// Lazy-load pages for better code splitting
const HomePage = lazy(() => import('./pages/home'));
const GrudgeWarlordsRTS = lazy(() => import('./pages/grudge-warlords-rts'));
const CodexPage = lazy(() => import('./pages/codex'));

function Loading() {
  return (
    <div className="flex items-center justify-center h-full bg-zinc-950 text-white">
      <div className="text-center">
        <div className="text-3xl mb-2">⚔️</div>
        <div className="text-sm text-zinc-400">Loading...</div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Switch>
        {/* Home */}
        <Route path="/">
          <Layout><HomePage /></Layout>
        </Route>

        {/* Play Game (fullscreen canvas — has its own header) */}
        <Route path="/play">
          <Layout><GrudgeWarlordsRTS /></Layout>
        </Route>

        {/* Designer (faction tech tree designer with sub-routes) */}
        <Route path="/designer">
          <Layout><GrudgeWarlordsRTS /></Layout>
        </Route>
        <Route path="/designer/:faction">
          <Layout><GrudgeWarlordsRTS /></Layout>
        </Route>

        {/* Map Editor */}
        <Route path="/map-editor">
          <Layout><GrudgeWarlordsRTS /></Layout>
        </Route>

        {/* Admin Compendium */}
        <Route path="/admin">
          <Layout><GrudgeWarlordsRTS /></Layout>
        </Route>

        {/* Codex */}
        <Route path="/codex">
          <Layout><CodexPage /></Layout>
        </Route>
        <Route path="/codex/:type/:id">
          <Layout><CodexPage /></Layout>
        </Route>

        {/* Legacy redirect */}
        <Route path="/game">
          <Layout><GrudgeWarlordsRTS /></Layout>
        </Route>

        {/* 404 */}
        <Route>
          <Layout>
            <div className="flex items-center justify-center h-full bg-zinc-950 text-white">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-2">404 — Not Found</h1>
                <a href="/" className="text-blue-400 hover:underline">Back to Home</a>
              </div>
            </div>
          </Layout>
        </Route>
      </Switch>
    </Suspense>
  );
}
