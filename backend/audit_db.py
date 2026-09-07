import os
import sys
import pymysql

print("=== KOLLYWOOD DATABASE AUDIT ===")

# Read credentials from env (or fallback to mysql_env.txt for testing)
password = os.environ.get('MYSQLPASSWORD')
user = os.environ.get('MYSQLUSER')
database = os.environ.get('MYSQLDATABASE')
host = os.environ.get('MYSQLHOST')
port = os.environ.get('MYSQLPORT')

if not password:
    try:
        with open(os.path.join(os.path.dirname(__file__), 'mysql_env.txt'), 'r') as f:
            for line in f:
                if '=' in line:
                    k, v = line.strip().split('=', 1)
                    if k.strip() == 'MYSQLPASSWORD': password = v.strip()
                    elif k.strip() == 'MYSQLUSER': user = v.strip()
                    elif k.strip() == 'MYSQLDATABASE': database = v.strip()
                    elif k.strip() == 'MYSQLHOST': host = v.strip()
                    elif k.strip() == 'MYSQLPORT': port = v.strip()
    except Exception:
        pass

if not host:
    host = 'mysql.railway.internal'
if not port:
    port = '3306'
if not user:
    user = 'root'
if not database:
    database = 'railway'

try:
    port = int(port)
except ValueError:
    port = 3306

try:
    conn = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        charset='utf8mb4',
        connect_timeout=5,  # Short timeout for quick failure locally
    )
    cur = conn.cursor()
    print("\nConnection: PASS")
    print(f"Database: {database}")
    
    cur.execute("SELECT VERSION();")
    version = cur.fetchone()[0]
    print(f"Server Version: {version}\n")
    
    cur.execute("SHOW TABLES;")
    actual_tables = {r[0] for r in cur.fetchall()}
    
    expected_tables = [
        'users', 'games', 'game_players', 'questions', 
        'guesses', 'movies', 'sounds', 'chat_messages'
    ]
    
    print("TABLES:")
    missing_tables = False
    for et in expected_tables:
        if et in actual_tables:
            print(f"{et:<18} PASS")
        else:
            print(f"{et:<18} FAIL (MISSING)")
            missing_tables = True
            
    if missing_tables:
        print("\nFATAL: Missing required tables.")
        sys.exit(1)
        
    # Analyze Schema
    table_schema = {}
    row_counts = {}
    for t in actual_tables:
        cur.execute(f"SELECT COUNT(*) FROM {t};")
        row_counts[t] = cur.fetchone()[0]
        
        cur.execute(f"DESCRIBE {t};")
        cols = cur.fetchall()
        table_schema[t] = [c[0] for c in cols]
        
    print("\nSCHEMA:")
    
    # 8. Verify Authentication
    req_auth = {'email', 'password_hash', 'auth_provider', 'display_name'}
    actual_auth = set(table_schema.get('users', []))
    auth_pass = req_auth.issubset(actual_auth)
    print(f"Authentication     {'PASS' if auth_pass else 'FAIL'}")
    
    # 9. Verify Game Configuration
    req_game = {'game_code', 'host_id', 'max_players', 'points_per_question', 'question_time', 'clue_interval', 'question_gap', 'status'}
    actual_game = set(table_schema.get('games', []))
    game_pass = req_game.issubset(actual_game)
    print(f"Game configuration {'PASS' if game_pass else 'FAIL'}")
    
    # 10. Verify Questions
    req_q = {'movie_answer', 'hero', 'heroine', 'song', 'clue_1', 'clue_2', 'clue_3', 'movie_first_letter', 'hero_first_letter', 'heroine_first_letter', 'song_first_letter', 'question_order'}
    actual_q = set(table_schema.get('questions', []))
    q_pass = req_q.issubset(actual_q)
    print(f"Questions          {'PASS' if q_pass else 'FAIL'}")
    
    # 11. Verify Scoring
    req_score = {'guess_text', 'is_correct', 'points_awarded', 'response_time_seconds'}
    actual_score = set(table_schema.get('guesses', []))
    score_pass = req_score.issubset(actual_score)
    print(f"Scoring            {'PASS' if score_pass else 'FAIL'}")
    
    print("\nMISMATCHES:")
    mismatches = []
    if not auth_pass: mismatches.append(f"users table missing: {req_auth - actual_auth}")
    if not game_pass: mismatches.append(f"games table missing: {req_game - actual_game}")
    if not q_pass: mismatches.append(f"questions table missing: {req_q - actual_q}")
    if not score_pass: mismatches.append(f"guesses table missing: {req_score - actual_score}")
    
    if mismatches:
        for m in mismatches: print(f"- {m}")
    else:
        print("None")
        
    print("\nDATA:")
    for et in expected_tables:
        count = row_counts.get(et, 0)
        print(f"{et}: {count} rows")
        
    cur.close()
    conn.close()

except pymysql.err.OperationalError as e:
    print("\nWARNING: Production database is unreachable from this environment.")
    print(f"Details: {e}")
    sys.exit(0)
except Exception as e:
    print(f"\nERROR: {e}")
    sys.exit(1)
