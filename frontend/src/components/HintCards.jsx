import React from 'react';
import './HintCards.css';

const HINT_CONFIG = [
  { key: 'movie', icon: '🎬', label: 'Movie'   },
  { key: 'hero',  icon: '👨', label: 'Hero'    },
  { key: 'heroine', icon: '👩', label: 'Heroine' },
  { key: 'song',  icon: '🎵', label: 'Song'    },
];

export default function HintCards({ question }) {
  if (!question) return null;

  const hints = {
    movie:   question.movie_first_letter,
    hero:    question.hero_first_letter,
    heroine: question.heroine_first_letter,
    song:    question.song_first_letter,
  };

  return (
    <div className="hint-cards">
      {HINT_CONFIG.map((cfg) => (
        <div key={cfg.key} className="hint-card animate-scaleIn">
          <span className="hint-card__icon">{cfg.icon}</span>
          <span className="hint-card__label">{cfg.label}</span>
          <span className="hint-card__letter">{hints[cfg.key] || '?'}</span>
        </div>
      ))}
    </div>
  );
}
