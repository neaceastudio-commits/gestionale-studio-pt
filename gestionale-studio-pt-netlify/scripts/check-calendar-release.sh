#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_root"

node --check app/calendario-studio/js/app.js
node --check app/calendario-studio/js/services.js
node --check app/calendario-studio/js/clients.js
node --check netlify/functions/pt-access-email.js
node --check netlify/functions/apple-calendar.js
node tests/calendar-release-regression.cjs
node tests/package-payment-prefill.test.cjs
node tests/package-payment-persistence.test.cjs
node tests/acquisition-existing-client.test.cjs
node tests/acquisition-links.test.cjs
node tests/consent-anamnesis-regression.cjs

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  critical_paths=(
    app/calendario-studio
    app/acquisizione/index.html
    app/anamnesi-cliente/index.html
    netlify/functions/pt-access-email.js
    netlify/functions/apple-calendar.js
    tests/calendar-release-regression.cjs
    tests/package-payment-prefill.test.cjs
    tests/package-payment-persistence.test.cjs
    tests/acquisition-existing-client.test.cjs
    tests/acquisition-links.test.cjs
    tests/consent-anamnesis-regression.cjs
    scripts/check-calendar-release.sh
  )
  if ! git diff --quiet -- "${critical_paths[@]}" || ! git diff --cached --quiet -- "${critical_paths[@]}"; then
    echo "BLOCCATO: i file critici del Calendario non sono tutti salvati in un commit." >&2
    exit 1
  fi
fi

echo "OK: pacchetto Calendario completo e verificato."
