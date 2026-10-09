/* Shared presentation helper: extracts recorded facts; never invents clinical advice. */
(function(root){
  const text = value => Array.isArray(value) ? value.map(text).filter(Boolean).join('; ') : value && typeof value === 'object' ? '' : String(value ?? '').replace(/\\n/g,'\n').trim();
  const escape = value => text(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const short = (value,max=140) => {const s=text(value).replace(/\s+/g,' ');return s.length>max?s.slice(0,max).replace(/\s+\S*$/,'')+'…':s;};
  function facts(client={},acq={}) {
    acq=acq||{};
    const raw=[text(acq.impressioni),text(client.notes)].filter(Boolean).join('\n');
    const structured={};
    for(const match of raw.matchAll(/\[ANAMNESI_(?:COACHING|CLIENTE)[^\]]*\]([\s\S]*?)\[\/ANAMNESI_(?:COACHING|CLIENTE)\]/g)) {
      try {Object.assign(structured,JSON.parse(match[1]));} catch(_) {}
    }
    const clean=raw.replace(/\[ANAMNESI_(?:COACHING|CLIENTE)[^\]]*\][\s\S]*?\[\/ANAMNESI_(?:COACHING|CLIENTE)\]/g,'');
    const lines=[];
    let current='';
    for(const line of clean.split(/\n/).map(s=>s.trim()).filter(Boolean)) {
      if(/^[^:]{1,65}:/.test(line)||/^\[/.test(line)) {if(current)lines.push(current);current=line;}
      else if(current)current+=' '+line;
    }
    if(current)lines.push(current);
    const pick = (keys, pattern) => [...new Set([
      ...keys.flatMap(k=>[structured[k],acq[k],client[k]]).map(text),
      ...lines.filter(l=>pattern.test(l)).map(l=>l.replace(/^[^:]{1,65}:\s*/,''))
    ].filter(Boolean))].join('; ');
    return [
      ['Obiettivo',pick(['obiettivo_primario','obiettivo_libero','obiettivo'],/^Obiettivo(?: primario| libero)?:/i)],
      ['Condizioni e terapie',pick(['patologie','condizioni','farmaci','allergie'],/^(?:Patologie|Condizioni|Farmaci|Terapie|Allergie)(?:[^:]{0,35})?:/i)],
      ['Infortuni e limitazioni',pick(['infortuni','dolori','limitazioni','zone_critiche'],/^(?:Infortuni|Interventi|Dolori|Limitazioni|Zone critiche)(?:[^:]{0,35})?:/i)],
      ['Esperienza',pick(['esperienza','livello'],/^(?:Esperienza|Livello):/i)],
      ['Frequenza',pick(['sessioni_pref','frequenza','tempo_allenamento'],/^(?:Frequenza desiderata|Frequenza|Tempo allenamento):/i)],
      ['Indicazioni registrate',pick(['indicazioni_pt','precauzioni'],/^(?:Indicazioni PT|Precauzioni|Da evitare):/i)]
    ].filter(([,value])=>value);
  }
  function render(client,acq,{original=true}={}) {
    const rows=facts(client,acq);
    const summary=rows.length?rows.map(([label,value])=>`<div class="pt-fact"><strong>${escape(label)}</strong> ${value.length>200?`<details><summary>${escape(short(value,160))} · Leggi tutto</summary><p>${escape(value)}</p></details>`:escape(value)}</div>`).join(''):'<p>Informazioni essenziali non strutturate: consulta le note originali.</p>';
    const raw=[text(acq?.impressioni),text(client?.notes)].filter(Boolean).filter((s,i,a)=>a.indexOf(s)===i).join('\n\n');
    return `<div class="pt-essentials">${summary}${original&&raw?`<details class="pt-original"><summary>Note originali complete</summary><pre>${escape(raw)}</pre></details>`:''}</div>`;
  }
  const api={facts,render,short,escape};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.PTEssentials=api;
})(typeof window==='undefined'?globalThis:window);
