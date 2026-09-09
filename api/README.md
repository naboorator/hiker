# My Hike API

The API stores data in MariaDB. It no longer reads or writes `db.json`.

## Local database

From the repository root:

```bash
docker compose up -d mariadb
docker compose ps
```

The first container startup applies the SQL files from `api/migrations` in filename order.
The development connection defaults are documented in `.env.example` and match
`docker-compose.yml`.

To recreate an empty database and run all migrations again:

```bash
docker compose down -v
docker compose up -d mariadb
```

This removes the local database volume and all data in it.

## API

Use Node.js 22 or newer, then run:

```bash
npm install
npm run dev
```

`GET /health` checks both the HTTP server and its MariaDB connection.

The OpenAPI 3.0 description is stored in [`openapi.yaml`](./openapi.yaml) and is also available
from `GET /openapi.yaml`. Swagger, Postman, and other OpenAPI-compatible clients can import
`http://localhost:3000/openapi.yaml` directly.

All `/api` endpoints except registration and login require an `Authorization: Bearer <token>`
header. Passwords are stored only as bcrypt hashes, and resource responses are scoped to the
authenticated user.

See [MARIADB_MIGRATION_PLAN.md](./MARIADB_MIGRATION_PLAN.md) for the schema decisions and rollout
plan.
