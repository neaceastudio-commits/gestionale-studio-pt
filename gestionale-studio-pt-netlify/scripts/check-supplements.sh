#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for source in app/portale-personal-trainer/integratori/*.js; do node --check "$source"; done
node --check netlify/functions/supplements.mjs
for source in netlify/functions/lib/supplement*.js; do node --check "$source"; done
node --test tests/supplements.test.cjs tests/supplements-warehouse.test.cjs tests/supplements-pricing.test.cjs tests/supplements-api.test.mjs tests/supplements-postgres.test.cjs
node - <<'JS'
const fs=require('node:fs'),vm=require('node:vm');
for(const path of ['app/portale-personal-trainer/index.html','app/cruscotto-pt/index.html']){
const html=fs.readFileSync(path,'utf8');for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){if(/\bsrc=|type=["'](?:module|application\/)/i.test(match[1]))continue;new vm.Script(match[2],{filename:path});}console.log('Inline scripts valid: '+path);
}
JS
