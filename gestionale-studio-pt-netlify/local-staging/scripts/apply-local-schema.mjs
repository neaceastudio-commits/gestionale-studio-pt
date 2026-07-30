import { join } from 'node:path';
import {
  applySqlFile,
  localEnvironment,
  projectRoot,
  queryScalar,
  stagingDir,
} from './runtime.mjs';

localEnvironment();

const schemaFiles = [
  join(stagingDir, 'sql', '000-reset.sql'),
  join(stagingDir, 'sql', '010-pt-baseline.sql'),
  join(projectRoot, 'docs', 'supabase-pt-responsibility-execution.sql'),
  join(projectRoot, 'docs', 'supabase-pt-responsibility-execution.sql'),
  join(projectRoot, 'docs', 'supabase-pt-calendar-view-performer.sql'),
];

schemaFiles.forEach(applySqlFile);

const checks = {
  performerColumns: Number(queryScalar(`
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'appointments'
      and column_name = 'performed_by_operator_id'
  `)),
  performerIndexes: Number(queryScalar(`
    select count(*)
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'appointments_performer_pt_idx'
  `)),
  performerConstraints: Number(queryScalar(`
    select count(*)
    from pg_constraint
    where conname = 'appointments_performer_pt_fk'
      and conrelid = 'public.appointments'::regclass
  `)),
  calendarViewColumns: Number(queryScalar(`
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pt_calendar_sessions'
      and column_name = 'performed_by_operator_id'
  `)),
  performerValuesBeforeFixtures: Number(queryScalar(`
    select count(*)
    from public.appointments
    where nullif(performed_by_operator_id, '') is not null
  `)),
};

if (
  checks.performerColumns !== 1
  || checks.performerIndexes !== 1
  || checks.performerConstraints !== 1
  || checks.calendarViewColumns !== 1
  || checks.performerValuesBeforeFixtures !== 0
) {
  throw new Error(`Migrazione locale non idempotente: ${JSON.stringify(checks)}`);
}

applySqlFile(join(stagingDir, 'sql', '900-fixtures.sql'));

console.log(`Staging locale applicato: ${JSON.stringify(checks)}`);
