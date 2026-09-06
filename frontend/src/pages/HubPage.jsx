import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Trophy,
  CircleHelp,
  MessageCircle,
  Clapperboard,
  ClipboardList,
  History,
  Settings,
  ArrowRight,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { getAvatarEmoji } from '../components/avatars';
import MoviesView from '../components/MoviesView';
import SoundsView from '../components/SoundsView';
import LeaderboardView from '../components/LeaderboardView';
import audioManager from '../socket/AudioManager';
import './HubPage.css';

export default function HubPage({ view }) {
  const navigate = useNavigate();

  // Active game session from sessionStorage
  const activeGame = JSON.parse(sessionStorage.getItem('kw_game') || 'null');
  const activeUser = JSON.parse(sessionStorage.getItem('kw_user') || 'null');

  // Settings state
  const [prefs, setPrefs] = useState(audioManager.prefs);

  React.useEffect(() => {
    const handleUpdate = (newPrefs) => setPrefs({ ...newPrefs });
    audioManager.on('prefs_updated', handleUpdate);
    return () => audioManager.off('prefs_updated', handleUpdate);
  }, []);

  const renderContent = () => {
    switch (view) {
      case 'players':
        return (
          <div className="hub-card animate-fadeIn">
            <div className="hub-card__header">
              <Users className="hub-card__icon" size={28} />
              <div>
                <h2 className="hub-card__title">Room Players</h2>
                <p className="hub-card__subtitle">Active participants in your Kollywood game session</p>
              </div>
            </div>

            {activeGame ? (
              <div className="hub-session-box">
                <div className="hub-session-header">
                  <span>Room: <strong>{activeGame.game_code}</strong></span>
                  <button className="btn btn-gold btn-sm" onClick={() => navigate(`/room/${activeGame.game_code}`)}>
                    Go to Waiting Room →
                  </button>
                </div>
                <div className="hub-player-row">
                  <span className="hub-player-avatar">{activeUser ? getAvatarEmoji(activeUser.avatar_id) : '🎬'}</span>
                  <div className="hub-player-info">
                    <span className="hub-player-name">{activeUser?.name || 'Current Player'} (You)</span>
                    <span className="hub-player-role">Connected</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="hub-empty-state">
                <p>You are not currently in an active game room.</p>
                <div className="hub-actions">
                  <button className="btn btn-gold btn-sm" onClick={() => navigate('/create')}>Create Game</button>
                  <button className="btn btn-outline btn-sm" onClick={() => navigate('/join')}>Join Game</button>
                </div>
              </div>
            )}
          </div>
        );

      case 'leaderboard':
        return <LeaderboardView />;

      case 'questions':
        return (
          <div className="hub-card animate-fadeIn">
            <div className="hub-card__header">
              <CircleHelp className="hub-card__icon text-purple" size={28} />
              <div>
                <h2 className="hub-card__title">Movie Questions Hub</h2>
                <p className="hub-card__subtitle">Submit, preview, and review movie questions</p>
              </div>
            </div>

            <div className="hub-timeline-overview">
              <h3 className="hub-section-title">⏱️ Fixed Clue Timeline</h3>
              <div className="hub-timeline-flow">
                <div className="hub-timeline-node">
                  <span className="node-time">0s</span>
                  <span className="node-label">Start (Hint letters)</span>
                </div>
                <span className="node-arrow">→</span>
                <div className="hub-timeline-node">
                  <span className="node-time">30s</span>
                  <span className="node-label">💡 Clue 1</span>
                </div>
                <span className="node-arrow">→</span>
                <div className="hub-timeline-node">
                  <span className="node-time">60s</span>
                  <span className="node-label">💡 Clue 2</span>
                </div>
                <span className="node-arrow">→</span>
                <div className="hub-timeline-node">
                  <span className="node-time">90s</span>
                  <span className="node-label">💡 Clue 3</span>
                </div>
                <span className="node-arrow">→</span>
                <div className="hub-timeline-node">
                  <span className="node-time">120s</span>
                  <span className="node-label">🛑 Answer Reveal</span>
                </div>
              </div>
            </div>

            {activeGame && (
              <button
                className="btn btn-gold btn-md mt-4"
                onClick={() => navigate(`/submit/${activeGame.game_code}`)}
              >
                Go to Question Submission →
              </button>
            )}
          </div>
        );

      case 'chat':
        return (
          <div className="hub-card animate-fadeIn">
            <div className="hub-card__header">
              <MessageCircle className="hub-card__icon text-blue" size={28} />
              <div>
                <h2 className="hub-card__title">Live Game Chat</h2>
                <p className="hub-card__subtitle">Real-time room guesses, reactions, and player messages</p>
              </div>
            </div>

            {activeGame ? (
              <div className="hub-chat-preview">
                <p className="text-secondary">You have an active session for <strong>{activeGame.game_code}</strong>.</p>
                <button
                  className="btn btn-purple btn-md mt-3"
                  onClick={() => navigate(`/game/${activeGame.game_code}`)}
                >
                  Enter Game Room to Chat →
                </button>
              </div>
            ) : (
              <div className="hub-empty-state">
                <p>Live chat activates when you join or start a multiplayer room.</p>
                <button className="btn btn-outline btn-sm mt-3" onClick={() => navigate('/join')}>
                  Join a Game Room
                </button>
              </div>
            )}
          </div>
        );

      case 'movies':
        return <MoviesView />;

      case 'sounds':
        return <SoundsView />;

      case 'my-games':
        return (
          <div className="hub-card animate-fadeIn">
            <div className="hub-card__header">
              <ClipboardList className="hub-card__icon text-purple" size={28} />
              <div>
                <h2 className="hub-card__title">My Games</h2>
                <p className="hub-card__subtitle">Manage your hosted and joined games</p>
              </div>
            </div>

            {activeGame ? (
              <div className="hub-session-box">
                <div className="hub-session-header">
                  <span>Current Active Game: <strong>{activeGame.game_code}</strong></span>
                  <span className="badge badge-success">Active</span>
                </div>
                <p className="hub-session-meta">
                  Max Players: {activeGame.max_players} • Question Time: {activeGame.question_time}s • Clue Timeline: Fixed 30s/60s/90s
                </p>
                <div className="hub-actions mt-3">
                  <button className="btn btn-gold btn-sm" onClick={() => navigate(`/room/${activeGame.game_code}`)}>
                    Resume Game →
                  </button>
                </div>
              </div>
            ) : (
              <div className="hub-empty-state">
                <p>No active game session found on this device.</p>
                <div className="hub-actions">
                  <button className="btn btn-gold btn-sm" onClick={() => navigate('/create')}>Create Game</button>
                  <button className="btn btn-outline btn-sm" onClick={() => navigate('/join')}>Join Game</button>
                </div>
              </div>
            )}
          </div>
        );

      case 'history':
        return (
          <div className="hub-card animate-fadeIn">
            <div className="hub-card__header">
              <History className="hub-card__icon text-blue" size={28} />
              <div>
                <h2 className="hub-card__title">Game History</h2>
                <p className="hub-card__subtitle">Past rounds, completed games, and victory records</p>
              </div>
            </div>

            <div className="hub-empty-state">
              <p>Completed game recaps and final scoreboards will appear here after finishing a match.</p>
              <button className="btn btn-outline btn-sm mt-3" onClick={() => navigate('/')}>
                Return to Dashboard
              </button>
            </div>
          </div>
        );

      case 'settings':
      default:
        return (
          <div className="hub-card animate-fadeIn">
            <div className="hub-card__header">
              <Settings className="hub-card__icon text-gold" size={28} />
              <div>
                <h2 className="hub-card__title">Game Settings</h2>
                <p className="hub-card__subtitle">Audio, display, and gaming preferences</p>
              </div>
            </div>

            <div className="hub-settings-list">
              <div className="hub-setting-row">
                <div className="hub-setting-info">
                  <span className="hub-setting-label">Mute All Sounds</span>
                  <span className="hub-setting-desc">Mute both background music and sound effects globally</span>
                </div>
                <button
                  type="button"
                  className={`btn btn-sm ${!prefs.muted ? 'btn-gold' : 'btn-outline'}`}
                  onClick={() => audioManager.setPref('muted', !prefs.muted)}
                >
                  {!prefs.muted ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  {!prefs.muted ? 'Unmuted' : 'Muted'}
                </button>
              </div>

              <div className="hub-setting-row">
                <div className="hub-setting-info">
                  <span className="hub-setting-label">Background Music</span>
                  <span className="hub-setting-desc">Play persistent cinematic music</span>
                </div>
                <button
                  type="button"
                  className={`btn btn-sm ${prefs.bgmEnabled ? 'btn-gold' : 'btn-outline'}`}
                  onClick={() => audioManager.setPref('bgmEnabled', !prefs.bgmEnabled)}
                >
                  {prefs.bgmEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div className="hub-setting-row">
                <div className="hub-setting-info">
                  <span className="hub-setting-label">Sound Effects & Timers</span>
                  <span className="hub-setting-desc">Play audio cue when clues reveal and countdown reaches 10s</span>
                </div>
                <button
                  type="button"
                  className={`btn btn-sm ${prefs.sfxEnabled ? 'btn-gold' : 'btn-outline'}`}
                  onClick={() => audioManager.setPref('sfxEnabled', !prefs.sfxEnabled)}
                >
                  {prefs.sfxEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div className="hub-setting-row">
                <div className="hub-setting-info">
                  <span className="hub-setting-label">Theme Mode</span>
                  <span className="hub-setting-desc">Cinematic dark palette tailored for Kollywood gaming</span>
                </div>
                <span className="badge badge-purple">Cinematic Dark</span>
              </div>

              <div className="hub-setting-row">
                <div className="hub-setting-info">
                  <span className="hub-setting-label">Clue Reveal Mode</span>
                  <span className="hub-setting-desc">Automatic synchronized reveal (0s → 30s → 60s → 90s)</span>
                </div>
                <span className="badge badge-gold">Fixed Schedule</span>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="hub-page">
      <div className="hub-page__bg" aria-hidden="true" />
      <main className="hub-page__main">
        {renderContent()}
      </main>
    </div>
  );
}
