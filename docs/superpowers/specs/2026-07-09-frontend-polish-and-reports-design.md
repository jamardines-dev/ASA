# Frontend polish + report submission UI

## Context

AshAlert Cebu's frontend (React + TS + Vite + react-leaflet) is functional but visually plain: a flat header, a bare map, and a simple side panel. The `POST /api/reports` endpoint already exists in the backend and in `api.ts` (`submitReport`), but there's no UI to call it — crowdsourced ash reports can only be submitted via curl/Postman today.

This spec covers four things:
1. A visual design pass on the existing screen (no new screens, no new dependencies).
2. A UI for submitting an ash sighting report, using the visitor's current location or a manually-set location.
3. Real-time push updates: area status changes broadcast to all connected clients instantly via Server-Sent Events (SSE), replacing the 5-minute poll.
4. "Set my location": a manual override for when GPS is denied, inaccurate, or the user wants to check/report on behalf of a different spot — click the map to place a draggable pin that becomes the active location for both "Check my location" and "Report ash here".

## Goals

- Make status (SAFE/CAUTION/UNSAFE) the dominant visual signal, scannable at a glance.
- Keep the app calm and utilitarian — this is read during a live ashfall event, not a marketing site.
- Let users submit a location-based ash report without leaving the page or reloading.
- Area status changes (admin update or crowd-report escalation) appear on every open client within seconds, without a manual refresh or waiting on a poll interval.
- No new npm packages on the frontend. One new backend dependency at most (none needed — SSE is built into Spring MVC via `SseEmitter`).

## Non-goals

- Rendering pending/recent report pins on the map.
- Auth, rate limiting, or admin UI changes.
- True geographic hazard interpolation (IDW or similar) producing a real continuous density surface — the blended zone blobs are a CSS/visual approximation only, not computed from geographic data. Real interpolation stays a roadmap idea (README already tracks this).

## Visual design

### Header
- Keep `AshAlert Cebu` title + subtitle.
- Add a summary strip under the title showing live counts, e.g. `2 unsafe · 3 caution · 10 safe`, derived from `areas` in `App.tsx` (no new API call). Each count uses its status color.
- Legend stays but is restyled as small pill chips (background = `STATUS_META[key].bg`, text = `.color`) instead of plain dot + label, matching the `.status-pill` style already used in `SafetyPanel`.

### Map card
- Replace the flat `1px solid var(--line)` border with a soft shadow (`box-shadow`) for a lifted-card look; keep a hairline border for definition on light backgrounds.
- Map height becomes responsive: `min(60vh, 560px)` instead of fixed `520px`, so it doesn't dominate small screens.
- Areas render as blended **zone blobs** instead of small point markers, approximating a continuous hazard-map look (like a flood/ashfall hazard raster) using frontend-only styling — no backend interpolation:
  - Each area is a larger circle (status color fill, ~5.5km fixed radius, tunable) with **no hard border**, a soft radial-gradient fill that fades from ~45% opacity at center to ~0% at the edge, and a CSS blur filter on the layer — so adjacent same-status areas visually bleed into each other into a blob instead of reading as separate discrete shapes, similar to the reference hazard-map's blended regions. The larger radius means neighboring areas (e.g. Cebu City/Mandaue/Lapu-Lapu) overlap and merge, reading as continuous coverage rather than isolated dots.
  - Leaflet's SVG/Canvas renderer doesn't support CSS `filter: blur()` directly on individual `CircleMarker`s well, so this is implemented as a dedicated overlay: render zone circles into a `Pane` (custom Leaflet pane) with a CSS `filter: blur(Npx)` applied to the whole pane, letting overlapping circles of the same color merge visually while tile/label panes above stay sharp.
  - Each area keeps a small solid-color center dot (6-8px, full opacity, no blur) at its actual coordinate so precise location and click target remain unambiguous even though the surrounding zone is soft-edged.
  - Click/tap target is the center dot (via a small non-blurred `CircleMarker`), not the blurred zone shape — keeps hit-testing precise and still opens the same popup / calls `onSelect`, unchanged.
- UNSAFE zone center dots get a CSS pulse animation (an outer ring that scales/fades via `@keyframes`) so they draw the eye immediately. SAFE/CAUTION dots unchanged.
- This is an approximation, not true geographic interpolation — noted as a non-goal below.

### Safety panel
- "Check my location" button gets a location icon (inline SVG or emoji, e.g. 📍) alongside the label, kept as the primary CTA (dark fill, as today).
- `StatusBlock` result card gets a `border-left: 4px solid <status color>` and slightly more padding so it reads as a result, not inline text — applies to both the "check my location" result and the "selected area" panel.
- Error and muted text keep existing classes (`.error`, `.muted`); copy gets minor friendliness tweaks (e.g. add a period/consistent tone), no structural change.

