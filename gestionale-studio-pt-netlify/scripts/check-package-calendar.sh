#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node --check netlify/functions/lib/package-calendar-planner.js
node --check netlify/functions/schedule-client-package.js
node --check app/acquisizione/activation-calendar-integration.js
node tests/acquisition-calendar-integration.test.cjs
node tests/acquisition-calendar-wrapper.test.cjs
node tests/apple-calendar-policy.test.cjs
node --test tests/package-calendar-planner.test.cjs tests/schedule-client-package.test.cjs
if [[ "${CALENDAR_BROWSER_TEST:-0}" == "1" ]]; then
  node tests/acquisition-calendar-browser.cjs
fi
