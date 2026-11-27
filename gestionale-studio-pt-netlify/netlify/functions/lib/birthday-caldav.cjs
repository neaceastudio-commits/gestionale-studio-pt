'use strict';
const {XMLParser,XMLValidator}=require('fast-xml-parser');
const NAME='NEACEA — Operativo';
const need=(condition,message)=>{if(!condition)throw Error(message)};
const list=value=>value==null?[]:Array.isArray(value)?value:[value];
class CalDAV{
 constructor(env,fetcher=fetch){this.base=env.APPLE_CALDAV_URL;this.fetcher=fetcher;const u=new URL(this.base);need(u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&/^(p\d+-)?caldav\.icloud\.com$/.test(u.hostname),'iCloud endpoint only');this.base=this.base.replace(/\/?$/,'/');this.headers={Authorization:'Basic '+Buffer.from(env.APPLE_CALDAV_USER+':'+env.APPLE_CALDAV_PASSWORD).toString('base64')};}
 url(href){const u=new URL(href,this.base),base=new URL(this.base),r=decodeURIComponent(u.pathname.slice(base.pathname.length));need(u.origin===base.origin&&u.pathname.startsWith(base.pathname)&&r&&!r.includes('/')&&!['.','..'].includes(r)&&!u.search&&!u.hash,'Outside dedicated collection');return u.href}
 async request(url,method='GET',body,headers={}){const r=await this.fetcher(url,{method,body,headers:{...this.headers,...headers},redirect:'error',signal:AbortSignal.timeout(12000)});return r}
 async verify(){const r=await this.request(this.base,'PROPFIND','<d:propfind xmlns:d="DAV:"><d:prop><d:displayname/><d:resourcetype/></d:prop></d:propfind>',{Depth:'0','Content-Type':'application/xml'});need(r.status===207,'CalDAV verification failed');const xml=await r.text();need(!/<!DOCTYPE|<!ENTITY/i.test(xml)&&XMLValidator.validate(xml)===true,'Invalid DAV XML');const tree=new XMLParser({removeNSPrefix:true,ignoreAttributes:false}).parse(xml);const responses=list(tree.multistatus?.response);const props=responses.flatMap(x=>list(x.propstat)).filter(p=>String(p.status).includes(' 200 '));need(props.length===1&&props[0].prop?.displayname===NAME&&Object.hasOwn(props[0].prop?.resourcetype||{},'calendar'),'Wrong dedicated calendar');}
 async inventory(){const r=await this.request(this.base,'PROPFIND','<d:propfind xmlns:d="DAV:"><d:prop><d:getetag/></d:prop></d:propfind>',{Depth:'1','Content-Type':'application/xml'});need(r.status===207,'Collection inventory failed');const xml=await r.text();need(!/<!DOCTYPE|<!ENTITY/i.test(xml)&&XMLValidator.validate(xml)===true,'Invalid DAV XML');const tree=new XMLParser({removeNSPrefix:true,ignoreAttributes:false}).parse(xml);return list(tree.multistatus?.response).filter(x=>new URL(x.href,this.base).pathname!==new URL(this.base).pathname).map(x=>this.url(x.href));}
 async read(href){const r=await this.request(this.url(href));if(r.status===404)return null;need(r.status===200,'CalDAV read failed; not a deletion');const etag=r.headers.get('etag');need(etag&&!etag.startsWith('W/'),'Strong ETag required');return {etag,ics:await r.text()}}
 async put(href,ics,etag){const r=await this.request(this.url(href),'PUT',ics,{'Content-Type':'text/calendar; charset=utf-8',...(etag?{'If-Match':etag}:{'If-None-Match':'*'})});need([200,201,204].includes(r.status),'Conditional Apple write refused')}
 async delete(href,etag){const r=await this.request(this.url(href),'DELETE',undefined,{'If-Match':etag});need([200,204].includes(r.status),'Conditional Apple delete refused')}
}

module.exports={CalDAV};
