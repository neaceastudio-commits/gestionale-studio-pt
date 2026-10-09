import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
await build({entryPoints:[fileURLToPath(new URL('src/index.ts',import.meta.url))],bundle:true,format:'iife',globalName:'NeaceaPTEditor',outfile:fileURLToPath(new URL('../../app/portale-personal-trainer/js/coaching-editor.js',import.meta.url)),loader:{'.css':'text'},target:'es2022',minify:true});
