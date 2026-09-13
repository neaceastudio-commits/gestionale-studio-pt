/* A read-only runtime flag. No local override can change the database setting. */
window.CalendarFlex=(()=>{
 let enabled=false;
 async function refresh(){try{const r=await fetch('/.netlify/functions/calendar-runtime',{cache:'no-store'});const data=await r.json();enabled=r.ok&&data.CALENDAR_FLEX_MODE===true;}catch{enabled=false;}return enabled;}
 const ready=refresh();
 return {ready,refresh,get enabled(){return enabled;},durations:Array.from({length:16},(_,i)=>(i+1)*15)};
})();
