from extensions import db
from datetime import datetime

class Question(db.Model):
    __tablename__ = 'questions'
    
    id = db.Column(db.Integer, primary_key=True)
    game_id = db.Column(db.Integer, db.ForeignKey('games.id'), nullable=False)
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    question_order = db.Column(db.Integer, nullable=False)
    
    # Full answers (never sent to clients until reveal)
    movie_answer = db.Column(db.String(100), nullable=False)
    hero = db.Column(db.String(100), nullable=False)
    heroine = db.Column(db.String(100), nullable=False)
    song = db.Column(db.String(100), nullable=False)
    
    # First letters (safe to send to clients during game)
    movie_first_letter = db.Column(db.String(1), nullable=False)
    hero_first_letter = db.Column(db.String(1), nullable=False)
    heroine_first_letter = db.Column(db.String(1), nullable=False)
    song_first_letter = db.Column(db.String(1), nullable=False)
    
    # Clues
    clue_1 = db.Column(db.String(255), nullable=False)
    clue_2 = db.Column(db.String(255), nullable=False)
    clue_3 = db.Column(db.String(255), nullable=False)
    image_url = db.Column(db.Text, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    game = db.relationship('Game', back_populates='questions')
    creator = db.relationship('User', back_populates='questions')
    guesses = db.relationship('Guess', back_populates='question', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_safe_dict(self, clues_revealed=0):
        """Safe version for clients - only sends first letters and revealed clues."""
        data = {
            'id': self.id,
            'question_order': self.question_order,
            'creator_id': self.creator_id,
            'movie_first_letter': self.movie_first_letter.upper(),
            'hero_first_letter': self.hero_first_letter.upper(),
            'heroine_first_letter': self.heroine_first_letter.upper(),
            'song_first_letter': self.song_first_letter.upper(),
            'clue_1': self.clue_1 if clues_revealed >= 1 else None,
            'clue_2': self.clue_2 if clues_revealed >= 2 else None,
            'clue_3': self.clue_3 if clues_revealed >= 3 else None,
        }
        return data
    
    def to_reveal_dict(self):
        """Full reveal after question ends."""
        return {
            'id': self.id,
            'question_order': self.question_order,
            'creator_id': self.creator_id,
            'movie_answer': self.movie_answer,
            'hero': self.hero,
            'heroine': self.heroine,
            'song': self.song,
            'movie_first_letter': self.movie_first_letter.upper(),
            'hero_first_letter': self.hero_first_letter.upper(),
            'heroine_first_letter': self.heroine_first_letter.upper(),
            'song_first_letter': self.song_first_letter.upper(),
            'clue_1': self.clue_1,
            'clue_2': self.clue_2,
            'clue_3': self.clue_3,
        }
