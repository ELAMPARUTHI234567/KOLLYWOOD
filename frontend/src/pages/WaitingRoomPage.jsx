import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../socket/socket';
import { getAvatarEmoji } from '../components/avatars';
import './WaitingRoomPage.css';

export default function WaitingRoomPage() {
  const { gameCode } = useParams();
  const navigate = useNavigate();

  const userId = parseInt(sessionStorage.getItem('kw_user_id'));
  const user = JSON.parse(sessionStorage.getItem('kw_user') || '{}');
  const isHost = sessionStorage.getItem('kw_is_host') === 'true';
  const storedGame = JSON.parse(sessionStorage.getItem('kw_game') || '{}');

  const [players, setPlayers] = useState([]);
  const [game, setGame] = useState(storedGame);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(gameCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    if (!userId) { navigate('/'); return; }

    if (!socket.connected) socket.connect();

    socket.emit('join_game_room', { game_code: gameCode, user_id: userId });

    socket.on('game_state', (data) => {
      setGame(data.game);
      setPlayers(data.players || []);
      if (data.submitted_count !== undefined) setSubmittedCount(data.submitted_count);
      if (data.game?.status && ['GAME_START', 'QUESTION_ACTIVE', 'CLUE_1', 'CLUE_2', 'CLUE_3'].includes(data.game.status)) {
        navigate(`/game/${gameCode}`);
      }
    });

    socket.on('player_joined', (data) => {
      setPlayers(data.players || []);
    });

    socket.on('player_left', (data) => {
      setPlayers(data.players || []);
    });

    socket.on('submission_update', (data) => {
      if (data.submitted_count !== undefined) {
        setSubmittedCount(data.submitted_count);
      }
    });

    socket.on('question_submission_started', (data) => {
      setGame(data.game);
      sessionStorage.setItem('kw_game', JSON.stringify(data.game));
      if (isHost) {
        navigate(`/submit/${gameCode}`);
      }
    });

    socket.on('game_started', () => {
      navigate(`/game/${gameCode}`);
    });

    socket.on('question_active', () => {
      navigate(`/game/${gameCode}`);
    });

    socket.on('error', (data) => setError(data.message));

    return () => {
      socket.off('game_state');
      socket.off('player_joined');
      socket.off('player_left');
      socket.off('submission_update');
      socket.off('question_submission_started');
      socket.off('game_started');
      socket.off('question_active');
      socket.off('error');
    };
  }, [gameCode, userId, isHost, navigate]);

  const handleStartSetup = () => {
    socket.emit('start_question_setup', { game_code: gameCode, user_id: userId });
    navigate(`/submit/${gameCode}`);
  };

  const handleStartGame = () => {
    socket.emit('start_game', { game_code: gameCode, user_id: userId });
  };

  const hostPlayer = players.find(p => p.user_id === game.host_id);
  const totalQ = game.total_questions || 5;

  return (
    <div className="waiting-page">
      <div className="waiting-page__bg" aria-hidden="true" />

      <nav className="navbar">
        <span className="navbar-logo">KOLLOYWOOD</span>
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/')}>Leave</button>
      </nav>

      <main className="waiting-page__main">
        <div className="waiting-layout">
          {/* Left: Game Info */}
          <div className="waiting-info card animate-fadeIn">
            <h1 className="waiting-title logo-text">KOLLOYWOOD</h1>

            <div className="waiting-game-id">
              <span className="waiting-game-id__label">Game ID</span>
              <div className="waiting-game-id__code">
                <span id="game-code-display" className="waiting-game-id__text">{gameCode}</span>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={copyCode}
                  id="btn-copy-code"
                  title="Copy Game ID"
                >
                  {copied ? '✅ Copied!' : '📋 Copy'}
                </button>
              </div>
            </div>

            <div className="waiting-stats">
              <div className="waiting-stat">
                <span className="waiting-stat__label">Players</span>
                <span className="waiting-stat__value">{players.length} / {game.max_players || 30}</span>
              </div>
              <div className="waiting-stat">
                <span className="waiting-stat__label">Host</span>
                <span className="waiting-stat__value">
                  {hostPlayer ? `${getAvatarEmoji(hostPlayer.avatar_id)} ${hostPlayer.name}` : '—'}
                </span>
              </div>
              <div className="waiting-stat">
                <span className="waiting-stat__label">Total Questions</span>
                <span className="waiting-stat__value">{totalQ} Questions</span>
              </div>
              <div className="waiting-stat">
                <span className="waiting-stat__label">Questions Created</span>
                <span className="waiting-stat__value">{submittedCount} / {totalQ} {submittedCount >= totalQ ? '✅' : ''}</span>
              </div>
              <div className="waiting-stat">
                <span className="waiting-stat__label">Clue Timeline</span>
                <span className="waiting-stat__value">30s / 60s / 90s</span>
              </div>
              <div className="waiting-stat">
                <span className="waiting-stat__label">Question Time</span>
                <span className="waiting-stat__value">{game.question_time || 120}s</span>
              </div>
            </div>

            {error && <p className="waiting-error">{error}</p>}

            {isHost && (
              <div className="waiting-actions-group" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                <button
                  className="btn btn-purple btn-lg waiting-start-btn"
                  onClick={handleStartSetup}
                >
                  ✏️ CREATE / ADD QUESTIONS ({submittedCount} / {totalQ})
                </button>
                <button
                  className="btn btn-gold btn-lg waiting-start-btn animate-pulseGlow"
                  id="btn-start-game"
                  onClick={handleStartGame}
                  disabled={submittedCount < 1}
                >
                  🎬 START GAME NOW {submittedCount < 1 ? '(Add 1+ Question First)' : ''}
                </button>
              </div>
            )}

            {!isHost && (
              <div className="waiting-for-host" style={{ marginTop: '15px' }}>
                <div className="waiting-spinner" />
                <span>
                  {submittedCount >= totalQ
                    ? 'Questions ready! Host will start the game soon…'
                    : `Host is creating questions (${submittedCount} / ${totalQ})…`}
                </span>
              </div>
            )}
          </div>

          {/* Right: Player List */}
          <div className="waiting-players card animate-slideInRight">
            <div className="waiting-players__header">
              <h2>Players in Room</h2>
              <span className="badge badge-gold">{players.length} / {game.max_players || 30}</span>
            </div>

            <div className="waiting-players__list">
              {players.sort((a, b) => a.player_order - b.player_order).map((p) => (
                <div
                  key={p.user_id}
                  className={`waiting-player-row ${p.user_id === userId ? 'waiting-player-row--me' : ''} animate-slideInLeft`}
                >
                  <span className="waiting-player-row__avatar">{getAvatarEmoji(p.avatar_id)}</span>
                  <span className="waiting-player-row__name">
                    {p.name}
                    {p.user_id === game.host_id && <span className="badge badge-gold ml-host">Host</span>}
                    {p.user_id === userId && <span className="badge badge-purple ml-host">You</span>}
                  </span>
                  <span className="waiting-player-row__status">
                    {p.is_connected ? <span className="status-dot status-dot--online" /> : <span className="status-dot status-dot--offline" />}
                  </span>
                </div>
              ))}

              {players.length === 0 && (
                <p className="waiting-players__empty">Waiting for players to join…</p>
              )}
            </div>

            <p className="waiting-players__tip">
              Share the Game ID: <strong>{gameCode}</strong>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
