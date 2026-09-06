import React from 'react';
import './ClueBox.css';

const UNLOCK_TIMES = {
  1: '30s',
  2: '60s',
  3: '90s',
};

export default function ClueBox({ clueNum, text, isRevealed }) {
  const unlockTime = UNLOCK_TIMES[clueNum] || `${clueNum * 30}s`;

  return (
    <div className={`clue-box ${isRevealed ? 'clue-box--revealed animate-clueReveal' : 'clue-box--locked'}`}>
      <div className="clue-box__header">
        <span className="clue-box__icon">{isRevealed ? '💡' : '🔒'}</span>
        <span className="clue-box__label">CLUE {clueNum}</span>
        {!isRevealed && (
          <span className="clue-box__unlock-tag">@{unlockTime}</span>
        )}
      </div>
      {isRevealed ? (
        <p className="clue-box__text">{text}</p>
      ) : (
        <p className="clue-box__locked-text">🔒 Unlocks at {unlockTime}</p>
      )}
    </div>
  );
}
