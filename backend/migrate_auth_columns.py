"""
Safe, additive-only migration script for the Kollywood users table.
Adds the 4 auth columns needed by the new email/password auth system.

Rules:
- READ the current schema first.
- Only ADD columns that are genuinely missing — never DROP or MODIFY.
- All new columns are nullable (or have a safe default) so existing rows are unaffected.
- Rolls back automatically if any statement fails.
- Works for both SQLite (local) and MySQL (Railway).

Run locally (SQLite):   python migrate_auth_columns.py
Run on Railway:         Set Railway env vars, then: python migrate_auth_columns.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from config import Config

db_uri = Config.SQLALCHEMY_DATABASE_URI
is_sqlite = db_uri.startswith('sqlite')

# Columns to add if missing
# (col_name, sqlite_ddl, mysql_ddl)
AUTH_COLUMNS = [
    (
        'email',
        'VARCHAR(255)',                  # SQLite (UNIQUE handled via index below)
        'VARCHAR(255) NULL',            # MySQL (UNIQUE index added separately)
    ),
    (
        'password_hash',
        'VARCHAR(255)',                  # SQLite
        'VARCHAR(255) NULL',            # MySQL
    ),
    (
        'auth_provider',
        "VARCHAR(10) NOT NULL DEFAULT 'guest'",             # SQLite
        "ENUM('guest','email') NOT NULL DEFAULT 'guest'",   # MySQL
    ),
    (
        'display_name',
        'VARCHAR(100)',                  # SQLite
        'VARCHAR(100) NULL',            # MySQL
    ),
]

print("=" * 60)
print("KOLLYWOOD — Auth Column Migration (additive-only)")
print("=" * 60)
print(f"Target : {'SQLite' if is_sqlite else 'MySQL'}")
print()

# ── SQLite ───────────────────────────────────────────────────────────────────
if is_sqlite:
    import sqlite3
    db_path = db_uri.replace('sqlite:///', '')
    print(f"Database: {db_path}")
    print()

    conn = sqlite3.connect(db_path)
    cur  = conn.cursor()

    cur.execute("PRAGMA table_info(users);")
    existing = {row[1] for row in cur.fetchall()}

    missing = [(name, sq, _) for name, sq, _ in AUTH_COLUMNS if name not in existing]

    if not missing:
        print("All auth columns already exist. Nothing to migrate.")
        conn.close()
        sys.exit(0)

    print("Missing columns — will add:")
    for name, sq, _ in missing:
        print(f"  ALTER TABLE users ADD COLUMN {name} {sq};")
    print()

    try:
        for name, sq, _ in missing:
            cur.execute(f"ALTER TABLE users ADD COLUMN {name} {sq};")
            print(f"  Added: {name}")
        # SQLite does not support inline UNIQUE on ADD COLUMN;
        # create a separate partial index (NULL values excluded from uniqueness).
        cur.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;"
        )
        print("  Added: UNIQUE INDEX on email (WHERE email IS NOT NULL)")
        conn.commit()
        print()
        print("Migration complete. Verifying...")
        cur.execute("PRAGMA table_info(users);")
        final_cols = [row[1] for row in cur.fetchall()]
        print(f"  Final columns: {final_cols}")
    except Exception as e:
        conn.rollback()
        print(f"ERROR — rolled back: {e}")
        sys.exit(1)
    finally:
        conn.close()

# ── MySQL ────────────────────────────────────────────────────────────────────
else:
    import re
    try:
        import pymysql
    except ImportError:
        print("PyMySQL not installed. Run: pip install PyMySQL")
        sys.exit(1)

    pattern = r'mysql\+pymysql://([^:]+):([^@]*)@([^:/]+):(\d+)/([^?]+)'
    m = re.match(pattern, db_uri)
    if not m:
        print(f"ERROR: Cannot parse MySQL URI")
        sys.exit(1)

    user, password, host, port, dbname = m.groups()
    dbname = dbname.split('?')[0]
    print(f"Host    : {host}:{port}")
    print(f"Database: {dbname}")
    print()

    try:
        conn = pymysql.connect(
            host=host, port=int(port),
            user=user, password=password,
            database=dbname, charset='utf8mb4',
            connect_timeout=10,
        )
        cur = conn.cursor()

        cur.execute("DESCRIBE users;")
        existing = {row[0] for row in cur.fetchall()}

        missing = [(name, _, my) for name, _, my in AUTH_COLUMNS if name not in existing]

        if not missing:
            print("All auth columns already exist. Nothing to migrate.")
            cur.close(); conn.close()
            sys.exit(0)

        print("Missing columns — will add:")
        for name, _, my in missing:
            print(f"  ALTER TABLE users ADD COLUMN {name} {my};")
        print()

        try:
            for name, _, my in missing:
                sql = f"ALTER TABLE users ADD COLUMN {name} {my};"
                cur.execute(sql)
                print(f"  Added: {name}")

            # Add unique index on email if column was just created
            if 'email' in [n for n, _, _ in missing]:
                cur.execute(
                    "ALTER TABLE users ADD UNIQUE INDEX idx_users_email (email);"
                )
                print("  Added: UNIQUE INDEX on email")

            conn.commit()
            print()
            print("Migration complete. Verifying...")
            cur.execute("DESCRIBE users;")
            final_cols = [row[0] for row in cur.fetchall()]
            print(f"  Final columns: {final_cols}")

        except Exception as e:
            conn.rollback()
            print(f"ERROR — rolled back: {e}")
            sys.exit(1)
        finally:
            cur.close()
            conn.close()

    except pymysql.err.OperationalError as e:
        code, msg = e.args
        print(f"MySQL connection error [{code}]: {msg}")
        sys.exit(1)
