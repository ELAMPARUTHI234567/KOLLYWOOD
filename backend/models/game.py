from extensions import db
from datetime import datetime

class Game(db.Model):
    __tablename__ = 'games'
    
    id = db.Column(db.Integer, primary_key=True)
    game_code = db.Column(db.String(10), nullable=False, unique=True)
    host_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    max_players = db.Column(db.Integer, nullable=False, default=30)
    points_per_question = db.Column(db.Integer, nullable=False, default=100)
    question_time = db.Column(db.Integer, nullable=False, default=120)
    clue_interval = db.Column(db.Integer, nullable=False, default=30)
    question_gap = db.Column(db.Integer, nullable=False, default=10)
    status = db.Column(
        db.Enum(
            'LOBBY', 'QUESTION_SUBMISSION', 'READY', 'GAME_START',
            'QUESTION_ACTIVE', 'CLUE_1', 'CLUE_2', 'CLUE_3',
            'ANSWER_REVEAL', 'ROUND_RESULT', 'NEXT_QUESTION', 'GAME_FINISHED'
        ),
        nullable=False,
        default='LOBBY'
    )
    current_question = db.Column(db.Integer, nullable=False, default=0)
    total_questions = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    host = db.relationship('User', foreign_keys=[host_id])
    players = db.relationship('GamePlayer', back_populates='game', lazy='dynamic', cascade='all, delete-orphan')
    questions = db.relationship('Question', back_populates='game', lazy='dynamic', cascade='all, delete-orphan')
    guesses = db.relationship('Guess', back_populates='game', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self, include_host=True):
        data = {
            'id': self.id,
            'game_code': self.game_code,
            'host_id': self.host_id,
            'max_players': self.max_players,
            'points_per_question': self.points_per_question,
            'question_time': self.question_time,
            'clue_interval': self.clue_interval,
            'question_gap': self.question_gap,
            'status': self.status,
            'current_question': self.current_question,
            'total_questions': self.total_questions,
        }
        if include_host and self.host:
            data['host'] = self.host.to_dict()
        return data
