import React, { useState, useEffect, useRef } from 'react';
import './CountdownTimer.css';

export default function CountdownTimer({ totalSeconds, elapsedSeconds = 0, onExpire }) {
  const [remaining, setRemaining] = useState(totalSeconds - elapsedSeconds);
  const intervalRef = useRef(null);
  const startedRef = useRef(Date.now() - elapsedSeconds * 1000);

  useEffect(() => {
    // Sync with server-provided elapsed
    startedRef.current = Date.now() - elapsedSeconds * 1000;
    setRemaining(Math.max(0, totalSeconds - elapsedSeconds));
  }, [elapsedSeconds, totalSeconds]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startedRef.current) / 1000;
      const rem = Math.max(0, totalSeconds - elapsed);
      setRemaining(rem);
      if (rem <= 0) {
        clearInterval(intervalRef.current);
        onExpire && onExpire();
      }
    }, 100);
    return () => clearInterval(intervalRef.current);
  }, [totalSeconds, onExpire]);

  const pct = (remaining / totalSeconds) * 100;
  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);
  const display = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  let colorClass = 'timer--normal';
  if (remaining <= 20) colorClass = 'timer--danger';
  else if (remaining <= 45) colorClass = 'timer--warning';

  return (
    <div className={`countdown-timer ${colorClass}`}>
      <svg className="timer-ring" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="52" className="timer-ring__bg" />
        <circle
          cx="60" cy="60" r="52"
          className="timer-ring__progress"
          strokeDasharray={`${2 * Math.PI * 52}`}
          strokeDashoffset={`${2 * Math.PI * 52 * (1 - pct / 100)}`}
        />
      </svg>
      <div className="timer-display">
        <span className="timer-icon">⏱</span>
        <span className="timer-text">{display}</span>
      </div>
    </div>
  );
}
