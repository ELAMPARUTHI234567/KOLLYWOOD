import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Link2,
  House,
  Gamepad2,
  Users,
  Trophy,
  CircleHelp,
  MessageCircle,
  Clapperboard,
  ClipboardList,
  History,
  Settings,
  Music,
  Menu,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import './Sidebar.css';

const PRIMARY_NAV = [
  { id: 'join', label: 'Join Game', path: '/join', icon: Link2, desc: 'Join via Game ID' },
  { id: 'home', label: 'Home', path: '/', icon: House, desc: 'Main Dashboard' },
  { id: 'create', label: 'Create Game', path: '/create', icon: Gamepad2, desc: 'Host a Multiplayer Game' },
  { id: 'picture-games', label: 'Picture Games', path: '/create', icon: ImageIcon, desc: 'Setup Picture Game' },
  { id: 'players', label: 'Players', path: '/players', icon: Users, desc: 'View Room Players' },
  { id: 'leaderboard', label: 'Leaderboard', path: '/leaderboard', icon: Trophy, desc: 'Rankings & Scores' },
];

const SECONDARY_NAV = [
  { id: 'questions', label: 'Questions', path: '/questions', icon: CircleHelp, desc: 'Submitted Questions' },
  { id: 'chat', label: 'Chat', path: '/chat', icon: MessageCircle, desc: 'Live Game Chat' },
  { id: 'movies', label: 'Movies', path: '/movies', icon: Clapperboard, desc: 'Kollywood Movie Hub' },
  { id: 'sounds', label: 'Sounds', path: '/sounds', icon: Music, desc: 'Audio Management' },
  { id: 'my-games', label: 'My Games', path: '/my-games', icon: ClipboardList, desc: 'Your Game Sessions' },
  { id: 'history', label: 'Game History', path: '/history', icon: History, desc: 'Match History & Results' },
  { id: 'settings', label: 'Settings', path: '/settings', icon: Settings, desc: 'Game & Audio Settings' },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMoreOpen(false);
  }, [location.pathname]);

  // Determine if a path is currently active
  const isPathActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* ===================== DESKTOP FIXED SIDEBAR ===================== */}
      <aside className="sidebar-desktop" aria-label="Main Navigation">
        {/* Compact Logo */}
        <div className="sidebar-logo-container">
          <button
            type="button"
            className="sidebar-logo-btn"
            onClick={() => navigate('/')}
            title="KOLLOYWOOD Home"
            aria-label="KOLLOYWOOD Home"
          >
            <span className="sidebar-logo-mark">K</span>
            <div className="sidebar-logo-glow" />
          </button>
        </div>

        {/* Primary Navigation */}
        <nav className="sidebar-nav-group">
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const active = isPathActive(item.path);
            return (
              <div key={item.id} className="sidebar-item-wrapper">
                <NavLink
                  to={item.path}
                  className={`sidebar-icon-link ${active ? 'sidebar-icon-link--active' : ''}`}
                  aria-label={item.label}
                >
                  <Icon className="sidebar-icon" size={20} strokeWidth={active ? 2.3 : 1.9} />
                  <span className="sidebar-label">{item.label}</span>
                </NavLink>
              </div>
            );
          })}
        </nav>

        {/* Subtle Section Divider */}
        <div className="sidebar-divider" role="separator" />

        {/* Secondary Navigation */}
        <nav className="sidebar-nav-group">
          {SECONDARY_NAV.map((item) => {
            const Icon = item.icon;
            const active = isPathActive(item.path);
            return (
              <div key={item.id} className="sidebar-item-wrapper">
                <NavLink
                  to={item.path}
                  className={`sidebar-icon-link ${active ? 'sidebar-icon-link--active' : ''}`}
                  aria-label={item.label}
                >
                  <Icon className="sidebar-icon" size={20} strokeWidth={active ? 2.3 : 1.9} />
                  <span className="sidebar-label">{item.label}</span>
                </NavLink>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* ===================== MOBILE BOTTOM NAVIGATION ===================== */}
      <nav className="sidebar-mobile-bottom" aria-label="Mobile Navigation">
        <NavLink
          to="/"
          className={`mobile-nav-btn ${isPathActive('/') ? 'mobile-nav-btn--active' : ''}`}
        >
          <House size={20} />
          <span className="mobile-nav-label">Home</span>
        </NavLink>

        <NavLink
          to="/join"
          className={`mobile-nav-btn ${isPathActive('/join') ? 'mobile-nav-btn--active' : ''}`}
        >
          <Link2 size={20} />
          <span className="mobile-nav-label">Join</span>
        </NavLink>

        <NavLink
          to="/create"
          className={`mobile-nav-btn ${isPathActive('/create') ? 'mobile-nav-btn--active' : ''}`}
        >
          <Gamepad2 size={20} />
          <span className="mobile-nav-label">Create</span>
        </NavLink>

        <NavLink
          to="/leaderboard"
          className={`mobile-nav-btn ${isPathActive('/leaderboard') ? 'mobile-nav-btn--active' : ''}`}
        >
          <Trophy size={20} />
          <span className="mobile-nav-label">Ranks</span>
        </NavLink>

        <button
          type="button"
          className={`mobile-nav-btn ${isMobileMoreOpen ? 'mobile-nav-btn--active' : ''}`}
          onClick={() => setIsMobileMoreOpen((prev) => !prev)}
          aria-expanded={isMobileMoreOpen}
          aria-label="More Menu"
        >
          {isMobileMoreOpen ? <X size={20} /> : <Menu size={20} />}
          <span className="mobile-nav-label">More</span>
        </button>
      </nav>

      {/* ===================== MOBILE "MORE" SLIDE-UP DRAWER ===================== */}
      {isMobileMoreOpen && (
        <div className="mobile-drawer-overlay animate-fadeIn" onClick={() => setIsMobileMoreOpen(false)}>
          <div
            className="mobile-drawer-sheet animate-slideUp"
            onClick={(e) => e.stopPropagation()}
            aria-label="Additional Navigation"
          >
            <div className="mobile-drawer-handle" />
            <div className="mobile-drawer-header">
              <span className="mobile-drawer-title">KOLLOYWOOD Menu</span>
              <button
                type="button"
                className="mobile-drawer-close"
                onClick={() => setIsMobileMoreOpen(false)}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mobile-drawer-grid">
              {[...PRIMARY_NAV.slice(3), ...SECONDARY_NAV].map((item) => {
                const Icon = item.icon;
                const active = isPathActive(item.path);
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    className={`mobile-drawer-item ${active ? 'mobile-drawer-item--active' : ''}`}
                    onClick={() => setIsMobileMoreOpen(false)}
                  >
                    <div className="mobile-drawer-icon-wrap">
                      <Icon size={22} />
                    </div>
                    <span className="mobile-drawer-item-title">{item.label}</span>
                    <span className="mobile-drawer-item-desc">{item.desc}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
