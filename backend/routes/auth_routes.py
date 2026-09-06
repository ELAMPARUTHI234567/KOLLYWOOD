"""Authentication routes — email/password login and JWT issuance."""
import re
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
)
from extensions import db
from models import User

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
_EMAIL_RE = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')


def _valid_email(email: str) -> bool:
    return bool(_EMAIL_RE.match(email))


def _error(msg: str, status: int = 400):
    return jsonify({'error': msg}), status


def _make_token(user: User) -> str:
    """Create a 7-day JWT whose identity is the user's primary-key string."""
    return create_access_token(identity=str(user.id))


# ---------------------------------------------------------------------------
# POST /api/auth/register
# ---------------------------------------------------------------------------
@auth_bp.route('/register', methods=['POST'])
def register():
    """Create a new email/password account."""
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = (data.get('password') or '').strip()
    display_name = (data.get('display_name') or data.get('name') or '').strip()

    if not email or not _valid_email(email):
        return _error('A valid email address is required.')
    if not password or len(password) < 6:
        return _error('Password must be at least 6 characters.')
    if not display_name:
        return _error('A display name is required.')

    if User.query.filter_by(email=email).first():
        return _error('An account with this email already exists.', 409)

    try:
        user = User(
            name=display_name,
            display_name=display_name,
            avatar_id='avatar_1',        # sensible default
            email=email,
            auth_provider='email',
        )
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        token = _make_token(user)
        return jsonify({
            'success': True,
            'token': token,
            'user': user.to_auth_dict(),
        }), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'[AUTH] register failed: {e}')
        return _error('Registration failed. Please try again.', 500)


# ---------------------------------------------------------------------------
# POST /api/auth/login
# ---------------------------------------------------------------------------
@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate with email + password."""
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = (data.get('password') or '').strip()

    if not email or not _valid_email(email):
        return _error('Please enter a valid email address.')
    if not password:
        return _error('Password is required.')

    user = User.query.filter_by(email=email).first()

    # Generic "invalid credentials" — do not reveal whether email exists
    if not user or user.auth_provider != 'email' or not user.check_password(password):
        return _error('Invalid email or password.', 401)

    token = _make_token(user)
    return jsonify({
        'success': True,
        'token': token,
        'user': user.to_auth_dict(),
    }), 200


# ---------------------------------------------------------------------------
# GET /api/auth/me  (JWT protected)
# ---------------------------------------------------------------------------
@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    """Return the currently authenticated user's profile."""
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id))
    if not user:
        return _error('User not found.', 404)
    return jsonify({'user': user.to_auth_dict()}), 200


# ---------------------------------------------------------------------------
# POST /api/auth/logout  (stateless — client drops the token)
# ---------------------------------------------------------------------------
@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Logout is handled client-side by dropping the JWT. This endpoint is a
    no-op on the server but gives the frontend a clean API surface."""
    return jsonify({'success': True, 'message': 'Logged out.'}), 200
