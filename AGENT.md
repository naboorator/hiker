# Hike Log — Angular migration guide

## Current state

The application is an Angular standalone application in `angular-app/`.
It uses signals, Signal Forms, `HikeApiService`, and browser IndexedDB.
The legacy static implementation is retained only as a historical reference.

## Product scope to preserve

The Angular app must retain these existing capabilities:

- Home dashboard with today's hikes, daily/monthly summaries, a compact
  circular add button, add-hike success feedback, and an optional add form.
- Hike fields: name, date (today by default, never future), minutes, metres,
  and one or more people.
- A configurable owner name, selectable people suggestions, reusable hike-name
  suggestions, and at least one person required per hike.
- All activities page grouped by year, month, and day, with daily/monthly
  totals, edit, and delete actions.
- Graphs for time by day, cumulative time, and cumulative distance.
- Settings for log name, owner name, background keyword, background interval,
  import, export-before-clear, and clear-all confirmation.
- Today’s meal view with two persisted daily meals.
- Browser-local persistence using IndexedDB, including merging imported data.

## Architecture rules

### Angular approach

- Use the latest stable Angular version available when implementation begins.
- Use standalone components and Angular's modern control-flow syntax.
- Use signals for local UI state, derived values, view models, and store state.
- Use Signal Forms for every form. Do not introduce Reactive Forms or
  template-driven forms.
- Prefer computed, linkedSignal, and small signal-based stores over manual
  subscriptions.
- Keep routing lazy where it improves route isolation.

### Components must stay light and dumb

- Page components compose a layout, select data from a store/facade, and wire
  user actions. They must not contain IndexedDB or HTTP code.
- Reusable UI components receive data through input() and notify parents with
  output(). They do not fetch, mutate storage, or own business rules.
- Put formatting helpers and small presentational calculations in shared pure
  utilities or pipes.
- Keep dialog components focused on fields and outputs; the parent/facade owns
  persistence, validation orchestration, and navigation.

### Data access

- No component may inject or call HttpClient directly.
- All persistence access must go through an API-facing service, initially named
  HikeApiService.
- HikeApiService is the only client-facing boundary for hikes, settings,
  meals, import, and export. It may use IndexedDB in phase 2.
- If a remote backend is added later, replace the service implementation or
  its internal adapter without changing components, stores, or route pages.
- Keep storage details behind repositories/adapters, for example
  IndexedDbHikeRepository and IndexedDbSettingsRepository.

### State and models

- Define shared typed models for Hike, HikeDraft, AppSettings, DailyMeal, and
  import/export payloads.
- Use a focused feature store/facade for each route area. Stores expose
  read-only signals and intent methods such as addHike, updateHike, removeHike,
  and load.
- Keep validation rules in form schemas and domain helpers, not in templates.
- Persist dates as ISO date strings (YYYY-MM-DD) and keep the existing
  minutes/metres units internally.

## Target feature structure

    src/app/
      core/
        api/hike-api.service.ts
        data/indexeddb/
        models/
        utils/
      shared/
        ui/
        formatters/
      features/
        home/
        activities/
        graphs/
        settings/
        meals/
      app.routes.ts

Suggested shared UI components:

- AppShellComponent and AppMenuComponent
- PageHeaderComponent
- HikeFormComponent
- PeoplePickerComponent
- HikeListComponent and HikeDayGroupComponent
- CalendarDateBadgeComponent
- MonthlySummaryComponent
- ConfirmDialogComponent, ImportDialogComponent, and EditHikeDialogComponent
- ToastComponent
- graph presentation components

## Phase 1 — layouts and components

Phase 1 builds the Angular shell and all visual components with mock signal
data. Do not connect IndexedDB, import/export files, remote APIs, or real
application data in this phase.

1. Create the Angular project and configure standalone routing, global styles,
   and the shared app shell.
2. Define the shared TypeScript models and static mock data only.
3. Build the routes: Home, Activities, Graphs, Settings, and Today’s meal.
4. Build all layouts and dumb UI components listed above.
5. Implement visual interaction states with local signals only:
   form open/close, dialogs, menus, empty states, inline errors, and toasts.
6. Create Signal Form schemas using mock models so the form markup and
   validation presentation are ready for real data.
7. Match the current mobile-first visual design, including background treatment,
   cards, menu, form fields, tags, summaries, and charts.
8. Verify that every route works with mock data and that components have no
   direct storage or HTTP dependencies.

Phase 1 exit criteria:

- All routes render their finished layout.
- Forms and dialogs have the intended visual states using Signal Forms.
- Components communicate only through inputs, outputs, and feature facades.
- No production data is read or written.

## Phase 2 — connected data

1. Implement HikeApiService and IndexedDB repositories using the existing
   database shape and browser-local persistence behavior.
2. Replace mock stores with feature facades connected to HikeApiService.
3. Load and persist hikes, settings, and daily meals.
4. Connect add, edit, delete, grouping, totals, suggestions, owner handling,
   and graphs to real signals.
5. Implement import merge, export, clear confirmation, success/error progress,
   and persisted background settings.
6. Validate data migration from existing browser entries, including legacy
   owner values such as You.
7. Add focused tests for API services, stores, form/domain helpers, and critical
   user flows.

## Implemented shared UI

- `AppHeaderComponent` contains the shared logo, status badge, and menu.
- `HikeFormComponent` is reused for adding and editing hikes. It accepts
  `draft` and `buttonText` inputs and emits a `HikeDraft` through `saved`.
- `ActivityMonthListComponent` renders a grouped calendar-style month and has
  an `allowEdits` input with edit/delete outputs.

## Quality checks for every later change

- Keep mobile layout usable without horizontal scrolling.
- Use accessible labels, focus states, keyboard actions, and live regions for
  success/error feedback.
- Do not duplicate persistence logic between routes.
- Do not move formatting, fetching, or business rules into presentational
  components.
- Do not add new capabilities unless requested.
