"""
KOLLOYWOOD - Flask Application Entry Point
"""
import os
import sys
import io

# Fix Windows console encoding for UTF-8
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Ensure backend/ is on the Python path
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask
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

    # ── Database ─────────────────────────────────────────────────────────────
    db.init_app(app)

    # ── Register REST blueprints first ───────────────────────────────────────
    app.register_blueprint(game_bp)

    # ── Socket.IO ─────────────────────────────────────────────────────────────
    socketio.init_app(
        app,
        cors_allowed_origins="*",
        async_mode="threading",
        logger=False,
        engineio_logger=False,
        ping_timeout=60,
        ping_interval=25,
    )

    # ── Register socket event handlers ───────────────────────────────────────
    register_socket_events(app)

    # ── Create DB tables ─────────────────────────────────────────────────────
    with app.app_context():
        db.create_all()
        try:
            with db.engine.connect() as conn:
                conn.execute(db.text("ALTER TABLE questions ADD COLUMN image_url TEXT"))
                conn.commit()
        except Exception:
            pass
        print("[OK] Database tables ready.")

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
