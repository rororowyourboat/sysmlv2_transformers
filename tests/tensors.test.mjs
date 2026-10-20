import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildTensors,dimensions} from '../viewer/tensors.mjs';
const data=JSON.parse(readFileSync(new URL('../viewer/models.json',import.meta.url)));
test('shape-only scene uses SysML dimensions, not fabricated numerical tensors',()=>{
 const entry=data.catalog.find(m=>m.id==='nanogpt-tiny'),scene=buildTensors(data,entry,8),byId=new Map(scene.blocks.map(b=>[b.id,b]));
 assert.deepEqual(byId.get('token.W').data.shape,[256,128]);
 assert.deepEqual(byId.get('layer.0.qkv.W').data.shape,[384,128]);
 assert.deepEqual(byId.get('layer.0.scores').data.shape,[4,8,8]);
 assert.deepEqual(byId.get('layer.3.expand.W').data.shape,[512,128]);
 assert.deepEqual(byId.get('logits').data.shape,[8,256]);
 assert.ok(scene.blocks.every(b=>!('values' in b.data)));
 assert.equal(scene.blocks.filter(b=>b.id.endsWith('.summary')).length,4);
 assert.throws(()=>buildTensors(data,entry,0),/sequence/);
 assert.throws(()=>dimensions('modelWidth;alert(1)',scene.settings),/expression/);
});
test('spatial flow paths retain value mixing, normalization, dropout and both skip branches',()=>{
 const scene=buildTensors(data,data.catalog[0]),ids=new Set(scene.blocks.map(b=>b.id)),edges=new Set(scene.edges.map(e=>e.join('->')));
 for(const edge of scene.edges)assert.ok(edge.every(id=>ids.has(id)),edge.join('->'));
 for(const [a,b]of [['qkv','scores'],['qkv','mix'],['probabilities','mix'],['projection','attentionDropout'],['attentionDropout','residual1'],['norm2','expand'],['activation','contract'],['contract','mlpDropout'],['mlpDropout','residual2']])assert.ok(edges.has(`layer.0.${a}->layer.0.${b}`));
 assert.deepEqual(scene.skipPaths.slice(0,2),[['layer.0.input','layer.0.residual1',11],['layer.0.residual1','layer.0.residual2',11]]);
});
