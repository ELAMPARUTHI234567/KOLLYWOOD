// AudioManager.js
import { EventEmitter } from 'eventemitter3';

class AudioManager extends EventEmitter {
  constructor() {
    super();
    this.sounds = {};
    this.bgmAudio = new Audio();
    this.bgmAudio.loop = true;
    
    this.prefs = {
      masterVolume: 1.0,
      musicVolume: 0.5,
      effectsVolume: 0.8,
      bgmEnabled: true,
      sfxEnabled: true,
      muted: false
    };

    // Load preferences
    const stored = localStorage.getItem('kw_audio_prefs');
    if (stored) {
      try {
        this.prefs = { ...this.prefs, ...JSON.parse(stored) };
      } catch (e) {}
    }

    this.updateVolumes();
  }

  savePrefs() {
    localStorage.setItem('kw_audio_prefs', JSON.stringify(this.prefs));
    this.updateVolumes();
    this.emit('prefs_updated', this.prefs);
  }

  updateVolumes() {
    const effMaster = this.prefs.muted ? 0 : this.prefs.masterVolume;
    this.bgmAudio.volume = effMaster * (this.prefs.bgmEnabled ? this.prefs.musicVolume : 0);
  }

  setPref(key, value) {
    this.prefs[key] = value;
    this.savePrefs();
    
    if (key === 'bgmEnabled' || key === 'muted' || key === 'masterVolume' || key === 'musicVolume') {
      if (!this.prefs.bgmEnabled || this.prefs.muted) {
        this.bgmAudio.pause();
      } else if (this.bgmAudio.src) {
        this.bgmAudio.play().catch(e => console.warn('BGM Blocked by browser auto-play policy'));
      }
    }
  }

  async loadSounds() {
    try {
      const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const res = await fetch(`${VITE_BACKEND_URL}/api/sounds`);
      if (res.ok) {
        const data = await res.json();
        const activeSounds = data.filter(s => s.is_active);
        
        activeSounds.forEach(s => {
          if (s.category === 'Background Music') {
             // Avoid restarting if it's the same URL
             if (this.bgmAudio.src !== s.file_url) {
               this.bgmAudio.src = s.file_url;
               if (this.prefs.bgmEnabled && !this.prefs.muted) {
                 this.bgmAudio.play().catch(e => console.warn('BGM auto-play blocked', e));
               }
             }
          } else {
             // Cache effect URL
             this.sounds[s.category] = s.file_url;
          }
        });
      }
    } catch (e) {
      console.error('Failed to load sounds', e);
    }
  }

  playEffect(category) {
    if (!this.prefs.sfxEnabled || this.prefs.muted) return;
    const url = this.sounds[category];
    if (url) {
      const audio = new Audio(url);
      audio.volume = this.prefs.masterVolume * this.prefs.effectsVolume;
      audio.play().catch(e => console.warn('Audio auto-play blocked', e));
    }
  }
}

const audioManager = new AudioManager();
export default audioManager;
