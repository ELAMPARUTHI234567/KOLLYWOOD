import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../socket/socket';
import { submitQuestion } from '../services/api';
import { getAvatarEmoji } from '../components/avatars';
import audioManager from '../socket/AudioManager';
import './QuestionSubmitPage.css';

const SAMPLE_QUESTIONS = [
  {
    movie: 'Vikram',
    hero: 'Kamal Haasan',
    heroine: 'Gayathrie',
    song: 'Pathala Pathala',
    clue_1: 'Directed by Lokesh Kanagaraj',
    clue_2: 'Agent Tina undercover fight scene',
    clue_3: 'Rolex entry at the climax',
  },
  {
    movie: 'Master',
    hero: 'Vijay',
    heroine: 'Malavika Mohanan',
    song: 'Vaathi Coming',
    clue_1: 'Alcoholic professor sent to juvenile home',
    clue_2: 'JD vs Bhavani kabaddi fight scene',
    clue_3: 'Directed by Lokesh Kanagaraj',
  },
  {
    movie: 'Mankatha',
    hero: 'Ajith Kumar',
    heroine: 'Trisha',
    song: 'Vilaiyaadu Mankatha',
    clue_1: 'Suspended police officer joins heist gang',
    clue_2: 'Cricket betting money of 500 crores',
    clue_3: 'Directed by Venkat Prabhu with dark anti-hero twist',
  },
  {
    movie: 'Jailer',
    hero: 'Rajinikanth',
    heroine: 'Ramya Krishnan',
    song: 'Kaavaalaa',
    clue_1: 'Retired jailer Muthuvel Pandian',
    clue_2: 'Cameos by Mohanlal and Shiva Rajkumar',
    clue_3: 'Crown heist comedy with Blast Mohan',
  },
  {
    movie: 'Ghilli',
    hero: 'Vijay',
    heroine: 'Trisha',
    song: 'Appadi Podu',
    clue_1: 'Kabaddi player saves girl from Muthupandi',
    clue_2: 'Chellom dialogue became iconic pop culture',
    clue_3: 'Lighthouse climax showdown in Chennai',
  },
  {
    movie: 'Leo',
    hero: 'Vijay',
    heroine: 'Trisha',
    song: 'Badass',
    clue_1: 'Cafe owner Parthiban living in Himachal Pradesh',
    clue_2: 'Hyena encounter scene in snowy woods',
    clue_3: 'Bloody Sweet chocolate factory fight',
  },
];

