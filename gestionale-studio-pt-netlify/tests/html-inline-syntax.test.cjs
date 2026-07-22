const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const appRoot = path.join(__dirname, '..', 'app');
const pages = [
  'cruscotto-pt/index.html',
  'portale-personal-trainer/index.html',
  'portale-pt/index.html',
];
const classicScripts = [
  'shared/pt-domain.js',
  'calendario-studio/js/app.js',
  'calendario-studio/js/clients.js',
  'calendario-studio/js/pt-availability-overview.js',
  'calendario-studio/js/services.js',
  'calendario-studio/js/session-fixes.js',
  'calendario-studio/js/supabase.js',
  'portale-pt-fase1/js/portal.js',
];

for (const relativePath of pages) {
  test(`gli script inline sono sintatticamente validi: ${relativePath}`, () => {
    const html = fs.readFileSync(path.join(appRoot, relativePath), 'utf8');
    const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
      .map((match) => match[1])
      .filter((contents) => contents.trim());

    assert.ok(scripts.length > 0, `Nessuno script inline trovato in ${relativePath}`);
    scripts.forEach((contents, index) => {
      assert.doesNotThrow(
        () => new vm.Script(contents, { filename: `${relativePath}#inline-${index + 1}` }),
        `Errore di sintassi nello script inline ${index + 1} di ${relativePath}`
      );
    });
  });
}

for (const relativePath of classicScripts) {
  test(`lo script classico e sintatticamente valido: ${relativePath}`, () => {
    const contents = fs.readFileSync(path.join(appRoot, relativePath), 'utf8');
    assert.doesNotThrow(
      () => new vm.Script(contents, { filename: relativePath }),
      `Errore di sintassi in ${relativePath}`
    );
  });
}
