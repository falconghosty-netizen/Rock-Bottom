// Wires the game rules, 3D scene, audio and UI together.
import { Game } from './state.js';
import { Scene } from './scene.js';
import { Audio } from './audio.js';
import { UI, fmt, fmtShort, fmtDepth, fmtTime } from './ui.js';
import { LAYERS, TREASURES } from './data.js';
import { view, updateView, toApp } from './view.js';

updateView();
const canvas = document.getElementById('view');
const game = new Game(Game.load());
const s = () => game.s;
const scene = new Scene(canvas, { reduceFx: s().settings.reduceFx });
const audio = new Audio();
audio.setVolumes(s().settings.sfx, s().settings.amb);

const hooks = {
  buy(kind, i) {
    audio.unlock();
    const ok = kind === 'tool' ? game.buyTool() : kind === 'bag' ? game.buyBag() : kind === 'station' ? game.buyStation(i) : game.buyMachine(i);
    if (!ok) { audio.deny(); return; }
    ui.renderSheet();
  },
  nextPointFrac() {
    const i = game.layerIndex, f = game.layerProgress(i) * LAYERS[i].points;
    return game.s.finished ? 1 : f - Math.floor(f);
  },
  settings(reduceChanged) {
    audio.setVolumes(s().settings.sfx, s().settings.amb);
    game.save();
    if (reduceChanged) setTimeout(() => location.reload(), 300);
  },
  wipe() { Game.wipe(); window.__wiped = true; location.reload(); },
};
const ui = new UI(game, scene, audio, hooks);

// ------------------------------------------------------------------ helpers
const groundFor = (depth) => 0.6 + Math.min(depth, 60) * 0.35 + (depth > 60 ? 8 : 0);
function skyAt() {
  const i = game.layerIndex, f = game.layerProgress(i);
  const a = LAYERS[i].sky, b = LAYERS[Math.min(7, i + 1)].sky;
  return a + (b - a) * f;
}
let lastPoint = null;
let lastTapScreen = { x: view.w / 2, y: view.h / 2 };
let treasureShownAt = -1;
let fullWarnAt = -10;
let now = 0;

// ------------------------------------------------------------------ input
// left side: floating joystick to walk · right side: drag to look, tap to dig
const stickEl = document.getElementById('stick'), knobEl = document.getElementById('knob');
const STICK_R = 52;
let stick = null;                 // { id, x0, y0 }
const looks = new Map();          // pointerId -> { x0, y0, x, y, t0, dragging }
const keys = new Set();
let hintT = 0, didMove = false, didDig = false;

function setStick(dx, dy) {
  const d = Math.hypot(dx, dy), k = d > STICK_R ? STICK_R / d : 1;
  dx *= k; dy *= k;
  knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
  scene.move.x = dx / STICK_R; scene.move.y = -dy / STICK_R;
  if (d > 10) didMove = true;
}
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  audio.unlock();
  try { canvas.setPointerCapture(e.pointerId); } catch {}
  if (finale.active) return;
  const p = toApp(e.clientX, e.clientY);
  if (!stick && p.x < view.w * 0.4 && treasureShownAt < 0 && !ui.panel) {
    stick = { id: e.pointerId, x0: p.x, y0: p.y };
    stickEl.style.left = p.x + 'px'; stickEl.style.top = p.y + 'px';
    stickEl.classList.remove('hidden');
    setStick(0, 0);
    return;
  }
  looks.set(e.pointerId, { x0: p.x, y0: p.y, x: p.x, y: p.y, t0: performance.now(), dragging: false });
}, { passive: false });
canvas.addEventListener('pointermove', (e) => {
  const p = toApp(e.clientX, e.clientY);
  if (stick && e.pointerId === stick.id) { setStick(p.x - stick.x0, p.y - stick.y0); return; }
  const L = looks.get(e.pointerId);
  if (!L) return;
  if (!L.dragging) {
    if (Math.hypot(p.x - L.x0, p.y - L.y0) > 9) { L.dragging = true; scene.look(p.x - L.x0, p.y - L.y0); L.x = p.x; L.y = p.y; }
    return;
  }
  scene.look(p.x - L.x, p.y - L.y); L.x = p.x; L.y = p.y;
});
function endPointer(e) {
  if (stick && e.pointerId === stick.id) { stick = null; stickEl.classList.add('hidden'); setStick(0, 0); return; }
  const L = looks.get(e.pointerId);
  if (!L) return;
  looks.delete(e.pointerId);
  if (e.type === 'pointerup' && !L.dragging && performance.now() - L.t0 < 450) tapAt(L.x0, L.y0);
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()));
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
function keyMove() {
  if (stick) return;
  let x = 0, y = 0;
  if (keys.has('w') || keys.has('arrowup')) y += 1;
  if (keys.has('s') || keys.has('arrowdown')) y -= 1;
  if (keys.has('a') || keys.has('arrowleft')) x -= 1;
  if (keys.has('d') || keys.has('arrowright')) x += 1;
  scene.move.x = x; scene.move.y = y;
  if (x || y) didMove = true;
}

