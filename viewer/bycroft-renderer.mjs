// Narrow bridge from our SysML-derived scene to Bycroft's unmodified block renderer.
import {initBlockRender,renderAllBlocks} from './vendor/llm-viz/blockRender.mjs';
import {createShaderManager,ensureShadersReady} from './vendor/llm-viz/shader.mjs';
import {initSharedRender,writeModelViewUbo} from './vendor/llm-viz/sharedRender.mjs';
import {Mat4f} from './vendor/llm-viz/matrix.mjs';
import {Vec3} from './vendor/llm-viz/vector.mjs';
export function toBycroftCube(b,selected,related){
 const shape=b.data.shape;
 return {name:b.label,sourceId:b.id,t:b.kind==='weight'?'w':'i',
 x:b.pos[0]-b.size[0]/2,y:b.pos[1]-b.size[1]/2,z:b.pos[2]-(b.size[2]??.16)/2,
 dx:b.size[0],dy:b.size[1],dz:b.size[2]??.16,
 cx:b.cells?.[0]??shape.at(-1),cy:b.cells?.[1]??(shape.length===1?1:shape.at(-2)),cz:b.cells?.[2]??1,
 opacity:1,highlight:selected?1:related?.has(b.id)?.45:0};
}
export class BycroftRenderer{
 constructor(gl){
  this.gl=gl;this.manager=createShaderManager(gl);
  const ctx={gl,shaderManager:this.manager,ext:{colorBufferFloat:gl.getExtension('EXT_color_buffer_float'),disjointTimerQuery:null}};
  this.shared=initSharedRender(ctx);this.blocks=initBlockRender(ctx);ensureShadersReady(this.manager);
  if(this.manager.programs.some(p=>!p.ready))throw Error('Bycroft shader initialization failed. Use the tensor list.');
 }
 render(blocks,vp,eye,selected,related){
  const gl=this.gl;const identity=new Mat4f();
  writeModelViewUbo(this.shared,identity,vp);
  gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  renderAllBlocks(this.blocks,{cubes:blocks.map(b=>toBycroftCube(b,b.id===selected,related))},identity,new Vec3(eye.x,eye.y,eye.z),new Float32Array(),new Float32Array());
  gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);
 }
 dispose(){
  const gl=this.gl,b=this.blocks;
  for(const buf of [b.cubeGeom.vbo,b.blockUbo.buf,b.blockAccessUbo.buf,b.instancedFloatBuf.buf,this.shared.modelViewUbo])gl.deleteBuffer(buf);
  gl.deleteVertexArray(b.cubeGeom.vao);gl.deleteVertexArray(b.instancedVao);gl.deleteTexture(b.dummyTexture);
  for(const p of this.manager.programs)gl.deleteProgram(p.program);
  for(const s of this.manager.vertShaders.values())gl.deleteShader(s);
  for(const s of this.manager.fragShaders.values())gl.deleteShader(s);
 }
}
