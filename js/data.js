// All static game data: layers, tools, bags, machines, skill tree, treasures, achievements.

export const CORE_DEPTH = 6371000; // meters

// units = how many "chunks" it takes to dig through the layer.
// value = coins per chunk. points = skill points spread evenly through the layer.
export const LAYERS = [
  { id: 'topsoil', name: 'Topsoil',       from: 0,       to: 60,      units: 2000,      value: 1,     points: 6,
    material: 'Dirt',        rare: 'Earthworm Castings',
    // shader palette: base, dark, light, pebble, accent, glow (0..1)
    pal: { base: [0.58,0.36,0.23], dark: [0.30,0.17,0.10], light: [0.76,0.52,0.35], peb: [0.80,0.77,0.72], acc: [0.42,0.40,0.30], glow: 0, rough: 0.92, metal: 0 },
    sky: 1.0 },
  { id: 'clay',    name: 'Clay',          from: 60,      to: 500,     units: 14000,     value: 2.3,     points: 8,
    material: 'Clay',        rare: 'Red Ochre',
    pal: { base: [0.74,0.40,0.22], dark: [0.47,0.21,0.11], light: [0.88,0.57,0.35], peb: [0.85,0.80,0.72], acc: [0.65,0.35,0.22], glow: 0, rough: 0.78, metal: 0 },
    sky: 0.62 },
  { id: 'stone',   name: 'Bedrock',       from: 500,     to: 4000,    units: 180000,     value: 5.29,    points: 10,
    material: 'Stone',       rare: 'Iron Ore',
    pal: { base: [0.45,0.44,0.43], dark: [0.28,0.28,0.28], light: [0.60,0.59,0.57], peb: [0.62,0.55,0.48], acc: [0.40,0.42,0.46], glow: 0, rough: 0.7, metal: 0 },
    sky: 0.32 },
  { id: 'fossil',  name: 'Fossil Beds',   from: 4000,    to: 25000,   units: 800000,    value: 12,    points: 11,
    material: 'Shale',       rare: 'Amber',
    pal: { base: [0.68,0.63,0.53], dark: [0.49,0.44,0.36], light: [0.84,0.80,0.71], peb: [0.92,0.89,0.81], acc: [0.80,0.58,0.25], glow: 0, rough: 0.85, metal: 0 },
    sky: 0.16 },
  { id: 'crystal', name: 'Crystal Caves', from: 25000,   to: 120000,  units: 5800000,   value: 28,   points: 12,
    material: 'Quartz',      rare: 'Amethyst',
    pal: { base: [0.21,0.22,0.28], dark: [0.11,0.11,0.15], light: [0.33,0.34,0.43], peb: [0.55,0.75,0.95], acc: [0.55,0.78,1.00], glow: 0.5, rough: 0.45, metal: 0 },
    sky: 0.06 },
  { id: 'ruins',   name: 'Sunken Ruins',  from: 120000,  to: 660000,  units: 33600000,  value: 64,   points: 13,
    material: 'Old Brick',   rare: 'Gold Leaf',
    pal: { base: [0.47,0.43,0.35], dark: [0.30,0.27,0.21], light: [0.62,0.58,0.48], peb: [0.40,0.55,0.50], acc: [0.85,0.70,0.35], glow: 0.1, rough: 0.85, metal: 0 },
    sky: 0.02 },
  { id: 'magma',   name: 'Magma Mantle',  from: 660000,  to: 2900000, units: 90000000,  value: 148,  points: 14,
    material: 'Basalt',      rare: 'Fire Opal',
    pal: { base: [0.16,0.13,0.12], dark: [0.07,0.06,0.06], light: [0.27,0.22,0.19], peb: [0.95,0.45,0.15], acc: [1.00,0.32,0.06], glow: 1.0, rough: 0.65, metal: 0 },
    sky: 0.0 },
  { id: 'core',    name: 'Inner Core',    from: 2900000, to: CORE_DEPTH, units: 1800000000, value: 340, points: 16,
    material: 'Core Iron',   rare: 'Star Metal',
    pal: { base: [0.50,0.40,0.30], dark: [0.30,0.22,0.15], light: [0.72,0.58,0.40], peb: [0.95,0.80,0.50], acc: [1.00,0.65,0.25], glow: 0.8, rough: 0.45, metal: 0.55 },
    sky: 0.0 },
];

// Tap tools. power = chunks per tap.
export const TOOLS = [
  { id: 'hands',    name: 'Bare Hands',      power: 1,     cost: 0,      blurb: 'Fingernails. Determination.' },
  { id: 'spoon',    name: 'Soup Spoon',      power: 2,     cost: 48,     blurb: 'Borrowed from the kitchen. Not returning it.' },
  { id: 'trowel',   name: 'Garden Trowel',   power: 5,     cost: 1.43e03,    blurb: 'Pointy end goes in the ground.' },
  { id: 'shovel',   name: 'Shovel',          power: 14,    cost: 4.59e04,   blurb: 'The classic. Ash handle, steel blade.' },
  { id: 'pickaxe',  name: 'Pickaxe',         power: 40,    cost: 1.89e06,  blurb: 'For when the ground starts arguing back.' },
  { id: 'mattock',  name: 'War Mattock',     power: 120,   cost: 8.05e07,  blurb: 'Two heads. Zero patience.' },
  { id: 'jack',     name: 'Jackhammer',      power: 400,   cost: 3.76e09,  blurb: 'Your teeth will rattle. Worth it.' },
  { id: 'drill',    name: 'Rotary Drill',    power: 1500,  cost: 6e10,    blurb: 'Diamond-tipped. Hums a little tune.' },
  { id: 'plasma',   name: 'Plasma Lance',    power: 6000,  cost: 1.5e12,  blurb: 'Hotter than the thing you are digging toward.' },
  { id: 'graviton', name: 'Graviton Hammer', power: 25000, cost: 4e13, blurb: 'Hits so hard the rock forgets it was there.' },
];

