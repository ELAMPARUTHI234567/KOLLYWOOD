import sys
import os
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

# Ensure backend/ is in sys.path so 'extensions' resolves properly
if os.path.dirname(os.path.dirname(__file__)) not in sys.path:
    sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from extensions import db
from models.sound import Sound
from services.storage import upload_file_to_supabase, delete_file_from_supabase

sound_bp = Blueprint('sound', __name__, url_prefix='/api/sounds')

@sound_bp.route('', methods=['GET'])
def get_sounds():
    sounds = Sound.query.order_by(Sound.created_at.desc()).all()
    return jsonify([sound.to_dict() for sound in sounds]), 200

@sound_bp.route('', methods=['POST'])
@jwt_required(optional=True)
def add_sound():
    data = request.json
    
    required_fields = ['name', 'file_url', 'category']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
            
    # Check for duplicate
    existing = Sound.query.filter(
        Sound.name.ilike(data['name']),
        Sound.category == data['category']
    ).first()
    
    if existing:
        return jsonify({'error': 'Sound with this name and category already exists'}), 409
        
    sound = Sound(
        name=data['name'],
        file_url=data['file_url'],
        category=data['category'],
        description=data.get('description'),
        is_active=data.get('is_active', True),
        is_sample=data.get('is_sample', False)
    )
    
    db.session.add(sound)
    db.session.commit()
    
    return jsonify(sound.to_dict()), 201

@sound_bp.route('/<int:sound_id>', methods=['PUT'])
@jwt_required(optional=True)
def update_sound(sound_id):
    sound = Sound.query.get_or_404(sound_id)
    data = request.json
    
    if 'name' in data: sound.name = data['name']
    if 'file_url' in data: sound.file_url = data['file_url']
    if 'category' in data: sound.category = data['category']
    if 'description' in data: sound.description = data['description']
    if 'is_active' in data: sound.is_active = data['is_active']
    if 'is_sample' in data: sound.is_sample = data['is_sample']
    
    db.session.commit()
    return jsonify(sound.to_dict()), 200

@sound_bp.route('/upload', methods=['POST'])
@jwt_required(optional=True)
def upload_sound():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400
        
    file = request.files['file']
    if not file.filename:
        return jsonify({'error': 'No selected file'}), 400
        
    filename = file.filename or 'unnamed'
        
    # Validate Extension
    allowed_exts = {'.mp3', '.wav', '.ogg'}
    ext = os.path.splitext(filename)[1].lower()
    if ext not in allowed_exts:
        return jsonify({'error': f'Invalid file type. Allowed: {", ".join(allowed_exts)}'}), 400
        
    # Validate MIME
    allowed_mimes = {'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/x-wav'}
    mime = file.content_type
    if mime not in allowed_mimes:
        return jsonify({'error': f'Invalid MIME type: {mime}'}), 400
        
    name = request.form.get('name')
    category = request.form.get('category')
    
    if not name or not category:
        return jsonify({'error': 'name and category are required fields'}), 400
        
    # Check for duplicate
    existing = Sound.query.filter(
        Sound.name.ilike(name),
        Sound.category == category
    ).first()
    
    if existing:
        return jsonify({'error': 'Sound with this name and category already exists'}), 409
        
    # Process Upload
    try:
        file_bytes = file.read()
        
        # Validate size: Max 5MB
        if len(file_bytes) > 5 * 1024 * 1024:
            return jsonify({'error': 'File size exceeds 5MB limit'}), 400
            
        file_url, storage_path = upload_file_to_supabase(file_bytes, file.filename, mime)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
        
    sound = Sound(
        name=name,
        file_url=file_url,
        category=category,
        description=request.form.get('description', ''),
        is_active=request.form.get('is_active', 'true').lower() == 'true',
        is_sample=False
    )
    
    db.session.add(sound)
    db.session.commit()
    
    return jsonify(sound.to_dict()), 201

@sound_bp.route('/<int:sound_id>', methods=['DELETE'])
@jwt_required(optional=True)
def delete_sound(sound_id):
    sound = Sound.query.get_or_404(sound_id)
    
    if not sound.is_sample:
        # Delete from persistent storage
        delete_file_from_supabase(sound.file_url)
        
    db.session.delete(sound)
    db.session.commit()
    return jsonify({'message': 'Sound deleted'}), 200

@sound_bp.route('/quick-sample', methods=['POST'])
@jwt_required(optional=True)
def add_quick_samples():
    samples = [
        {
            "name": "Game Start",
            "file_url": "https://www.soundjay.com/buttons/button-14.mp3",
            "category": "Game Start",
            "description": "Played when a game begins.",
            "is_sample": True
        },
        {
            "name": "Correct Answer",
            "file_url": "https://www.soundjay.com/buttons/button-09.mp3",
            "category": "Correct Answer",
            "description": "Played on correct answer.",
            "is_sample": True
        },
        {
            "name": "Wrong Answer",
            "file_url": "https://www.soundjay.com/buttons/button-10.mp3",
            "category": "Wrong Answer",
            "description": "Played on wrong answer.",
            "is_sample": True
        }
    ]
    
    added_count = 0
    for sample in samples:
        existing = Sound.query.filter(
            Sound.name.ilike(sample['name']),
            Sound.category == sample['category']
        ).first()
        
        if not existing:
            sound = Sound(**sample)
            db.session.add(sound)
            added_count += 1
            
    db.session.commit()
    return jsonify({'message': f'Added {added_count} sample sounds'}), 201
