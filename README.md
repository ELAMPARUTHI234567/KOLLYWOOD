# 🎬 KOLLOYWOOD

**The Ultimate Kollywood Movie Guessing Game**

A real-time multiplayer web game for up to 30 players. Each player submits one Tamil/Kollywood movie question with hints, and everyone guesses each other's movies!

---

## 🗂️ Project Structure

```
Game 2.0/
├── frontend/          (Vite + React)
├── backend/           (Python Flask + Flask-SocketIO)
├── database/          (MySQL schema)
└── README.md
```

---

## 🛠️ Prerequisites

- Node.js 18+
- Python 3.10+
- MySQL 8.0+

---

## 🗄️ Database Setup

1. Open MySQL and run:

```sql
SOURCE database/schema.sql;
```

Or using CLI:

```bash
mysql -u root -p < database/schema.sql
```

This creates the `kolloywood` database and all tables.

---

## ⚙️ Backend Setup

### 1. Navigate to backend:
```bash
cd backend
```

### 2. Create virtual environment:
```bash
python -m venv venv
venv\Scripts\activate    # Windows
source venv/bin/activate # Linux/Mac
```

### 3. Install dependencies:
```bash
pip install -r requirements.txt
```

### 4. Configure environment:

Edit `backend/.env`:
```env
SECRET_KEY=your-secret-key
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=kolloywood
CORS_ORIGINS=http://localhost:5173
PORT=5000
```

### 5. Run the server:
```bash
python app.py
```

Server starts at: `http://localhost:5000`

---

## 🎨 Frontend Setup

### 1. Navigate to frontend:
```bash
cd frontend
```

### 2. Install dependencies:
```bash
npm install
```

### 3. Configure environment:

Edit `frontend/.env`:
```env
VITE_BACKEND_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

### 4. Start dev server:
```bash
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## 🎮 How to Play

### Create Game (Host)
1. Go to `http://localhost:5173`
2. Click **CREATE GAME**
3. Enter your name, choose an avatar
4. Configure game settings (players, points, time, clue interval, gap)
5. Share the **Game ID** with friends

### Join Game (Players)
1. Go to `http://localhost:5173`
2. Click **JOIN GAME**
3. Enter the Game ID, your name, and choose an avatar

### Waiting Room
- Host sees a list of all players
- Host clicks **START QUESTION SETUP** when ready

### Question Submission
- Every player submits ONE movie question:
  - Movie Name (the answer)
  - Hero Name
  - Heroine Name
  - Song Name
  - 3 Clues (revealed one at a time)

### Game Starts
- Questions are played in player order
- Everyone sees 4 first-letter hints: Movie, Hero, Heroine, Song
- Clues reveal at configured intervals
- Players type the movie name to guess
- **The question creator cannot guess their own question**
- Faster correct answers earn more points

### Scoring
| Time | Points (if max = 100) |
|------|----------------------|
| 0–30s | 100 |
| 30–60s | 80 |
| 60–90s | 60 |
| 90–120s | 40 |
| Wrong/No answer | 0 |

---

## 🔌 WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join_game_room` | Client → Server | Join Socket.IO room |
| `player_joined` | Server → Client | New player joined |
| `start_question_setup` | Client → Server | Host starts setup phase |
| `question_submission_started` | Server → Client | Setup phase began |
| `question_submitted` | Client → Server | Player submitted question |
| `submission_update` | Server → Client | Submission progress update |
| `start_game` | Client → Server | Host starts game |
| `game_started` | Server → Client | Game has started |
| `question_active` | Server → Client | New question is active |
| `clue_revealed` | Server → Client | Clue released |
| `player_guess` | Client → Server | Player submits a guess |
| `guess_incorrect` | Server → Client | Wrong guess broadcast |
| `guess_correct` | Server → Client | Correct guess announced |
| `leaderboard_update` | Server → Client | Score update |
| `answer_revealed` | Server → Client | Answer reveal |
| `round_result` | Server → Client | Round complete |
| `game_finished` | Server → Client | Game over |

---

## 🔒 Security

- Movie answers are **never** sent to clients during gameplay
- Only first letters are transmitted until answer reveal
- All scoring is computed **server-side**
- Server timestamps control all timing

---

## 🎭 Avatars

Dog 🐶 · Cat 🐱 · Fox 🦊 · Panda 🐼 · Tiger 🐯 · Frog 🐸 · Monkey 🐵 · Rabbit 🐰 · Lion 🦁 · Bear 🐻 · Koala 🐨 · Pig 🐷 · Wolf 🐺 · Cow 🐮 · Penguin 🐧 · Chick 🐥

---

*"Kollywood is not just cinema, it's an emotion!"* 🎬