export default function QuestionSubmitPage() {
  const { gameCode } = useParams();
  const navigate = useNavigate();

  const userId = parseInt(sessionStorage.getItem('kw_user_id'));
  const user = JSON.parse(sessionStorage.getItem('kw_user') || '{}');

  // Preselect question type if game was created via Picture Games flow
  const storedMode = sessionStorage.getItem('kw_game_mode');
  const defaultQuestionType = storedMode === 'picture_games' ? 'picture_games' : 'movie_dialogues';

  const [form, setForm] = useState({
    question_type: defaultQuestionType,
    movie: '', hero: '', heroine: '', song: '',
    clue_1: '', clue_2: '', clue_3: '',
    image_url: '', option_a: '', option_b: '', option_c: '', option_d: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submittedCount, setSubmittedCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [allReady, setAllReady] = useState(false);
  const [players, setPlayers] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const isHost = sessionStorage.getItem('kw_is_host') === 'true';

  useEffect(() => {
    if (!userId) { navigate('/'); return; }
    if (!socket.connected) socket.connect();
    socket.emit('join_game_room', { game_code: gameCode, user_id: userId });

    socket.on('game_state', (data) => {
      const p = data.players || [];
      setPlayers(p);
      setTotalPlayers(p.length);
      const ready = p.filter(x => x.has_submitted_question).length;
      setSubmittedCount(ready);
      if (p.length > 0 && ready === p.length) {
        setAllReady(true);
      }
    });

    socket.on('submission_update', (data) => {
      setSubmittedCount(data.submitted_count);
      setTotalPlayers(data.total);
      setAllReady(data.all_ready);
      setPlayers(data.players || []);
    });

    socket.on('game_started', () => {
      audioManager.playEffect('Game Start');
      navigate(`/game/${gameCode}`);
    });

    return () => {
      socket.off('game_state');
      socket.off('submission_update');
      socket.off('game_started');
    };
  }, [gameCode, userId, navigate]);

  // Auto-start countdown when all players are ready
  useEffect(() => {
    if (!allReady) return;
    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (isHost) {
            socket.emit('start_game', { game_code: gameCode, user_id: userId });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [allReady, isHost, gameCode, userId]);

  const handleChange = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleQuickFill = () => {
    const pick = SAMPLE_QUESTIONS[Math.floor(Math.random() * SAMPLE_QUESTIONS.length)];
    setForm(pick);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { question_type, movie, hero, heroine, song, clue_1, clue_2, clue_3, image_url, option_a, option_b, option_c, option_d } = form;
    
    if (question_type === 'movie_dialogues') {
      if (!movie || !hero || !heroine || !song || !clue_1 || !clue_2 || !clue_3) {
        setError('All fields are required for Movie Dialogues!');
        return;
      }
    } else if (question_type === 'picture_games') {
      if (!movie || !image_url || !option_a || !option_b || !option_c || !option_d) {
        setError('All fields are required for Picture Games!');
        return;
      }
    } else {
      if (!movie) {
        setError('Movie name (Answer) is required!');
        return;
      }
    }
    
    setError('');
    setLoading(true);
    try {
      await submitQuestion(gameCode, { ...form, user_id: userId });
      setSubmitted(true);
      socket.emit('question_submitted', { game_code: gameCode, user_id: userId });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = () => {
    socket.emit('start_game', { game_code: gameCode, user_id: userId });
  };

  // Compute first letters preview
  const preview = {
    movie: form.movie?.trim()?.[0]?.toUpperCase() || '?',
    hero: form.hero?.trim()?.[0]?.toUpperCase() || '?',
    heroine: form.heroine?.trim()?.[0]?.toUpperCase() || '?',
    song: form.song?.trim()?.[0]?.toUpperCase() || '?',
  };

  return (
    <div className="submit-page">
      <div className="submit-page__bg" aria-hidden="true" />

      <nav className="navbar">
        <span className="navbar-logo">KOLLOYWOOD</span>
        <span className="badge badge-purple">Question Submission</span>
      </nav>

      <main className="submit-page__main">
        <div className="submit-layout">
          {/* Submission Form */}
          <div className="submit-form-col">
            <div className="card animate-fadeIn">
              <div className="submit-header">
                <span className="submit-header__icon">✏️</span>
                <h1 className="submit-header__title">Create Your Question</h1>
                <p className="submit-header__sub">
                  {getAvatarEmoji(user.avatar_id)} {user.name} — Enter the movie answers and clues. Others will guess!
                </p>
                {!submitted && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ marginTop: '10px', borderColor: 'var(--color-gold)', color: 'var(--color-gold)' }}
                    onClick={handleQuickFill}
                  >
                    🎲 Quick Fill Sample Movie
                  </button>
                )}
              </div>

              {submitted ? (
                <div className="submit-success animate-scaleIn">
                  <span className="submit-success__icon">✅</span>
                  <h2>Question Submitted!</h2>
                  <p>
                    {allReady
                      ? `All players ready! Game starting in ${countdown ?? 5}s…`
                      : 'Waiting for other players to submit their questions…'}
                  </p>

                  {isHost && allReady && (
                    <button
                      className="btn btn-gold btn-lg animate-pulseGlow"
                      id="btn-start-game"
                      onClick={handleStartGame}
                      style={{ marginTop: '16px' }}
                    >
                      🎬 START GAME NOW
                    </button>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit} id="form-submit-question">
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label className="form-label" htmlFor="q-type">📋 Question Type</label>
                    <select
                      id="q-type"
                      className="form-select"
                      value={form.question_type}
                      onChange={handleChange('question_type')}
                      style={{ fontSize: '16px', padding: '10px' }}
                    >
                      <option value="movie_dialogues">Movie Dialogues</option>
                      <option value="songs_bgm">Songs / BGM</option>
                      <option value="picture_games">Picture Games</option>
                      <option value="custom_question">Custom Question</option>
                    </select>
                  </div>

                  <div className="submit-grid">
                    {/* Main Settings */}
                    <div className="submit-col-main">
                      <div className="form-group">
                        <label className="form-label" htmlFor="q-movie">🎬 Movie Name (Answer)</label>
                        <input id="q-movie" className="form-input" placeholder="Enter movie name" value={form.movie} onChange={handleChange('movie')} autoFocus />
                      </div>
                      {form.question_type === 'picture_games' && (
                        <>
                          <div className="form-group">
                            <label className="form-label" htmlFor="q-image">🖼 Image URL</label>
                            <input id="q-image" className="form-input" placeholder="Paste image URL here" value={form.image_url} onChange={handleChange('image_url')} />
                          </div>
                          <div className="form-group">
                            <label className="form-label" htmlFor="q-opt-a">A. Incorrect Movie Choice 1</label>
                            <input id="q-opt-a" className="form-input" placeholder="Incorrect Choice" value={form.option_a} onChange={handleChange('option_a')} />
                          </div>
                          <div className="form-group">
                            <label className="form-label" htmlFor="q-opt-b">B. Incorrect Movie Choice 2</label>
                            <input id="q-opt-b" className="form-input" placeholder="Incorrect Choice" value={form.option_b} onChange={handleChange('option_b')} />
                          </div>
                          <div className="form-group">
                            <label className="form-label" htmlFor="q-opt-c">C. Incorrect Movie Choice 3</label>
                            <input id="q-opt-c" className="form-input" placeholder="Incorrect Choice" value={form.option_c} onChange={handleChange('option_c')} />
                          </div>
                          <div className="form-group">
                            <label className="form-label" htmlFor="q-opt-d">D. Correct Movie (Must match above)</label>
                            <input id="q-opt-d" className="form-input" placeholder="Just re-type the exact Movie Name here" value={form.option_d} onChange={handleChange('option_d')} />
                          </div>
                        </>
                      )}

                      {form.question_type === 'movie_dialogues' && (
                        <>
                          <div className="form-group">
                            <label className="form-label" htmlFor="q-hero">👨 Hero Name</label>
                            <input id="q-hero" className="form-input" placeholder="Enter hero name" value={form.hero} onChange={handleChange('hero')} />
                          </div>
                          <div className="form-group">
                            <label className="form-label" htmlFor="q-heroine">👩 Heroine Name</label>
                            <input id="q-heroine" className="form-input" placeholder="Enter heroine name" value={form.heroine} onChange={handleChange('heroine')} />
                          </div>
                          <div className="form-group">
                            <label className="form-label" htmlFor="q-song">🎵 Song Name</label>
                            <input id="q-song" className="form-input" placeholder="Enter song name" value={form.song} onChange={handleChange('song')} />
                          </div>
                        </>
                      )}

                      {form.question_type === 'songs_bgm' && (
                         <div className="form-group" style={{marginTop: '10px'}}>
                           <p style={{color: '#888'}}>For Songs / BGM, you can just fill in the movie name and clues. The Host will play the audio during the game using their Sounds Dashboard!</p>
                         </div>
                      )}

                      {/* First letters preview (only relevant for movie dialogues typically) */}
                      <div className="submit-preview">
                        <p className="submit-preview__label">Players will see these letters:</p>
                        <div className="submit-preview__letters">
                          <div className="submit-preview__letter">
                            <span className="submit-preview__hint">MOVIE</span>
                            <span className="submit-preview__char">{preview.movie}</span>
                          </div>
                          <div className="submit-preview__letter">
                            <span className="submit-preview__hint">HERO</span>
                            <span className="submit-preview__char">{preview.hero}</span>
                          </div>
                          <div className="submit-preview__letter">
                            <span className="submit-preview__hint">HEROINE</span>
                            <span className="submit-preview__char">{preview.heroine}</span>
                          </div>
                          <div className="submit-preview__letter">
                            <span className="submit-preview__hint">SONG</span>
                            <span className="submit-preview__char">{preview.song}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Clues */}
                    <div className="submit-col-clues">
                      <p className="submit-clues__title">Clues (Fixed Reveal Timeline)</p>
                      {[
                        { n: 1, time: '30s' },
                        { n: 2, time: '60s' },
                        { n: 3, time: '90s' },
                      ].map(({ n, time }) => (
                        <div key={n} className="form-group">
                          <label className="form-label" htmlFor={`q-clue-${n}`}>💡 Clue {n} (Revealed at {time})</label>
                          <input
                            id={`q-clue-${n}`}
                            className="form-input"
                            placeholder={`Enter Clue ${n}…`}
                            value={form[`clue_${n}`]}
                            onChange={handleChange(`clue_${n}`)}
                          />
                        </div>
                      ))}
                      <div className="submit-clue-note">
                        Clues are revealed automatically: Clue 1 at 30s, Clue 2 at 60s, and Clue 3 at 90s.
                      </div>
                    </div>
                  </div>

                  {error && <p className="submit-error animate-shake">{error}</p>}

                  <button
                    className="btn btn-gold btn-lg submit-btn"
                    type="submit"
                    id="btn-submit-question"
                    disabled={loading}
                  >
                    {loading ? '⏳ Submitting…' : '✅ SUBMIT QUESTION'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Sidebar: Submission Progress */}
          <div className="submit-sidebar">
            <div className="card animate-slideInRight">
              <h2 className="submit-progress__title">Question Submissions</h2>
              <div className="submit-progress__count">
                <span className="submit-progress__num">{submittedCount}</span>
                <span className="submit-progress__sep">/</span>
                <span className="submit-progress__total">{totalPlayers}</span>
              </div>

              <div className="submit-progress-bar">
                <div
                  className="submit-progress-bar__fill"
                  style={{ width: totalPlayers ? `${(submittedCount / totalPlayers) * 100}%` : '0%' }}
                />
              </div>

              {allReady && (
                <div className="submit-all-ready animate-scaleIn">
                  ✅ ALL PLAYERS READY
                </div>
              )}

              {isHost && allReady && !submitted && (
                <button
                  className="btn btn-gold btn-lg submit-start-btn"
                  id="btn-start-game-sidebar"
                  onClick={handleStartGame}
                >
                  🎬 START GAME
                </button>
              )}

              <div className="submit-player-list">
                {players.map(p => (
                  <div key={p.user_id} className="submit-player-row">
                    <span>{getAvatarEmoji(p.avatar_id)}</span>
                    <span className="submit-player-row__name">{p.name}</span>
                    <span>{p.has_submitted_question ? '✅' : '⏳'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
