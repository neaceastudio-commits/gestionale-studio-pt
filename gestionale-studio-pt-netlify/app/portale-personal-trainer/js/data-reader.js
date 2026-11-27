(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PTDataReader = api;
})(typeof window === 'object' ? window : globalThis, function () {
  const reads = new Set(['bootstrap', 'client_snapshot', 'program_snapshot', 'session_record_snapshot', 'list_templates', 'list_template_trash']);
  async function read(action, payload, send) {
    if (!reads.has(action)) return send(payload);
    // A concurrent edit invalidates the entire read, never just one page.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        let result = await send({ ...payload, transport: 'chunks-v1' });
        if (!result.responseChunk) return result; // Compatible with the previous API.
        const chunks = [], hash = result.responseChunk.hash, total = result.responseChunk.total;
        let offset = 0;
        for (;;) {
          const page = result.responseChunk;
          if (!page || page.version !== 1 || page.hash !== hash || page.total !== total || page.offset !== offset ||
              !Number.isSafeInteger(total) || total <= 0 || typeof page.chunk !== 'string' || !page.chunk.length) {
            throw new Error('Lettura dati incompleta. Riprova senza chiudere eventuali modifiche da salvare.');
          }
          chunks.push(page.chunk); offset += page.chunk.length;
          if (offset > total || (page.nextOffset === null ? offset !== total : page.nextOffset !== offset)) {
            throw new Error('Lettura dati incompleta. Riprova.');
          }
          if (page.nextOffset === null) return JSON.parse(chunks.join(''));
          result = await send({ ...payload, transport: 'chunks-v1', readCursor: { offset, hash } });
        }
      } catch (error) {
        if (error.code !== 'PT_READ_CHANGED' || attempt === 1) throw error;
      }
    }
  }
  function compactProgram(program) {
    return { ...program, summaryOnly: true, data: {
      id: program.data?.id || program.id, name: program.name, period: program.period,
      lifecycle: program.data?.pt_studio_state?.meta?.lifecycle || program.data?.lifecycle,
      archived: program.archived, archived_at: program.data?.archived_at,
      trainer_id: program.data?.trainer_id, assigned_at: program.assignmentDate,
    } };
  }
  function compactClient(client) {
    return Object.fromEntries(['id','client_id','nome','cognome','email','telefono','active','stato_abbonamento','obiettivo','pt_assegnato','trainer_id','operator_id','session_access','pending_session_pt_ids']
      .filter(key => client[key] !== undefined).map(key => [key, client[key]]));
  }
  return { read, compactProgram, compactClient };
});