### Responsive
- Below 820px, layout already stacks (map above panel) — no structural change, just verify spacing/touch target sizes (buttons ≥ 44px tall) hold up at narrow widths.

### Colors/tokens
- Reuse existing CSS custom properties in `styles.css` (`--ink`, `--paper`, `--card`, `--line`) and `STATUS_META` colors — no new palette, just new usages (shadows, pill chips, left-border accents, zone blob gradients, pulse animation color pulled from the area's status color).

## Report submission UI

### Location
New button in `SafetyPanel`, in the same "Check my location" panel, below the existing check button: **"Report ash here"**.

### Flow
1. User clicks "Report ash here".
2. If a manually-set location is active (see "Set my location" below), use its coordinates directly and skip geolocation. Otherwise, same geolocation pattern as `runCheck` (`navigator.geolocation.getCurrentPosition`), with its own loading/error state (separate from the check-location state, since both could be used in the same session).
3. On success, an inline form appears in place (no modal): an optional `<textarea>` for a note (placeholder: "What do you see? (optional)") + Submit/Cancel buttons.
4. Submit calls `submitReport(lat, lng, note)` from `api.ts`.
   - On success: show a small success message ("Thanks — your report was submitted.") that auto-clears after ~4s, and collapse the form. Any status escalation from the report is reflected on the map via the SSE broadcast described in "Real-time updates" below — no manual re-fetch needed.
   - On failure: reuse `.error` styling, message "Couldn't submit your report. Is the backend running?" — matches the existing check-location error pattern. Form stays open so the user can retry.
5. Cancel discards the form and resets to the initial button state.
6. Geolocation denial/unsupported: same messages/pattern as `runCheck` ("Location permission denied…", "Geolocation is not supported…").

### State ownership
- New local state in `SafetyPanel`: `reportPhase: 'idle' | 'locating' | 'form' | 'submitting' | 'success'`, `reportCoords`, `reportNote`, `reportError`.
- `App.tsx` passes a `onReportSubmitted` callback (or just re-exposes its existing `load` function) to `SafetyPanel` so a successful report triggers `fetchAreaStatuses()` again.

## Set my location

### Purpose
A manual override for GPS: click/tap the map to set an active location used by both "Check my location" and "Report ash here", for when geolocation is denied/inaccurate, or the user wants to check/report a different spot than where they're standing.

### UI
- A toggle button in the safety panel, near the existing location controls: **"Set my location"**. Clicking it arms "pick mode" (button shows active/pressed state, cursor becomes crosshair over the map, a small hint appears: "Tap the map to set your location").
- Next click/tap on `AreaMap` places a draggable marker (a distinct pin icon, not a status zone dot) at that point and exits pick mode automatically. The marker can be dragged afterward to fine-tune the position; drag-end updates the active location.
- A small "Clear" (×) affordance next to the active-location marker's summary in the panel removes it and reverts "Check my location"/"Report ash here" to using live geolocation.
- Only one active location at a time — placing a new pin (or clicking pick mode again) replaces the previous one.

### Behavior
- When an active manual location exists:
  - "Check my location" uses it instead of `navigator.geolocation`, calling `checkMyLocation(lat, lng)` directly (no permission prompt).
  - "Report ash here" uses it instead of geolocation (see Report submission UI → Flow, step 2).
  - The panel shows a small persistent line indicating a manual location is active (e.g. "Using pinned location · Clear"), so it's clear why results might not match the user's real GPS position.
- Manual location is in-memory only (component state in `App.tsx`, lifted so both `AreaMap` and `SafetyPanel` can read/set it) — not persisted across reloads. Persisting it is out of scope (see Non-goals).

### State ownership
- `activeLocation: { lat: number; lng: number } | null` and `pickMode: boolean` live in `App.tsx`, passed down to `AreaMap` (to enter pick mode, render the draggable marker, and report clicks/drags back up) and to `SafetyPanel` (to read the active location and show the "using pinned location" line).
- `AreaMap` gets new props: `activeLocation`, `pickMode`, `onPickLocation(lat, lng)`, `onDragLocation(lat, lng)` — implemented via Leaflet's `useMapEvents({ click })` hook (only active while `pickMode` is true) and a draggable `Marker` for the pin.

## Real-time updates (SSE)

### Backend
- New endpoint `GET /api/areas/stream` in `AreaController`, returning `SseEmitter`. No new dependency — `SseEmitter` is part of `spring-webmvc`, already on the classpath.
- New `SseBroadcastService` (or a small addition to `AreaStatusService`) holds a thread-safe list (`CopyOnWriteArrayList<SseEmitter>`) of connected emitters. On subscribe: create an emitter (no timeout / long timeout, e.g. 0 = never), add it to the list, remove it on completion/timeout/error callbacks.
- Broadcast trigger: both existing `@CacheEvict` points in `AreaStatusService` (`updateStatus()` for admin PUT, `submitReport()` for crowd reports) additionally call a `broadcast()` method after evicting. `broadcast()` recomputes `getAllStatuses()` (now uncached, so it reflects the new state) and sends the full area list as one SSE event (`event: areas`, `data: <json array>`) to every connected emitter, removing any that fail to write (client disconnected).
- Full-list broadcast (not a diff) keeps this simple and matches the shape the frontend already consumes from `GET /api/areas/status` — the frontend can reuse the same `AreaStatusDto` parsing.
- CORS: `CorsConfig` needs to permit the `/api/areas/stream` path the same as other `/api/**` routes (verify it already covers this by pattern; adjust if scoped narrower).

### Frontend
- `api.ts` gets a `subscribeToAreaUpdates(onUpdate: (areas: AreaStatus[]) => void): () => void` helper wrapping `EventSource('/api/areas/stream')`, listening for the `areas` event, JSON-parsing `event.data`, and calling `onUpdate`. Returns an unsubscribe function that calls `EventSource.close()`.
- `App.tsx` replaces the `setInterval(load, REFRESH_MS)` polling with this subscription: still calls `fetchAreaStatuses()` once on mount for the initial paint, then opens the SSE subscription for live updates. `REFRESH_MS` and the interval are removed.
- Connection resilience: `EventSource` auto-reconnects on drop by default (browser-native behavior) — no custom retry logic needed. On reconnect there's a brief gap where state is stale until the next broadcast; acceptable since a reconnect is rare and any admin/report action re-triggers a broadcast anyway. If `EventSource` errors immediately (e.g. backend down), fall back to the existing `error` banner ("Couldn't load area statuses…").
- The manual re-fetch after a successful report submit (see Report submission UI → Flow, step 4) becomes redundant once SSE is live, since the backend's own `submitReport` broadcast will push the update — that explicit re-fetch call can be dropped in favor of relying on the SSE push. Keep the success message UI regardless (it's still useful confirmation independent of when the map updates).
- Zone circles/legend/summary strip re-render reactively whenever `areas` state updates from either source (initial fetch or SSE push) — no special-casing needed since they already derive from the same `areas` array.
- **Live connection indicator**: `subscribeToAreaUpdates` takes an optional `onConnectionChange(connected: boolean)` callback, driven by `EventSource.onopen`/`onerror`. `App.tsx` tracks a `live` boolean and renders a small dot + label in the header ("Live" green / "Reconnecting…" red) so the real-time behavior is visibly confirmed, not just silently correct.
- **Change-flash**: `App.tsx` keeps a ref of each area's previous status; whenever an update (initial fetch excluded) changes an area's status, that area's id is added to a `changedIds` set for ~2.5s and passed down to `AreaMap`. The area's center dot gets a one-shot `zone-flash-marker` ring animation (distinct from the continuous UNSAFE pulse) so a live update is visually obvious as it happens.

