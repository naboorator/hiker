# Activity route map

## Status

Implemented.

## Goal

Show an interactive topographic Mapbox map on the activity-detail page when an
activity contains stored GPS locations. Draw the recorded route as an orange
line while respecting tracking gaps. Start collecting optional altitude data so
a separate elevation-profile feature can be added later.

## User value

Users can inspect where their activity took place instead of seeing only its
date, duration, distance, type, and participants. Accepted friends may inspect
the route as part of the activity details. Access must be revoked immediately
when the friendship is removed.

## Confirmed product decisions

- The map is displayed on `/activities/:id`.
- The map loads automatically when the activity-detail page opens.
- The map is interactive.
- Use a topographic/outdoor Mapbox style.
- Draw only the route line. Do not show start/end markers or individual GPS
  points.
- Use a contrasting orange route color by default.
- The route color is configurable through Angular environment configuration.
- Enable pan, zoom, plus/minus navigation controls, and fullscreen mode.
- Do not add search, directions, the viewer's current location, geolocation
  controls, or other map markers.
- Automatically fit the initial viewport to the complete route.
- If no GPS points exist, render no map and no empty-map message.
- If GPS points exist but Mapbox cannot display the map, show a localized error
  and a retry button.
- Owners, accepted friends, and administrators may view the route.
- Strangers and users with only a pending friend request may not view the route.
- Removing a friendship immediately removes access to the route.
- Start storing optional altitude and altitude-accuracy values now, but do not
  add an elevation graph in this feature.

## Scope

### Included

- Mapbox GL JS integration in the Angular application;
- lazy loading of Mapbox code only when a route must be displayed;
- reusable activity-route map component;
- loading GPS locations on the activity-detail page;
- friend-aware authorization for GPS-location access;
- route conversion to GeoJSON;
- preservation of tracking segments;
- responsive and fullscreen map presentation;
- retry behavior for map initialization and style-loading failures;
- optional altitude and altitude-accuracy capture, local persistence, API
  transport, database persistence, and retrieval;
- Slovene and English translations;
- unit and authorization tests;
- OpenAPI updates.

### Excluded

- elevation graph or elevation-gain calculation;
- retroactive altitude generation for existing routes;
- route editing or point deletion;
- start/end or waypoint markers;
- live movement on a map while an activity is being recorded;
- turn-by-turn navigation;
- map search, directions, or current-location control;
- route sharing outside the accepted-friend model;
- downloadable GPX/KML files;
- offline map tiles;
- 3D terrain.

## User flow

1. The user opens an activity card.
2. The application loads the activity details.
3. When `hasGpsLocations` is false, the normal detail page is displayed without
   requesting GPS locations or loading Mapbox.
4. When `hasGpsLocations` is true, the page requests the activity GPS route.
5. After GPS data is received, the Mapbox package and stylesheet are loaded.
6. The map opens directly on the page using the configured outdoor style.
7. The route is drawn in orange and the viewport is fitted to its bounds.
8. The user may pan, zoom, or enter fullscreen mode.
9. If map initialization fails, the map area displays an error and retry action.
10. Retry creates a fresh map instance and attempts to load the same route
    again.

## Authorization rules

### Activity details

Keep the existing rule:

- owner: allowed;
- accepted friend of owner: allowed;
- administrator: allowed;
- pending friend, stranger, blocked/deleted user, missing/invalid token: denied.

### GPS locations

Update `GET /api/activities/{id}/locations` to use the same relationship rule as
activity details:

- owner: allowed;
- accepted friend of owner: allowed;
- administrator: allowed;
- everyone else: denied.

Authorization must be calculated from the authenticated token and current
server-side friendship state. It must never trust a client-provided owner ID or
friend flag.

Use a controlled `403` response with a stable error code such as
`ACTIVITY_UNAVAILABLE` when the activity exists but is outside the permitted
relationship. Continue returning `404` when the activity does not exist.

