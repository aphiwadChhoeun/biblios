import { useState } from 'react';
import { PlayerConfig } from '../engine/gameEngine';

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
    <div className="setup-screen">
      <h1>Star Manifest</h1>
      <p>Assemble your crew of 2-4 captains.</p>
      {seats.map((seat, index) => (
        <div className="seat-row" key={index}>
          <input value={seat.name} onChange={(e) => updateSeat(index, { name: e.target.value })} disabled={seat.isAI} />
          <label>
            <input type="checkbox" checked={seat.isAI} onChange={(e) => updateSeat(index, { isAI: e.target.checked })} />
            AI
          </label>
        </div>
      ))}
      <div className="seat-controls">
        <button onClick={addSeat} disabled={seats.length >= 4}>
          Add seat
        </button>
        <button onClick={removeSeat} disabled={seats.length <= 2}>
          Remove seat
        </button>
      </div>
      <button className="start-button" onClick={() => onStart(seats)}>
        Launch Mission
      </button>
    </div>
  );
}
