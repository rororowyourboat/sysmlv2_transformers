import {resolve,checkModel} from '../scripts/model.mjs';

export const chapters=[
 {id:'overview',title:'The whole transformer',type:'DecoderOnlyTransformer',intro:'A decoder turns a sequence of token IDs into a score for each possible next token. The same block pattern repeats, refining one shared stream of features.',equation:'token IDs → vectors → decoder blocks → vocabulary scores'},
 {id:'embedding',title:'Give tokens a coordinate system',type:'TokenEmbedding',intro:'The token embedding looks up one learned vector per token. A learned position vector is added so the model can distinguish where each token occurs.',equation:'X = tokenEmbedding[IDs] + positionEmbedding[positions]'},
 {id:'norm',title:'Normalize before the transformation',type:'LayerNorm',intro:'Each token vector is normalized across its features before attention, and again before the MLP. The residual stream itself bypasses these transformations.',equation:'LayerNorm: [T, D] → [T, D]'},
 {id:'attention',title:'Let earlier tokens inform this token',type:'CausalSelfAttention',intro:'Q and K produce compatibility scores. A causal mask excludes future positions; softmax turns the scores into mixing weights. Those weights combine V, and the heads are joined and projected back to model width.',equation:'softmax(mask(QKᵀ / √dₕ)) V'},
 {id:'mlp',title:'Transform each token independently',type:'FeedForward',intro:'The feed-forward network expands each token vector, applies GELU, then contracts it. Unlike attention, this stage does not mix information between token positions.',equation:'MLP(X) = GELU(X W₁ᵀ + b₁) W₂ᵀ + b₂'},
 {id:'residual',title:'Keep the original signal available',type:'PreNormBlock',intro:'Each branch adds its result to the incoming stream. The two skip paths matter: normalization and a transformation produce an update, rather than replacing the original representation.',equation:'X′ = X + Attention(LN(X));  X″ = X′ + MLP(LN(X′))'},
 {id:'output',title:'Read the stream as vocabulary scores',type:'LanguageHead',intro:'After all blocks, final normalization and the language head produce logits. With tied embeddings, the output readout reuses the token embedding matrix. A next-token probability distribution requires a final softmax.',equation:'logits = LayerNorm(X) W_embeddingᵀ'}
];

export function dimensions(expression,attributes){
 return expression.split(',').map(term=>{const tokens=term.trim().match(/\w+|[*/]/g);if(!tokens||tokens.join('')!==term.replace(/\s/g,''))throw Error('Unsupported shape expression');const val=t=>/^\d+$/.test(t)?Number(t):attributes[t];let n=val(tokens[0]);for(let i=1;i<tokens.length;i+=2)n=tokens[i]==='*'?n*val(tokens[i+1]):n/val(tokens[i+1]);if(!Number.isInteger(n)||n<1)throw Error('Invalid tensor dimension');return n;});
}

