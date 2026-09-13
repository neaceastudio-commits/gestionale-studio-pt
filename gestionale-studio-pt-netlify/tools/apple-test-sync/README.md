# Apple bidirectional V1 — isolated TEST only

Not deployed or tested against iCloud. The existing ICS subscription cannot be edited.
The three end-to-end tests use a local CalDAV HTTP simulator, the actual TEST
Function/authentication gateway, and a disposable PostgreSQL instance with the existing
audit migrations. No remote data or calendar is changed.

## Scope and setup

Use an explicitly created, writable, dedicated collection named exactly
`NEACEA TEST CALDAV`. Never configure a PT or historical Studio calendar.
Use only newly created TEST fixtures, not existing appointments/history.
Provision credentials through environment variables; never commit or print them.

Worker environment:

- `APPLE_TEST_CALDAV_URL`: exact dedicated collection HTTPS URL.
- `APPLE_TEST_CALDAV_USER`, `APPLE_TEST_CALDAV_PASSWORD`: CalDAV credentials.
- `APPLE_TEST_GATEWAY_URL`: isolated `neacea-caldav-test-gianluca` Function URL ending
  `/.netlify/functions/apple-test-sync` (production hosts rejected).
- `APPLE_TEST_ACCESS_TOKEN`: current signed Direction session. Expiry stops sync;
  there is no anonymous fallback or automatic privileged session renewal.
- `APPLE_TEST_MAPPING_DB`: absolute persistent SQLite file outside the repository.

Isolated Function environment:

- `APPLE_TEST_SYNC_ENABLED=true` (disabled by default).
- `APPLE_TEST_APPOINTMENT_IDS`: explicit comma-separated TEST appointment IDs.
- Existing server Supabase key and session signing secret, supplied via env.

Only appointments with IDs starting `TEST_`, TEST client IDs and TEST operator IDs
are accepted. The server rereads verified current actor roles. All writes use
`calendar_audit_write` → `calendar_save_appointment`, with optimistic comparison
inside its transaction. The existing database accepts source `calendar`, so the
V1 records that source and the verified Direction actor; it does not claim the
future `apple` source is enabled. No database migration is needed.

Deploy the Function only on the isolated test site when its configuration is ready.
Do not deploy the worker or this Function to production.

## Explicit mapping and execution

Start with one newly created booked TEST appointment and a manually provisioned
nonrecurring TEST event with matching date/time/duration and explicit machine UID
`neacea-test-<appointment_id>`. This UID is assigned during TEST fixture provisioning,
not inferred from a name. An ordinary existing Apple event is never adopted.

```sh
python3 tools/apple-test-sync/sync.py link --appointment TEST_ONE --href one.ics
python3 tools/apple-test-sync/sync.py once
```

Run `once` after each test change. V1 is a manually invoked polling worker, not a
background service or instant push notification. The SQLite mapping and last
successful state survive process restarts; preserve this file between runs.
Only mapped hrefs are read: there is no event discovery/import/backfill.

Date/time/duration are synchronized in either direction. Apple deletion cancels
the linked booking; NEACEA cancellation deletes only its linked TEST event.
Fatto/no-show are locked. Client/PT/service changes and concurrent conflicting
edits stop processing. No balance or package fields are accepted from Apple.
Unknown events, recurring events, ambiguous DST times and nested event components
(including alarms in this V1) are refused. Authentication/HTTP errors are never
interpreted as deletion. Remote mutations require strong ETags and `If-Match`.
A successful side write followed by a worker failure converges on the next run.

A conflict/error stops the run without advancing that mapping. Earlier independent
mappings may already have completed; this is not a distributed transaction.
SQLite stores mapping and operational slot/state only, not CalDAV credentials or
free-form appointment notes. Deleting the mapping file does not delete events.

## Reproducible local verification

```sh
EMBEDDED_POSTGRES_MODULE=/path/to/embedded-postgres/dist/index.js \
  node tests/apple-test-sync.test.cjs
```

The harness configures `APPLE_TEST_LOCAL_SIMULATION=true` to allow loopback HTTP;
all fixture credentials are synthetic. It executes separate worker processes to
verify persistent mapping. Tests cover the three requested transitions with
remaining sessions fixed at 8; authentication, protected fields, audit attribution,
Fatto/no-show, recurrence, failed reads, conflicting edits, ETag refusal,
idempotent retry, and reverse cancellation. Temporary fixtures are removed.

Real Apple verification remains blocked until access to the dedicated writable
TEST collection and credentials is provided through env. No production deployment
is needed or authorized by this setup.
