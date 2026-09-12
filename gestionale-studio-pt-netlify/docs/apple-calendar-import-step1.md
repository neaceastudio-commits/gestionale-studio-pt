# Apple Calendar import — Step 1 (read-only mirror)

## Goal

Mirror events from the shared iCloud calendar `Sedute Personal Studio` into NEACEA without creating or modifying normal `appointments`.

This first step is intentionally isolated from package/session logic, booking validation, room capacity and PT availability rules.

## Non-goals for Step 1

- Do not write to `appointments`.
- Do not consume package sessions.
- Do not enforce booking rules.
- Do not change PT availability.
- Do not write back to iCloud.
- Do not infer client/package links yet.

## Proposed storage

Create a dedicated table `external_calendar_events` with at least:

- `id` UUID / internal key
- `source` = `icloud`
- `calendar_name`
- `external_uid` (Apple/CalDAV event UID, unique per source)
- `title`
- `starts_at`
- `ends_at`
- `notes`
- `external_etag`
- `external_updated_at` when available
- `sync_status` (`imported`, later `matched`, `needs_review`, `ignored`)
- `raw_metadata` JSONB (optional, no credentials)
- `created_at`
- `updated_at`

Recommended unique key: `(source, external_uid)`.

## Server-side configuration only

Never store iCloud credentials in frontend code or Supabase rows.

Suggested Netlify environment variables:

- `ICLOUD_APPLE_ID`
- `ICLOUD_APP_SPECIFIC_PASSWORD`
- `ICLOUD_CALENDAR_NAME=Sedute Personal Studio`
- `ICLOUD_CALDAV_BASE_URL` (optional override if discovery requires it)

Use an app-specific password, not the primary Apple Account password.

## Import flow

1. Server-side Netlify function authenticates to iCloud Calendar/CalDAV.
2. Discover the calendar collection matching `Sedute Personal Studio`.
3. Read events in a bounded date range (initially e.g. -30 / +180 days).
4. Upsert events by `(source, external_uid)` into `external_calendar_events`.
5. Mark missing/deleted external events without touching `appointments`.
6. Return a dry summary: found / created / updated / removed / errors.

## UI for first test

Add a direction-only admin action such as `Sincronizza Apple (test)`.

Expected result example:

- 87 eventi trovati
- 87 eventi esterni importati
- 0 appuntamenti NEACEA modificati

External events should render with a distinct visual marker (e.g. Apple icon / dashed border) and remain non-booking entities.

## Acceptance criteria

Step 1 is complete only when:

1. title/date/start/end are mirrored correctly;
2. moving an event in Apple updates only its external mirror;
3. deleting an event in Apple removes/archives only its external mirror;
4. no row in `appointments` is created/updated/deleted;
5. package/session counters remain unchanged;
6. booking validation is never invoked by the import;
7. existing Apple subscription feed from NEACEA remains unchanged.

## Next step (not part of this implementation)

Step 2 will match mirrored events to NEACEA clients/PTs while still keeping the mirror non-destructive until explicitly promoted to a real appointment.
