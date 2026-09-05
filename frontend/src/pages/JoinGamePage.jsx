import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AvatarPicker from '../components/AvatarPicker';
import { joinGame } from '../services/api';
import './JoinGamePage.css';

export default function JoinGamePage() {
  const navigate = useNavigate();
  const [gameCode, setGameCode] = useState('');
  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!gameCode.trim()) { setError('Please enter the Game ID'); return; }
    if (!name.trim()) { setError('Please enter your name'); return; }
    if (!avatarId) { setError('Please choose an avatar'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await joinGame({
        game_code: gameCode.trim().toUpperCase(),
        name: name.trim(),
        avatar_id: avatarId,
      });
      const { game_code, user_id, user, game } = res.data;
      sessionStorage.setItem('kw_user_id', user_id);
      sessionStorage.setItem('kw_user', JSON.stringify(user));
      sessionStorage.setItem('kw_game', JSON.stringify(game));
      sessionStorage.setItem('kw_is_host', 'false');
      navigate(`/room/${game_code}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join game. Check the Game ID and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="join-page">
      <div className="join-page__bg" aria-hidden="true" />

      <nav className="navbar">
        <a href="/" className="navbar-logo">KOLLOYWOOD</a>
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/')}>← Back</button>
      </nav>

      <main className="join-page__main">
        <div className="join-page__card card animate-fadeIn">
          <div className="join-page__header">
            <span className="join-page__icon">🚪</span>
            <h1 className="join-page__title">Join a Game</h1>
            <p className="join-page__subtitle">Enter the Game ID and join your friends!</p>
          </div>

          <form onSubmit={handleSubmit} id="form-join-game">
            <div className="form-group">
              <label className="form-label" htmlFor="game-code-input">Game ID</label>
              <input
                id="game-code-input"
                className="form-input join-game-id-input"
                type="text"
                placeholder="e.g. KOL1234"
                value={gameCode}
                onChange={e => setGameCode(e.target.value.toUpperCase())}
                maxLength={10}
                autoFocus
                autoComplete="off"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="player-name-join">Your Name</label>
              <input
                id="player-name-join"
                className="form-input"
                type="text"
                placeholder="Enter your name…"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={30}
              />
            </div>

            <AvatarPicker selected={avatarId} onSelect={setAvatarId} />

            {error && <p className="join-error animate-shake">{error}</p>}

            <button
              className="btn btn-purple btn-lg join-submit-btn"
              type="submit"
              id="btn-submit-join"
              disabled={loading}
            >
              {loading ? '⏳ Joining…' : '🎮 JOIN GAME'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
