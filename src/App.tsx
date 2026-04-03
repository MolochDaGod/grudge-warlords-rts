import { Route, Switch } from 'wouter';
import GrudgeWarlordsRTS from './pages/grudge-warlords-rts';

export default function App() {
  return (
    <Switch>
      <Route path="/" component={GrudgeWarlordsRTS} />
      <Route path="/game" component={GrudgeWarlordsRTS} />
      <Route>
        <div className="flex items-center justify-center h-screen bg-zinc-950 text-white">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">404 — Not Found</h1>
            <a href="/" className="text-blue-400 hover:underline">Back to Game</a>
          </div>
        </div>
      </Route>
    </Switch>
  );
}
