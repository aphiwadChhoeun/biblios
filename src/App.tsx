import { useEffect, useState } from 'react';
import { GameState, EngineAction } from './engine/types';
import { createGame, dispatch, PlayerConfig } from './engine/gameEngine';
import { advanceAI, isAITurn } from './engine/ai';
import { saveGame, loadGame, clearSavedGame } from './engine/storage';
import SetupScreen from './ui/SetupScreen';
import BoardScreen from './ui/BoardScreen';

type Screen = 'resume-prompt' | 'setup' | 'playing';

export default function App() {
  const [game, setGame] = useState<GameState | null>(null);
  const [screen, setScreen] = useState<Screen>('setup');

  useEffect(() => {
    const saved = loadGame();
    if (saved) setScreen('resume-prompt');
  }, []);

  useEffect(() => {
    if (!game) return;
    saveGame(game);
    if (isAITurn(game)) {
      const timer = setTimeout(() => setGame(advanceAI(game)), 400);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [game]);

  function handleStart(configs: PlayerConfig[]) {
    clearSavedGame();
    setGame(createGame(configs));
    setScreen('playing');
  }

  function handleAction(action: EngineAction) {
    if (!game) return;
    setGame(dispatch(game, action));
  }

  function handleResume() {
    const saved = loadGame();
    if (saved) {
      setGame(saved);
      setScreen('playing');
    }
  }

  function handleNewGame() {
    clearSavedGame();
    setGame(null);
    setScreen('setup');
  }

  if (screen === 'resume-prompt') {
    return (
      <div className="resume-prompt">
        <h1>Space Biblios</h1>
        <p>A mission in progress was found.</p>
        <button onClick={handleResume}>Resume mission</button>
        <button onClick={handleNewGame}>Start new mission</button>
      </div>
    );
  }

  if (screen === 'setup' || !game) {
    return <SetupScreen onStart={handleStart} />;
  }

  return <BoardScreen state={game} onAction={handleAction} />;
}
