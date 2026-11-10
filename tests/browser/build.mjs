import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
const root=process.cwd(),out=resolve(root,'node_modules/.cache/feedback-browser');
mkdirSync(out,{recursive:true});
const assets=resolve(root,'dist-demo/assets');
writeFileSync(resolve(out,'feedback.css'),readdirSync(assets).filter(f=>f.endsWith('.css')).map(f=>readFileSync(resolve(assets,f),'utf8')).join('\n'));
await build({entryPoints:[resolve(root,'tests/browser/harness.tsx')],outfile:resolve(out,'harness.js'),bundle:true,format:'iife',platform:'browser',target:'es2022',
 define:{'import.meta.env':'{}','process.env.NODE_ENV':'"development"'},loader:{'.png':'dataurl','.jpg':'dataurl','.svg':'dataurl'},logLevel:'info'});
console.log(`Browser fixtures built in ${out}`);
