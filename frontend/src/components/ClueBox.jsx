import React from 'react';
import './ClueBox.css';

export default function ClueBox({ clueNum, text, isRevealed }) {
  return (
    <div className={`clue-box ${isRevealed ? 'clue-box--revealed animate-clueReveal' : 'clue-box--locked'}`}>
      <div className="clue-box__header">
        <span className="clue-box__icon">{isRevealed ? '💡' : '🔒'}</span>
        <span className="clue-box__label">CLUE {clueNum}</span>
      </div>
      {isRevealed ? (
        <p className="clue-box__text">{text}</p>
      ) : (
        <p className="clue-box__locked-text">Hidden</p>
      )}
    </div>
  );
}
