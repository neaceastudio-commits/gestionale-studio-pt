// Git release of three Calendar UI assets. No data or environment-variable changes.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { api } = require('./calendar-client-release.cjs');
const [mode, planPath, deployId] = process.argv.slice(2);
const plan = JSON.parse(fs.readFileSync(planPath));
const dir = path.dirname(planPath);
const base = JSON.parse(fs.readFileSync(path.join(dir, 'baseline.json')));
const assets = ['index.html', 'css/ui-fixes.css', 'js/clients.js'];
const prefix = 'gestionale-studio-pt-netlify/app/calendario-studio/';
const sha = b => crypto.createHash('sha1').update(b).digest('hex');
const save = (name, value) => fs.writeFileSync(path.join(dir, name + '.json'), JSON.stringify(value, null, 2) + '\n');
const repo = branch => ({ ...Object.fromEntries(['provider', 'repo_path', 'repo_url', 'repo_type', 'repo_owner_type', 'installation_id', 'deploy_key_id', 'public_repo', 'private_logs'].filter(k => base.build[k] != null).map(k => [k, base.build[k]])), repo_branch: branch });
assert.equal(base.siteId, '28855faa-de52-4e4c-b1c2-e2db4965670f');
assert.match(plan.commit, /^[a-f0-9]{40}$/);
assert.equal(plan.branch, 'release/calendar-alert-guide-20261105');
const git = args => cp.execFileSync('git', args, { cwd: path.resolve(__dirname, '../..'), maxBuffer: 8 * 1024 * 1024 });
const source = name => git(['show', plan.commit + ':' + prefix + name]);
const expected = { ...base.files };
for (const asset of assets) expected['/' + asset] = sha(source(asset));
const publicChanges = git(['diff', '--name-only', base.deploy.commit_ref, plan.commit, '--', prefix]).toString().trim().split('\n').filter(Boolean);
assert.deepEqual(publicChanges.sort(), assets.map(a => prefix + a).sort());
for (const unchanged of ['netlify.toml', 'gestionale-studio-pt-netlify/netlify/functions', 'gestionale-studio-pt-netlify/app/calendario-studio/js/package-ledger.js', 'gestionale-studio-pt-netlify/tools/coaching-editor/package-lock.json']) {
  assert.equal(git(['diff', '--name-only', base.deploy.commit_ref, plan.commit, '--', unchanged]).toString(), '', 'Unrelated build/server changes: ' + unchanged);
}

