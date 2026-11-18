import {getStore} from '@netlify/blobs';
import auth from './lib/calendar-audit-auth.js';
import agenda from './lib/whatsapp-agenda.js';
import {workerHandler} from './lib/whatsapp-matrix-engine.mjs';
export const config={background:true};
export default workerHandler({env:process.env,db:auth.db,provider:agenda.createService({db:auth.db}),store:()=>getStore({name:'calendar-whatsapp-preview-tests',consistency:'strong'})});
