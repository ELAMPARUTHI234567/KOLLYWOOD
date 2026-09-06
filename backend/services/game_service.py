"""
Game Service — server-side game logic, scoring, and state management.
All timers and state transitions are managed here.
"""
import threading
import time
from datetime import datetime

from extensions import db, socketio
from models import Game, GamePlayer, Question, Guess, ChatMessage, User


# In-memory store for active game timers and question start times
_active_timers = {}   # game_id -> threading.Timer
_question_start_times = {}  # game_id -> datetime
_clue_states = {}  # game_id -> int (0, 1, 2, 3)


def get_first_letter(text: str) -> str:
    """Extract first non-space alphabetic character."""
    for ch in text.strip():
        if ch.isalpha():
            return ch.upper()
    return '?'


def calculate_score(points_per_question: int, elapsed_seconds: float, question_time: int) -> int:
    """Time-based scoring: faster = more points. Divided into 4 tiers."""
    if elapsed_seconds < 0:
        elapsed_seconds = 0
    tier_size = question_time / 4
    if elapsed_seconds < tier_size:
        return points_per_question
    elif elapsed_seconds < tier_size * 2:
        return int(points_per_question * 0.8)
    elif elapsed_seconds < tier_size * 3:
        return int(points_per_question * 0.6)
    else:
        return int(points_per_question * 0.4)


def get_players_with_scores(game_id: int):
    """Return sorted leaderboard for a game."""
    players = (
        db.session.query(GamePlayer, User)
        .join(User, GamePlayer.user_id == User.id)
        .filter(GamePlayer.game_id == game_id)
        .order_by(GamePlayer.score.desc(), GamePlayer.player_order.asc())
        .all()
    )
    result = []
    for gp, user in players:
        result.append({
            'user_id': user.id,
            'name': user.name,
            'avatar_id': user.avatar_id,
            'score': gp.score,
            'player_order': gp.player_order,
            'has_submitted_question': gp.has_submitted_question,
            'is_connected': gp.is_connected,
        })
    return result


def get_player_info(game_id: int, user_id: int):
    """Get a single player's game info."""
    gp = GamePlayer.query.filter_by(game_id=game_id, user_id=user_id).first()
    if gp:
        return gp.to_dict()
    return None


def start_question_timer(app, game_id: int):
    """Launch server-side question timer thread with fixed 0s -> 30s -> 60s -> 90s clue timeline."""
    _cancel_timer(game_id)
    _clue_states[game_id] = 0
    _question_start_times[game_id] = datetime.utcnow()

    with app.app_context():
        game = Game.query.get(game_id)
        if not game:
            return
        question_order = game.current_question
        question_time = game.question_time

    def run_question(app, game_id, question_order, question_time):
        # 0s: question active, no clues
        # 30s: reveal Clue 1
        _schedule_clue(app, game_id, 1, 30, question_order)
        # 60s: reveal Clue 2
        _schedule_clue(app, game_id, 2, 60, question_order)
        # 90s: reveal Clue 3
        _schedule_clue(app, game_id, 3, 90, question_order)
        # Question ends: answer reveal
        _schedule_answer_reveal(app, game_id, question_time, question_order)

    t = threading.Thread(target=run_question, args=(app, game_id, question_order, question_time), daemon=True)
    t.start()


def _schedule_clue(app, game_id: int, clue_num: int, delay: float, question_order: int):
    def reveal():
        time.sleep(delay)
        with app.app_context():
            game = Game.query.get(game_id)
            if not game or game.current_question != question_order:
                return
            if game.status not in ('QUESTION_ACTIVE', 'CLUE_1', 'CLUE_2', 'CLUE_3'):
                return
            status_map = {1: 'CLUE_1', 2: 'CLUE_2', 3: 'CLUE_3'}
            game.status = status_map[clue_num]
            db.session.commit()
            _clue_states[game_id] = clue_num

            # Get the current question
            q = Question.query.filter_by(
                game_id=game_id,
                question_order=question_order
            ).first()
            clue_text = None
            if q:
                if clue_num == 1:
                    clue_text = q.clue_1
                elif clue_num == 2:
                    clue_text = q.clue_2
                elif clue_num == 3:
                    clue_text = q.clue_3

            socketio.emit('clue_revealed', {
                'clue_num': clue_num,
                'clue_text': clue_text,
                'game_status': game.status,
            }, room=game.game_code)
    t = threading.Thread(target=reveal, daemon=True)
    t.start()


