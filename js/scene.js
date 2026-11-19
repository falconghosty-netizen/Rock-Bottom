// Rendering: the shaft, floor, lighting, particles, machines, tool viewmodel, boulders, finale.
import * as THREE from 'three';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';
import { LAYERS, TOOLS } from './data.js';
import { wallMaterial, floorMaterial, chamberShader, sparkShader } from './shaders.js';
import { makeNoiseTexture, makeRockTexture } from './noisetex.js';
import { buildYard } from './yard.js';
import * as Models from './models.js';

const R = 4.6;          // shaft radius
const LAYER_H = 7;      // wall height per layer (visual); you see the last layer's band rise up the wall
const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - t, 3);

function srgbVec(rgb) { const c = new THREE.Color().setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace); return new THREE.Vector3(c.r, c.g, c.b); }

const TILE = Math.PI * 2 * R / 4;   // scoop texture repeats 4x around the shaft (seamless)
// camera: standing at the rim looking into the hole (surface) -> inside the shaft (deep)
const CAM_SURF = { pos: [0, 5.3, 3.9], look: [0, 0.0, -3.3] };
const CAM_DEEP = { pos: [0, 4.6, 2.7], look: [0, 0.1, -1.4] };
const CAMS = { first: { pos: CAM_DEEP.pos, look: CAM_DEEP.look, hfov: 62 } };

