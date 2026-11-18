// The world: waves, bullets, embers, pickups, collisions, score and combo.
// It knows nothing about drawing or sound; it reports events and the caller
// turns them into effects and noise.
import {
  VIEW, PLAYER, FOES, COMBO_WINDOW, COMBO_MAX, EMBER_VALUE,
  PICKUP_CHANCE, WAVE_CLEAR_BONUS, TELEGRAPH_TIME, wavePlan,
} from './config.js';
import { makeEnemy, spawnEdge, pickKind, steerEnemy, splitEnemy } from './enemies.js';
import { range, pick, angleTo, dist2, clamp } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

export const EVENT_OVER = 1;
export const EVENT_WAVE_CLEAR = 2;

const PICKUP_KINDS = ['shield', 'rapid', 'spread', 'heart'];

export class World {
  constructor(rng, events) {
    this.rng = rng;
    this.events = events; // { onKill, onPickup, onHurt, onWave, onEmber }
    this.reset();
  }

  reset() {
    this.screen = SCREEN_TITLE;
    this.score = 0;
    this.best = 0;
    this.wave = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.multiplier = 1;
    this.kills = 0;
    this.embersCollected = 0;
    this.time = 0;
    this.waveState = 'idle'; // idle | spawning | fighting | clear
    this.waveTimer = 0;
    this.spawnLeft = 0;
    this.spawnTimer = 0;
    this.banner = '';
    this.bannerTimer = 0;
    this.telegraphs = []; // spawn portals waiting to land their enemy
    this.shieldDropPending = false; // wave 2's first kill always drops a Shield
    this.hintLines = []; // wave-1 teaching text
    this.hintTimer = 0;
    this.enemies = [];
    this.bullets = [];
    this.embers = [];
    this.pickups = [];
    this.emberMagnet = 0;
  }

  startGame() {
    this.score = 0;
    this.wave = 0;
    this.combo = 0;
    this.multiplier = 1;
    this.kills = 0;
    this.embersCollected = 0;
    this.time = 0;
    this.enemies = [];
    this.bullets = [];
    this.embers = [];
    this.pickups = [];
    this.telegraphs = [];
    this.shieldDropPending = false;
    this.hintLines = [];
    this.hintTimer = 0;
    this.screen = SCREEN_PLAY;
    this.nextWave();
  }

  nextWave() {
    this.wave += 1;
    const plan = wavePlan(this.wave);
    this.spawnLeft = plan.count + plan.brutes;
    this.spawnTimer = 0.4;
    this.waveState = 'spawning';
    this.banner = this.wave === 1
      ? 'WAVE 1 — THE VOID STIRS'
      : `WAVE ${this.wave} — THEY COME ${this.wave === 3 || this.wave % 5 === 0 ? 'HEAVIER' : 'FASTER'}`;
    this.bannerTimer = 2.2;
    // Wave 2 always opens with a Shield on its first kill, and wave 1
    // teaches the controls on screen for its first seconds.
    this.shieldDropPending = this.wave === 2;
    if (this.wave === 1) {
      this.hintLines = [
        'WASD move  ·  MOUSE aim  ·  SPACE auto-fires at the nearest shade',
        'SHADE chases you  ·  DARTER lunges — dash sideways with SHIFT',
      ];
      this.hintTimer = 6;
    }
    if (this.events.onWave) this.events.onWave(this.wave);
  }

  spawnOne() {
    const plan = wavePlan(this.wave);
    const at = spawnEdge(this.rng, 40);
    let kind;
    if (plan.brutes > 0 && this.spawnLeft <= plan.brutes) {
      kind = 'brute';
    } else {
      kind = pickKind(this.rng, plan.kinds);
    }
    // Enemies arrive through a short portal telegraph so no death feels cheap.
    this.telegraphs.push({ x: at.x, y: at.y, kind, timer: TELEGRAPH_TIME, total: TELEGRAPH_TIME });
    this.spawnLeft -= 1;
  }

