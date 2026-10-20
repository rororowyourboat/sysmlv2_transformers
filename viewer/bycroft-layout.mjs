// Source-linked projection of Bycroft's GPT layout. It is a rendering layout,
// not an additional SysML model or a claim that its micro-operations are modeled.
import {genGptModelLayout} from './vendor/llm-viz/GptModelLayout.mjs';
export function buildBycroftLayout(settings,T){
 const a=settings,D=a.modelWidth,scale=20/D;
 // Limit vocabulary geometry, never the dimensions retained for inspection.
 const shownVocab=Math.min(a.vocabulary,2*D);
 const layout=genGptModelLayout({B:1,T,C:D,vocabSize:shownVocab,nHeads:a.headCount,A:D/a.headCount,nBlocks:a.blockCount});
 const meta=new Map();
 const assign=(c,type,path,phase,layer=null,shape)=>meta.set(c,{type,path,phase,layer,shape});
 const group=(cs,type,path,phase,l)=>cs.forEach(c=>assign(c,type,path,phase,l));
 assign(layout.idxObj,'TokenSource','tokens','embedding',null,[T]);
 assign(layout.tokEmbedObj,'TokenEmbedding','tokenEmbedding','embedding',null,[a.vocabulary,D]);
 assign(layout.posEmbedObj,'PositionEmbedding','positionEmbedding','embedding',null,[a.contextLength,D]);
 assign(layout.residual0,'Add','embeddingAdd','embedding',null,[T,D]);
 for(const [l,b] of layout.blocks.entries()){
  const p=`decoder.layers[${l+1}]`;
  group(b.cubes,'PreNormBlock',p,'residual',l);
  group(b.ln1.cubes,'LayerNorm',p+'.norm1','norm',l);group(b.ln2.cubes,'LayerNorm',p+'.norm2','norm',l);
  for(const [h,head] of b.heads.entries()){
   group(head.cubes,'QKVProjection',p+'.attention.qkv','attention',l);
   for(const c of head.cubes)meta.get(c).head=h;
   assign(head.attnMtx,'QKProduct',p+'.attention.scores','attention',l,[T,T]);
   for(const c of [head.attnMtxAgg1,head.attnMtxAgg2,head.attnMtxSm])assign(c,'Softmax',p+'.attention.probabilities','attention',l,[T,T]);
   assign(head.vOutBlock,'WeightedValues',p+'.attention.mix','attention',l,[T,D/a.headCount]);
  }
  for(const c of [b.projWeight,b.projBias,b.attnOut])assign(c,'AttentionProjection',p+'.attention.projection','attention',l);
  assign(b.attnResidual,'Add',p+'.residual1','residual',l,[T,D]);
  for(const c of [b.mlpFcWeight,b.mlpFcBias,b.mlpFc])assign(c,'MLPExpand',p+'.mlp.expand','mlp',l);
  assign(b.mlpAct,'GELU',p+'.mlp.activation','mlp',l,[T,a.mlpWidth]);
  for(const c of [b.mlpProjWeight,b.mlpProjBias,b.mlpResult])assign(c,'MLPContract',p+'.mlp.contract','mlp',l);
  assign(b.mlpResidual,'Add',p+'.residual2','residual',l,[T,D]);
 }
 group(layout.ln_f.cubes,'LayerNorm','finalNorm','output',null);
 assign(layout.lmHeadWeight,'LanguageHead','lmHead','output',null,[a.vocabulary,D]);
 for(const c of [layout.logits,layout.logitsAgg1,layout.logitsAgg2,layout.logitsSoftmax])assign(c,'LanguageHead','lmHead','output',null,[T,a.vocabulary]);
 const blocks=layout.cubes.filter(c=>c.opacity>0).map(c=>{
  const m=meta.get(c);if(!m)throw Error('Unmapped Bycroft component');
  const weight=c.t==='w';const shape=m.shape||(weight?(c.cx===1?[c.cy]:c.cy===1?[c.cx]:[c.cy,c.cx]):[c.cx,c.cy]);
  return {id:'bycroft.'+c.idx,label:c.name||'Reduction intermediate',kind:weight?'weight':'activation',phase:m.phase,layer:m.layer,overview:true,
   pos:[(c.x+c.dx/2)*scale,-(c.y+c.dy/2)*scale,(c.z+c.dz/2)*scale],size:[c.dx*scale,c.dy*scale,c.dz*scale],
   data:{shape},type:m.type,path:m.path,
   cells:[c.cx,c.cy,c.cz],note:'Bycroft layout: logical operation or parameter slice mapped to this SysML component. Per-head Q/K/V matrices are slices of the combined QKV projection. Position geometry shows the first T positions; vocabulary geometry may be compressed. No values loaded.',upstream:c};
 });
 const byCube=new Map(blocks.map(b=>[b.upstream,b.id]));const edges=[];
 for(const b of blocks){const deps=b.upstream.deps;for(const d of [...deps?.add||[],...deps?.dot||[]]){const from=byCube.get(d.src);if(from)edges.push([from,b.id]);}}
 return {blocks,edges:[...new Map(edges.map(e=>[e.join('|'),e])).values()],skipPaths:[],settings:a};
}
