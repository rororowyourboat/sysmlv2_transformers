import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseFile,checkModel} from './model.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const sha=data=>'sha256:'+createHash('sha256').update(data).digest('hex');
const files=(await readdir(root+'models')).filter(n=>n.endsWith('.sysml')).sort();
let validation=null;const engine=process.argv.indexOf('--engine');
if(engine>=0){const path=process.argv[engine+1];if(!path)throw Error('Supply an existing engine');const result=spawnSync(path,['-no-record-cache','-strict','-validate',...files.map(f=>root+'models/'+f)],{encoding:'utf8'});if(result.error||result.status!==0)throw Error(result.error?.message||result.stdout+result.stderr);validation={engineDigest:sha(await readFile(path)),output:result.stdout};}
const sources=[],definitions={};for(const file of files){const text=await readFile(root+'models/'+file,'utf8');sources.push({file:'models/'+file,text,digest:sha(text)});for(const def of parseFile(text,'models/'+file)){if(definitions[def.name])throw Error('Duplicate definition '+def.name);definitions[def.name]=def;}}
const catalog=JSON.parse(await readFile(root+'models/catalog.json','utf8'));
for(const entry of catalog)checkModel(definitions,entry.definition);
for(const name of Object.keys(definitions))checkModel(definitions,name);
await writeFile(root+'viewer/models.json',JSON.stringify({format:1,catalog,sources,definitions,validation},null,2)+'\n');
console.log(`Built ${catalog.length} architectures, ${sources.length} source files, ${Object.keys(definitions).length} part definitions; native validation: ${!!validation}`);
