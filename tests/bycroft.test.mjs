import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {buildTensors} from '../viewer/tensors.mjs';
import {buildBycroftLayout} from '../viewer/bycroft-layout.mjs';
import {toBycroftCube} from '../viewer/bycroft-renderer.mjs';
const bundle=JSON.parse(await readFile(new URL('../viewer/models.json',import.meta.url)));
test('retained upstream renderer sources match pinned provenance',async()=>{
 const root=new URL('../viewer/vendor/llm-viz/',import.meta.url),p=JSON.parse(await readFile(new URL('UPSTREAM.json',root)));
 assert.equal(p.commit,'9da93742382f1bf36c020c38a1ace454e82c4490');
 for(const f of p.files)assert.equal(createHash('sha256').update(await readFile(new URL(f.retained,root))).digest('hex'),f.sha256,f.path);
});
test('Bycroft per-head layout keeps SysML dimensions, source links and geometry distinct',()=>{
 for(const entry of bundle.catalog){
  const compact=buildTensors(bundle,entry,6),a=compact.settings,l=buildBycroftLayout(a,6);
  const q=l.blocks.filter(b=>b.layer===0&&b.label==='Q Weights');assert.equal(q.length,a.headCount);
  assert.equal(new Set(q.map(b=>b.pos[2])).size,a.headCount);
  for(const b of q){assert.deepEqual(b.data.shape,[a.modelWidth/a.headCount,a.modelWidth]);assert.equal(b.type,'QKVProjection');assert.equal(b.path,'decoder.layers[1].attention.qkv');}
  assert.deepEqual(l.blocks.find(b=>b.label==='Position Embed').data.shape,[a.contextLength,a.modelWidth]);
  assert.deepEqual(l.blocks.find(b=>b.label==='Token Embed').data.shape,[a.vocabulary,a.modelWidth]);
  const ids=new Set(l.blocks.map(b=>b.id));assert.equal(ids.size,l.blocks.length);
  for(const [s,t]of l.edges){assert.ok(ids.has(s));assert.ok(ids.has(t));}
  for(const b of l.blocks){assert.ok(bundle.definitions[b.type]);assert.ok(!('values' in b.data));const c=toBycroftCube(b,false,new Set());assert.ok(c.dx>0&&c.dy>0&&c.dz>0);assert.equal(c.sourceId,b.id);assert.equal(c.access,undefined);}
 }
});
