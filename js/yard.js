// The backyard you start in: lawn with a ragged hole, fence, house, patio, trees, sky.
// Stylized: smooth shading, flat-ish colours, soft shadows. Only visible near the surface.
import * as THREE from 'three';
import { mergeVertices } from '../vendor/BufferGeometryUtils.js';
import { lawnMaterial, skyShader } from './shaders.js';

const std = (color, rough = 0.85, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: rough }, extra));
let seed = 1337;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const rr = (a, b) => a + rand() * (b - a);

function canvasTex(w, h, draw, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  if (rep) t.repeat.set(rep[0], rep[1]);
  return t;
}
function blob(radius, amt = 0.18, detail = 3, s = rand() * 100) {
  let g = new THREE.IcosahedronGeometry(radius, detail);
  g = mergeVertices(g);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 2.1 / radius + s) * Math.sin(v.y * 1.7 / radius + s * 2) * Math.sin(v.z * 1.9 / radius + s * 3);
    v.multiplyScalar(1 + n * amt);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}
const shadowAll = (o) => { o.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } }); return o; };

export function buildYard(noise, holeR, reduce = false) {
  seed = 1337;
  const yard = new THREE.Group();

  // ---- sky dome
  const sunDir = new THREE.Vector3(-0.35, 0.8, 0.25);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.ShaderMaterial({
    uniforms: { uSun: { value: sunDir } }, vertexShader: skyShader.vertex, fragmentShader: skyShader.fragment, side: THREE.BackSide, depthWrite: false, fog: false,
  }));
  sky.renderOrder = -10;
  yard.add(sky);

  // ---- lawn with a ragged hole
  const inner = holeR - 0.5;
  const lawnGeo = new THREE.RingGeometry(inner, 140, 160, 24);
  const p = lawnGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), r = Math.hypot(x, y);
    if (r < inner + 0.01) {
      const a = Math.atan2(y, x);
      const jag = Math.sin(a * 7 + 1.3) * 0.12 + Math.sin(a * 17 + 0.4) * 0.07 + Math.sin(a * 41) * 0.05 + (rand() - 0.5) * 0.12;
      const nr = inner + jag;
      p.setXY(i, Math.cos(a) * nr, Math.sin(a) * nr);
    } else if (r < inner + 3) {
      const k = (r - inner) / 3; const a = Math.atan2(y, x);
      const nr = r + (1 - k) * Math.sin(a * 7 + 1.3) * 0.06;
      p.setXY(i, Math.cos(a) * nr, Math.sin(a) * nr);
    }
  }
  lawnGeo.computeVertexNormals();
  const lawn = new THREE.Mesh(lawnGeo, lawnMaterial(noise, holeR));
  lawn.rotation.x = -Math.PI / 2;
  lawn.receiveShadow = true;
  yard.add(lawn);

  // thin soil lip under the grass edge
  const lipGeo = new THREE.CylinderGeometry(inner + 0.02, inner + 0.02, 0.22, 160, 1, true);
  const lp = lipGeo.attributes.position;
  for (let i = 0; i < lp.count; i++) {
    const x = lp.getX(i), z = lp.getZ(i), a = Math.atan2(z, x);
    const jag = Math.sin(a * 7 + 1.3) * 0.12 + Math.sin(a * 17 + 0.4) * 0.07 + Math.sin(a * 41) * 0.05;
    const nr = inner + jag + 0.03;
    lp.setX(i, Math.cos(a) * nr); lp.setZ(i, Math.sin(a) * nr);
  }
  lipGeo.computeVertexNormals();
  const lip = new THREE.Mesh(lipGeo, std('#9a5e3a', 0.95, { side: THREE.BackSide }));
  lip.position.y = -0.1;
  yard.add(lip);

  // ---- grass: instanced blades over the whole lawn, densest around the hole
  const grass = buildGrass(inner, holeR, reduce ? 16000 : 42000);
  yard.add(grass.mesh);
  yard.userData.grassU = grass.time;

  // ---- fence
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  const plankGeo = new THREE.BoxGeometry(0.62, 4.2, 0.14);
  const planks = [];
  const fenceRun = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(len / 0.68), ang = Math.atan2(z1 - z0, x1 - x0);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      planks.push({ x: x0 + (x1 - x0) * t, z: z0 + (z1 - z0) * t, ang, h: rr(-0.06, 0.06) });
    }
    // rails
    for (const y of [0.9, 3.3]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.28, 0.14), std('#8a5e3c', 0.85));
      rail.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
      rail.rotation.y = -ang;
      rail.translateZ(0.14);
      yard.add(shadowAll(rail));
    }
  };
  fenceRun(-26, -24, -9.5, -24);
  fenceRun(12.5, -24, 26, -24);
  fenceRun(-26, -24, -26, 14);
  fenceRun(26, -24, 26, 14);
  const fence = new THREE.InstancedMesh(plankGeo, std('#ffffff', 0.8), planks.length);
  planks.forEach((pl, i) => {
    q.setFromEuler(new THREE.Euler(0, -pl.ang, rr(-0.01, 0.01)));
    m4.compose(new THREE.Vector3(pl.x, 2.1 + pl.h, pl.z), q, new THREE.Vector3(1, 1, 1));
    fence.setMatrixAt(i, m4);
    c.setRGB(rr(0.62, 0.72), rr(0.42, 0.5), rr(0.28, 0.34), THREE.SRGBColorSpace);
    fence.setColorAt(i, c);
  });
  fence.castShadow = fence.receiveShadow = true;
  yard.add(fence);

  // ---- house
  const siding = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#9a8f80'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) { g.fillStyle = 'rgba(0,0,0,0.13)'; g.fillRect(0, y + 13, w, 3); g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(0, y, w, 3); }
  }, [3, 2]);
  const house = new THREE.Group();
  house.position.set(1.5, 0, -33);
  const body = new THREE.Mesh(new THREE.BoxGeometry(20, 7, 12), std('#ffffff', 0.85, { map: siding }));
  body.position.y = 3.5; house.add(body);
  const roofShape = new THREE.Shape([new THREE.Vector2(-7, 0), new THREE.Vector2(7, 0), new THREE.Vector2(0, 5)]);
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 21.6, bevelEnabled: false });
  roofGeo.translate(0, 0, -10.8);
  const roofTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#d06a35'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 22) { g.fillStyle = 'rgba(80,20,0,0.25)'; g.fillRect(0, y + 18, w, 4); }
  }, [0.25, 0.25]);
  const roof = new THREE.Mesh(roofGeo, std('#ffffff', 0.7, { map: roofTex }));
  roof.rotation.y = Math.PI / 2; roof.position.y = 7; roof.scale.set(1, 1, 1);
  house.add(roof);
  const trim = std('#f2ede4', 0.6);
  const glass = std('#a9d6e8', 0.15, { metalness: 0.1, emissive: '#3a6a80', emissiveIntensity: 0.25 });
  const win = (x, y, w = 2.2, h = 2.4) => {
    const fr = new THREE.Mesh(new THREE.BoxGeometry(w + 0.35, h + 0.35, 0.25), trim); fr.position.set(x, y, 6.05); house.add(fr);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glass); gl.position.set(x, y, 6.19); house.add(gl);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, h, 0.05), trim); bar.position.set(x, y, 6.22); house.add(bar);
  };
  win(-6.5, 3.6); win(-2.5, 3.6);
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4.6, 0.3), std('#8c6a50', 0.7)); door.position.set(4.5, 2.3, 6.05); house.add(door);
  const doorFr = new THREE.Mesh(new THREE.BoxGeometry(2.9, 5.0, 0.2), trim); doorFr.position.set(4.5, 2.4, 6.0); house.add(doorFr);
  win(8.2, 3.6);
  const dormer = new THREE.Group(); dormer.position.set(-3, 7.2, 3.2);
  const dbody = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3, 3), std('#ffffff', 0.85, { map: siding })); dbody.position.y = 1.2; dormer.add(dbody);
  const droof = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-2.3, 0), new THREE.Vector2(2.3, 0), new THREE.Vector2(0, 1.8)]), { depth: 3.6, bevelEnabled: false }).translate(0, 0, -1.6), std('#ffffff', 0.7, { map: roofTex }));
  droof.position.y = 2.7; dormer.add(droof);
  const dfr = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.8, 0.2), trim); dfr.position.set(0, 1.3, 1.55); dormer.add(dfr);
  const dgl = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.4), glass); dgl.position.set(0, 1.3, 1.67); dormer.add(dgl);
  house.add(dormer);
  yard.add(shadowAll(house));

  // brick annex on the right
  const brick = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#c9c0b4'; g.fillRect(0, 0, w, h);
    for (let row = 0; row < 16; row++) for (let col = 0; col < 8; col++) {
      const x = col * 32 + (row % 2 ? 16 : 0), y = row * 16;
      const t = 0.88 + ((row * 7 + col * 13) % 10) / 60;
      g.fillStyle = `rgb(${Math.round(150 * t)},${Math.round(132 * t)},${Math.round(118 * t)})`;
      g.fillRect(x + 1.5, y + 1.5, 29, 13);
    }
  }, [3, 2]);
  const annex = new THREE.Group(); annex.position.set(20, 0, -30);
  const ab = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 10), std('#ffffff', 0.9, { map: brick })); ab.position.y = 3; annex.add(ab);
  const ar = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-6.6, 0), new THREE.Vector2(6.6, 0), new THREE.Vector2(0, 3)]), { depth: 10.8, bevelEnabled: false }).translate(0, 0, -5.4), std('#ffffff', 0.7, { map: roofTex }));
  ar.position.y = 6; annex.add(ar);
  const ad = new THREE.Mesh(new THREE.BoxGeometry(3, 4.4, 0.3), std('#9a7656', 0.7)); ad.position.set(-1, 2.2, 5.05); annex.add(ad);
  yard.add(shadowAll(annex));

  // ---- patio
  const patio = new THREE.Mesh(new THREE.BoxGeometry(16, 0.25, 8), std('#b9c3c6', 0.75)); patio.position.set(-2, 0.1, -23); yard.add(shadowAll(patio));
  const curb = new THREE.Mesh(new THREE.BoxGeometry(44, 0.35, 1.0), std('#a99a8c', 0.8)); curb.position.set(4, 0.15, -18.6); yard.add(shadowAll(curb));
  const pavers = new THREE.Mesh(new THREE.BoxGeometry(22, 0.22, 5.5), std('#c47a5a', 0.85)); pavers.position.set(16, 0.1, -21.5); yard.add(shadowAll(pavers));
  // umbrella
  const stripes = canvasTex(512, 64, (g, w, h) => { for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#f6efe2' : '#ef8a2c'; g.fillRect(i * w / 16, 0, w / 16 + 1, h); } });
  const umb = new THREE.Group(); umb.position.set(-3, 0, -23);
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(4.2, 1.4, 16, 1, true), std('#ffffff', 0.8, { map: stripes, side: THREE.DoubleSide }));
  canopy.position.y = 5.4; umb.add(canopy);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5.6, 8), std('#ddd', 0.4, { metalness: 0.6 })); pole.position.y = 2.8; umb.add(pole);
  const table = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.12, 24), std('#8d6345', 0.6)); table.position.y = 1.7; umb.add(table);
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 + 0.4, chair = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1, 0.12, 1), std('#a0704a', 0.7)); seat.position.y = 1.0; chair.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1, 1.3, 0.12), std('#a0704a', 0.7)); back.position.set(0, 1.6, 0.45); chair.add(back);
    for (const [lx, lz] of [[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.1), std('#8a5e3c', 0.7)); l.position.set(lx, 0.5, lz); chair.add(l); }
    chair.position.set(Math.cos(a) * 2.2, 0, Math.sin(a) * 2.2); chair.rotation.y = -a - Math.PI / 2;
    umb.add(chair);
  }
  yard.add(shadowAll(umb));

  // ---- planters
  for (const [x, z] of [[21, -14], [23.5, -9]]) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(4, 1.6, 2.4), std('#a86f45', 0.8)); box.position.set(x, 0.8, z); yard.add(shadowAll(box));
    const soil = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.1, 2.0), std('#4a3020', 1)); soil.position.set(x, 1.6, z); yard.add(soil);
  }

  // ---- bushes & hedges
  const bushMat = (h) => std(new THREE.Color().setHSL(0.26 + rr(-0.03, 0.03), 0.55 + rr(-0.08, 0.1), h * 0.8), 0.95);
  const bush = (x, z, s) => { const b = new THREE.Mesh(blob(s, 0.16), bushMat(rr(0.22, 0.3))); b.position.set(x, s * 0.7, z); b.scale.y = 0.85; yard.add(shadowAll(b)); };
  for (let i = 0; i < 9; i++) bush(-24.5 + rr(-0.3, 0.3), -20 + i * 3.6, rr(1.3, 1.9));
  for (let i = 0; i < 7; i++) bush(24.5 + rr(-0.3, 0.3), -6 + i * 3.6, rr(1.2, 1.8));
  for (let i = 0; i < 6; i++) bush(-19 + i * 2.6, -23, rr(1.0, 1.5));
  for (const x of [-8, -6.5, 7.5, 10]) bush(x + 1.5, -26.6, rr(0.8, 1.1));
  // distant tree line behind the fence
  for (let i = 0; i < 26; i++) {
    const a = rr(-1, 1), x = rr(-60, 60), z = rr(-70, -45);
    const b = new THREE.Mesh(blob(rr(5, 8), 0.2, 2), bushMat(rr(0.16, 0.24))); b.position.set(x, rr(4, 8), z); yard.add(b);
  }
  for (let i = 0; i < 12; i++) {
    const side = i % 2 ? 1 : -1;
    const b = new THREE.Mesh(blob(rr(4, 7), 0.2, 2), bushMat(rr(0.18, 0.26))); b.position.set(side * rr(36, 55), rr(4, 7), rr(-40, 20)); yard.add(b);
  }

  // ---- trees
  const tree = (x, z, h, color, n = 7) => {
    const t = new THREE.Group(); t.position.set(x, 0, z);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.5, h * 0.4, 0.2), new THREE.Vector3(-0.3, h * 0.8, -0.2), new THREE.Vector3(0.2, h, 0)]);
    const trunkGeo = new THREE.TubeGeometry(curve, 20, 0.55, 10);
    const tp = trunkGeo.attributes.position;
    for (let i = 0; i < tp.count; i++) { const k = Math.floor(i / 11) / 20, cp = curve.getPoint(k), sc = 1 - k * 0.55; tp.setXYZ(i, cp.x + (tp.getX(i) - cp.x) * sc, cp.y + (tp.getY(i) - cp.y) * sc, cp.z + (tp.getZ(i) - cp.z) * sc); }
    trunkGeo.computeVertexNormals();
    t.add(new THREE.Mesh(trunkGeo, std('#7a5a44', 0.9)));
    const fol = new THREE.Color(color);
    for (let i = 0; i < n; i++) {
      const s = rr(1.8, 3.0);
      const m = new THREE.Mesh(blob(s, 0.18), std(fol.clone().offsetHSL(rr(-0.02, 0.02), 0, rr(-0.06, 0.05)), 0.95));
      m.position.set(rr(-2.6, 2.6), h + rr(-1.2, 2.2), rr(-2.4, 2.4));
      t.add(m);
    }
    yard.add(shadowAll(t));
  };
  tree(-15, -20, 7, '#d4682c', 8);
  tree(18, -17, 8, '#5e9a34', 8);
  tree(-21, -2, 6.5, '#e0843a', 6);
  tree(30, -36, 9, '#4f8a2e', 7);

  yard.userData.sunDir = sunDir;
  return yard;
}

