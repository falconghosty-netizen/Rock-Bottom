// Game state + rules. No DOM, no rendering: main.js wires events to visuals,
// and tools/sim.mjs runs this headless to balance the economy.
import { LAYERS, TOOLS, BAGS, MACHINES, MACHINE_MAX, SKILLS, TREASURES, ACHIEVEMENTS,
         CORE_DEPTH, machineRate, machineCost, STATION, stationDrain, stationReach, stationCost } from './data.js';

const SAVE_KEY = 'rockbottom.save.v1';
export const SKILL_BY_ID = Object.fromEntries(SKILLS.map(s => [s.id, s]));
export const TREASURE_BY_ID = Object.fromEntries(TREASURES.map(t => [t.id, t]));

// layer boundaries in cumulative chunk units
const LAYER_U0 = [];
export let TOTAL_UNITS = 0;
export function rebuildLayers() {
  LAYER_U0.length = 0;
  let acc = 0; for (const L of LAYERS) { LAYER_U0.push(acc); acc += L.units; } LAYER_U0.push(acc);
  TOTAL_UNITS = acc;
}
rebuildLayers();

export function freshState(keep = {}) {
  return {
    v: 1,
    progress: 0,          // chunks dug this run (drives depth)
    depth: 0,
    coins: 0,
    bagUnits: 0,
    bagValue: 0,
    tool: 0,
    bag: 0,
    machines: MACHINES.map(() => 0),
    station: { speed: 0, bonus: 0, reach: 0, lucky: 0 },
    skills: ['root'],
    milestones: 0,        // milestone points earned this run
    layersReached: 1,
    runTime: 0,
    finished: false,
    // persistent across New Game+
    crowns: keep.crowns || 0,
    treasures: keep.treasures || [],
    achievements: keep.achievements || [],
    bestTime: keep.bestTime || 0,
    settings: keep.settings || { sfx: 0.8, amb: 0.6, reduceFx: false },
    stats: keep.stats || { taps: 0, crits: 0, chunks: 0, sells: 0, coinsEarned: 0, boulders: 0, respecs: 0, playTime: 0, runs: 0 },
    seenLayers: [0],
  };
}

