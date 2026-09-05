import React from 'react';
import { AVATARS } from './avatars';
import './AvatarPicker.css';

export default function AvatarPicker({ selected, onSelect }) {
  return (
    <div className="avatar-picker">
      <p className="avatar-picker__label">Choose Your Avatar</p>
      <div className="avatar-picker__grid">
        {AVATARS.map((avatar) => (
          <button
            key={avatar.id}
            type="button"
            className={`avatar-picker__item ${selected === avatar.id ? 'avatar-picker__item--selected' : ''}`}
            onClick={() => onSelect(avatar.id)}
            title={avatar.name}
          >
            <span className="avatar-picker__emoji">{avatar.emoji}</span>
            <span className="avatar-picker__name">{avatar.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
