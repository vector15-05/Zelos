# Contributing to Zelos

Thank you for considering contributing! This project is a high-performance, server-authoritative WebSocket engine built specifically for multiplayer trivia. It relies heavily on Bun, Redis, and strict memory management.

## Development Setup

1. Ensure you have [Bun](https://bun.sh/) installed locally.
2. Ensure you have Docker running (for the Redis cache).
3. Fork and clone the repository.
4. Run `bun install` in the root directory.
5. Create an `.env` file with your Postgres (Neon) connection string and Redis host.
6. Boot the local Redis instance using `docker-compose up -d redis`.
7. Run database migrations: `bun run db:push`.
8. Start the development server: `bun run dev`.

## Pull Request Process

1. **Branching:** Create a feature branch from `main` (e.g., `feature/add-reconnect-logic` or `fix/timer-sync-bug`).
2. **Commit Messages:** Use clear, descriptive commit messages.
3. **TypeScript & Zod:** Ensure your code strictly adheres to the project's TypeScript configurations. All incoming WebSocket payloads **must** pass through the Zod validation schema before hitting the switchboard.
4. **Testing State Management:** If you are modifying the WebSocket engine (`gameHandler.ts`), please thoroughly test the state machine. Specifically, check that:
   * Disconnected clients do not leave ghost timers in memory.
   * Redis `ZSET` updates happen atomically.
   * Late answers (submitted after the server timer expires) are properly rejected.
5. **Review:** Open a PR against the `main` branch. 

## Architecture Guidelines
* **The Game Loop:** All live telemetry must remain in Redis/Memory. Do not introduce synchronous Postgres writes during the active game loop.
* **Separation of Concerns:** Keep routing logic in `gameHandler.ts`, and database/cache transactions strictly inside `RoomManager.ts`.