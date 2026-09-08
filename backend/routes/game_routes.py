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


@game_bp.route('/db-status', methods=['GET'])
def db_status():
    import os
    import re
    from flask import current_app

    connected = False
    error_msg = None
    try:
        with db.engine.connect() as conn:
            conn.execute(db.text("SELECT 1"))
        connected = True
    except Exception as e:
        error_msg = str(e)

    db_uri = current_app.config.get('SQLALCHEMY_DATABASE_URI', '')
    masked_target = re.sub(r':([^@/?#]+)@', ':****@', db_uri) if db_uri else 'None'
    db_var_debug = {}
    for var_name in ['MYSQL_URL', 'DATABASE_URL', 'MYSQL_PRIVATE_URL', 'MYSQLHOST', 'MYSQLUSER', 'MYSQLPORT', 'MYSQLDATABASE', 'MYSQLPASSWORD']:
        val = os.getenv(var_name)
        if val is not None:
            masked = re.sub(r':([^@/?#]+)@', ':****@', val)
            db_var_debug[var_name] = {
                'len': len(val),
                'preview': masked[:15] + ('...' if len(masked) > 15 else '') if 'PASSWORD' not in var_name else f'[len={len(val)}]',
                'has_at': '@' in val,
                'starts_with_mysql': val.startswith('mysql')
            }
        else:
            db_var_debug[var_name] = None

    detected_keys = [k for k in os.environ.keys() if any(tag in k.upper() for tag in ['SQL', 'DATABASE', 'DB', 'RAILWAY', 'PORT', 'HOST', 'URL'])]
    safe_keys = [k for k in detected_keys if not any(s in k.upper() for s in ['PASS', 'SECRET', 'KEY', 'TOKEN', 'AUTH'])]

    return jsonify({
        'connected': connected,
        'target': masked_target,
        'error': error_msg,
        'detected_keys': sorted(safe_keys),
        'db_var_debug': db_var_debug
    }), 200 if connected else 500



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
        total_questions = int(data.get('total_questions', 5))
        if total_questions < 1 or total_questions > 50:
            total_questions = 5
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
            total_questions=total_questions,
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
    question_type = (data.get('question_type') or 'movie_dialogues').strip()
    image_url = (data.get('image_url') or '').strip()
    option_a = (data.get('option_a') or '').strip()
    option_b = (data.get('option_b') or '').strip()
    option_c = (data.get('option_c') or '').strip()
    option_d = (data.get('option_d') or '').strip()

    if not movie:
        return jsonify({'error': 'Movie answer is required'}), 400

    if question_type == 'movie_dialogues':
        if not all([hero, heroine, song, clue_1, clue_2, clue_3]):
            return jsonify({'error': 'All fields are required for Movie Dialogues'}), 400
    elif question_type == 'picture_games':
        if not image_url:
            return jsonify({'error': 'Image URL is required for Picture Games'}), 400
        if option_a and option_b and option_c and option_d:
            opts = [option_a.strip(), option_b.strip(), option_c.strip(), option_d.strip()]
            if movie.strip().lower() not in [o.lower() for o in opts]:
                return jsonify({'error': 'The correct movie answer must match one of Option A, B, C, or D'}), 400
            all_options = opts
        elif option_a and option_b and option_c:
            all_options = [option_a.strip(), option_b.strip(), option_c.strip(), movie.strip()]
        else:
            return jsonify({'error': 'Options A, B, C, and D (or 3 wrong choices) are required for Picture Games'}), 400
        
        # ALWAYS shuffle so position of correct answer among A/B/C/D is completely randomized
        random.shuffle(all_options)
        option_a, option_b, option_c, option_d = all_options[0], all_options[1], all_options[2], all_options[3]

    try:
        game = Game.query.filter_by(game_code=game_code.upper()).first()
        if not game:
            return jsonify({'error': 'Game not found'}), 404

        if game.status not in ('LOBBY', 'QUESTION_SUBMISSION', 'READY'):
            return jsonify({'error': 'Game is not in question creation phase'}), 400

        if game.host_id != user_id:
            return jsonify({'error': 'Only the host is authorized to create questions for this game'}), 403

        gp = GamePlayer.query.filter_by(game_id=game.id, user_id=user_id).first()
        if not gp:
            return jsonify({'error': 'Player not found in this game'}), 404

        existing_q_count = Question.query.filter_by(game_id=game.id).count()
        q_order = existing_q_count + 1

        # Create question
        q = Question(
            game_id=game.id,
            creator_id=user_id,
            question_order=q_order,
            movie_answer=movie,
            movie_first_letter=get_first_letter(movie),
            hero=hero,
            hero_first_letter=get_first_letter(hero),
            heroine=heroine,
            heroine_first_letter=get_first_letter(heroine),
            song=song,
            song_first_letter=get_first_letter(song) if song else '',
            clue_1=clue_1,
            clue_2=clue_2,
            clue_3=clue_3,
            question_type=question_type,
            image_url=image_url if image_url else None,
            option_a=option_a if option_a else None,
            option_b=option_b if option_b else None,
            option_c=option_c if option_c else None,
            option_d=option_d if option_d else None,
        )
        db.session.add(q)
        gp.has_submitted_question = True

        created_q_count = existing_q_count + 1
        target_total = game.total_questions if game.total_questions > 0 else 5
        all_ready = (created_q_count >= target_total)

        if all_ready:
            game.status = 'READY'
        else:
            game.status = 'QUESTION_SUBMISSION'

        db.session.commit()

        from extensions import socketio
        players = get_players_with_scores(game.id)
        socketio.emit('submission_update', {
            'submitted_count': created_q_count,
            'total': target_total,
            'all_ready': all_ready,
            'players': players,
            'user_id': user_id,
        }, room=game.game_code)

        return jsonify({
            'success': True,
            'message': 'Question submitted successfully',
            'submitted_count': created_q_count,
            'total_questions': target_total,
            'all_ready': all_ready,
        }), 201
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
