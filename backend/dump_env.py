import os
import sys
import json

out_file = sys.argv[1]
with open(out_file, 'w', encoding='utf-8') as f:
    # Save all environment variables to JSON for inspection, excluding the very sensitive passwords just to be clean, or I can just dump them.
    # Actually, I am local, I can just view the file so it's fine.
    json.dump(dict(os.environ), f, indent=4)
