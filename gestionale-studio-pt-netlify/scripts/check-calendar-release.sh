#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_root"

node --check app/calendario-studio/js/pt-hours-report.js
node --check app/calendario-studio/js/pt-availability-overview.js
node --check app/calendario-studio/js/app.js
node --check app/calendario-studio/js/services.js
node --check app/calendario-studio/js/clients.js
node --check app/calendario-studio/js/supabase.js
node --check app/calendario-studio/js/client-journey-scoring.js
node --check app/calendario-studio/js/client-journey-model.js
node --check app/calendario-studio/js/client-journey.js
node --check netlify/functions/pt-access-email.js
node --check netlify/functions/lib/pt-auth.js
node --check netlify/functions/pt-data.js
node --check netlify/functions/apple-calendar.js
node tests/calendar-release-regression.cjs
node tools/coaching-editor/check-calendar-clients.cjs
node tests/client-journey.test.cjs
node tests/client-journey-scoring.test.cjs
node --test tests/calendar-charged-absence.test.cjs
node --test tests/calendar-archived-hours.test.cjs
node --test tests/calendar-exhausted-edit.test.cjs
node --test tests/calendar-appointment-session-edit.test.cjs
node --test tests/calendar-runtime-timeout.test.cjs
node --test tests/pt-hours-report.test.cjs
node tests/pt-program-persistence.test.cjs
node tests/pt-hand-grip.test.cjs
node tests/package-cycle-confirmation.test.cjs
node tests/package-renewal-ledger.test.cjs
node tests/package-payment-prefill.test.cjs
node tests/package-payment-persistence.test.cjs
node --test tests/package-service-allocation.test.cjs tests/calendar-shared-finance.test.cjs tests/calendar-shared-finance-sql.test.cjs
node --test tests/studio-calendar-protocol.test.cjs tests/calendar-complete-read.test.cjs tests/calendar-refresh.test.cjs
node tests/acquisition-existing-client.test.cjs
node tests/acquisition-nutrition-section.test.cjs
node tests/acquisition-links.test.cjs
node tests/consent-anamnesis-regression.cjs
node tests/consent-data-integrity.test.cjs

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  critical_paths=(
    app/calendario-studio
    app/acquisizione/index.html
    app/anamnesi-cliente/index.html
    app/portale-personal-trainer
    netlify/functions/pt-access-email.js
    netlify/functions/lib/pt-auth.js
    netlify/functions/pt-data.js
    netlify/functions/apple-calendar.js
    tests/pt-hours-report.test.cjs
    tests/pt-hours-report-browser.cjs
    tests/calendar-exhausted-edit.test.cjs
    tests/calendar-exhausted-edit-browser.cjs
    tests/calendar-archived-hours.test.cjs
    tests/calendar-archived-hours-browser.cjs
    tests/calendar-charged-absence.test.cjs
    tests/calendar-charged-absence-postgres.test.cjs
    tests/calendar-charged-absence-browser.cjs
    supabase/migrations/20261012063548_calendar_charged_absence.sql
    tests/client-journey-scoring.test.cjs
    tests/client-journey.test.cjs
    tests/client-journey-browser.cjs
    tests/calendar-release-regression.cjs
    tests/pt-program-persistence.test.cjs
    tests/pt-hand-grip.test.cjs
    tests/package-cycle-confirmation.test.cjs
    tests/package-renewal-ledger.test.cjs
    tests/package-payment-prefill.test.cjs
    tests/calendar-ui-census-browser.cjs
    tests/calendar-invoice-browser.cjs
    tests/calendar-refresh.test.cjs
    tests/calendar-refresh-browser.cjs
    tests/calendar-complete-read.test.cjs
    tests/studio-calendar-protocol.test.cjs
    tests/package-payment-persistence.test.cjs
    tests/acquisition-existing-client.test.cjs
    tests/acquisition-nutrition-section.test.cjs
    tests/acquisition-links.test.cjs
    tests/consent-anamnesis-regression.cjs
    tests/consent-data-integrity.test.cjs
    scripts/check-calendar-release.sh
    app/calendario-studio/css/calendar.css
    app/calendario-studio/js/app.js
    app/calendario-studio/js/calendar-audit.js
    app/calendario-studio/js/supabase.js
    app/calendario-studio/js/package-ledger.js
    app/calendario-studio/js/shared-finance.js
    netlify/functions/lib/calendar-audit-endpoint.js
    netlify/functions/calendar-client-finance.js
    netlify/functions/lib/calendar-client-finance.js
    supabase/migrations/20261030183151_calendar_shared_client_finance.sql
    scripts/check-calendar-shared-finance.sh
    tools/prepare-calendar-shared-function.cjs
    tests/package-service-allocation.test.cjs
    tests/calendar-shared-finance.test.cjs
    tests/calendar-shared-finance-sql.test.cjs
    tests/calendar-shared-finance-browser.cjs
    tests/calendar-invoice-browser.cjs
    tests/calendar-ui-census-browser.cjs
  )
  if ! git diff --quiet -- "${critical_paths[@]}" || ! git diff --cached --quiet -- "${critical_paths[@]}"; then
    echo "BLOCCATO: i file critici del Calendario non sono tutti salvati in un commit." >&2
    exit 1
  fi
fi

echo "OK: pacchetto Calendario completo e verificato."
