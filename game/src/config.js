// VOIDLIGHT — tuning and palette. Every number the game balances on lives here,
// so a tweak never means hunting through the update code.
export const VIEW = { width: 1280, height: 800 };

export const PALETTE = {
  voidTop: '#0b1026',
  voidBottom: '#05060f',
  nebulaA: 'rgba(88, 60, 180, 0.20)',
  nebulaB: 'rgba(20, 140, 160, 0.16)',
  nebulaC: 'rgba(200, 60, 120, 0.10)',
  star: '#cfe4ff',
  player: '#7df9ff',
  playerCore: '#eaffff',
  playerGlow: 'rgba(125, 249, 255, 0.55)',
  bullet: '#ffe9a3',
  bulletGlow: 'rgba(255, 210, 90, 0.6)',
  ember: '#ffb347',
  emberGlow: 'rgba(255, 179, 71, 0.7)',
  shade: '#b06cff',
  darter: '#ff5d8f',
  splitter: '#5dff9d',
  brute: '#ff9046',
  orb: '#ff7ad9',
  hud: '#e8f4ff',
  hudDim: 'rgba(232, 244, 255, 0.55)',
  danger: '#ff5d5d',
  good: '#7dffb0',
};

// Player tuning.
export const PLAYER = {
  radius: 16,
  accel: 2600,
  maxSpeed: 340,
  drag: 4.2,
  fireInterval: 0.16,
  rapidInterval: 0.08,
  bulletSpeed: 640,
  bulletRadius: 5,
  bulletDamage: 1,
  dashSpeed: 980,
  dashTime: 0.16,
  dashCooldown: 1.15,
  dashInvuln: 0.28,
  hitInvuln: 1.1,
  maxHull: 3,
};

// Enemy definitions, keyed by kind. hp grows a little with the wave (see enemies.js).
export const FOES = {
  shade: { radius: 17, speed: 78, hp: 2, score: 100, embers: 2, color: PALETTE.shade, touch: 1 },
  darter: { radius: 13, speed: 96, hp: 1, score: 150, embers: 2, color: PALETTE.darter, touch: 1 },
  splitter: { radius: 20, speed: 58, hp: 3, score: 200, embers: 3, color: PALETTE.splitter, touch: 1 },
  mite: { radius: 10, speed: 150, hp: 1, score: 60, embers: 1, color: PALETTE.splitter, touch: 1 },
  brute: { radius: 34, speed: 42, hp: 16, score: 800, embers: 8, color: PALETTE.brute, touch: 2 },
};

// How a wave is built: count grows, new kinds join in, and the gaps shrink.
// The first brute comes at wave 3 (not 5) so a short session still meets one.
export function wavePlan(wave) {
  const count = 6 + wave * 3;
  const kinds = ['shade'];
  if (wave >= 2) kinds.push('darter');
  if (wave >= 3) kinds.push('splitter');
  const brutes = wave === 3 || wave % 5 === 0 ? 1 : 0;
  const spawnGap = Math.max(0.35, 1.05 - wave * 0.07);
  const speedScale = 1 + (wave - 1) * 0.06;
  const hpBonus = wave >= 6 ? 1 : 0;
  return { count, kinds, brutes, spawnGap, speedScale, hpBonus };
}

export const COMBO_WINDOW = 3.0; // seconds between kills before the combo resets
export const COMBO_MAX = 8;
export const EMBER_VALUE = 25;
export const PICKUP_CHANCE = 0.09; // chance a kill drops a power-up
export const WAVE_CLEAR_BONUS = 500;
export const TELEGRAPH_TIME = 0.45; // seconds a spawn portal warns before the enemy lands
export const DARTER_EASE_WAVE = 4; // darters lunge ~15% slower before this wave
