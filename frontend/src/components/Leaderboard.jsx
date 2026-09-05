import React from 'react';
import { getAvatarEmoji } from './avatars';
import './Leaderboard.css';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ players, currentUserId }) {
  const sorted = [...(players || [])].sort((a, b) => b.score - a.score);

  return (
    <div className="leaderboard">
      <div className="leaderboard__header">
        <span>🏆</span>
        <span>LIVE LEADERBOARD</span>
      </div>
      <div className="leaderboard__list">
        {sorted.map((p, i) => (
          <div
            key={p.user_id}
            className={`leaderboard__row ${p.user_id === currentUserId ? 'leaderboard__row--me' : ''} animate-slideInRight`}
            style={{ animationDelay: `${i * 0.04}s` }}
          >
            <span className="leaderboard__rank">
              {i < 3 ? MEDALS[i] : `${i + 1}.`}
            </span>
            <span className="leaderboard__avatar">{getAvatarEmoji(p.avatar_id)}</span>
            <span className="leaderboard__name">{p.name}</span>
            <span className="leaderboard__score">{p.score.toLocaleString()}</span>
          </div>
        ))}
        {sorted.length === 0 && (
          <p className="leaderboard__empty">No scores yet</p>
        )}
      </div>
    </div>
  );
}
