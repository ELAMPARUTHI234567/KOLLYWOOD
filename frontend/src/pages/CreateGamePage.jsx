import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AvatarPicker from '../components/AvatarPicker';
import { createGame } from '../services/api';
import './CreateGamePage.css';

const POINTS_OPTIONS = [50, 100, 200, 500, 1000];
const TIME_OPTIONS = [90, 120, 150, 180];
const GAP_OPTIONS = [5, 10, 15, 20, 30];

export default function CreateGamePage({ mode } = {}) {
  const isPictureMode = mode === 'picture-games';
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(30);
  const [pointsPerQ, setPointsPerQ] = useState(100);
  const [customPoints, setCustomPoints] = useState('');
  const [questionTime, setQuestionTime] = useState(120);
  const [questionGap, setQuestionGap] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const effectivePoints = pointsPerQ === 'custom' ? parseInt(customPoints) || 100 : pointsPerQ;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Please enter your name'); return; }
    if (!avatarId) { setError('Please choose an avatar'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await createGame({
        name: name.trim(),
        avatar_id: avatarId,
        max_players: maxPlayers,
        points_per_question: effectivePoints,
        question_time: questionTime,
        clue_interval: 30, // Fixed 30s clue timeline (0s -> none, 30s -> clue 1, 60s -> clue 2, 90s -> clue 3)
        question_gap: questionGap,
      });
      if (!res.data || !res.data.game_code) {
        throw new Error('Invalid response from server. Game code not received.');
      }
      const { game_code, user_id, user, game } = res.data;
      // Store session
      sessionStorage.setItem('kw_user_id', user_id);
      sessionStorage.setItem('kw_user', JSON.stringify(user));
      sessionStorage.setItem('kw_game', JSON.stringify(game));
      sessionStorage.setItem('kw_is_host', 'true');
      // Store game mode so QuestionSubmitPage can preselect question type
      if (isPictureMode) {
        sessionStorage.setItem('kw_game_mode', 'picture_games');
      } else {
        sessionStorage.removeItem('kw_game_mode');
      }
      navigate(`/room/${game_code}`);
    } catch (err) {
      setError(err.friendlyMessage || err.response?.data?.error || err.message || 'Failed to create game. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-page">
      <div className="create-page__bg" aria-hidden="true" />

      <nav className="navbar">
        <a href="/" className="navbar-logo">KOLLOYWOOD</a>
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/')}>← Back</button>
      </nav>

      <main className="create-page__main">
        <div className="create-page__card card animate-fadeIn">
          <div className="create-page__header">
            <span className="create-page__icon">🎮</span>
            <h1 className="create-page__title">{isPictureMode ? 'Create Picture Game' : 'Create a New Game'}</h1>
            <p className="create-page__subtitle">
              {isPictureMode
                ? 'Set up a multiplayer Picture Games session!'
                : 'Set up your game and invite friends!'}
            </p>
          </div>

          <form onSubmit={handleSubmit} id="form-create-game">
            {/* Player Profile */}
            <section className="create-section">
              <h2 className="create-section__title">👤 Your Profile</h2>
              <div className="form-group">
                <label className="form-label" htmlFor="player-name">Player Name</label>
                <input
                  id="player-name"
                  className="form-input"
                  type="text"
                  placeholder="Enter your name…"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={30}
                  autoFocus
                />
              </div>
              <AvatarPicker selected={avatarId} onSelect={setAvatarId} />
            </section>

            <div className="divider" />

            {/* Game Settings */}
            <section className="create-section">
              <h2 className="create-section__title">⚙️ Game Settings</h2>

              <div className="create-settings-grid">
                {/* Max Players */}
                <div className="form-group">
                  <label className="form-label" htmlFor="max-players">Maximum Players</label>
                  <select
                    id="max-players"
                    className="form-select"
                    value={maxPlayers}
                    onChange={e => setMaxPlayers(Number(e.target.value))}
                  >
                    {[2,5,10,15,20,25,30].map(n => (
                      <option key={n} value={n}>{n} Players</option>
                    ))}
                  </select>
                </div>

                {/* Points Per Question */}
                <div className="form-group">
                  <label className="form-label" htmlFor="points-per-q">Points Per Question</label>
                  <select
                    id="points-per-q"
                    className="form-select"
                    value={pointsPerQ}
                    onChange={e => setPointsPerQ(e.target.value === 'custom' ? 'custom' : Number(e.target.value))}
                  >
                    {POINTS_OPTIONS.map(p => (
                      <option key={p} value={p}>{p} Points</option>
                    ))}
                    <option value="custom">Custom…</option>
                  </select>
                  {pointsPerQ === 'custom' && (
                    <input
                      className="form-input mt-2"
                      type="number"
                      placeholder="Enter custom points"
                      value={customPoints}
                      onChange={e => setCustomPoints(e.target.value)}
                      min={1}
                      max={10000}
                    />
                  )}
                </div>

                {/* Total Question Time */}
                <div className="form-group">
                  <label className="form-label" htmlFor="question-time">Total Question Time</label>
                  <select
                    id="question-time"
                    className="form-select"
                    value={questionTime}
                    onChange={e => setQuestionTime(Number(e.target.value))}
                  >
                    {TIME_OPTIONS.map(t => (
                      <option key={t} value={t}>{t} seconds</option>
                    ))}
                  </select>
                </div>

                {/* Question Gap */}
                <div className="form-group">
                  <label className="form-label" htmlFor="question-gap">Gap Between Questions</label>
                  <select
                    id="question-gap"
                    className="form-select"
                    value={questionGap}
                    onChange={e => setQuestionGap(Number(e.target.value))}
                  >
                    {GAP_OPTIONS.map(t => (
                      <option key={t} value={t}>{t} seconds</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Clue Timeline (Fixed Schedule) */}
              <div className="create-timeline-box">
                <div className="create-timeline-box__header">
                  <span className="create-timeline-box__icon">⏱️</span>
                  <span className="create-timeline-box__title">Clue Release Timeline (Fixed)</span>
                </div>
                <div className="create-timeline-steps">
                  <div className="create-timeline-step">
                    <span className="step-time">0s</span>
                    <span className="step-label">Start</span>
                    <span className="step-desc">No clues</span>
                  </div>
                  <span className="create-timeline-arrow">→</span>
                  <div className="create-timeline-step">
                    <span className="step-time">30s</span>
                    <span className="step-label">💡 Clue 1</span>
                    <span className="step-desc">Revealed</span>
                  </div>
                  <span className="create-timeline-arrow">→</span>
                  <div className="create-timeline-step">
                    <span className="step-time">60s</span>
                    <span className="step-label">💡 Clue 2</span>
                    <span className="step-desc">Revealed</span>
                  </div>
                  <span className="create-timeline-arrow">→</span>
                  <div className="create-timeline-step">
                    <span className="step-time">90s</span>
                    <span className="step-label">💡 Clue 3</span>
                    <span className="step-desc">Revealed</span>
                  </div>
                  <span className="create-timeline-arrow">→</span>
                  <div className="create-timeline-step">
                    <span className="step-time">{questionTime}s</span>
                    <span className="step-label">🛑 End</span>
                    <span className="step-desc">Answer</span>
                  </div>
                </div>
              </div>

              {/* Info box */}
              <div className="create-info-box">
                <span className="create-info-box__icon">ℹ️</span>
                <span>
                  Number of questions = number of players. Each player creates one question!
                </span>
              </div>
            </section>

            {error && <p className="create-error animate-shake">{error}</p>}

            <button
              className="btn btn-gold btn-lg create-submit-btn"
              type="submit"
              id="btn-submit-create"
              disabled={loading}
            >
              {loading ? '⏳ Creating…' : '🚀 CREATE GAME'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
