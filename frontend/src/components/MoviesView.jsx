import React, { useState, useEffect } from 'react';
import { Clapperboard, Plus, X, Search, Edit2, Trash2 } from 'lucide-react';

export default function MoviesView() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    movie_name: '', release_year: '', genre: '', director: '', 
    hero: '', heroine: '', song: '', description: '', poster_url: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  const token = sessionStorage.getItem('kw_token');

  const fetchMovies = async () => {
    try {
      const res = await fetch(`${VITE_BACKEND_URL}/api/movies`);
      if (res.ok) {
        setMovies(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  const handleQuickAdd = async () => {
    try {
      const res = await fetch(`${VITE_BACKEND_URL}/api/movies/quick-sample`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchMovies();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMovie = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${VITE_BACKEND_URL}/api/movies`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowAddForm(false);
        setFormData({
          movie_name: '', release_year: '', genre: '', director: '', 
          hero: '', heroine: '', song: '', description: '', poster_url: ''
        });
        fetchMovies();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to add movie');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this movie?')) return;
    try {
      const res = await fetch(`${VITE_BACKEND_URL}/api/movies/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchMovies();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredMovies = movies.filter(m => {
    const matchesSearch = m.movie_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGenre = genreFilter ? m.genre.toLowerCase().includes(genreFilter.toLowerCase()) : true;
    const matchesYear = yearFilter ? m.release_year.toString() === yearFilter : true;
    return matchesSearch && matchesGenre && matchesYear;
  });

  const uniqueGenres = [...new Set(movies.map(m => m.genre).filter(Boolean))];
  const uniqueYears = [...new Set(movies.map(m => m.release_year).filter(Boolean))].sort((a,b)=>b-a);

  return (
    <div className="hub-card animate-fadeIn">
      <div className="hub-card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Clapperboard className="hub-card__icon text-gold" size={28} />
          <div>
            <h2 className="hub-card__title">Movies / Cinema Management</h2>
            <p className="hub-card__subtitle">Kollywood Cinema database for games</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline btn-sm" onClick={handleQuickAdd}>Quick Add Sample</button>
          <button className="btn btn-purple btn-sm" onClick={() => setShowAddForm(true)}>
            <Plus size={16} /> Add Movie
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="hub-session-box mb-4 animate-fadeIn" style={{ border: '1px solid var(--purple-main)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h3 className="hub-section-title">Add New Movie</h3>
            <button className="btn-close" onClick={() => setShowAddForm(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={20}/></button>
          </div>
          <form className="auth-form" style={{ marginTop: '1rem' }} onSubmit={handleAddMovie}>
            <div className="form-group">
              <label>Movie Name *</label>
              <input type="text" required value={formData.movie_name} onChange={e => setFormData({...formData, movie_name: e.target.value})} />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Release Year *</label>
                <input type="number" required value={formData.release_year} onChange={e => setFormData({...formData, release_year: parseInt(e.target.value)})} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Genre *</label>
                <input type="text" required value={formData.genre} onChange={e => setFormData({...formData, genre: e.target.value})} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Director</label>
                <input type="text" value={formData.director} onChange={e => setFormData({...formData, director: e.target.value})} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Hero / Lead Actor</label>
                <input type="text" value={formData.hero} onChange={e => setFormData({...formData, hero: e.target.value})} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Heroine / Lead Actress</label>
                <input type="text" value={formData.heroine} onChange={e => setFormData({...formData, heroine: e.target.value})} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Song</label>
                <input type="text" value={formData.song} onChange={e => setFormData({...formData, song: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '0.8rem', borderRadius: '8px', minHeight: '60px' }}></textarea>
            </div>
            <div className="form-group">
              <label>Poster URL</label>
              <input type="url" value={formData.poster_url} onChange={e => setFormData({...formData, poster_url: e.target.value})} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-gold w-100">Save Movie</button>
              <button type="button" className="btn btn-outline w-100" onClick={() => setShowAddForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '10px', top: '12px', color: 'rgba(255,255,255,0.5)' }} />
          <input 
            type="text" 
            placeholder="Search movie name..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.2rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white' }}
          />
        </div>
        <select value={genreFilter} onChange={e => setGenreFilter(e.target.value)} style={{ padding: '0.6rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white' }}>
          <option value="">All Genres</option>
          {uniqueGenres.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} style={{ padding: '0.6rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white' }}>
          <option value="">All Years</option>
          {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? (
        <p>Loading movies...</p>
      ) : (
        <div className="hub-movies-grid">
          {filteredMovies.map(m => (
            <div key={m.id} className="hub-movie-card" style={{ position: 'relative' }}>
              {m.is_sample && <div className="hub-movie-badge" style={{ backgroundColor: '#222' }}>Sample</div>}
              {!m.is_sample && <div className="hub-movie-badge">{m.genre}</div>}
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                {m.poster_url ? (
                  <img src={m.poster_url} alt={m.movie_name} style={{ width: '60px', height: '80px', objectFit: 'cover', borderRadius: '4px' }} />
                ) : (
                  <div style={{ width: '60px', height: '80px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎬</div>
                )}
                <div>
                  <h4 className="hub-movie-title" style={{ margin: 0 }}>{m.movie_name} ({m.release_year})</h4>
                  <p className="hub-movie-detail mb-0" style={{ fontSize: '0.8rem', opacity: 0.8 }}>🎬 Dir: {m.director || 'N/A'}</p>
                  <p className="hub-movie-detail mb-0" style={{ fontSize: '0.8rem', opacity: 0.8 }}>⭐ Hero: {m.hero || 'N/A'}, Heroine: {m.heroine || 'N/A'}</p>
                  <p className="hub-movie-detail mb-0" style={{ fontSize: '0.8rem', opacity: 0.8 }}>🎵 Song: {m.song || 'N/A'}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.8rem' }}>
                <button className="btn btn-outline btn-sm" style={{ flex: 1, padding: '0.2rem' }}>Details</button>
                <button className="btn btn-outline btn-sm" style={{ padding: '0.2rem' }}><Edit2 size={14}/></button>
                <button className="btn btn-outline btn-sm" style={{ padding: '0.2rem', color: '#ff4d4f', borderColor: '#ff4d4f' }} onClick={() => handleDelete(m.id)}><Trash2 size={14}/></button>
              </div>
            </div>
          ))}
          {filteredMovies.length === 0 && <p style={{ gridColumn: '1 / -1', textAlign: 'center', opacity: 0.5 }}>No movies found matching the criteria.</p>}
        </div>
      )}
    </div>
  );
}
