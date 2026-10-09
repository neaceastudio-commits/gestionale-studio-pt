#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for file in app/calendario-studio/js/{pt-session-model,pt-pair-sessions,app,services,supabase,pt-availability-overview,calendar-audit-view}.js netlify/functions/lib/{calendar-audit-endpoint,apple-calendar-package,pt-client-scope,pt-session-log}.js; do
  node --check "$file"
done
node --test tests/calendar-pt-pair.test.cjs tests/calendar-audit-auth.test.cjs tests/package-early-session.test.cjs tests/pt-session-records-api.test.cjs
node tests/package-renewal-ledger.test.cjs
node tests/apple-caldav-display.test.cjs
if [[ -n "${PGLITE_MODULE:-}" ]]; then
  node --test tests/calendar-pt-pair-postgres.test.cjs
fi
if [[ "${CALENDAR_BROWSER_TEST:-0}" == "1" ]]; then
  node tests/calendar-pt-pair-browser.cjs
  node tests/calendar-client-pair-browser.cjs
  node tests/calendar-pt-correction-browser.cjs
fi
