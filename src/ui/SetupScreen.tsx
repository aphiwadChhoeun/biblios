import { useState } from 'react';
import { PlayerConfig } from '../engine/gameEngine';
import GameTitle from './GameTitle';

interface SeatConfig {
  name: string;
  isAI: boolean;
}

const DEFAULT_SEATS: SeatConfig[] = [
  { name: 'Captain 1', isAI: false },
  { name: 'Captain 2', isAI: true },
];

export default function SetupScreen({ onStart }: { onStart: (configs: PlayerConfig[]) => void }) {
  const [seats, setSeats] = useState<SeatConfig[]>(DEFAULT_SEATS);

  function updateSeat(index: number, patch: Partial<SeatConfig>) {
    setSeats((prev) => prev.map((seat, i) => (i === index ? { ...seat, ...patch } : seat)));
  }

  function addSeat() {
    if (seats.length >= 4) return;
    setSeats((prev) => [...prev, { name: `Captain ${prev.length + 1}`, isAI: true }]);
  }

  function removeSeat() {
    if (seats.length <= 2) return;
    setSeats((prev) => prev.slice(0, -1));
  }

  return (
    <div className="launch-shell">
      <div className="launch-console panel setup-screen">
        <GameTitle />
        <p className="launch-lede">
          Two to four captains compete to stock the best manifest. Trade cargo in the supply phase, then bid for what
          you still need.
        </p>

        <div className="seat-list">
          {seats.map((seat, index) => (
            <div className="seat-row" key={index}>
              <span className="seat-index">{String(index + 1).padStart(2, '0')}</span>
              <input
                type="text"
                aria-label={`Captain ${index + 1} name`}
                value={seat.name}
                onChange={(e) => updateSeat(index, { name: e.target.value })}
                disabled={seat.isAI}
              />
              <label className="seat-toggle">
                <input
                  type="checkbox"
                  checked={seat.isAI}
                  onChange={(e) => updateSeat(index, { isAI: e.target.checked })}
                />
                Computer
              </label>
            </div>
          ))}
        </div>

        <div className="seat-controls">
          <button onClick={addSeat} disabled={seats.length >= 4}>
            Add captain
          </button>
          <button onClick={removeSeat} disabled={seats.length <= 2}>
            Remove captain
          </button>
        </div>

        <div className="launch-actions">
          <button className="start-button" onClick={() => onStart(seats)}>
            Launch Mission
          </button>
        </div>
      </div>
    </div>
  );
}