  fireBullet(player) {
    const spread = player.spread > 0;
    const angles = spread ? [-0.16, 0, 0.16] : [0];
    for (const off of angles) {
      const a = player.angle + off;
      const mx = Math.cos(a) * (PLAYER.radius + 8);
      const my = Math.sin(a) * (PLAYER.radius + 8);
      this.bullets.push({
        x: player.x + mx,
        y: player.y + my,
        vx: Math.cos(a) * PLAYER.bulletSpeed,
        vy: Math.sin(a) * PLAYER.bulletSpeed,
        radius: PLAYER.bulletRadius,
        damage: PLAYER.bulletDamage,
        life: 1.1,
      });
    }
  }

  dropEmbers(x, y, count) {
    for (let i = 0; i < count; i += 1) {
      const a = this.rng() * Math.PI * 2;
      const v = range(this.rng, 40, 130);
      this.embers.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        radius: 6,
        life: 9,
        phase: this.rng() * Math.PI * 2,
      });
    }
  }

  dropPickup(x, y) {
    this.dropPickupKind(x, y, pick(this.rng, PICKUP_KINDS));
  }

  dropPickupKind(x, y, kind) {
    this.pickups.push({ x, y, kind, radius: 13, life: 10, phase: this.rng() * Math.PI * 2 });
  }

  killEnemy(e, index) {
    const gained = e.score * this.multiplier;
    this.score += gained;
    this.kills += 1;
    this.combo += 1;
    this.comboTimer = COMBO_WINDOW;
    this.multiplier = Math.min(COMBO_MAX, 1 + Math.floor(this.combo / 4));
    this.dropEmbers(e.x, e.y, e.embers);
    if (this.shieldDropPending) {
      // Wave 2's first kill always drops a Shield: the kit shows up early.
      this.dropPickupKind(e.x, e.y, 'shield');
      this.shieldDropPending = false;
    } else if (e.kind === 'brute') {
      // A brute always drops a power-up: beating one should feel rewarding.
      this.dropPickup(e.x, e.y);
    } else if (this.rng() < PICKUP_CHANCE) {
      this.dropPickup(e.x, e.y);
    }
    const extra = e.kind === 'splitter' ? splitEnemy(e, this.rng) : [];
    this.enemies.splice(index, 1);
    for (const mite of extra) this.enemies.push(mite);
    if (this.events.onKill) this.events.onKill(e, gained, extra.length > 0);
    return gained;
  }

  step(dt, player, input) {
    if (this.screen !== SCREEN_PLAY) return 0;
    this.time += dt;
    if (this.bannerTimer > 0) this.bannerTimer -= dt;
    if (this.hintTimer > 0) this.hintTimer -= dt;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.multiplier = 1;
      }
    }

    // Spawning.
    if (this.waveState === 'spawning') {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.spawnLeft > 0) {
        this.spawnOne();
        this.spawnTimer = wavePlan(this.wave).spawnGap;
      }
      if (this.spawnLeft <= 0) this.waveState = 'fighting';
    }

    // Spawn portals: warn, then land the enemy.
    for (let i = this.telegraphs.length - 1; i >= 0; i -= 1) {
      const t = this.telegraphs[i];
      t.timer -= dt;
      if (t.timer <= 0) {
        this.enemies.push(makeEnemy(t.kind, t.x, t.y, this.rng, this.wave));
        this.telegraphs.splice(i, 1);
      }
    }

    // Player.
    player.update(dt, input, this.enemies, (p) => {
      this.fireBullet(p);
      if (this.events.onShoot) this.events.onShoot();
    });

    // Bullets.
    for (let i = this.bullets.length - 1; i >= 0; i -= 1) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > VIEW.width + 20 || b.y < -20 || b.y > VIEW.height + 20) {
        this.bullets.splice(i, 1);
      }
    }

    // Enemies steer.
    for (const e of this.enemies) steerEnemy(e, player, dt, this.rng);

    // Bullets vs enemies.
    for (let bi = this.bullets.length - 1; bi >= 0; bi -= 1) {
      const b = this.bullets[bi];
      let hit = false;
      for (let ei = this.enemies.length - 1; ei >= 0; ei -= 1) {
        const e = this.enemies[ei];
        const rr = b.radius + e.radius;
        if (dist2(b.x, b.y, e.x, e.y) < rr * rr) {
          e.hp -= b.damage;
          e.flash = 1;
          this.bullets.splice(bi, 1);
          hit = true;
          if (e.hp <= 0) this.killEnemy(e, ei);
          else if (this.events.onHit) this.events.onHit(e);
          break;
        }
      }
      if (hit) continue;
    }

    // Enemies vs player.
    if (player.alive && player.invuln <= 0) {
      for (const e of this.enemies) {
        const rr = e.radius + PLAYER.radius - 4;
        if (dist2(e.x, e.y, player.x, player.y) < rr * rr) {
          const result = player.hurt();
          if (result === 'hit') {
            this.combo = 0;
            this.multiplier = 1;
            if (this.events.onHurt) this.events.onHurt(e);
          } else if (result === 'shield' && this.events.onShieldBreak) {
            this.events.onShieldBreak(e);
          }
          // The enemy recoils so it cannot hit twice in one pass.
          const a = angleTo(player.x, player.y, e.x, e.y);
          e.x += Math.cos(a) * 26;
          e.y += Math.sin(a) * 26;
          break;
        }
      }
    }

    // Embers drift, then magnetize toward the player when close.
    for (let i = this.embers.length - 1; i >= 0; i -= 1) {
      const m = this.embers[i];
      m.life -= dt;
      m.phase += dt * 5;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.vx *= 1 - 2.0 * dt;
      m.vy *= 1 - 2.0 * dt;
      const d2 = dist2(m.x, m.y, player.x, player.y);
      if (d2 < 130 * 130) {
        const d = Math.sqrt(d2) || 1;
        const pull = 620 * (1 - d / 130) + 160;
        m.vx += ((player.x - m.x) / d) * pull * dt;
        m.vy += ((player.y - m.y) / d) * pull * dt;
      }
      const rr = m.radius + PLAYER.radius;
      if (d2 < rr * rr) {
        this.score += EMBER_VALUE * this.multiplier;
        this.embersCollected += 1;
        if (this.events.onEmber) this.events.onEmber(m);
        this.embers.splice(i, 1);
        continue;
      }
      if (m.life <= 0) this.embers.splice(i, 1);
    }

    // Pickups.
    for (let i = this.pickups.length - 1; i >= 0; i -= 1) {
      const p = this.pickups[i];
      p.life -= dt;
      p.phase += dt * 4;
      const rr = p.radius + PLAYER.radius;
      if (dist2(p.x, p.y, player.x, player.y) < rr * rr) {
        this.applyPickup(p, player);
        this.pickups.splice(i, 1);
        continue;
      }
      if (p.life <= 0) this.pickups.splice(i, 1);
    }

    // Wave clear: nothing left to spawn, no portal pending, nothing alive.
    if (this.waveState === 'fighting' && this.enemies.length === 0 && this.telegraphs.length === 0 && this.spawnLeft <= 0) {
      const bonus = WAVE_CLEAR_BONUS * this.wave;
      this.score += bonus;
      this.waveState = 'clear';
      this.waveTimer = 1.6;
      this.banner = `WAVE ${this.wave} CLEAR  +${bonus}`;
      this.bannerTimer = 1.6;
      if (this.events.onWaveClear) this.events.onWaveClear(this.wave, bonus);
    }
    if (this.waveState === 'clear') {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) this.nextWave();
    }

    if (!player.alive) {
      this.screen = SCREEN_OVER;
      if (this.score > this.best) this.best = this.score;
      return EVENT_OVER;
    }
    return 0;
  }

  applyPickup(p, player) {
    if (p.kind === 'shield') player.shield = 8;
    else if (p.kind === 'rapid') player.rapid = 8;
    else if (p.kind === 'spread') player.spread = 8;
    else if (p.kind === 'heart') player.hull = Math.min(PLAYER.maxHull, player.hull + 1);
    if (this.events.onPickup) this.events.onPickup(p.kind);
  }
}