export class Scene {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.reduceFx = !!opts.reduceFx;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.reduceFx ? 1.25 : 2));
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 0.92;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0b0907');
    this.scene.fog = new THREE.FogExp2('#0b0907', 0.012);
    const pmrem = new THREE.PMREMGenerator(r);
    this.envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envTex;
    this.scene.environmentIntensity = 0.3;
    this.noise = makeNoiseTexture(256);
    this.rockTex = makeRockTexture(512);
    this.ground = 0.6;   // height of the lawn above the dig floor

    this.cam = CAMS.first;
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.05, 200);
    this.camBase = new THREE.Vector3(...this.cam.pos);
    this.camLook = new THREE.Vector3(...this.cam.look);
    this.camera.position.copy(this.camBase);
    this.camera.lookAt(this.camLook);
    this.scene.add(this.camera);

    this.time = 0;
    this.scroll = 0;
    this.scrollVel = 0;
    this.shake = 0;
    this.flash = 0;
    this.depthV = 0;
    this.layer = 0;
    this.sky = 1;

    this.buildLights();
    this.buildShaft();
    this.buildParticles();
    this.machines = {};
    this.boulders = new Map();
    this.treasureFx = [];
    this.toolSwingT = 1;
    this.raycaster = new THREE.Raycaster();
    this.setTool(0);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  // ------------------------------------------------------------- setup
  buildLights() {
    this.hemi = new THREE.HemisphereLight('#c8d4e4', '#3a2a1e', 1.0);
    this.scene.add(this.hemi);
    // Main light: daylight through the opening near the surface, floodlights deeper down.
    const sun = this.sun = new THREE.DirectionalLight('#fff1dc', 2.4);
    sun.position.set(-3.2, 16, 1.5);
    sun.target.position.set(0.4, 0, -0.8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(this.reduceFx ? 512 : 1024, this.reduceFx ? 512 : 1024);
    const sc = sun.shadow.camera; sc.left = -6; sc.right = 6; sc.top = 6; sc.bottom = -6; sc.near = 4; sc.far = 30;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
    this.scene.add(sun, sun.target);
    // Headlamp: soft warm fill that follows the camera.
    this.lamp = new THREE.PointLight('#ffd9ad', 9, 0, 1.6);
    this.lamp.position.set(0.4, 0.3, 0.2);
    this.camera.add(this.lamp);
    // Coloured bounce for glowing layers.
    this.fill = new THREE.PointLight('#ff6a20', 0, 0, 1.4);
    this.fill.position.set(0, 1.2, -1);
    this.scene.add(this.fill);
  }

  buildShaft() {
    const pal = (k) => LAYERS.map(L => srgbVec(L.pal[k]));
    this.uniforms = {
      uTime: { value: 0 }, uLayerH: { value: LAYER_H }, uDepth: { value: 0 }, uScroll: { value: 0 },
      uR: { value: R }, uFlash: { value: 0 }, uRock: { value: this.rockTex }, uTile: { value: TILE },
      uWallH: { value: 1 }, uBowl: { value: 0 },
      uBase: { value: pal('base') }, uDark: { value: pal('dark') }, uLight: { value: pal('light') }, uAcc: { value: pal('acc') },
      uGlow: { value: LAYERS.map(L => L.pal.glow) }, uRough: { value: LAYERS.map(L => L.pal.rough) }, uMetal: { value: LAYERS.map(L => L.pal.metal) },
    };
    const wallGeo = new THREE.CylinderGeometry(R, R, 1, 256, 150, true);
    wallGeo.translate(0, 0.5, 0);
    this.wall = new THREE.Mesh(wallGeo, wallMaterial(this.uniforms));
    this.wall.receiveShadow = true;
    this.wall.frustumCulled = false;
    this.scene.add(this.wall);
    // invisible stand-in that lets the hole walls cast shadows into the hole
    this.wallShadow = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.1, R + 0.1, 1, 48, 1, true).translate(0, 0.5, 0),
      new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide }));
    this.wallShadow.castShadow = true;
    this.scene.add(this.wallShadow);

    this.craters = Array.from({ length: 10 }, () => new THREE.Vector4(0, 0, 1, 0));
    this.craterIdx = 0;
    const fu = Object.assign({}, this.uniforms, { uCraters: { value: this.craters } });
    const floorGeo = new THREE.PlaneGeometry(R * 2.3, R * 2.3, 200, 200);
    floorGeo.rotateX(-Math.PI / 2);
    this.floor = new THREE.Mesh(floorGeo, floorMaterial(fu));
    this.floor.receiveShadow = true;
    this.floor.frustumCulled = false;
    this.scene.add(this.floor);
    this.floorProxy = new THREE.Mesh(new THREE.CircleGeometry(R, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ visible: false }));
    this.scene.add(this.floorProxy);

    // a few smooth stones embedded in the walls, revealed as you dig and scrolling up
    const stoneGeo = Models.stoneGeometry();
    this.stones = new THREE.InstancedMesh(stoneGeo, new THREE.MeshStandardMaterial({ roughness: 0.7 }), 9);
    this.stones.castShadow = this.stones.receiveShadow = true;
    this.stones.frustumCulled = false;
    this.stoneData = [];
    for (let i = 0; i < 9; i++) this.stoneData.push(this.newStone(rnd(0.2, 10)));
    this.stones.setColorAt(0, new THREE.Color());
    this.scene.add(this.stones);

    this.yard = buildYard(this.noise, R, this.reduceFx);
    this.scene.add(this.yard);
  }

  newStone(depthBelow) {
    // depthBelow: how far under the current scroll position the stone sits
    return { a: rnd(-Math.PI, Math.PI), d: this.scroll + depthBelow, s: rnd(0.22, 0.45), rot: new THREE.Euler(rnd(0, 6), rnd(0, 6), rnd(0, 6)), tint: rnd(0.85, 1.1) };
  }

  updateStones() {
    const m4 = this._m4, q = this._q, s3 = this._s;
    const pal = this.layerPal();
    const top = Math.min(this.ground, 14);
    for (let i = 0; i < this.stoneData.length; i++) {
      let st = this.stoneData[i];
      let y = this.scroll - st.d;           // height above the floor
      if (y > top + 0.5) { st = this.stoneData[i] = this.newStone(rnd(0.4, 6)); y = this.scroll - st.d; }
      const r = R - 0.15;
      q.setFromEuler(st.rot); s3.setScalar(st.s);
      m4.compose(new THREE.Vector3(Math.cos(st.a) * r, y, Math.sin(st.a) * r), q, s3);
      this.stones.setMatrixAt(i, m4);
      const c = this.layer >= 6 ? [0.2, 0.18, 0.17] : this.layer === 4 ? [0.55, 0.62, 0.8] : [0.82, 0.8, 0.76];
      this._c.setRGB(c[0] * st.tint, c[1] * st.tint, c[2] * st.tint, THREE.SRGBColorSpace);
      this.stones.setColorAt(i, this._c);
    }
    this.stones.instanceMatrix.needsUpdate = true;
    this.stones.instanceColor.needsUpdate = true;
  }

  buildParticles() {
    const MAXD = 220;
    this.debrisMesh = new THREE.InstancedMesh(Models.debrisGeometry(), new THREE.MeshStandardMaterial({ roughness: 0.92 }), MAXD);
    this.debrisMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.debrisMesh.setColorAt(0, new THREE.Color());
    this.debrisMesh.castShadow = true;
    this.debrisMesh.frustumCulled = false;
    this.scene.add(this.debrisMesh);
    this.debris = Array.from({ length: MAXD }, () => ({ life: 0, max: 1, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), s: 0.1 }));
    this.debrisNext = 0;
    this._m4 = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._c = new THREE.Color();
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < MAXD; i++) this.debrisMesh.setMatrixAt(i, zero);

    const MAXS = 200;
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXS * 3), 3).setUsage(THREE.DynamicDrawUsage));
    sg.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(MAXS * 4), 4).setUsage(THREE.DynamicDrawUsage));
    sg.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(MAXS), 1).setUsage(THREE.DynamicDrawUsage));
    this.sparkPts = new THREE.Points(sg, new THREE.ShaderMaterial({ vertexShader: sparkShader.vertex, fragmentShader: sparkShader.fragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.sparkPts.frustumCulled = false;
    this.scene.add(this.sparkPts);
    this.sparks = Array.from({ length: MAXS }, () => ({ life: 0, max: 1, p: new THREE.Vector3(), v: new THREE.Vector3(), c: new THREE.Color(), size: 1, grav: 1 }));
    this.sparkNext = 0;

    this.puffTex = Models.puffTexture();
    this.puffs = [];
    for (let i = 0; i < 24; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.puffTex, transparent: true, depthWrite: false, opacity: 0, fog: true }));
      s.visible = false; this.scene.add(s);
      this.puffs.push({ s, life: 0, max: 1, v: new THREE.Vector3(), grow: 1, peak: 0.5 });
    }
    this.puffNext = 0;

    // dust hanging in the air, catching the light
    const N = this.reduceFx ? 40 : 90;
    const mg = new THREE.BufferGeometry();
    const mp = new Float32Array(N * 3);
    this.moteSeed = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) {
      const a = rnd(0, Math.PI * 2), rr = Math.sqrt(Math.random()) * (R - 0.4);
      mp.set([Math.cos(a) * rr, rnd(0.3, 6), Math.sin(a) * rr], i * 3);
      this.moteSeed.set([rnd(0, 100), rnd(0.2, 0.6), rnd(0.015, 0.04), 0], i * 4);
    }
    mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
    this.motes = new THREE.Points(mg, new THREE.PointsMaterial({ size: 0.035, map: Models.softDotTexture(), transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, color: '#fff0dc' }));
    this.motes.frustumCulled = false;
    this.scene.add(this.motes);
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    const hfov = this.cam.hfov * Math.PI / 180;
    const vfov = 2 * Math.atan(Math.tan(hfov / 2) / this.camera.aspect);
    this.camera.fov = Math.min(96, Math.max(50, vfov * 180 / Math.PI));
    this.camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------- tool viewmodel
  setTool(i) {
    if (this.tool) this.camera.remove(this.tool.holder);
    const t = Models.buildTool(TOOLS[i].id);
    const holder = new THREE.Group();
    holder.add(t.group);
    t.holder = holder;
    t.group.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; } });
    this.camera.add(holder);
    this.tool = t;
    this.toolIndex = i;
    this.toolSwingT = 1;
    this.equipT = 0;
    // rest pose in camera space: bottom-right, angled up and in, like holding it out in front
    const big = i === 0 ? 0.42 : 0.46;
    this.toolPose = { x: 0.74, y: -0.9, z: -1.5, rx: -1.0, ry: 0.3, rz: 0.6, s: big };
  }

  swingTool(point) {
    this.toolSwingT = 0;
    this.swingSide = point && point.x < 0 ? -1 : 1;
  }

  updateTool(dt) {
    const t = this.tool, h = t.holder, P = this.toolPose;
    this.toolSwingT = Math.min(1, this.toolSwingT + dt / 0.3);
    const s = this.toolSwingT;
    let pitch = 0, fwd = 0;
    if (s < 0.22) { const k = s / 0.22; pitch = 0.3 * easeOut(k); }
    else if (s < 0.4) { const k = (s - 0.22) / 0.18; pitch = lerp(0.3, -0.7, k * k); fwd = k * 0.3; }
    else { const k = (s - 0.4) / 0.6; pitch = lerp(-0.7, 0, easeOut(k)); fwd = lerp(0.3, 0, easeOut(k)); }
    this.equipT = Math.min(1, this.equipT + dt * 2.2);
    const eq = 1 - easeOut(this.equipT);
    const bob = Math.sin(this.time * 1.4) * 0.01;
    const sway = Math.sin(this.time * 0.9) * 0.008;
    const vib = t.vibrate && s < 0.7 ? (Math.random() - 0.5) * 0.025 : 0;
    h.scale.setScalar(P.s);
    h.rotation.set(P.rx - pitch + eq * 0.9, P.ry + vib + sway, P.rz + (this.swingSide || 1) * pitch * 0.1);
    h.position.set(P.x + vib + sway, P.y + bob - eq * 0.9 - fwd * 0.15, P.z - fwd);
    if (t.spin) t.spin.rotation.y += dt * (s < 0.7 ? 40 : 5);
    if (t.orbs) t.orbs.children.forEach(o => { const a = this.time * 3 + o.userData.phase; o.position.set(Math.cos(a) * 0.55, Math.sin(a * 1.3) * 0.15, Math.sin(a) * 0.55); });
    if (t.pulse) t.pulse.forEach((m, i) => { m.material.emissiveIntensity = 2 + Math.sin(this.time * 6 + i) * 0.8 + (s < 0.5 ? 3 : 0); });
  }

  // ------------------------------------------------------------- effects API
  layerPal(i = this.layer) { return LAYERS[i].pal; }

  pick(ndcX, ndcY) {
    this.raycaster.setFromCamera({ x: ndcX, y: ndcY }, this.camera);
    const bs = [...this.boulders.values()].map(b => b.mesh);
    const hb = this.raycaster.intersectObjects(bs, false)[0];
    if (hb) return { boulder: hb.object.userData.id, point: hb.point, local: hb.object.worldToLocal(hb.point.clone()) };
    const hf = this.raycaster.intersectObject(this.floorProxy, false)[0];
    if (hf) return { point: hf.point };
    const p = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p)) p.set(0, 0, -1);
    if (p.length() > R - 0.8) p.setLength(R - 0.8);
    return { point: p };
  }

  impact(point, power = 1, crit = false) {
    const pal = this.layerPal();
    const n = Math.round((crit ? 14 : 5) * (this.reduceFx ? 0.6 : 1));
    this.spawnDebris(point, n, crit ? 3.6 : 2.4, pal);
    this.spawnPuff(point, crit ? 1.5 : 0.9, pal, null, crit ? 0.5 : 0.32);
    const c = this.craters[this.craterIdx++ % this.craters.length];
    c.set(point.x + rnd(-0.08, 0.08), point.z + rnd(-0.08, 0.08), crit ? rnd(0.85, 1.1) : rnd(0.5, 0.7), crit ? 1.0 : 0.65);
    if (crit && this.layer >= 2) this.spawnSparks(point, 14, this.layer >= 6 ? '#ff8a3a' : this.layer === 4 ? '#a8f0ff' : '#ffd9a0', 5);
    this.scrollVel += crit ? 0.6 : 0.22;
    if (crit) { this.shake = Math.max(this.shake, 0.3); this.flash = 0.12; }
    else this.shake = Math.max(this.shake, 0.05);
  }

  spawnDebris(point, n, speed, pal, sizeMul = 1) {
    const cols = [pal.base, pal.dark, pal.light];
    for (let k = 0; k < n; k++) {
      const di = this.debrisNext, d = this.debris[di]; this.debrisNext = (di + 1) % this.debris.length;
      d.life = d.max = rnd(1.0, 1.8);
      d.p.copy(point).add(new THREE.Vector3(rnd(-0.15, 0.15), 0.1, rnd(-0.15, 0.15)));
      const a = rnd(0, Math.PI * 2);
      d.v.set(Math.cos(a) * speed * rnd(0.25, 0.8), speed * rnd(0.7, 1.3), Math.sin(a) * speed * rnd(0.25, 0.8));
      d.w.set(rnd(-9, 9), rnd(-9, 9), rnd(-9, 9));
      d.s = rnd(0.035, 0.09) * sizeMul;
      const c = cols[Math.floor(rnd(0, 3))];
      this._c.setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace).multiplyScalar(rnd(0.85, 1.08));
      this.debrisMesh.setColorAt(di, this._c);
    }
    this.debrisMesh.instanceColor.needsUpdate = true;
  }

  spawnSparks(point, n, color, speed = 4, grav = 1, size = 1) {
    for (let k = 0; k < n; k++) {
      const s = this.sparks[this.sparkNext]; this.sparkNext = (this.sparkNext + 1) % this.sparks.length;
      s.life = s.max = rnd(0.25, 0.6);
      s.p.copy(point); s.p.y += 0.1;
      const a = rnd(0, Math.PI * 2);
      s.v.set(Math.cos(a), rnd(0.6, 1.6), Math.sin(a)).multiplyScalar(speed * rnd(0.4, 1));
      s.c.set(color); s.size = rnd(0.05, 0.11) * size; s.grav = grav;
    }
  }

  spawnPuff(point, scale, pal, color, peak = 0.35) {
    const p = this.puffs[this.puffNext]; this.puffNext = (this.puffNext + 1) % this.puffs.length;
    p.life = p.max = rnd(0.9, 1.4);
    p.s.visible = true;
    p.s.position.copy(point).add(new THREE.Vector3(rnd(-0.2, 0.2), 0.25, rnd(-0.2, 0.2)));
    p.v.set(rnd(-0.3, 0.3), rnd(0.4, 0.8), rnd(-0.3, 0.3));
    p.grow = scale * rnd(1.4, 2);
    p.peak = peak;
    const c = color ? new THREE.Color(color) : new THREE.Color().setRGB(...pal.light, THREE.SRGBColorSpace).lerp(new THREE.Color('#d8cfc2'), 0.3);
    p.s.material.color.copy(c);
    p.s.material.rotation = rnd(0, 6);
    p.s.scale.setScalar(0.4 * scale);
  }

  // ------------------------------------------------------------- machines
  setMachines(levels) {
    const want = {
      moles: Math.min(levels[0], 3), buckets: Math.min(levels[1], 2), digger: levels[2] > 0 ? 1 : 0,
      steam: levels[3] > 0 ? 1 : 0, borer: levels[4] > 0 ? 1 : 0, laser: levels[5] > 0 ? 1 : 0,
    };
    for (const [k, n] of Object.entries(want)) {
      const arr = this.machines[k] ||= [];
      while (arr.length < n) arr.push(this.createMachine(k, arr.length));
      while (arr.length > n) { const m = arr.pop(); this.scene.remove(m.obj); }
    }
  }

  createMachine(kind, idx) {
    const m = { kind, idx, t: rnd(0, 10), obj: null };
    const onWall = (a, inset, y) => new THREE.Vector3(Math.cos(a) * (R - inset), y, Math.sin(a) * (R - inset));
    switch (kind) {
      case 'moles': {
        const a = [-2.15, -0.95, -1.55][idx];
        const g = new THREE.Group();
        const hole = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), new THREE.MeshBasicMaterial({ color: '#070504' }));
        hole.position.set(0, 0.55, -0.32); hole.scale.y = 0.8;
        g.add(hole);
        const mole = Models.buildMole(true, 0.55);
        g.add(mole);
        g.position.copy(onWall(a, 0.25, 0.2));
        g.lookAt(0, 0.2, 0);
        m.mole = mole; m.obj = g; break;
      }
      case 'buckets': {
        const a = [-1.25, -1.85][idx];
        const g = Models.buildBucket();
        g.scale.setScalar(0.9);
        g.position.copy(onWall(a, 0.9, 9));
        m.obj = g; m.t = idx * 3.1; break;
      }
      case 'digger': {
        const g = Models.buildExcavator();
        const a = -0.55;
        g.position.copy(onWall(a, 0.3, 7.5));
        g.rotation.y = -a + Math.PI;
        g.scale.setScalar(0.62);
        m.obj = g; break;
      }
      case 'steam': {
        const g = Models.buildSteamDrill();
        const a = Math.PI * 0.86;
        g.position.copy(onWall(a, 1.3, 1.05));
        g.scale.setScalar(0.62);
        m.obj = g; break;
      }
      case 'borer': {
        const g = Models.buildBorer();
        const a = -2.6;
        g.position.copy(onWall(a, 0.35, 1.5));
        g.lookAt(0, 1.5, 0);
        g.scale.setScalar(0.6);
        m.obj = g; break;
      }
      case 'laser': {
        const g = Models.buildLaser();
        m.obj = g; m.pos = new THREE.Vector2(0, -1); m.target = new THREE.Vector2(rnd(-1.5, 1.5), rnd(-2.5, 0.5)); break;
      }
    }
    m.obj.traverse(o => { if (o.isMesh) { o.frustumCulled = false; if (kind !== 'laser') { o.castShadow = true; o.receiveShadow = true; } } });
    this.scene.add(m.obj);
    return m;
  }

  updateMachines(dt, digging) {
    const pal = this.layerPal();
    const speed = digging ? 1 : 0.12;
    for (const [kind, arr] of Object.entries(this.machines)) {
      for (const m of arr) {
        m.t += dt * speed;
        const t = m.t;
        if (kind === 'moles') {
          const cyc = (t * 0.5 + m.idx * 0.37) % 1;
          const out = cyc < 0.15 ? easeOut(cyc / 0.15) : cyc > 0.85 ? 1 - easeOut((cyc - 0.85) / 0.15) : 1;
          m.mole.position.z = lerp(-0.8, 0.25, out);
          m.mole.position.y = 0.3 + Math.abs(Math.sin(t * 9)) * 0.05 * out;
          m.mole.rotation.x = Math.sin(t * 9) * 0.1 * out;
          m.mole.rotation.y = Math.sin(t * 1.3 + m.idx) * 0.3;
          if (digging && out > 0.9 && Math.random() < dt * 2) {
            const p = new THREE.Vector3(0, 0.1, 0.9).applyMatrix4(m.obj.matrixWorld);
            this.spawnDebris(p, 1, 1.4, pal, 0.8);
          }
        } else if (kind === 'buckets') {
          const cyc = (t * 0.14) % 1;
          let y;
          if (cyc < 0.35) y = lerp(9, 0.4, easeOut(cyc / 0.35));
          else if (cyc < 0.5) y = 0.4 + Math.sin((cyc - 0.35) / 0.15 * Math.PI) * 0.08;
          else y = lerp(0.4, 9, Math.pow((cyc - 0.5) / 0.5, 1.6));
          m.obj.position.y = y;
          m.obj.rotation.z = Math.sin(t * 2.2) * 0.03 * (y > 1 ? 1 : 0);
          m.obj.getObjectByName('dirt').visible = cyc > 0.42;
          if (digging && cyc > 0.36 && cyc < 0.48 && Math.random() < dt * 3) this.spawnDebris(m.obj.position, 1, 1.0, pal, 0.7);
        } else if (kind === 'digger') {
          const { boom, stick, bucket } = m.obj.userData;
          const cyc = (t * 0.2) % 1;
          const reach = Math.sin(cyc * Math.PI * 2);
          boom.rotation.z = 0.35 + reach * 0.1;
          stick.rotation.z = -0.75 + Math.sin(cyc * Math.PI * 2 + 1) * 0.3;
          bucket.rotation.z = 0.3 - Math.max(0, Math.sin(cyc * Math.PI * 2 - 0.6)) * 1.1;
          if (digging && cyc > 0.68 && cyc < 0.76 && Math.random() < dt * 6) {
            const p = new THREE.Vector3(0.4, -0.8, 0).applyMatrix4(bucket.matrixWorld); p.y = Math.max(0.2, p.y);
            this.spawnDebris(p, 2, 1.8, pal); this.spawnPuff(p, 0.8, pal);
          }
        } else if (kind === 'steam') {
          const { bit, chimneyTop } = m.obj.userData;
          bit.rotation.y += dt * 12 * speed;
          if (Math.random() < dt * 2 * (digging ? 1 : 0.3)) {
            const p = chimneyTop.clone().multiplyScalar(0.62).add(m.obj.position);
            this.spawnPuff(p, 0.8, pal, '#ece8e0', 0.45);
          }
          if (digging && Math.random() < dt * 3) { const p = m.obj.position.clone(); p.y = 0.1; this.spawnDebris(p, 1, 1.6, pal, 0.8); }
        } else if (kind === 'borer') {
          m.obj.userData.wheel.rotation.z += dt * 3 * speed;
          if (digging && Math.random() < dt * 5) {
            const p = m.obj.position.clone().multiplyScalar(0.9); p.y = rnd(0.5, 2);
            this.spawnDebris(p, 1, 2.2, pal, 0.8);
          }
        } else if (kind === 'laser') {
          if (m.pos.distanceTo(m.target) < 0.1) { const a = rnd(0, Math.PI * 2), r = rnd(1.8, 3.0); m.target.set(Math.cos(a) * r, Math.sin(a) * r - 0.6); }
          m.pos.lerp(m.target, dt * 0.5);
          m.obj.position.set(m.pos.x, 0.05, m.pos.y);
          const { beam, core, glow } = m.obj.userData;
          const flick = 0.88 + Math.random() * 0.12;
          beam.material.opacity = (digging ? 0.32 : 0.08) * flick;
          core.material.opacity = (digging ? 0.7 : 0.15) * flick;
          glow.scale.setScalar((digging ? 1.5 : 0.5) * flick);
          if (digging && Math.random() < dt * 18) this.spawnSparks(m.obj.position, 1, '#ffa2b8', 3.5, 1, 0.8);
        }
      }
    }
  }

  // ------------------------------------------------------------- boulders
  addBoulder(b) {
    const pal = LAYERS[b.layer].pal;
    const size = rnd(0.6, 0.8) * (1 + b.max / 80);
    const mesh = Models.buildBoulder(pal, size);
    mesh.userData.id = b.id;
    mesh.castShadow = true; mesh.receiveShadow = true;
    let pos;
    for (let k = 0; k < 20; k++) {
      const a = rnd(0, Math.PI * 2), rr = rnd(1.2, R - 1.7);
      pos = new THREE.Vector3(Math.cos(a) * rr, 0, Math.sin(a) * rr);
      if (pos.z < 0.8 && pos.x < 1.4 && ![...this.boulders.values()].some(o => o.mesh.position.distanceTo(pos) < 1.8)) break;
    }
    mesh.position.copy(pos).setY(12);
    mesh.rotation.set(rnd(0, 6), rnd(0, 6), rnd(0, 6));
    this.scene.add(mesh);
    this.boulders.set(b.id, { mesh, size, vy: 0, landed: false, wob: 0, data: b });
  }
  hitBoulder(id, local, point) {
    const b = this.boulders.get(id); if (!b) return;
    Models.chipBoulder(b.mesh, local, 0.08);
    b.wob = 1;
    this.spawnDebris(point, 4, 2.6, LAYERS[b.data.layer].pal, 0.9);
    this.spawnPuff(point, 0.6, LAYERS[b.data.layer].pal);
    this.shake = Math.max(this.shake, 0.08);
  }
  smashBoulder(id) {
    const b = this.boulders.get(id); if (!b) return;
    const pal = LAYERS[b.data.layer].pal;
    const p = b.mesh.position.clone();
    this.spawnDebris(p, this.reduceFx ? 16 : 34, 4.2, pal, 1.6);
    this.spawnPuff(p, 2.0, pal, null, 0.5); this.spawnPuff(p, 2.6, pal, null, 0.4);
    this.shake = 0.45; this.flash = 0.1;
    this.scene.remove(b.mesh);
    b.mesh.geometry.dispose();
    this.boulders.delete(id);
  }
  boulderScreenPos(id) {
    const b = this.boulders.get(id); if (!b) return null;
    const v = b.mesh.position.clone(); v.y += b.size * 1.3;
    v.project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight };
  }
  worldToScreen(p) {
    const v = p.clone().project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight };
  }
  clearBoulders() { for (const [id, b] of this.boulders) { this.scene.remove(b.mesh); } this.boulders.clear(); }

  // ------------------------------------------------------------- treasure reveal
  revealTreasure(t, from) {
    const obj = Models.buildTreasure(t);
    const holder = new THREE.Group(); holder.add(obj);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: Models.softDotTexture(), color: t.color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
    halo.scale.setScalar(2.6);
    holder.add(halo);
    const key = new THREE.PointLight('#fff4e0', 6, 4, 1.5); key.position.set(0.6, 0.8, 1.2); holder.add(key);
    holder.traverse(o => { o.frustumCulled = false; });
    const start = (from || new THREE.Vector3(0, 0, -1)).clone();
    this.scene.add(holder);
    holder.position.copy(start);
    holder.scale.setScalar(0.2);
    const fx = { holder, halo, obj, start, t: 0, state: 'rise' };
    this.treasureFx.push(fx);
    this.spawnSparks(start, 20, t.color, 4, 0.3, 1.2);
    this.spawnPuff(start, 1.4, this.layerPal());
    return fx;
  }
  dismissTreasure() { for (const fx of this.treasureFx) if (fx.state !== 'out') { fx.state = 'out'; fx.t = 0; } }
  updateTreasures(dt) {
    const front = new THREE.Vector3(0, 0.12, -2.4).applyMatrix4(this.camera.matrixWorld);
    for (const fx of this.treasureFx) {
      fx.t += dt;
      fx.obj.rotation.y += dt * 1.4;
      if (fx.state === 'rise') {
        const k = easeOut(Math.min(1, fx.t / 0.9));
        fx.holder.position.lerpVectors(fx.start, front, k);
        fx.holder.position.y += Math.sin(k * Math.PI) * 0.6 + (fx.t > 0.9 ? Math.sin(this.time * 2) * 0.03 : 0);
        fx.holder.scale.setScalar(lerp(0.2, 0.85, k));
        fx.halo.material.opacity = k * 0.35;
      } else {
        const k = Math.min(1, fx.t / 0.45);
        const target = new THREE.Vector3(-0.2, -1.6, -2).applyMatrix4(this.camera.matrixWorld);
        fx.holder.position.lerpVectors(front, target, k * k);
        fx.holder.scale.setScalar(lerp(0.85, 0.05, k));
        fx.halo.material.opacity = (1 - k) * 0.35;
        if (k >= 1) { this.scene.remove(fx.holder); fx.dead = true; }
      }
    }
    this.treasureFx = this.treasureFx.filter(f => !f.dead);
  }

  // ------------------------------------------------------------- thumbnails
  thumb(obj, size = 160, opts = {}) {
    if (!this.thumbR) {
      this.thumbR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      this.thumbR.toneMapping = THREE.ACESFilmicToneMapping;
      this.thumbR.outputColorSpace = THREE.SRGBColorSpace;
      this.thumbS = new THREE.Scene();
      const pm = new THREE.PMREMGenerator(this.thumbR);
      this.thumbS.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
      this.thumbS.environmentIntensity = 0.7;
      const k = new THREE.DirectionalLight('#fff4e0', 2.2); k.position.set(2, 3, 4); this.thumbS.add(k);
      const rim = new THREE.DirectionalLight('#cfe0ff', 1.2); rim.position.set(-3, 1, -2); this.thumbS.add(rim);
      this.thumbC = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    }
    this.thumbR.setSize(size, size, false);
    const s = this.thumbS;
    const g = new THREE.Group(); g.add(obj); s.add(g);
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    const c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3()).length();
    obj.position.sub(c);
    g.rotation.set(opts.rx ?? 0.35, opts.ry ?? -0.6, opts.rz ?? 0);
    this.thumbC.position.set(0, 0, sz * 1.7);
    this.thumbC.lookAt(0, 0, 0);
    this.thumbR.setClearColor(0x000000, 0);
    this.thumbR.render(s, this.thumbC);
    const url = this.thumbR.domElement.toDataURL('image/png');
    s.remove(g);
    return url;
  }

  // ------------------------------------------------------------- per-frame
  setDepth(v, skyAmount, ground) {
    this.depthV = v;
    this.layer = Math.min(7, Math.floor(v));
    this.sky = skyAmount;
    if (ground !== undefined) this.groundTarget = ground;
  }

  applyLighting() {
    const L = LAYERS[this.layer], glow = L.pal.glow, sky = this.sky;
    const deep = this.layer >= 6;
    const yardOn = this.yard.visible;
    const day = new THREE.Color('#fff4e2'), flood = new THREE.Color(deep ? '#ffc890' : '#ffe0b8');
    this.sun.color.copy(flood).lerp(day, sky);
    this.sun.intensity = lerp(2.0, 2.5, sky);
    if (yardOn) {
      const sd = this.yard.userData.sunDir;
      this.sun.position.set(sd.x * 30, this.ground + sd.y * 30, sd.z * 30);
      this.sun.target.position.set(0, this.ground * 0.5, -2);
      const sc = this.sun.shadow.camera; const ext = this.ground < 6 ? 34 : 12;
      if (sc.right !== ext) { sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.near = 1; sc.far = 90; sc.updateProjectionMatrix(); }
    } else {
      this.sun.position.set(-4.5, 16, 2.5); this.sun.target.position.set(0.6, 0, -1.2);
      const sc = this.sun.shadow.camera;
      if (sc.right !== 6) { sc.left = -6; sc.right = 6; sc.top = 6; sc.bottom = -6; sc.near = 4; sc.far = 30; sc.updateProjectionMatrix(); }
    }
    this.hemi.color.set('#bcd8ff').lerp(new THREE.Color(deep ? '#7a4a30' : '#6a6460'), 1 - sky);
    this.hemi.groundColor.set(yardOn ? '#5a6a2a' : deep ? '#4a1a08' : '#2e2218');
    this.hemi.intensity = lerp(0.22, 0.8, sky) + glow * 0.2;
    this.lamp.intensity = lerp(7, 1.5, sky);
    this.fill.intensity = deep ? 14 : glow * 6;
    this.fill.color.set(this.layer === 4 ? '#7aa8ff' : this.layer === 7 ? '#ffb060' : '#ff6a20');
    if (yardOn) {
      this.scene.fog.color.set('#bcd3e2'); this.scene.fog.density = 0.0022;
      this.scene.environmentIntensity = 0.35;
    } else {
      const fogC = new THREE.Color().setRGB(...L.pal.dark, THREE.SRGBColorSpace).multiplyScalar(0.35);
      if (deep) fogC.lerp(new THREE.Color('#2a0e04'), 0.5);
      this.scene.fog.color.copy(fogC); this.scene.fog.density = 0.012;
      this.scene.background.copy(fogC);
      this.scene.environmentIntensity = 0.3;
    }
    this.motes.visible = !yardOn || this.ground > 4;
    this.motes.material.color.set(deep ? '#ffa060' : this.layer === 4 ? '#cfe8ff' : '#fff0dc');
  }

  update(dt, digRate) {
    this.time += dt;
    const u = this.uniforms;
    // ground height eases toward the target so every tap visibly lowers the floor
    if (this.groundTarget !== undefined) this.ground += (this.groundTarget - this.ground) * Math.min(1, dt * 8);
    const yardOn = this.ground < 13;
    this.scrollVel *= Math.pow(0.02, dt);
    if (yardOn) this.scroll = this.ground;                      // walls are anchored to the lawn
    else this.scroll += (this.scrollVel * 2 + digRate) * dt;     // deeper: walls stream past
    this.yard.visible = yardOn;
    this.yard.position.y = this.ground;
    const wallH = yardOn ? Math.max(0.05, this.ground) : 16;
    u.uWallH.value = wallH;
    u.uBowl.value = Math.min(1, this.ground / 3);
    this.wallShadow.scale.y = wallH;
    this.wallShadow.visible = yardOn;
    // camera rides from the rim down into the shaft
    const cs = THREE.MathUtils.smoothstep(this.ground, 0.6, 7.5);
    for (let i = 0; i < 3; i++) { this.camBase.setComponent(i, lerp(CAM_SURF.pos[i], CAM_DEEP.pos[i], cs)); this.camLook.setComponent(i, lerp(CAM_SURF.look[i], CAM_DEEP.look[i], cs)); }
    this.updateStones();
    u.uTime.value = this.time;
    if (this.yard.userData.grassU) this.yard.userData.grassU.value = this.time;
    u.uScroll.value = this.scroll;
    u.uDepth.value = this.depthV;
    this.flash *= Math.pow(0.001, dt);
    u.uFlash.value = this.flash;
    for (const c of this.craters) c.w = Math.max(0, c.w - dt * (0.3 + digRate * 0.4));
    this.applyLighting();

    this.shake *= Math.pow(0.004, dt);
    const sh = this.reduceFx ? 0 : this.shake;
    if (!this.finale || this.finale.phase === 0) {
      this.camera.position.set(
        this.camBase.x + Math.sin(this.time * 0.45) * 0.04 + (Math.random() - 0.5) * sh * 0.4,
        this.camBase.y + Math.sin(this.time * 0.6) * 0.03 + (Math.random() - 0.5) * sh * 0.25,
        this.camBase.z + (Math.random() - 0.5) * sh * 0.4);
      this.camera.lookAt(this.camLook.x + Math.sin(this.time * 0.3) * 0.05, this.camLook.y, this.camLook.z);
    }
    this.camera.updateMatrixWorld();

    this.updateTool(dt);
    this.updateMachines(dt, digRate > 0.01);
    this.updateParticles(dt);
    this.updateBoulders(dt);
    this.updateTreasures(dt);
    if (this.finale) this.updateFinale(dt);
    this.renderer.render(this.scene, this.camera);
  }

  updateParticles(dt) {
    const m4 = this._m4, q = this._q, s3 = this._s;
    for (let i = 0; i < this.debris.length; i++) {
      const d = this.debris[i];
      if (d.life <= 0) continue;
      d.life -= dt;
      d.v.y -= 13 * dt;
      d.p.addScaledVector(d.v, dt);
      const floorY = 0.04 + d.s * 0.7;
      if (d.p.y < floorY) {
        d.p.y = floorY;
        if (d.v.y < 0) { d.v.y *= -0.28; d.v.x *= 0.5; d.v.z *= 0.5; d.w.multiplyScalar(0.4); }
      }
      const rr = Math.hypot(d.p.x, d.p.z);
      if (rr > R - 0.5) { d.p.x *= (R - 0.5) / rr; d.p.z *= (R - 0.5) / rr; d.v.x *= -0.3; d.v.z *= -0.3; }
      d.r.x += d.w.x * dt; d.r.y += d.w.y * dt; d.r.z += d.w.z * dt;
      const fade = Math.min(1, d.life / 0.35);
      q.setFromEuler(d.r); s3.setScalar(d.life > 0 ? d.s * fade : 0);
      m4.compose(d.p, q, s3);
      this.debrisMesh.setMatrixAt(i, m4);
    }
    this.debrisMesh.instanceMatrix.needsUpdate = true;

    const pos = this.sparkPts.geometry.attributes.position, col = this.sparkPts.geometry.attributes.aColor, sz = this.sparkPts.geometry.attributes.aSize;
    for (let i = 0; i < this.sparks.length; i++) {
      const s = this.sparks[i];
      if (s.life > 0) {
        s.life -= dt; s.v.y -= 9 * s.grav * dt; s.p.addScaledVector(s.v, dt);
        if (s.p.y < 0.05) { s.p.y = 0.05; s.v.y *= -0.4; }
      }
      const a = Math.max(0, s.life / s.max);
      pos.setXYZ(i, s.p.x, s.p.y, s.p.z);
      col.setXYZW(i, s.c.r * 1.6, s.c.g * 1.6, s.c.b * 1.6, a);
      sz.setX(i, s.life > 0 ? s.size : 0);
    }
    pos.needsUpdate = col.needsUpdate = sz.needsUpdate = true;

    for (const p of this.puffs) {
      if (p.life <= 0) { p.s.visible = false; continue; }
      p.life -= dt;
      const k = 1 - p.life / p.max;
      p.s.position.addScaledVector(p.v, dt);
      p.v.multiplyScalar(Math.pow(0.3, dt));
      p.s.scale.setScalar(0.35 + p.grow * easeOut(k));
      p.s.material.opacity = Math.sin(Math.min(1, k * 4) * Math.PI / 2) * (1 - k) * p.peak;
    }

    const mp = this.motes.geometry.attributes.position, sd = this.moteSeed;
    for (let i = 0; i < mp.count; i++) {
      const y = mp.getY(i) + sd[i * 4 + 2] * dt;
      mp.setXYZ(i, mp.getX(i) + Math.sin(this.time * sd[i * 4 + 1] + sd[i * 4]) * dt * 0.04, y > 6 ? 0.3 : y, mp.getZ(i) + Math.cos(this.time * sd[i * 4 + 1] + sd[i * 4]) * dt * 0.04);
    }
    mp.needsUpdate = true;
  }

  updateBoulders(dt) {
    for (const b of this.boulders.values()) {
      if (!b.landed) {
        b.vy -= 28 * dt;
        b.mesh.position.y += b.vy * dt;
        const rest = b.size * 0.55;
        if (b.mesh.position.y <= rest) {
          b.mesh.position.y = rest;
          if (Math.abs(b.vy) > 4) {
            const p = b.mesh.position.clone().setY(0.2);
            this.spawnPuff(p, 2, this.layerPal(), null, 0.45); this.spawnDebris(p, 8, 2.6, this.layerPal());
            this.shake = Math.max(this.shake, 0.25); this.onBoulderLand?.();
            b.vy = -b.vy * 0.22;
          } else { b.vy = 0; b.landed = true; }
        }
      }
      if (b.wob > 0) {
        b.wob = Math.max(0, b.wob - dt * 4);
        const w = Math.sin(b.wob * 30) * b.wob * 0.07;
        b.mesh.scale.set(1 + w, 1 - w, 1 + w);
      }
    }
  }

  // ------------------------------------------------------------- finale
  startFinale(cb) { this.finale = { t: 0, phase: 0, cb }; }
  updateFinale(dt) {
    const f = this.finale; f.t += dt;
    if (f.phase === 0) {
      this.shake = Math.max(this.shake, 0.2 + f.t * 0.15);
      this.flash = Math.max(this.flash, f.t * 0.08);
      if (Math.random() < dt * 20) this.spawnSparks(new THREE.Vector3(rnd(-2.5, 2.5), 0.1, rnd(-3, 1)), 3, '#ffb050', 5);
      if (f.t > 2.6) {
        f.phase = 1; f.t = 0;
        for (let i = 0; i < 5; i++) this.spawnDebris(new THREE.Vector3(rnd(-2, 2), 0.2, rnd(-2.5, 0.5)), 24, 6, this.layerPal(), 1.5);
        this.flash = 1.5;
        this.buildChamber();
        f.cb?.('break');
      }
    } else if (f.phase === 1) {
      const k = Math.min(1, f.t / 2.4), e = easeOut(k);
      this.camera.position.set(0, lerp(this.cam.pos[1], -15, e), lerp(this.cam.pos[2], 8, e));
      this.camera.lookAt(0, lerp(0, -21, e), lerp(-1, -3, e));
      if (k >= 1) { f.phase = 2; f.t = 0; f.cb?.('landed'); }
    } else if (f.phase === 2) {
      this.camera.position.set(Math.sin(this.time * 0.2) * 0.3, -15 + Math.sin(this.time * 0.5) * 0.05, 8);
      this.camera.lookAt(0, -21, -3);
      const ch = this.chamber;
      ch.uniforms.uTime.value = this.time;
      const k = ch.king.userData;
      k.body.scale.y = 1 + Math.sin(this.time * 1.4) * 0.025;
      if (f.wake) {
        f.wakeT = (f.wakeT || 0) + dt;
        const w = Math.min(1, f.wakeT / 1.2);
        k.lids.forEach(l => l.rotation.x = lerp(Math.PI / 2 + 0.2, Math.PI + 0.9, w));
        const yawn = f.wakeT < 2.6 ? Math.sin(Math.min(1, f.wakeT / 2.6) * Math.PI) : 0;
        k.yawn.scale.y = 0.05 + yawn * 1.1;
        k.head.rotation.x = -yawn * 0.25;
        ch.uniforms.uWake.value = w;
      }
      if (this.crownObj) {
        this.crownT += dt;
        const c = Math.min(1, this.crownT / 2);
        const front = new THREE.Vector3(0, 0.25, -2.2).applyMatrix4(this.camera.matrixWorld);
        this.crownObj.position.lerpVectors(this.crownStart, front, easeOut(c));
        this.crownObj.rotation.y += dt * 1.3;
        this.crownObj.scale.setScalar(lerp(1.2, 0.5, easeOut(c)));
      }
    }
  }
  buildChamber() {
    const g = new THREE.Group();
    g.position.set(0, -22, 0);
    const u = { uTime: { value: 0 }, uWake: { value: 0 }, uNoise: { value: this.noise } };
    const shell = new THREE.Mesh(new THREE.SphereGeometry(14, 64, 40), new THREE.ShaderMaterial({ uniforms: u, vertexShader: chamberShader.vertex, fragmentShader: chamberShader.fragment, side: THREE.BackSide }));
    g.add(shell);
    const king = Models.buildMoleKing();
    king.position.set(0, -2.2, -3);
    g.add(king);
    const light = new THREE.PointLight('#ffc080', 160, 0, 1.4); light.position.set(2, 6, 5); g.add(light);
    const under = new THREE.PointLight('#ff5a1a', 90, 0, 1.6); under.position.set(0, -6, -1); g.add(under);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(6, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#2a1408', emissive: '#ff7020', emissiveIntensity: 0.3, roughness: 0.35, metalness: 0.3 }));
    pool.position.y = -4.3; g.add(pool);
    g.traverse(o => { o.frustumCulled = false; });
    this.scene.add(g);
    this.chamber = { group: g, uniforms: u, king };
    this.wall.visible = this.floor.visible = this.motes.visible = false;
    this.scene.fog.density = 0.004;
    for (const arr of Object.values(this.machines)) for (const m of arr) m.obj.visible = false;
    this.clearBoulders();
  }
  wakeKing() { if (this.finale) this.finale.wake = true; }
  giveCrown() {
    const c = Models.buildCrown();
    const k = this.chamber.king.userData.head;
    this.crownStart = new THREE.Vector3(); k.getWorldPosition(this.crownStart); this.crownStart.y += 1.4;
    c.position.copy(this.crownStart);
    c.traverse(o => o.frustumCulled = false);
    this.scene.add(c);
    this.crownObj = c; this.crownT = 0;
    this.spawnSparks(this.crownStart, 30, '#ffd860', 3, 0.2, 1.4);
  }
  endFinale() {
    if (this.chamber) { this.scene.remove(this.chamber.group); this.chamber = null; }
    if (this.crownObj) { this.scene.remove(this.crownObj); this.crownObj = null; }
    this.finale = null;
    this.wall.visible = this.floor.visible = this.motes.visible = true;
    this.scene.fog.density = 0.012;
    for (const arr of Object.values(this.machines)) for (const m of arr) m.obj.visible = true;
    this.camBase.set(...this.cam.pos); this.camLook.set(...this.cam.look);
    this.scroll = 0;
  }
}