// Bags. cap = chunks held.
export const BAGS = [
  { id: 'pockets',   name: 'Pockets',          cap: 30,      cost: 0 },
  { id: 'bucket',    name: 'Tin Bucket',       cap: 90,      cost: 80 },
  { id: 'sack',      name: 'Burlap Sack',      cap: 280,     cost: 2.66e03 },
  { id: 'barrow',    name: 'Wheelbarrow',      cap: 900,     cost: 9.83e04 },
  { id: 'minecart',  name: 'Minecart',         cap: 3200,    cost: 3.98e06 },
  { id: 'wagon',     name: 'Ore Wagon',        cap: 12000,   cost: 1.68e08 },
  { id: 'dumptruck', name: 'Dump Truck',       cap: 50000,   cost: 7.52e09 },
  { id: 'hauler',    name: 'Cargo Hauler',     cap: 200000,  cost: 3.44e11 },
  { id: 'silo',      name: 'Mega Silo',        cap: 900000,  cost: 2.5e12 },
  { id: 'pocketdim', name: 'Pocket Dimension', cap: 4500000, cost: 6e13 },
];

// Machines: fewer, bigger upgrades (10 levels each).
// rate(L) = base * L * 1.55^(L-1)   cost to go L -> L+1 = cost * 2.9^L
export const MACHINES = [
  { id: 'moles',   name: 'Mole Crew',      base: 0.6,   cost: 30,    blurb: 'Hired help. Paid in worms.' },
  { id: 'buckets', name: 'Bucket Line',    base: 6,     cost: 5.39e03,   blurb: 'Rope, pulley, a lot of buckets.' },
  { id: 'digger',  name: 'Excavator',      base: 60,    cost: 5.81e05, blurb: 'Big yellow arm. Big yellow attitude.' },
  { id: 'steam',   name: 'Steam Drill',    base: 600,   cost: 6.97e07, blurb: 'Coal in, holes out.' },
  { id: 'borer',   name: 'Tunnel Borer',   base: 6000,  cost: 3e09,   blurb: 'A spinning wall of teeth.' },
  { id: 'laser',   name: 'Orbital Laser',  base: 60000, cost: 1.5e11, blurb: 'Rented by the hour from a satellite.' },
];
export const MACHINE_MAX = 10;
export const machineRate = (m, L) => (L <= 0 ? 0 : m.base * L * Math.pow(1.55, L - 1));
export const machineCost = (m, L) => m.cost * Math.pow(3.2, L);

// ---------------------------------------------------------------------------
// Skill tree. Positions: branch angle + (r rings, a degrees offset).
// ---------------------------------------------------------------------------
export const BRANCHES = [
  { id: 'tools',   name: 'Tools',    angle: -90, color: '#e8a33c' },
  { id: 'haul',    name: 'Hauling',  angle: -18, color: '#d9c46a' },
  { id: 'mach',    name: 'Machines', angle: 54,  color: '#8fb3c9' },
  { id: 'fortune', name: 'Fortune',  angle: 126, color: '#9cc47a' },
  { id: 'geo',     name: 'Geology',  angle: 198, color: '#c98f74' },
];

