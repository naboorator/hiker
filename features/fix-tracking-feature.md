# Reliable live activity tracking

## Goal

Improve live GPS tracking so that temporary browser, operating-system, GPS, and
storage failures do not leave an activity permanently stuck without location
updates.

The feature must retain the current browser limitation: continuous background
tracking cannot be guaranteed. Elapsed activity time remains authoritative,
while distance is explicitly treated as the distance covered by accepted GPS
samples.

## Problems to address

### A failed watcher is not restarted

The current `watchPosition` error callback only reports an error. Some mobile
browsers stop delivering updates after a timeout, temporary location failure,
screen lock, or suspended tab. The application can then remain in the error
state until the user retries manually.

### A watcher can become stale without reporting an error

A browser can leave the watcher registered while no longer delivering success
or error callbacks. The application currently has no last-position timestamp or
watchdog that can recognize this state.

### Mobile lifecycle recovery is incomplete

Tracking is stopped when the document becomes hidden and restarted on
`visibilitychange`. Mobile Safari can freeze, restore, or discard a page without
providing a perfectly reliable visibility-event sequence. Recovery should also
consider `pageshow`, `focus`, `pagehide`, and persisted-page restoration.

### Persistence work grows with every sample

Every status and location update serializes the complete location history into
`localStorage`. The complete array is also copied whenever a point is appended.
Long activities therefore perform progressively more work. Storage can
eventually reach its quota, although quota exhaustion is not currently the most
likely cause of short or normal tracking failures.

### Rejected samples can look like stopped GPS

GPS may still be active while accuracy, minimum-movement, timestamp, or maximum-
speed filters reject every sample. The UI needs to distinguish an active watcher
with rejected samples from a watcher that has stopped producing samples.

## Scope

This improvement covers:

- automatic recovery from recoverable geolocation errors;
- stale-watcher detection;
- foreground and page-lifecycle recovery;
- explicit last-sample and last-accepted-sample state;
- efficient, durable local persistence;
- bounded memory and storage usage;
- clear tracking status and recovery messages;
- automated tests and diagnostic logging.

It does not add guaranteed background GPS, reconstruct missing route sections,
or send raw GPS points to the API.

## Proposed architecture

### `GeolocationTrackingService`

Keep browser API details inside this service. It should own:

- the current `watchPosition` ID;
- a monotonically increasing request/session version;
- the time of the most recent success or error callback;
- retry attempts and retry timer;
- a stale-watcher timer;
- explicit start, pause, resume, and stop behavior.

The service should expose events through callbacks or a small typed event model,
without knowing about activities, persistence, or UI translations.

### `LiveActivityStore`

The store remains responsible for:

- activity state;
- GPS segments;
- accepted versus rejected samples;
- lifecycle coordination;
- persistence scheduling;
- user-visible tracking state.

It must not directly call browser geolocation APIs.

### Location repository

Move the growing GPS location collection to IndexedDB. Keep only a compact live
activity summary in `localStorage` if synchronous startup recovery is still
useful.

Suggested split:

- `localStorage`: activity ID, user ID, type, status, start/stop time, current
  segment, location status, latest distance summary, and persistence version;
- IndexedDB: individual accepted GPS samples keyed by activity ID and sequence;
- memory: only the data required for the current UI and incremental distance
  calculation.

The repository interface must remain replaceable and independently testable.

## Watcher recovery rules

### Initial start

1. Set status to `pending`.
2. Request a fresh initial position.
3. Start `watchPosition` after initial success.
4. If the initial request returns a recoverable error, start the watcher and
   schedule recovery.
5. Permission denial is not retried automatically.

### Recoverable errors

Treat timeout and position-unavailable errors as recoverable.

On a recoverable watcher error:

1. Report `recovering` instead of leaving the state permanently at `error`.
2. Clear the existing watcher.
3. Schedule a restart using bounded exponential backoff.
4. Reset the retry counter after a successful position.

Suggested delays are 1, 2, 5, 10, and 20 seconds, capped at 20 seconds. Only one
retry timer may exist at a time.

### Permission denial

Permission denial must:

- clear the watcher and pending retry timers;
- set status to `denied`;
- require explicit user action after browser permission settings have changed;
- leave elapsed-time tracking active.

### Stale watcher watchdog

While the page is visible and the activity is tracking, check periodically when
the last geolocation callback was received.

If no success or error callback arrives for a configurable interval, restart the
watcher in a new GPS segment. A starting value of 45 seconds is appropriate but
should be defined as a named constant and validated on real devices.

The watchdog must pause while the document is hidden to avoid restart loops in
the background.

## Page lifecycle behavior

Listen for:

- `visibilitychange`;
- `pagehide`;
- `pageshow`;
- window `focus`.

When leaving the foreground:

1. Persist pending data immediately.
2. Stop the watcher and watchdog.
3. Mark tracking as `background-limited`.

When returning to the foreground:

1. Check that the activity is still in the `tracking` state.
2. Avoid duplicate resume calls caused by several lifecycle events.
3. Start a new GPS segment.
4. Restart geolocation and watchdog monitoring.
5. Do not connect the last pre-background point to the first resumed point.

Handle `pageshow` with `event.persisted === true` as a required recovery case.

## Sample processing

Track these timestamps separately:

- last browser geolocation callback;
- last valid GPS sample;
- last accepted distance sample.

Record a rejection reason when a sample is discarded:

- accuracy too low;
- movement below minimum;
- timestamp not newer;
- calculated speed above maximum;
- invalid coordinates.

Repeated identical statuses or rejection reasons must not trigger persistence
writes.

Distance calculation should remain incremental. When a point is accepted, add
only the distance from the previous accepted point in the same segment. Avoid
recalculating the complete route on every UI update.

