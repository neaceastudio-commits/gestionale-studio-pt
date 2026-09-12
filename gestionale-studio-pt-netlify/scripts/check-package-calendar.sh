#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node --check netlify/functions/lib/package-calendar-planner.js
node --check netlify/functions/schedule-client-package.js
node --check app/acquisizione/activation-calendar-integration.js
node --check app/calendario-studio/js/app.js
node --check app/calendario-studio/js/services.js
node --check app/calendario-studio/js/session-fixes.js
node --check app/calendario-studio/js/supabase.js
node tests/acquisition-calendar-integration.test.cjs
node tests/acquisition-calendar-wrapper.test.cjs
node tests/apple-calendar-policy.test.cjs
node --test tests/package-calendar-planner.test.cjs tests/schedule-client-package.test.cjs
if [[ "${CALENDAR_BROWSER_TEST:-0}" == "1" ]]; then
  for failure in '' beforeCommit afterCommit; do
    CALENDAR_FAILURE="$failure" node tests/acquisition-calendar-browser.cjs
  done
fi
if [[ "${CALENDAR_POSTGRES_TEST:-0}" == "1" ]]; then
  node tests/calendar-save-concurrency.test.cjs
  node tests/calendar-postgres.test.cjs
  node tests/calendar-status-persistence.test.cjs
fi
