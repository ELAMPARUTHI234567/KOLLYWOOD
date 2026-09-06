"""
Railway MySQL Migration — via public TCP proxy.
Uses the temporary Railway TCP proxy endpoint to reach MySQL from local machine.
NEVER drops, modifies, or deletes data.
"""
import os
import sys

# ── Connection via Railway TCP proxy (public endpoint) ───────────────────────
# The proxy forwards to mysql.railway.internal:3306 inside Railway's network.
PROXY_HOST = 'trolley.proxy.rlwy.net'
PROXY_PORT = 25136

# Password comes from the Railway env var injected by `railway run`
password = os.environ.get('MYSQLPASSWORD', '')
user     = os.environ.get('MYSQLUSER', 'root')
database = os.environ.get('MYSQLDATABASE', 'railway')

if not password:
    print("ERROR: MYSQLPASSWORD env var is not set.")
    print("Run this script with: npx @railway/cli run --service KOLLYWOOD python backend/railway_migrate_proxy.py")
    sys.exit(1)

try:
    import pymysql
except ImportError:
    print("ERROR: pymysql not installed.")
    sys.exit(1)

print("=" * 60)
print("Railway MySQL Migration — Auth Columns (additive only)")
print("=" * 60)
print(f"Endpoint : {PROXY_HOST}:{PROXY_PORT}  (Railway TCP proxy)")
print(f"Database : {database}")
print(f"User     : {user}")
print()

try:
    conn = pymysql.connect(
        host=PROXY_HOST,
        port=PROXY_PORT,
        user=user,
        password=password,
        database=database,
        charset='utf8mb4',
        connect_timeout=20,
    )
    cur = conn.cursor()
    print("Connected to Railway MySQL successfully.")
    print()

    # ── Step 1: Read current schema (READ-ONLY) ──────────────────────────────
    cur.execute("DESCRIBE users;")
    rows = cur.fetchall()
    existing = {row[0] for row in rows}

    print("CURRENT users table columns (before migration):")
    print(f"  {'Field':<20} {'Type':<40} {'Null':<6} {'Key':<6} Default")
    print("  " + "-" * 80)
    for row in rows:
        field, ctype, null, key, default, extra = row
        print(f"  {field:<20} {str(ctype):<40} {null:<6} {str(key):<6} {str(default)}")

    print()

    # ── Step 2: Determine what's missing ────────────────────────────────────
    REQUIRED = [
        ('email',         "ADD COLUMN email         VARCHAR(255) NULL"),
        ('password_hash', "ADD COLUMN password_hash VARCHAR(255) NULL"),
        ('auth_provider', "ADD COLUMN auth_provider ENUM('guest','email') NOT NULL DEFAULT 'guest'"),
        ('display_name',  "ADD COLUMN display_name  VARCHAR(100) NULL"),
    ]

    missing = [(name, ddl) for name, ddl in REQUIRED if name not in existing]

    if not missing:
        print("All 4 auth columns are already present.")
    else:
        print(f"Columns to add ({len(missing)}): {[n for n, _ in missing]}")
        print()

    # ── Step 3: Check unique index ───────────────────────────────────────────
    cur.execute("""
        SELECT COUNT(*) FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = %s
          AND TABLE_NAME   = 'users'
          AND INDEX_NAME   = 'idx_users_email';
    """, (database,))
    index_exists = cur.fetchone()[0] > 0

    # ── Step 4: Apply changes ────────────────────────────────────────────────
    if missing or not index_exists:
        try:
            for name, ddl in missing:
                sql = f"ALTER TABLE users {ddl};"
                print(f"  Executing: {sql}")
                cur.execute(sql)
                print(f"  Done: added column '{name}'")

            if not index_exists:
                sql = "ALTER TABLE users ADD UNIQUE INDEX idx_users_email (email);"
                print(f"  Executing: {sql}")
                cur.execute(sql)
                print("  Done: added UNIQUE INDEX idx_users_email on email")

            conn.commit()
            print()
            print("All changes committed successfully.")

        except Exception as e:
            conn.rollback()
            print(f"\nERROR — transaction rolled back: {e}")
            cur.close()
            conn.close()
            sys.exit(1)
    else:
        print("Nothing to migrate.")

    # ── Step 5: Post-migration verification ──────────────────────────────────
    print()
    print("=" * 60)
    print("POST-MIGRATION SCHEMA VERIFICATION")
    print("=" * 60)

    cur.execute("DESCRIBE users;")
    final_rows = cur.fetchall()
    final_cols = {row[0] for row in final_rows}
    added_names = {n for n, _ in missing}

    print("Final users table columns:")
    print(f"  {'Field':<20} {'Type':<40} {'Null':<6} {'Key':<6} Default")
    print("  " + "-" * 80)
    for row in final_rows:
        field, ctype, null, key, default, extra = row
        marker = "  <-- ADDED" if field in added_names else ""
        print(f"  {field:<20} {str(ctype):<40} {null:<6} {str(key):<6} {str(default)}{marker}")

    print()

    cur.execute("""
        SELECT INDEX_NAME, NON_UNIQUE, COLUMN_NAME
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'users'
        ORDER BY INDEX_NAME, SEQ_IN_INDEX;
    """, (database,))
    indexes = cur.fetchall()
    print("Indexes on users table:")
    for idx_name, non_unique, col in indexes:
        utype = "UNIQUE" if non_unique == 0 else "INDEX"
        print(f"  {utype:<8} {idx_name:<30} on column: {col}")

    # ── Final pass/fail check ────────────────────────────────────────────────
    print()
    required_cols = {'email', 'password_hash', 'auth_provider', 'display_name'}
    still_missing = required_cols - final_cols
    idx_names = {row[0] for row in indexes}

    if still_missing:
        print(f"FAIL: Still missing columns: {still_missing}")
        sys.exit(1)
    else:
        print("PASS: All 4 required auth columns are present.")

    if 'idx_users_email' in idx_names:
        print("PASS: Unique index idx_users_email on email exists.")
    else:
        print("WARN: idx_users_email index was not found.")

    print()
    print("Migration complete. Railway MySQL is ready for deployment.")

    cur.close()
    conn.close()

except pymysql.err.OperationalError as e:
    code, msg = e.args
    print(f"MySQL connection error [{code}]: {msg}")
    sys.exit(1)
except Exception as e:
    print(f"Unexpected error: {type(e).__name__}: {e}")
    import traceback; traceback.print_exc()
    sys.exit(1)
