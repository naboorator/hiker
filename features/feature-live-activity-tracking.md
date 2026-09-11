# Live activity tracking

## Goal

Replace the current **Add activity** action on the home page with a live activity
tracking flow. An activity is kept locally while it is in progress and is sent to
the API only after the user stops it, completes the activity form, and confirms
the save.

The first version must support the existing activity types and remain extensible
for additional types.

## User flow

### 1. No activity is running

The home page displays a **Start activity** button instead of **Add activity**.

Selecting the button opens the shared modal dialog. The dialog contains:

- activity type selection;
- the previously used activity type selected by default;
- a **Start** button;
- a **Cancel** button.

The last activity type should come from the most recently saved activity. If no
activity exists, use `hiking` as the default.

### 2. Starting an activity

When the user confirms the selected type:

1. Create an active activity record with a unique local ID.
2. Store its type and start time in local storage.
3. Request location permission and begin GPS tracking when permission is granted
   and the page remains active in the foreground.
4. Close the start dialog.
5. Replace **Start activity** on the home page with **Stop activity**.
6. Show the elapsed time while the activity is running.

Starting an activity must not send an activity record to the API.

Only one live activity may exist at a time.

### 3. Activity in progress

The active activity must survive:

- page navigation;
- browser refresh;
- closing and reopening the application;
- temporary loss of network access.

The elapsed duration must be calculated from the stored start time rather than
from an incremented counter. This avoids losing or accumulating time when the
browser throttles background timers.

When GPS is available, valid location samples are appended to the locally stored
activity. The UI should show that location tracking is active. If location is
unavailable, denied, or suspended because the browser is no longer in the
foreground, time tracking continues normally.

### 4. Stopping an activity

When the user selects **Stop activity**:

1. Record the end time.
2. Stop the geolocation watcher.
3. Calculate elapsed minutes from the start and end timestamps.
4. Calculate tracked distance from accepted GPS samples.
5. Open the existing activity form in a modal.
6. Preselect the activity type chosen at start.
7. Prefill minutes with the calculated elapsed duration.
8. Prefill metres with the calculated GPS distance for activity types that use
   distance.
9. Ask the user to complete the remaining fields required by the selected type.

The user may correct the calculated minutes and metres before saving.

### 5. Completing the activity

After valid form submission:

1. Send the completed activity to the existing activities API.
2. Wait for a successful API response.
3. Remove the live activity and its location samples from local storage.
4. Close the modal.
5. Refresh activity lists and home-page statistics.
6. Restore the **Start activity** button.

If the API request fails, preserve the stopped activity locally and keep the
completed form available for retry. Do not discard tracked data.

## State model

Use an explicit state instead of deriving the flow from the presence of random
local-storage values:

```ts
export type LiveActivityStatus = "tracking" | "stopped" | "saving";

export interface LiveActivity {
  version: 1;
  id: string;
  activityType: ActivityType;
  status: LiveActivityStatus;
  startedAt: string;
  stoppedAt: string | null;
  locationTracking:
    | "pending"
    | "active"
    | "weak-signal"
    | "background-limited"
    | "denied"
    | "unavailable"
    | "error";
  locations: LiveActivityLocation[];
}

export interface LiveActivityLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  recordedAt: string;
}
```

Store the complete record under one versioned local-storage key, for example:

```text
my-hike-live-activity-v1
```

Do not mix this temporary state with the authenticated user profile or API
activity cache. The record should also include the authenticated user ID so a
live activity cannot appear after another user logs into the same browser.

## Time calculation

- Store timestamps as ISO 8601 UTC strings.
- Calculate exact elapsed milliseconds as `stoppedAt - startedAt`.
- Prefill minutes using a clearly defined rounding rule. Recommended: round up
  partial minutes with `Math.ceil`, with a minimum of one minute.
- Keep timestamps locally until the API save succeeds, even if the current API
  payload initially stores only minutes.

## GPS tracking

Use the browser Geolocation API with `watchPosition`.