function tapAt(ax, ay) {
  if (treasureShownAt >= 0) {
    if (now - treasureShownAt > 0.5) { scene.dismissTreasure(); ui.hideTreasure(); treasureShownAt = -1; }
    return;
  }
  if (ui.panel) { ui.close(); return; }
  lastTapScreen = { x: ax, y: ay };
  const hit = scene.pick((ax / view.w) * 2 - 1, -(ay / view.h) * 2 + 1);
  if (hit.station) { audio.ui(); ui.open('station'); return; }
  scene.swingTool(hit.point);
  if (!hit.point) return;
  lastPoint = hit.point;
  didDig = true;

  if (hit.boulder !== undefined) {
    const r = game.hitBoulder(hit.boulder);
    if (!r) return;
    if (!r.smashed) { scene.hitBoulder(hit.boulder, hit.local, hit.point); audio.boulderHit(); if (r.crit) ui.float(ax, ay - 20, 'CRIT', 'crit small'); }
    return;
  }
  const r = game.tap();
  if (!r) return;
  if (r.full) {
    scene.spawnPuff(hit.point, 0.5, scene.layerPal(), null, 0.2);
    if (now - fullWarnAt > 0.6) { audio.full(); ui.float(ax, ay - 10, 'Bag full: go to the drop-off', 'small'); fullWarnAt = now; }
    return;
  }
  scene.impact(hit.point, r.amount, r.crit, !!hit.wall);
  if (r.crit) { audio.crit(game.layerIndex); ui.float(ax, ay - 16, `+${fmtShort(r.dug)}`, 'crit'); }
  else { audio.dig(game.layerIndex); ui.float(ax, ay - 16, `+${fmtShort(r.dug)}`); }
  if (r.coins > 0) ui.float(ax + 30, ay - 46, `+${fmtShort(r.coins)}`, 'coin small');
  if (r.hits > 1) setTimeout(() => audio.dig(game.layerIndex), 70);
}
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());
document.addEventListener('touchmove', e => { if (e.target === canvas) e.preventDefault(); }, { passive: false });
const relayout = () => { updateView(); scene.resize(); };
addEventListener('resize', relayout);
addEventListener('orientationchange', () => setTimeout(relayout, 250));
scene.onStep = () => audio.step(game.layerIndex);

// ------------------------------------------------------------------ game events
game.on('sell', ({ value, lucky }) => {   // auto-sell skills
  audio.sell(Math.log10(Math.max(10, value)) / 2);
  ui.bumpCoins();
  ui.float(110, view.h - 150, `+${fmtShort(value)}`, 'coin');
  if (lucky) ui.toast('LUCKY', 'Double payout!');
});
let tickSoundT = 0;
game.on('depositTick', () => { if (now - tickSoundT > 0.09) { tickSoundT = now; audio.pour(); } });
game.on('deposited', ({ value, lucky }) => {
  audio.sell(Math.log10(Math.max(10, value)) / 2);
  ui.bumpCoins();
  const p = scene.stationScreen();
  ui.float(p.behind ? view.w / 2 : p.x, p.behind ? view.h * 0.4 : p.y, `+${fmtShort(value)}`, 'coin crit');
  if (lucky) ui.toast('LUCKY SCALE', 'That drop-off paid double!');
});
game.on('layer', (i) => {
  const L = LAYERS[i];
  ui.banner(`LAYER ${i + 1} OF 8`, L.name, fmtDepth(L.from));
  audio.layer(); audio.setLayer(i);
});
game.on('milestone', () => {
  audio.milestone();
  ui.toast('SKILL POINT', game.pointsFree() > 1 ? `${game.pointsFree()} points ready` : '+1 point to spend');
});
game.on('treasure', (t) => {
  scene.revealTreasure(t, lastPoint);
  ui.showTreasure(t);
  audio.treasure();
  treasureShownAt = now;
});
game.on('achievement', (a) => { audio.achievement(); ui.toast('ACHIEVEMENT', a.name, 'ach'); });
game.on('boulderSpawn', (b) => { scene.addBoulder(b); });
game.on('boulderSmash', ({ id, coins }) => {
  scene.smashBoulder(id);
  audio.boulderSmash();
  ui.bumpCoins();
  ui.float(lastTapScreen.x, lastTapScreen.y - 30, `+${fmtShort(coins)}`, 'coin crit');
});
game.on('buy', ({ kind, i }) => {
  audio.buy();
  if (kind === 'tool') { scene.setTool(i); audio.equip(); }
  if (kind === 'machine') scene.setMachines(game.s.machines);
  if (kind === 'station') scene.setZoneRadius(game.stationReach);
  ui.bumpCoins();
});
game.on('momentum', () => { audio.momentum(); });
game.on('fault', () => { audio.fault(); scene.shake = Math.max(scene.shake, 0.5); ui.toast('CAVE-IN', 'The floor gave way!'); });
game.on('finish', () => finale.start());
game.on('reset', () => {
  scene.endFinale(); scene.clearBoulders();
  scene.setTool(game.s.tool); scene.setMachines(game.s.machines);
  scene.ground = scene.groundTarget = groundFor(0);
  audio.setLayer(0);
  game.save();
});
scene.onBoulderLand = () => audio.boulderLand();

