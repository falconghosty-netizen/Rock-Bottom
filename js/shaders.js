// Stylized "sculpted clay" materials for the shaft walls and the dig floor.
// The surface shape AND colour both come from one baked scoop texture (uRock):
// hollows are dark, ridges are light -> soft, painterly, zero grain.
// Materials patch MeshStandardMaterial so they share PBR lighting, shadows, fog, tone mapping.
import * as THREE from 'three';

const UNIFORM_DECL = /* glsl */`
uniform float uTime, uLayerH, uDepth, uScroll, uR, uFlash, uTile, uWallH, uBowl;
uniform sampler2D uRock;
uniform vec3 uBase[8], uDark[8], uLight[8], uAcc[8];
uniform float uGlow[8], uRough[8], uMetal[8];
`;
const VARY = 'varying vec2 vUv; varying float vY; varying float vRad; varying float vCrater; varying float vLayerD; varying float vH;';

const ROCK_FRAG = /* glsl */`
struct Rock { vec3 albedo; vec3 emissive; float rough; float metal; float bump; };
vec3 palMix(vec3 a[8], float lf){ int i = int(clamp(floor(lf), 0.0, 7.0)); int j = int(clamp(floor(lf) + 1.0, 0.0, 7.0)); return mix(a[i], a[j], smoothstep(0.9, 1.0, fract(lf))); }
Rock rock(vec2 uv, float lf, float hBig){
  Rock r;
  int li = int(clamp(floor(lf + 0.05), 0.0, 7.0));
  vec4 t = texture2D(uRock, uv);
  vec4 t2 = texture2D(uRock, uv*0.31 + vec2(0.13, 0.71));
  float h = clamp(hBig*0.78 + t.b*0.22, 0.0, 1.0);
  vec3 dark = palMix(uDark, lf), base = palMix(uBase, lf), light = palMix(uLight, lf);
  vec3 col = mix(dark, base, smoothstep(0.02, 0.5, h));
  col = mix(col, light, smoothstep(0.55, 1.0, h) * 0.85);
  col *= 0.93 + t2.g*0.14;                       // broad, soft tint drift
  col *= mix(0.76, 1.0, smoothstep(0.0, 0.42, h)); // baked cavity occlusion
  r.rough = uRough[li] * mix(0.85, 1.05, h);
  r.metal = uMetal[li];
  r.bump = t.b;
  r.emissive = vec3(0.0);
  float pulse = 0.82 + 0.18*sin(uTime*1.4 + t2.g*14.0);
  if (li == 4) { // crystal: thin glowing veins
    float v = smoothstep(0.965, 0.995, t2.a);
    r.emissive += uAcc[li] * v * pulse * 1.2;
  }
  if (li == 6) { // magma: lava pooled in the deepest hollows
    float lava = smoothstep(0.16, 0.02, h);
    r.emissive += vec3(1.0, 0.3, 0.05) * lava * 2.6 * pulse;
    col = mix(col, vec3(0.05), smoothstep(0.3, 0.12, h) * 0.6);
  }
  if (li == 7) { // core: molten gold in the hollows
    float glow = smoothstep(0.2, 0.0, h);
    r.emissive += vec3(1.0, 0.62, 0.22) * glow * 2.2 * pulse;
  }
  r.albedo = col;
  return r;
}
vec3 bumpN(vec3 N, vec3 pos, float h, float scale){
  vec3 dpx = dFdx(pos), dpy = dFdy(pos);
  float dhx = dFdx(h), dhy = dFdy(h);
  vec3 r1 = cross(dpy, N), r2 = cross(N, dpx);
  float det = dot(dpx, r1);
  vec3 grad = sign(det) * (dhx*r1 + dhy*r2);
  return normalize(abs(det)*N - scale*grad);
}
`;

