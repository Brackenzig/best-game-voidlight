// The shades: what spawns, how each kind moves, and what happens when one dies.
// A shade is a plain object; the world owns the list and the collisions.
import { FOES, VIEW, wavePlan, DARTER_EASE_WAVE } from './config.js';
import { range, pick, angleTo, dist2 } from './random.js';

let nextId = 1;

export function makeEnemy(kind, x, y, rng, wave) {
  const def = FOES[kind];
  const plan = wavePlan(wave);
  const hp = def.hp + plan.hpBonus + (kind === 'brute' ? Math.floor(wave / 5) : 0);
  return {
    id: nextId,
    kind,
    x, y,
    vx: 0, vy: 0,
    radius: def.radius,
    hp,
    maxHp: hp,
    speed: def.speed * plan.speedScale * range(rng, 0.9, 1.15),
    score: def.score,
    embers: def.embers,
    color: def.color,
    touch: def.touch,
    // Per-kind state: darters wind up then lunge, splitters count their mites.
    wave,
    lunge: wave < DARTER_EASE_WAVE ? 2.9 : 3.4, // ~15% gentler lunge early on
    state: 0,
    stateT: range(rng, 0, 1.5),
    wobble: rng() * Math.PI * 2,
    flash: 0, // white hit flash, 0..1
  };
}

export function spawnEdge(rng, margin) {
  const side = Math.floor(rng() * 4);
  if (side === 0) return { x: range(rng, 0, VIEW.width), y: -margin };
  if (side === 1) return { x: range(rng, 0, VIEW.width), y: VIEW.height + margin };
  if (side === 2) return { x: -margin, y: range(rng, 0, VIEW.height) };
  return { x: VIEW.width + margin, y: range(rng, 0, VIEW.height) };
}

export function pickKind(rng, kinds) {
  // Shades are the bulk; the other kinds season the wave.
  const roll = rng();
  if (kinds.includes('splitter') && roll < 0.16) return 'splitter';
  if (kinds.includes('darter') && roll < 0.42) return 'darter';
  return 'shade';
}

// One step of one enemy's steering. Returns nothing; mutates the enemy.
export function steerEnemy(e, player, dt, rng) {
  const dx = player.x - e.x;
  const dy = player.y - e.y;
  const d = Math.hypot(dx, dy) || 1;
  const nx = dx / d;
  const ny = dy / d;

  if (e.kind === 'darter') {
    // Wind up (drift slowly, flashing white so the lunge is readable),
    // then lunge straight at the player.
    e.stateT -= dt;
    if (e.state === 0) {
      e.flash = 0.9;
      e.vx = nx * e.speed * 0.35;
      e.vy = ny * e.speed * 0.35;
      if (e.stateT <= 0) {
        e.state = 1;
        e.stateT = 0.55;
      }
    } else {
      e.vx = nx * e.speed * e.lunge;
      e.vy = ny * e.speed * e.lunge;
      if (e.stateT <= 0) {
        e.state = 0;
        e.stateT = range(rng, 0.9, 1.6);
      }
    }
  } else if (e.kind === 'mite') {
    // Small and frantic: chase with a wobble.
    e.wobble += dt * 7;
    const wob = Math.sin(e.wobble) * 0.6;
    e.vx = (nx + -ny * wob) * e.speed;
    e.vy = (ny + nx * wob) * e.speed;
  } else if (e.kind === 'brute') {
    // Slow, unstoppable, and it knocks the player harder.
    e.vx = nx * e.speed;
    e.vy = ny * e.speed;
  } else {
    // Shades and splitters drift in with a slow weave.
    e.wobble += dt * 2.2;
    const wob = Math.sin(e.wobble) * 0.35;
    e.vx = (nx + -ny * wob) * e.speed;
    e.vy = (ny + nx * wob) * e.speed;
  }
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  if (e.flash > 0) e.flash -= dt * 6;
}

// A splitter's death: two mites burst out of it.
export function splitEnemy(e, rng) {
  const mites = [];
  for (let i = 0; i < 2; i += 1) {
    const angle = angleTo(e.x, e.y, e.x + (i === 0 ? 1 : -1), e.y + (i === 0 ? 1 : -1));
    const mite = makeEnemy('mite', e.x + Math.cos(angle) * 14, e.y + Math.sin(angle) * 14, rng, 1);
    mite.vx = Math.cos(angle) * 200;
    mite.vy = Math.sin(angle) * 200;
    mites.push(mite);
  }
  return mites;
}

export function nearestEnemy(enemies, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const e of enemies) {
    const d = dist2(x, y, e.x, e.y);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}
