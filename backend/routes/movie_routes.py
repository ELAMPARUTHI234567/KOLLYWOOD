import sys
import os
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

# Ensure backend/ is in sys.path so 'extensions' resolves properly
if os.path.dirname(os.path.dirname(__file__)) not in sys.path:
    sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from extensions import db
from models.movie import Movie

movie_bp = Blueprint('movie', __name__, url_prefix='/api/movies')

@movie_bp.route('', methods=['GET'])
def get_movies():
    movies = Movie.query.order_by(Movie.created_at.desc()).all()
    return jsonify([movie.to_dict() for movie in movies]), 200

@movie_bp.route('', methods=['POST'])
@jwt_required(optional=True)
def add_movie():
    data = request.json
    
    required_fields = ['movie_name', 'release_year', 'genre']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
            
    # Check for duplicate
    existing = Movie.query.filter(
        Movie.movie_name.ilike(data['movie_name']), 
        Movie.release_year == data['release_year']
    ).first()
    
    if existing:
        return jsonify({'error': 'Movie already exists'}), 409
        
    movie = Movie(
        movie_name=data['movie_name'],
        release_year=data['release_year'],
        genre=data['genre'],
        director=data.get('director'),
        hero=data.get('hero'),
        heroine=data.get('heroine'),
        song=data.get('song'),
        description=data.get('description'),
        poster_url=data.get('poster_url'),
        is_sample=data.get('is_sample', False)
    )
    
    db.session.add(movie)
    db.session.commit()
    
    return jsonify(movie.to_dict()), 201

@movie_bp.route('/<int:movie_id>', methods=['PUT'])
@jwt_required(optional=True)
def update_movie(movie_id):
    movie = Movie.query.get_or_404(movie_id)
    data = request.json
    
    if 'movie_name' in data: movie.movie_name = data['movie_name']
    if 'release_year' in data: movie.release_year = data['release_year']
    if 'genre' in data: movie.genre = data['genre']
    if 'director' in data: movie.director = data['director']
    if 'hero' in data: movie.hero = data['hero']
    if 'heroine' in data: movie.heroine = data['heroine']
    if 'song' in data: movie.song = data['song']
    if 'description' in data: movie.description = data['description']
    if 'poster_url' in data: movie.poster_url = data['poster_url']
    if 'is_sample' in data: movie.is_sample = data['is_sample']
    
    db.session.commit()
    return jsonify(movie.to_dict()), 200

@movie_bp.route('/<int:movie_id>', methods=['DELETE'])
@jwt_required(optional=True)
def delete_movie(movie_id):
    movie = Movie.query.get_or_404(movie_id)
    db.session.delete(movie)
    db.session.commit()
    return jsonify({'message': 'Movie deleted'}), 200

@movie_bp.route('/quick-sample', methods=['POST'])
@jwt_required(optional=True)
def add_quick_samples():
    samples = [
        {
            "movie_name": "Vikram",
            "release_year": 2022,
            "genre": "Action/Thriller",
            "director": "Lokesh Kanagaraj",
            "hero": "Kamal Haasan",
            "heroine": "Various",
            "song": "Pathala Pathala",
            "description": "A high-octane action film.",
            "is_sample": True
        },
        {
            "movie_name": "Mankatha",
            "release_year": 2011,
            "genre": "Action/Heist",
            "director": "Venkat Prabhu",
            "hero": "Ajith Kumar",
            "heroine": "Trisha",
            "song": "Vilayadu Mankatha",
            "description": "A heist thriller.",
            "is_sample": True
        },
        {
            "movie_name": "Jailer",
            "release_year": 2023,
            "genre": "Action/Drama",
            "director": "Nelson",
            "hero": "Rajinikanth",
            "heroine": "Ramya Krishnan",
            "song": "Kaavaalaa",
            "description": "A retired jailer goes on a manhunt.",
            "is_sample": True
        },
        {
            "movie_name": "Ghilli",
            "release_year": 2004,
            "genre": "Action/Sports",
            "director": "Dharani",
            "hero": "Vijay",
            "heroine": "Trisha",
            "song": "Appadi Podu",
            "description": "A state-level kabaddi player saves a girl.",
            "is_sample": True
        },
        {
            "movie_name": "Baashha",
            "release_year": 1995,
            "genre": "Action",
            "director": "Suresh Krishna",
            "hero": "Rajinikanth",
            "heroine": "Nagma",
            "song": "Style Style Thaan",
            "description": "An auto driver has a dark past.",
            "is_sample": True
        },
        {
            "movie_name": "Leo",
            "release_year": 2023,
            "genre": "Action/Thriller",
            "director": "Lokesh Kanagaraj",
            "hero": "Vijay",
            "heroine": "Trisha",
            "song": "Naa Ready",
            "description": "A cafe owner gets caught up in a drug cartel.",
            "is_sample": True
        }
    ]
    
    added_count = 0
    for sample in samples:
        existing = Movie.query.filter(
            Movie.movie_name.ilike(sample['movie_name']),
            Movie.release_year == sample['release_year']
        ).first()
        
        if not existing:
            movie = Movie(**sample)
            db.session.add(movie)
            added_count += 1
            
    db.session.commit()
    return jsonify({'message': f'Added {added_count} sample movies'}), 201
