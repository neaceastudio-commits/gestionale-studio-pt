/* A read-only runtime flag. No local override can change the database setting. */
window.CalendarFlex=(()=>{
 let enabled=false,inFlight=null;
 function refresh(){
  if(inFlight)return inFlight;
  inFlight=(async()=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
   try{const r=await fetch('/.netlify/functions/calendar-runtime',{cache:'no-store',signal:controller.signal});const data=await r.json();enabled=r.ok&&data.CALENDAR_FLEX_MODE===true;}
   catch{enabled=false;}
   finally{clearTimeout(timer);inFlight=null;}
   return enabled;
  })();
  return inFlight;
 }
 const ready=refresh();
 return {ready,refresh,get enabled(){return enabled;},durations:Array.from({length:16},(_,i)=>(i+1)*15)};
})();
