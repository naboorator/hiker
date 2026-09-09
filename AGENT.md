# My Hike development guide

## Repository structure

This repository contains two TypeScript applications and a MariaDB environment:

- `angular-app/` — standalone Angular frontend.
- `api/` — Express API backed by MariaDB.
- `docker-compose.yml` — local MariaDB service.
- `api/migrations/` — database schema migrations; do not store seed data here.
- `api/resource/{resource}/{get,post,put,delete}.ts` — HTTP resource handlers.
- `api/core/` — authentication, database, validation, errors, and repositories.
- `api/interface/` — API domain interfaces, one interface per file.
- `api/scripts/` — seeds and integration/authorization tests.

Frontend code is organized as follows:

    angular-app/src/app/
      core/
        api/          # the only HTTP boundary used by frontend state
        auth/         # session service and route guards
        constants/    # exported immutable configuration and fixed values
        data/         # local migration adapters only
        i18n/         # Transloco configuration and loaders
        interface/    # shared interfaces, one interface per file
        logging/      # replaceable application logger
        stores/       # state, persistence orchestration, and business actions
        utils/        # pure helper functions
      shared/ui/      # reusable presentational components
      features/       # lazy-loaded route pages

Translations live in `angular-app/public/assets/lang/{language}/`. Repeated text
belongs in `common.json`; feature-specific text belongs in that feature's JSON
file.

## Current product architecture

- All application pages except login, registration, and service-unavailable are
  authenticated. Administrator routes also use the administrator guard.
- The frontend reads and writes data through `HikeApiService`; components must
  never inject `HttpClient` or access MariaDB/IndexedDB directly.
- The API validates Bearer tokens and scopes resources to the authenticated
  user. Cross-user mutation is forbidden unless an endpoint explicitly permits
  an administrator operation.
- MariaDB is the source of truth. IndexedDB code exists only for migration of
  earlier browser data and must not be used for new features.
- Import/export uses the protected `/api/backup` and `/api/backup/import`
  endpoints and supports only the current version 2 format.

## Component and reuse rules

- Design components for reuse. Before adding feature-specific markup, check
  whether an existing component in `shared/ui/` can be configured or extended.
- Route pages compose reusable components, select store data, and forward user
  actions. They should contain as little presentation and business logic as
  possible.
- Reusable UI components receive configuration through `input()` and communicate
  through `output()`. They do not fetch or persist their own data unless the
  component is explicitly a feature container.
- Keep reusable modal chrome in `ModalDialogComponent` and project feature
  content into it.
- Do not duplicate activity lists, forms, people selectors, date badges,
  formatting logic, or modal layouts between features.
- Use standalone components, signals, computed signals, modern Angular control
  flow, OnPush change detection, and Signal Forms.
- Every invalid form control must be visually identified with the shared red
  error border. Mark controls as touched after an unsuccessful submit so the
  error state becomes visible. Cross-field validation must highlight every
  control involved; for example, a password mismatch highlights both the new
  password and repeated-password controls.

## Helpers, constants, and component classes

- Component/page classes contain only Angular bindings, injected dependencies,
  signals/computed state, lifecycle hooks, and event/action handlers.
- Put pure transformations, calculations, formatting, mapping, parsing, and
  validation helpers in separate `*.helpers.ts` files. Use `core/utils/` when a
  helper is shared across features and an adjacent helper file when it is local
  to one feature.
- Put fixed values, chart dimensions, color palettes, static options, and other
  immutable configuration in `*.constants.ts` or `core/constants/`.
- Do not declare free-standing helper functions or configuration constants at
  the bottom of a component/page file.
- Event handlers may remain methods because templates and Angular lifecycle APIs
  call them. They should delegate calculations and transformations to helpers.
- Helpers must be pure whenever practical and must not inject Angular services.

## API rules

- Keep handlers grouped under `api/resource/{resource}/` by HTTP method.
- Whenever the API changes, update `api/openapi.yaml` in the same change so it
  exactly matches the implemented endpoints, authentication requirements,
  parameters, request bodies, response schemas, status codes, and errors.
- Validate all external input before database access.
- Use parameterized SQL and transactions for multi-step writes.
- Ownership checks come from the authenticated token, never a client-provided
  user ID. Preserve the explicit administrator exception where required.
- Store passwords only as secure hashes. Blocked and deleted users cannot log in.
- Keep reusable database and domain behavior in `api/core/`, not duplicated in
  endpoint handlers.

## Quality checks

- Every new Angular component, page, service, store, guard, interceptor, or
  helper function must include corresponding unit tests in the same change.
  Tests must cover its public behavior and important success, validation, and
  error paths; a creation-only smoke test is not sufficient when the unit has
  behavior of its own.
- Whenever existing frontend behavior changes, update or extend its unit tests
  so they verify the new behavior and prevent regressions.

After frontend changes run from `angular-app/`:

    npm run format
    npm run lint
    npm run test:ci
    npx ngc --noEmit -p tsconfig.app.json

After API changes run from `api/`:

    npm run typecheck
    npm run build
    npm run test:authorization

Also run `git diff --check`. Preserve mobile usability, accessible names,
keyboard behavior, focus states, and translated user-facing text.