Recommended initial options:

```ts
{
  enableHighAccuracy: true,
  maximumAge: 10_000,
  timeout: 20_000,
}
```

Distance should be calculated between consecutive accepted points with the
Haversine formula and returned in metres.

To reduce obvious GPS jumps:

- ignore samples without finite coordinates;
- ignore samples with missing or unacceptable accuracy;
- do not calculate distance from a point whose accuracy exceeds the configured
  threshold;
- reject impossible jumps based on distance and elapsed time;
- never block time tracking when a location sample is rejected.

The exact accuracy and speed thresholds should be constants and covered by unit
tests. Raw GPS coordinates must not be sent to the backend in the first version;
only the calculated distance is submitted.

Geolocation generally requires a secure context. It works on HTTPS and is also
allowed by browsers on localhost. The feature must degrade gracefully when it is
not available.

## Browser background limitation

The web version must not promise continuous background GPS tracking.

Mobile browsers can pause geolocation as soon as the page moves into the
background. The operating system can then freeze or discard the page when the
user switches applications, minimizes the browser, locks the phone, or closes
the browser. While frozen or discarded, JavaScript callbacks, timers, and
`watchPosition` updates cannot be relied upon.

Installing the application as a PWA does not make continuous background
geolocation reliable. A service worker also cannot be used as a replacement for
continuous `watchPosition` tracking.

Consequences for this feature:

- elapsed time remains reliable because it is recalculated from the persisted
  `startedAt` timestamp when the application resumes;
- GPS samples are collected only while the browser allows the page to run;
- movement while the phone is locked or the page is suspended may be missing;
- missing GPS route segments cannot be reconstructed after the application
  resumes;
- the calculated distance must be presented as the tracked distance and may be
  lower than the actual travelled distance;
- the user can correct the calculated metres in the final activity form.

Before starting GPS tracking, the UI must inform the user that the application
should remain open and in the foreground for the most complete distance result.
When the page becomes hidden, persist the most recent state immediately and mark
location tracking as `background-limited` when possible. When the page becomes
visible again, restart `watchPosition`, display that tracking resumed, and never
add a straight-line distance across the missing interval.

Reliable tracking with the screen locked is outside the scope of the web
version. If it becomes a product requirement, create an Android/iOS build with
Capacitor or a native application and use an operating-system background
location capability with the required platform permissions and disclosure.

## Permission and privacy behavior

- Ask for location access only after the user explicitly starts an activity.
- Explain why location is requested before triggering the browser permission
  prompt.
- Explain before tracking starts that mobile browsers may stop GPS updates when
  the screen is locked or the application is not in the foreground.
- A denied permission must not prevent the activity from starting.
- Clearly indicate whether GPS tracking is active, has a weak signal,
  background-limited, unavailable, or denied.
- Stop `watchPosition` immediately when the activity stops, the user discards the
  activity, or the authenticated user logs out.
- Provide a way to discard an active or stopped activity, protected by the shared
  confirmation modal.
- Explain that route samples are temporary and remain only in the current
  browser until save or discard.

## Suggested frontend structure

```text
core/interface/
  live-activity.interface.ts
  live-activity-location.interface.ts
  live-activity-status.type.ts

core/constants/
  live-activity.constants.ts

core/utils/
  live-activity-time.helpers.ts
  geo-distance.helpers.ts

core/services/
  live-activity-storage.service.ts
  geolocation-tracking.service.ts

core/stores/
  live-activity.store.ts

shared/ui/live-activity-start/
  live-activity-start.component.ts
  live-activity-start.component.html
  live-activity-start.component.css

shared/ui/live-activity-status/
  live-activity-status.component.ts
  live-activity-status.component.html
  live-activity-status.component.css
```

Responsibilities:

- `LiveActivityStorageService`: typed, versioned local-storage reads and writes.
- `GeolocationTrackingService`: starts and stops the browser watcher and emits
  normalized samples. It must not contain presentation logic.
