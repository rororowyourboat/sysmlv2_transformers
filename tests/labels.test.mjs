import test from 'node:test';
import assert from 'node:assert/strict';
import {placeLabels} from '../viewer/label-layout.mjs';
test('dense labels retain hover/selection priority without overlapping or leaving viewport',()=>{
 const candidates=Array.from({length:60},(_,i)=>({id:i,x:(i%10)*35,y:Math.floor(i/10)*30,w:90,h:20,depth:i,priority:i===4?300:i===5?200:0}));
 const placed=placeLabels(candidates,400,200,10);assert.equal(placed[0].id,4);assert.ok(placed.length<=10);
 for(let i=0;i<placed.length;i++){const a=placed[i];assert.ok(a.x>=0&&a.y>=0&&a.x+a.w<=400&&a.y+a.h<=200);for(const b of placed.slice(i+1))assert.ok(a.x>=b.x+b.w||a.x+a.w<=b.x||a.y>=b.y+b.h||a.y+a.h<=b.y);}
});
