// Procedural 3D models: tools (first-person), machines, boulders, treasures, the Mole King.
// Everything is built from primitives so the game ships with zero model files.
import * as THREE from 'three';
import { mergeVertices } from '../vendor/BufferGeometryUtils.js';

// --------------------------------------------------------------- textures
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 4;
  return t;
}
const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);

let _wood, _flannel, _leather, _grip, _rust;
function woodTex() {
  return _wood ||= canvasTex(64, 512, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const x = rnd(0, w), wd = rnd(0.5, 3), a = rnd(0.04, 0.16);
      g.strokeStyle = `rgba(60,30,10,${a})`; g.lineWidth = wd;
      g.beginPath(); g.moveTo(x, 0);
      for (let y = 0; y <= h; y += 16) g.lineTo(x + Math.sin(y * 0.02 + i) * 2.5, y);
      g.stroke();
    }
    for (let i = 0; i < 3; i++) { // knots
      const x = rnd(10, w - 10), y = rnd(40, h - 40);
      for (let r = 9; r > 1; r -= 2) { g.strokeStyle = 'rgba(70,35,10,0.18)'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, y, r * 0.6, r * 1.6, 0, 0, 7); g.stroke(); }
    }
  });
}
function flannelTex() {
  return _flannel ||= canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#8f2a22'; g.fillRect(0, 0, w, h);
    g.globalAlpha = 0.55; g.fillStyle = '#1d1414';
    g.fillRect(0, 40, w, 26); g.fillRect(40, 0, 26, h);
    g.globalAlpha = 0.35; g.fillStyle = '#d9b77a';
    g.fillRect(0, 100, w, 4); g.fillRect(100, 0, 4, h);
    g.globalAlpha = 0.08; g.fillStyle = '#000';
    for (let y = 0; y < h; y += 2) g.fillRect(0, y, w, 1);
  }, [2, 2]);
}
function leatherTex() {
  return _leather ||= canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(0,0,0,${rnd(0.02, 0.09)})`; g.fillRect(rnd(0, w), rnd(0, h), rnd(1, 3), rnd(1, 3)); }
  });
}
function gripTex() {
  return _grip ||= canvasTex(32, 128, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 3;
    for (let y = -h; y < h * 2; y += 10) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 12); g.stroke(); }
  }, [1, 3]);
}
function rustTex() {
  return _rust ||= canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) {
      const x = rnd(0, w), y = rnd(0, h), r = rnd(2, 10);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(120,60,20,0.35)'); gr.addColorStop(1, 'rgba(120,60,20,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  });
}
export function softDotTexture() {
  return canvasTex(64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  });
}
export function puffTexture() {
  return canvasTex(128, 128, (g) => {
    for (let i = 0; i < 14; i++) {
      const x = 64 + rnd(-22, 22), y = 64 + rnd(-22, 22), r = rnd(18, 38);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    }
  });
}

// --------------------------------------------------------------- materials
const std = (o) => new THREE.MeshStandardMaterial(o);
export const MAT = {
  wood: (c = '#c8874c') => std({ color: c, roughness: 0.62 }),
  steel: (c = '#c9cdd2', r = 0.35) => std({ color: c, metalness: 0.65, roughness: r }),
  darkSteel: (c = '#4a4d52', r = 0.45) => std({ color: c, metalness: 0.9, roughness: r }),
  rusty: (c = '#b4b9bf') => std({ color: c, metalness: 0.55, roughness: 0.45 }),
  paint: (c, r = 0.5) => std({ color: c, roughness: r, metalness: 0.05 }),
  rubber: (c = '#2a2a2e') => std({ color: c, roughness: 0.85 }),
  leather: (c = '#7a4a26') => std({ color: c, roughness: 0.75 }),
  skin: () => new THREE.MeshPhysicalMaterial({ color: '#e0a983', roughness: 0.62, sheen: 0.4, sheenColor: new THREE.Color('#ffccaa') }),
  glow: (c, i = 2) => std({ color: '#000', emissive: c, emissiveIntensity: i, roughness: 1 }),
  brass: () => std({ color: '#c99a45', metalness: 1, roughness: 0.38 }),
  gem: (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.08, metalness: 0, transmission: 0.0, clearcoat: 1, clearcoatRoughness: 0.05, emissive: c, emissiveIntensity: 0.18, flatShading: true }),
};

// --------------------------------------------------------------- geometry helpers
function roundedBox(w, h, d, r = 0.05, seg = 3) {
  const s = new THREE.Shape();
  const x = -w / 2 + r, y = -h / 2 + r, ww = w - 2 * r, hh = h - 2 * r;
  s.moveTo(x, y - r); s.lineTo(x + ww, y - r); s.quadraticCurveTo(x + ww + r, y - r, x + ww + r, y);
  s.lineTo(x + ww + r, y + hh); s.quadraticCurveTo(x + ww + r, y + hh + r, x + ww, y + hh + r);
  s.lineTo(x, y + hh + r); s.quadraticCurveTo(x - r, y + hh + r, x - r, y + hh);
  s.lineTo(x - r, y); s.quadraticCurveTo(x - r, y - r, x, y - r);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.9, bevelSegments: seg, curveSegments: seg * 2 });
  g.translate(0, 0, -(d - 2 * r) / 2);
  return g;
}
function extrude(points, depth, bevel = 0.01, curve = 8) {
  const s = new THREE.Shape(points.map(p => new THREE.Vector2(p[0], p[1])));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: curve });
  g.translate(0, 0, -depth / 2);
  return g;
}
function shapeExtrude(shape, depth, bevel = 0.01) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 16 });
  g.translate(0, 0, -depth / 2);
  return g;
}
const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; return o; };
const cyl = (rt, rb, h, seg = 16) => new THREE.CylinderGeometry(rt, rb, h, seg);
function lathe(profile, seg = 24) { return new THREE.LatheGeometry(profile.map(p => new THREE.Vector2(p[0], p[1])), seg); }
function twist(geo, turns) {
  const p = geo.attributes.position; geo.computeBoundingBox();
  const h = geo.boundingBox.max.y - geo.boundingBox.min.y, y0 = geo.boundingBox.min.y;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), a = ((y - y0) / h) * turns * Math.PI * 2;
    const x = p.getX(i), z = p.getZ(i);
    p.setXYZ(i, x * Math.cos(a) - z * Math.sin(a), y, x * Math.sin(a) + z * Math.cos(a));
  }
  geo.computeVertexNormals(); return geo;
}
function lumpy(geo, amt, freq = 2.2, seed = Math.random() * 100) {
  geo = mergeVertices(geo);
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * freq + seed) * Math.sin(v.y * freq * 1.3 + seed * 2) * Math.sin(v.z * freq * 0.9 + seed * 3)
      + 0.5 * Math.sin(v.x * freq * 2.7 + seed) * Math.sin(v.z * freq * 2.3 - seed);
    v.multiplyScalar(1 + n * amt);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

// --------------------------------------------------------------- tools
// Each returns { group, head } where head is the striking point (for sparks).
const TOOL_BUILDERS = {
  hands() {
    // a single work glove, balled into a fist
    const g = new THREE.Group();
    const lea = MAT.leather('#b98a55'), cuffM = std({ color: '#6b4a2e', roughness: 0.85 });
    const fist = mesh(new THREE.SphereGeometry(0.3, 32, 24), lea, 0, 0.3, 0); fist.scale.set(1, 1.05, 0.85); g.add(fist);
    for (let i = 0; i < 4; i++) { const k = mesh(new THREE.CapsuleGeometry(0.075, 0.12, 8, 16), lea, -0.16 + i * 0.105, 0.5, 0.14); k.rotation.x = Math.PI / 2; g.add(k); }
    const th = mesh(new THREE.CapsuleGeometry(0.08, 0.2, 8, 16), lea, -0.27, 0.32, 0.12); th.rotation.z = 0.5; g.add(th);
    g.add(mesh(cyl(0.24, 0.27, 0.36, 32), cuffM, 0, -0.05, 0));
    const seam = mesh(new THREE.TorusGeometry(0.255, 0.018, 8, 32), std({ color: '#3e2a1a', roughness: 0.9 }), 0, 0.12, 0); seam.rotation.x = Math.PI / 2; g.add(seam);
    const head = new THREE.Object3D(); head.position.set(0, 0.6, 0); g.add(head);
    return { group: g, head, reach: 0.6 };
  },
  spoon() {
    const g = new THREE.Group();
    const handle = mesh(extrude([[-0.035, -0.25], [0.035, -0.25], [0.05, 0.4], [0.06, 0.62], [0.025, 0.85], [-0.025, 0.85], [-0.06, 0.62], [-0.05, 0.4]], 0.025, 0.012), MAT.steel('#d8dade', 0.22));
    const bowl = mesh(new THREE.SphereGeometry(0.16, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), MAT.steel('#d8dade', 0.18), 0, 1.02, 0.0);
    bowl.scale.set(0.85, 1.35, 0.42); bowl.rotation.x = Math.PI / 2;
    bowl.material.side = THREE.DoubleSide;
    g.add(handle, bowl);
    const head = new THREE.Object3D(); head.position.set(0, 1.18, 0); g.add(head);
    return { group: g, head, reach: 1.2 };
  },
  trowel() {
    const g = new THREE.Group();
    g.add(mesh(lathe([[0, -0.32], [0.06, -0.3], [0.075, -0.1], [0.07, 0.12], [0.06, 0.3], [0, 0.32]]), MAT.paint('#e5762a', 0.5)));
    g.add(mesh(cyl(0.04, 0.05, 0.12), MAT.steel(), 0, 0.36, 0));
    g.add(mesh(cyl(0.015, 0.02, 0.2, 8), MAT.steel(), 0, 0.5, 0));
    const blade = mesh(extrude([[0, 0], [0.17, 0.08], [0.16, 0.4], [0, 0.72], [-0.16, 0.4], [-0.17, 0.08]], 0.012, 0.006), MAT.steel('#bfc3c8', 0.3), 0, 0.56, 0);
    g.add(blade);
    const head = new THREE.Object3D(); head.position.set(0, 1.25, 0); g.add(head);
    return { group: g, head, reach: 1.3 };
  },
  shovel() {
    const g = new THREE.Group();
    g.add(mesh(cyl(0.05, 0.055, 1.9, 20), MAT.wood('#c8874c'), 0, 0.55, 0));
    g.add(mesh(cyl(0.065, 0.065, 0.5, 20), MAT.paint('#e5762a', 0.5), 0, -0.25, 0));
    g.add(mesh(cyl(0.065, 0.075, 0.3, 14), MAT.darkSteel(), 0, 1.55, 0));
    const shape = new THREE.Shape();
    shape.moveTo(-0.28, 0); shape.lineTo(0.28, 0); shape.quadraticCurveTo(0.3, 0.4, 0.12, 0.62); shape.quadraticCurveTo(0, 0.74, -0.12, 0.62); shape.quadraticCurveTo(-0.3, 0.4, -0.28, 0);
    const bg = shapeExtrude(shape, 0.02, 0.01);
    const p = bg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, p.getZ(i) + x * x * 0.6); } bg.computeVertexNormals();
    const blade = mesh(bg, MAT.rusty('#a7acb2'), 0, 1.66, 0);
    g.add(blade);
    const head = new THREE.Object3D(); head.position.set(0, 2.3, 0); g.add(head);
    return { group: g, head, reach: 2.3 };
  },
  pickaxe() {
    const g = new THREE.Group();
    g.add(mesh(cyl(0.05, 0.06, 2.0, 14), MAT.wood('#9b6436'), 0, 0.6, 0));
    const head = new THREE.Group(); head.position.y = 1.6;
    head.add(mesh(roundedBox(0.16, 0.22, 0.16, 0.03), MAT.darkSteel()));
    for (const side of [-1, 1]) {
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(side * 0.45, 0.05, 0), new THREE.Vector3(side * 0.85, -0.25, 0));
      const tube = new THREE.TubeGeometry(curve, 16, 0.06, 8, false);
      const p = tube.attributes.position;
      // taper toward the tip
      for (let i = 0; i < p.count; i++) {
        const t = Math.floor(i / 9) / 16, c = curve.getPoint(t), k = 1 - t * 0.92;
        p.setXYZ(i, c.x + (p.getX(i) - c.x) * k, c.y + (p.getY(i) - c.y) * k, c.z + (p.getZ(i) - c.z) * k);
      }
      tube.computeVertexNormals();
      head.add(mesh(tube, MAT.steel('#9fa4aa', 0.38)));
    }
    g.add(head);
    const tip = new THREE.Object3D(); tip.position.set(0.85, 1.35, 0); g.add(tip);
    return { group: g, head: tip, reach: 1.8 };
  },
  mattock() {
    const g = new THREE.Group();
    g.add(mesh(cyl(0.06, 0.07, 2.1, 14), MAT.wood('#6e4a2c'), 0, 0.65, 0));
    for (let i = 0; i < 4; i++) g.add(mesh(cyl(0.075, 0.075, 0.04, 14), MAT.leather('#2e2018'), 0, -0.1 + i * 0.06, 0));
    const head = new THREE.Group(); head.position.y = 1.72;
    head.add(mesh(roundedBox(0.2, 0.26, 0.2, 0.03), MAT.paint('#8c2b20', 0.45)));
    const adze = mesh(extrude([[0, -0.09], [0.55, -0.16], [0.7, -0.24], [0.72, 0.2], [0.55, 0.12], [0, 0.09]], 0.05, 0.015), MAT.steel('#8d939a', 0.35));
    adze.rotation.x = Math.PI / 2; head.add(adze);
    const spike = mesh(new THREE.ConeGeometry(0.07, 0.75, 10), MAT.steel('#8d939a', 0.35), -0.42, -0.06, 0);
    spike.rotation.z = Math.PI / 2 + 0.2; head.add(spike);
    g.add(head);
    const tip = new THREE.Object3D(); tip.position.set(0.72, 1.6, 0); g.add(tip);
    return { group: g, head: tip, reach: 1.9 };
  },
  jack() {
    const g = new THREE.Group();
    const yellow = MAT.paint('#e3a21a', 0.42);
    // T-handle at the grip
    const bar = mesh(cyl(0.05, 0.05, 0.9, 12), MAT.darkSteel(), 0, 0, 0); bar.rotation.z = Math.PI / 2; bar.position.y = 0.05; g.add(bar);
    for (const s of [-1, 1]) { const gr = mesh(cyl(0.07, 0.07, 0.28, 14), MAT.rubber(), s * 0.36, 0.05, 0); gr.rotation.z = Math.PI / 2; g.add(gr); }
    g.add(mesh(cyl(0.2, 0.22, 0.9, 20), yellow, 0, 0.6, 0));
    g.add(mesh(cyl(0.23, 0.23, 0.08, 20), MAT.darkSteel(), 0, 0.2, 0));
    for (let i = 0; i < 5; i++) { const r = mesh(new THREE.TorusGeometry(0.205, 0.02, 6, 24), MAT.darkSteel(), 0, 0.35 + i * 0.12, 0); r.rotation.x = Math.PI / 2; g.add(r); }
    g.add(mesh(cyl(0.12, 0.16, 0.25, 16), MAT.darkSteel(), 0, 1.16, 0));
    g.add(mesh(cyl(0.045, 0.045, 0.7, 10), MAT.steel('#aab0b6', 0.3), 0, 1.6, 0));
    g.add(mesh(new THREE.ConeGeometry(0.045, 0.16, 10), MAT.steel('#aab0b6', 0.3), 0, 2.03, 0));
    const hose = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.2, 0.7, 0), new THREE.Vector3(0.5, 0.5, 0.1), new THREE.Vector3(0.6, -0.4, 0.2), new THREE.Vector3(0.5, -1.4, 0.3)]), 24, 0.04, 8);
    g.add(mesh(hose, MAT.paint('#1a1a1a', 0.7)));
    const tip = new THREE.Object3D(); tip.position.set(0, 2.1, 0); g.add(tip);
    return { group: g, head: tip, reach: 2.1, vibrate: true };
  },
  drill() {
    const g = new THREE.Group();
    const body = MAT.paint('#d6541e', 0.45);
    g.add(mesh(roundedBox(0.22, 0.5, 0.22, 0.07), MAT.rubber('#262626'), 0, 0.05, 0));
    g.add(mesh(roundedBox(0.36, 0.7, 0.36, 0.1), body, 0, 0.6, 0));
    g.add(mesh(cyl(0.16, 0.2, 0.25, 20), MAT.darkSteel(), 0, 1.05, 0));
    for (let i = 0; i < 6; i++) { const v = mesh(roundedBox(0.03, 0.18, 0.02, 0.008), MAT.paint('#222'), -0.1 + i * 0.04, 0.7, 0.185); g.add(v); }
    g.add(mesh(cyl(0.09, 0.12, 0.18, 16), MAT.steel(), 0, 1.25, 0));
    const bit = new THREE.Group(); bit.position.y = 1.34;
    const flute = twist(new THREE.BoxGeometry(0.16, 0.9, 0.035, 2, 60, 1), 3.2);
    flute.translate(0, 0.45, 0);
    bit.add(mesh(flute, MAT.steel('#c9cdd2', 0.25)));
    bit.add(mesh(new THREE.ConeGeometry(0.08, 0.16, 12), MAT.steel('#e0c070', 0.2), 0, 0.98, 0));
    g.add(bit);
    const tip = new THREE.Object3D(); tip.position.set(0, 2.35, 0); g.add(tip);
    return { group: g, head: tip, reach: 2.3, spin: bit };
  },
  plasma() {
    const g = new THREE.Group();
    const shell = std({ color: '#e9e6df', roughness: 0.35, metalness: 0.1 });
    const dark = std({ color: '#25272c', roughness: 0.4, metalness: 0.6 });
    g.add(mesh(cyl(0.08, 0.08, 0.5, 16), MAT.rubber('#202024'), 0, 0.05, 0));
    g.add(mesh(lathe([[0, 0], [0.16, 0.02], [0.2, 0.2], [0.18, 0.9], [0.12, 1.1], [0, 1.12]], 28), shell, 0, 0.32, 0));
    const coils = [];
    for (let i = 0; i < 4; i++) { const c = mesh(new THREE.TorusGeometry(0.19, 0.025, 8, 28), MAT.glow('#5ef2ff', 2.5), 0, 0.6 + i * 0.16, 0); c.rotation.x = Math.PI / 2; g.add(c); coils.push(c); }
    g.add(mesh(cyl(0.05, 0.09, 0.35, 16), dark, 0, 1.6, 0));
    const emitter = mesh(new THREE.SphereGeometry(0.07, 16, 12), MAT.glow('#bff9ff', 4), 0, 1.82, 0); g.add(emitter);
    const tip = new THREE.Object3D(); tip.position.set(0, 1.9, 0); g.add(tip);
    return { group: g, head: tip, reach: 1.9, pulse: [...coils, emitter], glowColor: '#5ef2ff' };
  },
  graviton() {
    const g = new THREE.Group();
    g.add(mesh(cyl(0.06, 0.07, 1.9, 16), MAT.darkSteel('#2c2c33'), 0, 0.55, 0));
    for (let i = 0; i < 6; i++) g.add(mesh(cyl(0.078, 0.078, 0.05, 16), MAT.brass(), 0, -0.15 + i * 0.09, 0));
    const head = new THREE.Group(); head.position.y = 1.65;
    const hm = mesh(cyl(0.28, 0.28, 0.8, 8), std({ color: '#1e1e26', metalness: 0.9, roughness: 0.3, flatShading: true }));
    hm.rotation.z = Math.PI / 2; head.add(hm);
    for (const s of [-1, 1]) { const cap = mesh(cyl(0.3, 0.3, 0.08, 8), MAT.brass(), s * 0.42, 0, 0); cap.rotation.z = Math.PI / 2; head.add(cap); }
    const core = mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 32), MAT.glow('#b46bff', 3)); core.rotation.y = Math.PI / 2; head.add(core);
    const orbs = new THREE.Group();
    for (let i = 0; i < 3; i++) { const o = mesh(new THREE.IcosahedronGeometry(0.05, 0), MAT.glow('#d9b3ff', 3)); o.userData.phase = i * 2.09; orbs.add(o); }
    head.add(orbs);
    g.add(head);
    const tip = new THREE.Object3D(); tip.position.set(0.5, 1.65, 0); g.add(tip);
    return { group: g, head: tip, reach: 1.9, orbs, pulse: [core], glowColor: '#b46bff' };
  },
};
export function buildTool(id) { return TOOL_BUILDERS[id](); }

// --------------------------------------------------------------- bags (thumbnails only)
export function buildBag(i) {
  const g = new THREE.Group();
  switch (i) {
    case 0: { // pockets: denim patch
      const m = std({ color: '#3d5a80', roughness: 0.9 });
      g.add(mesh(roundedBox(1, 1.1, 0.12, 0.06), m));
      const st = std({ color: '#d9a441', roughness: 0.8 });
      g.add(mesh(roundedBox(0.9, 0.03, 0.14, 0.01), st, 0, 0.4, 0));
      break; }
    case 1: { // tin bucket
      g.add(mesh(lathe([[0, -0.5], [0.42, -0.5], [0.55, 0.5], [0.58, 0.52], [0.5, 0.52], [0.4, -0.42], [0, -0.42]], 32), MAT.rusty('#b9bfc6')));
      const h = mesh(new THREE.TorusGeometry(0.55, 0.02, 6, 24, Math.PI), MAT.steel()); h.position.y = 0.5; g.add(h);
      break; }
    case 2: { // sack
      g.add(mesh(lumpy(new THREE.SphereGeometry(0.55, 24, 16), 0.08), std({ color: '#b39a6b', roughness: 1 })));
      g.add(mesh(cyl(0.12, 0.2, 0.25, 12), std({ color: '#a38a5b', roughness: 1 }), 0, 0.6, 0));
      const tie = mesh(new THREE.TorusGeometry(0.13, 0.03, 6, 16), std({ color: '#5a3d20' }), 0, 0.55, 0); tie.rotation.x = Math.PI / 2; g.add(tie);
      break; }
    case 3: { // wheelbarrow
      g.add(mesh(lathe([[0, -0.2], [0.5, -0.2], [0.7, 0.25], [0, 0.25]], 4), MAT.paint('#3f7a4a'), 0, 0.15, 0));
      g.children[0].rotation.y = Math.PI / 4; g.children[0].scale.set(1.3, 1, 0.8);
      const w = mesh(new THREE.TorusGeometry(0.22, 0.07, 10, 20), MAT.rubber(), 0.8, -0.2, 0); g.add(w);
      break; }
    case 4: case 5: { // minecart / ore wagon
      const c = i === 4 ? '#6b6f75' : '#7a4c2a';
      g.add(mesh(roundedBox(1.2, 0.6, 0.8, 0.05), i === 4 ? MAT.rusty(c) : MAT.wood(c), 0, 0.15, 0));
      for (const x of [-0.4, 0.4]) for (const z of [-0.42, 0.42]) { const w = mesh(cyl(0.16, 0.16, 0.08, 16), MAT.darkSteel(), x, -0.2, z); w.rotation.x = Math.PI / 2; g.add(w); }
      for (let k = 0; k < 7; k++) g.add(mesh(new THREE.DodecahedronGeometry(rnd(0.1, 0.18), 0), MAT.paint(['#6b5a4a', '#c9a24a', '#888'][k % 3], 0.8), rnd(-0.4, 0.4), 0.5, rnd(-0.25, 0.25)));
      break; }
    case 6: case 7: { // trucks
      const col = i === 6 ? '#e0a020' : '#c43c2c';
      g.add(mesh(roundedBox(1.4, 0.5, 0.8, 0.08), MAT.paint(col), 0.2, 0.2, 0));
      g.add(mesh(roundedBox(0.5, 0.55, 0.78, 0.08), MAT.paint(col), -0.75, 0.15, 0));
      g.add(mesh(roundedBox(0.3, 0.25, 0.8, 0.04), std({ color: '#223', roughness: 0.1, metalness: 0.5 }), -0.85, 0.25, 0));
      for (const x of [-0.7, 0.1, 0.6]) for (const z of [-0.42, 0.42]) { const w = mesh(cyl(0.2, 0.2, 0.14, 16), MAT.rubber(), x, -0.15, z); w.rotation.x = Math.PI / 2; g.add(w); }
      break; }
    case 8: { // silo
      g.add(mesh(cyl(0.45, 0.45, 1.2, 24), MAT.steel('#c9ccd0', 0.4), 0, 0, 0));
      g.add(mesh(new THREE.SphereGeometry(0.45, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), MAT.steel('#c9ccd0', 0.4), 0, 0.6, 0));
      for (let k = 0; k < 5; k++) { const r = mesh(new THREE.TorusGeometry(0.455, 0.015, 6, 32), MAT.darkSteel(), 0, -0.5 + k * 0.25, 0); r.rotation.x = Math.PI / 2; g.add(r); }
      break; }
    default: { // pocket dimension
      g.add(mesh(new THREE.TorusKnotGeometry(0.4, 0.12, 100, 12), MAT.glow('#9f6bff', 1.2)));
      g.add(mesh(new THREE.SphereGeometry(0.25, 24, 16), std({ color: '#000', roughness: 0.1, metalness: 1 })));
    }
  }
  return g;
}

// --------------------------------------------------------------- machines
export function buildMole(hat = true, scale = 1) {
  const g = new THREE.Group();
  const fur = std({ color: '#4a3a32', roughness: 0.95 });
  const pink = std({ color: '#e89a9a', roughness: 0.6 });
  const body = mesh(new THREE.SphereGeometry(0.5, 24, 18), fur); body.scale.set(1, 0.9, 1.15); g.add(body);
  const snout = mesh(new THREE.SphereGeometry(0.2, 16, 12), pink, 0, 0.0, 0.55); snout.scale.set(1.1, 0.8, 1); g.add(snout);
  g.add(mesh(new THREE.SphereGeometry(0.07, 10, 8), std({ color: '#c0566a', roughness: 0.4 }), 0, 0.04, 0.74));
  for (const s of [-1, 1]) {
    g.add(mesh(new THREE.SphereGeometry(0.045, 8, 6), std({ color: '#111', roughness: 0.2 }), s * 0.18, 0.2, 0.45));
    const paw = mesh(new THREE.SphereGeometry(0.17, 12, 8), pink, s * 0.42, -0.25, 0.35); paw.scale.set(1.2, 0.5, 1); paw.name = 'paw'; g.add(paw);
    for (let c = 0; c < 3; c++) { const cl = mesh(new THREE.ConeGeometry(0.03, 0.14, 6), std({ color: '#efe6d8', roughness: 0.4 }), s * 0.42 + (c - 1) * 0.08, -0.27, 0.52); cl.rotation.x = Math.PI / 2; g.add(cl); }
  }
  if (hat) {
    const hatM = MAT.paint('#f0b020', 0.35);
    g.add(mesh(new THREE.SphereGeometry(0.36, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), hatM, 0, 0.3, 0.05));
    const brim = mesh(cyl(0.44, 0.46, 0.04, 24), hatM, 0, 0.31, 0.08); g.add(brim);
    const lampBody = mesh(cyl(0.07, 0.07, 0.06, 12), MAT.darkSteel(), 0, 0.5, 0.36); lampBody.rotation.x = Math.PI / 2; g.add(lampBody);
    g.add(mesh(new THREE.CircleGeometry(0.05, 12), MAT.glow('#fff4c8', 3), 0, 0.5, 0.395));
  }
  g.scale.setScalar(scale);
  return g;
}

export function buildBucket() {
  const g = new THREE.Group();
  const b = mesh(lathe([[0, -0.3], [0.25, -0.3], [0.32, 0.3], [0.34, 0.31], [0.3, 0.31], [0.24, -0.26], [0, -0.26]], 24), MAT.rusty('#a9afb6'));
  g.add(b);
  const dirt = mesh(new THREE.CircleGeometry(0.3, 16), std({ color: '#4a3020', roughness: 1 }), 0, 0.24, 0); dirt.rotation.x = -Math.PI / 2; dirt.name = 'dirt'; g.add(dirt);
  const h = mesh(new THREE.TorusGeometry(0.33, 0.012, 6, 24, Math.PI), MAT.steel(), 0, 0.3, 0); g.add(h);
  const rope = mesh(cyl(0.018, 0.018, 30, 6), std({ color: '#b09060', roughness: 1 }), 0, 15.6, 0); g.add(rope);
  return g;
}

export function buildExcavator() {
  // Arm reaching down from above. Pivot at the top; bucket at the bottom.
  const g = new THREE.Group();
  const y = MAT.paint('#e5a51c', 0.4), dk = MAT.darkSteel('#2f3136'), st = MAT.steel('#c9cdd2', 0.25);
  const boom = new THREE.Group(); g.add(boom);
  boom.add(mesh(roundedBox(0.5, 5, 0.42, 0.08), y, 0, -2.5, 0));
  const piston = mesh(cyl(0.08, 0.08, 3, 10), st, 0.38, -2.2, 0); boom.add(piston);
  boom.add(mesh(cyl(0.12, 0.12, 1.6, 10), dk, 0.38, -1.0, 0));
  const stick = new THREE.Group(); stick.position.y = -5; boom.add(stick);
  const pin = mesh(cyl(0.2, 0.2, 0.6, 16), dk); pin.rotation.x = Math.PI / 2; stick.add(pin);
  stick.add(mesh(roundedBox(0.36, 2.6, 0.34, 0.07), y, 0, -1.3, 0));
  const bucket = new THREE.Group(); bucket.position.y = -2.6; stick.add(bucket);
  bucket.add(mesh(extrude([[0, 0], [0.7, -0.15], [0.85, -0.7], [0.4, -0.95], [0, -0.75]], 0.8, 0.03), dk));
  for (let i = 0; i < 4; i++) { const t = mesh(new THREE.ConeGeometry(0.06, 0.22, 6), st, 0.43, -1.05, -0.3 + i * 0.2); t.rotation.z = Math.PI * 0.85; bucket.add(t); }
  g.userData = { boom, stick, bucket };
  return g;
}

export function buildSteamDrill() {
  const g = new THREE.Group();
  const brass = MAT.brass(), dk = MAT.darkSteel('#2a2b2f'), cop = std({ color: '#b5653a', metalness: 1, roughness: 0.35 });
  const boiler = mesh(cyl(0.55, 0.55, 1.6, 24), cop, 0, 1.6, 0); g.add(boiler);
  for (let i = 0; i < 4; i++) { const r = mesh(new THREE.TorusGeometry(0.56, 0.03, 6, 32), brass, 0, 1.0 + i * 0.4, 0); r.rotation.x = Math.PI / 2; g.add(r); }
  g.add(mesh(new THREE.SphereGeometry(0.55, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), cop, 0, 2.4, 0));
  const chimney = mesh(cyl(0.12, 0.15, 0.8, 12), dk, 0.2, 2.9, 0.1); g.add(chimney);
  const gauge = mesh(cyl(0.12, 0.12, 0.05, 16), brass, 0, 1.9, 0.56); gauge.rotation.x = Math.PI / 2; g.add(gauge);
  g.add(mesh(new THREE.CircleGeometry(0.09, 16), std({ color: '#f2ead8', roughness: 0.5 }), 0, 1.9, 0.59));
  g.add(mesh(cyl(0.22, 0.3, 0.5, 16), dk, 0, 0.6, 0));
  const bit = new THREE.Group(); bit.position.y = 0.35; g.add(bit);
  const flute = twist(new THREE.BoxGeometry(0.42, 1.6, 0.08, 2, 60, 1), 3);
  flute.translate(0, -0.8, 0);
  bit.add(mesh(flute, MAT.steel('#9ca2a8', 0.3)));
  const bitTip = mesh(new THREE.ConeGeometry(0.2, 0.4, 12), MAT.steel('#9ca2a8', 0.3), 0, -1.8, 0); bitTip.rotation.x = Math.PI; bit.add(bitTip);
  g.userData = { bit, chimneyTop: new THREE.Vector3(0.2, 3.35, 0.1) };
  return g;
}

export function buildBorer() {
  const g = new THREE.Group();
  const dk = MAT.darkSteel('#3a3c40'), st = MAT.steel('#b5bac0', 0.3), y = MAT.paint('#3e6fa8', 0.45);
  const housing = mesh(cyl(1.7, 1.7, 0.6, 32), y, 0, 0, -0.3); housing.rotation.x = Math.PI / 2; g.add(housing);
  const wheel = new THREE.Group(); g.add(wheel);
  const disc = mesh(cyl(1.55, 1.55, 0.25, 32), dk); disc.rotation.x = Math.PI / 2; wheel.add(disc);
  for (let r = 0; r < 3; r++) {
    const n = 6 + r * 6, rad = 0.45 + r * 0.5;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r;
      const t = mesh(new THREE.ConeGeometry(0.09, 0.3, 6), st, Math.cos(a) * rad, Math.sin(a) * rad, 0.2);
      t.rotation.x = Math.PI / 2; wheel.add(t);
    }
  }
  for (let i = 0; i < 4; i++) { const sp = mesh(roundedBox(3, 0.18, 0.12, 0.04), MAT.paint('#e0b030', 0.5), 0, 0, 0.14); sp.rotation.z = (i / 4) * Math.PI; wheel.add(sp); }
  const hub = mesh(cyl(0.3, 0.3, 0.4, 16), st, 0, 0, 0.2); hub.rotation.x = Math.PI / 2; wheel.add(hub);
  g.userData = { wheel };
  return g;
}

export function buildLaser() {
  const g = new THREE.Group();
  const beamMat = new THREE.MeshBasicMaterial({ color: '#ff4a70', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
  const core = new THREE.Mesh(cyl(0.03, 0.03, 40, 8, true), new THREE.MeshBasicMaterial({ color: '#fff0f4', transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
  const beam = new THREE.Mesh(cyl(0.11, 0.11, 40, 12, true), beamMat);
  core.position.y = beam.position.y = 20;
  g.add(beam, core);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDotTexture(), color: '#ff5a7a', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  glow.scale.setScalar(1.4); glow.position.y = 0.1; g.add(glow);
  g.userData = { beam, core, glow };
  return g;
}

// --------------------------------------------------------------- boulders
export function buildBoulder(pal, radius = 1) {
  const geo = lumpy(new THREE.IcosahedronGeometry(radius, 3), 0.22, 1.8);
  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const base = new THREE.Color().setRGB(...pal.base), light = new THREE.Color().setRGB(...pal.light), dark = new THREE.Color().setRGB(...pal.dark);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const t = Math.random();
    c.copy(base).lerp(t > 0.5 ? light : dark, Math.abs(t - 0.5) * 1.2);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const m = new THREE.Mesh(geo, std({ vertexColors: true, roughness: 0.92, flatShading: true }));
  m.castShadow = true;
  return m;
}
// chip a boulder where it was hit: push nearby vertices inward
export function chipBoulder(m, localPoint, amount = 0.12) {
  const p = m.geometry.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const d = v.distanceTo(localPoint);
    if (d < 0.5) { v.multiplyScalar(1 - amount * (1 - d / 0.5) * rnd(0.6, 1.2)); p.setXYZ(i, v.x, v.y, v.z); }
  }
  p.needsUpdate = true;
  m.geometry.computeVertexNormals();
}

// --------------------------------------------------------------- debris rock (instanced)
export function debrisGeometry() {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * rnd(0.7, 1.2), p.getY(i) * rnd(0.6, 1.1), p.getZ(i) * rnd(0.7, 1.2));
  g.computeVertexNormals();
  return g;
}

// --------------------------------------------------------------- treasures
const TREASURE_SHAPES = {
  cap(c) { const g = new THREE.Group(); const m = std({ color: c, metalness: 0.7, roughness: 0.35 });
    g.add(mesh(cyl(0.5, 0.5, 0.12, 21), m)); const crimp = mesh(new THREE.TorusGeometry(0.5, 0.06, 6, 21), m, 0, -0.06, 0); crimp.rotation.x = Math.PI / 2; g.add(crimp);
    const liner = mesh(new THREE.CircleGeometry(0.32, 24), std({ color: '#f2e6c8', roughness: 0.6 }), 0, 0.065, 0); liner.rotation.x = -Math.PI / 2; g.add(liner);
    g.rotation.x = 0.9; return g; },
  marble(c) { const g = new THREE.Group();
    g.add(mesh(new THREE.SphereGeometry(0.5, 32, 24), new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.04, clearcoat: 1, transmission: 0.35, thickness: 0.5, emissive: c, emissiveIntensity: 0.12 })));
    const eye = mesh(new THREE.TorusKnotGeometry(0.18, 0.05, 60, 8, 2, 3), std({ color: '#fff', roughness: 0.3, emissive: '#fff', emissiveIntensity: 0.2 })); g.add(eye); return g; },
  teeth(c) { const g = new THREE.Group(); const gum = std({ color: '#d66a7a', roughness: 0.5 }), t = std({ color: c, roughness: 0.25 });
    const arc = mesh(new THREE.TorusGeometry(0.42, 0.14, 10, 24, Math.PI), gum); arc.rotation.x = -Math.PI / 2; g.add(arc);
    for (let i = 0; i < 9; i++) { const a = (i / 8) * Math.PI; g.add(mesh(roundedBox(0.12, 0.18, 0.1, 0.04), t, Math.cos(a) * 0.42, 0.14, -Math.sin(a) * 0.42)); }
    return g; },
  dino(c) { const g = new THREE.Group(); const m = std({ color: c, roughness: 0.3 });
    const torso = mesh(new THREE.CapsuleGeometry(0.22, 0.5, 6, 12), m); torso.rotation.z = Math.PI / 2; g.add(torso);
    const neck = mesh(new THREE.CapsuleGeometry(0.09, 0.45, 4, 8), m, -0.42, 0.28, 0); neck.rotation.z = 0.7; g.add(neck);
    g.add(mesh(new THREE.SphereGeometry(0.14, 12, 10), m, -0.6, 0.52, 0));
    const tail = mesh(new THREE.ConeGeometry(0.15, 0.6, 10), m, 0.6, 0.02, 0); tail.rotation.z = -Math.PI / 2 - 0.2; g.add(tail);
    for (const x of [-0.25, 0.25]) for (const z of [-0.12, 0.12]) g.add(mesh(cyl(0.06, 0.07, 0.3, 8), m, x, -0.3, z));
    return g; },
  key(c) { const g = new THREE.Group(); const m = MAT.rusty(c);
    g.add(mesh(new THREE.TorusGeometry(0.2, 0.06, 8, 20), m, 0, 0.4, 0));
    g.add(mesh(cyl(0.05, 0.05, 0.8, 8), m, 0, -0.1, 0));
    g.add(mesh(roundedBox(0.2, 0.08, 0.06, 0.02), m, 0.1, -0.4, 0)); g.add(mesh(roundedBox(0.14, 0.08, 0.06, 0.02), m, 0.08, -0.25, 0)); return g; },
  shard(c) { const g = new THREE.Group();
    g.add(mesh(extrude([[0, 0], [0.6, 0.1], [0.5, 0.55], [0.15, 0.7], [-0.2, 0.35]], 0.08, 0.02), std({ color: c, roughness: 0.7 }), -0.2, -0.35, 0));
    g.add(mesh(extrude([[0.05, 0.2], [0.45, 0.25], [0.38, 0.32], [0.08, 0.28]], 0.09, 0), std({ color: '#2a1a12', roughness: 0.7 }), -0.2, -0.35, 0.01)); return g; },
  arrow(c) { const g = new THREE.Group();
    g.add(mesh(extrude([[0, 0.7], [0.3, 0], [0.12, -0.05], [0.1, -0.3], [-0.1, -0.3], [-0.12, -0.05], [-0.3, 0]], 0.08, 0.03), std({ color: c, roughness: 0.3, metalness: 0.2, flatShading: true }), 0, -0.2, 0)); return g; },
  coin(c) { const g = new THREE.Group(); const m = std({ color: c, metalness: 1, roughness: 0.3 });
    g.add(mesh(cyl(0.45, 0.45, 0.08, 32), m)); const rim = mesh(new THREE.TorusGeometry(0.45, 0.04, 6, 32), m); rim.rotation.x = Math.PI / 2; g.add(rim);
    g.add(mesh(cyl(0.18, 0.18, 0.1, 6), m)); g.rotation.x = 1.2; return g; },
  idol(c) { const g = new THREE.Group(); const m = std({ color: c, metalness: c === '#e3b23c' ? 1 : 0, roughness: 0.35 });
    g.add(mesh(new THREE.CapsuleGeometry(0.25, 0.4, 6, 12), m, 0, -0.15, 0)); g.add(mesh(new THREE.SphereGeometry(0.22, 16, 12), m, 0, 0.42, 0));
    for (const s of [-1, 1]) { g.add(mesh(new THREE.SphereGeometry(0.04, 8, 6), std({ color: '#111' }), s * 0.08, 0.46, 0.19)); }
    g.add(mesh(cyl(0.3, 0.32, 0.12, 16), m, 0, -0.5, 0)); return g; },
  geode(c) { const g = new THREE.Group();
    const shell = mesh(lumpy(new THREE.SphereGeometry(0.5, 20, 14, 0, Math.PI), 0.08), std({ color: '#8a8276', roughness: 1, side: THREE.DoubleSide })); g.add(shell);
    for (let i = 0; i < 18; i++) { const a = rnd(0, Math.PI), b = rnd(-1.2, 1.2); const cr = mesh(new THREE.ConeGeometry(0.06, 0.22, 5), MAT.gem(c));
      cr.position.set(Math.cos(a) * 0.38 * Math.cos(b), Math.sin(b) * 0.38, Math.sin(a) * 0.38 * Math.cos(b)); cr.lookAt(0, 0, 0); cr.rotateX(-Math.PI / 2); g.add(cr); }
    g.rotation.y = Math.PI / 2; return g; },
  rock(c) { const g = new THREE.Group(); g.add(mesh(lumpy(new THREE.IcosahedronGeometry(0.5, 2), 0.25), std({ color: c, roughness: 0.6, metalness: 0.5, flatShading: true, emissive: c === '#ffb347' ? '#ff6a10' : '#000', emissiveIntensity: c === '#ffb347' ? 0.8 : 0 }))); return g; },
  lamp(c) { const g = new THREE.Group(); const m = MAT.brass();
    g.add(mesh(cyl(0.22, 0.28, 0.25, 16), m, 0, -0.3, 0)); g.add(mesh(cyl(0.18, 0.18, 0.35, 16, true), new THREE.MeshPhysicalMaterial({ color: '#fff', transmission: 0.8, roughness: 0.1, thickness: 0.1 }), 0, 0, 0));
    g.add(mesh(new THREE.SphereGeometry(0.08, 12, 8), MAT.glow('#ffcf6a', 4), 0, 0, 0)); g.add(mesh(new THREE.ConeGeometry(0.22, 0.2, 16), m, 0, 0.27, 0));
    g.add(mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 16), m, 0, 0.45, 0)); return g; },
  mug(c) { const g = new THREE.Group(); const m = MAT.steel(c, 0.4);
    g.add(mesh(cyl(0.3, 0.27, 0.7, 20), m)); const h = mesh(new THREE.TorusGeometry(0.18, 0.05, 8, 16, Math.PI), m, 0.3, 0, 0); h.rotation.z = -Math.PI / 2; g.add(h);
    for (const y of [-0.25, 0.25]) { const r = mesh(new THREE.TorusGeometry(0.3, 0.03, 6, 24), MAT.brass(), 0, y, 0); r.rotation.x = Math.PI / 2; g.add(r); }
    g.add(mesh(lumpy(new THREE.SphereGeometry(0.26, 12, 8), 0.15), std({ color: '#fff8e8', roughness: 0.9 }), 0, 0.36, 0)); return g; },
  shell(c) { const g = new THREE.Group(); const m = std({ color: c, roughness: 0.7 });
    for (let i = 0; i < 8; i++) { const s = mesh(new THREE.SphereGeometry(0.4 - Math.abs(i - 3.5) * 0.06, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), m, 0, 0, -0.42 + i * 0.12); s.scale.set(1, 0.4, 0.22); g.add(s); }
    const hd = mesh(new THREE.SphereGeometry(0.2, 12, 8), m, 0, 0, 0.55); hd.scale.set(1.4, 0.5, 0.8); g.add(hd); return g; },
  claw(c) { const g = new THREE.Group();
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, -0.5, 0), new THREE.Vector3(0.1, 0.2, 0), new THREE.Vector3(-0.35, 0.55, 0));
    const t = new THREE.TubeGeometry(curve, 20, 0.12, 10); const p = t.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = 1 - Math.floor(i / 11) / 20 * 0.95, cc = curve.getPoint(Math.floor(i / 11) / 20); p.setXYZ(i, cc.x + (p.getX(i) - cc.x) * k, cc.y + (p.getY(i) - cc.y) * k, cc.z + (p.getZ(i) - cc.z) * k); }
    t.computeVertexNormals(); g.add(mesh(t, std({ color: c, roughness: 0.4 }))); return g; },
  spiral(c) { const g = new THREE.Group(); const pts = [];
    for (let i = 0; i < 80; i++) { const a = i * 0.16, r = 0.05 + i * 0.0055; pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0)); }
    const curve = new THREE.CatmullRomCurve3(pts); const t = new THREE.TubeGeometry(curve, 120, 0.06, 8);
    const p = t.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.4 + Math.floor(i / 9) / 120 * 1.6, cc = curve.getPoint(Math.floor(i / 9) / 120); p.setXYZ(i, cc.x + (p.getX(i) - cc.x) * k, cc.y + (p.getY(i) - cc.y) * k, cc.z + (p.getZ(i) - cc.z) * k); }
    t.computeVertexNormals(); g.add(mesh(t, std({ color: c, roughness: 0.55, metalness: 0.2 }))); return g; },
  tooth(c) { const g = new THREE.Group(); const m = std({ color: c, roughness: 0.4 });
    const geo = new THREE.ConeGeometry(0.22, 0.95, 16, 8); const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + (y + 0.5) * (y + 0.5) * 0.25); } geo.computeVertexNormals();
    g.add(mesh(geo, m)); g.add(mesh(cyl(0.22, 0.18, 0.25, 16), std({ color: '#8a6a4a', roughness: 0.8 }), 0, -0.58, 0)); return g; },
  egg(c) { const g = new THREE.Group(); const e = mesh(new THREE.SphereGeometry(0.42, 28, 20), std({ color: c, roughness: 0.75 })); e.scale.set(1, 1.3, 1); g.add(e);
    if (c === '#7ad06a') g.add(mesh(new THREE.ConeGeometry(0.08, 0.3, 8), MAT.glow('#9dff7a', 1.5), 0, 0.6, 0)); return g; },
  crystal(c) { const g = new THREE.Group();
    for (let i = 0; i < 5; i++) { const h = rnd(0.5, 1); const cr = mesh(new THREE.CylinderGeometry(0, 0.12, 0.3, 6).translate(0, h / 2 + 0.15, 0).toNonIndexed(), MAT.gem(c));
      const body = mesh(cyl(0.12, 0.12, h, 6), MAT.gem(c), 0, h / 2, 0); const s = new THREE.Group(); s.add(body, cr); s.rotation.set(rnd(-0.5, 0.5), rnd(0, 6), rnd(-0.5, 0.5)); s.position.y = -0.4; g.add(s); }
    return g; },
  shroom(c) { const g = new THREE.Group(); g.add(mesh(cyl(0.1, 0.14, 0.6, 12), std({ color: '#e8f4ee', roughness: 0.6 }), 0, -0.2, 0));
    g.add(mesh(new THREE.SphereGeometry(0.42, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), MAT.glow(c, 1.4), 0, 0.08, 0));
    for (let i = 0; i < 6; i++) { const a = i; g.add(mesh(new THREE.SphereGeometry(0.05, 8, 6), MAT.glow('#ffffff', 2), Math.cos(a) * 0.25, 0.32, Math.sin(a) * 0.25)); } return g; },
  prism(c) { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.9, 3), new THREE.MeshPhysicalMaterial({ color: c, transmission: 0.9, roughness: 0.02, thickness: 0.6, ior: 1.6, flatShading: true, iridescence: 1 }))); return g; },
  tablet(c) { const g = new THREE.Group(); g.add(mesh(roundedBox(0.75, 0.95, 0.14, 0.06), std({ color: c, roughness: 0.8 })));
    for (let i = 0; i < 5; i++) g.add(mesh(roundedBox(rnd(0.3, 0.55), 0.05, 0.02, 0.01), std({ color: '#3a3428', roughness: 0.9 }), 0, 0.3 - i * 0.14, 0.075)); return g; },
  bird(c) { const g = new THREE.Group(); const m = std({ color: c, metalness: 1, roughness: 0.35 });
    const b = mesh(new THREE.SphereGeometry(0.3, 16, 12), m); b.scale.set(1.3, 1, 1); g.add(b); g.add(mesh(new THREE.SphereGeometry(0.18, 14, 10), m, -0.38, 0.22, 0));
    const beak = mesh(new THREE.ConeGeometry(0.06, 0.2, 8), MAT.brass(), -0.6, 0.2, 0); beak.rotation.z = Math.PI / 2; g.add(beak);
    for (const s of [-1, 1]) { const w = mesh(extrude([[0, 0], [0.5, 0.1], [0.3, 0.25]], 0.02, 0.01), m, 0, 0.05, s * 0.3); w.rotation.x = s * 0.6; g.add(w); }
    const key = mesh(new THREE.TorusGeometry(0.08, 0.02, 6, 12), MAT.brass(), 0.15, 0.4, 0); g.add(key); return g; },
  battery(c) { const g = new THREE.Group(); g.add(mesh(lathe([[0, -0.45], [0.25, -0.45], [0.3, -0.2], [0.3, 0.3], [0.15, 0.45], [0, 0.45]], 24), std({ color: c, roughness: 0.6 })));
    g.add(mesh(cyl(0.06, 0.06, 0.25, 10), MAT.brass(), 0, 0.55, 0)); const ring = mesh(new THREE.TorusGeometry(0.31, 0.03, 6, 24), MAT.glow('#7affd4', 1.2), 0, 0, 0); ring.rotation.x = Math.PI / 2; g.add(ring); return g; },
  mask(c) { const g = new THREE.Group(); const s = mesh(new THREE.SphereGeometry(0.5, 24, 16, 0, Math.PI), std({ color: c, roughness: 0.25, side: THREE.DoubleSide })); s.scale.set(0.8, 1, 0.45); g.add(s);
    for (const x of [-0.17, 0.17]) g.add(mesh(new THREE.SphereGeometry(0.08, 10, 8), std({ color: '#0a0a0a' }), x, 0.1, 0.2));
    g.add(mesh(roundedBox(0.25, 0.05, 0.05, 0.02), std({ color: '#0a0a0a' }), 0, -0.2, 0.2)); return g; },
  gem(c) { const g = new THREE.Group(); const o = mesh(new THREE.OctahedronGeometry(0.5, 0), MAT.gem(c)); o.scale.set(1, 1.25, 1); g.add(o); return g; },
  watch(c) { const g = new THREE.Group(); const geo = cyl(0.42, 0.42, 0.12, 32); const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i); if (x > 0.1) p.setY(i, p.getY(i) - (x - 0.1) * 0.9); } geo.computeVertexNormals();
    g.add(mesh(geo, std({ color: c, metalness: 1, roughness: 0.3 }))); const bow = mesh(new THREE.TorusGeometry(0.08, 0.025, 6, 12), MAT.brass(), -0.48, 0, 0); bow.rotation.y = Math.PI / 2; g.add(bow);
    g.rotation.x = 1.1; return g; },
};
export function buildTreasure(t) {
  const g = (TREASURE_SHAPES[t.shape] || TREASURE_SHAPES.rock)(t.color);
  return g;
}

// --------------------------------------------------------------- Mole King
export function buildMoleKing() {
  const g = new THREE.Group();
  const fur = std({ color: '#3d302a', roughness: 0.95 });
  const pink = std({ color: '#e89a9a', roughness: 0.55 });
  const belly = std({ color: '#7a5a48', roughness: 0.95 });
  const body = mesh(new THREE.SphereGeometry(2, 40, 28), fur); body.scale.set(1.15, 1, 1.1); g.add(body);
  const bel = mesh(new THREE.SphereGeometry(1.5, 32, 20), belly, 0, -0.35, 0.95); bel.scale.set(1, 0.95, 0.6); g.add(bel);
  const head = new THREE.Group(); head.position.set(0, 1.55, 0.9); g.add(head);
  head.add(mesh(new THREE.SphereGeometry(1.15, 32, 24), fur));
  const snout = mesh(new THREE.SphereGeometry(0.55, 24, 16), pink, 0, -0.15, 1.05); snout.scale.set(1.1, 0.85, 1); head.add(snout);
  head.add(mesh(new THREE.SphereGeometry(0.18, 16, 12), std({ color: '#b9455a', roughness: 0.35 }), 0, -0.05, 1.6));
  const eyes = [], lids = [];
  for (const s of [-1, 1]) {
    const e = mesh(new THREE.SphereGeometry(0.13, 16, 12), std({ color: '#0c0c0c', roughness: 0.1 }), s * 0.45, 0.35, 0.95); head.add(e); eyes.push(e);
    const lid = mesh(new THREE.SphereGeometry(0.15, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), fur, s * 0.45, 0.35, 0.96); lid.rotation.x = Math.PI / 2 + 0.2; head.add(lid); lids.push(lid);
    const whisk = new THREE.Group(); whisk.position.set(s * 0.45, -0.15, 1.3);
    for (let w = 0; w < 3; w++) { const wh = mesh(cyl(0.008, 0.008, 1.1, 4), std({ color: '#ddd' }), s * 0.45, (w - 1) * 0.08, 0); wh.rotation.z = Math.PI / 2 + (w - 1) * 0.15 * s; whisk.add(wh); }
    head.add(whisk);
    const paw = mesh(new THREE.SphereGeometry(0.55, 20, 14), pink, s * 1.7, -0.9, 1.1); paw.scale.set(1.2, 0.55, 1); g.add(paw);
    for (let c = 0; c < 4; c++) { const cl = mesh(new THREE.ConeGeometry(0.08, 0.45, 8), std({ color: '#f2e9da', roughness: 0.3 }), s * 1.7 + (c - 1.5) * 0.22, -0.95, 1.65); cl.rotation.x = Math.PI / 2; g.add(cl); }
  }
  const mouth = mesh(new THREE.TorusGeometry(0.18, 0.04, 8, 16, Math.PI), std({ color: '#2a1414' }), 0, -0.45, 1.25); mouth.rotation.z = Math.PI; head.add(mouth);
  const yawn = mesh(new THREE.SphereGeometry(0.28, 16, 12), std({ color: '#3a1010', roughness: 0.6 }), 0, -0.5, 1.2); yawn.scale.set(1, 0.05, 0.4); head.add(yawn);
  // tiny crown he keeps for himself
  const crownM = std({ color: '#e7b53c', metalness: 1, roughness: 0.25 });
  const crown = new THREE.Group(); crown.position.set(0, 1.05, 0.1); crown.rotation.x = -0.2; head.add(crown);
  crown.add(mesh(cyl(0.45, 0.5, 0.3, 24, true), crownM));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; crown.add(mesh(new THREE.ConeGeometry(0.1, 0.32, 6), crownM, Math.cos(a) * 0.46, 0.3, Math.sin(a) * 0.46)); crown.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), MAT.gem(['#d0304a', '#3a7ad0'][i % 2]), Math.cos(a) * 0.46, 0.5, Math.sin(a) * 0.46)); }
  g.userData = { head, eyes, lids, yawn, mouth, body };
  return g;
}

export function buildCrown() {
  const crownM = std({ color: '#f0c040', metalness: 1, roughness: 0.2 });
  const crown = new THREE.Group();
  crown.add(mesh(cyl(0.45, 0.5, 0.35, 32, true), crownM));
  crown.children[0].material.side = THREE.DoubleSide;
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; crown.add(mesh(new THREE.ConeGeometry(0.09, 0.35, 6), crownM, Math.cos(a) * 0.46, 0.33, Math.sin(a) * 0.46)); crown.add(mesh(new THREE.SphereGeometry(0.055, 10, 8), MAT.gem(['#e0304a', '#3a7ae0', '#30c070'][i % 3]), Math.cos(a) * 0.46, 0.54, Math.sin(a) * 0.46)); }
  const band = mesh(new THREE.TorusGeometry(0.49, 0.04, 8, 32), crownM, 0, -0.16, 0); band.rotation.x = Math.PI / 2; crown.add(band);
  return crown;
}

// smooth rounded stone for the walls (like pebbles poking out of the dirt)
export function stoneGeometry() {
  return lumpy(new THREE.IcosahedronGeometry(1, 3), 0.18, 1.6, 4.2);
}

// --------------------------------------------------------------- drop-off station
// A yellow hopper bin against the wall with a lift that hauls dirt up the shaft.
// Built facing +Z (the open side faces the player); origin on the floor at the bin's front.
export function buildStation() {
  const g = new THREE.Group();
  const yellow = MAT.paint('#e7a321', 0.45), dk = MAT.darkSteel('#3a3c41', 0.5), st = MAT.steel('#c4c8cd', 0.35);
  const black = MAT.paint('#222225', 0.6);
  const bin = new THREE.Group(); bin.position.set(0, 0, -0.9); g.add(bin);
  // hopper: wide top, narrow bottom (square lathe = 4 sides)
  const hop = mesh(lathe([[0.55, 0], [0.62, 0.05], [1.15, 1.1], [1.22, 1.16], [1.1, 1.16], [0.5, 0.12], [0, 0.12]], 4), yellow, 0, 0.9, 0);
  hop.rotation.y = Math.PI / 4; bin.add(hop);
  // dark steel rim around the top
  for (let i = 0; i < 4; i++) {
    const rim = mesh(roundedBox(1.86, 0.12, 0.12, 0.04), dk, 0, 2.07, 0);
    rim.rotation.y = i * Math.PI / 2; rim.translateZ(0.87); bin.add(rim);
  }
  for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) bin.add(mesh(cyl(0.07, 0.07, 1.0, 10), dk, x, 0.5, z));
  bin.add(mesh(roundedBox(1.0, 0.12, 1.0, 0.04), dk, 0, 0.95, 0));
  // dirt heap inside (grows while you deposit)
  const heap = mesh(new THREE.SphereGeometry(0.85, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), std({ color: '#7a4a2c', roughness: 1 }), 0, 1.25, 0);
  heap.scale.y = 0.2; heap.name = 'heap'; bin.add(heap);
  // lift: two rails up the wall + a cage that rides them
  const lift = new THREE.Group(); lift.position.set(0, 0, -2.0); g.add(lift);
  const rails = new THREE.Group(); lift.add(rails);
  for (const x of [-0.75, 0.75]) rails.add(mesh(new THREE.BoxGeometry(0.12, 40, 0.12), dk, x, 20, 0));
  for (let y = 0.6; y < 40; y += 1.6) rails.add(mesh(new THREE.BoxGeometry(1.5, 0.06, 0.06), dk, 0, y, -0.03));
  const cage = new THREE.Group(); cage.name = 'cage'; lift.add(cage);
  cage.add(mesh(roundedBox(1.25, 0.8, 0.9, 0.05), MAT.rusty('#9aa0a6'), 0, 0.4, 0.5));
  cage.add(mesh(new THREE.BoxGeometry(1.1, 0.1, 0.8), std({ color: '#6e4328', roughness: 1 }), 0, 0.78, 0.5));
  const rope = mesh(cyl(0.02, 0.02, 40, 6), std({ color: '#b09060', roughness: 1 }), 0, 20.8, 0.5); rope.name = 'rope'; cage.add(rope);
  // work lamp on a post
  const post = mesh(cyl(0.05, 0.06, 3.2, 10), dk, 1.35, 1.6, -0.6); g.add(post);
  const lampHead = mesh(cyl(0.16, 0.22, 0.25, 16), black, 1.35, 3.2, -0.45); lampHead.rotation.x = 0.7; g.add(lampHead);
  const bulb = mesh(new THREE.CircleGeometry(0.15, 16), MAT.glow('#fff1c8', 4), 1.35, 3.12, -0.33); bulb.rotation.x = Math.PI / 2 + 0.7; g.add(bulb);
  const light = new THREE.PointLight('#ffd9a0', 8, 9, 1.6); light.position.set(1.2, 2.9, 0.2); g.add(light);
  // sign
  const c = document.createElement('canvas'); c.width = 256; c.height = 96;
  const x = c.getContext('2d');
  x.fillStyle = '#f2ead8'; x.fillRect(0, 0, 256, 96);
  x.fillStyle = '#2a2420'; x.font = 'bold 44px Mont, Helvetica, Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('DROP-OFF', 128, 50);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const sign = mesh(new THREE.PlaneGeometry(1.4, 0.52), std({ map: tex, roughness: 0.7 }), -1.3, 2.35, -0.5); sign.rotation.y = 0.25; g.add(sign);
  const board = mesh(new THREE.BoxGeometry(1.5, 0.62, 0.05), dk, -1.3, 2.35, -0.53); board.rotation.y = 0.25; g.add(board);
  g.add(mesh(cyl(0.04, 0.04, 2.1, 8), dk, -1.3, 1.05, -0.56));
  g.userData = { heap, cage, light, rails, lift, rope };
  return g;
}
