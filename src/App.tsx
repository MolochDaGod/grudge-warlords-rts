import { Route, Switch, Redirect } from 'wouter';
import { Layout } from './components/Layout';
import { lazy, Suspense } from 'react';

// Each page is its own dedicated component — no shared monolithic page
const HomePage = lazy(() => import('./pages/home'));
const PlayPage = lazy(() => import('./pages/play'));
const DesignerPage = lazy(() => import('./pages/designer'));
const MapEditorPage = lazy(() => import('./pages/map-editor'));
const AdminPage = lazy(() => import('./pages/admin'));
const CodexPage = lazy(() => import('./pages/codex'));

function Loading() {
  return (
    <div className="flex items-center justify-center h-screen bg-zinc-950 text-white">
      <div className="text-3xl mb-2">⚔️</div>
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
  );
}