export class Game {
  constructor(saved) {
    this.s = saved ? Object.assign(freshState(), saved) : freshState();
    this.s.station = Object.assign({ speed: 0, bonus: 0, reach: 0, lucky: 0 }, this.s.station);
    this.depositing = null;
    this.listeners = {};
    this.boulders = [];   // {id, hp, max, reward}
    this.boulderTimer = 25;
    this.momentumTaps = 0;
    this.momentumTime = 0;
    this.frenzyTime = 0;
    this.lastTapAt = -10;
    this.time = 0;
    this.autoSellTimer = 0;
    this.nextBoulderId = 1;
    this.recompute();
  }

  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); }
  emit(ev, data) { for (const fn of this.listeners[ev] || []) fn(data); }

  // ------------------------------------------------------------------ stats
  recompute() {
    const s = this.s;
    const st = {
      tapMult: 0, tapX: 1, critChance: 0.04, critMult: 10, machineMult: 0, machineX: 1, mach: MACHINES.map(() => 1),
      bagMult: 0, bagX: 1, sellMult: 0, autoSell: 0, luck: 0, luckX: 1, rare: 0.03, rareX: 1, rareMult: 4,
      boulderRate: 0, boulderDmg: 1, boulderReward: 1, boulderMax: 1, boulderFrenzy: 0,
      layer: LAYERS.map(() => 1), digMult: 0, digX: 1, toolDisc: 0, machDisc: 0, bagDisc: 0,
      echo: 0, momentum: 0, critCoins: 0, fault: 0, faultPower: 25, surveyor: 0, strata: 0,
      sellPerTreasure: 0, sellPerLayer: 0, milestoneCoins: 0, bulkBonus: 0, luckyCoin: 0, cheer: 0,
      tapPerMachine: 0, tierBonus: 0, tapMachine: 0, arch: 0,
    };
    const apply = (fx, scale = 1) => {
      for (const [k, v] of Object.entries(fx)) {
        if (k.startsWith('mach_')) { st.mach[MACHINES.findIndex(m => m.id === k.slice(5))] *= 1 + v; continue; }
        if (k.startsWith('layer_')) { st.layer[+k.slice(6)] *= 1 + v; continue; }
        if (k.endsWith('X')) { st[k] *= v; continue; }
        st[k] += v * scale;
      }
    };
    for (const id of s.skills) apply(SKILL_BY_ID[id].fx);
    for (const id of s.treasures) apply(TREASURE_BY_ID[id].bonus, 1 + st.arch);
    st.digMult += s.achievements.length * 0.01;
    const crown = Math.pow(1.5, s.crowns);
    const finishedLayers = Math.max(0, s.layersReached - 1);
    const dig = (1 + st.digMult + st.strata * finishedLayers) * st.digX * crown;
    const machLevels = s.machines.reduce((a, b) => a + b, 0);

    st.tapPower = TOOLS[s.tool].power * (1 + st.tapMult + st.tapPerMachine * machLevels)
      * Math.pow(1 + 0.01 * s.tool, st.tierBonus ? s.tool : 0) * st.tapX * dig;
    st.machineRates = MACHINES.map((m, i) => machineRate(m, s.machines[i]) * st.mach[i] * (1 + st.machineMult) * st.machineX * dig);
    st.machineRate = st.machineRates.reduce((a, b) => a + b, 0);
    st.bagCap = Math.floor(BAGS[s.bag].cap * (1 + st.bagMult) * st.bagX);
    st.sell = (1 + st.sellMult + st.sellPerTreasure * s.treasures.length + st.sellPerLayer * s.layersReached) * crown;
    st.rareP = Math.min(0.6, st.rare * st.rareX);
    st.luckM = (1 + st.luck) * st.luckX;
    st.critP = Math.min(0.75, st.critChance);
    this.st = st;
    this.emit('stats', st);
  }

  get layerIndex() {
    const p = this.s.progress;
    for (let i = LAYERS.length - 1; i >= 0; i--) if (p >= LAYER_U0[i]) return Math.min(i, LAYERS.length - 1);
    return 0;
  }
  layerProgress(i = this.layerIndex) {
    return Math.min(1, (this.s.progress - LAYER_U0[i]) / LAYERS[i].units);
  }
  // continuous "visual depth": layer index + fraction (used by the renderer)
  get visualDepth() { const i = this.layerIndex; return i + this.layerProgress(i); }

  unitValue(i = this.layerIndex) {
    const st = this.st;
    return LAYERS[i].value * (1 + st.rareP * (st.rareMult - 1)) * st.sell;
  }
  layerMult(i = this.layerIndex) { return this.st.layer[i]; }

  // income estimate (coins/s) used for boulder rewards etc.
  incomeRate() {
    const i = this.layerIndex;
    return (this.st.machineRate * this.layerMult(i) + this.st.tapPower * this.layerMult(i) * 3) * this.unitValue(i);
  }

  pointsEarned() {
    return this.s.milestones + (this.st.surveyor ? this.s.layersReached : 0);
  }
  pointsSpent() { return this.s.skills.reduce((a, id) => a + SKILL_BY_ID[id].cost, 0); }
  pointsFree() { return this.pointsEarned() - this.pointsSpent(); }

  // --------------------------------------------------------------- digging
  // Adds `units` chunks to the bag (clamped by space) and advances depth.
  // Returns units actually dug.
  // toCoins: chunks are sold instantly instead of going in the bag.
  dig(units, source, toCoins = false) {
    const s = this.s, st = this.st;
    if (s.finished || units <= 0) return 0;
    const direct = toCoins || st.autoSell >= 3;
    const space = direct ? Infinity : st.bagCap - s.bagUnits;
    if (space <= 1e-9) { this.emit('bagFull'); return 0; }
    let remaining = Math.min(units, space);
    let dug = 0;
    // walk through layers in case we cross a boundary.
    // layer bonuses change how far a chunk takes you, not how much you carry.
    while (remaining > 1e-9 && !s.finished) {
      const i = this.layerIndex;
      const mult = this.layerMult(i);
      const toB = LAYER_U0[i + 1] - s.progress;
      const needed = toB / mult;
      const take = Math.min(remaining, needed);
      const value = take * this.unitValue(i);
      if (direct) this.earn(value);
      else { s.bagUnits += take; s.bagValue += value; }
      s.progress = take >= needed - 1e-9 ? LAYER_U0[i + 1] : s.progress + take * mult;
      s.stats.chunks += take;
      dug += take;
      remaining -= take;
      this.afterProgress();
    }
    s.depth = this.depthFromProgress(s.progress);
    if (source !== 'quiet') this.maybeTreasure(dug, source);
    return dug;
  }

  depthFromProgress(p) {
    const i = Math.min(LAYERS.length - 1, (() => { for (let k = LAYERS.length - 1; k >= 0; k--) if (p >= LAYER_U0[k]) return k; return 0; })());
    const L = LAYERS[i];
    const f = Math.min(1, (p - LAYER_U0[i]) / L.units);
    // ease within the layer so meters feel steady-ish
    return L.from + (L.to - L.from) * f;
  }

  afterProgress() {
    const s = this.s;
    const i = this.layerIndex;
    // layer reached
    if (i + 1 > s.layersReached) {
      s.layersReached = i + 1;
      this.recompute();
      this.emit('layer', i);
    }
    // milestones
    let target = 0;
    for (let k = 0; k < LAYERS.length; k++) {
      const L = LAYERS[k];
      const f = Math.max(0, Math.min(1, (s.progress - LAYER_U0[k]) / L.units));
      target += Math.floor(f * L.points + 1e-9);
    }
    while (s.milestones < target) {
      s.milestones++;
      if (this.st.milestoneCoins) this.earn(this.incomeRate() * this.st.milestoneCoins);
      this.emit('milestone', s.milestones);
    }
    if (s.progress >= TOTAL_UNITS - 1e-6 && !s.finished) {
      s.progress = TOTAL_UNITS;
      s.finished = true;
      s.depth = CORE_DEPTH;
      if (!s.bestTime || s.runTime < s.bestTime) s.bestTime = s.runTime;
      this.checkAchievements();
      this.emit('finish');
    }
  }

  tap() {
    const s = this.s, st = this.st;
    if (s.finished) return null;
    s.stats.taps++;
    this.lastTapAt = this.time;
    if (st.momentum) {
      this.momentumTaps++;
      if (this.momentumTaps >= 40) { this.momentumTaps = 0; this.momentumTime = 6; this.emit('momentum'); }
    }
    let power = st.tapPower * (this.momentumTime > 0 ? 3 : 1) * (this.frenzyTime > 0 ? 2 : 1);
    const crit = Math.random() < st.critP;
    let hits = 1;
    if (st.echo && Math.random() < st.echo) hits = 2;
    let total = power * hits * (crit ? st.critMult : 1);
    let coins = 0, dug = 0;
    if (crit) s.stats.crits++;
    if (crit && st.critCoins) {
      // crit bonus bypasses the bag and is paid out immediately
      const base = power * hits;
      dug = this.dig(base, 'tap');
      const c0 = s.coins;
      dug += this.dig(total - base, 'quiet', true);
      coins = s.coins - c0;
    } else {
      dug = this.dig(total, 'tap');
    }
    if (st.tapMachine) this.dig(st.machineRate * 0.01, 'quiet');
    let fault = false;
    if (st.fault && Math.random() < st.fault) {
      fault = true;
      this.dig(power * st.faultPower, 'tap');
      this.emit('fault');
    }
    return { amount: total, dug, crit, hits, coins, fault, full: dug <= 0 && !coins };
  }

  maybeTreasure(dug, source) {
    if (dug <= 0) return;
    const s = this.s;
    const i = this.layerIndex;
    const left = TREASURES.filter(t => t.layer === i && !s.treasures.includes(t.id));
    if (!left.length) return;
    // chance scales gently with the size of the dig event, per layer pacing
    const base = source === 'tap' ? 0.0015 : 0.0003; // per tap / per machine tick (~10/s)
    const p = base * this.st.luckM;
    if (Math.random() < p) this.giveTreasure(left[Math.floor(Math.random() * left.length)]);
  }

  giveTreasure(t) {
    if (this.s.treasures.includes(t.id)) return;
    this.s.treasures.push(t.id);
    this.recompute();
    this.emit('treasure', t);
  }

  earn(c) {
    this.s.coins += c;
    this.s.stats.coinsEarned += c;
  }

  sell(auto = false) {
    const s = this.s, st = this.st;
    if (s.bagUnits <= 0) return 0;
    let value = s.bagValue;
    const full = s.bagUnits >= st.bagCap - 1e-6;
    if (full && st.bulkBonus) value *= 1 + st.bulkBonus;
    if (auto && st.autoSell === 1) value *= 0.8;
    let lucky = false;
    if (st.luckyCoin && Math.random() < st.luckyCoin) { value *= 2; lucky = true; }
    this.earn(value);
    const units = s.bagUnits;
    s.bagUnits = 0; s.bagValue = 0;
    s.stats.sells++;
    this.emit('sell', { value, units, auto, lucky });
    return value;
  }

  // ------------------------------------------------------------- drop-off station
  get stationReach() { return stationReach(this.s.station.reach); }
  // Called every frame with whether the player stands in the drop zone.
  deposit(dt, inZone) {
    const s = this.s, st = this.st;
    if (inZone && s.bagUnits > 0) {
      if (!this.depositing) this.depositing = { value: 0, units: 0, full: s.bagUnits >= st.bagCap - 1e-6 };
      const rate = Math.max(6, st.bagCap * stationDrain(s.station.speed));
      const take = Math.min(s.bagUnits, rate * dt);
      const frac = take / s.bagUnits;
      let value = s.bagValue * frac;
      s.bagValue -= value; s.bagUnits -= take;
      if (s.bagUnits < 1e-6) { s.bagUnits = 0; s.bagValue = 0; }
      value *= 1 + s.station.bonus * 0.06;
      if (this.depositing.full && st.bulkBonus) value *= 1 + st.bulkBonus;
      this.earn(value);
      this.depositing.value += value; this.depositing.units += take;
      this.emit('depositTick', { value, units: take });
      if (s.bagUnits <= 0) this.finishDeposit();
    } else if (this.depositing) this.finishDeposit();
  }
  finishDeposit() {
    const d = this.depositing; this.depositing = null;
    if (!d || d.units <= 0) return;
    const s = this.s, st = this.st;
    let lucky = false;
    const p = s.station.lucky * 0.05 + (st.luckyCoin || 0);
    if (p > 0 && Math.random() < p) { this.earn(d.value); d.value *= 2; lucky = true; }
    s.stats.sells++;
    this.emit('deposited', { value: d.value, units: d.units, lucky });
  }
  stationUpCost(i) {
    const u = STATION[i], L = this.s.station[u.id];
    return L >= u.max ? Infinity : stationCost(u, L);
  }
  buyStation(i) {
    const c = this.stationUpCost(i); if (this.s.coins < c) return false;
    const u = STATION[i];
    this.s.coins -= c; this.s.station[u.id]++;
    this.emit('buy', { kind: 'station', i, level: this.s.station[u.id] }); return true;
  }

  // ------------------------------------------------------------- shopping
  toolCost(k = this.s.tool + 1) { return TOOLS[k] ? TOOLS[k].cost * (1 - Math.min(0.6, this.st.toolDisc)) : Infinity; }
  bagCost(k = this.s.bag + 1) { return BAGS[k] ? BAGS[k].cost * (1 - Math.min(0.6, this.st.bagDisc)) : Infinity; }
  machCost(i) {
    const L = this.s.machines[i];
    if (L >= MACHINE_MAX) return Infinity;
    return machineCost(MACHINES[i], L) * (1 - Math.min(0.6, this.st.machDisc));
  }
  buyTool() {
    const c = this.toolCost(); if (this.s.coins < c) return false;
    this.s.coins -= c; this.s.tool++; this.recompute(); this.emit('buy', { kind: 'tool', i: this.s.tool }); return true;
  }
  buyBag() {
    const c = this.bagCost(); if (this.s.coins < c) return false;
    this.s.coins -= c; this.s.bag++; this.recompute(); this.emit('buy', { kind: 'bag', i: this.s.bag }); return true;
  }
  buyMachine(i) {
    const c = this.machCost(i); if (this.s.coins < c) return false;
    this.s.coins -= c; this.s.machines[i]++; this.recompute(); this.emit('buy', { kind: 'machine', i, level: this.s.machines[i] }); return true;
  }

  skillState(id) {
    const s = this.s, sk = SKILL_BY_ID[id];
    if (s.skills.includes(id)) return 'owned';
    const reachable = sk.parents.some(p => s.skills.includes(p));
    if (!reachable) return 'locked';
    return this.pointsFree() >= sk.cost ? 'available' : 'reachable';
  }
  buySkill(id) {
    if (this.skillState(id) !== 'available') return false;
    this.s.skills.push(id);
    this.recompute();
    this.emit('skill', id);
    return true;
  }
  respec() {
    this.s.skills = ['root'];
    this.s.stats.respecs++;
    this.recompute();
    this.emit('respec');
  }

  // --------------------------------------------------------------- boulders
  hitBoulder(id) {
    const b = this.boulders.find(b => b.id === id);
    if (!b) return null;
    const crit = Math.random() < this.st.critP;
    const dmg = (crit ? 3 : 1) * this.st.boulderDmg;
    b.hp -= dmg;
    this.s.stats.taps++;
    this.lastTapAt = this.time;
    if (b.hp <= 0) {
      this.boulders = this.boulders.filter(x => x !== b);
      this.s.stats.boulders++;
      const coins = b.reward;
      this.earn(coins);
      if (this.st.boulderFrenzy) this.frenzyTime = 4;
      let treasure = null;
      const left = TREASURES.filter(t => t.layer === this.layerIndex && !this.s.treasures.includes(t.id));
      if (left.length && Math.random() < 0.15 * this.st.luckM) treasure = left[Math.floor(Math.random() * left.length)];
      this.emit('boulderSmash', { id, coins, treasure });
      if (treasure) this.giveTreasure(treasure);
      return { smashed: true, coins, crit };
    }
    return { smashed: false, crit, hp: b.hp, max: b.max };
  }

  spawnBoulder() {
    const i = this.layerIndex;
    const hp = Math.round(8 + i * 2.5 + Math.random() * 4);
    const reward = Math.max(20, this.incomeRate() * (18 + Math.random() * 10)) * this.st.boulderReward;
    const b = { id: this.nextBoulderId++, hp, max: hp, reward, layer: i };
    this.boulders.push(b);
    this.emit('boulderSpawn', b);
  }

  // --------------------------------------------------------------- tick
  tick(dt) {
    const s = this.s, st = this.st;
    this.time += dt;
    if (!s.finished) { s.runTime += dt; }
    s.stats.playTime += dt;
    if (this.momentumTime > 0) this.momentumTime -= dt;
    if (this.frenzyTime > 0) this.frenzyTime -= dt;

    if (!s.finished && st.machineRate > 0) {
      const cheering = st.cheer && this.time - this.lastTapAt < 1.2;
      const rate = st.machineRate * (cheering ? 1 + st.cheer : 1) * (this.frenzyTime > 0 ? 2 : 1);
      this._machAcc = (this._machAcc || 0) + dt;
      // machines dig in ~10 Hz ticks so treasure odds are framerate independent
      while (this._machAcc >= 0.1) {
        this._machAcc -= 0.1;
        this.dig(rate * 0.1, 'machine');
      }
    }

    // auto-sell
    if (st.autoSell >= 1 && st.autoSell < 3 && s.bagUnits >= st.bagCap - 1e-6) {
      this.autoSellTimer += dt;
      if (this.autoSellTimer >= (st.autoSell >= 2 ? 1 : 2)) { this.autoSellTimer = 0; this.sell(true); }
    } else this.autoSellTimer = 0;

    // boulders
    if (!s.finished && s.depth > 3) {
      this.boulderTimer -= dt * (1 + st.boulderRate);
      if (this.boulderTimer <= 0) {
        this.boulderTimer = 35 + Math.random() * 30;
        if (this.boulders.length < st.boulderMax) this.spawnBoulder();
      }
    }

    this._achAcc = (this._achAcc || 0) + dt;
    if (this._achAcc > 1) { this._achAcc = 0; this.checkAchievements(); }
  }

  checkAchievements() {
    const s = this.s;
    let changed = false;
    for (const a of ACHIEVEMENTS) {
      if (s.achievements.includes(a.id)) continue;
      try { if (a.test(s)) { s.achievements.push(a.id); changed = true; this.emit('achievement', a); } } catch {}
    }
    if (changed) this.recompute();
  }

  newGamePlus() {
    const s = this.s;
    s.stats.runs++;
    const keep = { crowns: s.crowns + 1, treasures: s.treasures, achievements: s.achievements, bestTime: s.bestTime, settings: s.settings, stats: s.stats };
    this.s = freshState(keep);
    this.boulders = [];
    this.recompute();
    this.checkAchievements();
    this.emit('reset');
  }

  // --------------------------------------------------------------- saving
  save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.s)); } catch {}
  }
  static load() {
    try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
  static wipe() { try { localStorage.removeItem(SAVE_KEY); } catch {} }
}

export { LAYER_U0 };