function patch(material, uniforms, { vertHead, normalVert, beginVert, fragMain, bump }) {
  material.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${UNIFORM_DECL}\n${VARY}\n${vertHead}`)
      .replace('#include <beginnormal_vertex>', normalVert)
      .replace('#include <begin_vertex>', beginVert);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${UNIFORM_DECL}\n${VARY}\n${ROCK_FRAG}`)
      .replace('#include <map_fragment>', fragMain)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = rk.rough;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = rk.metal;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n normal = bumpN(normal, -vViewPosition, rk.bump, ${bump.toFixed(3)});`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += rk.emissive; diffuseColor.rgb += rk.albedo * uFlash;');
  };
  material.customProgramCacheKey = () => 'clay-' + (vertHead.length + fragMain.length);
}

export function wallMaterial(uniforms) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0, side: THREE.BackSide });
  patch(m, uniforms, {
    vertHead: /* glsl */`
      float hAt(vec2 uv){ vec4 t = textureLod(uRock, uv, 1.0); return t.r*0.8 + t.b*0.2 + (t.g - 0.5)*0.5; }
      vec3 wallP(float ang, float y, out float h){
        vec2 uv = vec2(ang*uR, uScroll - y) / uTile;
        h = hAt(uv);
        float r = uR + (0.55 - h)*0.8 - smoothstep(1.5, 0.0, y)*0.45;
        return vec3(cos(ang)*r, y, sin(ang)*r);
      }`,
    normalVert: /* glsl */`
      float wAng = atan(position.z, position.x);
      float wY = position.y * uWallH;
      float wh, dummy;
      vec3 wP = wallP(wAng, wY, wh);
      vec3 wPa = wallP(wAng + 0.012, wY, dummy);
      vec3 wPy = wallP(wAng, wY + 0.05, dummy);
      vec3 objectNormal = normalize(cross(wPy - wP, wPa - wP));
      #ifdef USE_TANGENT
        vec3 objectTangent = vec3(tangent.xyz);
      #endif`,
    beginVert: /* glsl */`
      vec3 transformed = wP;
      vUv = vec2(wAng*uR, uScroll - wY) / uTile;
      vY = wY; vRad = uR; vCrater = 0.0; vH = wh;
      vLayerD = uDepth * uLayerH - wY;`,
    fragMain: /* glsl */`
      float wave = (texture2D(uRock, vUv*vec2(0.5, 0.0)).g - 0.5) * 1.6;
      float lf = (vLayerD + wave) / uLayerH;
      float hBig = texture2D(uRock, vUv).r;
      Rock rk = rock(vUv, lf, hBig);
      rk.albedo *= mix(0.6, 1.0, smoothstep(0.0, 1.8, vY));   // contact shadow at the floor
      diffuseColor.rgb *= rk.albedo;`,
    bump: 0.18,
  });
  return m;
}

export function floorMaterial(uniforms) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 });
  patch(m, uniforms, {
    vertHead: /* glsl */`
      uniform vec4 uCraters[10];
      vec2 morphO(float k){ return vec2(k*0.437, k*0.291); }
      float hBigAt(vec2 xz){
        float k = uScroll / 2.2; float k0 = floor(k); float t = smoothstep(0.1, 0.9, fract(k));
        vec2 uv = xz / (uTile*1.4);
        vec4 a = textureLod(uRock, uv + morphO(k0), 1.0), b = textureLod(uRock, uv + morphO(k0 + 1.0), 1.0);
        return mix(a.r*0.8 + a.b*0.2, b.r*0.8 + b.b*0.2, t);
      }
      float craterAmt(vec2 xz){
        float a = 0.0;
        for (int i=0;i<10;i++){ vec4 c = uCraters[i]; if (c.w <= 0.0) continue; float d = distance(xz, c.xy)/c.z; a += max(0.0, 1.0 - d*d) * c.w; }
        return a;
      }
      float floorH(vec2 xz, out float hb){
        float rr = length(xz);
        hb = hBigAt(xz);
        float y = (hb - 0.5) * 0.5;
        y += pow(smoothstep(uR-2.6, uR+0.2, rr), 1.7) * 1.2 * uBowl; // bowl up into the walls
        for (int i=0;i<10;i++){
          vec4 c = uCraters[i];
          if (c.w <= 0.0) continue;
          float d = distance(xz, c.xy) / c.z;
          float bowl = max(0.0, 1.0 - d*d);
          float lip = exp(-pow((d - 1.05)/0.3, 2.0));
          y += c.w * (-bowl*bowl*0.45 + lip*0.1);
        }
        return y;
      }`,
    normalVert: /* glsl */`
      vec2 fXZ = position.xz;
      float fhb, dm;
      float fH = floorH(fXZ, fhb);
      float fHx = floorH(fXZ + vec2(0.04, 0.0), dm);
      float fHz = floorH(fXZ + vec2(0.0, 0.04), dm);
      vec3 objectNormal = normalize(vec3(-(fHx - fH)/0.04, 1.0, -(fHz - fH)/0.04));
      #ifdef USE_TANGENT
        vec3 objectTangent = vec3(tangent.xyz);
      #endif`,
    beginVert: /* glsl */`
      vec3 transformed = vec3(position.x, fH, position.z);
      vUv = fXZ / (uTile*1.4); vY = fH; vRad = length(fXZ); vCrater = craterAmt(fXZ); vLayerD = 0.0; vH = fhb;`,
    fragMain: /* glsl */`
      float k = uScroll / 2.2; float k0 = floor(k); float tt = smoothstep(0.1, 0.9, fract(k));
      vec2 o0 = vec2(k0*0.437, k0*0.291), o1 = vec2((k0+1.0)*0.437, (k0+1.0)*0.291);
      float hBig = mix(texture2D(uRock, vUv + o0).r, texture2D(uRock, vUv + o1).r, tt);
      vec2 uvd = mix(vUv + o0, vUv + o1, step(0.5, tt));
      Rock rk = rock(uvd, uDepth, hBig);
      rk.albedo *= 1.0 - clamp(vCrater, 0.0, 1.0)*0.18;   // fresh dig marks: darker, damp
      rk.rough *= 1.0 - clamp(vCrater, 0.0, 1.0)*0.2;
      rk.albedo *= mix(1.0, 0.7, smoothstep(uR-2.4, uR, vRad));
      diffuseColor.rgb *= rk.albedo;`,
    bump: 0.12,
  });
  return m;
}

