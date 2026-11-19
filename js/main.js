// Wires the game rules, 3D scene, audio and UI together.
import { Game, LAYER_U0 } from './state.js';
import { Scene } from './scene.js';
import { Audio } from './audio.js';
import { UI, fmt, fmtShort, fmtDepth, fmtTime } from './ui.js';
import { LAYERS, TREASURES } from './data.js';

const canvas = document.getElementById('view');
const game = new Game(Game.load());
const s = () => game.s;
const scene = new Scene(canvas, { reduceFx: s().settings.reduceFx });
const audio = new Audio();
audio.setVolumes(s().settings.sfx, s().settings.amb);

const hooks = {
  sell() { audio.unlock(); doSell(); },
  buy(kind, i) {
    audio.unlock();
    const ok = kind === 'tool' ? game.buyTool() : kind === 'bag' ? game.buyBag() : game.buyMachine(i);
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
let lastTapScreen = { x: innerWidth / 2, y: innerHeight / 2 };
let treasureShownAt = -1;
let fullWarnAt = -10;
let now = 0;

function doSell() {
  if (game.s.bagUnits <= 0) return;
  game.sell(false);
}

// ------------------------------------------------------------------ input
function onPointer(e) {
  e.preventDefault();
  audio.unlock();
  if (finale.active) { finale.tap(); return; }
  if (treasureShownAt >= 0) {
    if (now - treasureShownAt > 0.5) { scene.dismissTreasure(); ui.hideTreasure(); treasureShownAt = -1; }
    return;
  }
  if (ui.panel) { ui.close(); return; }
  const x = (e.clientX / innerWidth) * 2 - 1, y = -(e.clientY / innerHeight) * 2 + 1;
  lastTapScreen = { x: e.clientX, y: e.clientY };
  const hit = scene.pick(x, y);
  lastPoint = hit.point;
  scene.swingTool(hit.point);

  if (hit.boulder !== undefined) {
    const r = game.hitBoulder(hit.boulder);
    if (!r) return;
    if (r.smashed) { /* handled by event */ }
    else { scene.hitBoulder(hit.boulder, hit.local, hit.point); audio.boulderHit(); if (r.crit) ui.float(e.clientX, e.clientY - 20, 'CRIT', 'crit small'); }
    return;
  }

  const r = game.tap();
  if (!r) return;
  if (r.full) {
    scene.spawnPuff(hit.point, 0.5, scene.layerPal(), null, 0.2);
    if (now - fullWarnAt > 0.6) { audio.full(); ui.float(e.clientX, e.clientY - 10, 'Bag full', 'small'); fullWarnAt = now; }
    return;
  }
  scene.impact(hit.point, r.amount, r.crit);
  if (r.crit) { audio.crit(game.layerIndex); ui.float(e.clientX, e.clientY - 16, `+${fmtShort(r.dug)}`, 'crit'); }
  else { audio.dig(game.layerIndex); ui.float(e.clientX, e.clientY - 16, `+${fmtShort(r.dug)}`); }
  if (r.coins > 0) ui.float(e.clientX + 30, e.clientY - 46, `+${fmtShort(r.coins)}`, 'coin small');
  if (r.hits > 1) setTimeout(() => audio.dig(game.layerIndex), 70);
}
canvas.addEventListener('pointerdown', onPointer, { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());
document.addEventListener('touchmove', e => { if (e.target === canvas) e.preventDefault(); }, { passive: false });

// ------------------------------------------------------------------ game events
game.on('sell', ({ value, auto, lucky }) => {
  audio.sell(Math.log10(Math.max(10, value)) / 2);
  ui.bumpCoins();
  const b = document.getElementById('sellBtn').getBoundingClientRect();
  const x = b.width ? b.left + b.width / 2 : 90, y = b.width ? b.top : innerHeight - 200;
  ui.float(x, y - 10, `+${fmtShort(value)}`, 'coin');
  if (lucky) ui.toast('LUCKY', 'Double payout!');
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
  active: false, step: 0, timers: [],
  start() {
    this.active = true;
    ui.closeImmediate();
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
  tap() { /* the sequence is timed; taps are ignored until the results card */ },
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
  game.tick(dt);
  const st = game.st;
  const full = st.autoSell < 3 && game.s.bagUnits >= st.bagCap - 1e-6;
  const digRate = st.machineRate > 0 && !full && !game.s.finished ? 0.3 + 0.07 * Math.log10(1 + st.machineRate) : 0;
  scene.setDepth(game.visualDepth, skyAt(), groundFor(game.s.depth));
  scene.update(dt, digRate);
  ui.update(dt);
  if (++frames === 2) document.getElementById('loading').classList.add('gone');
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__game = game; window.__scene = scene;
