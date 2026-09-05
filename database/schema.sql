-- KOLLOYWOOD Database Schema
-- Run this file to initialize the MySQL database

CREATE DATABASE IF NOT EXISTS kolloywood CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE kolloywood;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    avatar_id VARCHAR(30) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_code VARCHAR(10) NOT NULL UNIQUE,
    host_id INT NOT NULL,
    max_players INT NOT NULL DEFAULT 30,
    points_per_question INT NOT NULL DEFAULT 100,
    question_time INT NOT NULL DEFAULT 120,
    clue_interval INT NOT NULL DEFAULT 30,
    question_gap INT NOT NULL DEFAULT 10,
    status ENUM(
        'LOBBY',
        'QUESTION_SUBMISSION',
        'READY',
        'GAME_START',
        'QUESTION_ACTIVE',
        'CLUE_1',
        'CLUE_2',
        'CLUE_3',
        'ANSWER_REVEAL',
        'ROUND_RESULT',
        'NEXT_QUESTION',
        'GAME_FINISHED'
    ) NOT NULL DEFAULT 'LOBBY',
    current_question INT NOT NULL DEFAULT 0,
    total_questions INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (host_id) REFERENCES users(id)
);

-- Game players table
CREATE TABLE IF NOT EXISTS game_players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_id INT NOT NULL,
    user_id INT NOT NULL,
    player_order INT NOT NULL DEFAULT 0,
    score INT NOT NULL DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE KEY unique_player_game (game_id, user_id)
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_id INT NOT NULL,
    creator_id INT NOT NULL,
    question_order INT NOT NULL,
    movie_answer VARCHAR(100) NOT NULL,
    movie_first_letter CHAR(1) NOT NULL,
    hero VARCHAR(100) NOT NULL,
    hero_first_letter CHAR(1) NOT NULL,
    heroine VARCHAR(100) NOT NULL,
    heroine_first_letter CHAR(1) NOT NULL,
    song VARCHAR(100) NOT NULL,
    song_first_letter CHAR(1) NOT NULL,
    clue_1 VARCHAR(255) NOT NULL,
    clue_2 VARCHAR(255) NOT NULL,
    clue_3 VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id),
    FOREIGN KEY (creator_id) REFERENCES users(id)
);

-- Guesses table
CREATE TABLE IF NOT EXISTS guesses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL,
    player_id INT NOT NULL,
    game_id INT NOT NULL,
    guess_text VARCHAR(100) NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_time_seconds FLOAT NOT NULL DEFAULT 0,
    points_awarded INT NOT NULL DEFAULT 0,
    FOREIGN KEY (question_id) REFERENCES questions(id),
    FOREIGN KEY (player_id) REFERENCES users(id),
    FOREIGN KEY (game_id) REFERENCES games(id)
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_id INT NOT NULL,
    player_id INT NOT NULL,
    message VARCHAR(255) NOT NULL,
    message_type ENUM('guess_incorrect', 'guess_correct', 'system') NOT NULL DEFAULT 'guess_incorrect',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id),
    FOREIGN KEY (player_id) REFERENCES users(id)
);
