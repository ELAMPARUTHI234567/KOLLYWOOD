import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../socket/socket';
import { getAvatarEmoji } from '../components/avatars';
import './FinalResultPage.css';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function FinalResultPage() {
  const { gameCode } = useParams();
  const navigate = useNavigate();
  const userId = parseInt(sessionStorage.getItem('kw_user_id'));

  const stored = sessionStorage.getItem('kw_final_result');
  const data = stored ? JSON.parse(stored) : null;

  const winner = data?.winner;
  const leaderboard = [...(data?.leaderboard || [])].sort((a, b) => b.score - a.score);

  const handlePlayAgain = () => {
    socket.emit('play_again', { game_code: gameCode, user_id: userId });
    // Clear session and go home
    sessionStorage.removeItem('kw_round_result');
    sessionStorage.removeItem('kw_final_result');
    navigate('/');
  };

  const handleExit = () => {
    sessionStorage.clear();
    navigate('/');
  };

  // Confetti effect
  useEffect(() => {
    const container = document.querySelector('.final-confetti');
    if (!container) return;
    const colors = ['#fbbf24', '#8b5cf6', '#22c55e', '#ef4444', '#06b6d4', '#ec4899'];
    const particles = [];
    for (let i = 0; i < 40; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.left = `${Math.random() * 100}%`;
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.width = `${6 + Math.random() * 8}px`;
      el.style.height = `${6 + Math.random() * 8}px`;
      el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      el.style.animationDuration = `${3 + Math.random() * 4}s`;
      el.style.animationDelay = `${Math.random() * 2}s`;
      el.style.opacity = '0';
      container.appendChild(el);
      particles.push(el);
    }
    return () => particles.forEach(p => p.remove());
  }, []);

  return (
    <div className="final-page">
      <div className="final-page__bg" aria-hidden="true" />
      <div className="final-confetti" aria-hidden="true" />

      <header className="final-header">
        <span className="final-header__logo logo-text">KOLLOYWOOD</span>
      </header>

      <main className="final-main">
        {/* Game Over */}
        <div className="final-gameover animate-scaleIn">
          <div className="final-gameover__icon animate-float">🎬</div>
          <h1 className="final-gameover__text">GAME OVER</h1>
          <p className="final-gameover__sub">Kollywood Quiz Complete!</p>
        </div>

        {/* Winner spotlight */}
        {winner && (
          <div className="final-winner card card-gold animate-fadeIn">
            <div className="final-winner__crown animate-pulseScale">🏆</div>
            <div className="final-winner__label">WINNER</div>
            <div className="final-winner__avatar">{getAvatarEmoji(winner.avatar_id)}</div>
            <div className="final-winner__name">{winner.name}</div>
            <div className="final-winner__score animate-shimmer">{winner.score.toLocaleString()} POINTS</div>
          </div>
        )}

        {/* Full leaderboard */}
        <div className="card final-leaderboard animate-slideInUp">
          <h2 className="final-lb-title">🏅 Final Leaderboard</h2>
          <div className="final-lb-list">
            {leaderboard.map((p, i) => (
              <div
                key={p.user_id}
                className={`final-lb-row ${p.user_id === userId ? 'final-lb-row--me' : ''} animate-slideInLeft`}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <span className="final-lb-rank">
                  {i < 3 ? MEDALS[i] : `${i + 1}.`}
                </span>
                <span className="final-lb-avatar">{getAvatarEmoji(p.avatar_id)}</span>
                <span className="final-lb-name">{p.name}</span>
                <span className="final-lb-score">{p.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="final-actions animate-fadeIn">
          <button
            className="btn btn-gold btn-lg"
            id="btn-play-again"
            onClick={handlePlayAgain}
          >
            🎮 PLAY AGAIN
          </button>
          <button
            className="btn btn-outline btn-lg"
            id="btn-exit"
            onClick={handleExit}
          >
            🚪 EXIT GAME
          </button>
        </div>

        <p className="final-tagline">"Good Movies, Good Friends, Great Memories"</p>
      </main>
    </div>
  );
}
