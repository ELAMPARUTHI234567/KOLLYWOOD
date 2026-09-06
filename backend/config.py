import os
import sys
from dotenv import load_dotenv

load_dotenv()

import re

def _mask_url(url):
    """Safely mask password in database URL for logs."""
    if not url:
        return ''
    return re.sub(r':([^@/?#]+)@', ':****@', url)

def _format_mysql_uri(db_url):
    """Format MySQL connection string for SQLAlchemy with pymysql driver and utf8mb4."""
    db_url = db_url.strip()
    if db_url.startswith('mysql://'):
        db_url = db_url.replace('mysql://', 'mysql+pymysql://', 1)
    elif db_url.startswith('mysql2://'):
        db_url = db_url.replace('mysql2://', 'mysql+pymysql://', 1)
    if 'charset=' not in db_url:
        separator = '&' if '?' in db_url else '?'
        db_url = f"{db_url}{separator}charset=utf8mb4"
    return db_url

def _build_db_uri():
    """Build database URI. Supports DATABASE_URL, MYSQL_URL, discrete DB_* vars, or local SQLite fallback."""
    use_sqlite = os.getenv('USE_SQLITE', '').lower() in ('1', 'true', 'yes')
    if use_sqlite:
        db_path = os.path.join(os.path.dirname(__file__), 'kolloywood.db')
        print(f"[INFO] Using SQLite database: {db_path}")
        return f"sqlite:///{db_path}"

    is_production = (
        sys.platform != 'win32' or
        bool(os.getenv('RAILWAY_ENVIRONMENT')) or
        bool(os.getenv('RAILWAY_SERVICE_ID')) or
        bool(os.getenv('PORT'))
    )

    # 1. First priority: Check known cloud database URL variables
    known_url_keys = [
        'DATABASE_URL',
        'MYSQL_URL',
        'MYSQLURL',
        'MYSQL_PRIVATE_URL',
        'MYSQLPRIVATEURL',
        'MYSQL_DATABASE_URL',
        'DB_URL',
        'DATABASE_PRIVATE_URL',
        'DATABASE_PUBLIC_URL',
        'MYSQL_PUBLIC_URL',
    ]
    for key in known_url_keys:
        val = (os.getenv(key) or '').strip()
        if val and (val.startswith('mysql://') or val.startswith('mysql2://') or val.startswith('mysql+pymysql://')):
            print(f"[INFO] Using MySQL connection from {key}: {_mask_url(val)}")
            return _format_mysql_uri(val)

    # 2. Second priority: Scan all environment variables for any connection string starting with mysql
    for key, val in os.environ.items():
        if isinstance(val, str) and (val.startswith('mysql://') or val.startswith('mysql2://') or val.startswith('mysql+pymysql://')):
            print(f"[INFO] Detected MySQL connection in env variable '{key}': {_mask_url(val)}")
            return _format_mysql_uri(val)

    # 3. Third priority: Check discrete MySQL variables
    host = (
        os.getenv('MYSQLHOST') or
        os.getenv('MYSQL_HOST') or
        os.getenv('DB_HOST') or
        os.getenv('DATABASE_HOST') or
        os.getenv('MYSQL_HOSTNAME')
    )
    port = os.getenv('MYSQLPORT', os.getenv('MYSQL_PORT', os.getenv('DB_PORT', os.getenv('DATABASE_PORT', '3306'))))
    user = os.getenv('MYSQLUSER', os.getenv('MYSQL_USER', os.getenv('DB_USER', os.getenv('DATABASE_USER', 'root'))))
    password = os.getenv('MYSQLPASSWORD', os.getenv('MYSQL_PASSWORD', os.getenv('DB_PASSWORD', os.getenv('DATABASE_PASSWORD', ''))))
    name = (
        os.getenv('MYSQLDATABASE') or
        os.getenv('MYSQL_DATABASE') or
        os.getenv('DB_NAME') or
        os.getenv('DATABASE_NAME') or
        ('railway' if is_production else 'kolloywood')
    )

    if host and host not in ('localhost', '127.0.0.1'):
        print(f"[INFO] Using discrete MySQL connection: user={user} host={host}:{port} db={name}")
        return f"mysql+pymysql://{user}:{password}@{host}:{port}/{name}?charset=utf8mb4"

    # 4. In production: DO NOT fall back to localhost!
    if is_production:
        # If running inside Railway private mesh, try mysql.railway.internal
        railway_internal_host = os.getenv('MYSQL_PRIVATE_HOST', 'mysql.railway.internal')
        if password:
            print(f"[WARN] No explicit MYSQL_URL or MYSQLHOST found; connecting to Railway private mesh: {railway_internal_host}:{port}")
            return f"mysql+pymysql://{user}:{password}@{railway_internal_host}:{port}/{name}?charset=utf8mb4"

        available_keys = [k for k in os.environ.keys() if any(tag in k.upper() for tag in ['SQL', 'DATABASE', 'DB', 'RAILWAY'])]
        print(f"[ERROR] CRITICAL: No MySQL connection variable found in Railway environment! Detected relevant keys: {available_keys}")
        # Connect to Railway private internal host (NEVER localhost)
        return f"mysql+pymysql://{user}:{password}@{railway_internal_host}:{port}/{name}?charset=utf8mb4"

    # Local development fallback only (on Windows / non-production)
    return f"mysql+pymysql://root:@localhost:3306/kolloywood?charset=utf8mb4"


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
            'connect_args': {
                'connect_timeout': 10,
            },
        }

    # CORS
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:5173').split(',')

    # SocketIO
    SOCKETIO_ASYNC_MODE = os.getenv('SOCKETIO_ASYNC_MODE', 'threading' if sys.platform == 'win32' else 'eventlet')
    SOCKETIO_CORS_ALLOWED_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:5173')

    # Game defaults
    DEFAULT_MAX_PLAYERS = 30
    DEFAULT_POINTS_PER_QUESTION = 100
    DEFAULT_QUESTION_TIME = 120
    DEFAULT_CLUE_INTERVAL = 30
    DEFAULT_QUESTION_GAP = 10
