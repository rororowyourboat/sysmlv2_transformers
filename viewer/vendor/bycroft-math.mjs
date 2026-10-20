// SPDX-License-Identifier: MIT
// Copyright (c) 2023-2026 Brendan Bycroft
// Selected Vec3/Mat4f methods ported from src/utils/{vector,matrix}.ts at
// https://github.com/bbycroft/llm-viz/tree/9da93742382f1bf36c020c38a1ace454e82c4490
// Changes: removed TypeScript annotations and unused operations; project()
// returns a plain array. Full license is in LICENSE.llm-viz alongside this file.

export class Vec3 {
  constructor(x = 0, y = 0, z = 0) { this.x = +x; this.y = +y; this.z = +z; }
  sub(a) { return new Vec3(this.x - a.x, this.y - a.y, this.z - a.z); }
  dot(a) { return this.x * a.x + this.y * a.y + this.z * a.z; }
  mul(a) { return new Vec3(this.x * a, this.y * a, this.z * a); }
  normalize() { return this.mul(1 / Math.sqrt(this.dot(this))); }
  static cross(a, b) { return new Vec3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x); }
}

export class Mat4f extends Float32Array {
  constructor() { super(16); this[0] = this[5] = this[10] = this[15] = 1; }
  mul(a) {
    const result = new Mat4f();
    for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) {
      let v = 0;
      for (let k = 0; k < 4; k++) v += this[k * 4 + y] * a[x * 4 + k];
      result[x * 4 + y] = v;
    }
    return result;
  }
  project([x, y, z]) {
    const w = this[3] * x + this[7] * y + this[11] * z + this[15];
    return [(this[0] * x + this[4] * y + this[8] * z + this[12]) / w,
      (this[1] * x + this[5] * y + this[9] * z + this[13]) / w,
      (this[2] * x + this[6] * y + this[10] * z + this[14]) / w];
  }
  static fromLookAt(eye, center, up) {
    const f = eye.sub(center).normalize();
    let u = up.normalize();
    const r = Vec3.cross(u, f).normalize();
    u = Vec3.cross(f, r);
    const result = new Mat4f();
    result[0] = r.x; result[1] = u.x; result[2] = f.x;
    result[4] = r.y; result[5] = u.y; result[6] = f.y;
    result[8] = r.z; result[9] = u.z; result[10] = f.z;
    result[12] = -eye.dot(r); result[13] = -eye.dot(u); result[14] = -eye.dot(f);
    return result;
  }
  static fromOrtho(left, right, bottom, top, near, far) {
    const result = new Mat4f();
    result[0] = 2 / (right - left); result[5] = 2 / (top - bottom);
    result[10] = -2 / (far - near);
    result[12] = -(right + left) / (right - left);
    result[13] = -(top + bottom) / (top - bottom);
    result[14] = -(far + near) / (far - near);
    return result;
  }
}
