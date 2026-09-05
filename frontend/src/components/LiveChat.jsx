import React, { useRef, useEffect } from 'react';
import { getAvatarEmoji } from './avatars';
import './LiveChat.css';

export default function LiveChat({ messages }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="live-chat">
      <div className="live-chat__header">
        <span>💬</span>
        <span>LIVE GUESSES</span>
      </div>
      <div className="live-chat__messages">
        {messages.length === 0 && (
          <p className="live-chat__empty">Waiting for guesses…</p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`live-chat__msg ${msg.type === 'correct' ? 'live-chat__msg--correct' : 'live-chat__msg--incorrect'} animate-slideInLeft`}
          >
            <span className="live-chat__avatar">{getAvatarEmoji(msg.avatar_id)}</span>
            <span className="live-chat__name">{msg.name}</span>
            {msg.type === 'correct' ? (
              <>
                <span className="live-chat__badge-correct">✅ CORRECT!</span>
                <span className="live-chat__points">+{msg.points}</span>
              </>
            ) : (
              <>
                <span className="live-chat__badge-wrong">❌</span>
                <span className="live-chat__guess">{msg.guess}</span>
              </>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