export function buildTensors(bundle,entry,T=6){
 const a=checkModel(bundle.definitions,entry.definition).attributes,D=a.modelWidth,M=a.mlpWidth,H=a.headCount,dh=D/H;
 if(!Number.isInteger(T)||T<1||T>a.contextLength)throw Error('Invalid illustrative sequence length');
 const blocks=[],edges=[],skipPaths=[];
 const add=(id,label,kind,phase,pos,size,shape,type,path,layer=null,overview=false,note='')=>{const b={id,label,kind,phase,pos,size,data:{shape},type,path,layer,overview,note};blocks.push(b);return b;};
 const weight=(id,label,type,phase,pos,size,path,layer=null,overview=false)=>{const def=resolve(bundle.definitions,type);if(!def.attributes.weightShape)throw Error('Weight shape absent from SysML: '+type);return add(id,label,'weight',phase,pos,size,dimensions(def.attributes.weightShape,a),type,path,layer,overview,'Shape derives from the component’s SysML weightShape annotation. No values are loaded.');};
 const act=(id,label,phase,x,y,shape,type,path,layer=null,overview=false,size=[4,.65])=>add(id,label,'activation',phase,[x,y,0],size,shape,type,path,layer,overview);
 weight('token.W','Token embedding','TokenEmbedding','embedding',[-6,12,-1.8],[4.4,3],'tokenEmbedding',null,true);
 weight('position.W','Position embedding','PositionEmbedding','embedding',[-.5,12,-1.8],[3.5,1.4],'positionEmbedding',null,true);
 act('tokens','Token IDs','embedding',4.5,16,[T],'TokenSource','tokens',null,true);
 act('embeddingAdd','Token + position','embedding',4.5,12,[T,D],'Add','embeddingAdd',null,true);
 edges.push(['tokens','embeddingAdd'],['token.W','embeddingAdd'],['position.W','embeddingAdd']);
 for(let l=0;l<a.blockCount;l++){
  const y=5-l*10,p='layer.'+l,modelPath=`decoder.layers[${l+1}]`;
  act(p+'.stream',`Block ${l+1} · residual stream`,'overview',3,y,[T,D],'PreNormBlock',modelPath,l,true,[5,.7]);
  weight(p+'.qkv.overview',`Block ${l+1} · QKV`,'QKVProjection','overview',[-6,y,-1.8],[4.4,2.8],modelPath+'.attention.qkv',l,true);
  weight(p+'.mlp.overview',`Block ${l+1} · MLP`,'MLPExpand','overview',[-6,y-4,-1.8],[6,2.6],modelPath+'.mlp.expand',l,true);
  act(p+'.summary',`Block ${l+1} · updated stream`,'overview',3,y-4,[T,D],'PreNormBlock',modelPath,l,true,[5,.7]);
  edges.push([l?'layer.'+(l-1)+'.summary':'embeddingAdd',p+'.stream'],[p+'.qkv.overview',p+'.stream'],[p+'.stream',p+'.summary'],[p+'.mlp.overview',p+'.summary']);
  // Detailed layout is a second projection of the same layer, shown when a chapter focuses it.
  const top=10;const path=part=>modelPath+'.'+part;
  act(p+'.input','Residual input','residual',7,top+5,[T,D],'PreNormBlock',modelPath,l);
  act(p+'.norm1','Layer norm 1','norm',3,top+5,[T,D],'LayerNorm',path('norm1'),l);
  weight(p+'.qkv.W','Q / K / V projection','QKVProjection','attention',[-6,top+1,-1.8],[5,3.3],path('attention.qkv'),l);
  act(p+'.qkv','Q, K, V by head','attention',3,top+1,[H,T,dh],'QKVProjection',path('attention.qkv'),l);
  act(p+'.scores','QKᵀ / √dₕ','attention',-1,top-2,[H,T,T],'QKProduct',path('attention.scores'),l,false,[2.6,2]);
  act(p+'.mask','Causal mask','attention',3,top-2,[H,T,T],'CausalMask',path('attention.mask'),l,false,[2.6,2]);
  act(p+'.probabilities','Attention softmax','attention',7,top-2,[H,T,T],'Softmax',path('attention.probabilities'),l,false,[2.6,2]);
  act(p+'.mix','Weighted values','attention',3,top-5,[H,T,dh],'WeightedValues',path('attention.mix'),l);
  act(p+'.concatenate','Concatenate heads','attention',3,top-7,[T,D],'HeadConcat',path('attention.concatenate'),l);
  weight(p+'.projection.W','Attention output projection','AttentionProjection','attention',[-6,top-9,-1.8],[4.4,2.3],path('attention.projection'),l);
  act(p+'.projection','Projected attention','attention',3,top-9,[T,D],'AttentionProjection',path('attention.projection'),l);
  act(p+'.attentionDropout','Attention dropout','attention',7,top-10,[T,D],'Dropout',path('attention.dropout'),l);
  act(p+'.residual1','Add residual 1','residual',3,top-11,[T,D],'Add',path('residual1'),l);
  act(p+'.norm2','Layer norm 2','norm',3,top-13,[T,D],'LayerNorm',path('norm2'),l);
  weight(p+'.expand.W','MLP expansion weights','MLPExpand','mlp',[-6,top-16,-1.8],[6,2.6],path('mlp.expand'),l);
  act(p+'.expand','Expanded features','mlp',3,top-16,[T,M],'MLPExpand',path('mlp.expand'),l,false,[7,.85]);
  act(p+'.activation',a.activation,'mlp',3,top-19,[T,M],'GELU',path('mlp.activation'),l,false,[7,.85]);
  weight(p+'.contract.W','MLP contraction weights','MLPContract','mlp',[-6,top-22,-1.8],[6,2.6],path('mlp.contract'),l);
  act(p+'.contract','Contracted features','mlp',3,top-22,[T,D],'MLPContract',path('mlp.contract'),l);
  act(p+'.mlpDropout','MLP dropout','mlp',7,top-23,[T,D],'Dropout',path('mlp.dropout'),l);
  act(p+'.residual2','Add residual 2','residual',3,top-25,[T,D],'Add',path('residual2'),l);
  // Internal edges below come from the actual SysML connection declarations.
  for(const [type,prefix]of [['PreNormBlock',''],['CausalSelfAttention','attention.'],['FeedForward','mlp.']]){
   const def=resolve(bundle.definitions,type);
   const node=(part,source)=>{const full=prefix+part;
    if(full==='attention')return p+(source?'.attentionDropout':'.qkv');
    if(full==='mlp')return p+(source?'.mlpDropout':'.expand');
    if(full==='attention.dropout')return p+'.attentionDropout';
    if(full==='mlp.dropout')return p+'.mlpDropout';
    return p+'.'+full.split('.').at(-1);
   };
   for(const e of def.connections)edges.push([node(e.source,true),node(e.target,false)]);
  }
  edges.push([p+'.input',p+'.norm1'],[p+'.qkv.W',p+'.qkv'],[p+'.projection.W',p+'.projection'],[p+'.expand.W',p+'.expand'],[p+'.contract.W',p+'.contract']);
  skipPaths.push([p+'.input',p+'.residual1',11],[p+'.residual1',p+'.residual2',11]);
 }
 const outputY= 5-a.blockCount*10;
 act('finalNorm','Final layer norm','output',3,outputY,[T,D],'LayerNorm','finalNorm',null,true);
 weight('head.W','Shared embedding / readout','LanguageHead','output',[-6,outputY-4,-1.8],[4.4,3],'lmHead',null,true);
 act('logits','Vocabulary logits','output',3,outputY-4,[T,a.vocabulary],'LanguageHead','lmHead',null,true,[7,1]);
 edges.push(['layer.'+(a.blockCount-1)+'.summary','finalNorm'],['finalNorm','logits'],['head.W','logits']);
 return {blocks,edges:[...new Map(edges.map(e=>[e.join('|'),e])).values()],skipPaths,settings:a};
}