// fx keys are interpreted in state.js -> computeStats()
export const SKILLS = [
  { id: 'root', name: 'Dig', branch: null, r: 0, a: 0, cost: 0, parents: [], icon: 'root', desc: 'Every hole starts with one scoop.', fx: {} },

  // TOOLS
  { id: 't1', name: 'Firm Grip',        branch: 'tools', r: 1, a: 0,   cost: 1, parents: ['root'], icon: 'fist',   desc: 'Tap power +25%.', fx: { tapMult: 0.25 } },
  { id: 't2', name: 'Calloused Hands',  branch: 'tools', r: 2, a: 0,   cost: 1, parents: ['t1'],   icon: 'fist',   desc: 'Tap power +35%.', fx: { tapMult: 0.35 } },
  { id: 't3', name: 'Sharp Edge',       branch: 'tools', r: 2, a: -15, cost: 1, parents: ['t1'],   icon: 'crit',   desc: 'Crit chance +3%.', fx: { critChance: 0.03 } },
  { id: 't7', name: 'Ergonomics',       branch: 'tools', r: 2, a: 15,  cost: 1, parents: ['t1'],   icon: 'tag',    desc: 'Tools cost 15% less.', fx: { toolDisc: 0.15 } },
  { id: 't4', name: 'Heavy Swing',      branch: 'tools', r: 3, a: -20, cost: 2, parents: ['t3'],   icon: 'crit',   desc: 'Crits hit 5x harder (10x → 15x).', fx: { critMult: 5 } },
  { id: 't5', name: 'Whetstone',        branch: 'tools', r: 3, a: 0,   cost: 2, parents: ['t2'],   icon: 'fist',   desc: 'Tap power +60%.', fx: { tapMult: 0.6 } },
  { id: 't8', name: 'Bulk Order',       branch: 'tools', r: 3, a: 20,  cost: 1, parents: ['t7'],   icon: 'tag',    desc: 'Tools cost another 15% less.', fx: { toolDisc: 0.15 } },
  { id: 't6', name: 'Lucky Strike',     branch: 'tools', r: 4, a: -22, cost: 2, parents: ['t4'],   icon: 'crit',   desc: 'Crit chance +4%.', fx: { critChance: 0.04 } },
  { id: 't9', name: 'Momentum',         branch: 'tools', r: 4, a: 0,   cost: 3, parents: ['t5'],   icon: 'bolt',   desc: 'Every 40 taps: 6 seconds of triple tap power.', fx: { momentum: 1 } },
  { id: 't16', name: 'Grip Tape',       branch: 'tools', r: 4, a: 22,  cost: 2, parents: ['t8'],   icon: 'fist',   desc: 'Tap power +1% per tool tier owned, per tier. (Compounds.)', fx: { tierBonus: 1 } },
  { id: 't11', name: 'Shatterpoint',    branch: 'tools', r: 5, a: -18, cost: 2, parents: ['t6'],   icon: 'coin',   desc: 'Crits pay coins straight to you. No bag space needed.', fx: { critCoins: 1 } },
  { id: 't10', name: 'Tempered Steel',  branch: 'tools', r: 5, a: 0,   cost: 3, parents: ['t9'],   icon: 'fist',   desc: 'Tap power +100%.', fx: { tapMult: 1.0 } },
  { id: 't12', name: 'Echo Tap',        branch: 'tools', r: 5, a: 18,  cost: 2, parents: ['t16'],  icon: 'echo',   desc: '15% chance a tap lands twice.', fx: { echo: 0.15 } },
  { id: 't15', name: 'Critical Mass',   branch: 'tools', r: 6, a: -16, cost: 3, parents: ['t11'],  icon: 'crit',   desc: 'Crit chance +6%, crits +5x.', fx: { critChance: 0.06, critMult: 5 } },
  { id: 't14', name: 'Machine Sympathy', branch: 'tools', r: 6, a: 16, cost: 3, parents: ['t12'],  icon: 'gear',   desc: 'Tap power +2% per machine level you own.', fx: { tapPerMachine: 0.02 } },
  { id: 't13', name: 'EARTHBREAKER',    branch: 'tools', r: 7, a: 0,   cost: 5, parents: ['t10'],  icon: 'star',   keystone: true, desc: 'Tap power x3.', fx: { tapX: 3 } },

  // HAULING
  { id: 'h1', name: 'Deep Pockets',     branch: 'haul', r: 1, a: 0,   cost: 1, parents: ['root'], icon: 'bag',  desc: 'Bag holds 30% more.', fx: { bagMult: 0.3 } },
  { id: 'h2', name: 'Reinforced Seams', branch: 'haul', r: 2, a: 0,   cost: 1, parents: ['h1'],   icon: 'bag',  desc: 'Bag holds 40% more.', fx: { bagMult: 0.4 } },
  { id: 'h3', name: 'Haggler',          branch: 'haul', r: 2, a: 15,  cost: 1, parents: ['h1'],   icon: 'coin', desc: 'Sell for 15% more.', fx: { sellMult: 0.15 } },
  { id: 'h9', name: 'Thrift',           branch: 'haul', r: 2, a: -15, cost: 1, parents: ['h1'],   icon: 'tag',  desc: 'Bags cost 20% less.', fx: { bagDisc: 0.2 } },
  { id: 'h5', name: 'Packing Technique', branch: 'haul', r: 3, a: 0,  cost: 2, parents: ['h2'],   icon: 'bag',  desc: 'Bag holds 60% more.', fx: { bagMult: 0.6 } },
  { id: 'h4', name: 'Appraiser',        branch: 'haul', r: 3, a: 20,  cost: 2, parents: ['h3'],   icon: 'coin', desc: 'Sell for 25% more.', fx: { sellMult: 0.25 } },
  { id: 'h11', name: 'Compression',     branch: 'haul', r: 3, a: -20, cost: 2, parents: ['h9'],   icon: 'bag',  desc: 'Bag holds 80% more.', fx: { bagMult: 0.8 } },
  { id: 'h6', name: 'Auto-Seller',      branch: 'haul', r: 4, a: 0,   cost: 2, parents: ['h5'],   icon: 'auto', desc: 'A full bag sells itself after 2 seconds, at 80% value.', fx: { autoSell: 1 } },
  { id: 'h10', name: 'Bulk Bonus',      branch: 'haul', r: 4, a: 22,  cost: 2, parents: ['h4'],   icon: 'coin', desc: 'Selling a completely full bag pays +30%.', fx: { bulkBonus: 0.3 } },
  { id: 'h15', name: 'Shoulder Straps', branch: 'haul', r: 4, a: -22, cost: 1, parents: ['h11'],  icon: 'bag',  desc: 'Bag holds 50% more.', fx: { bagMult: 0.5 } },
  { id: 'h7', name: 'Fair Price',       branch: 'haul', r: 5, a: 0,   cost: 2, parents: ['h6'],   icon: 'auto', desc: 'Auto-Seller pays full price and waits only 1 second.', fx: { autoSell: 1 } },
  { id: 'h12', name: 'Market Contacts', branch: 'haul', r: 5, a: 18,  cost: 3, parents: ['h10'],  icon: 'coin', desc: 'Sell for 50% more.', fx: { sellMult: 0.5 } },
  { id: 'h16', name: 'Lucky Coin',      branch: 'haul', r: 5, a: -18, cost: 2, parents: ['h15'],  icon: 'coin', desc: '10% of sales pay double.', fx: { luckyCoin: 0.1 } },
  { id: 'h8', name: 'Conveyor Belt',    branch: 'haul', r: 6, a: 0,   cost: 4, parents: ['h7'],   icon: 'auto', desc: 'Your bag empties itself continuously. It is never full.', fx: { autoSell: 1 } },
  { id: 'h14', name: 'Curator',         branch: 'haul', r: 6, a: 16,  cost: 3, parents: ['h12'],  icon: 'gem',  desc: 'Sell for +2% more per treasure in your collection.', fx: { sellPerTreasure: 0.02 } },
  { id: 'h13', name: 'BOTTOMLESS BAG',  branch: 'haul', r: 7, a: -10, cost: 5, parents: ['h8', 'h16'], icon: 'star', keystone: true, desc: 'Bag size x3 and sell value +50%.', fx: { bagX: 3, sellMult: 0.5 } },

  // MACHINES
  { id: 'm1', name: 'Lubricant',        branch: 'mach', r: 1, a: 0,   cost: 1, parents: ['root'], icon: 'gear', desc: 'Machines dig 25% faster.', fx: { machineMult: 0.25 } },
  { id: 'm2', name: 'Overtime',         branch: 'mach', r: 2, a: 0,   cost: 1, parents: ['m1'],   icon: 'gear', desc: 'Machines dig 35% faster.', fx: { machineMult: 0.35 } },
  { id: 'm3', name: 'Mole Whisperer',   branch: 'mach', r: 2, a: -15, cost: 1, parents: ['m1'],   icon: 'mole', desc: 'Mole Crew x2.', fx: { mach_moles: 1 } },
  { id: 'm9', name: 'Wholesale Parts',  branch: 'mach', r: 2, a: 15,  cost: 1, parents: ['m1'],   icon: 'tag',  desc: 'Machine upgrades cost 15% less.', fx: { machDisc: 0.15 } },
  { id: 'm4', name: 'Pulley Physics',   branch: 'mach', r: 3, a: -20, cost: 1, parents: ['m3'],   icon: 'gear', desc: 'Bucket Line x2.', fx: { mach_buckets: 1 } },
  { id: 'm10', name: 'Assembly Line',   branch: 'mach', r: 3, a: 0,   cost: 2, parents: ['m2'],   icon: 'gear', desc: 'Machines dig 60% faster.', fx: { machineMult: 0.6 } },
  { id: 'm5', name: 'Hydraulics',       branch: 'mach', r: 3, a: 20,  cost: 2, parents: ['m9'],   icon: 'gear', desc: 'Excavator x2.', fx: { mach_digger: 1 } },
  { id: 'm14', name: 'Cheerleading',    branch: 'mach', r: 4, a: -22, cost: 2, parents: ['m4'],   icon: 'bolt', desc: 'While you are tapping, machines dig 40% faster.', fx: { cheer: 0.4 } },
  { id: 'm12', name: 'Engineer',        branch: 'mach', r: 4, a: 0,   cost: 2, parents: ['m10'],  icon: 'tag',  desc: 'Machine upgrades cost 20% less.', fx: { machDisc: 0.2 } },
  { id: 'm6', name: 'Pressure Valves',  branch: 'mach', r: 4, a: 22,  cost: 2, parents: ['m5'],   icon: 'gear', desc: 'Steam Drill x2.', fx: { mach_steam: 1 } },
  { id: 'm11', name: 'Second Shift',    branch: 'mach', r: 5, a: -18, cost: 3, parents: ['m14'],  icon: 'gear', desc: 'Machines dig 80% faster.', fx: { machineMult: 0.8 } },
  { id: 'm15', name: 'Fuel Injection',  branch: 'mach', r: 5, a: 0,   cost: 2, parents: ['m12'],  icon: 'gear', desc: 'Machines dig 50% faster.', fx: { machineMult: 0.5 } },
  { id: 'm7', name: 'Diamond Teeth',    branch: 'mach', r: 5, a: 18,  cost: 2, parents: ['m6'],   icon: 'gear', desc: 'Tunnel Borer x2.', fx: { mach_borer: 1 } },
  { id: 'm16', name: 'Tap Telemetry',   branch: 'mach', r: 6, a: -16, cost: 2, parents: ['m11'],  icon: 'bolt', desc: 'Each tap adds 1% of a second of machine digging.', fx: { tapMachine: 1 } },
  { id: 'm8', name: 'Focusing Lens',    branch: 'mach', r: 6, a: 16,  cost: 3, parents: ['m7'],   icon: 'gear', desc: 'Orbital Laser x2.', fx: { mach_laser: 1 } },
  { id: 'm13', name: 'AUTOMATION CORE', branch: 'mach', r: 7, a: 0,   cost: 5, parents: ['m15'],  icon: 'star', keystone: true, desc: 'Machines x3. Your taps are 40% weaker.', fx: { machineX: 3, tapX: 0.6 } },

  // FORTUNE
  { id: 'f1', name: 'Keen Eye',         branch: 'fortune', r: 1, a: 0,   cost: 1, parents: ['root'], icon: 'eye',     desc: 'Find treasures 30% more often.', fx: { luck: 0.3 } },
  { id: 'f2', name: 'Prospector',       branch: 'fortune', r: 2, a: -15, cost: 1, parents: ['f1'],   icon: 'gem',     desc: '+4% of chunks are rare (worth 4x).', fx: { rare: 0.04 } },
  { id: 'f3', name: 'Boulder Magnet',   branch: 'fortune', r: 2, a: 15,  cost: 1, parents: ['f1'],   icon: 'boulder', desc: 'Boulders show up 35% more often.', fx: { boulderRate: 0.35 } },
  { id: 'f6', name: 'Metal Detector',   branch: 'fortune', r: 2, a: 0,   cost: 1, parents: ['f1'],   icon: 'eye',     desc: 'Find treasures 50% more often.', fx: { luck: 0.5 } },
  { id: 'f7', name: 'Rich Veins',       branch: 'fortune', r: 3, a: -20, cost: 2, parents: ['f2'],   icon: 'gem',     desc: '+6% of chunks are rare.', fx: { rare: 0.06 } },
  { id: 'f9', name: 'Treasure Map',     branch: 'fortune', r: 3, a: 0,   cost: 2, parents: ['f6'],   icon: 'eye',     desc: 'Find treasures 100% more often.', fx: { luck: 1.0 } },
  { id: 'f4', name: 'Rock Smasher',     branch: 'fortune', r: 3, a: 20,  cost: 1, parents: ['f3'],   icon: 'boulder', desc: 'You hit boulders twice as hard.', fx: { boulderDmg: 1 } },
  { id: 'f11', name: 'Mother Lode',     branch: 'fortune', r: 4, a: -22, cost: 2, parents: ['f7'],   icon: 'gem',     desc: 'Rare chunks are worth 8x instead of 4x.', fx: { rareMult: 4 } },
  { id: 'f13', name: 'Archaeologist',   branch: 'fortune', r: 4, a: 0,   cost: 3, parents: ['f9'],   icon: 'eye',     desc: 'Treasure bonuses are 50% stronger.', fx: { arch: 0.5 } },
  { id: 'f5', name: 'Geode Hunter',     branch: 'fortune', r: 4, a: 22,  cost: 2, parents: ['f4'],   icon: 'boulder', desc: 'Boulders pay 2.5x.', fx: { boulderReward: 1.5 } },
  { id: 'f14', name: 'Glitter',         branch: 'fortune', r: 5, a: -18, cost: 2, parents: ['f11'],  icon: 'gem',     desc: '+8% of chunks are rare.', fx: { rare: 0.08 } },
  { id: 'f15', name: 'Sixth Sense',     branch: 'fortune', r: 5, a: 0,   cost: 2, parents: ['f13'],  icon: 'eye',     desc: 'Find treasures 100% more often.', fx: { luck: 1.0 } },
  { id: 'f10', name: 'Boulder Storm',   branch: 'fortune', r: 5, a: 18,  cost: 3, parents: ['f5'],   icon: 'boulder', desc: 'Up to 3 boulders at once.', fx: { boulderMax: 2 } },
  { id: 'f16', name: 'Fool’s Gold', branch: 'fortune', r: 6, a: 16, cost: 2, parents: ['f10'],  icon: 'boulder', desc: 'Smashing a boulder gives 4 seconds of double digging.', fx: { boulderFrenzy: 1 } },
  { id: 'f12', name: 'FORTUNE’S FAVOR', branch: 'fortune', r: 7, a: -8, cost: 5, parents: ['f15', 'f14'], icon: 'star', keystone: true, desc: 'Treasure luck x2, rare chance x2, crit chance +5%.', fx: { luckX: 2, rareX: 2, critChance: 0.05 } },

  // GEOLOGY
  { id: 'g7', name: 'Seismic Sense',    branch: 'geo', r: 1, a: 0,   cost: 1, parents: ['root'], icon: 'layers', desc: 'All digging +15%.', fx: { digMult: 0.15 } },
  { id: 'g1', name: 'Soil Science',     branch: 'geo', r: 2, a: -15, cost: 1, parents: ['g7'],   icon: 'layers', desc: 'Dig 2x faster in Topsoil, Clay and Bedrock.', fx: { layer_0: 1, layer_1: 1, layer_2: 1 } },
  { id: 'g5', name: 'Surveyor',         branch: 'geo', r: 2, a: 15,  cost: 2, parents: ['g7'],   icon: 'flag',   desc: '+1 skill point for every layer you have reached.', fx: { surveyor: 1 } },
  { id: 'g8', name: 'Tectonics',        branch: 'geo', r: 2, a: 0,   cost: 2, parents: ['g7'],   icon: 'layers', desc: 'All digging +30%.', fx: { digMult: 0.3 } },
  { id: 'g2', name: 'Stone Reading',    branch: 'geo', r: 3, a: -20, cost: 2, parents: ['g1'],   icon: 'layers', desc: 'Dig 2x faster in Fossil Beds and Crystal Caves.', fx: { layer_3: 1, layer_4: 1 } },
  { id: 'g6', name: 'Fault Lines',      branch: 'geo', r: 3, a: 0,   cost: 2, parents: ['g8'],   icon: 'bolt',   desc: '3% of taps trigger a cave-in worth 25 taps.', fx: { fault: 0.03 } },
  { id: 'g10', name: 'Core Samples',    branch: 'geo', r: 3, a: 20,  cost: 1, parents: ['g5'],   icon: 'flag',   desc: 'Each skill point milestone also pays out 20 seconds of income.', fx: { milestoneCoins: 20 } },
  { id: 'g3', name: 'Crystal Resonance', branch: 'geo', r: 4, a: -22, cost: 2, parents: ['g2'],  icon: 'layers', desc: 'Dig 2x faster in Sunken Ruins.', fx: { layer_5: 1 } },
  { id: 'g12', name: 'Strata Memory',   branch: 'geo', r: 4, a: 0,   cost: 3, parents: ['g6'],   icon: 'layers', desc: 'All digging +12% for every layer you have finished.', fx: { strata: 0.12 } },
  { id: 'g9', name: 'Pressure Cooking', branch: 'geo', r: 4, a: 22,  cost: 2, parents: ['g10'],  icon: 'coin',   desc: 'Sell value +8% for every layer you have reached.', fx: { sellPerLayer: 0.08 } },
  { id: 'g4', name: 'Heat Shield',      branch: 'geo', r: 5, a: -18, cost: 3, parents: ['g3'],   icon: 'layers', desc: 'Dig 2x faster in the Magma Mantle and Inner Core.', fx: { layer_6: 1, layer_7: 1 } },
  { id: 'g13', name: 'Aftershock',      branch: 'geo', r: 5, a: 0,   cost: 2, parents: ['g12'],  icon: 'bolt',   desc: 'Cave-ins are worth 60 taps.', fx: { faultPower: 35 } },
  { id: 'g14', name: 'Deep Time',       branch: 'geo', r: 5, a: 18,  cost: 2, parents: ['g9'],   icon: 'layers', desc: 'All digging +40%.', fx: { digMult: 0.4 } },
  { id: 'g11', name: 'PLANET CRACKER',  branch: 'geo', r: 7, a: 0,   cost: 5, parents: ['g13', 'g4'], icon: 'star', keystone: true, desc: 'All digging x2.', fx: { digX: 2 } },
];

