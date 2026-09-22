import { useEffect, useState } from 'react';
import { GameState, EngineAction } from './engine/types';
import { createGame, dispatch, PlayerConfig } from './engine/gameEngine';
import { advanceAI, isAITurn } from './engine/ai';
import { saveGame, loadGame, clearSavedGame } from './engine/storage';
import { detectSoundEvent } from './audio/soundEvents';
import { playSound } from './audio/playSound';
import SetupScreen from './ui/SetupScreen';
import BoardScreen from './ui/BoardScreen';
import EndScreen from './ui/EndScreen';
import Starfield from './ui/Starfield';
import GameTitle from './ui/GameTitle';

type Screen = 'resume-prompt' | 'setup' | 'playing';

/** Pause between AI decisions, long enough to follow what changed on the board. */
const AI_MOVE_DELAY_MS = 1200;

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
      const timer = setTimeout(() => {
        const next = advanceAI(game);
        const sound = detectSoundEvent(game, next);
        if (sound) playSound(sound);
        setGame(next);
      }, AI_MOVE_DELAY_MS);
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
    // The board disables its controls during AI turns; this guards every other
    // path so a human can never dispatch on a bot's behalf.
    if (isAITurn(game)) return;
    const next = dispatch(game, action);
    const sound = detectSoundEvent(game, next);
    if (sound) playSound(sound);
    setGame(next);
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

  let screenContent;

  if (screen === 'resume-prompt') {
    screenContent = (
      <div className="launch-shell">
        <div className="launch-console panel resume-prompt">
          <GameTitle kicker="Mission in progress" />
          <p className="launch-lede">A saved mission was found. Pick up where you left off, or scrap it and start over.</p>
          <div className="launch-actions">
            <button className="start-button" onClick={handleResume}>
              Resume mission
            </button>
            <button className="danger" onClick={handleNewGame}>
              Start new mission
            </button>
          </div>
        </div>
      </div>
    );
  } else if (screen === 'setup' || !game) {
    screenContent = <SetupScreen onStart={handleStart} />;
  } else if (game.pendingAction.type === 'game-over') {
    screenContent = <EndScreen state={game} onNewGame={handleNewGame} />;
  } else {
    screenContent = <BoardScreen state={game} onAction={handleAction} />;
  }

  return (
    <>
      <Starfield />
      {screenContent}
    </>
  );
}