Removing or blocking a friendship must affect the next request without relying
on frontend cache invalidation.

## Privacy requirements

GPS routes are sensitive location data.

- Never include raw GPS locations in activity-list responses.
- Keep `hasGpsLocations` as the lightweight list/detail indicator.
- Load coordinates only from the protected locations endpoint.
- Do not log raw latitude, longitude, altitude, or complete route payloads.
- Do not place GPS data in URL/query parameters.
- Do not persist route responses in browser storage beyond the existing live
  tracking persistence required before save.
- Clear component-held route data when leaving the detail page.
- Preserve current authentication and authorization checks on every request.
- Document in the privacy policy that accepted friends can view saved routes.

## GPS data model

Extend both live and API location interfaces with optional nullable values:

```ts
altitude: number | null;
altitudeAccuracy: number | null;
```

Values come from:

```ts
position.coords.altitude;
position.coords.altitudeAccuracy;
```

Browser behavior:

- both values may be `null`;
- altitude is expressed in metres above the WGS84 reference ellipsoid;
- altitude accuracy is expressed in metres;
- absence of altitude must never invalidate an otherwise valid horizontal GPS
  sample;
- non-finite altitude values must be normalized to `null` before persistence;
- finite altitude accuracy must be non-negative, otherwise normalize or reject
  that altitude-accuracy value without rejecting the horizontal sample.

Existing activities and existing location rows remain valid with `null` values.

## Database migration

Create the next numbered migration in `api/migrations/` and update
`api/migrations/database-structure.sql`.

Add nullable columns to `activity_locations`:

```sql
altitude DECIMAL(9, 2) NULL,
altitude_accuracy DECIMAL(8, 2) NULL
```

Requirements:

- migration must work on the supported MariaDB 10.11 deployment;
- do not add seed data;
- preserve existing location rows;
- use the schema's normalized `utf8mb4` collation conventions even though the
  new columns are numeric;
- confirm route insert/read queries support `null` values;
- update the database-only structure dump used for new deployments.

## API contract changes

### Create activity

`POST /api/activities` already accepts ordered `gpsLocations`. Extend every
location item with optional nullable:

- `altitude`;
- `altitudeAccuracy`.

Validate the new fields before database access. Store them in the same
transaction as the activity and other location fields.

### Read route

`GET /api/activities/{id}/locations` returns ordered samples with:

- `sequence`;
- `segment`;
- `latitude`;
- `longitude`;
- `accuracy`;
- `altitude`;
- `altitudeAccuracy`;
- `recordedAt`.

Keep ordering by sequence. Return JSON `null`, not omitted properties, when no
altitude measurement exists, unless the project's established API convention
requires optional omission consistently.

### OpenAPI

Update `api/openapi.yaml` in the same change:

- location input/output schemas;
- nullable altitude fields and units;
- friend-aware authorization description;
- `403` response and error behavior;
- unchanged owner/admin behavior;
- examples must contain fake coordinates only.

## Local live-tracking changes

Update the live tracking pipeline end to end:

1. Read `altitude` and `altitudeAccuracy` from `GeolocationPosition.coords`.
2. Normalize unavailable or invalid values to `null`.
3. Add both fields to the in-memory live location.
4. Persist both fields in the IndexedDB location repository.
5. Preserve them during version migration and route restoration.
6. Add them to `gpsLocations` when the completed activity is sent to the API.
7. Preserve current horizontal distance, drift, speed, segmentation, retry, and
   storage-limit behavior.

Increment the IndexedDB schema version only if its object-store schema/indexes
require it. IndexedDB object values can normally accept the additional optional
properties without a structural migration, but legacy normalization still
needs tests.

Do not calculate elevation gain in this feature.

## Frontend configuration

Add typed Mapbox configuration to development and production environments:

```ts
mapbox: {
  accessToken: '',
  styleUrl: 'mapbox://styles/mapbox/outdoors-v12',
  routeColor: '#ed7a32'
}
```

Configuration requirements:

