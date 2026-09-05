"""
Socket.IO event handlers for real-time game communication.
"""
import threading
import time
from datetime import datetime

from flask import request
from flask_socketio import join_room, leave_room, emit

from extensions import db, socketio
from models import Game, GamePlayer, Question, Guess, ChatMessage, User
from services.game_service import (
    get_players_with_scores,
    get_first_letter,
    calculate_score,
    start_question_timer,
    get_question_elapsed,
    get_clue_state,
    _do_answer_reveal,
    advance_to_next_question,
)

# Map socket_id -> {user_id, game_code}
_socket_sessions = {}


def register_socket_events(app):
    """Register all Socket.IO event handlers."""

    @socketio.on('connect')
    def on_connect():
        print(f'Client connected: {request.sid}')

    @socketio.on('disconnect')
    def on_disconnect():
        sid = request.sid
        session = _socket_sessions.pop(sid, None)
        if not session:
            return
        user_id = session.get('user_id')
        game_code = session.get('game_code')
        if not user_id or not game_code:
            return

        with app.app_context():
            game = Game.query.filter_by(game_code=game_code).first()
            if not game:
                return
            gp = GamePlayer.query.filter_by(game_id=game.id, user_id=user_id).first()
            if gp:
                gp.is_connected = False
                db.session.commit()

            players = get_players_with_scores(game.id)
            socketio.emit('player_left', {
                'user_id': user_id,
                'players': players,
                'player_count': len(players),
            }, room=game_code)

    @socketio.on('join_game_room')
    def on_join_game_room(data):
        """Player joins the Socket.IO room for a game."""
        game_code = data.get('game_code', '').upper()
        user_id = data.get('user_id')
        sid = request.sid

        with app.app_context():
            game = Game.query.filter_by(game_code=game_code).first()
            if not game:
                emit('error', {'message': 'Game not found'})
                return

            gp = GamePlayer.query.filter_by(game_id=game.id, user_id=user_id).first()
            if not gp:
                emit('error', {'message': 'You are not in this game'})
                return

            # Update socket id and connection status
            gp.socket_id = sid
            gp.is_connected = True
            db.session.commit()

            join_room(game_code)
            _socket_sessions[sid] = {'user_id': user_id, 'game_code': game_code}

            players = get_players_with_scores(game.id)
            payload = {
                'game': game.to_dict(),
                'players': players,
                'player_count': len(players),
                'is_host': game.host_id == user_id,
            }

            if game.status in ('GAME_START', 'QUESTION_ACTIVE', 'CLUE_1', 'CLUE_2', 'CLUE_3', 'ANSWER_REVEAL', 'ROUND_RESULT'):
                q = Question.query.filter_by(game_id=game.id, question_order=game.current_question).first()
                clue_state = get_clue_state(game.id)
                has_guessed = False
                if q:
                    has_guessed = Guess.query.filter_by(question_id=q.id, player_id=user_id, is_correct=True).first() is not None
                    payload['question'] = q.to_reveal_dict() if game.status in ('ANSWER_REVEAL', 'ROUND_RESULT') else q.to_safe_dict(clue_state)
                    payload['creator'] = q.creator.to_dict() if q.creator else None
                payload['clues_revealed'] = clue_state
                payload['has_guessed_correctly'] = has_guessed
                payload['question_number'] = game.current_question
                payload['total_questions'] = game.total_questions

            # Emit to the joining player their full game state
            emit('game_state', payload)

            # Notify others
            socketio.emit('player_joined', {
                'user_id': user_id,
                'players': players,
                'player_count': len(players),
            }, room=game_code)

    @socketio.on('start_question_setup')
    def on_start_question_setup(data):
        """Host starts question submission phase."""
        game_code = data.get('game_code', '').upper()
        user_id = data.get('user_id')

        with app.app_context():
            game = Game.query.filter_by(game_code=game_code).first()
            if not game:
                emit('error', {'message': 'Game not found'})
                return
            if game.host_id != user_id:
                emit('error', {'message': 'Only host can start question setup'})
                return
            if game.status != 'LOBBY':
                emit('error', {'message': 'Game is not in lobby state'})
                return

            player_count = GamePlayer.query.filter_by(game_id=game.id).count()
            if player_count < 2:
                emit('error', {'message': 'Need at least 2 players to start'})
                return

            game.status = 'QUESTION_SUBMISSION'
            game.total_questions = player_count
            db.session.commit()

            players = get_players_with_scores(game.id)
            socketio.emit('question_submission_started', {
                'game': game.to_dict(),
                'players': players,
                'total_questions': player_count,
            }, room=game_code)

    @socketio.on('question_submitted')
    def on_question_submitted(data):
        """Notify room when a player submits their question (via Socket.IO)."""
        game_code = data.get('game_code', '').upper()
        user_id = data.get('user_id')

        with app.app_context():
            game = Game.query.filter_by(game_code=game_code).first()
            if not game:
                return

            submitted_count = GamePlayer.query.filter_by(
                game_id=game.id, has_submitted_question=True
            ).count()
            total = GamePlayer.query.filter_by(game_id=game.id).count()
            all_ready = submitted_count == total

            if all_ready and game.status == 'QUESTION_SUBMISSION':
                game.status = 'READY'
                db.session.commit()

            players = get_players_with_scores(game.id)
            socketio.emit('submission_update', {
                'submitted_count': submitted_count,
                'total': total,
                'all_ready': all_ready,
                'players': players,
                'user_id': user_id,
            }, room=game_code)

    @socketio.on('start_game')
    def on_start_game(data):
        """Host starts the game."""
        game_code = data.get('game_code', '').upper()
        user_id = data.get('user_id')

        with app.app_context():
            game = Game.query.filter_by(game_code=game_code).first()
            if not game:
                emit('error', {'message': 'Game not found'})
                return
            if game.host_id != user_id:
                emit('error', {'message': 'Only host can start the game'})
                return
            if game.status != 'READY':
                emit('error', {'message': 'Not all players have submitted questions'})
                return

            # Get first question
            game.status = 'GAME_START'
            game.current_question = 1
            db.session.commit()

            q = Question.query.filter_by(game_id=game.id, question_order=1).first()
            creator_info = q.creator.to_dict() if q and q.creator else None

            socketio.emit('game_started', {
                'game': game.to_dict(),
                'question_number': 1,
                'total_questions': game.total_questions,
                'creator': creator_info,
            }, room=game_code)

            game_id = game.id
            game_code_val = game_code
            creator_info = q.creator.to_dict() if q and q.creator else None

            # Short delay then activate question 1
            def activate_q1(g_id, g_code, c_info):
                time.sleep(3)
                with app.app_context():
                    g = Game.query.get(g_id)
                    if not g:
                        return
                    g.status = 'QUESTION_ACTIVE'
                    db.session.commit()
                    q = Question.query.filter_by(game_id=g_id, question_order=1).first()
                    socketio.emit('question_active', {
                        'question_number': 1,
                        'total_questions': g.total_questions,
                        'creator': c_info,
                        'question': q.to_safe_dict(0) if q else None,
                        'server_time': datetime.utcnow().isoformat(),
                    }, room=g_code)
                    start_question_timer(app, g_id)

            t = threading.Thread(target=activate_q1, args=(game_id, game_code_val, creator_info), daemon=True)
            t.start()

    @socketio.on('player_guess')
    def on_player_guess(data):
        """Handle a player's movie guess."""
        game_code = data.get('game_code', '').upper()
        user_id = data.get('user_id')
        guess_text = (data.get('guess') or '').strip()

        if not guess_text:
            return

        with app.app_context():
            game = Game.query.filter_by(game_code=game_code).first()
            if not game:
                return
            if game.status not in ('QUESTION_ACTIVE', 'CLUE_1', 'CLUE_2', 'CLUE_3'):
                emit('error', {'message': 'Not accepting guesses right now'})
                return

            # Get current question
            q = Question.query.filter_by(
                game_id=game.id,
                question_order=game.current_question
            ).first()
            if not q:
                return

            # Creator cannot guess their own question
            if q.creator_id == user_id:
                emit('error', {'message': 'You cannot guess your own question'})
                return

            # Check player hasn't already guessed correctly
            existing_correct = Guess.query.filter_by(
                question_id=q.id,
                player_id=user_id,
                is_correct=True
            ).first()
            if existing_correct:
                emit('error', {'message': 'You already answered correctly!'})
                return

            # Get player info
            gp = GamePlayer.query.filter_by(game_id=game.id, user_id=user_id).first()
            user = User.query.get(user_id)
            if not user or not gp:
                return

            # Calculate elapsed time
            elapsed = get_question_elapsed(game.id)
            is_correct = guess_text.lower().strip() == q.movie_answer.lower().strip()

            points = 0
            if is_correct:
                points = calculate_score(game.points_per_question, elapsed, game.question_time)

            # Save guess
            guess_obj = Guess(
                question_id=q.id,
                player_id=user_id,
                game_id=game.id,
                guess_text=guess_text,
                is_correct=is_correct,
                response_time_seconds=elapsed,
                points_awarded=points,
            )
            db.session.add(guess_obj)

            if is_correct:
                gp.score += points

            # Save chat message
            msg_type = 'guess_correct' if is_correct else 'guess_incorrect'
            chat_msg = ChatMessage(
                game_id=game.id,
                player_id=user_id,
                message=guess_text,
                message_type=msg_type,
            )
            db.session.add(chat_msg)
            db.session.commit()

            player_info = {
                'user_id': user_id,
                'name': user.name,
                'avatar_id': user.avatar_id,
            }

            if is_correct:
                # Broadcast correct answer event (no movie name revealed)
                socketio.emit('guess_correct', {
                    'player': player_info,
                    'points': points,
                    'elapsed': elapsed,
                }, room=game_code)

                # Update leaderboard
                leaderboard = get_players_with_scores(game.id)
                socketio.emit('leaderboard_update', {
                    'leaderboard': leaderboard,
                }, room=game_code)

                # Check if ALL guessers have answered correctly
                total_players = GamePlayer.query.filter_by(game_id=game.id).count()
                # Creator can't guess, so max possible correct = total_players - 1
                correct_count = Guess.query.filter_by(
                    question_id=q.id, is_correct=True
                ).count()
                max_guessers = total_players - 1

                if correct_count >= max_guessers and max_guessers > 0:
                    # All guessers answered correctly — end question early
                    _do_answer_reveal(app, game.id)
            else:
                # Broadcast incorrect guess to all
                socketio.emit('guess_incorrect', {
                    'player': player_info,
                    'guess': guess_text,
                }, room=game_code)

    @socketio.on('request_leaderboard')
    def on_request_leaderboard(data):
        game_code = data.get('game_code', '').upper()
        with app.app_context():
            game = Game.query.filter_by(game_code=game_code).first()
            if game:
                leaderboard = get_players_with_scores(game.id)
                emit('leaderboard_update', {'leaderboard': leaderboard})

    @socketio.on('play_again')
    def on_play_again(data):
        """Host requests a new game (resets or creates new)."""
        game_code = data.get('game_code', '').upper()
        user_id = data.get('user_id')
        with app.app_context():
            game = Game.query.filter_by(game_code=game_code).first()
            if not game or game.host_id != user_id:
                emit('error', {'message': 'Only host can restart'})
                return
            # Notify all players to return to lobby/home
            socketio.emit('redirect_to_home', {}, room=game_code)
