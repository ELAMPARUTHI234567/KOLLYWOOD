from extensions import db
from datetime import datetime

class GamePlayer(db.Model):
    __tablename__ = 'game_players'
    
    id = db.Column(db.Integer, primary_key=True)
    game_id = db.Column(db.Integer, db.ForeignKey('games.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    player_order = db.Column(db.Integer, nullable=False, default=0)
    score = db.Column(db.Integer, nullable=False, default=0)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    socket_id = db.Column(db.String(100), nullable=True)
    has_submitted_question = db.Column(db.Boolean, default=False)
    is_connected = db.Column(db.Boolean, default=True)
    
    # Relationships
    game = db.relationship('Game', back_populates='players')
    user = db.relationship('User', back_populates='game_players')
    
    __table_args__ = (
        db.UniqueConstraint('game_id', 'user_id', name='unique_player_game'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'game_id': self.game_id,
            'user_id': self.user_id,
            'player_order': self.player_order,
            'score': self.score,
            'has_submitted_question': self.has_submitted_question,
            'is_connected': self.is_connected,
            'user': self.user.to_dict() if self.user else None,
        }