// ------------------------------------------------------------------ finale
const finale = {
  active: false, timers: [],
  start() {
    this.active = true;
    ui.closeImmediate();
    stick = null; stickEl.classList.add('hidden'); setStick(0, 0);
    document.getElementById('hud').style.transition = 'opacity .8s';
    document.getElementById('hud').style.opacity = '0';
    audio.rumble(3);
    scene.startFinale((ev) => {
      if (ev === 'break') audio.finale();
      if (ev === 'landed') this.chamber();
    });
  },
  later(ms, fn) { this.timers.push(setTimeout(fn, ms)); },
  chamber() {
    document.getElementById('finale').classList.remove('hidden');
    ui.dialog('', 'Zzz…');
    audio.snore();
    this.later(1600, () => audio.snore());
    this.later(3200, () => { scene.wakeKing(); audio.yawn(); ui.dialog('THE MOLE KING', '…mm? A visitor?'); });
    this.later(6400, () => ui.dialog('THE MOLE KING', 'Nobody has dug this far in four and a half billion years.'));
    this.later(10200, () => { ui.dialog('THE MOLE KING', 'Here. You earned this.'); scene.giveCrown(); audio.treasure(); });
    this.later(13800, () => this.results());
  },
  results() {
    document.getElementById('dialog').style.opacity = 0;
    const st = game.s.stats;
    ui.results([
      ['Time', fmtTime(game.s.runTime)], ['Best', fmtTime(game.s.bestTime)], ['Taps', fmt(st.taps)],
      ['Treasures', `${game.s.treasures.length} / ${TREASURES.length}`], ['Boulders', fmt(st.boulders)], ['Crowns after this', String(game.s.crowns + 1)],
    ], () => this.next());
  },
  next() {
    this.timers.forEach(clearTimeout); this.timers = [];
    this.active = false;
    document.getElementById('finale').classList.add('hidden');
    document.getElementById('results').classList.add('hidden');
    document.getElementById('hud').style.opacity = '1';
    audio.buy();
    game.newGamePlus();
  },
};

// ------------------------------------------------------------------ boot
scene.setTool(game.s.tool);
scene.setMachines(game.s.machines);
scene.setZoneRadius(game.stationReach);
scene.ground = scene.groundTarget = groundFor(game.s.depth);
audio.setLayer(game.layerIndex);
if (game.s.finished) setTimeout(() => { finale.active = true; document.getElementById('hud').style.opacity = '0'; document.getElementById('finale').classList.remove('hidden'); finale.results(); }, 600);

setInterval(() => { if (!window.__wiped) game.save(); }, 5000);
document.addEventListener('visibilitychange', () => { if (document.hidden && !window.__wiped) game.save(); });
addEventListener('pagehide', () => { if (!window.__wiped) game.save(); });

let last = performance.now();
let frames = 0;
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t; now += dt;
  keyMove();
  game.tick(dt);
  const depositing = scene.inZone() && !game.s.finished && !finale.active;
  game.deposit(dt, depositing);
  if (!hintT && didMove && didDig) hintT = now;
  if ((hintT && now - hintT > 2) || now > 25) document.getElementById('hint').classList.add('gone');
  const st = game.st;
  const full = st.autoSell < 3 && game.s.bagUnits >= st.bagCap - 1e-6;
  const digRate = st.machineRate > 0 && !full && !game.s.finished ? 0.3 + 0.07 * Math.log10(1 + st.machineRate) : 0;
  scene.setDepth(game.visualDepth, skyAt(), groundFor(game.s.depth));
  scene.update(dt, digRate, depositing && game.s.bagUnits > 0);
  ui.update(dt);
  if (++frames === 2) document.getElementById('loading').classList.add('gone');
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__game = game; window.__scene = scene;