export const chamberShader = {
  vertex: /* glsl */`
  varying vec3 vWorld; varying vec3 vN;
  void main(){ vec4 w = modelMatrix*vec4(position,1.); vWorld=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragment: /* glsl */`
  uniform float uTime, uWake;
  uniform sampler2D uNoise;
  varying vec3 vWorld; varying vec3 vN;
  void main(){
    vec2 uv = vec2(atan(vWorld.z, vWorld.x)*1.2, vWorld.y*0.12);
    vec4 n = texture2D(uNoise, uv);
    float h = n.r*0.8 + n.b*0.2;
    vec3 base = mix(vec3(0.2,0.08,0.035), vec3(0.55,0.27,0.11), smoothstep(0.1, 0.9, h));
    float lava = smoothstep(0.18, 0.02, h);
    vec3 hot = vec3(1.0,0.5,0.15) * lava * (2.0 + uWake) * (0.85 + 0.15*sin(uTime*1.5 + n.g*10.0));
    vec3 col = base*(0.6+0.4*max(-vN.y,0.0)) + hot;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
};

export const sparkShader = {
  vertex: /* glsl */`
  attribute float aSize; attribute vec4 aColor; varying vec4 vColor;
  void main(){ vColor = aColor; vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = aSize * (300.0 / -mv.z); gl_Position = projectionMatrix*mv; }`,
  fragment: /* glsl */`
  varying vec4 vColor;
  void main(){ vec2 c = gl_PointCoord-0.5; float d = length(c); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vColor.rgb*a*vColor.a, a*vColor.a); }`,
};

// Lawn: soft colour patches + mowing stripes, trampled dirt ring near the hole.
export function lawnMaterial(noise, holeR) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uNoise = { value: noise };
    sh.uniforms.uHoleR = { value: holeR };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLawn;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLawn = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uNoise; uniform float uHoleR; varying vec3 vLawn;')
      .replace('#include <map_fragment>', /* glsl */`
        vec2 xz = vLawn.xy;
        float a = texture2D(uNoise, xz*0.012).r;
        float b = texture2D(uNoise, xz*0.05 + 0.3).g;
        vec3 g1 = vec3(0.17, 0.30, 0.06), g2 = vec3(0.30, 0.44, 0.09), dry = vec3(0.48, 0.47, 0.18);
        vec3 col = mix(g1, g2, smoothstep(0.25, 0.75, a));
        col = mix(col, dry, smoothstep(0.62, 0.9, b) * 0.35);
        float stripe = smoothstep(-0.25, 0.25, sin(xz.x*0.32));
        col *= 0.95 + stripe*0.08;
        float rr = length(xz);
        col = mix(col*0.78, col, smoothstep(uHoleR - 0.4, uHoleR + 1.2, rr)); // slightly trampled near the hole
        diffuseColor.rgb *= col;`);
  };
  return m;
}

export const skyShader = {
  vertex: /* glsl */`varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; }`,
  fragment: /* glsl */`
  uniform vec3 uSun; varying vec3 vDir;
  void main(){
    float y = clamp(vDir.y, 0.0, 1.0);
    vec3 zen = vec3(0.24, 0.52, 0.86), hor = vec3(0.80, 0.90, 0.96);
    vec3 col = mix(hor, zen, pow(y, 0.55));
    float s = max(dot(vDir, normalize(uSun)), 0.0);
    col += vec3(1.0, 0.92, 0.75) * (pow(s, 600.0)*3.0 + pow(s, 12.0)*0.18);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
};
