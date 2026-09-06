import React, { useState, useEffect } from 'react';
import { Trophy, ChevronDown, ListOrdered, BarChart, History } from 'lucide-react';
import { getAvatarEmoji } from '../components/avatars';

export default function LeaderboardView() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('all');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerStats, setPlayerStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${VITE_BACKEND_URL}/api/leaderboard?filter=${timeFilter}`);
      if (res.ok) {
        setLeaderboard(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [timeFilter]);

  const fetchPlayerStats = async (userId) => {
    setLoadingStats(true);
    try {
      const res = await fetch(`${VITE_BACKEND_URL}/api/leaderboard/${userId}/stats`);
      if (res.ok) {
        setPlayerStats(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handlePlayerClick = (user) => {
    setSelectedPlayer(user);
    setPlayerStats(null);
    fetchPlayerStats(user.user_id);
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return <span className="podium-emoji">🥇</span>;
    if (rank === 2) return <span className="podium-emoji">🥈</span>;
    if (rank === 3) return <span className="podium-emoji">🥉</span>;
    return <span style={{ width: '30px', display: 'inline-block', textAlign: 'center', fontSize: '1.2rem', color: '#888', fontWeight: 'bold' }}>#{rank}</span>;
  };

  if (selectedPlayer) {
    return (
      <div className="hub-card animate-fadeIn">
        <div className="hub-card__header">
          <BarChart className="hub-card__icon text-blue" size={28} />
          <div>
            <h2 className="hub-card__title">Player Statistics</h2>
            <p className="hub-card__subtitle">{selectedPlayer.name}'s Kollywood Performance</p>
          </div>
        </div>
        
        <button className="btn btn-outline btn-sm mb-4" onClick={() => setSelectedPlayer(null)}>
          ← Back to Leaderboard
        </button>

        {loadingStats || !playerStats ? (
          <p>Loading stats...</p>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: '12px' }}>
              <div style={{ fontSize: '4rem' }}>{getAvatarEmoji(playerStats.avatar_id)}</div>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem' }}>{playerStats.name}</h3>
                <div className="badge badge-gold">Global Rank: {playerStats.rank}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '2rem' }}>
              <div className="hub-session-box" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', color: 'var(--gold-main)', fontWeight: 'bold' }}>{playerStats.total_points}</div>
                <div style={{ fontSize: '0.8rem', color: 'gray' }}>Total Points</div>
              </div>
              <div className="hub-session-box" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', color: 'var(--purple-light)', fontWeight: 'bold' }}>{playerStats.games_played}</div>
                <div style={{ fontSize: '0.8rem', color: 'gray' }}>Games Played</div>
              </div>
              <div className="hub-session-box" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', color: '#4ade80', fontWeight: 'bold' }}>{playerStats.correct_answers}</div>
                <div style={{ fontSize: '0.8rem', color: 'gray' }}>Correct Answers</div>
              </div>
              <div className="hub-session-box" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', color: '#60a5fa', fontWeight: 'bold' }}>{playerStats.best_score}</div>
                <div style={{ fontSize: '0.8rem', color: 'gray' }}>Best Score</div>
              </div>
            </div>

            <h3 className="hub-section-title" style={{ marginTop: '2rem' }}>Recent Games</h3>
            {playerStats.recent_games.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {playerStats.recent_games.map((g, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                    <div>
                      <strong>Room: {g.game_code}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'gray' }}>{new Date(g.date).toLocaleDateString()}</div>
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--gold-main)' }}>
                      {g.score} pts
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'gray' }}>No recent games found.</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="hub-card animate-fadeIn">
      <div className="hub-card__header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Trophy className="hub-card__icon text-gold" size={28} />
          <div>
            <h2 className="hub-card__title">Global Rankings</h2>
            <p className="hub-card__subtitle">Official Kollywood Game scores</p>
          </div>
        </div>
        
        <select value={timeFilter} onChange={e => setTimeFilter(e.target.value)} style={{ padding: '0.6rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', alignSelf: 'center' }}>
          <option value="all">All Time</option>
          <option value="month">This Month</option>
          <option value="week">This Week</option>
        </select>
      </div>

      {loading ? (
        <p>Loading leaderboard...</p>
      ) : leaderboard.length === 0 ? (
        <div className="hub-empty-state">
          <p>No players have completed a game yet.</p>
        </div>
      ) : (
        <div>
          {/* Top 3 Podium */}
          {leaderboard.length >= 3 && (
            <div className="hub-podium" style={{ marginBottom: '2rem' }}>
              <div className="hub-podium-slot rank-2" onClick={() => handlePlayerClick(leaderboard[1])} style={{ cursor: 'pointer' }}>
                <span className="podium-emoji">🥈 {getAvatarEmoji(leaderboard[1].avatar_id)}</span>
                <span className="podium-name">{leaderboard[1].name}</span>
                <span className="podium-pts">{leaderboard[1].total_points} Pts</span>
              </div>
              <div className="hub-podium-slot rank-1" onClick={() => handlePlayerClick(leaderboard[0])} style={{ cursor: 'pointer' }}>
                <span className="podium-emoji">🥇 {getAvatarEmoji(leaderboard[0].avatar_id)}</span>
                <span className="podium-name">{leaderboard[0].name}</span>
                <span className="podium-pts">{leaderboard[0].total_points} Pts</span>
              </div>
              <div className="hub-podium-slot rank-3" onClick={() => handlePlayerClick(leaderboard[2])} style={{ cursor: 'pointer' }}>
                <span className="podium-emoji">🥉 {getAvatarEmoji(leaderboard[2].avatar_id)}</span>
                <span className="podium-name">{leaderboard[2].name}</span>
                <span className="podium-pts">{leaderboard[2].total_points} Pts</span>
              </div>
            </div>
          )}

          {/* Full List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', padding: '0.8rem 1rem', color: 'gray', fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '0.5rem' }}>
              <div style={{ width: '60px' }}>Rank</div>
              <div style={{ flex: 2 }}>Player Name</div>
              <div style={{ flex: 1, textAlign: 'right' }}>Games</div>
              <div style={{ flex: 1, textAlign: 'right' }}>Total Points</div>
            </div>
            
            {leaderboard.map(u => (
              <div key={u.user_id} onClick={() => handlePlayerClick(u)} style={{ 
                display: 'flex', alignItems: 'center', padding: '0.8rem 1rem', 
                background: 'rgba(255,255,255,0.03)', borderRadius: '8px', cursor: 'pointer',
                transition: 'background 0.2s'
              }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                <div style={{ width: '60px', display: 'flex', alignItems: 'center' }}>
                  {getRankBadge(u.rank)}
                </div>
                <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '1rem', fontWeight: 'bold' }}>
                  <span>{getAvatarEmoji(u.avatar_id)}</span>
                  <span>{u.name}</span>
                </div>
                <div style={{ flex: 1, textAlign: 'right', color: 'gray' }}>{u.games_played}</div>
                <div style={{ flex: 1, textAlign: 'right', fontWeight: 'bold', color: 'var(--gold-main)' }}>{u.total_points}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
