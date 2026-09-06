"""List Railway env vars relevant to MySQL — masks password."""
import os
tags = ['MYSQL', 'PUBLIC', 'PRIVATE', 'HOST', 'PORT', 'DATABASE', 'DB_']
sensitive = ['PASS', 'SECRET', 'KEY', 'TOKEN']

for k, v in sorted(os.environ.items()):
    if any(t in k.upper() for t in tags):
        if any(s in k.upper() for s in sensitive):
            print(f"{k} = [HIDDEN, len={len(v)}]")
        else:
            print(f"{k} = {v[:100]}")