- do not hard-code the token in a component or service;
- support deployment-time generation/replacement of the production environment
  value using the project's existing deployment approach;
- validate missing configuration and enter the controlled map-error state;
- treat the frontend Mapbox token as public, not as a secret;
- restrict the token in Mapbox to approved application origins/domains and only
  required scopes;
- document local and production setup in the project README or feature setup
  section;
- never commit a private/secret Mapbox token.

## Dependency strategy

Use the supported Mapbox GL JS package and its official stylesheet. Pin an
appropriate compatible version in the Angular application's dependencies.

The initial application bundle must not eagerly include Mapbox. Use dynamic
import from the route-map feature so users who never open a GPS-enabled activity
do not download the map runtime.

Do not load Mapbox from an unpinned third-party script tag.

## Frontend architecture

### `ActivityRouteMapComponent`

Create a reusable standalone component under:

```text
angular-app/src/app/shared/ui/activity-route-map/
```

Recommended files:

```text
activity-route-map.component.ts
activity-route-map.component.html
activity-route-map.component.css
activity-route-map.component.spec.ts
activity-route-map.helpers.ts
activity-route-map.helpers.spec.ts
```

The component should be as presentational as practical.

Inputs:

- ordered GPS locations or prepared route segments;
- Mapbox access token;
- style URL;
- route color;
- localized/retry configuration only where inputs are preferable to direct
  translation use.

Outputs:

- optional retry event if retry ownership stays in the page container.

Responsibilities:

- lazy import Mapbox;
- create and destroy the map instance;
- add the route source and line layer after the style loads;
- fit bounds to all usable coordinates;
- add navigation and fullscreen controls;
- expose loading/error/ready UI states;
- retry using a newly created map instance;
- call `map.resize()` when entering/leaving fullscreen or when its container
  changes size;
- remove all Mapbox listeners and the instance on component destruction.

The component must not fetch activities, routes, friendships, or tokens from
the API.

### Helpers

Keep pure transformations outside the component class:

- validate/map route coordinates;
- group points by `segment`;
- sort or verify sequence order;
- convert segments to GeoJSON `MultiLineString`;
- calculate route bounds;
- identify whether at least one drawable segment exists.

Do not mutate API response arrays.

### Activity-detail page

The page remains the data container:

- load activity details first;
- inspect `hasGpsLocations`;
- request GPS locations only when true;
- pass locations and environment configuration to the map component;
- distinguish access denial, route failure, and map-render failure;
- avoid loading Mapbox when no route exists.

Place the map after the date/time/distance/type metrics and before the people
section. Reserve the space immediately below the map for a future elevation
chart, but do not render a placeholder for it now.

## Route rendering

Convert persisted points to a GeoJSON `MultiLineString`.

Rules:

- group coordinates by `segment`;
- keep persisted sequence order within each segment;
- never connect the end of one segment to the start of another;
- include only finite longitude/latitude pairs within valid ranges;
- a segment requires at least two valid points to render a line;
- use all drawable segments for initial bounds;
- if no segment contains two valid points, do not initialize the map;
- altitude must not be included as the GeoJSON Z coordinate in this first
  version unless Mapbox rendering is verified not to alter bounds/line behavior;
  retain altitude separately for the future graph.

Suggested line styling:

- color: environment `routeColor`, default `#ed7a32`;
- width: responsive but approximately 4 px;
- rounded line joins and caps;
- sufficient opacity and contrast on the outdoor style.

## Map behavior and layout

- Use Mapbox Outdoors (`mapbox://styles/mapbox/outdoors-v12`) by default.
- Initial map height: approximately 320 px on larger screens.
- Mobile height: approximately 260 px.
- Use the existing rounded-card visual style.
- Fit the complete route with padding so it is not hidden under controls.
- Apply a reasonable maximum initial zoom for very short routes.
- Preserve the user's pan/zoom while the map remains mounted.
- Enable Mapbox `NavigationControl` and `FullscreenControl`.
- Keep required Mapbox attribution visible.
- Provide an accessible label for the map region.
- Ensure controls are keyboard accessible and retain visible focus states.
- Respect reduced-motion preferences where Mapbox configuration permits it.

