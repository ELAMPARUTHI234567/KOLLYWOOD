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
  const guessInputRef = useRef(null);

  const questionTime = game.question_time || 120;

  const elapsedFromServer = serverTime
    ? (Date.now() - new Date(serverTime + 'Z').getTime()) / 1000
    : 0;

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
          {/* Hint Cards */}
          <div className="game-hints">
            <HintCards question={question} />
          </div>

          {/* Clues */}
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
                <button
                  className="btn btn-gold game-guess-btn"
                  type="submit"
                  id="btn-guess"
                  disabled={!canGuess || !guess.trim()}
                >
                  GUESS
                </button>
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

        {/* Right Sidebar */}
        <aside className="game-sidebar">
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
