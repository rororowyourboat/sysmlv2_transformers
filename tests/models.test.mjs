import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseFile,resolve,checkModel} from '../scripts/model.mjs';
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8'),bundle=JSON.parse(read('viewer/models.json'));
test('generated models retain exact source bytes and derive every definition from SysML',()=>{
 const definitions={};for(const source of bundle.sources){assert.equal(source.text,read(source.file));assert.equal(source.digest,'sha256:'+createHash('sha256').update(source.text).digest('hex'));for(const def of parseFile(source.text,source.file))definitions[def.name]=def;}
 assert.deepEqual(definitions,bundle.definitions);
 for(const entry of bundle.catalog)checkModel(definitions,entry.definition);
 assert.deepEqual(bundle.catalog,JSON.parse(read('models/catalog.json')));
});
test('configurations preserve GPT-2 vocabulary, nanoGPT defaults and explicit teaching overrides',()=>{
 const d=bundle.definitions,gpt=resolve(d,'GPT2Small'),nano=resolve(d,'NanoGPTDefault'),tiny=resolve(d,'NanoGPTTiny');
 assert.equal(gpt.attributes.vocabulary,50257);assert.equal(gpt.attributes.activation,'gelu-tanh-approximation');assert.equal(nano.attributes.vocabulary,50304);assert.equal(nano.attributes.biases,true);assert.equal(nano.attributes.dropout,0);assert.equal(tiny.attributes.blockCount,4);assert.equal(tiny.attributes.modelWidth,128);assert.equal(tiny.parts.length,gpt.parts.length);
});
test('the block retains residual bypass bindings, ports and declared connection endpoints',()=>{
 const block=checkModel(bundle.definitions,'PreNormBlock');assert.equal(block.parts.length,6);assert.equal(block.connections.length,6);assert.ok(block.bindings.some(b=>b.source==='input'&&b.target==='residual1.left'));assert.equal(resolve(bundle.definitions,'CausalSelfAttention').ports.length,2);
 const bad=structuredClone(bundle.definitions);bad.PreNormBlock.connections[0].targetPort='missing';assert.throws(()=>checkModel(bad,'PreNormBlock'),/endpoint/);
 const cycle=structuredClone(bundle.definitions);cycle.Transform.parent='LayerNorm';assert.throws(()=>resolve(cycle,'Transform'),/cycle/);
});
