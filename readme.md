# Chat App — Docker Setup

This project runs via Docker Compose with three services: `app`, `postgres`, and `redis`. PostgreSQL data is stored in a **named Docker volume** (`postgres_data`), which persists independently of the container lifecycle.

## Prerequisites

- Docker and Docker Compose installed
- A `.env` file in the project root with the following variables:

```env
APP_PORT=3000
NODE_ENV=development
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=your_db
POSTGRES_PORT=5432
REDIS_PORT=6379
CLIENT_ORIGIN=http://localhost:3000
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1d
```

## Running in Development (Detached Mode)

### First run / after Dockerfile or dependency changes

```bash
docker compose up -d --build
```

### Subsequent runs (no rebuild needed)

```bash
docker compose up -d
```

### View logs (since containers run detached)

```bash
# All services
docker compose logs -f

# App only
docker compose logs -f app

# Postgres only
docker compose logs -f postgres
```

### Check container status

```bash
docker compose ps
```

## Stopping the App (Data Persists)

Use `stop` / `start` for the safest day-to-day dev cycle — containers pause, volumes and data remain untouched:

```bash
# Stop containers, keep everything
docker compose stop

# Start them back up later
docker compose start
```

If you need to remove containers and the network but keep your data:

```bash
# Removes containers + network, volumes survive
docker compose down

# Bring it back — postgres_data volume is reused automatically
docker compose up -d
```

## ⚠️ Commands That Will Delete Your Data

Avoid these in development unless you intentionally want to wipe the database:

```bash
docker compose down -v          # -v removes named volumes — DATA IS DELETED
docker volume rm chat_app_postgres_data
docker volume prune
docker system prune -a --volumes
```

## Verifying Data Persistence

```bash
# Confirm the volume exists
docker volume ls | grep postgres_data

# Inspect volume details (mountpoint, size, etc.)
docker volume inspect chat_app_postgres_data

# Connect to Postgres directly and list tables
docker compose exec postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} -c '\dt'
```

## Notes

- The `app` service runs `npx node-pg-migrate up && npm run dev` on every start. This is idempotent, so re-running migrations on startup is safe.
- Source code is synced via a bind mount (`.:/app`), so code changes reflect immediately without a rebuild.
- `node_modules` is kept in a separate anonymous volume (`/app/node_modules`). If you change `package.json`, rebuild the image with `docker compose up -d --build` to pick up new dependencies.
- To back up your Postgres data outside of Docker, consider switching `postgres_data` to a bind-mounted host folder (e.g. `./pgdata`) instead of a Docker-managed volume.

## Recommended Daily Dev Loop

```bash
docker compose up -d --build   # rebuild only when Dockerfile/deps change
docker compose logs -f app     # watch logs
# ...work...
docker compose stop            # end of day — data stays intact
docker compose start           # next day — pick up where you left off
```