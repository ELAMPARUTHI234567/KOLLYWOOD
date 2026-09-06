"""REST API routes for game management."""
import random
import string
from flask import Blueprint, request, jsonify
from extensions import db
from models import User, Game, GamePlayer, Question
from services.game_service import get_first_letter, get_players_with_scores

game_bp = Blueprint('game', __name__, url_prefix='/api')


@game_bp.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'message': 'KOLLOYWOOD backend is running!'})



def generate_game_code():
    """Generate unique 7-character game code like KOL1234."""
    for _ in range(30):
        code = 'KOL' + ''.join(random.choices(string.digits, k=4))
        try:
            existing = Game.query.filter_by(game_code=code).first()
            if not existing:
                return code
        except Exception:
            return code
    return 'KOL' + ''.join(random.choices(string.digits, k=4))


@game_bp.route('/create-game', methods=['POST'])
def create_game():
    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    avatar_id = (data.get('avatar_id') or '').strip()
    try:
        max_players = int(data.get('max_players', 30))
        points_per_question = int(data.get('points_per_question', 100))
        question_time = int(data.get('question_time', 120))
        clue_interval = 30  # Fixed 30s clue timeline (0s: no clues, 30s: clue 1, 60s: clue 2, 90s: clue 3)
        question_gap = int(data.get('question_gap', 10))
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid numerical settings provided'}), 400

    if not name or not avatar_id:
        return jsonify({'error': 'Name and avatar are required'}), 400
    if max_players < 2 or max_players > 30:
        return jsonify({'error': 'Max players must be between 2 and 30'}), 400

    try:
        # Create user
        user = User(name=name, avatar_id=avatar_id)
        db.session.add(user)
        db.session.flush()

        # Create game
        game_code = generate_game_code()
        game = Game(
            game_code=game_code,
            host_id=user.id,
            max_players=max_players,
            points_per_question=points_per_question,
            question_time=question_time,
            clue_interval=clue_interval,
            question_gap=question_gap,
            status='LOBBY',
        )
        db.session.add(game)
        db.session.flush()

        # Add host as first player
        gp = GamePlayer(
            game_id=game.id,
            user_id=user.id,
            player_order=1,
        )
        db.session.add(gp)
        db.session.commit()

        return jsonify({
            'success': True,
            'game_code': game_code,
            'game_id': game.id,
            'user_id': user.id,
            'user': user.to_dict(),
            'game': game.to_dict(),
        }), 201
    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] create_game failed: {e}")
        return jsonify({'error': f'Database error creating game: {str(e)}'}), 500


@game_bp.route('/join-game', methods=['POST'])
def join_game():
    data = request.get_json(silent=True) or {}
    game_code = (data.get('game_code') or '').strip().upper()
    name = (data.get('name') or '').strip()
    avatar_id = (data.get('avatar_id') or '').strip()

    if not game_code or not name or not avatar_id:
        return jsonify({'error': 'Game code, name, and avatar are required'}), 400

    try:
        game = Game.query.filter_by(game_code=game_code).first()
        if not game:
            return jsonify({'error': 'Game not found. Check the Game ID.'}), 404

        if game.status != 'LOBBY':
            return jsonify({'error': 'This game has already started.'}), 400

        player_count = GamePlayer.query.filter_by(game_id=game.id).count()
        if player_count >= game.max_players:
            return jsonify({'error': 'Game room is full.'}), 400

        # Check name uniqueness
        existing_names = (
            db.session.query(User.name)
            .join(GamePlayer, GamePlayer.user_id == User.id)
            .filter(GamePlayer.game_id == game.id)
            .all()
        )
        taken_names = [n[0].lower() for n in existing_names]
        if name.lower() in taken_names:
            return jsonify({'error': 'This name is already taken in this room.'}), 400

        # Create user
        user = User(name=name, avatar_id=avatar_id)
        db.session.add(user)
        db.session.flush()

        # Add player
        gp = GamePlayer(
            game_id=game.id,
            user_id=user.id,
            player_order=player_count + 1,
        )
        db.session.add(gp)
        db.session.commit()

        return jsonify({
            'success': True,
            'game_code': game_code,
            'game_id': game.id,
            'user_id': user.id,
            'user': user.to_dict(),
            'game': game.to_dict(),
        }), 200
    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] join_game failed: {e}")
        return jsonify({'error': f'Database error joining game: {str(e)}'}), 500