def _schedule_answer_reveal(app, game_id: int, delay: float, question_order: int):
    def reveal():
        time.sleep(delay)
        with app.app_context():
            game = Game.query.get(game_id)
            if not game or game.current_question != question_order or game.status == 'ANSWER_REVEAL':
                return
            # Only reveal if question is still active
            if game.status not in ('QUESTION_ACTIVE', 'CLUE_1', 'CLUE_2', 'CLUE_3'):
                return
            _do_answer_reveal(app, game_id)
    t = threading.Thread(target=reveal, daemon=True)
    t.start()


def _do_answer_reveal(app, game_id: int):
    """Trigger answer reveal for current question."""
    game = Game.query.get(game_id)
    if not game:
        return

    game.status = 'ANSWER_REVEAL'
    db.session.commit()

    q = Question.query.filter_by(
        game_id=game_id,
        question_order=game.current_question
    ).first()

    # Get correct guessers for this question
    correct_guesses = []
    if q:
        guesses = (
            Guess.query.filter_by(question_id=q.id, is_correct=True)
            .order_by(Guess.response_time_seconds.asc())
            .all()
        )
        for g in guesses:
            correct_guesses.append({
                'user_id': g.player_id,
                'name': g.player.name,
                'avatar_id': g.player.avatar_id,
                'points': g.points_awarded,
                'response_time': g.response_time_seconds,
            })

    creator_info = None
    if q and q.creator:
        creator_info = q.creator.to_dict()

    socketio.emit('answer_revealed', {
        'question': q.to_reveal_dict() if q else None,
        'correct_guesses': correct_guesses,
        'creator': creator_info,
    }, room=game.game_code)

    # Schedule round result
    def show_round_result():
        time.sleep(3)
        with app.app_context():
            game = Game.query.get(game_id)
            if not game:
                return
            game.status = 'ROUND_RESULT'
            db.session.commit()
            leaderboard = get_players_with_scores(game_id)
            socketio.emit('round_result', {
                'question': q.to_reveal_dict() if q else None,
                'correct_guesses': correct_guesses,
                'leaderboard': leaderboard,
                'question_gap': game.question_gap,
            }, room=game.game_code)
            # Auto-advance after gap
            _schedule_next_question(app, game_id, game.question_gap)

    t = threading.Thread(target=show_round_result, daemon=True)
    t.start()


def _schedule_next_question(app, game_id: int, delay: float):
    def advance():
        time.sleep(delay)
        with app.app_context():
            advance_to_next_question(app, game_id)
    t = threading.Thread(target=advance, daemon=True)
    t.start()


def advance_to_next_question(app, game_id: int):
    """Advance to next question or end game."""
    game = Game.query.get(game_id)
    if not game:
        return

    next_q_order = game.current_question + 1

    if next_q_order > game.total_questions:
        # Game over
        game.status = 'GAME_FINISHED'
        db.session.commit()
        final_leaderboard = get_players_with_scores(game_id)
        winner = final_leaderboard[0] if final_leaderboard else None
        socketio.emit('game_finished', {
            'leaderboard': final_leaderboard,
            'winner': winner,
        }, room=game.game_code)
        return

    game.current_question = next_q_order
    game.status = 'NEXT_QUESTION'
    db.session.commit()

    # Find the question
    q = Question.query.filter_by(game_id=game_id, question_order=next_q_order).first()
    creator_info = None
    if q and q.creator:
        creator_info = q.creator.to_dict()

    socketio.emit('next_question_starting', {
        'question_number': next_q_order,
        'total_questions': game.total_questions,
        'creator': creator_info,
        'question': q.to_safe_dict(0) if q else None,
    }, room=game.game_code)

    # Small delay then activate
    def activate():
        time.sleep(2)
        with app.app_context():
            game = Game.query.get(game_id)
            if not game:
                return
            game.status = 'QUESTION_ACTIVE'
            db.session.commit()
            socketio.emit('question_active', {
                'question_number': next_q_order,
                'total_questions': game.total_questions,
                'creator': creator_info,
                'question': q.to_safe_dict(0) if q else None,
                'server_time': datetime.utcnow().isoformat(),
            }, room=game.game_code)
            start_question_timer(app, game_id)

    t = threading.Thread(target=activate, daemon=True)
    t.start()


def _cancel_timer(game_id: int):
    """Cancel any active timer for a game."""
    if game_id in _active_timers:
        try:
            _active_timers[game_id].cancel()
        except Exception:
            pass
        del _active_timers[game_id]


def get_question_elapsed(game_id: int) -> float:
    """Get seconds elapsed since question started."""
    start = _question_start_times.get(game_id)
    if not start:
        return 0
    return (datetime.utcnow() - start).total_seconds()


def get_clue_state(game_id: int) -> int:
    """Get current clue reveal state (0-3)."""
    return _clue_states.get(game_id, 0)
