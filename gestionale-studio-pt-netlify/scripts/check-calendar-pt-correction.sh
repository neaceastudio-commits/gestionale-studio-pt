#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node --check app/calendario-studio/js/pt-session-correction.js
node --check app/calendario-studio/js/app.js
node --check app/calendario-studio/js/supabase.js
node --check netlify/functions/lib/calendar-audit-endpoint.js
node --check tools/apple-caldav-production/functions/lib/core.cjs
node --test tests/calendar-pt-correction.test.cjs tests/calendar-audit-auth.test.cjs
node tests/apple-caldav-display.test.cjs
if [[ "${CALENDAR_POSTGRES_TEST:-0}" == "1" ]]; then
  node tests/calendar-pt-correction-postgres.test.cjs
  CORRECTION_JSONB=1 node tests/calendar-pt-correction-postgres.test.cjs
  node tests/apple-caldav-production.test.cjs
fi
if [[ "${CALENDAR_BROWSER_TEST:-0}" == "1" ]]; then
  node tests/calendar-pt-correction-browser.cjs
  node tests/calendar-client-pair-browser.cjs
fi
