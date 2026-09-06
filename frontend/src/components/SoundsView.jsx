import React, { useState, useEffect, useRef } from 'react';
import { Music, Plus, X, Search, Edit2, Trash2, Play, Square, Pause } from 'lucide-react';

export default function SoundsView() {
  const [sounds, setSounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '', category: 'Background Music', description: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(new Audio());

  const token = sessionStorage.getItem('kw_token');
  const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const fetchSounds = async () => {
    try {
      const res = await fetch(`${VITE_BACKEND_URL}/api/sounds`);
      if (res.ok) {
        setSounds(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSounds();
    return () => {
      audioRef.current.pause();
    };
  }, []);

  const handlePlay = (id, url) => {
    if (playingId === id) {
      audioRef.current.pause();
      setPlayingId(null);
    } else {
      audioRef.current.src = url;
      audioRef.current.play().catch(e => console.error("Audio block:", e));
      setPlayingId(id);
      audioRef.current.onended = () => setPlayingId(null);
    }
  };

  const handleStop = () => {
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setPlayingId(null);
  };

  const handleQuickAdd = async () => {
    try {
      const res = await fetch(`${VITE_BACKEND_URL}/api/sounds/quick-sample`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchSounds();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    setUploadError('');
    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }
    
    // Validate File Size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size must be under 5MB');
      e.target.value = '';
      return;
    }
    
    // Validate Type
    const allowed = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/x-wav'];
    if (!allowed.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg)$/i)) {
      setUploadError('Only MP3, WAV, or OGG files are allowed');
      e.target.value = '';
      return;
    }
    
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleAddSound = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select an audio file first');
      return;
    }
    
    setUploading(true);
    setUploadError('');
    
    const data = new FormData();
    data.append('file', selectedFile);
    data.append('name', formData.name);
    data.append('category', formData.category);
    data.append('description', formData.description);

    try {
      const res = await fetch(`${VITE_BACKEND_URL}/api/sounds/upload`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`
        },
        body: data
      });
      if (res.ok) {
        setShowAddForm(false);
        setFormData({ name: '', category: 'Background Music', description: '' });
        setSelectedFile(null);
        setPreviewUrl(null);
        fetchSounds();
      } else {
        const err = await res.json();
        setUploadError(err.error || 'Failed to add sound');
      }
    } catch (err) {
      console.error(err);
      setUploadError('Network error during upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this sound?')) return;
    if (playingId === id) handleStop();
    try {
      const res = await fetch(`${VITE_BACKEND_URL}/api/sounds/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchSounds();
    } catch (err) {
      console.error(err);
    }
  };

  const CATEGORIES = [
    'Background Music', 'Game Start', 'New Question', 'Clue Released', 
    'Correct Answer', 'Wrong Answer', 'Timer Warning', 'Time Expired', 'Game Complete'
  ];

  return (
    <div className="hub-card animate-fadeIn">
      <div className="hub-card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Music className="hub-card__icon text-blue" size={28} />
          <div>
            <h2 className="hub-card__title">Sounds / Music Management</h2>
            <p className="hub-card__subtitle">Audio configuration for game effects and BGM</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline btn-sm" onClick={handleQuickAdd}>Quick Add Sample</button>
          <button className="btn btn-purple btn-sm" onClick={() => setShowAddForm(true)}>
            <Plus size={16} /> Add Sound
          </button>
        </div>
      </div>

      <div style={{ padding: '1rem', background: 'rgba(255,165,0,0.1)', border: '1px solid rgba(255,165,0,0.3)', borderRadius: '8px', marginBottom: '1.5rem' }}>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          <strong>Note on Audio Storage:</strong> Audio files must be uploaded to an external storage provider (like AWS S3 or Supabase Storage) first, and the URL is provided here. Do not upload large MP3s directly to the MySQL database.
        </p>
      </div>

      {showAddForm && (
        <div className="hub-session-box mb-4 animate-fadeIn" style={{ border: '1px solid var(--purple-main)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h3 className="hub-section-title">Add New Sound</h3>
            <button className="btn-close" onClick={() => {
              setShowAddForm(false);
              setSelectedFile(null);
              setPreviewUrl(null);
              setUploadError('');
            }} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={20}/></button>
          </div>
          <form className="auth-form" style={{ marginTop: '1rem' }} onSubmit={handleAddSound}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Sound Name *</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Category *</label>
                <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ padding: '0.8rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', width: '100%' }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Choose Audio File * (MP3, WAV, OGG - Max 5MB)</label>
              <input type="file" accept="audio/mpeg,audio/wav,audio/ogg,.mp3,.wav,.ogg" required onChange={handleFileSelect} style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white' }} />
            </div>
            
            {previewUrl && (
              <div style={{ margin: '1rem 0', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Audio Preview:</p>
                <audio controls src={previewUrl} style={{ width: '100%', height: '40px' }}></audio>
              </div>
            )}
            
            <div className="form-group">
              <label>Description</label>
              <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            
            {uploadError && <p className="animate-shake" style={{ color: '#ff4d4f', fontSize: '0.9rem', margin: '0.5rem 0' }}>{uploadError}</p>}
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-gold w-100" disabled={uploading}>
                {uploading ? '⏳ Uploading...' : 'Save Sound'}
              </button>
              <button type="button" className="btn btn-outline w-100" disabled={uploading} onClick={() => {
                setShowAddForm(false);
                setSelectedFile(null);
                setPreviewUrl(null);
                setUploadError('');
              }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p>Loading sounds...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {sounds.map(s => (
            <div key={s.id} className="hub-session-box" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="badge badge-purple mb-2" style={{ fontSize: '0.7rem' }}>{s.category}</div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{s.name}</h4>
                  {s.description && <p style={{ fontSize: '0.8rem', color: 'gray', margin: '0.3rem 0' }}>{s.description}</p>}
                </div>
                {s.is_sample && <div className="badge" style={{ background: '#222', fontSize: '0.7rem' }}>Sample</div>}
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', alignItems: 'center' }}>
                <button className="btn btn-gold btn-sm" style={{ padding: '0.4rem', borderRadius: '50%' }} onClick={() => handlePlay(s.id, s.file_url)}>
                  {playingId === s.id ? <Pause size={16}/> : <Play size={16}/>}
                </button>
                <button className="btn btn-outline btn-sm" style={{ padding: '0.4rem', borderRadius: '50%' }} onClick={handleStop}>
                  <Square size={16}/>
                </button>
                
                <div style={{ flex: 1 }}></div>
                
                <button className="btn btn-outline btn-sm" style={{ padding: '0.3rem', color: '#ff4d4f', borderColor: '#ff4d4f' }} onClick={() => handleDelete(s.id)}>
                  <Trash2 size={14}/>
                </button>
              </div>
            </div>
          ))}
          {sounds.length === 0 && <p style={{ gridColumn: '1 / -1', textAlign: 'center', opacity: 0.5 }}>No sounds added yet.</p>}
        </div>
      )}
    </div>
  );
}
