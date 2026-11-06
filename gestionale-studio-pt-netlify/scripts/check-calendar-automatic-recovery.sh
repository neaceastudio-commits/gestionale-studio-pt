#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node -e 'const major=Number(process.versions.node.split(".")[0]);if(major<22||major>=25)throw Error("Usa Node >=22 <25 dichiarato in tools/coaching-editor/package.json")'
for file in app/calendario-studio/js/{app,services,supabase,pt-pair-sessions}.js netlify/functions/lib/calendar-audit-endpoint.js; do
  node --check "$file"
done
node --test tests/calendar-automatic-recovery.test.cjs tests/calendar-pair-recovery.test.cjs tests/calendar-audit-auth.test.cjs
if [[ "${CALENDAR_SQL_CONCURRENCY:-0}" == "1" ]]; then
  node --test tests/calendar-automatic-recovery-concurrency.test.cjs
fi
if [[ "${CALENDAR_BROWSER_TEST:-0}" == "1" ]]; then
  node tests/calendar-automatic-recovery-browser.cjs
fi
