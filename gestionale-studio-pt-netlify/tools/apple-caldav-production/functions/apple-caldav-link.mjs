import {getStore} from '@netlify/blobs';
import core from './lib/core.cjs';
import manual from './lib/manual-link.cjs';
export default request=>manual.handle(request,{service:()=>core.service({store:getStore({name:'caldav-gianluca-v1',consistency:'strong'})})});
