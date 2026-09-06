import os
import sys
import runpy

print("=" * 60)
print("RAILWAY PROXY WRAPPER: Re-routing to public TCP proxy...")
print("=" * 60)

# Overwrite the internal network host with the public TCP proxy
os.environ['MYSQLHOST'] = 'trolley.proxy.rlwy.net'
os.environ['MYSQLPORT'] = '25136'

# Remove URL env vars that might trick config.py into using the internal mesh
keys_to_remove = [k for k in os.environ if 'URL' in k.upper()]
for k in keys_to_remove:
    os.environ.pop(k, None)

# Force MySQL mode
os.environ['USE_SQLITE'] = 'false'
# Pretend to be in production so it doesn't fall back to localhost
os.environ['RAILWAY_ENVIRONMENT'] = 'production'

target_script = sys.argv[1]
sys.argv = [target_script] + sys.argv[2:]

runpy.run_path(target_script, run_name='__main__')
