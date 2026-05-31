# Zelos - Real-Time Multiplayer Quiz Engine (Backend)

A high-performance, server-authoritative WebSocket engine for real-time multiplayer trivia (Kahoot-style). Built with Bun, Node.js, Redis, and Postgres, this architecture is designed to handle fast-paced live telemetry, dynamic caching, and secure state management.

## 🚀 Tech Stack

* **Runtime & Server:** Bun, Node.js, Express, `ws` (WebSockets)
* **Hot Storage (In-Memory):** Redis (`ioredis`) for active lobbies, rapid sorting (ZSET), and caching.
* **Cold Storage (Database):** PostgreSQL (via Drizzle ORM) for permanent user data, quiz content, and final match history.
* **Validation:** Zod (Strict schema parsing to prevent malformed packets).

---

## 🧠 Architecture & Data Flow

The engine strictly follows a **Cold Storage ➡️ Hot Memory ➡️ Cold Storage** lifecycle to ensure zero latency during live gameplay while preventing memory leaks.

1.  **Initialization:** When a Host creates a room, the server queries Postgres, pulls the quiz questions, and caches them in Redis.
2.  **The Game Loop:** The entire game runs out of Redis. Leaderboards are updated atomically using Redis Sorted Sets (`ZINCRBY`).
3.  **Server Authority:** The Node.js server maintains strict internal timers. It dictates when questions start, locks out late answers, and automatically broadcasts state changes.
4.  **The Checkered Flag:** When the game ends, the final sorted leaderboard is pulled from Redis, bulk-inserted into Postgres for permanent history, and the Redis room is completely deleted to free up RAM.

---

## 📂 Project Structure

```text
apps/api/
├── src/
│   ├── db/
│   │   └── schema.ts          # Drizzle Postgres tables (quizzes, questions, game_sessions, player_scores)
│   ├── services/
│   │   └── RoomManager.ts     # Redis interaction layer (cache, leaderboards, atomicity)
│   ├── sockets/
│   │   └── gameHandler.ts     # The Switchboard: Zod validation, timers, routing, & logic
│   └── server.ts              # Express + WebSocket HTTP server bootstrapper
```

---

## 🔌 WebSocket API Reference

Connect via: `ws://localhost:3000`

### 👑 Host Events (The Pit Wall)

**1. Create a Room**
Pulls quiz from Postgres, generates a 5-digit PIN, and caches in Redis.
```json
{
  "action": "create_room",
  "quizId": "<uuid>"
}
```

**2. Start Game**
Broadcasts Question 1 and starts the server-side countdown.
```json
{
  "action": "start_game",
  "pin": "12345"
}
```

**3. Next Question**
Pulls the next question from Redis cache and restarts the timer.
```json
{
  "action": "next_question",
  "pin": "12345",
  "questionNumber": 2
}
```

**4. Show Leaderboard**
Forces a leaderboard broadcast (often used manually if the auto-timer isn't relied upon).
```json
{
  "action": "show_leaderboard",
  "pin": "12345"
}
```

**5. End Game**
Triggers the bulk insert to Postgres, nukes the Redis room, and disconnects all clients.
```json
{
  "action": "end_game",
  "pin": "12345"
}
```

---

### 🎮 Player Events (The Steering Wheel)

**1. Join Room**
Registers the player in the Redis set and adds their socket to the broadcast pool.
```json
{
  "action": "join_room",
  "pin": "12345",
  "playerName": "Vinayak"
}
```

**2. Submit Answer**
Validates against the server timer, calculates speed bonus, and updates the Redis ZSET.
```json
{
  "action": "submit_answer",
  "pin": "12345",
  "playerName": "Vinayak",
  "answerId": 3,
  "timeTaken": 4.2,
  "questionNumber": 1
}
```

**3. Reconnect**
Seamlessly drops a disconnected player back into the live match, providing them with the exact remaining time on the active question.
```json
{
  "action": "reconnect",
  "pin": "12345",
  "playerName": "Vinayak"
}
```

---

## 🛠️ Local Development Setup

1.  **Start Redis & Postgres:** Ensure your local Docker containers (or native instances) are running.
2.  **Push the Schema:** 
```bash
    bun run db:push
    ```
3.  **Boot the Engine:**
```bash
    bun run dev
    ```

---

## 🔜 Phase 4: Next Steps
* Build the Next.js React frontend.
* Implement the custom WebSocket Context Provider to prevent React re-render disconnects.
* Map JSON payloads to interactive UI state machines (Question UI -> Podium UI).