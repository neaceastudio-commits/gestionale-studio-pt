/* Presentation only: recorded anamnesis answers, without administrative records or inferred advice. */
(function(root){
  const text = value => Array.isArray(value) ? value.map(text).filter(Boolean).join('; ') : value && typeof value === 'object' ? '' : String(value ?? '').replace(/\\n/g,'\n').trim();
  const escape = value => text(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const short = (value,max=140) => {const s=text(value).replace(/\s+/g,' ');return s.length>max?s.slice(0,max).replace(/\s+\S*$/,'')+'…':s;};
  const key = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const fields = [
    ['Obiettivo',['obiettivo_primario','obiettivo'],['Obiettivo','Obiettivo primario'],'Obiettivi'],
    ['Nelle sue parole',['obiettivo_libero','obiettivoLibero'],['Obiettivo libero','Obiettivo con le tue parole'],'Obiettivi'],
    ['Obiettivo secondario',['obiettivo_secondario'],['Obiettivo secondario'],'Obiettivi'],
    ['Tempistica desiderata',['tempistica','tempo_obiettivo'],['Tempistica','Tempo obiettivo'],'Obiettivi'],
    ['Motivazione',['motivazione'],['Motivazione'],'Obiettivi'],
    ['Esperienza di allenamento',['esperienza','livello'],['Esperienza','Livello'],'Attività e organizzazione'],
    ['Attività fisica attuale',['inattivo','attivita'],['Attività / inattività','Attività fisica','Attività fisica attuale'],'Attività e organizzazione'],
    ['Sport praticati',['sport'],['Sport','Sport praticati'],'Attività e organizzazione'],
    ['Frequenza desiderata',['sessioni_pref','frequenza'],['Frequenza desiderata','Frequenza'],'Attività e organizzazione'],
    ['Orari preferiti',['orari'],['Disponibilità','Orari','Orari preferiti'],'Attività e organizzazione'],
    ['Tempo per allenamento',['tempo_allenamento'],['Tempo allenamento'],'Attività e organizzazione'],
    ['Luogo e attrezzatura',['luogo','attrezzatura'],['Luogo','Attrezzatura'],'Attività e organizzazione'],
    ['Patologie e condizioni riferite',['patologie','condizioni'],['Patologie','Condizioni','Patologie, diagnosi o condizioni rilevanti'],'Salute e limitazioni'],
    ['Farmaci o terapie riferiti',['farmaci','terapie'],['Farmaci','Terapie','Farmaci o terapie in corso'],'Salute e limitazioni'],
    ['Allergie riferite',['allergie'],['Allergie'],'Salute e limitazioni'],
    ['Infortuni, interventi e dolori',['infortuni','interventi','dolori','zone_critiche'],['Infortuni','Interventi','Dolori','Zone critiche'],'Salute e limitazioni'],
    ['Limitazioni e movimenti da evitare',['limitazioni'],['Limitazioni','Da evitare'],'Salute e limitazioni'],
    ['Indicazioni ricevute',['indicazioni_pt','precauzioni'],['Indicazioni PT','Precauzioni'],'Salute e limitazioni'],
    ['Sonno',['sonno'],['Sonno'],'Recupero e contesto'],
    ['Stress percepito',['stress'],['Stress'],'Recupero e contesto'],
    ['Professione',['professione'],['Professione'],'Recupero e contesto'],
    ['Difficoltà nei percorsi precedenti',['non_funzionato','nonFunzionato'],['Cosa non ha funzionato'],'Recupero e contesto'],
    ['Note del cliente',['note'],['Note cliente'],'Recupero e contesto']
  ];
  const labels = new Set(fields.flatMap(([, ,names])=>names.map(key)));
  const admin = /^(?:dati fatturazione|codice fiscale|documento|indirizzo(?: per fattura)?|cap|comune|provincia|contatto emergenza|servizi richiesti|proposta|follow-up|data di nascita|sesso|dati minore\/tutore|cliente minorenne|genitore\/tutore|rapporto col minore|telefono tutore|email tutore|cf tutore|note tutore|importo|pagamento|pacchetto)$/;
  function stripRecords(value) {
    return text(value)
      .replace(/\[NEACEA-PACKAGE-LEDGER-V1\][\s\S]*?(?:\[\/NEACEA-PACKAGE-LEDGER-V1\]|$)/g,'\n[PT-SEPARATOR]\n')
      .replace(/\[ANAMNESI_(PT_REPORT|COACHING|CLIENTE)[^\]]*\][\s\S]*?(?:\[\/ANAMNESI_\1\]|$)/g,'\n[PT-SEPARATOR]\n')
      .replace(/^.*\[(?:ACQUISIZIONE[-_]ID|ACQUISIZIONE_SEZIONE|PT[-_]AUDIT|PT_OWNER|ANAMNESI_RICEVUTA|TRASFERIMENTO PT|CICLO-PACCHETTO(?:-ID)?|FORZA-PT11|STORICO-FORZA-PT11)\b[^\]]*\].*$/gm,'\n[PT-SEPARATOR]\n');
  }
  function clean(value) {
    let skip=false;
    return stripRecords(value).split('\n').filter(line=>{
      const heading=line.match(/^([^:]{1,70}):/);
      if(/^\s*\[PT-SEPARATOR\]/.test(line)){skip=true;return false;}
      if(heading)skip=admin.test(key(heading[1]));
      return !skip;
    }).join('\n').trim();
  }
  function noteFields(value) {
    const result={}; let current='';
    for(const line of stripRecords(value).split('\n')) {
      const heading=line.match(/^([^:]{1,70}):\s*(.*)$/), name=heading&&key(heading[1]);
      if(heading&&labels.has(name)){current=name;result[current]=heading[2].trim();}
      else if((heading&&admin.test(name))||/^\s*[\[{]/.test(line)){current='';}
      else if(current&&line.trim())result[current]+='\n'+line.trim();
    }
    return result;
  }
  function profile(client={},acq={}) {
    client=client||{}; acq=acq||{};
    // Parse JSON before normalizing legacy literal newlines, or multiline answers become invalid JSON.
    const sources=[String(acq.impressioni||''),String(client.notes||'')], records=[], legacyBlocks=[];
    for(const raw of sources) {
      for(const match of raw.matchAll(/\[ANAMNESI_(PT_REPORT|COACHING|CLIENTE)[^\]]*\]([\s\S]*?)\[\/ANAMNESI_\1\]/g)) {
        try {
          const data=JSON.parse(match[2]);
          if(data&&typeof data==='object'&&!Array.isArray(data))records.push({data,at:Date.parse(data.submitted_at||data.timestamp||'')||0,index:match.index,source:sources.indexOf(raw)});
        } catch(_) {
          // Older PT submissions may contain labelled answers rather than JSON.
          // Only known labels are extracted; the separate Nutrition archive is not read here.
          if(match[1]==='CLIENTE'&&!/\|\s*Nutrizione\b/i.test(match[0].split(']')[0]))legacyBlocks.unshift(noteFields(match[2]));
        }
      }
    }
    // Prefer the newest recorded answers; acquisition wins a duplicate copied into client notes.
    records.sort((a,b)=>b.at-a.at||a.source-b.source||b.index-a.index);
    const structured=records[0]?.data;
    const notes=[...legacyBlocks,...sources.map(noteFields)];
    const values=fields.map(([label,keys,names,group])=>{
      let answer;
      if(structured&&keys.some(k=>Object.hasOwn(structured,k))) {
        // An explicitly empty answer must not revive an older clinical response.
        answer=keys.map(k=>text(structured[k]));
      } else {
        const candidates=[acq,client].map(source=>keys.map(k=>text(source[k])).filter(Boolean));
        answer=candidates.find(items=>items.length)||notes.map(source=>names.map(name=>source[key(name)]).filter(Boolean)).find(items=>items.length)||[];
      }
      const unique=[...new Set(answer.map(clean).filter(Boolean))];
      return {label,value:unique.join('; '),group};
    }).filter(item=>item.value);
    return values;
  }
  const facts = (client,acq) => profile(client,acq).map(({label,value})=>[label,value]);
  function render(client,acq) {
    const rows=profile(client,acq);
    const groups=['Obiettivi','Attività e organizzazione','Salute e limitazioni','Recupero e contesto'];
    const sections=groups.map(group=>{
      const entries=rows.filter(row=>row.group===group);
      if(!entries.length&&group!=='Salute e limitazioni')return '';
      return `<section class="pt-anamnesis-section"><h4>${escape(group)}</h4>${entries.length?`<dl>${entries.map(({label,value})=>`<div class="pt-fact"><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>`:'<p class="pt-anamnesis-empty">Informazioni non presenti nell’anamnesi disponibile.</p>'}</section>`;
    }).join('');
    return `<div class="pt-essentials"><h3>Anamnesi · Informazioni per il PT</h3>${rows.length?'':'<p class="pt-anamnesis-empty">Anamnesi PT da raccogliere o completare.</p>'}<div class="pt-anamnesis-grid">${sections}</div></div>`;
  }
  const api={facts,render,short,escape};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.PTEssentials=api;
})(typeof window==='undefined'?globalThis:window);
