// DOM UI: HUD, panels (shop / skills / finds / menu), toasts, floating numbers, banners.
import { LAYERS, TOOLS, BAGS, MACHINES, MACHINE_MAX, SKILLS, BRANCHES, TREASURES, ACHIEVEMENTS, CORE_DEPTH, machineRate } from './data.js';
import { SKILL_BY_ID } from './state.js';
import * as Models from './models.js';

const $ = (id) => document.getElementById(id);
const SUF = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
export function fmt(n, dec = 2) {
  if (!isFinite(n)) return '∞';
  if (n < 1000) return Math.floor(n).toLocaleString('en-US');
  if (n < 1e6) return Math.floor(n).toLocaleString('en-US');
  const e = Math.min(SUF.length - 1, Math.floor(Math.log10(n) / 3));
  const v = n / Math.pow(1000, e);
  return v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : dec) + SUF[e];
}
export function fmtShort(n) {
  if (n < 10 && n % 1 !== 0) return n.toFixed(1);
  if (n < 1000) return Math.floor(n).toString();
  const e = Math.min(SUF.length - 1, Math.floor(Math.log10(n) / 3));
  const v = n / Math.pow(1000, e);
  return v.toFixed(v >= 100 ? 0 : 1) + SUF[e];
}
export function fmtDepth(m) {
  if (m < 1000) return `${Math.floor(m).toLocaleString('en-US')} m`;
  const km = m / 1000;
  return `${km < 100 ? km.toFixed(1) : Math.floor(km).toLocaleString('en-US')} km`;
}
export function fmtTime(s) {
  s = Math.floor(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${String(sec).padStart(2, '0')}s`;
}

// skill icons (24x24 strokes, centered on 0,0 after translate(-12,-12))
const ICONS = {
  root: 'M12 4v10M8 10l4 4 4-4M6 19h12',
  fist: 'M7 11V8a1.5 1.5 0 0 1 3 0v2M10 10V7a1.5 1.5 0 0 1 3 0v3M13 10V8a1.5 1.5 0 0 1 3 0v3M16 11a1.5 1.5 0 0 1 3 0v2a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6v-2a1.5 1.5 0 0 1 3 0',
  crit: 'M12 3l2 6 6 .5-4.7 3.8L17 20l-5-3.5L7 20l1.7-6.7L4 9.5 10 9z',
  tag: 'M4 12V5a1 1 0 0 1 1-1h7l8 8-8 8zM8.5 8.5h.01',
  bolt: 'M13 3L5 14h6l-1 7 8-11h-6z',
  coin: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v10M9.5 9.5c0-1 1-1.5 2.5-1.5s2.5.6 2.5 1.6c0 2.4-5 1.2-5 3.6 0 1 1 1.6 2.5 1.6s2.5-.6 2.5-1.6',
  echo: 'M8 12a4 4 0 0 1 8 0M5 12a7 7 0 0 1 14 0M11 12h2v6h-2z',
  gear: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1',
  star: 'M12 2l3 6.5 7 .8-5.2 4.8L18.2 21 12 17.4 5.8 21l1.4-6.9L2 9.3l7-.8z',
  bag: 'M7 9V7a5 5 0 0 1 10 0v2M4 9h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z',
  auto: 'M4 12a8 8 0 0 1 14-5.3M20 4v4h-4M20 12a8 8 0 0 1-14 5.3M4 20v-4h4',
  gem: 'M6 3h12l4 6-10 12L2 9zM2 9h20M9 3l3 18M15 3l-3 18',
  mole: 'M12 6c4 0 7 3 7 7s-3 6-7 6-7-2-7-6 3-7 7-7zM9 11h.01M15 11h.01M12 14v2',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  boulder: 'M5 18l-2-5 3-6 6-3 6 2 3 6-2 6zM9 9l2 3M15 8l-1 4',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5',
  flag: 'M5 21V4M5 4h12l-3 4 3 4H5',
};

export class UI {
  constructor(game, scene, audio, hooks) {
    this.g = game; this.scene = scene; this.audio = audio; this.hooks = hooks;
    this.thumbs = new Map();
    this.panel = null;
    this.last = {};
    this.floatPool = [];
    this.bindHud();
    this.buildTree();
  }

  // ------------------------------------------------------------ HUD
  bindHud() {
    $('sellBtn').addEventListener('pointerdown', (e) => { e.stopPropagation(); this.hooks.sell(); });
    document.querySelectorAll('.navbtn').forEach(b => b.addEventListener('click', () => { this.audio.ui(); this.open(b.dataset.panel); }));
    $('menuBtn').addEventListener('click', () => { this.audio.ui(); this.open('menu'); });
    $('sheetClose').addEventListener('click', () => this.close());
    $('treeClose').addEventListener('click', () => this.close());
    $('respecBtn').addEventListener('click', () => {
      if (this.g.s.skills.length <= 1) return;
      if (this.respecArmed) { this.g.respec(); this.respecArmed = false; $('respecBtn').textContent = 'Reset'; this.renderTree(); this.audio.buy(); }
      else { this.respecArmed = true; $('respecBtn').textContent = 'Tap again'; setTimeout(() => { this.respecArmed = false; $('respecBtn').textContent = 'Reset'; }, 2500); }
    });
  }

  update(dt) {
    const g = this.g, s = g.s, st = g.st;
    const L = this.last;
    const coinsTxt = fmt(s.coins);
    if (coinsTxt !== L.coins) { $('coinVal').textContent = coinsTxt; L.coins = coinsTxt; }
    const dTxt = fmtDepth(s.depth);
    if (dTxt !== L.depth) { $('depth').textContent = dTxt; L.depth = dTxt; }
    const li = g.layerIndex;
    if (li !== L.layer) { $('layerName').textContent = LAYERS[li].name; L.layer = li; }
    const rate = st.machineRate * g.layerMult(li) * g.unitValue(li);
    const rTxt = rate > 0 ? `+${fmtShort(rate)}/s` : 'tap to dig';
    if (rTxt !== L.rate) { $('rate').textContent = rTxt; L.rate = rTxt; }

    const auto = st.autoSell >= 3;
    const frac = auto ? 0 : Math.min(1, s.bagUnits / st.bagCap);
    const bagFill = (frac * 100).toFixed(1) + '%';
    if (bagFill !== L.bagFill) { $('bagBar').firstElementChild.style.height = bagFill; L.bagFill = bagFill; }
    $('bagBar').classList.toggle('full', frac >= 0.999);
    const bt = auto ? 'conveyor' : `${fmtShort(s.bagUnits)} / ${fmtShort(st.bagCap)}`;
    if (bt !== L.bt) { $('bagText').textContent = bt; L.bt = bt; }
    const showSell = !auto && s.bagUnits > 0 && (frac > 0.25 || s.bagValue > 0 && st.machineRate === 0);
    $('sellBtn').classList.toggle('hidden', !showSell);
    $('sellBtn').classList.toggle('urgent', frac >= 0.999);
    if (showSell) { const sv = '+' + fmtShort(s.bagValue); if (sv !== L.sv) { $('sellVal').textContent = sv; L.sv = sv; } }

    // progress to next skill point
    const pf = this.hooks.nextPointFrac();
    const pTxt = (pf * 100).toFixed(1) + '%';
    if (pTxt !== L.pf) { $('ptBar').firstElementChild.style.height = pTxt; L.pf = pTxt; }
    const free = g.pointsFree();
    if (free !== L.free) { $('ptBadge').textContent = free; $('ptBadge').classList.toggle('hidden', free <= 0); L.free = free; }

    let boost = '';
    if (g.momentumTime > 0) boost = `MOMENTUM ×3 · ${g.momentumTime.toFixed(1)}s`;
    else if (g.frenzyTime > 0) boost = `FRENZY ×2 · ${g.frenzyTime.toFixed(1)}s`;
    if (boost !== L.boost) { $('boost').textContent = boost; $('boost').classList.toggle('hidden', !boost); L.boost = boost; }

    this.updateFloats(dt);
    this.updateBoulderBars();
    if (this.panel && (this._refreshT = (this._refreshT || 0) + dt) > 0.25) { this._refreshT = 0; this.refreshPanel(); }
  }

  bumpCoins() { const c = $('coins'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }

  // ------------------------------------------------------------ floating numbers
  float(x, y, text, cls = '') {
    let el = this.floatPool.find(f => !f.alive);
    if (!el) {
      if (this.floatPool.length > 40) el = this.floatPool[0];
      else { const d = document.createElement('div'); $('floaters').appendChild(d); el = { d, alive: false }; this.floatPool.push(el); }
    }
    el.alive = true; el.t = 0; el.x = x + (Math.random() - 0.5) * 30; el.y = y; el.vx = (Math.random() - 0.5) * 40; el.dur = cls.includes('crit') ? 1.1 : 0.85;
    el.d.className = 'float ' + cls; el.d.textContent = text; el.d.style.opacity = '1';
  }
  updateFloats(dt) {
    for (const f of this.floatPool) {
      if (!f.alive) continue;
      f.t += dt;
      const k = f.t / f.dur;
      if (k >= 1) { f.alive = false; f.d.style.opacity = '0'; continue; }
      const y = f.y - 70 * (1 - Math.pow(1 - k, 2)), x = f.x + f.vx * k;
      const sc = k < 0.15 ? 0.6 + k / 0.15 * 0.5 : 1.1 - Math.min(0.1, (k - 0.15));
      f.d.style.transform = `translate(${x}px, ${y}px) translate(-50%,-50%) scale(${sc})`;
      f.d.style.opacity = String(k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1);
    }
  }

  // ------------------------------------------------------------ boulders HP
  updateBoulderBars() {
    const host = $('boulderBars');
    const live = new Set();
    for (const b of this.g.boulders) {
      live.add(String(b.id));
      let el = host.querySelector(`[data-b="${b.id}"]`);
      if (!el) { el = document.createElement('div'); el.className = 'bHP'; el.dataset.b = b.id; el.innerHTML = '<i></i>'; host.appendChild(el); }
      const p = this.scene.boulderScreenPos(b.id);
      if (!p || b.hp === b.max) { el.style.display = 'none'; continue; }
      el.style.display = '';
      el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
      el.firstChild.style.width = (Math.max(0, b.hp / b.max) * 100) + '%';
    }
    host.querySelectorAll('.bHP').forEach(el => { if (!live.has(el.dataset.b)) el.remove(); });
  }

  // ------------------------------------------------------------ toasts / banners
  toast(label, text, cls = '') {
    const el = document.createElement('div');
    el.className = 'toast ' + cls;
    el.innerHTML = `<b>${label}</b><span>${text}</span>`;
    $('toasts').appendChild(el);
    while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 450); }, 2600);
  }
  banner(small, big, depth) {
    const b = $('banner');
    $('bannerSmall').textContent = small; $('bannerBig').textContent = big; $('bannerDepth').textContent = depth;
    b.classList.add('hidden'); void b.offsetWidth; b.classList.remove('hidden');
    clearTimeout(this._bannerT); this._bannerT = setTimeout(() => b.classList.add('hidden'), 3700);
  }
  showTreasure(t) {
    $('tName').textContent = t.name; $('tBonus').textContent = t.text;
    $('treasureCard').classList.remove('hidden');
  }
  hideTreasure() { $('treasureCard').classList.add('hidden'); }

  // ------------------------------------------------------------ thumbnails
  thumbFor(key, build, opts) {
    if (this.thumbs.has(key)) return this.thumbs.get(key);
    const url = this.scene.thumb(build(), 128, opts);
    this.thumbs.set(key, url);
    return url;
  }

  // ------------------------------------------------------------ panels
  open(name) {
    if (this.panel === name) return this.close();
    this.closeImmediate();
    this.panel = name;
    if (name === 'skills') { $('tree').classList.remove('hidden'); this.renderTree(); this.centerTree(); return; }
    $('sheet').classList.remove('hidden', 'closing');
    this.tab = { shop: this.tab_shop || 'tools', finds: 'finds', menu: this.tab_menu || 'feats' }[name];
    this.renderSheet();
  }
  close() {
    this.audio.ui();
    if (this.panel === 'skills') { $('tree').classList.add('hidden'); $('nodeCard').classList.add('hidden'); this.panel = null; return; }
    if (!this.panel) return;
    const sh = $('sheet'); sh.classList.add('closing');
    this.panel = null;
    setTimeout(() => { if (!this.panel) sh.classList.add('hidden'); sh.classList.remove('closing'); }, 200);
  }
  closeImmediate() { $('sheet').classList.add('hidden'); $('tree').classList.add('hidden'); $('nodeCard').classList.add('hidden'); this.panel = null; }

  renderSheet() {
    const name = this.panel;
    const tabs = { shop: [['tools', 'Tools'], ['machines', 'Machines'], ['bags', 'Bags']], finds: [], menu: [['feats', 'Feats'], ['stats', 'Stats'], ['settings', 'Settings']] }[name];
    $('sheetTitle').textContent = { shop: 'Shop', finds: 'Finds', menu: 'Menu' }[name];
    const tabsEl = $('sheetTabs');
    tabsEl.innerHTML = '';
    tabsEl.classList.toggle('hidden', !tabs.length);
    for (const [id, label] of tabs) {
      const b = document.createElement('button'); b.className = 'tab' + (this.tab === id ? ' on' : ''); b.textContent = label;
      b.onclick = () => { this.audio.ui(); this.tab = id; this['tab_' + name] = id; this.renderSheet(); };
      tabsEl.appendChild(b);
    }
    const body = $('sheetBody');
    body.innerHTML = '';
    body.scrollTop = 0;
    if (name === 'shop') this.renderShop(body);
    if (name === 'finds') this.renderFinds(body);
    if (name === 'menu') this.renderMenu(body);
  }

  refreshPanel() {
    if (this.panel !== 'shop') return;
    document.querySelectorAll('#sheetBody .buy[data-cost]').forEach(b => {
      const c = +b.dataset.cost;
      b.classList.toggle('no', this.g.s.coins < c);
    });
  }

  row({ thumb, name, stat, blurb, cost, done, pips, onBuy }) {
    const r = document.createElement('div'); r.className = 'row';
    r.innerHTML = `<div class="thumb">${thumb ? `<img src="${thumb}" alt="">` : ''}</div><div class="info"><div class="name"></div><div class="stat"></div>${blurb ? '<div class="blurb"></div>' : ''}${pips ? '<div class="pips"></div>' : ''}</div>`;
    r.querySelector('.name').textContent = name;
    r.querySelector('.stat').textContent = stat;
    if (blurb) r.querySelector('.blurb').textContent = blurb;
    if (pips) r.querySelector('.pips').innerHTML = Array.from({ length: pips[1] }, (_, i) => `<i class="${i < pips[0] ? 'on' : ''}"></i>`).join('');
    const b = document.createElement('button');
    if (done) { b.className = 'buy done'; b.textContent = done; }
    else { b.className = 'buy' + (this.g.s.coins < cost ? ' no' : ''); b.dataset.cost = cost; b.textContent = fmtShort(cost); b.onclick = () => onBuy(); }
    r.appendChild(b);
    return r;
  }

  renderShop(body) {
    const g = this.g, s = g.s;
    if (this.tab === 'tools') {
      const cur = TOOLS[s.tool];
      body.appendChild(this.label('Equipped'));
      body.appendChild(this.row({ thumb: this.thumbFor('tool' + s.tool, () => Models.buildTool(cur.id).group, { rx: 0.2, ry: 0.9, rz: -0.7 }), name: cur.name, stat: `${fmtShort(g.st.tapPower)} dirt per tap`, blurb: cur.blurb, done: 'IN HAND' }));
      if (s.tool + 1 < TOOLS.length) {
        body.appendChild(this.label('Next upgrade'));
        const nx = TOOLS[s.tool + 1];
        body.appendChild(this.row({ thumb: this.thumbFor('tool' + (s.tool + 1), () => Models.buildTool(nx.id).group, { rx: 0.2, ry: 0.9, rz: -0.7 }), name: nx.name, stat: `${nx.power}× base power (now ${cur.power}×)`, blurb: nx.blurb, cost: g.toolCost(), onBuy: () => this.hooks.buy('tool') }));
      }
      const later = TOOLS.slice(s.tool + 2, s.tool + 4);
      if (later.length) { body.appendChild(this.label('Later')); later.forEach(t => body.appendChild(this.row({ thumb: null, name: '???', stat: 'Keep digging', done: '—' }))); }
    } else if (this.tab === 'machines') {
      body.appendChild(this.note('Machines dig for you, even when you are not tapping. They stop when your bag is full.'));
      MACHINES.forEach((m, i) => {
        const L = s.machines[i];
        const locked = i > 0 && s.machines[i - 1] === 0 && L === 0;
        if (locked) { body.appendChild(this.row({ thumb: null, name: '???', stat: `Hire the ${MACHINES[i - 1].name} first`, done: '—' })); return; }
        const now = g.st.machineRates[i] * g.layerMult();
        const next = L < MACHINE_MAX ? machineRate(m, L + 1) / Math.max(1e-9, machineRate(m, L) || m.base) : 0;
        body.appendChild(this.row({
          thumb: this.thumbFor('m' + i, () => this.machineThumb(i)), name: m.name,
          stat: L ? `${fmtShort(now)} dirt/s` : `Digs ${fmtShort(m.base)}+ dirt/s`, blurb: m.blurb, pips: [L, MACHINE_MAX],
          cost: g.machCost(i), done: L >= MACHINE_MAX ? 'MAXED' : null, onBuy: () => this.hooks.buy('machine', i),
        }));
      });
    } else {
      const cur = BAGS[s.bag];
      body.appendChild(this.label('Carrying'));
      body.appendChild(this.row({ thumb: this.thumbFor('bag' + s.bag, () => Models.buildBag(s.bag)), name: cur.name, stat: `Holds ${fmtShort(g.st.bagCap)} dirt`, done: 'IN USE' }));
      if (s.bag + 1 < BAGS.length) {
        const nx = BAGS[s.bag + 1];
        body.appendChild(this.label('Next upgrade'));
        body.appendChild(this.row({ thumb: this.thumbFor('bag' + (s.bag + 1), () => Models.buildBag(s.bag + 1)), name: nx.name, stat: `Base size ${fmtShort(nx.cap)} (now ${fmtShort(cur.cap)})`, cost: g.bagCost(), onBuy: () => this.hooks.buy('bag') }));
      }
    }
  }
  machineThumb(i) {
    switch (MACHINES[i].id) {
      case 'moles': return Models.buildMole(true, 1);
      case 'buckets': { const b = Models.buildBucket(); b.children.find(c => c.geometry && c.geometry.parameters && c.geometry.parameters.height === 30).visible = false; return b; }
      case 'digger': { const e = Models.buildExcavator(); e.userData.boom.rotation.z = 0.5; e.userData.stick.rotation.z = -0.9; return e; }
      case 'steam': return Models.buildSteamDrill();
      case 'borer': return Models.buildBorer();
      default: { const g = Models.buildLaser(); return g; }
    }
  }
  label(t) { const d = document.createElement('div'); d.className = 'sectionLabel'; d.innerHTML = `<span>${t}</span>`; return d; }
  note(t) { const d = document.createElement('div'); d.className = 'note'; d.textContent = t; return d; }

  renderFinds(body) {
    const s = this.g.s;
    const head = this.label(`Collection`);
    head.innerHTML += `<span>${s.treasures.length} / ${TREASURES.length}</span>`;
    body.appendChild(head);
    body.appendChild(this.note('Every find gives a permanent bonus that carries over to New Game+.'));
    const info = document.createElement('div'); info.className = 'findInfo';
    info.innerHTML = '<div class="name">Tap a find</div><div class="stat">See where it was buried and what it does.</div>';
    LAYERS.forEach((L, li) => {
      const lab = this.label(L.name); body.appendChild(lab);
      const grid = document.createElement('div'); grid.className = 'grid';
      TREASURES.filter(t => t.layer === li).forEach(t => {
        const got = s.treasures.includes(t.id);
        const cell = document.createElement('button'); cell.className = 'find' + (got ? '' : ' locked');
        grid.appendChild(cell);
        const fill = () => { cell.innerHTML = `<img src="${this.thumbFor('t' + t.id, () => Models.buildTreasure(t))}" alt="">`; };
        // render thumbnails progressively so the panel opens instantly
        if (this.thumbs.has('t' + t.id)) fill(); else setTimeout(fill, 30 + Math.random() * 400);
        cell.onclick = () => {
          this.audio.ui();
          body.querySelectorAll('.find.sel').forEach(e => e.classList.remove('sel')); cell.classList.add('sel');
          info.innerHTML = got ? `<div class="name">${t.name}</div><div class="stat">${t.text} · found in ${L.name}</div>` : `<div class="name">???</div><div class="stat">Buried somewhere in the ${L.name}. Boulders hide them too.</div>`;
          info.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        };
      });
      body.appendChild(grid);
    });
    body.appendChild(info);
  }

  renderMenu(body) {
    const g = this.g, s = g.s;
    if (this.tab === 'feats') {
      const head = this.label('Achievements'); head.innerHTML += `<span>${s.achievements.length} / ${ACHIEVEMENTS.length}</span>`; body.appendChild(head);
      body.appendChild(this.note('Each one makes all digging 1% faster, forever.'));
      for (const a of ACHIEVEMENTS) {
        const got = s.achievements.includes(a.id);
        const d = document.createElement('div'); d.className = 'ach' + (got ? ' got' : '');
        d.innerHTML = `<div class="dot">${got ? '<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>' : ''}</div><div><div class="name"></div><div class="stat"></div></div>`;
        d.querySelector('.name').textContent = a.name; d.querySelector('.stat').textContent = a.desc;
        body.appendChild(d);
      }
    } else if (this.tab === 'stats') {
      const st = s.stats;
      const rows = [
        ['This run', fmtTime(s.runTime)], ['Best time to the core', s.bestTime ? fmtTime(s.bestTime) : '—'], ['Crowns', s.crowns + (s.crowns ? ` (×${Math.pow(1.5, s.crowns).toFixed(2)})` : '')],
        ['Depth', fmtDepth(s.depth)], ['Total taps', fmt(st.taps)], ['Critical hits', fmt(st.crits)], ['Dirt dug', fmt(st.chunks)],
        ['Bags sold', fmt(st.sells)], ['Coins earned', fmt(st.coinsEarned)], ['Boulders smashed', fmt(st.boulders)],
        ['Treasures', `${s.treasures.length} / ${TREASURES.length}`], ['Skills unlocked', String(s.skills.length - 1)], ['Total play time', fmtTime(st.playTime)],
      ];
      for (const [k, v] of rows) { const d = document.createElement('div'); d.className = 'statRow'; d.innerHTML = `<span>${k}</span><span>${v}</span>`; body.appendChild(d); }
    } else {
      const set = s.settings;
      const slider = (label, key) => {
        const d = document.createElement('div'); d.className = 'setRow';
        d.innerHTML = `<span>${label}</span><input type="range" min="0" max="1" step="0.01" value="${set[key]}">`;
        d.querySelector('input').oninput = (e) => { set[key] = +e.target.value; this.hooks.settings(); };
        return d;
      };
      body.appendChild(slider('Sound effects', 'sfx'));
      body.appendChild(slider('Ambience', 'amb'));
      const tg = document.createElement('div'); tg.className = 'setRow';
      tg.innerHTML = `<span>Reduce effects<br><small style="color:var(--mute);font-weight:500;font-size:12px">Less shake, fewer particles, saves battery</small></span><button class="toggle ${set.reduceFx ? 'on' : ''}"></button>`;
      tg.querySelector('.toggle').onclick = (e) => { set.reduceFx = !set.reduceFx; e.currentTarget.classList.toggle('on', set.reduceFx); this.hooks.settings(true); };
      body.appendChild(tg);
      body.appendChild(this.note('Progress saves automatically on this device. Deleting the Home Screen app deletes the save. If there is no sound, check the silent switch on the side of your phone.'));
      const wipe = document.createElement('button'); wipe.className = 'pill danger'; wipe.style.marginTop = '12px'; wipe.textContent = 'Erase save and start over';
      wipe.onclick = () => {
        if (wipe.dataset.armed) { this.hooks.wipe(); return; }
        wipe.dataset.armed = '1'; wipe.textContent = 'Tap again to erase everything';
        setTimeout(() => { delete wipe.dataset.armed; wipe.textContent = 'Erase save and start over'; }, 3000);
      };
      body.appendChild(wipe);
    }
  }

  // ------------------------------------------------------------ skill tree
  buildTree() {
    const svg = $('treeSvg');
    const NS = 'http://www.w3.org/2000/svg';
    const R = 86;
    this.nodePos = {};
    for (const sk of SKILLS) {
      if (!sk.branch) { this.nodePos[sk.id] = [0, 0]; continue; }
      const br = BRANCHES.find(b => b.id === sk.branch);
      const ang = (br.angle + sk.a) * Math.PI / 180;
      const r = sk.r * R + (sk.keystone ? 10 : 0);
      this.nodePos[sk.id] = [Math.cos(ang) * r, Math.sin(ang) * r];
    }
    const world = document.createElementNS(NS, 'g'); world.id = 'treeWorld'; svg.appendChild(world);
    const links = document.createElementNS(NS, 'g'); world.appendChild(links);
    const labels = document.createElementNS(NS, 'g'); world.appendChild(labels);
    const nodes = document.createElementNS(NS, 'g'); world.appendChild(nodes);
    for (const br of BRANCHES) {
      const a = br.angle * Math.PI / 180, r = 8.25 * R;
      const t = document.createElementNS(NS, 'text'); t.setAttribute('class', 'tBranchLabel'); t.setAttribute('x', Math.cos(a) * r); t.setAttribute('y', Math.sin(a) * r + 5); t.textContent = br.name.toUpperCase();
      labels.appendChild(t);
    }
    this.linkEls = [];
    for (const sk of SKILLS) for (const p of sk.parents) {
      const [x1, y1] = this.nodePos[p], [x2, y2] = this.nodePos[sk.id];
      const l = document.createElementNS(NS, 'line');
      l.setAttribute('x1', x1); l.setAttribute('y1', y1); l.setAttribute('x2', x2); l.setAttribute('y2', y2);
      l.setAttribute('class', 'tLink'); links.appendChild(l);
      this.linkEls.push({ el: l, from: p, to: sk.id });
    }
    this.nodeEls = {};
    for (const sk of SKILLS) {
      const [x, y] = this.nodePos[sk.id];
      const size = sk.keystone ? 30 : sk.id === 'root' ? 28 : 22;
      const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'tNode'); g.setAttribute('transform', `translate(${x},${y})`); g.dataset.id = sk.id;
      g.innerHTML = `<circle class="pulse" r="${size}"/><circle class="ring" r="${size + 6}"/><circle class="bg" r="${size}"/><g transform="scale(${sk.keystone ? 1.2 : 1}) translate(-12,-12)"><path class="ico" d="${ICONS[sk.icon] || ICONS.star}"/></g>`;
      nodes.appendChild(g);
      this.nodeEls[sk.id] = g;
    }
    // pan / pinch
    this.view = { x: 0, y: 0, s: 0.8 };
    const ptrs = new Map();
    let start = null, moved = 0;
    svg.addEventListener('pointerdown', (e) => {
      svg.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = 0;
      start = { view: { ...this.view }, pts: [...ptrs.values()].map(p => ({ ...p })) };
    });
    svg.addEventListener('pointermove', (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pts = [...ptrs.values()];
      if (pts.length === 1 && start.pts.length === 1) {
        const dx = pts[0].x - start.pts[0].x, dy = pts[0].y - start.pts[0].y;
        moved = Math.max(moved, Math.hypot(dx, dy));
        this.view.x = start.view.x + dx; this.view.y = start.view.y + dy;
      } else if (pts.length >= 2 && start.pts.length >= 2) {
        const d0 = Math.hypot(start.pts[0].x - start.pts[1].x, start.pts[0].y - start.pts[1].y);
        const d1 = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const c0 = { x: (start.pts[0].x + start.pts[1].x) / 2, y: (start.pts[0].y + start.pts[1].y) / 2 };
        const c1 = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
        const ns = Math.min(2.2, Math.max(0.35, start.view.s * d1 / d0));
        const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
        // keep the pinch centre fixed
        const wx = (c0.x - cx - start.view.x) / start.view.s, wy = (c0.y - cy - start.view.y) / start.view.s;
        this.view.s = ns; this.view.x = c1.x - cx - wx * ns; this.view.y = c1.y - cy - wy * ns;
        moved = 99;
      }
      this.applyView();
    });
    const up = (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.delete(e.pointerId);
      if (ptrs.size === 0 && moved < 8) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const node = el && el.closest && el.closest('.tNode');
        if (node) this.selectNode(node.dataset.id); else $('nodeCard').classList.add('hidden'), this.selectNode(null);
      }
      start = { view: { ...this.view }, pts: [...ptrs.values()].map(p => ({ ...p })) };
    };
    svg.addEventListener('pointerup', up);
    svg.addEventListener('pointercancel', up);
    svg.addEventListener('wheel', (e) => { e.preventDefault(); this.view.s = Math.min(2.2, Math.max(0.35, this.view.s * (e.deltaY < 0 ? 1.1 : 0.9))); this.applyView(); }, { passive: false });
    $('ncBuy').addEventListener('click', () => {
      if (!this.selected) return;
      if (this.g.buySkill(this.selected)) { this.audio.skill(); this.renderTree(); this.selectNode(this.selected); }
      else this.audio.deny();
    });
  }
  centerTree() {
    const w = window.innerWidth, h = window.innerHeight;
    this.view.s = Math.max(0.42, Math.min(w, h - 200) / (9.5 * 86));
    this.view.x = 0; this.view.y = 10;
    this.applyView();
  }
  applyView() {
    const w = window.innerWidth, h = window.innerHeight;
    $('treeWorld').setAttribute('transform', `translate(${w / 2 + this.view.x},${h / 2 + this.view.y}) scale(${this.view.s})`);
  }
  renderTree() {
    const g = this.g;
    $('treePts').textContent = g.pointsFree();
    for (const sk of SKILLS) this.nodeEls[sk.id].setAttribute('class', 'tNode ' + g.skillState(sk.id) + (this.selected === sk.id ? ' sel' : ''));
    for (const l of this.linkEls) {
      const a = g.s.skills.includes(l.from), b = g.s.skills.includes(l.to);
      l.el.setAttribute('class', 'tLink' + (a && b ? ' on' : a ? ' reach' : ''));
    }
  }
  selectNode(id) {
    this.selected = id;
    this.renderTree();
    if (!id) return;
    const sk = SKILL_BY_ID[id], st = this.g.skillState(id);
    this.audio.ui();
    $('nodeCard').classList.remove('hidden');
    $('ncName').textContent = sk.name.charAt(0) + sk.name.slice(1);
    $('ncBranch').textContent = sk.branch ? BRANCHES.find(b => b.id === sk.branch).name + (sk.keystone ? ' · keystone' : '') : 'Start';
    $('ncCost').textContent = sk.cost ? `${sk.cost} pt${sk.cost > 1 ? 's' : ''}` : '';
    $('ncDesc').textContent = sk.desc;
    const b = $('ncBuy');
    b.disabled = st !== 'available';
    b.textContent = st === 'owned' ? 'Unlocked' : st === 'locked' ? 'Unlock a connected skill first' : st === 'reachable' ? `Need ${sk.cost - this.g.pointsFree()} more point${sk.cost - this.g.pointsFree() > 1 ? 's' : ''}` : `Unlock for ${sk.cost} pt${sk.cost > 1 ? 's' : ''}`;
  }

  // ------------------------------------------------------------ finale
  dialog(who, text) {
    const d = $('dialog');
    d.style.opacity = 0;
    setTimeout(() => { d.innerHTML = `${who ? `<span class="who">${who}</span>` : ''}${text}`; d.style.opacity = 1; }, 250);
  }
  results(stats, onNext) {
    const r = $('results');
    r.classList.remove('hidden');
    r.innerHTML = `<h2>Rock Bottom.</h2><div class="lead">You dug 6,371 km to the centre of the Earth.</div>` +
      stats.map(([k, v]) => `<div class="statRow"><span>${k}</span><span>${v}</span></div>`).join('') +
      `<button class="pill" id="ngBtn">New Game+ &nbsp;·&nbsp; Crown ×1.5</button>`;
    $('ngBtn').onclick = onNext;
  }
}
