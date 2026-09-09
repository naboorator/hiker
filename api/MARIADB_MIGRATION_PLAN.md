# MariaDB migration plan

## Scope

The API persists users, settings, activities, activity participants, weights, friend connections,
and activity reactions in MariaDB. Existing `db.json` content is deliberately not imported by the
schema migration.

## Schema decisions

- UUIDs remain application-generated `CHAR(36)` primary keys to preserve the public API contract.
- User emails are unique with a case-insensitive `utf8mb4_unicode_ci` collation.
- Activity participants use `activity_people`, preserving their display order and allowing manually
  entered names.
- Friend pairs are stored in canonical ID order and protected by one unique key, preventing duplicate
  requests in either direction.
- Reactions use a composite primary key, allowing at most one reaction of each type per user and
  activity.
- Foreign keys use cascading deletes for dependent rows.
- Resource filters and ownership checks are performed in SQL rather than after loading global data.

## Rollout

1. Start MariaDB with `docker compose up -d mariadb`.
2. Confirm that `api/migrations/001_initial_schema.sql` has created all seven tables.
3. Configure the API with the `DB_*` variables documented in `.env.example`.
4. Build and start the API; startup fails immediately if MariaDB is unavailable.
5. Verify health, authentication, settings, activities, weights, friends, and reactions.
6. Keep `db.json` only as a legacy backup until it can be archived or deleted explicitly.

## Future migrations

Add immutable, sequential files such as `002_add_activity_type.sql`. Existing migration files must
not be edited after deployment. The Docker init directory applies migrations automatically only to a
new empty volume; production should later use a dedicated migration runner with a schema-history
table.
