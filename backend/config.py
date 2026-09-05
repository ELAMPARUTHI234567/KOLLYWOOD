import os
from dotenv import load_dotenv

load_dotenv()

def _build_db_uri():
    """Build database URI. Supports DATABASE_URL, MYSQL_URL, discrete DB_* vars, or local SQLite fallback."""
    use_sqlite = os.getenv('USE_SQLITE', '').lower() in ('1', 'true', 'yes')
    if use_sqlite:
        db_path = os.path.join(os.path.dirname(__file__), 'kolloywood.db')
        print(f"[INFO] Using SQLite database: {db_path}")
        return f"sqlite:///{db_path}"

    # Check for direct connection URL from cloud providers (Railway, Render, Aiven, etc.)
    db_url = os.getenv('DATABASE_URL') or os.getenv('MYSQL_URL')
    if db_url:
        if db_url.startswith('mysql://'):
            db_url = db_url.replace('mysql://', 'mysql+pymysql://', 1)
        return db_url

    host     = os.getenv('DB_HOST', 'localhost')
    port     = os.getenv('DB_PORT', '3306')
    user     = os.getenv('DB_USER', 'root')
    password = os.getenv('DB_PASSWORD', '')
    name     = os.getenv('DB_NAME', 'kolloywood')
    return f"mysql+pymysql://{user}:{password}@{host}:{port}/{name}?charset=utf8mb4"


class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'kolloywood-super-secret-key-2024')

    # Database — MySQL by default; SQLite if USE_SQLITE=true in .env
    _db_uri = _build_db_uri()
    SQLALCHEMY_DATABASE_URI = _db_uri
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Pool options only work with MySQL (not SQLite)
    if not _db_uri.startswith('sqlite'):
        SQLALCHEMY_ENGINE_OPTIONS = {
            'pool_recycle': 300,
            'pool_pre_ping': True,
        }

    # CORS
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:5173').split(',')

    # SocketIO
    SOCKETIO_ASYNC_MODE = 'threading'
    SOCKETIO_CORS_ALLOWED_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:5173')

    # Game defaults
    DEFAULT_MAX_PLAYERS = 30
    DEFAULT_POINTS_PER_QUESTION = 100
    DEFAULT_QUESTION_TIME = 120
    DEFAULT_CLUE_INTERVAL = 30
    DEFAULT_QUESTION_GAP = 10
