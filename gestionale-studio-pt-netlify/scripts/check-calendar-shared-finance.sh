#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Runtime and test dependencies are declared in tools/coaching-editor/package.json.
node -e 'const major=Number(process.versions.node.split(".")[0]);if(major<22||major>=25)throw Error("Usa Node 22–24, come dichiarato nel repository")'
node --check app/calendario-studio/js/package-ledger.js
node --check app/calendario-studio/js/shared-finance.js
node --check netlify/functions/calendar-client-finance.js
node --check netlify/functions/lib/calendar-client-finance.js
node --test tests/package-service-allocation.test.cjs tests/calendar-shared-finance.test.cjs tests/calendar-shared-finance-sql.test.cjs
node tests/calendar-shared-finance-browser.cjs