- `LiveActivityStore`: owns the live activity state and coordinates time,
  location, stop, resume, discard, and successful cleanup.
- `LiveActivityStartComponent`: activity type selection and start confirmation.
- `LiveActivityStatusComponent`: elapsed time, GPS state, and stop action.
- `HomePage`: opens dialogs and composes the components; it must not implement
  GPS or local-storage logic itself.
- Existing `ActivityFormComponent`/`HikeFormComponent`: receives the stopped
  activity values as its draft and remains responsible for final validation.

## Recovery behavior

On application initialization after authentication:

1. Read the versioned live activity record.
2. Ignore records belonging to another user.
3. If its status is `tracking`, restore elapsed-time display and restart the GPS
   watcher after informing the user that locations from the suspended interval
   may be missing.
4. If its status is `stopped`, reopen or offer to reopen the completion form.
5. If the record is malformed or unsupported, log the error through
   `LogWrapper` and offer a safe discard action.

Because browsers cannot reliably keep JavaScript and GPS running in the
background or after a tab is closed, reopening the application can restore
elapsed time but cannot recreate location samples from the period when the
application was suspended or not running.

## Error cases

The implementation must handle:

- location permission denied;
- geolocation unavailable or timing out;
- low-accuracy and invalid samples;
- local-storage data malformed or full;
- refresh during tracking;
- refresh after stopping but before saving;
- logout while tracking;
- user switch in the same browser;
- API failure during final save;
- repeated clicks on Start, Stop, or Save;
- a system clock change while tracking.

Buttons must prevent duplicate operations while a transition is already in
progress.

## Localization

All new user-facing wording must be added to the existing translation structure
for both Slovenian and English. Shared actions such as Start, Stop, Save, Cancel,
Retry, and Discard belong in `common.json` when reused elsewhere. Feature-specific
messages should live in a dedicated `live-activity.json` file for each language.

## Unit tests

In accordance with `AGENT.md`, every new component, service, store, and helper
must include unit tests in the same change.

At minimum, cover:

- time calculation and rounding;
- Haversine distance calculation;
- GPS point filtering;
- local-storage serialization, recovery, version handling, and malformed data;
- starting only when no activity is already active;
- stopping and prefilled form values;
- GPS denied while time tracking continues;
- background suspension preserves elapsed time and does not connect GPS points
  across the missing interval;
- successful save removes local state;
- failed save preserves local state;
- restoration after application reload;
- isolation by authenticated user ID;
- home-page Start/Stop rendering and dialog flow.

## Implementation phases

### Phase 1: time tracking

- Replace the home-page Add button.
- Add start-type dialog.
- Persist start time and type locally.
- Show elapsed time and Stop action.
- Open the final activity form with calculated minutes.
- Save through the current API and clean local state after success.

### Phase 2: GPS distance

- Add permission explanation and geolocation service.
- Store accepted samples locally.
- Calculate and prefill metres.
- Add active, background-limited, resumed, denied, and error GPS states to the UI.

### Phase 3: resilience and UX

- Improve reload recovery and stopped-activity retry.
- Add discard confirmation.
- Handle logout and user switching.
- Verify mobile background behavior and document platform limitations.

## Acceptance criteria

- The home page does not show the old Add activity button.
- Start activity opens a modal with the last-used activity type preselected.
- Starting creates no backend activity and persists the live state locally.
- The home page shows Stop activity and elapsed time while tracking.
- Reloading the page does not lose the active timer.
- Stopping calculates minutes and opens the activity form with the chosen type
  and calculated values prefilled.
- GPS denial does not prevent time tracking or manual completion.
- The start dialog warns that continuous GPS tracking is not guaranteed while
  the phone is locked or the browser is in the background.
- Returning from the background restores elapsed time and resumes GPS without
  counting a straight-line jump over the missing interval.
- A completed activity is sent to the API only after final form confirmation.
- Local tracking data is removed only after a successful save or confirmed
  discard.
- All new UI is translated and all new units have corresponding tests.
