"""
KOLLOYWOOD - Flask Application Entry Point
"""
import os
import sys

# Eventlet monkey patching must happen BEFORE other imports on Linux/production
if sys.platform != 'win32':
    try:
        import eventlet
        eventlet.monkey_patch()
    except Exception:
        pass

import io

# Fix Windows console encoding for UTF-8
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Ensure backend/ is on the Python path
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from extensions import db, socketio
from routes import game_bp
from sockets import register_socket_events


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # ── CORS: allow all origins in development ──────────────────────────────
    CORS(app, resources={r"/*": {"origins": "*"}},
         supports_credentials=True,
         allow_headers=["Content-Type", "Authorization"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

    # ── Health check routes at root level ────────────────────────────────────
    @app.route('/', methods=['GET'])
    @app.route('/health', methods=['GET'])
    def root_health():
        return jsonify({'status': 'ok', 'message': 'KOLLOYWOOD backend is running!'}), 200

    # ── Database ─────────────────────────────────────────────────────────────
    db.init_app(app)

    # ── Register REST blueprints first ───────────────────────────────────────
    app.register_blueprint(game_bp)

    # ── Socket.IO ─────────────────────────────────────────────────────────────
    async_mode = app.config.get('SOCKETIO_ASYNC_MODE', 'threading' if sys.platform == 'win32' else 'eventlet')
    socketio.init_app(
        app,
        cors_allowed_origins="*",
        async_mode=async_mode,
        logger=False,
        engineio_logger=False,
        ping_timeout=60,
        ping_interval=25,
    )

    # ── Register socket event handlers ───────────────────────────────────────
    register_socket_events(app)

    # ── Create DB tables (resilient startup) ──────────────────────────────────
    def init_database():
        with app.app_context():
            try:
                db.create_all()
                try:
                    with db.engine.connect() as conn:
                        conn.execute(db.text("ALTER TABLE questions ADD COLUMN image_url TEXT"))
                        conn.commit()
                except Exception:
                    pass
                print("[OK] Database tables ready.")
                return True
            except Exception as e:
                print(f"[WARN] Database initialization deferred: {e}")
                return False

    db_ok = init_database()
    if not db_ok:
        import threading
        def retry_db():
            import time
            for attempt in range(1, 10):
                time.sleep(3)
                print(f"[INFO] Retrying database initialization (attempt {attempt}/10)...")
                if init_database():
                    break
        t = threading.Thread(target=retry_db, daemon=True)
        t.start()

    return app


app = create_app()

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print(f"[KOLLOYWOOD] Server running on http://localhost:{port}")
    socketio.run(
        app,
        host='0.0.0.0',
        port=port,
        debug=True,
        allow_unsafe_werkzeug=True,
        use_reloader=False,   # prevent double-init of background threads
    )