// ---------------------------------------------------------------------------
// Treasures: 5 per layer. shape -> models.js builder. bonus applies forever.
// ---------------------------------------------------------------------------
export const TREASURES = [
  // topsoil
  { id: 'cap',      layer: 0, name: 'Bottle Cap',          shape: 'cap',     color: '#b8342c', bonus: { sellMult: 0.03 },    text: 'Sell value +3%' },
  { id: 'marble',   layer: 0, name: 'Cat’s-Eye Marble', shape: 'marble', color: '#3a8fd1', bonus: { tapMult: 0.05 },     text: 'Tap power +5%' },
  { id: 'dentures', layer: 0, name: 'Grandpa’s Teeth', shape: 'teeth',  color: '#f2ead8', bonus: { luck: 0.05 },        text: 'Treasure luck +5%' },
  { id: 'dino',     layer: 0, name: 'Plastic Dinosaur',    shape: 'dino',    color: '#4f9e3c', bonus: { machineMult: 0.05 }, text: 'Machines +5%' },
  { id: 'key',      layer: 0, name: 'Rusty Key',           shape: 'key',     color: '#9b6a3a', bonus: { bagMult: 0.06 },     text: 'Bag size +6%' },
  // clay
  { id: 'shard',    layer: 1, name: 'Painted Pot Shard',   shape: 'shard',   color: '#c46a3a', bonus: { sellMult: 0.04 },    text: 'Sell value +4%' },
  { id: 'arrow',    layer: 1, name: 'Flint Arrowhead',     shape: 'arrow',   color: '#5b5b60', bonus: { critChance: 0.01 },  text: 'Crit chance +1%' },
  { id: 'button',   layer: 1, name: 'Pirate’s Button', shape: 'coin',   color: '#c9a24a', bonus: { luck: 0.08 },        text: 'Treasure luck +8%' },
  { id: 'coin1',    layer: 1, name: 'Roman Coin',          shape: 'coin',    color: '#b98a3c', bonus: { sellMult: 0.05 },    text: 'Sell value +5%' },
  { id: 'figurine', layer: 1, name: 'Clay Figurine',       shape: 'idol',    color: '#a8573a', bonus: { digMult: 0.04 },     text: 'All digging +4%' },
  // stone
  { id: 'geode',    layer: 2, name: 'Split Geode',         shape: 'geode',   color: '#8a5cc7', bonus: { rare: 0.01 },        text: 'Rare chunks +1%' },
  { id: 'meteor',   layer: 2, name: 'Iron Meteorite',      shape: 'rock',    color: '#4a4440', bonus: { tapMult: 0.08 },     text: 'Tap power +8%' },
  { id: 'lamp',     layer: 2, name: 'Old Miner’s Lamp', shape: 'lamp',  color: '#c28a2e', bonus: { luck: 0.1 },         text: 'Treasure luck +10%' },
  { id: 'mug',      layer: 2, name: 'Dwarven Tankard',     shape: 'mug',     color: '#8c8f96', bonus: { machineMult: 0.08 }, text: 'Machines +8%' },
  { id: 'pickhead', layer: 2, name: 'Broken Pick Head',    shape: 'arrow',   color: '#6e7076', bonus: { critMult: 2 },       text: 'Crits +2x' },
  // fossil
  { id: 'trilo',    layer: 3, name: 'Trilobite',           shape: 'shell',   color: '#8a7a62', bonus: { digMult: 0.06 },     text: 'All digging +6%' },
  { id: 'claw',     layer: 3, name: 'Raptor Claw',         shape: 'claw',    color: '#e6dcc4', bonus: { critChance: 0.015 }, text: 'Crit chance +1.5%' },
  { id: 'ammo',     layer: 3, name: 'Ammonite',            shape: 'spiral',  color: '#b08a5a', bonus: { bagMult: 0.08 },     text: 'Bag size +8%' },
  { id: 'tooth',    layer: 3, name: 'T. Rex Tooth',        shape: 'tooth',   color: '#efe4c8', bonus: { tapMult: 0.1 },      text: 'Tap power +10%' },
  { id: 'egg',      layer: 3, name: 'Fossil Egg',          shape: 'egg',     color: '#c9bba0', bonus: { luck: 0.12 },        text: 'Treasure luck +12%' },
  // crystal
  { id: 'heart',    layer: 4, name: 'Amethyst Heart',      shape: 'crystal', color: '#9d5cf0', bonus: { sellMult: 0.08 },    text: 'Sell value +8%' },
  { id: 'sing',     layer: 4, name: 'Singing Crystal',     shape: 'crystal', color: '#5fe0e8', bonus: { machineMult: 0.1 },  text: 'Machines +10%' },
  { id: 'shroom',   layer: 4, name: 'Glowcap Mushroom',    shape: 'shroom',  color: '#52f0a8', bonus: { rare: 0.015 },       text: 'Rare chunks +1.5%' },
  { id: 'prism',    layer: 4, name: 'Perfect Prism',       shape: 'prism',   color: '#e9f4ff', bonus: { critMult: 3 },       text: 'Crits +3x' },
  { id: 'bubble',   layer: 4, name: 'Frozen Bubble',       shape: 'marble',  color: '#bfe8ff', bonus: { bagMult: 0.1 },      text: 'Bag size +10%' },
  // ruins
  { id: 'idol',     layer: 5, name: 'Golden Idol',         shape: 'idol',    color: '#e3b23c', bonus: { sellMult: 0.1 },     text: 'Sell value +10%' },
  { id: 'tablet',   layer: 5, name: 'Stone Tablet',        shape: 'tablet',  color: '#9c9480', bonus: { digMult: 0.08 },     text: 'All digging +8%' },
  { id: 'bird',     layer: 5, name: 'Clockwork Bird',      shape: 'bird',    color: '#c58a42', bonus: { machineMult: 0.12 }, text: 'Machines +12%' },
  { id: 'battery',  layer: 5, name: 'Ancient Battery',     shape: 'battery', color: '#3f8f7a', bonus: { tapMult: 0.12 },     text: 'Tap power +12%' },
  { id: 'mask',     layer: 5, name: 'Jade Mask',           shape: 'mask',    color: '#3fae7f', bonus: { luck: 0.15 },        text: 'Treasure luck +15%' },
  // magma
  { id: 'blade',    layer: 6, name: 'Obsidian Blade',      shape: 'arrow',   color: '#1c1a22', bonus: { critChance: 0.02 },  text: 'Crit chance +2%' },
  { id: 'opal',     layer: 6, name: 'Fire Opal',           shape: 'gem',     color: '#ff6a2a', bonus: { sellMult: 0.12 },    text: 'Sell value +12%' },
  { id: 'scale',    layer: 6, name: 'Salamander Scale',    shape: 'shard',   color: '#e8452a', bonus: { bagMult: 0.12 },     text: 'Bag size +12%' },
  { id: 'pearl',    layer: 6, name: 'Magma Pearl',         shape: 'marble',  color: '#ff8a3a', bonus: { rare: 0.02 },        text: 'Rare chunks +2%' },
  { id: 'watch',    layer: 6, name: 'Melted Pocket Watch', shape: 'watch',   color: '#d9b04a', bonus: { digMult: 0.1 },      text: 'All digging +10%' },
  // core
  { id: 'ironheart', layer: 7, name: 'Iron Heart',         shape: 'gem',     color: '#b0b6c0', bonus: { machineMult: 0.15 }, text: 'Machines +15%' },
  { id: 'seed',     layer: 7, name: 'Planet Seed',         shape: 'egg',     color: '#7ad06a', bonus: { digMult: 0.12 },     text: 'All digging +12%' },
  { id: 'gravity',  layer: 7, name: 'Gravity Marble',      shape: 'marble',  color: '#2a2440', bonus: { tapMult: 0.15 },     text: 'Tap power +15%' },
  { id: 'photo',    layer: 7, name: 'Faded Photograph',    shape: 'tablet',  color: '#d8c8a0', bonus: { luck: 0.2 },         text: 'Treasure luck +20%' },
  { id: 'hotrock',  layer: 7, name: 'A Very Hot Rock',     shape: 'rock',    color: '#ffb347', bonus: { sellMult: 0.15 },    text: 'Sell value +15%' },
];

