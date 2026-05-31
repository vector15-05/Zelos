# Zelos - Backend Core & Cold Storage

## Currently work in progress

Zelos is the backend architecture for a high-performance, real-time quiz application. This repository currently contains the "Cold Storage" phase of the project: a robust REST API, a secure stateless authentication system, and a strictly typed PostgreSQL database pipeline. 

It is built using a modern, decoupled monorepo architecture powered by Bun Workspaces.

## 🚀 Tech Stack

* **Runtime & Package Manager:** Bun
* **Web Framework:** Express.js (TypeScript)
* **Database:** PostgreSQL (Neon)
* **ORM:** Drizzle ORM
* **Validation:** Zod
* **Authentication:** JWT (HttpOnly Cookies), bcrypt

## 📂 Monorepo Architecture

The project is structured using Bun Workspaces to strictly separate concerns and share type definitions across environments.

```text
zelos/
├── apps/
│   └── api/                # Express API Server (@zelos/api)
│       ├── controllers/    # Route logic and DB transactions
│       ├── middlewares/    # JWT auth & Zod validation interceptors
│       ├── routes/         # Express routers
│       └── utils/          # Global error handling
├── packages/
│   ├── db/                 # Drizzle ORM & Postgres connection (@zelos/db)
│   │   ├── migrations/     # Generated SQL history
│   │   └── src/schema.ts   # Database table definitions
│   └── shared-types/       # Zod schemas & inferred TS types (@zelos/shared-types)

```

## 🗄️ Database Schema

The database uses a custom Drizzle schema optimized for read-heavy quiz retrieval.

* **`users`**: Stores user credentials with `bcrypt` hashed passwords and bounded `varchar` limits.
* **`quizzes`**: Linked to users via `creatorId` with cascading deletes. Includes an optimistic locking `version` column.
* **`questions`**: Linked to quizzes. Utilizes a highly optimized `jsonb` column for question `options`, drastically reducing SQL `JOIN` latency when fetching a full quiz.

## 🛡️ Security & Authentication

Authentication is handled completely statelessly via JSON Web Tokens (JWT).

* **XSS Protection:** Tokens are never exposed to JavaScript. They are issued directly via `HttpOnly`, `SameSite=lax` cookies.
* **Secure Overwrite:** Logouts are handled by actively poisoning the client-side cookie with a 10-second dummy string to prevent ghost-token replays.
* **Strict Validation:** Every incoming request is parsed by a custom `validateBody` middleware using Zod, ensuring malformed data never reaches the database controllers.

## 🔌 API Endpoints

### Authentication

* `POST /api/auth/register` - Creates a new user and issues a JWT cookie.
* `POST /api/auth/login` - Verifies credentials and issues a JWT cookie.
* `POST /api/auth/logout` - Overwrites and invalidates the active cookie.

### Quizzes

* `POST /api/quizzes` - **[Protected]** Creates a new quiz and its associated questions via a secure Drizzle transaction.

## 🛠️ Local Development

Ensure you have [Bun](https://bun.sh/) installed.

1. **Install Dependencies:**
```bash
bun install

```


2. **Environment Variables:**
Create a `.env` file in the root directory (or specific workspaces) with the following:
```env
PORT=3000
DATABASE_URL=postgresql://user:password@host/db_name
JWT_SECRET=your_super_secret_key
NODE_ENV=development

```


3. **Database Migrations:**
Push the schema to your Postgres instance:
```bash
bun --filter @zelos/db run drizzle-kit generate
bun --filter @zelos/db run drizzle-kit migrate

```


4. **Start the API:**
```bash
bun --filter @zelos/api run dev

```



```
