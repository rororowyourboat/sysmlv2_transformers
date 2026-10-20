// SysML scene controller using the pinned Bycroft block renderer.
import { Mat4f, Vec3 } from './vendor/bycroft-math.mjs';
import {BycroftRenderer} from './bycroft-renderer.mjs';

function shader(gl, type, source) {
  const object = gl.createShader(type);
  gl.shaderSource(object, source); gl.compileShader(object);
  if (!gl.getShaderParameter(object, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(object); gl.deleteShader(object); throw new Error(message);
  }
  return object;
}
function program(gl, vertex, fragment) {
  const result = gl.createProgram();
  const vs = shader(gl, gl.VERTEX_SHADER, vertex), fs = shader(gl, gl.FRAGMENT_SHADER, fragment);
  gl.attachShader(result, vs); gl.attachShader(result, fs); gl.linkProgram(result);
  gl.deleteShader(vs); gl.deleteShader(fs);
  if (!gl.getProgramParameter(result, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(result));
  return result;
}
export class TensorScene {
  constructor(canvas, labels, onSelect) {
    this.canvas = canvas; this.labels = labels; this.onSelect = onSelect;
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false });
    if (!gl) throw new Error('WebGL 2 is unavailable. Use the tensor list.');
    this.gl = gl; this.blocks = [];
    this.visibleKinds = new Set(['weight', 'activation']); this.showLines = true; this.showLabels = true;
    this.yaw = -.26; this.pitch = .19; this.zoom = 1; this.center = [0, -1, 0];
    this.renderer = new BycroftRenderer(gl);
    canvas.dataset.renderer = 'bycroft';
    this.lineProgram = program(gl, `#version 300 es
      layout(location=0) in vec3 position; uniform mat4 vp;
      void main(){gl_Position=vp*vec4(position,1.);}`, `#version 300 es
      precision highp float; out vec4 color; void main(){color=vec4(.60,.66,.63,1.);}`);
    this.lineVao = gl.createVertexArray(); this.lineBuffer = gl.createBuffer();
    gl.bindVertexArray(this.lineVao); gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    this.events = new AbortController(); const signal = this.events.signal;
    canvas.addEventListener('pointerdown', event => {
      this.drag = { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY };
      canvas.setPointerCapture(event.pointerId);
    }, { signal });
    canvas.addEventListener('pointermove', event => {
      if (!this.drag) return;
      const dx = event.clientX - this.drag.x, dy = event.clientY - this.drag.y;
      if (event.shiftKey || event.button === 1) {
        this.center[0] -= dx * .04 / this.zoom; this.center[1] += dy * .04 / this.zoom;
      } else { this.yaw += dx * .006; this.pitch = Math.max(-.65, Math.min(.65, this.pitch + dy * .004)); }
      this.drag.x = event.clientX; this.drag.y = event.clientY; this.invalidate();
    }, { signal });
    canvas.addEventListener('pointerup', event => {
      if (this.drag && Math.hypot(event.clientX - this.drag.startX, event.clientY - this.drag.startY) < 5) this.pick(event);
      this.drag = null;
    }, { signal });
    canvas.addEventListener('pointercancel', () => { this.drag = null; }, { signal });
    canvas.addEventListener('wheel', event => {
      event.preventDefault(); this.zoom = Math.max(.08, Math.min(5, this.zoom * Math.exp(-event.deltaY * .001))); this.invalidate();
    }, { passive: false, signal });
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault(); this.onContextLost?.();
    }, { signal });
    this.observer = new ResizeObserver(() => this.invalidate()); this.observer.observe(canvas);
  }
  setData(blocks) {
    this.blocks = blocks; this.labels.replaceChildren();
    for (const b of blocks) {
      const label = document.createElement('button'); label.className = `tensor-label ${b.kind}`;
      label.textContent = /^attention\.\d$/.test(b.id) ? b.label.replace('attention', 'attn') : b.label;
      label.title = `${b.label} · [${b.data.shape.join(' × ')}]`;
      label.onclick = () => this.onSelect(b.id); label.dataset.tensor = b.id;
      b.labelElement = label; this.labels.append(label);
    }
    this.invalidate();
  }
  visible(block) { return this.visibleKinds.has(block.kind) && (!this.filter || this.filter(block)); }
  select(id) { this.selected = id; this.invalidate(); }
  selectRelated(ids) { this.related = new Set(ids); this.invalidate(); }
  reset() { this.yaw = -.26; this.pitch = .19; this.zoom = 1; this.center = [0, -1, 0]; this.invalidate(); }
  focus(ids) {
    const blocks = this.blocks.filter(b => ids.includes(b.id)); if (!blocks.length) return;
    const left = Math.min(...blocks.map(b => b.pos[0] - b.size[0] / 2));
    const right = Math.max(...blocks.map(b => b.pos[0] + b.size[0] / 2));
    const bottom = Math.min(...blocks.map(b => b.pos[1] - b.size[1] / 2));
    const top = Math.max(...blocks.map(b => b.pos[1] + b.size[1] / 2));
    const front=Math.max(...blocks.map(b=>b.pos[2]+(b.size[2]??.16)/2)),back=Math.min(...blocks.map(b=>b.pos[2]-(b.size[2]??.16)/2));
    this.center = [(left + right) / 2, (bottom + top) / 2, (front+back)/2];
    this.zoom = Math.min(3.5, 30 / Math.max(top - bottom + 5, (right - left + (front-back)*Math.abs(Math.sin(this.yaw)) + 5) / (this.canvas.clientWidth / this.canvas.clientHeight)));
    this.invalidate();
  }
  invalidate() { if (!this.frame) this.frame = requestAnimationFrame(() => { this.frame = null; this.render(); }); }
  render() {
    const gl = this.gl, canvas = this.canvas, ratio = Math.min(devicePixelRatio || 1, 2);
    const width = Math.round(canvas.clientWidth * ratio), height = Math.round(canvas.clientHeight * ratio);
    if (!width || !height) return;
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    const half = 18 / this.zoom, aspect = width / height;
    const center = new Vec3(...this.center);
    const eye = new Vec3(center.x + Math.sin(this.yaw) * 150, center.y + Math.sin(this.pitch) * 90, center.z + Math.cos(this.yaw) * 150);
    this.vp = Mat4f.fromOrtho(-half * aspect, half * aspect, -half, half, .1, 1000).mul(Mat4f.fromLookAt(eye, center, new Vec3(0, 1, 0)));
    gl.viewport(0, 0, width, height); gl.clearColor(.965, .969, .956, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST);
    if (this.showLines) this.renderLines();
    this.renderer.render(this.blocks.filter(b=>this.visible(b)),this.vp,eye,this.selected,this.related);
    for (const b of this.blocks) {
      b.labelElement.hidden = !this.visible(b) || !this.showLabels;
      if (!this.visible(b)) continue;
      const selected = b.id === this.selected; b.labelElement.classList.toggle('selected', selected);
      const related = this.related?.has(b.id); b.labelElement.classList.toggle('related', Boolean(related));
      const p = this.project([b.pos[0], b.pos[1] + b.size[1] / 2 + .35, b.pos[2] + (b.size[2]??.16)/2 + .12]);
      b.labelElement.style.left = `${p[0]}px`; b.labelElement.style.top = `${p[1]}px`;
    }
    canvas.dataset.renderState = 'ready';
  }
  project(point) {
    const p = this.vp.project(point);
    return [(p[0] + 1) * this.canvas.clientWidth / 2, (1 - p[1]) * this.canvas.clientHeight / 2, p[2]];
  }
  pick(event) {
    const rect = this.canvas.getBoundingClientRect(), px = event.clientX - rect.left, py = event.clientY - rect.top;
    const candidates = [];
    for (const b of this.blocks.filter(block => this.visible(block))) {
      const [x, y, z] = b.pos, [w, h] = b.size;
      const tl = this.project([x-w/2,y+h/2,z+(b.size[2]??.16)/2]), tr = this.project([x+w/2,y+h/2,z+(b.size[2]??.16)/2]), bl = this.project([x-w/2,y-h/2,z+(b.size[2]??.16)/2]);
      const ax = tr[0]-tl[0], ay = tr[1]-tl[1], bx = bl[0]-tl[0], by = bl[1]-tl[1], det = ax*by-ay*bx;
      if (Math.abs(det) < 1e-8) continue;
      const u = ((px-tl[0])*by-(py-tl[1])*bx)/det, v = (ax*(py-tl[1])-ay*(px-tl[0]))/det;
      if (u >= 0 && u < 1 && v >= 0 && v < 1) {
        const columns = b.data.shape.at(-1), rows = b.data.shape.length === 1 ? 1 : b.data.shape.at(-2);
        candidates.push({ id: b.id, row: Math.floor(v*rows), column: Math.floor(u*columns), depth: tl[2] });
      }
    }
    candidates.sort((a, b) => a.depth - b.depth);
    if (candidates.length) this.onSelect(candidates[0].id, candidates[0]);
  }
  renderLines() {
    const gl = this.gl, vertices = [], map = new Map(this.blocks.filter(b => this.visible(b)).map(b => [b.id,b]));
    const edges = this.edges || [];
    for (const [from, to] of edges) {
      const a = map.get(from), b = map.get(to); if (!a || !b) continue;
      const p = [a.pos[0], a.pos[1]-a.size[1]/2, a.pos[2]], q = [b.pos[0], b.pos[1]+b.size[1]/2,b.pos[2]];
      vertices.push(...p,...q);
    }
    for (const [from,to,x] of this.skipPaths || []) {
      const a=map.get(from),b=map.get(to); if (!a || !b) continue;
      const p=[a.pos[0]+a.size[0]/2,a.pos[1],a.pos[2]],q=[b.pos[0]+b.size[0]/2,b.pos[1],b.pos[2]];
      vertices.push(...p,x,p[1],0,x,p[1],0,x,q[1],0,x,q[1],0,...q);
    }
    gl.useProgram(this.lineProgram); gl.bindVertexArray(this.lineVao); gl.bindBuffer(gl.ARRAY_BUFFER,this.lineBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.lineProgram,'vp'),false,this.vp); gl.drawArrays(gl.LINES,0,vertices.length/3);
  }
  dispose() {
    this.events.abort(); this.observer.disconnect(); cancelAnimationFrame(this.frame);
    for (const b of [this.lineBuffer]) this.gl.deleteBuffer(b);
    for (const v of [this.lineVao]) this.gl.deleteVertexArray(v);
    this.renderer.dispose(); this.gl.deleteProgram(this.lineProgram); this.labels.replaceChildren();
  }
}