// ---------------------------------------------------------------------------
// Achievements: each one gives +1% to all digging, forever.
// ---------------------------------------------------------------------------
export const ACHIEVEMENTS = [
  { id: 'first',    name: 'Ground Breaking',      desc: 'Dig your first chunk.',                 test: s => s.stats.chunks >= 1 },
  { id: 'spoonfed', name: 'Spoon Fed',            desc: 'Reach 10 m with the spoon or worse.',   test: s => s.depth >= 10 && s.tool <= 1 },
  { id: 'sell1',    name: 'Small Business',       desc: 'Sell your bag for the first time.',     test: s => s.stats.sells >= 1 },
  { id: 'sell100',  name: 'Regular Customer',     desc: 'Sell 100 bags.',                        test: s => s.stats.sells >= 100 },
  { id: 'taps1k',   name: 'Repetitive Strain',    desc: 'Tap 1,000 times.',                      test: s => s.stats.taps >= 1000 },
  { id: 'taps10k',  name: 'Carpal Tunnel Vision', desc: 'Tap 10,000 times.',                     test: s => s.stats.taps >= 10000 },
  { id: 'crit1',    name: 'Crunch',               desc: 'Land a critical hit.',                  test: s => s.stats.crits >= 1 },
  { id: 'crit500',  name: 'Critical Thinking',    desc: 'Land 500 critical hits.',               test: s => s.stats.crits >= 500 },
  { id: 'boulder1', name: 'Rock Paper Scissors',  desc: 'Smash a boulder.',                      test: s => s.stats.boulders >= 1 },
  { id: 'boulder50', name: 'Gravel Maker',        desc: 'Smash 50 boulders.',                    test: s => s.stats.boulders >= 50 },
  { id: 'clay',     name: 'Feet of Clay',         desc: 'Reach the Clay layer.',                 test: s => s.depth >= 60 },
  { id: 'stone',    name: 'Stone Cold',           desc: 'Reach Bedrock.',                        test: s => s.depth >= 500 },
  { id: 'fossil',   name: 'Old Bones',            desc: 'Reach the Fossil Beds.',                test: s => s.depth >= 4000 },
  { id: 'crystal',  name: 'Crystal Clear',        desc: 'Reach the Crystal Caves.',              test: s => s.depth >= 25000 },
  { id: 'ruins',    name: 'Lost and Found',       desc: 'Reach the Sunken Ruins.',               test: s => s.depth >= 120000 },
  { id: 'magma',    name: 'Floor Is Lava',        desc: 'Reach the Magma Mantle.',               test: s => s.depth >= 660000 },
  { id: 'core',     name: 'Heart of the Matter',  desc: 'Reach the Inner Core.',                 test: s => s.depth >= 2900000 },
  { id: 'bottom',   name: 'Rock Bottom',          desc: 'Reach the center of the Earth.',        test: s => s.depth >= CORE_DEPTH },
  { id: 'tool4',    name: 'Shovel Knight',        desc: 'Own a shovel.',                         test: s => s.tool >= 3 },
  { id: 'toolmax',  name: 'Overkill',             desc: 'Own the Graviton Hammer.',              test: s => s.tool >= 9 },
  { id: 'bagmax',   name: 'Bigger on the Inside', desc: 'Own the Pocket Dimension.',             test: s => s.bag >= 9 },
  { id: 'mach1',    name: 'Middle Management',    desc: 'Hire the Mole Crew.',                   test: s => s.machines[0] >= 1 },
  { id: 'machall',  name: 'Industrial Revolution', desc: 'Own every machine.',                   test: s => s.machines.every(l => l >= 1) },
  { id: 'machmax',  name: 'Fully Upgraded',       desc: 'Max out any machine.',                  test: s => s.machines.some(l => l >= 10) },
  { id: 'skill10',  name: 'Book Smart',           desc: 'Unlock 10 skills.',                     test: s => s.skills.length >= 11 },
  { id: 'keystone', name: 'Cornerstone',          desc: 'Unlock a keystone skill.',              test: s => s.skills.some(id => ['t13','h13','m13','f12','g11'].includes(id)) },
  { id: 'treasure1', name: 'Finders Keepers',     desc: 'Find a treasure.',                      test: s => s.treasures.length >= 1 },
  { id: 'treasure20', name: 'Museum Piece',       desc: 'Find 20 treasures.',                    test: s => s.treasures.length >= 20 },
  { id: 'treasureall', name: 'Completionist',     desc: 'Find all 40 treasures.',                test: s => s.treasures.length >= 40 },
  { id: 'million',  name: 'Millionaire Mole',     desc: 'Hold 1,000,000 coins.',                 test: s => s.coins >= 1e6 },
  { id: 'billion',  name: 'Subterranean Tycoon',  desc: 'Hold 1,000,000,000 coins.',             test: s => s.coins >= 1e9 },
  { id: 'respec',   name: 'Second Thoughts',      desc: 'Reset your skill tree.',                test: s => s.stats.respecs >= 1 },
  { id: 'crown',    name: 'Long Live the King',   desc: 'Start a New Game+.',                    test: s => s.crowns >= 1 },
  { id: 'speedrun', name: 'Express Elevator',     desc: 'Reach the core in under 30 minutes.',   test: s => s.depth >= CORE_DEPTH && s.runTime < 1800 },
];