### Zone blob rendering (gradient blend)
- Zone blobs use true per-status SVG radial gradients (`url(#zone-gradient-SAFE|CAUTION|UNSAFE)`, injected once into the `zoneBlobs` pane's SVG `<defs>`) instead of a flat `fillOpacity` — each gradient fades from ~60% opacity at center to 0% at the edge, combined with the existing pane-level blur, for a softer, more intentional-looking blend at typical zoom levels than flat-opacity + blur alone.
- Zone radius increased to a fixed ~5.5km so neighboring areas (e.g. Cebu City/Mandaue/Lapu-Lapu) overlap and read as continuous coverage rather than isolated dots.

## Testing

- Manual verification only (per `verify` skill) — no existing test suite for the frontend. Run `npm run dev`, exercise:
  - Legend/summary strip render correctly with seeded data.
  - Zone blobs render with soft blended edges, adjacent same-status areas visually merge; center dots stay sharp and clickable; pulse animation shows on UNSAFE center dots.
  - "Check my location" still works unchanged.
  - "Report ash here" full happy path (geolocation allow → form → submit → success message → map updates via SSE push, no manual refresh).
  - Real-time push: open the app in two browser tabs, trigger an admin status update (`PUT /api/admin/areas/{id}/status`) via curl in a third window, confirm both tabs' zone circles update within a couple seconds without reloading.
  - SSE reconnect: stop and restart the backend while the frontend is open, confirm the browser's `EventSource` auto-reconnects and the app recovers (no permanent stuck error state).
  - Error paths: geolocation denied, backend down on initial load (confirm the "is the backend running" banner shows).
  - Responsive check at ~375px width and ~800px width.
