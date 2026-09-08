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

const SAMPLE_PICTURE_QUESTIONS = [
  {
    question_type: 'picture_games',
    image_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800',
    option_a: 'Vikram',
    option_b: 'Master',
    option_c: 'Leo',
    option_d: 'Jailer',
    correct_option: 'A',
    movie: 'Vikram',
  },
  {
    question_type: 'picture_games',
    image_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800',
    option_a: 'Ghilli',
    option_b: 'Mankatha',
    option_c: 'Thuppakki',
    option_d: 'Anniyan',
    correct_option: 'B',
    movie: 'Mankatha',
  },
];

export default function QuestionSubmitPage() {
  const { gameCode } = useParams();
  const navigate = useNavigate();

  const userId = parseInt(sessionStorage.getItem('kw_user_id'));
  const user = JSON.parse(sessionStorage.getItem('kw_user') || '{}');
  const isHost = sessionStorage.getItem('kw_is_host') === 'true';

  // Preselect question type if game was created via Picture Games flow
  const storedMode = sessionStorage.getItem('kw_game_mode');
  const defaultQuestionType = storedMode === 'picture_games' ? 'picture_games' : 'movie_dialogues';

  const storedGame = JSON.parse(sessionStorage.getItem('kw_game') || '{}');
  const totalQuestions = storedGame.total_questions || 5;

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submittedCount, setSubmittedCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [allReady, setAllReady] = useState(false);
  const [players, setPlayers] = useState([]);
  const [countdown, setCountdown] = useState(null);

  const [wrong1, setWrong1] = useState('');
  const [wrong2, setWrong2] = useState('');
  const [wrong3, setWrong3] = useState('');
  const [form, setForm] = useState({
    question_type: defaultQuestionType,
    movie: '', hero: '', heroine: '', song: '',
    clue_1: '', clue_2: '', clue_3: '',
    image_url: '', option_a: '', option_b: '', option_c: '', option_d: ''
  });

  useEffect(() => {
    if (!userId || !gameCode) return;

    if (!socket.connected) socket.connect();

    socket.emit('join_game_room', { game_code: gameCode, user_id: userId });

    const handleGameState = (data) => {
      if (data) {
        if (data.game) {
          sessionStorage.setItem('kw_game', JSON.stringify(data.game));
        }
        if (data.players) {
          setPlayers(data.players);
          setTotalPlayers(data.players.length);
        }
        if (data.submitted_count !== undefined) {
          setSubmittedCount(data.submitted_count);
        }
      }
    };

    const handleSubmissionUpdate = (data) => {
      if (data) {
        if (data.players) setPlayers(data.players);
        if (data.submitted_count !== undefined) setSubmittedCount(data.submitted_count);
        if (data.total !== undefined) setTotalPlayers(data.total);
        if (data.all_ready !== undefined) setAllReady(data.all_ready);
      }
    };

    const handleGameStarted = () => {
      navigate(`/game/${gameCode}`);
    };

    socket.on('game_state', handleGameState);
    socket.on('submission_update', handleSubmissionUpdate);
    socket.on('game_started', handleGameStarted);

    return () => {
      socket.off('game_state', handleGameState);
      socket.off('submission_update', handleSubmissionUpdate);
      socket.off('game_started', handleGameStarted);
    };
  }, [gameCode, userId, navigate]);

  const handleChange = (field) => (e) => {
    const val = e.target.value;
    setForm(f => ({ ...f, [field]: val }));
  };

  const handleQuickFill = () => {
    if (form.question_type === 'picture_games') {
      const pick = SAMPLE_PICTURE_QUESTIONS[Math.floor(Math.random() * SAMPLE_PICTURE_QUESTIONS.length)];
      setForm({
        ...form,
        question_type: 'picture_games',
        image_url: pick.image_url,
        movie: pick.movie,
      });
      setWrong1(pick.option_b || 'Master');
      setWrong2(pick.option_c || 'Leo');
      setWrong3(pick.option_d || 'Jailer');
    } else {
      const pick = SAMPLE_QUESTIONS[Math.floor(Math.random() * SAMPLE_QUESTIONS.length)];
      setForm({ ...pick, question_type: form.question_type });
    }
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { question_type, movie, hero, heroine, song, clue_1, clue_2, clue_3, image_url } = form;
    
    if (question_type === 'movie_dialogues') {
      if (!movie || !hero || !heroine || !song || !clue_1 || !clue_2 || !clue_3) {
        setError('All fields are required for Movie Dialogues!');
        return;
      }
    } else if (question_type === 'picture_games') {
      if (!image_url || !movie || !wrong1 || !wrong2 || !wrong3) {
        setError('Image URL, Correct Movie Answer, and 3 Wrong Choices are required!');
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
      const payload = {
        ...form,
        user_id: userId,
      };

      if (question_type === 'picture_games') {
        payload.option_a = wrong1;
        payload.option_b = wrong2;
        payload.option_c = wrong3;
        payload.option_d = movie; // backend will shuffle options A, B, C, D automatically
      }
      
      const res = await submitQuestion(gameCode, payload);
      const newCount = res.data?.submitted_count || (submittedCount + 1);
      setSubmittedCount(newCount);
      
      if (newCount >= totalQuestions) {
        setAllReady(true);
        setSubmitted(true);
      }

      setSuccessMsg(`✅ Question ${newCount} of ${totalQuestions} created successfully!`);
      socket.emit('question_submitted', { game_code: gameCode, user_id: userId });

      // Reset form for next question
      setForm({
        question_type: form.question_type,
        movie: '', hero: '', heroine: '', song: '',
        clue_1: '', clue_2: '', clue_3: '',
        image_url: '', option_a: '', option_b: '', option_c: '', option_d: ''
      });
      setWrong1('');
      setWrong2('');
      setWrong3('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit question. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = () => {
    socket.emit('start_game', { game_code: gameCode, user_id: userId });
  };

  // Fallback Error UI when session is invalid
  if (!userId || !gameCode) {
    return (
      <div className="submit-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px', textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '30px' }}>
          <h2 style={{ color: 'var(--color-gold)', marginBottom: '16px' }}>⚠️ Unable to Load Question Submission</h2>
          <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
            Your player session was not found or the game ID is invalid. Please join or create a game session first.
          </p>
          <button className="btn btn-gold" onClick={() => navigate('/')}>
            ← Return to Home
          </button>
        </div>
      </div>
    );
  }

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
                      {form.question_type === 'picture_games' ? (
                        <>
                          <div className="form-group">
                            <label className="form-label" htmlFor="q-image">🖼 Image URL</label>
                            <input
                              id="q-image"
                              className="form-input"
                              placeholder="Paste movie poster or scene image URL (e.g. https://...)"
                              value={form.image_url}
                              onChange={handleChange('image_url')}
                            />
                            {form.image_url && (
                              <div style={{ marginTop: '8px', textAlign: 'center', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(251,191,36,0.3)', maxHeight: '180px' }}>
                                <img
                                  src={form.image_url}
                                  alt="Preview"
                                  style={{ maxWidth: '100%', maxHeight: '180px', objectFit: 'cover' }}
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              </div>
                            )}
                          </div>

                          <div className="form-group">
                            <label className="form-label" htmlFor="q-correct-movie">🎬 Correct Movie Answer</label>
                            <input
                              id="q-correct-movie"
                              className="form-input"
                              placeholder="Enter the correct movie name (e.g. Vikram)"
                              value={form.movie}
                              onChange={handleChange('movie')}
                            />
                          </div>

                          <div className="form-group" style={{ marginBottom: '12px' }}>
                            <label className="form-label">🎯 Three Wrong Movie Choices</label>
                            <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '10px' }}>
                              Enter 3 incorrect options. The backend will automatically randomize the positions of choices A, B, C, and D.
                            </p>
                          </div>

                          <div className="form-group" style={{ marginBottom: '10px' }}>
                            <label className="form-label" htmlFor="wrong-1">❌ Wrong Choice 1</label>
                            <input
                              id="wrong-1"
                              className="form-input"
                              placeholder="Enter wrong choice 1"
                              value={wrong1}
                              onChange={e => setWrong1(e.target.value)}
                            />
                          </div>

                          <div className="form-group" style={{ marginBottom: '10px' }}>
                            <label className="form-label" htmlFor="wrong-2">❌ Wrong Choice 2</label>
                            <input
                              id="wrong-2"
                              className="form-input"
                              placeholder="Enter wrong choice 2"
                              value={wrong2}
                              onChange={e => setWrong2(e.target.value)}
                            />
                          </div>

                          <div className="form-group" style={{ marginBottom: '10px' }}>
                            <label className="form-label" htmlFor="wrong-3">❌ Wrong Choice 3</label>
                            <input
                              id="wrong-3"
                              className="form-input"
                              placeholder="Enter wrong choice 3"
                              value={wrong3}
                              onChange={e => setWrong3(e.target.value)}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="form-group">
                          <label className="form-label" htmlFor="q-movie">🎬 Movie Name (Answer)</label>
                          <input id="q-movie" className="form-input" placeholder="Enter movie name" value={form.movie} onChange={handleChange('movie')} autoFocus />
                        </div>
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
                        <div className="form-group" style={{ marginTop: '10px' }}>
                          <p style={{ color: '#888' }}>For Songs / BGM, you can just fill in the movie name and clues. The Host will play the audio during the game using their Sounds Dashboard!</p>
                        </div>
                      )}

                      {/* First letters preview */}
                      {form.question_type !== 'picture_games' && (
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
                      )}
                    </div>

                    {/* Clues */}
                    {form.question_type !== 'picture_games' && (
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
                    )}
                  </div>

                  {successMsg && (
                    <div className="submit-success-banner animate-fadeIn" style={{ margin: '15px 0', padding: '12px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.4)', borderRadius: '8px', color: '#4ade80', fontSize: '0.95rem' }}>
                      {successMsg}
                    </div>
                  )}

                  {error && <p className="submit-error animate-shake">{error}</p>}

                  <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    <button
                      className="btn btn-gold btn-lg submit-btn"
                      type="submit"
                      id="btn-submit-question"
                      disabled={loading || submittedCount >= totalQuestions}
                      style={{ flex: 1 }}
                    >
                      {loading ? '⏳ Submitting…' : (submittedCount >= totalQuestions ? '✅ ALL QUESTIONS CREATED' : `➕ SAVE & ADD QUESTION (${submittedCount + 1}/${totalQuestions})`)}
                    </button>
                    
                    <button
                      className="btn btn-outline btn-lg"
                      type="button"
                      onClick={() => navigate(`/room/${gameCode}`)}
                      style={{ flex: '0 0 auto' }}
                    >
                      ← Lobby
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Sidebar: Question Progress */}
          <div className="submit-sidebar">
            <div className="card animate-slideInRight">
              <h2 className="submit-progress__title">Questions Created</h2>
              <div className="submit-progress__count">
                <span className="submit-progress__num">{submittedCount}</span>
                <span className="submit-progress__sep">/</span>
                <span className="submit-progress__total">{totalQuestions}</span>
              </div>

              <div className="submit-progress-bar">
                <div
                  className="submit-progress-bar__fill"
                  style={{ width: totalQuestions ? `${Math.min(100, (submittedCount / totalQuestions) * 100)}%` : '0%' }}
                />
              </div>

              {submittedCount >= totalQuestions && (
                <div className="submit-all-ready animate-scaleIn">
                  ✅ TARGET QUESTIONS REACHED!
                </div>
              )}

              {isHost && (
                <button
                  className="btn btn-gold btn-lg submit-start-btn animate-pulseGlow"
                  id="btn-start-game-sidebar"
                  onClick={handleStartGame}
                  disabled={submittedCount < 1}
                  style={{ marginTop: '16px', width: '100%' }}
                >
                  🎬 START GAME NOW {submittedCount < 1 ? '(Add 1+ Q)' : ''}
                </button>
              )}

              <div className="submit-player-list" style={{ marginTop: '20px' }}>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '8px' }}>Joined Players ({players.length})</p>
                {players.map(p => (
                  <div key={p.user_id} className="submit-player-row">
                    <span>{getAvatarEmoji(p.avatar_id)}</span>
                    <span className="submit-player-row__name">{p.name}</span>
                    <span>{p.is_connected ? '🟢' : '⚪'}</span>
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
