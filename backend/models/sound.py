from extensions import db
from datetime import datetime

class Sound(db.Model):
    __tablename__ = 'sounds'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    file_url = db.Column(db.String(500), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    is_sample = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'file_url': self.file_url,
            'category': self.category,
            'description': self.description,
            'is_active': self.is_active,
            'is_sample': self.is_sample,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
