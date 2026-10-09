'use strict';
const crypto=require('node:crypto');
function validate(d){
 if(!d||typeof d.base64!=='string'||d.base64.length>3500000||!/^[A-Za-z0-9+/]+={0,2}$/.test(d.base64))throw Error('INVALID_FILE');
 const b=Buffer.from(d.base64,'base64');if(b.length>2500000||b.length<12||b.toString('base64')!==d.base64)throw Error('INVALID_FILE');
 const type=b.subarray(0,5).toString()==='%PDF-'?'application/pdf':b.subarray(0,3).equals(Buffer.from([255,216,255]))?'image/jpeg':b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP'?'image/webp':null;
 if(!type||typeof d.reference!=='string'||!d.reference.trim()||d.reference.length>200)throw Error('INVALID_FILE');
 return {reference:d.reference.trim(),filename:String(d.filename||'documento').replace(/[^\p{L}\p{N}._ -]/gu,'').slice(0,180),mime_type:type,base64:d.base64,sha256:crypto.createHash('sha256').update(b).digest('hex')};
}
module.exports={validate};
