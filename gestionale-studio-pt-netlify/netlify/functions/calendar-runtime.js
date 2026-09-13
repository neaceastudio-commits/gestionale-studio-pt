'use strict';
const {db}=require('./lib/calendar-audit-auth');
exports.handler=async event=>{
 const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
 if(!['GET','HEAD'].includes(event.httpMethod))return {statusCode:405,headers,body:''};
 try{const enabled=await db('rpc/calendar_flex_mode',{method:'POST',body:{}});return {statusCode:200,headers,body:event.httpMethod==='HEAD'?'':JSON.stringify({CALENDAR_FLEX_MODE:enabled===true})};}
 catch{return {statusCode:503,headers,body:JSON.stringify({CALENDAR_FLEX_MODE:false})};}
};
