from extensions import db
from datetime import datetime

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    avatar_id = db.Column(db.String(30), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    game_players = db.relationship('GamePlayer', back_populates='user', lazy='dynamic')
    questions = db.relationship('Question', back_populates='creator', lazy='dynamic')
    guesses = db.relationship('Guess', back_populates='player', lazy='dynamic')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'avatar_id': self.avatar_id,
        }
