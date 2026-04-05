import { GameCanvas } from '@/components/game-designer/GameCanvas';

/**
 * Play Page — renders the game canvas fullscreen with no wrapper.
 * The GameCanvas handles its own menu → loading → playing phases internally.
 * GameHUD is rendered as a React overlay inside GameCanvas.
 */
export default function PlayPage() {
  return (
    <div className="h-screen bg-black">
      <GameCanvas />
    </div>
  );
}
