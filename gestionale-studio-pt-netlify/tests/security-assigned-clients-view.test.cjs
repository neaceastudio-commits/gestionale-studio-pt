'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const sql=fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261012182000_harden_assigned_clients_view.sql'),'utf8');
test('minimal hardening only revokes access to legacy assignment view',()=>{
  const statements=sql.split('\n').filter(line=>/^(?:REVOKE|GRANT|ALTER|DROP|CREATE|UPDATE|DELETE|INSERT|TRUNCATE)\b/i.test(line.trim()));
  assert.deepEqual(statements.map(s=>s.trim()),['REVOKE ALL PRIVILEGES ON TABLE public.pt_assigned_clients FROM anon, authenticated;']);
  assert.ok(sql.includes('Apple/CalDAV unchanged'));
});