## UI states

### No stored GPS data

Condition: `hasGpsLocations` is false.

Behavior: do not request the route, do not import Mapbox, and render no map or
map-related empty-state text.

### Route loading

Condition: location request is running.

Behavior: render a compact accessible loading state in the future map area. Do
not initialize Mapbox yet.

### Route unavailable

Condition: API returns `403 ACTIVITY_UNAVAILABLE`.

Behavior: use the existing activity-unavailable message. Do not initialize
Mapbox.

### No drawable line

Condition: the API returned points but no segment contains at least two valid
coordinates.

Behavior: omit the map. Log sanitized diagnostic counts only, without
coordinates.

### Map error

Condition: missing/invalid token, dependency import failure, WebGL failure,
style/source/layer error, or map initialization failure.

Display:

```text
Zemljevida trenutno ni bilo mogoče prikazati.
[Poskusi znova]
```

English:

```text
The map could not be displayed at this time.
[Try again]
```

Retry must dispose of the failed instance before creating a new one.

## Localization

Create a dedicated translation file for both languages, for example:

```text
assets/lang/en/activity-route-map.json
assets/lang/si/activity-route-map.json
```

Add it to the translation loader list. Include at least:

- map region accessible label;
- route loading;
- map unavailable;
- retry;
- fullscreen/control labels only when Mapbox does not provide suitable localized
  accessible labels.

Do not place user-facing strings directly in TypeScript or templates.

## Error logging

Use `LogWrapper` rather than direct console calls.

Allowed diagnostic context:

- activity ID if the project's logging policy permits internal IDs;
- stage such as dependency import, style load, source creation, or fit bounds;
- sanitized error category;
- number of received/valid points and segments.

Never log:

- access token;
- raw coordinates;
- altitude samples;
- complete API responses;
- authorization headers.

## Tests

Follow `AGENT.md`: every new component, service, and helper requires unit tests.

### Pure helper tests

- points are grouped by segment;
- separate segments remain separate in `MultiLineString`;
- order is preserved;
- invalid coordinates are removed;
- one-point segments are not rendered;
- valid bounds include every drawable segment;
- input arrays are not mutated;
- optional altitude does not affect the horizontal route geometry.

### Component tests

Mock the dynamic Mapbox import and map instance. Do not contact Mapbox in unit
tests.

- creates a map with configured token/style;
- adds the orange route layer after style load;
- adds navigation and fullscreen controls;
- fits route bounds;
- calls resize for fullscreen/container changes where implemented;
- removes map and listeners on destroy;
- shows controlled error state on import/init/style failure;
- retry disposes and creates a fresh instance;
- does not initialize without a drawable route.

### Activity-detail page tests

- does not request locations when `hasGpsLocations` is false;
- requests locations when true;
- passes route/configuration to the map component;
- renders route loading state;
- handles `403 ACTIVITY_UNAVAILABLE`;
- handles route request failure without breaking existing details;
- does not expose the map after access is revoked.

### Live tracking/persistence tests

- captures finite altitude and altitude accuracy;
- stores `null` when browser values are unavailable;
- rejects/normalizes invalid altitude metadata without rejecting valid horizontal
  coordinates;
- IndexedDB round-trip preserves values;
- save request contains altitude fields;
- restored legacy samples without altitude remain valid.

### API validation and authorization tests

- owner reads route;
- accepted friend reads route;
- pending friend receives `403`;
- stranger receives `403`;
- removed friend immediately receives `403`;
- administrator reads route;
- missing/invalid token receives `401`;
- nonexistent activity receives `404`;
- altitude fields persist and retain `null` correctly;
- malformed altitude input receives controlled `400`;
- route samples remain ordered and segmented.

