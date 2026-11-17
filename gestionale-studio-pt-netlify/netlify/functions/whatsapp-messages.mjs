import {getStore} from '@netlify/blobs';
import {createHandler} from './lib/whatsapp-messages-handler.mjs';
// Keep the existing site-level claim and delivery store; do not reset deduplication.
export default createHandler({store:()=>getStore({name:'calendar-whatsapp-preview-tests',consistency:'strong'})});
