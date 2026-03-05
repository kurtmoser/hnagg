# HackerNews Aggregator

A full-stack application that aggregates HackerNews stories, tracks score and comment count changes over time, and provides a paginated API with time-based filtering.

## Architecture

| Service    | Port  | Description                          |
|------------|-------|--------------------------------------|
| `frontend` | 50141 | Angular frontend                     |
| `backend`  | 50142 | NestJS REST API (internally on 3000) |
| `postgres` | 50143 | PostgreSQL 18 database               |

### Database Schema

- **`hn_items`** — Stores HackerNews items (stories, comments, etc.) with all fields from the HN API.
- **`score_snapshots`** — Records point-in-time score values for stories. A new row is inserted on first import and whenever a score change is detected during sync.
- **`descendants_snapshots`** — Records point-in-time comment count (descendants) values for stories, same logic as score snapshots.

### API Endpoints

All endpoints are prefixed with `/api`.

| Method | Path                               | Description                              |
|--------|-------------------------------------|------------------------------------------|
| GET    | `/api/stories`                      | Paginated stories, sorted by score DESC  |
| GET    | `/api/stories?timeframe=1d`         | Filter by timeframe: `1d`, `2d`, `3d`, `5d`, `1w`, `1m` |
| GET    | `/api/stories/:id/score-history`    | Score snapshots over time for a story    |
| GET    | `/api/stories/:id/descendants-history` | Comment count snapshots over time     |

### CLI Commands

| Command            | Description                                             |
|--------------------|---------------------------------------------------------|
| `import-data`      | One-off import of the latest 100 stories from HN API   |
| `stream-updates`   | Long-running SSE listener that syncs item updates in real-time |

## Getting Started

### 1. Start all services

```bash
docker compose up -d --build
```

### 2. Run database migrations

```bash
docker compose exec backend node ./node_modules/.bin/typeorm migration:run -d dist/data-source.js
```

### 3. Import initial data

```bash
docker compose exec backend node dist/cli/cli-main.js import-data
```

### 4. Stream live updates

```bash
docker compose exec backend node dist/cli/cli-main.js stream-updates
```

This connects to the HN SSE endpoint and continuously syncs item changes. Score and descendants snapshots are automatically recorded when values change.

## Local Development

```bash
cd backend
npm install
npm run start:dev
```

### Migrations (local)

```bash
cd backend
npm run build
npm run migration:run
```

### Creating a new migration

```bash
cd backend
npm run migration:create
# Edit the generated file in src/database/migrations/
```
