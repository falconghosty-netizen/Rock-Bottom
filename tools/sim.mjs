// Headless balance sim: a reasonably smart player tapping ~3/s.
// Run: node ios-game/tools/sim.mjs [crowns]
import { Game, rebuildLayers } from '../js/state.js';
import { LAYERS, MACHINES, TOOLS, BAGS } from '../js/data.js';

const crowns = +(process.argv[2] || 0);
const K = JSON.parse(process.argv[3] || '{}');
import * as D from '../js/data.js';
if (K.ug) LAYERS.forEach((L, i) => { L.units = Math.round(K.u0 * Math.pow(K.ug, i)); });
if (K.vg) LAYERS.forEach((L, i) => { L.value = +(Math.pow(K.vg, i)).toPrecision(3); });
if (K.cs) { TOOLS.forEach(t => t.cost *= K.cs); BAGS.forEach(b => b.cost *= K.cs); MACHINES.forEach(m => m.cost *= K.cs); }
if (K.tg) { TOOLS.forEach((t,k) => t.cost *= Math.pow(K.tg, k)); BAGS.forEach((b,k) => b.cost *= Math.pow(K.tg, k)); MACHINES.forEach((m,i) => m.cost *= Math.pow(K.tg, i*(K.me||1.6))); }
if (K.mg) D.MACHINES.forEach(()=>{}), globalThis.__MG = K.mg;
const TAPS_PER_SEC = 3;
const SELL_DELAY = 1.5;
rebuildLayers();
const g = new Game();
g.s.crowns = crowns;
g.recompute();

const priority = ['t1','m1','h1','g7','t2','m2','h2','g8','t5','m10','h5','h6','f1','f6','t3','t9','m12','m15','g6','g12','t10','m3','m4','m5','m6','m7','m8','h7','g1','g2','g3','g4','g13','t13','m13','h8','g11','h3','h4','h10','h12','f2','f7','f11','f9','f13','f15','f14','f12'];

var step = 0; let t = 0, dt = 0.05, tapAcc = 0, fullFor = 0, bTimer = 0;
const layerTimes = [];
let lastLayer = 0;
g.on('layer', i => { layerTimes.push([LAYERS[i].name, t]); });

function throughput(tapP, mach, cap) {
  const r = tapP * TAPS_PER_SEC + mach;
  return r * cap / (cap + SELL_DELAY * r);
}

while (!g.s.finished && t < 4 * 3600) {
  t += dt; if (process.env.V && (step=(typeof step==="number"?step:0)+1) % 40 === 0) console.log(Math.round(t), "coins", g.s.coins.toExponential(2), "tap", g.st.tapPower.toExponential(2), "mach", g.st.machineRate.toExponential(2), "cap", g.st.bagCap, "L", g.layerIndex, "tool", g.s.tool, "m", g.s.machines.join(""));
  g.tick(dt);
  tapAcc += dt * TAPS_PER_SEC;
  while (tapAcc >= 1) {
    tapAcc -= 1;
    if (g.boulders.length) g.hitBoulder(g.boulders[0].id); else g.tap();
  }
  if (g.s.bagUnits >= g.st.bagCap - 1e-6) { fullFor += dt; if (fullFor > SELL_DELAY) { g.sell(); fullFor = 0; } }
  else fullFor = 0;

  // skills
  for (const id of priority) if (g.skillState(id) === 'available') g.buySkill(id);

  // shopping
  const st = g.st;
  const cur = throughput(st.tapPower, st.machineRate, st.bagCap);
  const opts = [];
  const ratioPow = TOOLS[g.s.tool + 1] ? TOOLS[g.s.tool + 1].power / TOOLS[g.s.tool].power : 1;
  opts.push({ c: g.toolCost(), gain: throughput(st.tapPower * ratioPow, st.machineRate, st.bagCap) - cur, buy: () => g.buyTool() });
  const bagR = BAGS[g.s.bag + 1] ? BAGS[g.s.bag + 1].cap / BAGS[g.s.bag].cap : 1;
  opts.push({ c: g.bagCost(), gain: throughput(st.tapPower, st.machineRate, st.bagCap * bagR) - cur, buy: () => g.buyBag() });
  MACHINES.forEach((m, i) => {
    const L = g.s.machines[i];
    const before = st.machineRates[i];
    const after = L === 0 ? m.base * st.mach[i] * (1 + st.machineMult) * st.machineX * (st.machineRate > 0 ? st.machineRates.find(x => x > 0) / (m.base) * 0 + 1 : 1) : before * ((L + 1) * 1.55) / L;
    const est = L === 0 ? throughput(st.tapPower, st.machineRate + m.base * (st.tapPower / Math.max(1, TOOLS[g.s.tool].power)), st.bagCap) - cur
                        : throughput(st.tapPower, st.machineRate - before + after, st.bagCap) - cur;
    opts.push({ c: g.machCost(i), gain: est, buy: () => g.buyMachine(i) });
  });
  opts.sort((a, b) => b.gain / b.c - a.gain / a.c);
  const best = opts[0];
  if (best && isFinite(best.c) && g.s.coins >= best.c) best.buy();
}

const fmt = s => `${Math.floor(s / 60)}m${String(Math.floor(s % 60)).padStart(2, '0')}s`;
console.log('crowns', crowns, 'finished', g.s.finished, 'at', fmt(t));
let prev = 0;
for (const [n, tt] of layerTimes) { console.log(n.padEnd(14), 'reached', fmt(tt), ' (+' + fmt(tt - prev) + ')'); prev = tt; }
console.log('tool', TOOLS[g.s.tool].name, 'bag', BAGS[g.s.bag].name, 'machines', g.s.machines.join(','));
console.log('skills', g.s.skills.length, 'points', g.pointsEarned(), 'treasures', g.s.treasures.length, 'boulders', g.s.stats.boulders, 'taps', g.s.stats.taps);
const st = g.st;
console.log('tapPower', st.tapPower.toExponential(2), 'machRate', st.machineRate.toExponential(2), 'rates', st.machineRates.map(x=>x.toExponential(1)).join(' '));
console.log('mult', {tapMult: st.tapMult, tapX: st.tapX, machineMult: st.machineMult, machineX: st.machineX, mach: st.mach, digMult: st.digMult, digX: st.digX, layer: st.layer, strata: st.strata, sell: st.sell});
