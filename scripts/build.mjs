import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Deliberately small static module graph: no dynamic imports, runtime CDN, eval,
// or framework dependencies. TypeScript emits ESM for development and unit tests.
// Wrap each emitted module separately to preserve lexical scope in the portable file.
const order = ['types','theme','finance','data','negotiation-data','negotiation-engine','decision-engine','living-engine','rejection-engine','storage','ui','motion','property-search','property-picker','ranking','assistant-engine','assistant-widget','cost-controls','living-views','living-controller','rejection-views','rejection-controller','negotiation-views','views','calculator','decision-views','decision-workspace','app'];
let js = '(()=>{"use strict";const __modules=Object.create(null);\n';
for (const name of order) {
  let source = await readFile(path.join(root,'build',name+'.js'),'utf8');
  const exports = [...source.matchAll(/^export (?:async )?(?:function|const|let|class) (\w+)/gm)].map(m=>m[1]);
  source = source.replace(/^import\s*\{([^}]+)\}\s*from\s*['"]\.\/([^'"]+)['"];?\s*$/gm, (_, names, file) => {
    const bindings = names.trim().split(',').map(s=>s.trim().replace(/\s+as\s+/,': ')).join(', ');
    return `const { ${bindings} } = __modules[${JSON.stringify(file)}];`;
  });
  source = source.replace(/^export\s*\{\s*\};?\s*$/gm,'').replace(/^export /gm,'');
  if (/^import\b|^export\b/m.test(source)) throw new Error(`Unsupported module syntax in ${name}; update the static bundler.`);
  js += `__modules[${JSON.stringify(name+'.js')}]=(()=>{\n${source}\nreturn {${exports.join(',')}};})();\n`;
}
js += '})();';
const css = await readFile(path.join(root,'src/styles.css'),'utf8');
let html = await readFile(path.join(root,'index.html'),'utf8');
html = html.replace('<link rel="stylesheet" href="src/styles.css">',()=>`<style>\n${css}\n</style>`)
  .replace('<script type="module" src="build/app.js"></script>',()=>`<script>\n${js.replace(/<\/script/gi,'<\\/script')}\n</script>`);
await mkdir(path.join(root,'dist'),{recursive:true});
await writeFile(path.join(root,'dist/index.html'),html);
console.log(`Built dist/index.html (${(Buffer.byteLength(html)/1024).toFixed(1)} KB). No runtime dependencies.`);
