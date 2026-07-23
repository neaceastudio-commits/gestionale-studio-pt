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

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  critical_paths=(
    app/calendario-studio
    netlify/functions/pt-access-email.js
    netlify/functions/apple-calendar.js
    tests/calendar-release-regression.cjs
    scripts/check-calendar-release.sh
  )
  if ! git diff --quiet -- "${critical_paths[@]}" || ! git diff --cached --quiet -- "${critical_paths[@]}"; then
    echo "BLOCCATO: i file critici del Calendario non sono tutti salvati in un commit." >&2
    exit 1
  fi
fi

echo "OK: pacchetto Calendario completo e verificato."
