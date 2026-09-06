import os
import requests
import uuid
import re
from urllib.parse import urlparse

def get_supabase_config():
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    bucket = os.environ.get("SUPABASE_STORAGE_BUCKET")
    return supabase_url, supabase_key, bucket
    
def secure_filename(filename):
    """Basic secure filename generator similar to werkzeug's."""
    filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)
    return filename.strip('_')

def upload_file_to_supabase(file_stream, filename, content_type):
    """
    Uploads a file stream to Supabase storage.
    Returns the public URL of the uploaded file on success.
    Raises Exception on failure.
    """
    url, key, bucket = get_supabase_config()
    
    if not url or not key or not bucket:
        raise Exception("Supabase storage is not configured. Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_STORAGE_BUCKET.")
        
    safe_name = secure_filename(filename)
    unique_name = f"sounds/{uuid.uuid4()}-{safe_name}"
    
    # Supabase Storage Upload API
    upload_url = f"{url}/storage/v1/object/{bucket}/{unique_name}"
    
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": content_type
    }
    
    # Send the request
    response = requests.post(upload_url, headers=headers, data=file_stream)
    
    if response.status_code >= 400:
        raise Exception(f"Failed to upload to Supabase: {response.text}")
        
    # Return public URL
    public_url = f"{url}/storage/v1/object/public/{bucket}/{unique_name}"
    return public_url, unique_name

def delete_file_from_supabase(path_or_url):
    """
    Deletes a file from Supabase storage using its full URL or path.
    """
    url, key, bucket = get_supabase_config()
    if not url or not key or not bucket:
        return False
        
    # Extract path if full URL provided
    path = path_or_url
    if "storage/v1/object/public/" in path_or_url:
        parsed = urlparse(path_or_url)
        path_part = parsed.path.split(f"object/public/{bucket}/")
        if len(path_part) > 1:
            path = path_part[1]
            
    delete_url = f"{url}/storage/v1/object/{bucket}/{path}"
    headers = {
        "Authorization": f"Bearer {key}",
    }
    
    try:
        response = requests.delete(delete_url, headers=headers)
        return response.status_code < 400
    except Exception:
        return False
