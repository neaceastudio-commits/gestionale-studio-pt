import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptsDir = dirname(fileURLToPath(import.meta.url));

export const stagingDir = resolve(scriptsDir, '..');
export const projectRoot = resolve(stagingDir, '..');
export const cliPath = join(projectRoot, 'node_modules', '.bin', 'supabase');
export const projectId = 'neacea-pt-local-staging';

function parseEnv(output) {
  return Object.fromEntries(
    String(output || '')
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/))
      .filter(Boolean)
      .map((match) => {
        const raw = match[2].trim();
        const value = raw.startsWith('"') && raw.endsWith('"')
          ? JSON.parse(raw)
          : raw;
        return [match[1], value];
      })
  );
}

export function localEnvironment() {
  const remoteRef = join(stagingDir, 'supabase', '.temp', 'project-ref');
  if (existsSync(remoteRef)) {
    throw new Error('Staging locale bloccato: rilevato un project ref Supabase remoto.');
  }

  const output = execFileSync(cliPath, ['status', '-o', 'env'], {
    cwd: stagingDir,
    encoding: 'utf8',
  });
  const env = parseEnv(output);
  const apiUrl = String(env.API_URL || '');
  if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(apiUrl)) {
    throw new Error(`Staging locale bloccato: API_URL non locale (${apiUrl || 'assente'}).`);
  }
  if (!env.ANON_KEY || !env.SERVICE_ROLE_KEY) {
    throw new Error('Staging locale bloccato: chiavi locali non disponibili.');
  }
  return env;
}

export function databaseContainer() {
  const expected = `supabase_db_${projectId}`;
  const names = execFileSync('docker', ['ps', '--format', '{{.Names}}'], {
    encoding: 'utf8',
  }).trim().split(/\r?\n/).filter(Boolean);
  if (!names.includes(expected)) {
    throw new Error(`Container database locale non trovato: ${expected}`);
  }
  return expected;
}

export function applySqlFile(path) {
  const sql = readFileSync(path);
  const result = spawnSync(
    'docker',
    [
      'exec',
      '-i',
      databaseContainer(),
      'psql',
      '-v',
      'ON_ERROR_STOP=1',
      '-U',
      'postgres',
      '-d',
      'postgres',
    ],
    {
      input: sql,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    }
  );
  if (result.status !== 0) {
    throw new Error(
      `SQL fallito (${path}):\n${String(result.stderr || result.stdout || '').trim()}`
    );
  }
}

export function queryScalar(sql) {
  return execFileSync(
    'docker',
    [
      'exec',
      databaseContainer(),
      'psql',
      '-At',
      '-v',
      'ON_ERROR_STOP=1',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-c',
      sql,
    ],
    { encoding: 'utf8' }
  ).trim();
}