@game_bp.route('/game/<game_code>', methods=['GET'])
def get_game(game_code):
    game = Game.query.filter_by(game_code=game_code.upper()).first()
    if not game:
        return jsonify({'error': 'Game not found'}), 404

    players = get_players_with_scores(game.id)
    return jsonify({
        'game': game.to_dict(),
        'players': players,
        'player_count': len(players),
    })


@game_bp.route('/game/<game_code>/submit-question', methods=['POST'])
def submit_question(game_code):
    data = request.get_json(silent=True) or {}
    user_id = data.get('user_id')
    movie = (data.get('movie') or '').strip()
    hero = (data.get('hero') or '').strip()
    heroine = (data.get('heroine') or '').strip()
    song = (data.get('song') or '').strip()
    clue_1 = (data.get('clue_1') or '').strip()
    clue_2 = (data.get('clue_2') or '').strip()
    clue_3 = (data.get('clue_3') or '').strip()

    if not all([movie, hero, heroine, song, clue_1, clue_2, clue_3]):
        return jsonify({'error': 'All fields are required'}), 400

    try:
        game = Game.query.filter_by(game_code=game_code.upper()).first()
        if not game:
            return jsonify({'error': 'Game not found'}), 404

        if game.status != 'QUESTION_SUBMISSION':
            return jsonify({'error': 'Game is not in question submission phase'}), 400

        gp = GamePlayer.query.filter_by(game_id=game.id, user_id=user_id).first()
        if not gp:
            return jsonify({'error': 'Player not found in this game'}), 404

        if gp.has_submitted_question:
            return jsonify({'error': 'You have already submitted your question'}), 400

        # Create question
        q = Question(
            game_id=game.id,
            creator_id=user_id,
            question_order=gp.player_order,
            movie_answer=movie,
            movie_first_letter=get_first_letter(movie),
            hero=hero,
            hero_first_letter=get_first_letter(hero),
            heroine=heroine,
            heroine_first_letter=get_first_letter(heroine),
            song=song,
            song_first_letter=get_first_letter(song),
            clue_1=clue_1,
            clue_2=clue_2,
            clue_3=clue_3,
        )
        db.session.add(q)
        gp.has_submitted_question = True
        db.session.commit()

        # Broadcast submission progress to all players immediately
        submitted_count = GamePlayer.query.filter_by(game_id=game.id, has_submitted_question=True).count()
        total = GamePlayer.query.filter_by(game_id=game.id).count()
        all_ready = (submitted_count == total)

        if all_ready and game.status == 'QUESTION_SUBMISSION':
            game.status = 'READY'
            db.session.commit()

        from extensions import socketio
        players = get_players_with_scores(game.id)
        socketio.emit('submission_update', {
            'submitted_count': submitted_count,
            'total': total,
            'all_ready': all_ready,
            'players': players,
            'user_id': user_id,
        }, room=game.game_code)

        return jsonify({'success': True, 'message': 'Question submitted successfully', 'all_ready': all_ready})
    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] submit_question failed: {e}")
        return jsonify({'error': f'Database error submitting question: {str(e)}'}), 500


@game_bp.route('/game/<game_code>/leaderboard', methods=['GET'])
def get_leaderboard(game_code):
    game = Game.query.filter_by(game_code=game_code.upper()).first()
    if not game:
        return jsonify({'error': 'Game not found'}), 404
    players = get_players_with_scores(game.id)
    return jsonify({'leaderboard': players})
