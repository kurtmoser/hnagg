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
- **`hn_items_metadata`** — Stores OpenGraph metadata (og:image, og:description) and local image paths for stories.

### API Endpoints

All endpoints are prefixed with `/api`.

| Method | Path                               | Description                              |
|--------|-------------------------------------|------------------------------------------|
| GET    | `/api/stories`                      | Paginated stories, sorted by score DESC  |
| GET    | `/api/stories?timeframe=1d`         | Filter by timeframe: `1d`, `2d`, `3d`, `5d`, `1w`, `1m` |
| GET    | `/api/stories/:id/score-history`    | Score snapshots over time for a story    |
| GET    | `/api/stories/:id/descendants-history` | Comment count snapshots over time     |
| GET    | `/api/images/:filename`                | Serves locally stored OG images       |

### CLI Commands

| Command            | Description                                             |
|--------------------|---------------------------------------------------------|
| `import-data`      | One-off import of the latest 100 stories from HN API   |
| `stream-updates`   | Long-running SSE listener that syncs item updates in real-time |
| `fetch-og-metadata <itemId>` | Fetch OG metadata and download image for a single story |
| `fetch-og-metadata-for-date <YYYY-MM-DD>` | Fetch OG metadata for the top 150 stories on a given date (skips items that already have metadata) |

## Setup

> No host Node.js/npm required — everything runs inside Docker.

### 1. Configure environment

```bash
cp .env.example .env
# Edit .env — set strong DB credentials for production
```

### 2. Start all services

```bash
docker compose up -d --build
```

### 3. Run database migrations

```bash
docker compose exec backend npm run migration:run
```

### 4. Import initial data

```bash
docker compose exec backend node dist/cli/cli-main.js import-data
```

### 5. Stream live updates

```bash
docker compose exec backend node dist/cli/cli-main.js stream-updates
```

This connects to the HN SSE endpoint and continuously syncs item changes. Score and descendants snapshots are automatically recorded when values change.

### 6. Fetch OpenGraph metadata

```bash
# Single story
docker compose exec backend node dist/cli/cli-main.js fetch-og-metadata <item-id>

# All top stories for a date (skips already-processed items)
docker compose exec backend node dist/cli/cli-main.js fetch-og-metadata-for-date <yyyy-mm-dd>
```

This fetches story URLs, extracts `og:image` and `og:description` meta tags, downloads images to `./images/`, and saves the metadata to the database. The downloaded images are served at `/api/images/:filename` and included in the `/api/stories` response via the `metadata` relation.

---

## Local Development

For development with hot-reload, add a `docker-compose.override.yml`:

```yaml
services:
  backend:
    command: npm run start:dev
    volumes:
      - ./backend:/app
      - /app/node_modules
```

Then restart: `docker compose up -d`

### Useful commands

```bash
# Create a new migration
docker compose exec backend npm run migration:create

# Revert the last migration
docker compose exec backend npm run migration:revert

# Lint & test
docker compose exec backend npm run lint
docker compose exec backend npm test
```
