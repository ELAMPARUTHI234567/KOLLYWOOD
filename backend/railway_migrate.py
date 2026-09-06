"""
Railway MySQL Schema Migration — Auth Columns
=============================================
Runs inside the Railway private network using MYSQLHOST / MYSQLPASSWORD env vars.
Adds auth columns to the users table if they are missing.
NEVER drops, modifies, or deletes data.

Usage (from Railway shell / one-off job):
  python backend/railway_migrate.py
"""
import os
import sys

# ── Read connection from Railway env vars ────────────────────────────────────
host     = os.environ.get('MYSQLHOST', 'mysql.railway.internal')
port     = int(os.environ.get('MYSQLPORT', '3306'))
user     = os.environ.get('MYSQLUSER', 'root')
password = os.environ.get('MYSQLPASSWORD', '')
database = os.environ.get('MYSQLDATABASE', 'railway')

if not password:
    print("ERROR: MYSQLPASSWORD env var is not set — cannot connect.")
    sys.exit(1)

try:
    import pymysql
except ImportError:
    print("ERROR: pymysql not installed.")
    sys.exit(1)

print("=" * 60)
print("Railway MySQL Migration — Auth Columns (additive only)")
print("=" * 60)
print(f"Host     : {host}:{port}")
print(f"Database : {database}")
print(f"User     : {user}")
print()

try:
    conn = pymysql.connect(
        host=host, port=port,
        user=user, password=password,
        database=database,
        charset='utf8mb4',
        connect_timeout=15,
    )
    cur = conn.cursor()
    print("Connected to MySQL successfully.")
    print()

    # ── Step 1: Read current schema ──────────────────────────────────────────
    cur.execute("DESCRIBE users;")
    rows = cur.fetchall()
    existing = {row[0] for row in rows}

    print("Current users table columns:")
    print(f"  {'Field':<20} {'Type':<35} {'Null':<6} {'Key':<6} {'Default'}")
    print("  " + "-" * 75)
    for row in rows:
        field, ctype, null, key, default, extra = row
        print(f"  {field:<20} {str(ctype):<35} {null:<6} {str(key):<6} {str(default)}")

    print()

    # ── Step 2: Determine what's missing ────────────────────────────────────
    # Each tuple: (column_name, ALTER TABLE DDL, needs_unique_index)
    REQUIRED = [
        ('email',         "ADD COLUMN email         VARCHAR(255) NULL",                              True),
        ('password_hash', "ADD COLUMN password_hash VARCHAR(255) NULL",                              False),
        ('auth_provider', "ADD COLUMN auth_provider ENUM('guest','email') NOT NULL DEFAULT 'guest'", False),
        ('display_name',  "ADD COLUMN display_name  VARCHAR(100) NULL",                              False),
    ]

    missing = [(name, ddl, idx) for name, ddl, idx in REQUIRED if name not in existing]

    if not missing:
        print("All auth columns already exist. Checking indexes...")
    else:
        print(f"Missing columns ({len(missing)}): {[n for n,_,_ in missing]}")
        print()

    # ── Step 3: Apply missing columns ────────────────────────────────────────
    try:
        for name, ddl, _ in missing:
            sql = f"ALTER TABLE users {ddl};"
            print(f"  Executing: {sql}")
            cur.execute(sql)
            print(f"  Added column: {name}")

        # ── Step 4: Add unique index on email if column was just added ────────
        # Check whether the index already exists
        cur.execute("""
            SELECT COUNT(*) FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = %s
              AND TABLE_NAME   = 'users'
              AND INDEX_NAME   = 'idx_users_email';
        """, (database,))
        index_exists = cur.fetchone()[0] > 0

        if not index_exists:
            print()
            print("  Executing: CREATE UNIQUE INDEX idx_users_email ON users(email);")
            # MySQL UNIQUE index allows multiple NULLs by default
            cur.execute("ALTER TABLE users ADD UNIQUE INDEX idx_users_email (email);")
            print("  Added: UNIQUE INDEX idx_users_email on email")
        else:
            print("  Index idx_users_email already exists.")

        conn.commit()

    except Exception as e:
        conn.rollback()
        print(f"\nERROR — transaction rolled back: {e}")
        cur.close()
        conn.close()
        sys.exit(1)

    # ── Step 5: Verify final schema ──────────────────────────────────────────
    print()
    print("=" * 60)
    print("POST-MIGRATION SCHEMA VERIFICATION")
    print("=" * 60)

    cur.execute("DESCRIBE users;")
    final_rows = cur.fetchall()
    final_cols = {row[0] for row in final_rows}

    print("Final users table columns:")
    print(f"  {'Field':<20} {'Type':<35} {'Null':<6} {'Key':<6} {'Default'}")
    print("  " + "-" * 75)
    for row in final_rows:
        field, ctype, null, key, default, extra = row
        marker = " <-- NEW" if field in [n for n,_,_ in missing] else ""
        print(f"  {field:<20} {str(ctype):<35} {null:<6} {str(key):<6} {str(default)}{marker}")

    print()

    # Check indexes
    cur.execute("""
        SELECT INDEX_NAME, NON_UNIQUE, COLUMN_NAME
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'users'
        ORDER BY INDEX_NAME, SEQ_IN_INDEX;
    """, (database,))
    indexes = cur.fetchall()
    print("Indexes on users table:")
    for idx_name, non_unique, col in indexes:
        uniqueness = "UNIQUE" if non_unique == 0 else "INDEX"
        print(f"  {uniqueness:<8} {idx_name:<30} on {col}")

    print()
    # Final pass/fail
    required_cols = {'email', 'password_hash', 'auth_provider', 'display_name'}
    missing_final = required_cols - final_cols
    if missing_final:
        print(f"FAIL: Still missing columns: {missing_final}")
        sys.exit(1)
    else:
        print("PASS: All required auth columns are present.")

    idx_names = {row[0] for row in indexes}
    if 'idx_users_email' in idx_names:
        print("PASS: Unique index on email exists.")
    else:
        print("WARN: idx_users_email index not found.")

    cur.close()
    conn.close()

except pymysql.err.OperationalError as e:
    code, msg = e.args
    print(f"MySQL connection error [{code}]: {msg}")
    sys.exit(1)
except Exception as e:
    print(f"Unexpected error: {type(e).__name__}: {e}")
    sys.exit(1)
