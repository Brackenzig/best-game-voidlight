// VOIDLIGHT — bootstrap and the main loop. It wires the world, the player,
// the renderer, the sound bank and the input together, runs the state machine
// (title -> play -> game over -> play again), and stages the deterministic
// screenshot scenes behind ?shot=start|play|end|brute.
import { VIEW, PLAYER } from './config.js';
import { mulberry32 } from './random.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { Effects } from './particles.js';
import { Player } from './player.js';
import { World, SCREEN_TITLE, SCREEN_PLAY, SCREEN_OVER, EVENT_OVER } from './world.js';
import { Renderer } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const statusLine = document.getElementById('status');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || 7) >>> 0;
const rng = shotName ? mulberry32(seed) : Math.random;

const input = new Input(canvas);
const sound = new SoundBank();
const effects = new Effects();
const player = new Player();
const renderer = new Renderer(canvas);

let best = 0;
try {
  best = Number(window.localStorage.getItem('voidlight-best') || 0) || 0;
} catch {
  best = 0;
}

const world = new World(rng, {
  onShoot: () => sound.shoot(),
  onHit: (e) => {
    sound.hit();
    effects.burst(e.x, e.y, '#ffffff', 4, 120, 0.25, 2);
  },
  onKill: (e, gained, split) => {
    sound.explode(e.kind === 'brute' || split);
    effects.explosion(e.x, e.y, e.color, e.kind === 'brute');
    effects.floater(e.x, e.y - 10, `+${gained}`, '#ffe9a3');
  },
  onHurt: () => {
    sound.hurt();
    effects.damage();
  },
  onShieldBreak: () => {
    sound.hit();
    effects.rings.push({ x: player.x, y: player.y, r: 10, maxR: 90, life: 0.35, maxLife: 0.35, color: '#7df9ff' });
  },
  onWave: () => sound.waveHorn(),
  onWaveClear: (wave, bonus) => {
    effects.floater(VIEW.width / 2, 170, `WAVE BONUS +${bonus}`, '#7dffb0');
  },
  onEmber: (m) => {
    effects.sparkle(m.x, m.y);
    sound.tone(880 + Math.random() * 220, 0.06, 'sine', 0.06);
  },
  onPickup: (kind) => {
    sound.pickup();
    const labels = { shield: 'SHIELD UP', rapid: 'RAPID FIRE', spread: 'SPREAD SHOT', heart: '+1 HULL' };
    effects.floater(player.x, player.y - 30, labels[kind] || kind, '#7dffb0');
  },
});
world.best = best;
// A handle for automated play-tests (and for curious players in devtools):
// the live world and player, nothing more.
window.__voidlight = { world, player };

input.onFirstGesture = () => sound.unlock();

function saveBest() {
  if (world.score > best) {
    best = world.score;
    world.best = best;
    try {
      window.localStorage.setItem('voidlight-best', String(best));
    } catch {
      // Private mode or file://: the best score just does not persist.
    }
  }
}

function announce(text) {
  if (statusLine) statusLine.textContent = text;
}

// ---- Screenshot mode: stage one deterministic frame and hold it. ----
if (shotName) {
  const staged = stageShot(shotName, world, player, (dt) => effects.update(dt));
  world.best = staged.best > 0 ? staged.best : best;
  if (staged.screen === SCREEN_OVER) saveBest();
  effects.shake = 0;
  effects.flash = 0;
  renderer.draw(world, player, effects, false);
  announce(staged.screen === SCREEN_TITLE ? 'VOIDLIGHT title screen' : staged.screen === SCREEN_OVER ? 'Game over' : 'VOIDLIGHT in play');
  window.__voidlightReady = true;
} else {
  // ---- Live mode. ----
  let paused = false;
  let last = performance.now();

  function frame(now) {
    const rawDt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (input.wasPressed('m')) {
      const muted = sound.toggleMute();
      announce(muted ? 'Sound muted' : 'Sound on');
    }

    if (world.screen === SCREEN_TITLE) {
      if (input.wasPressed('enter') || input.mouseDown) {
        world.startGame();
        announce('Game started. Survive the waves.');
      }
    } else if (world.screen === SCREEN_OVER) {
      if (input.wasPressed('r', 'enter') || input.mouseDown) {
        player.reset();
        world.startGame();
        announce('Game started. Survive the waves.');
      }
    } else if (world.screen === SCREEN_PLAY) {
      if (input.wasPressed('p', 'escape')) {
        paused = !paused;
        announce(paused ? 'Paused' : 'Resumed');
      }
      if (!paused) {
        if (effects.hitStop > 0) {
          effects.update(rawDt);
        } else {
          const result = world.step(rawDt, player, input);
          if (result === EVENT_OVER) {
            sound.gameOver();
            saveBest();
            announce(`Game over. Score ${world.score}. Press R to play again.`);
          }
          effects.update(rawDt);
        }
        // Engine trail while moving or dashing.
        if (player.thrust > 0 || player.dashTimer > 0) {
          const back = player.angle + Math.PI;
          effects.trail(
            player.x + Math.cos(back) * (PLAYER.radius + 4),
            player.y + Math.sin(back) * (PLAYER.radius + 4),
            '#7df9ff',
          );
        }
      }
    }

    renderer.draw(world, player, effects, paused);
    input.endFrame();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