async function originalSite() {
  const site = await api('/sites/' + base.siteId);
  assert.equal(site.published_deploy.id, base.deploy.id, 'Production changed since baseline');
  assert.equal(site.published_deploy.locked, true);
  return site;
}
function checkedCandidate() {
  assert.ok(fs.readFileSync(path.join(dir, 'candidate-check.log'), 'utf8').trim().endsWith('OK: pacchetto Calendario completo e verificato.'));
  assert.equal(git(['rev-parse', plan.branch]).toString().trim(), plan.commit);
  const schedulers = fs.readFileSync(path.join(dir, 'scheduler-check.log'), 'utf8');
  const count = Number(schedulers.match(/^# tests (\d+)$/m)?.[1]);
  assert.ok(count > 0 && Number(schedulers.match(/^# pass (\d+)$/m)?.[1]) === count);
  for (const kind of ['fail', 'cancelled', 'skipped', 'todo']) assert.match(schedulers, new RegExp('^# ' + kind + ' 0$', 'm'));
}
async function schedulerSources(name) {
  // Netlify repackages ESM schedulers. A new archive digest is accepted only
  // after comparing the complete import closure against the online commit.
  assert.ok(['expected-renewals-scheduled', 'whatsapp-agenda-scheduled'].includes(name));
  const esbuild = require('./coaching-editor/node_modules/esbuild');
  assert.equal(esbuild.version, '0.25.12');
  const root = path.resolve(__dirname, '..'), sourceHashes = {};
  await esbuild.build({ absWorkingDir: root, entryPoints: ['netlify/functions/' + name + '.mjs'], bundle: true, platform: 'node', target: 'node24', format: 'esm', write: false,
    plugins: [{ name: 'committed-scheduler-sources', setup(build) {
      build.onLoad({ filter: /\.(?:js|mjs)$/ }, args => {
        const file = 'gestionale-studio-pt-netlify/' + path.relative(root, args.path);
        const current = git(['show', plan.commit + ':' + file]);
        assert.equal(Buffer.compare(current, git(['show', base.deploy.commit_ref + ':' + file])), 0, 'Scheduler dependency changed: ' + file);
        sourceHashes[file] = crypto.createHash('sha256').update(current).digest('hex');
        return { contents: current.toString(), loader: 'js', resolveDir: path.dirname(args.path) };
      });
    } }] });
  return sourceHashes;
}
async function verify(id, live = false) {
  const deploy = await api('/deploys/' + id);
  assert.equal(deploy.site_id, base.siteId);
  assert.equal(deploy.state, 'ready');
  assert.equal(deploy.commit_ref, plan.commit);
  assert.equal(deploy.manual_deploy, false);
  const files = await api('/deploys/' + id + '/files');
  assert.deepEqual(Object.fromEntries(files.map(f => [f.path, f.sha])), expected, 'Complete public manifest');
  assert.equal(deploy.available_functions.length, base.deploy.available_functions.length);
  const rebuiltSchedulers = [];
  for (const current of deploy.available_functions) {
    const prior = base.deploy.available_functions.find(f => f.n === current.n);
    assert.ok(prior, current.n);
    for (const key of ['r', 'rg', 'm', 'rgo', 'mo', 'p', 'bd', 'im']) assert.deepEqual(current[key], prior[key], current.n + ': ' + key);
    if (current.d !== prior.d) rebuiltSchedulers.push({ name: current.n, baselineDigest: prior.d, digest: current.d, unchangedSourceClosure: await schedulerSources(current.n) });
  }
  assert.deepEqual(deploy.function_schedules, base.deploy.function_schedules);
  const origin = live ? 'https://new-calendar-neacea.netlify.app' : deploy.links.permalink;
  for (const asset of assets) {
    const response = await fetch(origin + '/' + asset + '?release=' + id, { signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200);
    assert.equal(sha(Buffer.from(await response.arrayBuffer())), expected['/' + asset]);
  }
  const anonymous = await fetch(origin + '/.netlify/functions/calendar-activity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'session' }), signal: AbortSignal.timeout(30000) });
  assert.equal(anonymous.status, 401);
  const site = await api('/sites/' + base.siteId);
  assert.equal(site.published_deploy.id, live ? id : base.deploy.id);
  assert.equal(site.published_deploy.locked, true);
  if (live) {
    assert.equal(site.build_settings.repo_branch, base.build.repo_branch);
    assert.equal(site.build_settings.stop_builds, base.build.stop_builds);
    assert.deepEqual(site.build_settings.allowed_branches, base.build.allowed_branches);
  }
  const proof = { commit: plan.commit, branch: plan.branch, deploy: id, baselineDeploy: base.deploy.id, baselineCommit: base.deploy.commit_ref, origin, live, publishedAt: deploy.published_at, files: files.length, changedAssets: assets, unchangedFunctionArchives: deploy.available_functions.length - rebuiltSchedulers.length, rebuiltSchedulers, schedules: deploy.function_schedules, anonymousStatus: anonymous.status, hashes: Object.fromEntries(assets.map(a => [a, expected['/' + a]])) };
  save(live ? 'published-verified' : 'preview-verified', proof);
  console.log(JSON.stringify(proof));
}
async function restoreConfiguration() {
  const current = await api('/sites/' + base.siteId);
  await api('/deploys/' + current.published_deploy.id + '/lock', 'POST');
  const settings = { stop_builds: base.build.stop_builds, allowed_branches: base.build.allowed_branches };
  await api('/sites/' + base.siteId, 'PATCH', { build_settings: settings });
  await api('/sites/' + base.siteId, 'PATCH', { repo: repo(base.build.repo_branch) });
  await api('/sites/' + base.siteId, 'PATCH', { build_settings: settings });
  const site = await api('/sites/' + base.siteId);
  assert.equal(site.published_deploy.locked, true);
  assert.equal(site.build_settings.repo_branch, base.build.repo_branch);
  assert.equal(site.build_settings.stop_builds, base.build.stop_builds);
  assert.deepEqual(site.build_settings.allowed_branches, base.build.allowed_branches);
  console.log(JSON.stringify({ configurationRestored: true, published: site.published_deploy.id }));
}
async function main() {
  if (mode === 'verify-preview') return verify(deployId);
  if (mode === 'verify-live') return verify(deployId, true);
  if (mode === 'restore-config') return restoreConfiguration();
  assert.ok(['preview', 'publish'].includes(mode));
  checkedCandidate();
  await originalSite();
  if (mode === 'preview') {
    await api('/sites/' + base.siteId, 'PATCH', { build_settings: { allowed_branches: [...new Set([...base.build.allowed_branches, plan.branch])], stop_builds: false } });
    const build = await api('/sites/' + base.siteId + '/builds?branch=' + encodeURIComponent(plan.branch) + '&commit_sha=' + plan.commit, 'POST', {});
    save('preview', { deploy: build.deploy_id, build: build.id });
    console.log(JSON.stringify({ preview: build.deploy_id, build: build.id }));
    return;
  }
  const preview = JSON.parse(fs.readFileSync(path.join(dir, 'preview-verified.json')));
  assert.equal(preview.commit, plan.commit);
  const browserLog = fs.readFileSync(path.join(dir, 'preview-browser.log'), 'utf8');
  assert.ok(browserLog.includes('PASS alert guidance:') && browserLog.includes('Assets: ' + preview.origin));
  try {
    await api('/sites/' + base.siteId, 'PATCH', { repo: repo(plan.branch) });
    await api('/deploys/' + base.deploy.id + '/unlock', 'POST');
    const build = await api('/sites/' + base.siteId + '/builds?branch=' + encodeURIComponent(plan.branch) + '&commit_sha=' + plan.commit, 'POST', {});
    save('production-build', { deploy: build.deploy_id, build: build.id });
    console.log(JSON.stringify({ requestedProductionDeploy: build.deploy_id }));
    let lastState;
    for (let i = 0; i < 90; i++) {
      const site = await api('/sites/' + base.siteId), current = site.published_deploy;
      if (current.commit_ref === plan.commit && current.state === 'ready') {
        await api('/deploys/' + current.id + '/lock', 'POST');
        save('production', { deploy: current.id, commit: plan.commit });
        console.log(JSON.stringify({ published: current.id, commit: plan.commit }));
        return;
      }
      const pending = await api('/deploys/' + build.deploy_id);
      if (pending.state !== lastState) { lastState = pending.state; console.log(JSON.stringify({ state: lastState })); }
      if (pending.state === 'error') throw Error(pending.error_message || 'Production build failed');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    throw Error('Publication not confirmed within bounded wait');
  } finally { await restoreConfiguration(); }
}
main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
