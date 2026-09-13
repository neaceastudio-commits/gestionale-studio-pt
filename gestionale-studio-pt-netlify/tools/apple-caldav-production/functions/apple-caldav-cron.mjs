import {getStore} from '@netlify/blobs';
import core from './lib/core.cjs';
export default async()=>{
 if(process.env.APPLE_CALDAV_SYNC_ENABLED!=='true')return new Response(null,{status:204});
 try{await core.service({store:getStore({name:'caldav-gianluca-v1',consistency:'strong'})}).run();return new Response(null,{status:204})}
 catch{console.error('CalDAV Gianluca sync stopped safely');return new Response(null,{status:500})}
};
export const config={schedule:'* * * * *'};
