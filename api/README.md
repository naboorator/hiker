# My Hike API

Standalone TypeScript API backed by `db.json`. The Angular application uses this API for all current reads and writes. On its first successful connection, it copies legacy IndexedDB data through the idempotent migration endpoints.

## Run

```bash
npm install
npm run dev
```

The server listens on `http://localhost:3000` by default. Set `PORT` to override it. Set a strong, private `JWT_SECRET` outside local development; access tokens are valid for seven days.

All `/api` endpoints except registration and login require an `Authorization: Bearer <token>` header. Passwords are stored only as bcrypt hashes, and resource responses are scoped to the authenticated user.

## Endpoints

- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET|PUT /api/settings`
- `GET|POST /api/activities`
- `POST /api/activities/migrate`
- `GET|PUT|DELETE /api/activities/:id`
- `GET|POST /api/weights`
- `POST /api/weights/migrate`
- `GET|PUT|DELETE /api/weights/:id`
- `GET|POST /api/friends`
- `DELETE /api/friends/:friendId`
- `GET /api/friends/requests`
- `PUT /api/friends/requests/:requestId/accept`
- `DELETE /api/friends/requests/:requestId`
- `GET /api/friends/activities`
- `POST /api/friends/activities/:activityId/reactions`
- `DELETE /api/friends/activities/:activityId/reactions/:type`
