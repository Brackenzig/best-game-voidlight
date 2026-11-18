// The lantern-ship: movement with acceleration and drag, a dash with a
// cooldown and brief invulnerability, and a weapon that fires toward the
// mouse (or, with Space, toward the nearest enemy).
import { PLAYER, PALETTE, VIEW } from './config.js';
import { clamp, angleTo } from './random.js';

export class Player {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = VIEW.width / 2;
    this.y = VIEW.height / 2;
    this.vx = 0;
    this.vy = 0;
    this.angle = -Math.PI / 2;
    this.hull = PLAYER.maxHull;
    this.fireTimer = 0;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.dashDirX = 0;
    this.dashDirY = -1;
    this.invuln = 0;
    this.shield = 0; // seconds of shield left
    this.rapid = 0;
    this.spread = 0;
    this.thrust = 0; // 0..1, how hard the engines are pushing (for the trail)
  }

  get alive() {
    return this.hull > 0;
  }

  get dashReady() {
    return this.dashCooldown <= 0;
  }

  update(dt, input, enemies, fire) {
    if (this.invuln > 0) this.invuln -= dt;
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.shield > 0) this.shield -= dt;
    if (this.rapid > 0) this.rapid -= dt;
    if (this.spread > 0) this.spread -= dt;

    // Steering: WASD or arrows, normalized so diagonals are not faster.
    let ax = 0;
    let ay = 0;
    if (input.down('a', 'arrowleft')) ax -= 1;
    if (input.down('d', 'arrowright')) ax += 1;
    if (input.down('w', 'arrowup')) ay -= 1;
    if (input.down('s', 'arrowdown')) ay += 1;
    const len = Math.hypot(ax, ay);
    if (len > 0) {
      ax /= len;
      ay /= len;
    }
    this.thrust = len > 0 ? 1 : 0;

    if (this.dashTimer > 0) {
      // Mid-dash: keep the burst direction, ignore steering.
      this.dashTimer -= dt;
      this.vx = this.dashDirX * PLAYER.dashSpeed;
      this.vy = this.dashDirY * PLAYER.dashSpeed;
    } else {
      this.vx += ax * PLAYER.accel * dt;
      this.vy += ay * PLAYER.accel * dt;
      const drag = Math.max(0, 1 - PLAYER.drag * dt);
      this.vx *= drag;
      this.vy *= drag;
      const speed = Math.hypot(this.vx, this.vy);
      if (speed > PLAYER.maxSpeed) {
        this.vx = (this.vx / speed) * PLAYER.maxSpeed;
        this.vy = (this.vy / speed) * PLAYER.maxSpeed;
      }
      // Dash: Shift (or right mouse) bursts toward the current move direction,
      // or toward the aim when standing still.
      if (input.wasPressed('shift') && this.dashReady) {
        let dx = ax;
        let dy = ay;
        if (len === 0) {
          dx = Math.cos(this.angle);
          dy = Math.sin(this.angle);
        }
        this.dashDirX = dx;
        this.dashDirY = dy;
        this.dashTimer = PLAYER.dashTime;
        this.dashCooldown = PLAYER.dashCooldown;
        this.invuln = Math.max(this.invuln, PLAYER.dashInvuln);
      }
    }

    this.x = clamp(this.x + this.vx * dt, PLAYER.radius, VIEW.width - PLAYER.radius);
    this.y = clamp(this.y + this.vy * dt, PLAYER.radius, VIEW.height - PLAYER.radius);

    // Aim: the mouse when it has moved, else the nearest enemy for Space fire.
    const firingMouse = input.mouseDown;
    const firingKeys = input.down(' ');
    if (firingMouse) {
      this.angle = angleTo(this.x, this.y, input.mouseX, input.mouseY);
    } else if (firingKeys && enemies.length > 0) {
      let best = null;
      let bestD = Infinity;
      for (const e of enemies) {
        const d = (e.x - this.x) ** 2 + (e.y - this.y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = e;
        }
      }
      if (best) this.angle = angleTo(this.x, this.y, best.x, best.y);
    }

    // Fire toward the aim while the trigger is held.
    this.fireTimer -= dt;
    const interval = this.rapid > 0 ? PLAYER.rapidInterval : PLAYER.fireInterval;
    if ((firingMouse || firingKeys) && this.fireTimer <= 0) {
      this.fireTimer = interval;
      fire(this);
    }
  }

  hurt() {
    if (this.invuln > 0) return false;
    if (this.shield > 0) {
      this.shield = 0;
      this.invuln = PLAYER.hitInvuln;
      return 'shield';
    }
    this.hull -= 1;
    this.invuln = PLAYER.hitInvuln;
    return 'hit';
  }
}
