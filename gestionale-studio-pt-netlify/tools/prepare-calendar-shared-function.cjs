// Keep the original source tree for dependencies outside the functions folder.
// Other Calendar functions retain their existing packaging and configuration.
const fs=require('node:fs'),path=require('node:path');
const target=path.resolve(__dirname,'../../.netlify/calendar-functions/calendar-client-finance.js');
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.writeFileSync(target,'exports.handler = require("../../gestionale-studio-pt-netlify/netlify/functions/calendar-client-finance.js").handler;\n');
