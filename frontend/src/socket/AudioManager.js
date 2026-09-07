// AudioManager.js
import { EventEmitter } from 'eventemitter3';
import api from '../services/api';

class AudioManager extends EventEmitter {
  constructor() {
    super();
    this.sounds = {};
    this.bgmAudio = new Audio();
    this.bgmAudio.loop = true;
    this.hostAudio = new Audio();
    this.mobileAudioUnlocked = false;
    
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
      const res = await api.get('/sounds');
      const activeSounds = res.data.filter(s => s.is_active);
        
      activeSounds.forEach(s => {
        if (s.category === 'Background Music') {
           if (this.bgmAudio.src !== s.file_url) {
             this.bgmAudio.src = s.file_url;
             if (this.prefs.bgmEnabled && !this.prefs.muted) {
               this.bgmAudio.play().catch(e => console.warn('BGM auto-play blocked', e));
             }
           }
        } else {
           this.sounds[s.category] = s.file_url;
        }
      });
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

  playHostAudio(url, volume, serverTime, playbackPosition = 0) {
    if (this.lastCommandTime && serverTime) {
       const newTime = new Date(serverTime.endsWith('Z') ? serverTime : serverTime + 'Z').getTime();
       if (newTime < this.lastCommandTime) return; // Prevent race conditions
       this.lastCommandTime = newTime;
    } else if (serverTime) {
       this.lastCommandTime = new Date(serverTime.endsWith('Z') ? serverTime : serverTime + 'Z').getTime();
    }

    if (this.hostAudio.src !== url && new URL(url, window.location.origin).href !== this.hostAudio.src) {
      this.hostAudio.pause();
      this.hostAudio.src = url;
      this.hostAudio.load(); // Flush buffer and prep new mobile stream
    }
    this.hostAudio.volume = volume;
    
    let timeOffset = 0;
    if (serverTime) {
      const serverZ = serverTime.endsWith('Z') ? serverTime : serverTime + 'Z';
      const offsetMs = Date.now() - new Date(serverZ).getTime();
      if (offsetMs > 0 && offsetMs < 30000) {
        timeOffset = offsetMs / 1000;
      }
    }
    
    const targetTime = playbackPosition + timeOffset;
    if (targetTime > 0 && Number.isFinite(targetTime)) {
       // Only set currentTime if it's safe to do so
       if (this.hostAudio.readyState >= 1) { // HAVE_METADATA
         this.hostAudio.currentTime = Math.min(targetTime, this.hostAudio.duration || targetTime);
       } else {
         this.hostAudio.addEventListener('loadedmetadata', () => {
             this.hostAudio.currentTime = Math.min(targetTime, this.hostAudio.duration || targetTime);
         }, { once: true });
       }
    }
    
    this.hostAudio.play().catch(e => {
      console.warn('Host audio blocked', e);
      this.emit('autoplay_blocked');
    });
  }
  
  pauseHostAudio(serverTime, playbackPosition = 0) {
    if (this.lastCommandTime && serverTime) {
       const newTime = new Date(serverTime.endsWith('Z') ? serverTime : serverTime + 'Z').getTime();
       if (newTime < this.lastCommandTime) return;
       this.lastCommandTime = newTime;
    }
    if (this.hostAudio) {
      this.hostAudio.pause();
      if (playbackPosition >= 0 && Number.isFinite(playbackPosition)) {
         if (this.hostAudio.readyState >= 1) {
           this.hostAudio.currentTime = playbackPosition;
         } else {
           this.hostAudio.addEventListener('loadedmetadata', () => {
             this.hostAudio.currentTime = playbackPosition;
           }, { once: true });
         }
      }
    }
  }
  
  resumeHostAudio(serverTime, playbackPosition) {
    if (this.hostAudio) {
       this.playHostAudio(this.hostAudio.src, this.hostAudio.volume, serverTime, playbackPosition);
    }
  }
  
  unlockMobileAudio() {
    return new Promise((resolve) => {
      this.hostAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      this.hostAudio.play().then(() => {
        this.hostAudio.pause();
        this.mobileAudioUnlocked = true;
        resolve(true);
      }).catch(e => {
        console.warn('Unlock explicitly failed:', e);
        resolve(false);
      });
    });
  }

  resumeBlockedAudio() {
    if (this.hostAudio && this.hostAudio.src && this.hostAudio.paused) {
      this.hostAudio.play().catch(e => console.warn('Audio unlock failed', e));
    }
  }
  
  stopHostAudio(serverTime) {
    if (this.lastCommandTime && serverTime) {
       const newTime = new Date(serverTime.endsWith('Z') ? serverTime : serverTime + 'Z').getTime();
       if (newTime < this.lastCommandTime) return;
       this.lastCommandTime = newTime;
    } else if (serverTime) {
       this.lastCommandTime = new Date(serverTime.endsWith('Z') ? serverTime : serverTime + 'Z').getTime();
    }
    if (this.hostAudio) {
      this.hostAudio.pause();
      this.hostAudio.currentTime = 0;
      this.hostAudio = null;
    }
  }
  
  setHostAudioVolume(volume) {
    if (this.hostAudio) {
      this.hostAudio.volume = volume;
    }
  }

  getHostAudioCurrentTime() {
    return this.hostAudio ? this.hostAudio.currentTime : 0;
  }
}

const audioManager = new AudioManager();
export default audioManager;
