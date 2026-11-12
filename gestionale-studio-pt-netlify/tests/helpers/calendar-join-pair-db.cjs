const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=process.env.CALENDAR_TEST_ROOT||path.resolve(__dirname,'../..');
const {open}=require(path.join(root,'tests/helpers/calendar-recovery-db.cjs'));
exports.fixture=async(apply=true)=>{
 const f=await open(true);await f.seed(true);
 for(const a of (await f.all('appointments')).filter(a=>a.status==='prenotato'))await f.write({...a,status:'annullato'},a);
 await f.write({id:'done-ten',service_id:'pt12',client_ids:['a','b'],operator_id:'pt',date:'2099-10-20',start_time:'17:00',duration_min:60,buffer_min:10,status:'fatto',notes:'[CICLO-PACCHETTO-ID cycle-a] [CICLO-PACCHETTO 2099-10-01]'});
 for(const [id,date] of [['solo-one','2099-11-12'],['solo-two','2099-11-16']])await f.write({id,service_id:'pt11',client_ids:['b'],operator_id:'pt',date,start_time:'19:00',duration_min:60,buffer_min:10,status:'prenotato',notes:'Recupero individuale [CICLO-PACCHETTO-ID cycle-b] [CICLO-PACCHETTO 2099-10-01]'});
 if(apply)await f.db.exec(fs.readFileSync(path.join(root,'supabase/migrations/20261112112856_calendar_join_pair_sessions.sql'),'utf8'));
 const plan=async()=>({requestId:crypto.randomUUID(),clients:(await f.all('clients')).map(c=>({id:c.id,expectedUpdatedAt:c.updated_at})),expectedAppointments:(await f.all('appointments')).filter(a=>a.id.startsWith('solo-'))});
 const call=async(p,preview=false,actor='owner')=>{const {requestId,...payload}=p;return f.rpc('calendar_join_pair_sessions',[actor,requestId,JSON.stringify(payload),preview]);};
 return {...f,plan,call};
};
