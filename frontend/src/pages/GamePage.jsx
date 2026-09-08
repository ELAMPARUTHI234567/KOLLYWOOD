import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../socket/socket';
import HintCards from '../components/HintCards';
import ClueBox from '../components/ClueBox';
import LiveChat from '../components/LiveChat';
import Leaderboard from '../components/Leaderboard';
import CountdownTimer from '../components/CountdownTimer';
import { getAvatarEmoji } from '../components/avatars';
import audioManager from '../socket/AudioManager';
import api from '../services/api';
import './GamePage.css';

export default function GamePage() {
  const { gameCode } = useParams();
  const navigate = useNavigate();

  const userId = parseInt(sessionStorage.getItem('kw_user_id'));
  const user = JSON.parse(sessionStorage.getItem('kw_user') || '{}');

  const [gameState, setGameState] = useState('GAME_START');
  const [questionNumber, setQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(1);
  const [creator, setCreator] = useState(null);
  const [question, setQuestion] = useState(null);
  const [cluesRevealed, setCluesRevealed] = useState(0);
  const [clueTexts, setClueTexts] = useState({ 1: null, 2: null, 3: null });
  const [leaderboard, setLeaderboard] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [guess, setGuess] = useState('');
  const [guessError, setGuessError] = useState('');
  const [hasGuessedCorrectly, setHasGuessedCorrectly] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [serverTime, setServerTime] = useState(null);
  const [game, setGame] = useState(JSON.parse(sessionStorage.getItem('kw_game') || '{}'));
  const [transitioning, setTransitioning] = useState(false);
  const [nextQCountdown, setNextQCountdown] = useState(0);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [mobileAudioUnlocked, setMobileAudioUnlocked] = useState(false);
  const guessInputRef = useRef(null);

  const [soundsList, setSoundsList] = useState([]);
  const [selectedSoundId, setSelectedSoundId] = useState('');
  const [hostVolume, setHostVolume] = useState(1.0);
  const [hostMuted, setHostMuted] = useState(false);
  const [currentlyPlayingSound, setCurrentlyPlayingSound] = useState(null);
  const questionTime = game.question_time || 120;
  const isHost = game?.host_id === userId;

  const elapsedFromServer = serverTime
    ? (Date.now() - new Date(serverTime + 'Z').getTime()) / 1000
    : 0;

  useEffect(() => {
    const fetchSounds = async () => {
      try {
        const res = await api.get('/sounds');
        setSoundsList(res.data.filter(s => s.is_active));
      } catch (e) {
        console.error('Failed to load active sounds', e);
      }
    };
    fetchSounds();
  }, []);

  useEffect(() => {
    const handleAutoplayBlocked = () => setAutoplayBlocked(true);
    audioManager.on('autoplay_blocked', handleAutoplayBlocked);
    return () => {
      audioManager.off('autoplay_blocked', handleAutoplayBlocked);
    };
  }, []);

  const processAudioState = useCallback((state) => {
    if (!state) return;
    setCurrentlyPlayingSound(state.sound_name || null);
    if (state.action === 'play') {
      if (state.sound_url) {
        audioManager.playHostAudio(state.sound_url, state.volume, state.server_time, state.playback_position);
      }
    } else if (state.action === 'pause') {
      audioManager.pauseHostAudio(state.server_time, state.playback_position);
    } else if (state.action === 'stop') {
      audioManager.stopHostAudio(state.server_time);
      setCurrentlyPlayingSound(null);
    }
  }, []);

  const emitAudioCommand = (action) => {
    if (!socket.connected) return;
    const vol = hostMuted ? 0 : hostVolume;
    const pos = audioManager.getHostAudioCurrentTime();
    socket.emit('host_audio_command', {
      game_id: game.id,
      sound_id: selectedSoundId ? parseInt(selectedSoundId) : null,
      action,
      volume: vol,
      playback_position: pos
    });
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setHostVolume(vol);
    if (!hostMuted) {
      socket.emit('host_audio_command', {
        game_id: game.id,
        sound_id: selectedSoundId ? parseInt(selectedSoundId) : null,
        action: 'volume',
        volume: vol
      });
    }
  };

  const handleMuteToggle = () => {
    const newMuted = !hostMuted;
    setHostMuted(newMuted);
    socket.emit('host_audio_command', {
      game_id: game.id,
      sound_id: selectedSoundId ? parseInt(selectedSoundId) : null,
      action: 'volume',
      volume: newMuted ? 0 : hostVolume
    });
  };

  useEffect(() => {
    if (!userId) { navigate('/'); return; }
    if (!socket.connected) socket.connect();
    socket.emit('join_game_room', { game_code: gameCode, user_id: userId });

    socket.on('game_state', (data) => {
      setLeaderboard(data.players || []);
      if (data.game) {
        setGame(data.game);
        if (data.game.status) setGameState(data.game.status);
      }
      if (data.question) {
        setQuestion(data.question);
        if (data.creator) {
          setCreator(data.creator);
          setIsCreator(data.creator.id === userId);
        }
        if (data.question_number) setQuestionNumber(data.question_number);
        if (data.total_questions) setTotalQuestions(data.total_questions);
        if (data.clues_revealed !== undefined) {
          setCluesRevealed(data.clues_revealed);
          setClueTexts({
            1: data.question.clue_1,
            2: data.question.clue_2,
            3: data.question.clue_3,
          });
        }
        if (data.has_guessed_correctly) setHasGuessedCorrectly(true);
      }
      if (data.audio_state) {
        processAudioState(data.audio_state);
      }
    });

    socket.on('question_active', (data) => {
      setGameState('QUESTION_ACTIVE');
      setQuestionNumber(data.question_number);
      setTotalQuestions(data.total_questions);
      setCreator(data.creator);
      setQuestion(data.question);
      setCluesRevealed(0);
      setClueTexts({ 1: null, 2: null, 3: null });
      setChatMessages([]);
      setGuess('');
      setGuessError('');
      setHasGuessedCorrectly(false);
      setIsCreator(data.creator?.id === userId);
      setServerTime(data.server_time);
      setTransitioning(false);
      audioManager.playEffect('New Question');
      setTimeout(() => guessInputRef.current?.focus(), 300);
    });

    socket.on('next_question_starting', (data) => {
      setTransitioning(true);
      setGameState('NEXT_QUESTION');
      setQuestionNumber(data.question_number);
      setTotalQuestions(data.total_questions);
      setCreator(data.creator);
      setQuestion(data.question);
    });

    socket.on('clue_revealed', (data) => {
      setCluesRevealed(data.clue_num);
      setClueTexts(prev => ({ ...prev, [data.clue_num]: data.clue_text }));
      setGameState(data.game_status);
      audioManager.playEffect('Clue Released');
    });

    socket.on('guess_incorrect', (data) => {
      setChatMessages(prev => [...prev, {
        type: 'incorrect',
        user_id: data.player.user_id,
        name: data.player.name,
        avatar_id: data.player.avatar_id,
        guess: data.guess,
      }]);
      audioManager.playEffect('Wrong Answer');
    });

    socket.on('guess_correct', (data) => {
      setChatMessages(prev => [...prev, {
        type: 'correct',
        user_id: data.player.user_id,
        name: data.player.name,
        avatar_id: data.player.avatar_id,
        points: data.points,
      }]);
      if (data.player.user_id === userId) {
        setHasGuessedCorrectly(true);
      }
      audioManager.playEffect('Correct Answer');
    });

    socket.on('leaderboard_update', (data) => {
      setLeaderboard(data.leaderboard || []);
    });

    socket.on('answer_revealed', (data) => {
      setGameState('ANSWER_REVEAL');
      if (data.question) {
        setQuestion(data.question);
      }
      audioManager.playEffect('Time Expired');
    });

    socket.on('round_result', (data) => {
      setGameState('ROUND_RESULT');
      setLeaderboard(data.leaderboard || []);
      // Navigate to round result page
      sessionStorage.setItem('kw_round_result', JSON.stringify(data));
      navigate(`/round-result/${gameCode}`);
    });

    socket.on('game_finished', (data) => {
      sessionStorage.setItem('kw_final_result', JSON.stringify(data));
      audioManager.playEffect('Game Complete');
      navigate(`/final/${gameCode}`);
    });

    socket.on('redirect_to_home', () => navigate('/'));

    socket.on('error', (data) => setGuessError(data.message));

    socket.on('audio_command', (data) => {
      setCurrentlyPlayingSound(data.sound_name || null);
      if (data.action === 'play' && data.sound_url) {
        audioManager.playHostAudio(data.sound_url, data.volume, data.server_time, data.playback_position);
      } else if (data.action === 'pause') {
        audioManager.pauseHostAudio(data.server_time, data.playback_position);
      } else if (data.action === 'resume') {
        audioManager.resumeHostAudio(data.server_time, data.playback_position);
      } else if (data.action === 'stop') {
        audioManager.stopHostAudio(data.server_time);
        setCurrentlyPlayingSound(null);
      } else if (data.action === 'volume') {
        audioManager.setHostAudioVolume(data.volume);
      }
    });

    return () => {
      socket.off('game_state');
      socket.off('question_active');
      socket.off('next_question_starting');
      socket.off('clue_revealed');
      socket.off('guess_incorrect');
      socket.off('guess_correct');
      socket.off('leaderboard_update');
      socket.off('answer_revealed');
      socket.off('round_result');
      socket.off('game_finished');
      socket.off('redirect_to_home');
      socket.off('error');
      socket.off('audio_command');
    };
  }, [gameCode, userId, navigate]);

  const handleGuess = (e) => {
    e.preventDefault();
    if (!guess.trim()) return;
    if (hasGuessedCorrectly || isCreator) return;
    setGuessError('');
    socket.emit('player_guess', {
      game_code: gameCode,
      user_id: userId,
      guess: guess.trim(),
    });
    setGuess('');
  };

  const canGuess = !hasGuessedCorrectly && !isCreator && gameState !== 'ANSWER_REVEAL';

  return (
    <div className="game-page">
      <div className="game-page__bg" aria-hidden="true" />

      {/* Header */}
      <header className="game-header">
        <div className="game-header__logo logo-text">KOLLOYWOOD</div>
        <div className="game-header__center">
          <div className="game-question-info">
            <span className="game-question-label">Question</span>
            <span className="game-question-num">{questionNumber} / {totalQuestions}</span>
          </div>
          {creator && (
            <div className="game-creator-tag">
              <span>{getAvatarEmoji(creator.avatar_id)}</span>
              <span>{creator.name}'s Question</span>
            </div>
          )}
        </div>
        <div className="game-header__timer">
          {gameState === 'QUESTION_ACTIVE' || gameState === 'CLUE_1' || gameState === 'CLUE_2' || gameState === 'CLUE_3' ? (
            <CountdownTimer
              totalSeconds={questionTime}
              elapsedSeconds={elapsedFromServer}
            />
          ) : (
            <div className="game-timer-placeholder">⏱</div>
          )}
        </div>
      </header>

      {/* Transitioning overlay */}
      {transitioning && (
        <div className="game-transition animate-fadeIn">
          <div className="game-transition__content">
            <span className="game-transition__num">Q{questionNumber}</span>
            <span className="game-transition__label">Get Ready!</span>
          </div>
        </div>
      )}

      {/* Main Game Layout */}
      <main className="game-main">
        {/* Center column */}
        <div className="game-center">
          {/* Hint Cards (only for movie dialogues) */}
          {question?.question_type === 'movie_dialogues' && (
            <div className="game-hints">
              <HintCards question={question} />
            </div>
          )}

          {/* Clues (not for picture games) */}
          {question?.question_type !== 'picture_games' && question?.question_type !== 'custom_question' && (
            <div className="game-clues">
              {[1, 2, 3].map(n => (
                <ClueBox
                  key={n}
                  clueNum={n}
                  text={clueTexts[n]}
                  isRevealed={cluesRevealed >= n}
                />
              ))}
            </div>
          )}

          {/* Picture Game UI */}
          {question?.question_type === 'picture_games' && (
            <div className="picture-game-ui animate-scaleIn">
              <div className="picture-game-image-wrapper">
                <img 
                  src={question.image_url} 
                  alt="Movie clue" 
                  className="picture-game-image" 
                  onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/600x400/101015/FBBF24?text=Image+Not+Found'; }}
                />
              </div>
              <div className="picture-game-choices">
                {['A', 'B', 'C', 'D'].map((opt, i) => {
                  const label = opt === 'A' ? question.option_a : opt === 'B' ? question.option_b : opt === 'C' ? question.option_c : question.option_d;
                  return (
                    <button
                      key={opt}
                      className="picture-choice-btn btn btn-outline"
                      disabled={!canGuess}
                      onClick={(e) => {
                        setGuess(label || 'Option ' + opt);
                        // auto submit
                        setTimeout(() => {
                           document.getElementById('form-guess')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                        }, 50);
                      }}
                    >
                      <span className="choice-letter">{opt}</span>
                      <span className="choice-text">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Guess Input */}
          <div className="game-guess-section">
            {isCreator ? (
              <div className="game-creator-notice">
                <span>🎬</span>
                <span>This is your question — watch others guess!</span>
              </div>
            ) : hasGuessedCorrectly ? (
              <div className="game-correct-notice animate-correctFlash">
                <span>🎉</span>
                <span>Correct! Well done!</span>
              </div>
            ) : gameState === 'ANSWER_REVEAL' ? (
              <div className="game-reveal-notice">
                <span>⏰</span>
                <span>Time's up! Revealing answer…</span>
              </div>
            ) : (
              <form onSubmit={handleGuess} className="game-guess-form" id="form-guess">
                {question?.question_type !== 'picture_games' && (
                  <input
                    ref={guessInputRef}
                    className="game-guess-input"
                    type="text"
                    placeholder="Guess the Movie…"
                    value={guess}
                    onChange={e => { setGuess(e.target.value); setGuessError(''); }}
                    disabled={!canGuess}
                    maxLength={100}
                    autoComplete="off"
                    id="input-guess"
                  />
                )}
                {question?.question_type !== 'picture_games' && (
                  <button
                    className="btn btn-gold game-guess-btn"
                    type="submit"
                    id="btn-guess"
                    disabled={!canGuess || !guess.trim()}
                  >
                    GUESS
                  </button>
                )}
                <input type="hidden" value={guess} />
              </form>
            )}
            {guessError && <p className="game-guess-error animate-shake">{guessError}</p>}
          </div>

          {/* Answer Reveal */}
          {gameState === 'ANSWER_REVEAL' && question?.movie_answer && (
            <div className="game-answer-reveal animate-scaleIn">
              <span className="game-answer-reveal__label">🎬 ANSWER</span>
              <span className="game-answer-reveal__movie">{question.movie_answer}</span>
              {question.hero && (
                <div className="game-answer-reveal__details">
                  <span>👨 {question.hero}</span>
                  <span>👩 {question.heroine}</span>
                  <span>🎵 {question.song}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="game-sidebar">
          {!isHost && (
            <div 
              className="game-autoplay-notice" 
              style={{ 
                background: mobileAudioUnlocked ? 'rgba(76, 175, 80, 0.2)' : 'rgba(220, 53, 69, 0.8)', 
                color: 'white', 
                padding: '10px', 
                borderRadius: '8px', 
                marginBottom: '10px', 
                textAlign: 'center', 
                cursor: mobileAudioUnlocked ? 'default' : 'pointer',
                border: mobileAudioUnlocked ? '1px solid #4CAF50' : 'none'
              }} 
              onClick={() => { 
                if (!mobileAudioUnlocked) {
                  audioManager.unlockMobileAudio().then(() => {
                    setMobileAudioUnlocked(true);
                    setAutoplayBlocked(false);
                  });
                }
              }}
            >
              {mobileAudioUnlocked ? '✅ Game Audio Enabled' : '🔊 Enable Game Audio'}
            </div>
          )}

          {autoplayBlocked && !mobileAudioUnlocked && (
            <div className="game-autoplay-notice animate-shake" style={{ background: '#dc3545', color: 'white', padding: '10px', borderRadius: '8px', marginBottom: '10px', textAlign: 'center', cursor: 'pointer' }} onClick={() => { 
                audioManager.unlockMobileAudio().then(() => {
                  setMobileAudioUnlocked(true);
                  setAutoplayBlocked(false);
                  audioManager.resumeBlockedAudio();
                });
            }}>
              ⚠️ Audio Blocked - Tap to Fix
            </div>
          )}

          {currentlyPlayingSound && !isHost && (
             <div className="game-playing-audio" style={{ background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '8px', marginBottom: '10px', textAlign: 'center', color: '#ffd700' }}>
                🎵 Playing: {currentlyPlayingSound}
             </div>
          )}

          {isHost && (
            <div className="game-host-audio" style={{ background: 'rgba(0,0,0,0.5)', padding: '15px', borderRadius: '8px', marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h4 style={{ margin: 0, color: '#ffd700', textAlign: 'center' }}>🎵 GAME AUDIO</h4>
              <select value={selectedSoundId} onChange={e => setSelectedSoundId(e.target.value)} style={{ padding: '8px', borderRadius: '4px', background: '#333', color: 'white', border: '1px solid #555' }}>
                <option value="">[ Select Sound ▼ ]</option>
                {soundsList.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button onClick={() => emitAudioCommand('play')} disabled={!selectedSoundId} style={{ background: '#28a745', border: 'none', color: 'white', padding: '8px', borderRadius: '4px', cursor: selectedSoundId ? 'pointer' : 'not-allowed' }}>▶ PLAY</button>
                <button onClick={() => emitAudioCommand('stop')} style={{ background: '#dc3545', border: 'none', color: 'white', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>⏹ STOP</button>
                <button onClick={() => emitAudioCommand('pause')} style={{ background: '#ffc107', border: 'none', color: 'black', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>⏸ PAUSE</button>
                <button onClick={() => emitAudioCommand('resume')} style={{ background: '#17a2b8', border: 'none', color: 'white', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>▶ RESUME</button>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                <label style={{ fontSize: '0.9em', color: '#ccc' }}>Volume:</label>
                <input type="range" min="0" max="1" step="0.05" value={hostVolume} onChange={handleVolumeChange} disabled={hostMuted} style={{ flex: 1 }} />
                <button onClick={handleMuteToggle} style={{ background: '#555', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '0.8em', cursor: 'pointer' }}>{hostMuted ? 'UNMUTE' : 'MUTE'}</button>
              </div>
              
              {currentlyPlayingSound && (
                <div style={{ marginTop: '10px', fontSize: '0.9em', textAlign: 'center', color: '#aaa' }}>
                  Currently Playing:<br /><strong style={{ color: '#fff' }}>{currentlyPlayingSound}</strong>
                </div>
              )}
            </div>
          )}
          
          <LiveChat messages={chatMessages} />
          <Leaderboard players={leaderboard} currentUserId={userId} />
        </aside>
      </main>

      {/* Rules footer */}
      <div className="game-rules">
        <span>🎯 Guess the correct movie name</span>
        <span>⚡ Faster answers = higher points</span>
        <span>🚫 You cannot guess your own question</span>
      </div>
    </div>
  );
}
