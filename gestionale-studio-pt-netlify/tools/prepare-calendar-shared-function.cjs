// Keep the original source tree for dependencies outside the functions folder.
// Other Calendar functions retain their existing packaging and configuration.
const fs=require('node:fs'),path=require('node:path');
const target=path.resolve(__dirname,'../../.netlify/calendar-functions/calendar-client-finance.js');
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.writeFileSync(target,'exports.handler = require("../../gestionale-studio-pt-netlify/netlify/functions/calendar-client-finance.js").handler;\n');

// The copied renewal function uses the same schedule module as the browser.
const lib=path.join(path.dirname(target),'lib');
fs.copyFileSync(path.resolve(__dirname,'../app/calendario-studio/js/package-schedule.js'),path.join(lib,'package-schedule.js'));
const renewals=path.join(lib,'expected-renewals.js');
const source=fs.readFileSync(renewals,'utf8');
const imported="require('../../../app/calendario-studio/js/package-schedule')";
if(!source.includes(imported))throw Error('Expected renewal schedule dependency is missing');
fs.writeFileSync(renewals,source.replace(imported,"require('./package-schedule')"));
