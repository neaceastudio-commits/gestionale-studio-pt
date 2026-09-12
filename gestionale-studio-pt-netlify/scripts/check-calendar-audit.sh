#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node --test tests/operator-availability-sync.test.cjs
node --check app/calendario-studio/js/calendar-audit.js
node --test tests/calendar-audit-auth.test.cjs
node tests/calendar-audit-postgres.test.cjs
node tests/calendar-audit-browser.cjs
node tests/acquisition-calendar-integration.test.cjs
node tests/acquisition-calendar-browser.cjs
bash scripts/check-calendar-release.sh
