import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import CreateGamePage from './pages/CreateGamePage';
import JoinGamePage from './pages/JoinGamePage';
import WaitingRoomPage from './pages/WaitingRoomPage';
import QuestionSubmitPage from './pages/QuestionSubmitPage';
import GamePage from './pages/GamePage';
import RoundResultPage from './pages/RoundResultPage';
import FinalResultPage from './pages/FinalResultPage';
import HubPage from './pages/HubPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <div className="app-main">
          <Routes>
            <Route path="/"                 element={<HomePage />} />
            <Route path="/create"           element={<CreateGamePage />} />
            <Route path="/join"             element={<JoinGamePage />} />
            <Route path="/room/:gameCode"   element={<WaitingRoomPage />} />
            <Route path="/submit/:gameCode" element={<QuestionSubmitPage />} />
            <Route path="/game/:gameCode"   element={<GamePage />} />
            <Route path="/round-result/:gameCode" element={<RoundResultPage />} />
            <Route path="/final/:gameCode"  element={<FinalResultPage />} />

            {/* Sidebar Hub Companion Routes */}
            <Route path="/players"          element={<HubPage view="players" />} />
            <Route path="/leaderboard"      element={<HubPage view="leaderboard" />} />
            <Route path="/questions"        element={<HubPage view="questions" />} />
            <Route path="/chat"             element={<HubPage view="chat" />} />
            <Route path="/movies"           element={<HubPage view="movies" />} />
            <Route path="/my-games"         element={<HubPage view="my-games" />} />
            <Route path="/history"          element={<HubPage view="history" />} />
            <Route path="/settings"         element={<HubPage view="settings" />} />

            <Route path="*"                 element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