function mergeGeos(geos) {
  // tiny merge (non-indexed) to avoid pulling in the whole utils for one call
  const parts = geos.map(g => g.index ? g.toNonIndexed() : g);
  let count = 0; parts.forEach(g => count += g.attributes.position.count);
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3);
  let o = 0;
  for (const g of parts) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

const jagAt = (a) => Math.sin(a * 7 + 1.3) * 0.12 + Math.sin(a * 17 + 0.4) * 0.07 + Math.sin(a * 41) * 0.05;
function inBlocked(x, z) {
  if (z < -23.4 || z > 9 || Math.abs(x) > 25.5) return true;           // fence / behind camera
  if (x > -10.5 && x < 6.5 && z < -18.8) return true;                   // patio
  if (x > 4.5 && z < -18.2) return true;                                // pavers + curb
  if (z < -18.2 && z > -19.2) return true;                              // curb line
  return false;
}
export function buildGrass(inner, holeR, count = 42000) {
  // one blade: 3 segments, tapering, slightly curved
  const H = [0, 0.38, 0.72, 1.0], W = [1, 0.78, 0.45, 0];
  const pos = [], idx = [];
  for (let i = 0; i < 3; i++) { const z = H[i] * H[i] * 0.18; pos.push(-0.5 * W[i], H[i], z, 0.5 * W[i], H[i], z); }
  pos.push(0, 1, 0.18);
  idx.push(0, 1, 2, 2, 1, 3, 2, 3, 4, 4, 3, 5, 4, 5, 6);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const time = { value: 0 };
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = time;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime; varying float vBladeY;')
      .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3(0.0, 1.0, 0.0);')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vBladeY = position.y;
        vec3 ip = vec3(instanceMatrix[3][0], 0.0, instanceMatrix[3][2]);
        float w = sin(uTime*1.6 + ip.x*0.35 + ip.z*0.25) * 0.5 + sin(uTime*2.9 + ip.x*1.3) * 0.2;
        transformed.z += w * 0.16 * position.y * position.y;
        transformed.x += w * 0.05 * position.y;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vBladeY;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb *= mix(0.42, 1.08, smoothstep(0.0, 1.0, vBladeY));`);
  };
  const mesh = new THREE.InstancedMesh(g, mat, count);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color(), v = new THREE.Vector3(), s3 = new THREE.Vector3();
  const base = new THREE.Color('#5e8f22'), tip = new THREE.Color('#8fb83a'), dry = new THREE.Color('#b9b85a');
  let n = 0, guard = 0;
  while (n < count && guard++ < count * 4) {
    let x, z;
    if (rand() < 0.62) { // dense ring around the hole
      const a = rand() * Math.PI * 2, r = Math.sqrt(rand() * (13 * 13 - inner * inner) + inner * inner);
      x = Math.cos(a) * r; z = Math.sin(a) * r;
      const edge = inner + jagAt(a);
      if (r < edge + 0.02) continue;
    } else { x = rr(-25.5, 25.5); z = rr(-23.4, 9); if (Math.hypot(x, z) < inner + 0.6) continue; }
    if (inBlocked(x, z)) continue;
    const r = Math.hypot(x, z), a = Math.atan2(z, x);
    const nearEdge = Math.max(0, 1 - (r - (inner + jagAt(a))) / 0.7);
    e.set(rr(-0.18, 0.18), rand() * Math.PI * 2, rr(-0.18, 0.18));
    q.setFromEuler(e);
    if (nearEdge > 0) q.premultiply(new THREE.Quaternion().setFromAxisAngle(v.set(-Math.sin(a), 0, Math.cos(a)), -nearEdge * 0.7));
    const h = rr(0.32, 0.62) * (1 - nearEdge * 0.15), w = rr(0.07, 0.11);
    s3.set(w, h, w * 1.2);
    m4.compose(v.set(x, 0, z), q, s3);
    mesh.setMatrixAt(n, m4);
    c.copy(base).lerp(tip, rand() * 0.8).lerp(dry, rand() < 0.12 ? rr(0.3, 0.6) : 0).multiplyScalar(rr(0.85, 1.08));
    mesh.setColorAt(n, c);
    n++;
  }
  mesh.count = n;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return { mesh, time };
}
