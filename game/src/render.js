// Everything the eye sees: the void, the lantern-ship, the shades, the HUD,
// and the title / pause / game-over screens. All drawing lives here so the
// game logic never thinks about pixels.
import { VIEW, PALETTE, PLAYER, FOES } from './config.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_OVER } from './world.js';

const PICKUP_COLORS = {
  shield: '#7df9ff',
  rapid: '#ffe9a3',
  spread: '#ff9df5',
  heart: '#ff5d5d',
};

const PICKUP_LABELS = {
  shield: 'SHIELD',
  rapid: 'RAPID FIRE',
  spread: 'SPREAD SHOT',
  heart: '+1 HULL',
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stars = [];
    for (let i = 0; i < 140; i += 1) {
      this.stars.push({
        x: Math.random() * VIEW.width,
        y: Math.random() * VIEW.height,
        r: Math.random() * 1.6 + 0.4,
        tw: Math.random() * Math.PI * 2,
        sp: 0.5 + Math.random() * 1.5,
      });
    }
    this.nebulae = [
      { x: 220, y: 180, r: 260, color: PALETTE.nebulaA },
      { x: 1020, y: 620, r: 300, color: PALETTE.nebulaB },
      { x: 980, y: 140, r: 200, color: PALETTE.nebulaC },
      { x: 180, y: 640, r: 220, color: PALETTE.nebulaB },
    ];
  }

  drawBackground(time) {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
    g.addColorStop(0, PALETTE.voidTop);
    g.addColorStop(1, PALETTE.voidBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    for (const n of this.nebulae) {
      const rg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      rg.addColorStop(0, n.color);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    }
    for (const s of this.stars) {
      const a = 0.35 + 0.65 * Math.abs(Math.sin(time * s.sp + s.tw));
      ctx.globalAlpha = a;
      ctx.fillStyle = PALETTE.star;
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    ctx.globalAlpha = 1;
  }

  drawEmbers(embers) {
    const ctx = this.ctx;
    for (const m of embers) {
      const pulse = 1 + Math.sin(m.phase) * 0.25;
      ctx.save();
      ctx.shadowColor = PALETTE.emberGlow;
      ctx.shadowBlur = 12;
      ctx.fillStyle = PALETTE.ember;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#fff6d8';
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius * 0.4 * pulse, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawPickups(pickups) {
    const ctx = this.ctx;
    for (const p of pickups) {
      const bob = Math.sin(p.phase) * 3;
      const color = PICKUP_COLORS[p.kind];
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y + bob, p.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(5,6,15,0.85)';
      ctx.fill();
      ctx.fillStyle = color;
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.kind === 'heart' ? '♥' : p.kind[0].toUpperCase(), p.x, p.y + bob + 0.5);
      ctx.restore();
    }
  }

  drawEnemies(enemies) {
    const ctx = this.ctx;
    for (const e of enemies) {
      const flash = e.flash > 0;
      ctx.save();
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 16;
      ctx.fillStyle = flash ? '#ffffff' : e.color;
      if (e.kind === 'brute') {
        // A heavy hexagon with a burning core.
        ctx.beginPath();
        for (let i = 0; i < 6; i += 1) {
          const a = (i / 6) * Math.PI * 2 + 0.3;
          const px = e.x + Math.cos(a) * e.radius;
          const py = e.y + Math.sin(a) * e.radius;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#2b0a00';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffd27d';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * 0.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.kind === 'darter') {
        // A dart: a triangle pointing at its velocity.
        const a = Math.atan2(e.vy, e.vx);
        ctx.translate(e.x, e.y);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(e.radius + 4, 0);
        ctx.lineTo(-e.radius, e.radius * 0.8);
        ctx.lineTo(-e.radius * 0.4, 0);
        ctx.lineTo(-e.radius, -e.radius * 0.8);
        ctx.closePath();
        ctx.fill();
      } else {
        // Shades, splitters and mites: spiked orbs.
        ctx.beginPath();
        const spikes = e.kind === 'splitter' ? 8 : 6;
        for (let i = 0; i < spikes * 2; i += 1) {
          const a = (i / (spikes * 2)) * Math.PI * 2 + e.wobble * 0.3;
          const r = i % 2 === 0 ? e.radius : e.radius * 0.62;
          const px = e.x + Math.cos(a) * r;
          const py = e.y + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(5,6,15,0.9)';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * 0.42, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(e.x - e.radius * 0.14, e.y - e.radius * 0.1, 2.2, 0, Math.PI * 2);
        ctx.arc(e.x + e.radius * 0.16, e.y - e.radius * 0.1, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      // A thin health bar over anything hurt.
      if (e.hp < e.maxHp && e.maxHp > 1) {
        const w = e.radius * 2;
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w, 4);
        ctx.fillStyle = '#ff5d5d';
        ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w * (e.hp / e.maxHp), 4);
      }
    }
  }

  // Spawn portals: a shrinking ring and a growing core where an enemy lands.
  drawTelegraphs(telegraphs) {
    const ctx = this.ctx;
    for (const t of telegraphs) {
      const frac = 1 - t.timer / t.total;
      const color = FOES[t.kind].color;
      ctx.save();
      ctx.globalAlpha = 0.4 + 0.5 * frac;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 36 - frac * 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.25 + 0.5 * frac;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 4 + frac * 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawBullets(bullets) {
    const ctx = this.ctx;
    for (const b of bullets) {
      ctx.save();
      ctx.shadowColor = PALETTE.bulletGlow;
      ctx.shadowBlur = 10;
      ctx.fillStyle = PALETTE.bullet;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawPlayer(player, time) {
    const ctx = this.ctx;
    if (!player.alive) return;
    const blink = player.invuln > 0 && Math.floor(time * 14) % 2 === 0;
    ctx.save();
    if (blink) ctx.globalAlpha = 0.35;
    // Engine trail.
    if (player.thrust > 0 || player.dashTimer > 0) {
      const back = player.angle + Math.PI;
      const tx = player.x + Math.cos(back) * (PLAYER.radius + 6);
      const ty = player.y + Math.sin(back) * (PLAYER.radius + 6);
      ctx.shadowColor = PALETTE.playerGlow;
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#ffd27d';
      ctx.beginPath();
      ctx.arc(tx, ty, 5 + Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Shield ring.
    if (player.shield > 0) {
      ctx.strokeStyle = 'rgba(125, 249, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y, PLAYER.radius + 10 + Math.sin(time * 6) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    // The lantern-ship: a dart with a glowing core.
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.shadowColor = PALETTE.playerGlow;
    ctx.shadowBlur = 18;
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.moveTo(PLAYER.radius + 6, 0);
    ctx.lineTo(-PLAYER.radius * 0.7, PLAYER.radius * 0.75);
    ctx.lineTo(-PLAYER.radius * 0.35, 0);
    ctx.lineTo(-PLAYER.radius * 0.7, -PLAYER.radius * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.playerCore;
    ctx.beginPath();
    ctx.arc(2, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawHud(world, player) {
    const ctx = this.ctx;
    ctx.textBaseline = 'alphabetic';
    // Score, top left.
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.hud;
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillText(String(world.score).padStart(6, '0'), 22, 44);
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.hudDim;
    ctx.fillText(`BEST ${Math.max(world.best, world.score)}`, 24, 66);
    ctx.fillText(`EMBERS ${world.embersCollected}`, 24, 86);
    // Combo, under the score when it matters.
    if (world.multiplier > 1) {
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.fillStyle = PALETTE.ember;
      ctx.fillText(`COMBO x${world.multiplier}`, 24, 118);
      ctx.fillStyle = 'rgba(255,179,71,0.35)';
      const w = 130 * (world.comboTimer / 3);
      ctx.fillRect(24, 126, w, 7);
    }
    // Wave, top centre.
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.hud;
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText(world.wave > 0 ? `WAVE ${world.wave}` : 'VOIDLIGHT', VIEW.width / 2, 40);
    // Hull hearts, top right.
    ctx.textAlign = 'right';
    for (let i = 0; i < PLAYER.maxHull; i += 1) {
      const x = VIEW.width - 30 - i * 34;
      ctx.font = '28px system-ui, sans-serif';
      ctx.fillStyle = i < player.hull ? '#ff5d5d' : 'rgba(255,93,93,0.22)';
      ctx.fillText('♥', x, 42);
    }
    // Active power-ups, under the hearts.
    const active = [];
    if (player.shield > 0) active.push(`SHIELD ${Math.ceil(player.shield)}s`);
    if (player.rapid > 0) active.push(`RAPID ${Math.ceil(player.rapid)}s`);
    if (player.spread > 0) active.push(`SPREAD ${Math.ceil(player.spread)}s`);
    if (active.length > 0) {
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillStyle = PALETTE.good;
      active.forEach((label, i) => {
        ctx.fillText(label, VIEW.width - 24, 72 + i * 20);
      });
    }
    // Dash cooldown, bottom centre.
    const dashFrac = player.dashReady ? 1 : 1 - player.dashCooldown / 1.15;
    ctx.textAlign = 'center';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.hudDim;
    ctx.fillText(player.dashReady ? 'DASH READY  [SHIFT]' : 'DASH…', VIEW.width / 2, VIEW.height - 34);
    ctx.fillStyle = 'rgba(125,249,255,0.25)';
    ctx.fillRect(VIEW.width / 2 - 60, VIEW.height - 28, 120, 5);
    ctx.fillStyle = PALETTE.player;
    ctx.fillRect(VIEW.width / 2 - 60, VIEW.height - 28, 120 * dashFrac, 5);
    // Wave banner.
    if (world.bannerTimer > 0) {
      const a = Math.min(1, world.bannerTimer);
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      ctx.font = 'bold 30px system-ui, sans-serif';
      ctx.fillStyle = PALETTE.hud;
      ctx.fillText(world.banner, VIEW.width / 2, 130);
      ctx.globalAlpha = 1;
    }
    // Wave-1 teaching hints, fading out over the first seconds.
    if (world.hintTimer > 0 && world.hintLines.length > 0) {
      const a = Math.min(1, world.hintTimer / 1.5);
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillStyle = PALETTE.hud;
      world.hintLines.forEach((line, i) => {
        ctx.fillText(line, VIEW.width / 2, VIEW.height - 116 + i * 26);
      });
      ctx.globalAlpha = 1;
    }
  }

  drawTitle(world) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(5,6,15,0.45)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.save();
    ctx.shadowColor = PALETTE.playerGlow;
    ctx.shadowBlur = 30;
    ctx.fillStyle = PALETTE.player;
    ctx.font = 'bold 92px system-ui, sans-serif';
    ctx.fillText('VOIDLIGHT', VIEW.width / 2, 250);
    ctx.restore();
    // One-line objective: what to do and why.
    ctx.fillStyle = PALETTE.ember;
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText('Survive the waves. Kill fast to build your combo.', VIEW.width / 2, 300);
    ctx.fillStyle = PALETTE.hud;
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('Keep the last lantern burning. The void sends its shades —', VIEW.width / 2, 336);
    ctx.fillText('shoot them down, gather their embers, and survive.', VIEW.width / 2, 362);
    // Control card: everything a cold player needs, in one box.
    const cardX = 300;
    const cardY = 392;
    const cardW = VIEW.width - 600;
    const cardH = 116;
    ctx.fillStyle = 'rgba(125, 249, 255, 0.07)';
    ctx.fillRect(cardX, cardY, cardW, cardH);
    ctx.strokeStyle = 'rgba(125, 249, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cardX, cardY, cardW, cardH);
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.hud;
    ctx.fillText('WASD / ARROWS — move      MOUSE — aim      CLICK — fire', VIEW.width / 2, cardY + 30);
    ctx.fillStyle = PALETTE.ember;
    ctx.fillText('SPACE — auto-fire at the nearest enemy', VIEW.width / 2, cardY + 60);
    ctx.fillStyle = PALETTE.hud;
    ctx.fillText('SHIFT — dash (brief invulnerability)      P — pause      M — mute', VIEW.width / 2, cardY + 90);
    // One short fun line: the variety pitch, in one breath.
    ctx.fillStyle = PALETTE.good;
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText('5 enemy types  ·  combos to x8  ·  4 power-ups  ·  dash with i-frames', VIEW.width / 2, 540);
    ctx.fillStyle = PALETTE.hud;
    ctx.font = 'bold 26px system-ui, sans-serif';
    const pulse = 0.65 + 0.35 * Math.sin(performance.now() / 350);
    ctx.globalAlpha = pulse;
    ctx.fillText('CLICK OR PRESS ENTER TO BEGIN', VIEW.width / 2, 572);
    ctx.globalAlpha = 1;
    if (world.best > 0) {
      ctx.font = '18px system-ui, sans-serif';
      ctx.fillStyle = PALETTE.hudDim;
      ctx.fillText(`BEST SCORE ${world.best}`, VIEW.width / 2, 616);
    }
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.hudDim;
    ctx.fillText('A complete game in one file set — waves, combos, power-ups, and a restart.', VIEW.width / 2, 740);
  }

  drawPaused() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(5,6,15,0.6)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.hud;
    ctx.font = 'bold 54px system-ui, sans-serif';
    ctx.fillText('PAUSED', VIEW.width / 2, 380);
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('Press P or click to keep flying', VIEW.width / 2, 430);
  }

  drawGameOver(world) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(5,6,15,0.62)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.danger;
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.fillText('THE LIGHT GOES OUT', VIEW.width / 2, 250);
    ctx.fillStyle = PALETTE.hud;
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText('The shades take the lantern — but its score remains.', VIEW.width / 2, 300);
    ctx.font = 'bold 56px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.ember;
    ctx.fillText(String(world.score), VIEW.width / 2, 390);
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.hud;
    ctx.fillText(`WAVE ${world.wave}   •   ${world.kills} SHADES DOWN   •   ${world.embersCollected} EMBERS`, VIEW.width / 2, 440);
    if (world.score >= world.best && world.score > 0) {
      ctx.fillStyle = PALETTE.good;
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText('★ NEW BEST SCORE ★', VIEW.width / 2, 490);
    } else {
      ctx.fillStyle = PALETTE.hudDim;
      ctx.font = '18px system-ui, sans-serif';
      ctx.fillText(`BEST ${world.best}`, VIEW.width / 2, 490);
    }
    const pulse = 0.65 + 0.35 * Math.sin(performance.now() / 350);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = PALETTE.hud;
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText('PRESS R OR CLICK TO FLY AGAIN', VIEW.width / 2, 570);
    ctx.globalAlpha = 1;
  }

  // One full frame for the given state.
  draw(world, player, effects, paused) {
    const ctx = this.ctx;
    ctx.save();
    if (effects.shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * effects.shake, (Math.random() - 0.5) * effects.shake);
    }
    this.drawBackground(world.time);
    this.drawEmbers(world.embers);
    this.drawPickups(world.pickups);
    this.drawTelegraphs(world.telegraphs);
    this.drawEnemies(world.enemies);
    this.drawBullets(world.bullets);
    this.drawPlayer(player, world.time);
    effects.draw(ctx);
    ctx.restore();
    if (world.screen === SCREEN_PLAY) this.drawHud(world, player);
    if (world.screen === SCREEN_TITLE) this.drawTitle(world);
    if (world.screen === SCREEN_OVER) this.drawGameOver(world);
    if (paused) this.drawPaused();
    // Damage vignette.
    if (effects.flash > 0) {
      const g = ctx.createRadialGradient(
        VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.35,
        VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.75,
      );
      g.addColorStop(0, 'rgba(255,40,40,0)');
      g.addColorStop(1, `rgba(255,40,40,${0.5 * effects.flash})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }
  }
}
