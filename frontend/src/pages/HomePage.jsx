import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

export default function HomePage() {
  const navigate = useNavigate();

  // Floating particles effect
  useEffect(() => {
    const container = document.querySelector('.home-particles');
    if (!container) return;
    const emojis = ['🎬', '🎭', '🎵', '⭐', '🏆', '🎪', '🎨', '🎤'];
    const particles = [];
    for (let i = 0; i < 12; i++) {
      const el = document.createElement('div');
      el.className = 'particle';
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      el.style.left = `${Math.random() * 100}%`;
      el.style.animationDuration = `${8 + Math.random() * 8}s`;
      el.style.animationDelay = `${Math.random() * 6}s`;
      el.style.fontSize = `${1 + Math.random() * 1.2}rem`;
      el.style.opacity = '0';
      container.appendChild(el);
      particles.push(el);
    }
    return () => particles.forEach(p => p.remove());
  }, []);

  return (
    <div className="home-page">
      <div className="home-particles" aria-hidden="true" />

      {/* Cinematic Background */}
      <div className="home-bg" aria-hidden="true">
        <div className="home-bg__orb home-bg__orb--1" />
        <div className="home-bg__orb home-bg__orb--2" />
        <div className="home-bg__orb home-bg__orb--3" />
        <div className="home-bg__grid" />
      </div>

      <main className="home-content">
        {/* Logo */}
        <div className="home-logo animate-fadeIn">
          <div className="home-logo__icon">🎬</div>
          <h1 className="home-title logo-text">KOLLOYWOOD</h1>
          <p className="home-subtitle">The Ultimate Kollywood Movie Guessing Game</p>
          <div className="home-tags">
            <span className="home-tag">🎭 Movies</span>
            <span className="home-tag">🎵 Songs</span>
            <span className="home-tag">👨 Heroes</span>
            <span className="home-tag">👩 Heroines</span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="home-cta animate-slideInUp stagger">
          <button
            className="btn btn-gold btn-lg home-btn"
            onClick={() => navigate('/create')}
            id="btn-create-game"
          >
            <span>🎮</span>
            CREATE GAME
          </button>
          <button
            className="btn btn-purple btn-lg home-btn"
            onClick={() => navigate('/join')}
            id="btn-join-game"
          >
            <span>🚪</span>
            JOIN GAME
          </button>
        </div>

        {/* Features */}
        <div className="home-features animate-fadeIn">
          <div className="home-feature">
            <span className="home-feature__icon">👥</span>
            <span className="home-feature__text">Up to 30 Players</span>
          </div>
          <div className="home-feature">
            <span className="home-feature__icon">⚡</span>
            <span className="home-feature__text">Real-time Multiplayer</span>
          </div>
          <div className="home-feature">
            <span className="home-feature__icon">🎯</span>
            <span className="home-feature__text">Guess the Movie</span>
          </div>
          <div className="home-feature">
            <span className="home-feature__icon">⏱</span>
            <span className="home-feature__text">Timed Clues</span>
          </div>
        </div>

        <p className="home-tagline">"Kollywood is not just cinema, it's an emotion!"</p>
      </main>
    </div>
  );
}
