"""
Read-only database schema inspection script.
Connects using the same config.py logic as the app (SQLite locally, Railway MySQL in production).
Prints the current 'users' table schema and reports which auth columns are present/missing.
Does NOT modify, drop, or insert any data.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from config import Config

db_uri = Config.SQLALCHEMY_DATABASE_URI
is_sqlite = db_uri.startswith('sqlite')
is_mysql  = 'mysql' in db_uri

print("=" * 60)
print("KOLLYWOOD — Database Schema Inspector (READ-ONLY)")
print("=" * 60)
print(f"Database type : {'SQLite (local)' if is_sqlite else 'MySQL'}")

# ── Connect ─────────────────────────────────────────────────────────────────
if is_sqlite:
    import sqlite3
    db_path = db_uri.replace('sqlite:///', '')
    print(f"Database path : {db_path}")
    print()

    try:
        conn = sqlite3.connect(db_path)
        cur  = conn.cursor()

        # Get all tables
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
        tables = [r[0] for r in cur.fetchall()]
        print(f"Tables found  : {tables}")
        print()

        if 'users' not in tables:
            print("⚠  'users' table does NOT exist yet.")
        else:
            # Get column info for users table
            cur.execute("PRAGMA table_info(users);")
            cols = cur.fetchall()
            # columns: cid, name, type, notnull, dflt_value, pk
            print("users table — current columns:")
            print(f"  {'#':<4} {'name':<20} {'type':<20} {'notnull':<10} {'default':<20} {'pk'}")
            print("  " + "-" * 80)
            col_names = []
            for c in cols:
                cid, name, ctype, notnull, dflt, pk = c
                col_names.append(name)
                print(f"  {cid:<4} {name:<20} {ctype:<20} {str(bool(notnull)):<10} {str(dflt):<20} {pk}")

            print()
            # Auth columns check
            auth_cols = {
                'email':         'VARCHAR(255) UNIQUE',
                'password_hash': 'VARCHAR(255)',
                'auth_provider': "VARCHAR(10) DEFAULT 'guest'",
                'display_name':  'VARCHAR(100)',
            }
            print("Auth column status:")
            all_present = True
            for col, definition in auth_cols.items():
                present = col in col_names
                status  = '✓ PRESENT' if present else '✗ MISSING'
                print(f"  {status:<12} {col}  →  suggested: {definition}")
                if not present:
                    all_present = False

            print()
            if all_present:
                print("✅ All auth columns already exist. No migration needed.")
            else:
                print("⚠  Some columns are MISSING. Safe ALTER TABLE statements:")
                print()
                for col, definition in auth_cols.items():
                    if col not in col_names:
                        if col == 'auth_provider':
                            print(f"  ALTER TABLE users ADD COLUMN {col} {definition} NOT NULL;")
                        else:
                            print(f"  ALTER TABLE users ADD COLUMN {col} {definition};")

        conn.close()

    except Exception as e:
        print(f"ERROR: {e}")

else:
    # ── MySQL ────────────────────────────────────────────────────────────────
    import re
    try:
        import pymysql
    except ImportError:
        print("pymysql not installed — run: pip install PyMySQL")
        sys.exit(1)

    # Parse connection string
    # mysql+pymysql://user:pass@host:port/dbname?charset=...
    pattern = r'mysql\+pymysql://([^:]+):([^@]*)@([^:/]+):(\d+)/([^?]+)'
    m = re.match(pattern, db_uri)
    if not m:
        print(f"ERROR: Could not parse MySQL URI: {db_uri[:40]}...")
        sys.exit(1)

    user, password, host, port, dbname = m.groups()
    dbname = dbname.split('?')[0]
    print(f"Host          : {host}:{port}")
    print(f"Database      : {dbname}")
    print(f"User          : {user}")
    print()

    try:
        conn = pymysql.connect(
            host=host,
            port=int(port),
            user=user,
            password=password,
            database=dbname,
            charset='utf8mb4',
            connect_timeout=10,
        )
        cur = conn.cursor()

        # List all tables
        cur.execute("SHOW TABLES;")
        tables = [r[0] for r in cur.fetchall()]
        print(f"Tables found  : {tables}")
        print()

        if 'users' not in tables:
            print("⚠  'users' table does NOT exist yet.")
        else:
            # Full column details
            cur.execute("DESCRIBE users;")
            cols = cur.fetchall()
            # Field, Type, Null, Key, Default, Extra
            print("users table — current columns (DESCRIBE users):")
            print(f"  {'Field':<20} {'Type':<30} {'Null':<8} {'Key':<8} {'Default':<20} Extra")
            print("  " + "-" * 90)
            col_names = []
            for c in cols:
                field, ctype, null, key, default, extra = c
                col_names.append(field)
                print(f"  {field:<20} {str(ctype):<30} {null:<8} {str(key):<8} {str(default):<20} {extra}")

            print()
            # Auth columns check
            auth_cols = {
                'email':         'VARCHAR(255) NULL UNIQUE',
                'password_hash': 'VARCHAR(255) NULL',
                'auth_provider': "ENUM('guest','email') NOT NULL DEFAULT 'guest'",
                'display_name':  'VARCHAR(100) NULL',
            }
            print("Auth column status:")
            all_present = True
            missing_cols = {}
            for col, definition in auth_cols.items():
                present = col in col_names
                status  = '✓ PRESENT' if present else '✗ MISSING'
                print(f"  {status:<12} {col}")
                if not present:
                    all_present = False
                    missing_cols[col] = definition

            print()
            if all_present:
                print("✅ All auth columns already exist. No migration needed.")
            else:
                print("⚠  The following ALTER TABLE statements are safe to run")
                print("   (all ADD COLUMN — no data is modified or deleted):")
                print()
                for col, definition in missing_cols.items():
                    print(f"  ALTER TABLE users ADD COLUMN {col} {definition};")
                print()
                print("You can apply these via Railway's MySQL query console,")
                print("or let the Flask app's db.create_all() handle it on first startup")
                print("(SQLAlchemy will attempt to add missing columns).")

        cur.close()
        conn.close()

    except pymysql.err.OperationalError as e:
        code, msg = e.args
        print(f"MySQL connection error [{code}]: {msg}")
        print()
        print("If connecting to Railway MySQL, this script must be run")
        print("with Railway env vars available (e.g. via Railway CLI or shell).")
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}")
