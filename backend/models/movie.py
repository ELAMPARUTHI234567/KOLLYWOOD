from extensions import db
from datetime import datetime

class Movie(db.Model):
    __tablename__ = 'movies'
    
    id = db.Column(db.Integer, primary_key=True)
    movie_name = db.Column(db.String(255), nullable=False)
    release_year = db.Column(db.Integer, nullable=False)
    genre = db.Column(db.String(100), nullable=False)
    director = db.Column(db.String(100), nullable=True)
    hero = db.Column(db.String(100), nullable=True)
    heroine = db.Column(db.String(100), nullable=True)
    song = db.Column(db.String(255), nullable=True)
    description = db.Column(db.Text, nullable=True)
    poster_url = db.Column(db.String(500), nullable=True)
    is_sample = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'movie_name': self.movie_name,
            'release_year': self.release_year,
            'genre': self.genre,
            'director': self.director,
            'hero': self.hero,
            'heroine': self.heroine,
            'song': self.song,
            'description': self.description,
            'poster_url': self.poster_url,
            'is_sample': self.is_sample,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
