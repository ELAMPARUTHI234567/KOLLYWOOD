from extensions import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    avatar_id = db.Column(db.String(30), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # ── Authentication fields (nullable — existing guest rows unaffected) ──
    email = db.Column(db.String(255), unique=True, nullable=True)
    password_hash = db.Column(db.String(255), nullable=True)
    # 'guest' = anonymous game player (legacy), 'email' = email+password account
    auth_provider = db.Column(
        db.Enum('guest', 'email', name='auth_provider_enum'),
        nullable=False,
        default='guest',
        server_default='guest',
    )
    # Persistent display name separate from the per-game nickname
    display_name = db.Column(db.String(100), nullable=True)

    # ── Relationships ──────────────────────────────────────────────────────
    game_players = db.relationship('GamePlayer', back_populates='user', lazy='dynamic')
    questions = db.relationship('Question', back_populates='creator', lazy='dynamic')
    guesses = db.relationship('Guess', back_populates='player', lazy='dynamic')

    # ── Password helpers ───────────────────────────────────────────────────
    def set_password(self, password: str) -> None:
        """Hash and store a password using Werkzeug (never stores plaintext)."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Return True if the given password matches the stored hash."""
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)

    # ── Serialisation ──────────────────────────────────────────────────────
    def to_dict(self):
        """Lightweight dict used by game routes (unchanged contract)."""
        return {
            'id': self.id,
            'name': self.name,
            'avatar_id': self.avatar_id,
        }

    def to_auth_dict(self):
        """Extended dict returned to the frontend after login/register."""
        return {
            'id': self.id,
            'name': self.name,
            'display_name': self.display_name or self.name,
            'avatar_id': self.avatar_id,
            'email': self.email,
            'auth_provider': self.auth_provider,
        }
