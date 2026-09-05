import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CreateGamePage from './pages/CreateGamePage';
import JoinGamePage from './pages/JoinGamePage';
import WaitingRoomPage from './pages/WaitingRoomPage';
import QuestionSubmitPage from './pages/QuestionSubmitPage';
import GamePage from './pages/GamePage';
import RoundResultPage from './pages/RoundResultPage';
import FinalResultPage from './pages/FinalResultPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"               element={<HomePage />} />
        <Route path="/create"         element={<CreateGamePage />} />
        <Route path="/join"           element={<JoinGamePage />} />
        <Route path="/room/:gameCode" element={<WaitingRoomPage />} />
        <Route path="/submit/:gameCode" element={<QuestionSubmitPage />} />
        <Route path="/game/:gameCode" element={<GamePage />} />
        <Route path="/round-result/:gameCode" element={<RoundResultPage />} />
        <Route path="/final/:gameCode" element={<FinalResultPage />} />
        <Route path="*"               element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
