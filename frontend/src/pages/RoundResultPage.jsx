import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../socket/socket';
import { getAvatarEmoji } from '../components/avatars';
import './RoundResultPage.css';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function RoundResultPage() {
  const { gameCode } = useParams();
  const navigate = useNavigate();
  const userId = parseInt(sessionStorage.getItem('kw_user_id'));

  const [data, setData] = useState(() => {
    const stored = sessionStorage.getItem('kw_round_result');
    return stored ? JSON.parse(stored) : null;
  });
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    if (!userId) { navigate('/'); return; }
    if (!socket.connected) socket.connect();

    if (data?.question_gap) {
      let c = data.question_gap;
      setCountdown(c);
      const interval = setInterval(() => {
        c--;
        setCountdown(c);
        if (c <= 0) clearInterval(interval);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    socket.on('question_active', (data) => {
      navigate(`/game/${gameCode}`);
    });
    socket.on('game_finished', (data) => {
      sessionStorage.setItem('kw_final_result', JSON.stringify(data));
      navigate(`/final/${gameCode}`);
    });
    return () => {
      socket.off('question_active');
      socket.off('game_finished');
    };
  }, [gameCode, navigate]);

  if (!data) return (
    <div className="round-page">
      <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '4rem' }}>Loading…</p>
    </div>
  );

  const { question, correct_guesses, leaderboard } = data;

  return (
    <div className="round-page">
      <div className="round-page__bg" aria-hidden="true" />

      <header className="round-header">
        <span className="round-header__logo logo-text">KOLLOYWOOD</span>
        <span className="badge badge-purple">Round Complete</span>
      </header>

      <main className="round-main">
        {/* Answer reveal */}
        <div className="round-answer card animate-scaleIn">
          <div className="round-answer__badge">🎬 ANSWER</div>
          <div className="round-answer__movie">{question?.movie_answer}</div>
          {question?.hero && (
            <div className="round-answer__meta">
              <span>👨 {question.hero}</span>
              <span>👩 {question.heroine}</span>
              <span>🎵 {question.song}</span>
            </div>
          )}
        </div>

        <div className="round-columns">
          {/* Correct guesses */}
          <div className="card round-correct animate-fadeIn">
            <h2 className="round-section-title">✅ Correct Answers</h2>
            {correct_guesses && correct_guesses.length > 0 ? (
              <div className="round-correct__list">
                {correct_guesses.map((g, i) => (
                  <div key={i} className="round-correct__row animate-slideInLeft" style={{ animationDelay: `${i * 0.06}s` }}>
                    <span className="round-correct__medal">{MEDALS[i] || `${i + 1}.`}</span>
                    <span className="round-correct__avatar">{getAvatarEmoji(g.avatar_id)}</span>
                    <span className="round-correct__name">{g.name}</span>
                    <span className="round-correct__time">{g.response_time?.toFixed(1)}s</span>
                    <span className="round-correct__pts">+{g.points}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="round-empty">No one guessed correctly this round.</p>
            )}
          </div>

          {/* Updated leaderboard */}
          <div className="card round-leaderboard animate-slideInRight">
            <h2 className="round-section-title">🏆 Updated Scores</h2>
            <div className="round-lb-list">
              {[...(leaderboard || [])].sort((a, b) => b.score - a.score).map((p, i) => (
                <div
                  key={p.user_id}
                  className={`round-lb-row ${p.user_id === userId ? 'round-lb-row--me' : ''}`}
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <span className="round-lb-rank">{i < 3 ? MEDALS[i] : `${i + 1}.`}</span>
                  <span className="round-lb-avatar">{getAvatarEmoji(p.avatar_id)}</span>
                  <span className="round-lb-name">{p.name}</span>
                  <span className="round-lb-score">{p.score.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Next question countdown */}
        {countdown !== null && countdown > 0 && (
          <div className="round-next animate-fadeIn">
            <div className="round-next__spinner" />
            <span>Next question in <strong>{countdown}s</strong>…</span>
          </div>
        )}
      </main>
    </div>
  );
}
