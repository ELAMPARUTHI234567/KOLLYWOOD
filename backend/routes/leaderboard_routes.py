import sys
import os
from flask import Blueprint, jsonify, request
from sqlalchemy import func, desc

# Ensure backend/ is in sys.path so 'extensions' resolves properly
if os.path.dirname(os.path.dirname(__file__)) not in sys.path:
    sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from extensions import db
from models.user import User
from models.game_player import GamePlayer
from models.guess import Guess
from models.game import Game
from datetime import datetime, timedelta

leaderboard_bp = Blueprint('leaderboard', __name__, url_prefix='/api/leaderboard')

@leaderboard_bp.route('', methods=['GET'])
def get_global_leaderboard():
    time_filter = request.args.get('filter', 'all')
    
    # Base query for all users
    query = db.session.query(
        User,
        func.count(GamePlayer.id.distinct()).label('games_played'),
        func.coalesce(func.sum(GamePlayer.score), 0).label('total_points'),
        func.coalesce(func.max(GamePlayer.score), 0).label('best_score')
    ).outerjoin(GamePlayer, User.id == GamePlayer.user_id)
    
    if time_filter == 'month':
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        query = query.filter(GamePlayer.joined_at >= thirty_days_ago)
    elif time_filter == 'week':
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        query = query.filter(GamePlayer.joined_at >= seven_days_ago)
        
    query = query.group_by(User.id)
    
    # We also need correct answers count. We can do a subquery or secondary query. 
    # Let's just fetch it as part of the query by doing another outer join, but this can cause Cartesian products.
    # A safer way without raw SQL is to fetch the aggregations and correct answers separately and merge, or use subqueries.
    results = query.order_by(desc('total_points')).all()
    
    if not results or (len(results) > 0 and results[0].total_points == 0 and results[0].games_played == 0):
        # We only want to rank users who have actually played (games_played > 0)
        pass

    # Fetch correct answers for all users in one go
    user_ids = [res[0].id for res in results if res[1] > 0]
    correct_counts = {}
    if user_ids:
        guess_query = db.session.query(
            Guess.player_id,
            func.count(Guess.id)
        ).filter(Guess.player_id.in_(user_ids), Guess.is_correct == True).group_by(Guess.player_id).all()
        for pid, count_correct in guess_query:
            correct_counts[pid] = count_correct

    leaderboard = []
    rank = 1
    for user, games_played, total_points, best_score in results:
        if games_played == 0 and total_points == 0:
            continue
            
        leaderboard.append({
            'rank': rank,
            'user_id': user.id,
            'name': user.display_name or user.name,
            'avatar_id': user.avatar_id,
            'total_points': int(total_points),
            'games_played': int(games_played),
            'correct_answers': correct_counts.get(user.id, 0),
            'best_score': int(best_score)
        })
        rank += 1
        
    return jsonify(leaderboard), 200

@leaderboard_bp.route('/<int:user_id>/stats', methods=['GET'])
def get_player_stats(user_id):
    user = User.query.get_or_404(user_id)
    
    games_played = db.session.query(func.count(GamePlayer.id)).filter(GamePlayer.user_id == user_id).scalar() or 0
    total_points = db.session.query(func.sum(GamePlayer.score)).filter(GamePlayer.user_id == user_id).scalar() or 0
    best_score = db.session.query(func.max(GamePlayer.score)).filter(GamePlayer.user_id == user_id).scalar() or 0
    
    correct_answers = db.session.query(func.count(Guess.id)).filter(
        Guess.player_id == user_id, 
        Guess.is_correct == True
    ).scalar() or 0
    
    # Recent games
    recent_games_data = db.session.query(Game, GamePlayer.score).join(
        GamePlayer, Game.id == GamePlayer.game_id
    ).filter(GamePlayer.user_id == user_id).order_by(Game.created_at.desc()).limit(5).all()
    
    recent_games = [{
        'game_code': g.Game.game_code,
        'date': g.Game.created_at.isoformat(),
        'score': g.score,
        'status': g.Game.status
    } for g in recent_games_data]
    
    # Find rank (count users with higher total points)
    # This is an approximation
    users_with_higher_score = db.session.query(GamePlayer.user_id).group_by(
        GamePlayer.user_id
    ).having(func.sum(GamePlayer.score) > total_points).count()
    
    rank = users_with_higher_score + 1 if total_points > 0 or games_played > 0 else "-"
    
    return jsonify({
        'user_id': user.id,
        'name': user.display_name or user.name,
        'avatar_id': user.avatar_id,
        'total_points': int(total_points),
        'games_played': int(games_played),
        'correct_answers': int(correct_answers),
        'best_score': int(best_score),
        'rank': rank,
        'recent_games': recent_games
    }), 200
