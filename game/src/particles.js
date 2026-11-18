// Particles, floating score text, shockwave rings and the screen shake.
// Everything here is cosmetic: it never changes the game state.
import { PALETTE } from './config.js';

export class Effects {
  constructor() {
    this.particles = [];
    this.floaters = [];
    this.rings = [];
    this.shake = 0;
    this.flash = 0; // red damage vignette, 0..1
    this.hitStop = 0; // seconds the world freezes after a big kill
  }

  burst(x, y, color, count, speed, life, size) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.7);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: life * (0.5 + Math.random() * 0.5),
        maxLife: life,
        size: size * (0.6 + Math.random() * 0.8),
        color,
      });
    }
  }

  explosion(x, y, color, big) {
    this.burst(x, y, color, big ? 42 : 22, big ? 320 : 240, big ? 0.8 : 0.55, big ? 4.5 : 3.5);
    this.burst(x, y, '#ffffff', big ? 10 : 5, 140, 0.3, 2.5);
    this.rings.push({ x, y, r: 6, maxR: big ? 120 : 70, life: 0.4, maxLife: 0.4, color });
    this.shake = Math.min(12, this.shake + (big ? 8 : 4));
    if (big) this.hitStop = Math.max(this.hitStop, 0.06);
  }

  trail(x, y, color) {
    this.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 40,
      vy: (Math.random() - 0.5) * 40,
      life: 0.35, maxLife: 0.35,
      size: 3, color,
    });
  }

  sparkle(x, y) {
    this.burst(x, y, PALETTE.ember, 6, 90, 0.4, 2.5);
  }

  floater(x, y, text, color) {
    this.floaters.push({ x, y, text, color: color || PALETTE.hud, life: 0.9, maxLife: 0.9 });
  }

  damage() {
    this.flash = 1;
    this.shake = Math.min(12, this.shake + 7);
  }

  update(dt) {
    if (this.hitStop > 0) this.hitStop -= dt;
    this.shake = Math.max(0, this.shake - dt * 48);
    this.flash = Math.max(0, this.flash - dt * 2.2);
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 2.4 * dt;
      p.vy *= 1 - 2.4 * dt;
    }
    for (let i = this.floaters.length - 1; i >= 0; i -= 1) {
      const f = this.floaters[i];
      f.life -= dt;
      f.y -= 42 * dt;
      if (f.life <= 0) this.floaters.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i -= 1) {
      const r = this.rings[i];
      r.life -= dt;
      r.r += (r.maxR - r.r) * dt * 9;
      if (r.life <= 0) this.rings.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const r of this.rings) {
      ctx.globalAlpha = Math.max(0, r.life / r.maxLife) * 0.8;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const f of this.floaters) {
      ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }
}
