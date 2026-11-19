// Tileable value-noise texture, generated once at startup.
// R: large soft blobs  G: medium detail  B: fine grain  A: ridged (cracks / veins)
import * as THREE from 'three';

function lattice(P, seed) {
  const a = new Float32Array(P * P);
  let s = seed >>> 0;
  for (let i = 0; i < a.length; i++) { s = (s * 1664525 + 1013904223) >>> 0; a[i] = s / 4294967296; }
  return a;
}
const fade = t => t * t * t * (t * (t * 6 - 15) + 10);

export function makeNoiseTexture(N = 512) {
  const chans = [
    { base: 4,  oct: 5, ridged: false },
    { base: 12, oct: 4, ridged: false },
    { base: 48, oct: 3, ridged: false },
    { base: 6,  oct: 4, ridged: true },
  ];
  const out = new Uint8Array(N * N * 4);
  const tmp = new Float32Array(N * N);
  chans.forEach((ch, ci) => {
    tmp.fill(0);
    let amp = 1;
    for (let o = 0; o < ch.oct; o++) {
      const P = ch.base << o;
      const L = lattice(P, 1234 + ci * 97 + o * 13);
      const scale = P / N;
      for (let y = 0; y < N; y++) {
        const fy = y * scale, y0 = Math.floor(fy), ty = fade(fy - y0);
        const r0 = (y0 % P) * P, r1 = ((y0 + 1) % P) * P;
        for (let x = 0; x < N; x++) {
          const fx = x * scale, x0 = Math.floor(fx), tx = fade(fx - x0);
          const c0 = x0 % P, c1 = (x0 + 1) % P;
          const a = L[r0 + c0], b = L[r0 + c1], c = L[r1 + c0], d = L[r1 + c1];
          let v = (a + (b - a) * tx) + ((c + (d - c) * tx) - (a + (b - a) * tx)) * ty;
          if (ch.ridged) v = 1 - Math.abs(v * 2 - 1);
          tmp[y * N + x] += v * amp;
        }
      }
      amp *= 0.5;
    }
    let mn = Infinity, mx = -Infinity;
    for (let i = 0; i < tmp.length; i++) { if (tmp[i] < mn) mn = tmp[i]; if (tmp[i] > mx) mx = tmp[i]; }
    const k = 255 / (mx - mn);
    for (let i = 0; i < tmp.length; i++) out[i * 4 + ci] = (tmp[i] - mn) * k;
  });
  const tex = new THREE.DataTexture(out, N, N, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// "Scooped clay" texture: soft concave bowls with rounded ridges, tileable.
// R: big scoops (0 = deep hollow, 1 = ridge)   G: broad tint variation
// B: small scoops (detail)                      A: ridged veins (lava / crystal)
function scoops(N, cells, seed, k, out, ch) {
  let s = seed >>> 0;
  const rand = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const px = new Float32Array(cells * cells), py = new Float32Array(cells * cells);
  for (let i = 0; i < cells * cells; i++) { px[i] = 0.05 + rand() * 0.9; py[i] = 0.05 + rand() * 0.9; }
  const tmp = new Float32Array(N * N);
  let mx = 0;
  for (let y = 0; y < N; y++) {
    const fy = y / N * cells, cy = Math.floor(fy);
    for (let x = 0; x < N; x++) {
      const fx = x / N * cells, cx = Math.floor(fx);
      let sum = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const gx = cx + i, gy = cy + j;
        const wx = ((gx % cells) + cells) % cells, wy = ((gy % cells) + cells) % cells;
        const dx = gx + px[wy * cells + wx] - fx, dy = gy + py[wy * cells + wx] - fy;
        const d = Math.sqrt(dx * dx + dy * dy);
        sum += Math.exp(-d / k);
      }
      const F = -k * Math.log(sum); // smooth-min distance -> rounded ridges
      tmp[y * N + x] = F; if (F > mx) mx = F;
    }
  }
  let mn = Infinity; for (let i = 0; i < tmp.length; i++) if (tmp[i] < mn) mn = tmp[i];
  for (let i = 0; i < tmp.length; i++) {
    const v = (tmp[i] - mn) / (mx - mn);
    out[i * 4 + ch] = Math.min(255, Math.pow(v, 1.35) * 255 * 1.08); // parabolic-ish bowls
  }
}
function valueNoiseInto(N, base, oct, seed, out, ch, ridged) {
  const tmp = new Float32Array(N * N);
  let amp = 1;
  for (let o = 0; o < oct; o++) {
    const P = base << o, L = lattice(P, seed + o * 31), sc = P / N;
    for (let y = 0; y < N; y++) {
      const fy = y * sc, y0 = Math.floor(fy), ty = fade(fy - y0), r0 = (y0 % P) * P, r1 = ((y0 + 1) % P) * P;
      for (let x = 0; x < N; x++) {
        const fx = x * sc, x0 = Math.floor(fx), tx = fade(fx - x0), c0 = x0 % P, c1 = (x0 + 1) % P;
        const a = L[r0 + c0], b = L[r0 + c1], c = L[r1 + c0], d = L[r1 + c1];
        let v = (a + (b - a) * tx) + ((c + (d - c) * tx) - (a + (b - a) * tx)) * ty;
        if (ridged) v = 1 - Math.abs(v * 2 - 1);
        tmp[y * N + x] += v * amp;
      }
    }
    amp *= 0.5;
  }
  let mn = Infinity, mx = -Infinity;
  for (const v of tmp) { if (v < mn) mn = v; if (v > mx) mx = v; }
  for (let i = 0; i < tmp.length; i++) out[i * 4 + ch] = (tmp[i] - mn) / (mx - mn) * 255;
}
export function makeRockTexture(N = 512) {
  const out = new Uint8Array(N * N * 4);
  // big scoops at two sizes, carved together -> irregular cells, no honeycomb
  const a = new Uint8Array(N * N * 4), b = new Uint8Array(N * N * 4);
  scoops(N, 5, 777, 0.08, a, 0);
  scoops(N, 9, 4141, 0.07, b, 0);
  for (let i = 0; i < N * N; i++) {
    const ha = a[i * 4] / 255, hb = b[i * 4] / 255 * 0.85 + 0.15;
    const k = 0.12, h = -k * Math.log(Math.exp(-ha / k) + Math.exp(-hb / k)); // smooth min
    out[i * 4] = Math.max(0, Math.min(255, (h + 0.06) * 1.25 * 255));
  }
  valueNoiseInto(N, 3, 3, 4242, out, 1, false);
  scoops(N, 17, 999, 0.06, out, 2);
  valueNoiseInto(N, 5, 3, 9191, out, 3, true);
  const tex = new THREE.DataTexture(out, N, N, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}