## Persistence strategy

### Write batching

Do not serialize state on every GPS callback.

- Append accepted samples to an in-memory queue.
- Flush queued samples to IndexedDB on a short interval, such as every five
  seconds.
- Flush immediately on stop, discard, `visibilitychange` to hidden, `pagehide`,
  and before opening the completion form.
- Persist compact summary changes only when values actually change.

### Storage failure

If IndexedDB or summary persistence fails:

- keep the activity timer running;
- retain a bounded number of pending samples in memory;
- show a persistent storage warning;
- log the error through `LogWrapper` without location contents;
- retry storage using controlled backoff;
- never report successful persistence when a write failed.

The UI should explain that new distance samples may be lost if storage remains
unavailable.

### Bounded data

Set explicit safeguards for exceptionally long activities:

- maximum pending in-memory queue size;
- maximum accepted sample count per activity;
- optional point simplification after a documented threshold;
- cleanup of completed or abandoned activity location records.

Never silently delete the only recoverable copy of an active activity.

## Tracking statuses

Extend the status type with clear states where useful:

- `pending`;
- `active`;
- `weak-signal`;
- `recovering`;
- `stale`;
- `background-limited`;
- `denied`;
- `unavailable`;
- `storage-warning` where storage is represented in the same status model, or a
  separate storage status if that keeps concerns clearer.

The UI should show:

- current tracking state;
- time of the last GPS update;
- tracked distance;
- a retry action for denied, unavailable, stale, or repeatedly failing states;
- a warning when the browser is background-limited;
- a separate warning when persistence is failing.

An `active` label must mean that a recent geolocation callback was received. It
must not remain active indefinitely after updates have stopped.

## Logging and diagnostics

Log structured events through `LogWrapper`:

- watcher started and stopped;
- recoverable error code;
- retry attempt number and delay;
- stale watcher restart;
- foreground/background transition;
- persistence failure and recovery.

Do not log latitude, longitude, raw tokens, or complete activity records.

For development, optionally expose a small diagnostics object containing status,
last callback time, last accepted sample time, retry count, segment number, and
queued sample count.

## Constants

Place tunable values in the existing live-activity constants file, including:

- stale watcher timeout;
- watchdog interval;
- retry backoff delays;
- persistence flush interval;
- maximum pending sample count;
- maximum accepted sample count.

Do not embed timing or limit values directly in components or services.

## Migration and compatibility

Introduce a new persisted live-activity version when changing the storage
format.

The migration should:

1. recognize the existing version-one `localStorage` record;
2. copy its accepted locations into the new IndexedDB repository;
3. calculate and store the distance summary;
4. save the new compact summary only after the IndexedDB transaction succeeds;
5. retain the old record if migration fails so the activity is recoverable;
6. remove obsolete data only after successful migration.

## Automated tests

### Geolocation service tests

- starts a fresh position request and watcher;
- retries timeout and position-unavailable errors;
- applies bounded backoff and never creates duplicate retry timers;
- does not retry permission denial;
- resets retry state after a successful position;
- restarts a watcher that becomes stale;
- pauses watchdog and retries while hidden or stopped;
- ignores callbacks belonging to an obsolete request version.

### Store and lifecycle tests

- hidden state stops GPS and marks `background-limited`;
- visible, focused, and persisted `pageshow` events resume only once;
- resuming creates a new segment;
- distance never bridges separate segments;
- repeated lifecycle events do not create several watchers;
- last-callback and last-accepted timestamps update correctly;
- rejected samples preserve a meaningful rejection state;
- unchanged status does not cause a storage write.

### Persistence tests

- batches sample writes;
- flushes on stop and background transition;
- restores summary and samples after refresh;
- migrates the existing version-one record;
- reports quota and IndexedDB transaction failures;
- retries recoverable persistence failures;
- respects pending queue and activity sample limits;
- cleanup never removes an active activity.

### Manual device tests

Test at minimum:

- iPhone Safari with screen lock and unlock;
- iPhone Safari after switching to another application;
- installed iOS home-screen application if supported;
- Android Chrome with screen lock and application switching;
- temporary airplane mode and restored connectivity/location service;
- temporary loss of GPS indoors;
- one activity lasting several hours;
- local storage or IndexedDB quota failure simulation.

For each test, record whether elapsed time, GPS status, last-update time,
distance, recovery, and final activity completion behave as expected.

## Acceptance criteria

- A recoverable `watchPosition` error automatically restarts tracking.
- A visible page with no GPS callback for the stale timeout automatically
  restarts tracking.
- Returning from background resumes GPS in a new segment without adding distance
  across the missing interval.
- Duplicate lifecycle events never create multiple active watchers.
- Permission denial never causes an automatic retry loop.
- The UI clearly distinguishes active, weak, stale, recovering, background-
  limited, denied, and storage-failure conditions.
- Last GPS update time is visible during tracking.
- GPS callbacks do not serialize the complete route into `localStorage`.
- Long activities do not show progressively expensive full-history writes.
- Storage failure does not stop elapsed-time tracking and produces a visible
  warning.
- Existing active version-one activities can be recovered or migrated safely.
- Missing background route sections are never represented as tracked distance.
- Unit tests, linting, formatting, and production build all pass.

## Recommended implementation order

1. Add watcher retry, stale detection, and corresponding unit tests.
2. Add lifecycle event deduplication and foreground recovery tests.
3. Add last-update and recovery UI states.
4. Introduce the IndexedDB location repository and batched writes.
5. Add version-one storage migration and failure recovery.
6. Add bounded-data safeguards and diagnostics.
7. Complete manual iOS and Android testing before release.
