from extensions import db
from datetime import datetime

class Guess(db.Model):
    __tablename__ = 'guesses'
    
    id = db.Column(db.Integer, primary_key=True)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id'), nullable=False)
    player_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    game_id = db.Column(db.Integer, db.ForeignKey('games.id'), nullable=False)
    guess_text = db.Column(db.String(100), nullable=False)
    is_correct = db.Column(db.Boolean, nullable=False, default=False)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    response_time_seconds = db.Column(db.Float, nullable=False, default=0)
    points_awarded = db.Column(db.Integer, nullable=False, default=0)
    
    # Relationships
    question = db.relationship('Question', back_populates='guesses')
    player = db.relationship('User', back_populates='guesses')
    game = db.relationship('Game', back_populates='guesses')
    
    def to_dict(self):
        return {
            'id': self.id,
            'question_id': self.question_id,
            'player_id': self.player_id,
            'game_id': self.game_id,
            'guess_text': self.guess_text,
            'is_correct': self.is_correct,
            'response_time_seconds': self.response_time_seconds,
            'points_awarded': self.points_awarded,
            'player': self.player.to_dict() if self.player else None,
        }


class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    game_id = db.Column(db.Integer, db.ForeignKey('games.id'), nullable=False)
    player_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    message = db.Column(db.String(255), nullable=False)
    message_type = db.Column(
        db.Enum('guess_incorrect', 'guess_correct', 'system'),
        nullable=False,
        default='guess_incorrect'
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    player = db.relationship('User')
    
    def to_dict(self):
        return {
            'id': self.id,
            'game_id': self.game_id,
            'player_id': self.player_id,
            'message': self.message,
            'message_type': self.message_type,
            'player': self.player.to_dict() if self.player else None,
        }