### Build checks

After implementation run all checks required by `AGENT.md`, including frontend
format/lint/tests/typecheck/build, API typecheck/build/authorization tests,
OpenAPI validation where available, and `git diff --check`.

Verify the production bundle output confirms Mapbox is in a lazy chunk rather
than the initial application bundle.

## Manual mobile/browser verification

Test at minimum:

- current iPhone Safari;
- Android Chrome;
- desktop Chrome/Safari or another supported desktop browser.

Scenarios:

1. Own activity with a continuous route.
2. Own activity containing multiple foreground segments.
3. Friend activity while friendship is accepted.
4. Same friend route immediately after friendship removal.
5. Existing activity without GPS locations.
6. Route with only one stored point.
7. Invalid/missing Mapbox token.
8. Network/style failure followed by retry.
9. Pan, zoom, fullscreen enter/exit, and return to page.
10. Long route with many accepted samples.
11. Light/dark surrounding content if themes are later introduced.

## Performance requirements

- Mapbox must remain lazy loaded.
- Do not request location data for activities without GPS.
- Create only one live map instance per rendered component.
- Destroy the instance when navigating away.
- Avoid rebuilding GeoJSON on unrelated Angular change detection.
- Use OnPush and signals consistent with the application architecture.
- Test representative long routes near the accepted 20,000-point limit.

If long routes cause unacceptable rendering time, add a later route
simplification strategy that preserves the raw database samples. Do not silently
discard stored data as part of this feature.

## Deployment preparation

1. Create a public Mapbox token for local/staging use.
2. Create a separate production public token.
3. Restrict production token origins to the actual frontend domains.
4. Allow only scopes required to read styles and tiles.
5. Configure environment values in local and deployment builds.
6. Apply the altitude database migration before deploying the updated API.
7. Deploy/restart the API before the frontend that sends altitude fields.
8. Confirm OpenAPI deployed with the matching API build.
9. Verify token usage and request limits in the Mapbox dashboard.

## Implementation sequence

1. Add altitude fields to shared interfaces and normalization helpers.
2. Extend live tracking and IndexedDB persistence with tests.
3. Create and verify the MariaDB migration and structure dump.
4. Extend API validation, insert, retrieval, and OpenAPI schemas.
5. Update GPS-route authorization for accepted friends and add integration
   tests.
6. Add typed environment configuration and Mapbox dependency.
7. Implement/test GeoJSON segment and bounds helpers.
8. Implement/test `ActivityRouteMapComponent` using a mocked Mapbox boundary.
9. Integrate route loading and the map into `ActivityDetailPage`.
10. Add translations and responsive styling.
11. Run automated quality checks and production build analysis.
12. Verify manually on mobile devices and staging.

## Acceptance criteria

- Opening a GPS-enabled activity automatically displays an interactive outdoor
  map.
- The route is displayed as a configurable orange line.
- Separate tracking segments are never joined by artificial lines.
- The map initially frames the complete drawable route.
- Pan, zoom, navigation controls, and fullscreen work on mobile and desktop.
- An activity without GPS data shows no map and does not download Mapbox.
- A map failure shows the localized message and a functioning retry button.
- The owner, accepted friends, and administrators can view the route.
- Pending, removed, or unrelated users cannot view the route.
- Removing friendship revokes route access on the next request.
- New GPS samples preserve optional altitude and altitude accuracy through local
  storage, API submission, MariaDB, and API retrieval.
- Existing samples without altitude remain compatible.
- No raw coordinates or Mapbox tokens appear in application logs.
- OpenAPI matches the implemented API.
- All required automated tests and production builds pass.
- Mapbox remains outside the initial Angular bundle.

## Future elevation-profile feature

A later feature may use the saved `altitude` and `altitudeAccuracy` values to
display a graph directly below the map and calculate ascent/descent. That
feature must define filtering/smoothing rules because browser altitude can be
missing or noisy. This document intentionally does not define or implement
those calculations.
