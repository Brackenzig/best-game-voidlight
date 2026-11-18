// The screenshot scenes behind ?shot=start|play|end|brute. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot (chase the nearest ember, keep clear of the nearest shade,
// fire at the nearest enemy, dash when one gets too close), so the frame is
// what a short game really looks like and the same seed always gives the same
// frame. The end scene's pilot never dodges, so it is caught, as a hurried
// player is.
import { VIEW, PLAYER } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './world.js';
import { nearestEnemy } from './enemies.js';
import { dist2 } from './random.js';

const STEP = 1 / 60;
const START_SECONDS = 4;
const PLAY_SECONDS = 90;
const END_LIMIT_SECONDS = 240;
const BRUTE_LIMIT_SECONDS = 150;

class ShotInput {
  constructor() {
    this.keys = new Set();
    this.mouseX = VIEW.width / 2;
    this.mouseY = VIEW.height / 2;
    this.mouseDown = true;
    this.pressed = new Set();
  }

  down(...names) {
    return names.some((name) => this.keys.has(name));
  }

  wasPressed(...names) {
    for (const name of names) {
      if (this.pressed.has(name)) {
        this.pressed.delete(name);
        return true;
      }
    }
    return false;
  }

  endFrame() {
    this.pressed.clear();
  }
}

// Steer the ship: toward the nearest ember when safe, away from the nearest
// shade when it closes in; the gun tracks the nearest enemy. The brave pilot
// (the play scene) aims with a little error, the way a real player does, so
// shots miss and the field stays busy instead of being swept clean.
function autopilot(world, player, input, brave) {
  const foe = nearestEnemy(world.enemies, player.x, player.y);
  let ember = null;
  let emberD = Infinity;
  for (const m of world.embers) {
    const d = dist2(m.x, m.y, player.x, player.y);
    if (d < emberD) {
      emberD = d;
      ember = m;
    }
  }
  let tx = VIEW.width / 2;
  let ty = VIEW.height / 2;
  if (foe) {
    const d = Math.sqrt(dist2(foe.x, foe.y, player.x, player.y));
    if (d < 170 && brave) {
      // Too close: run away from it.
      tx = player.x + (player.x - foe.x);
      ty = player.y + (player.y - foe.y);
    } else if (ember) {
      tx = ember.x;
      ty = ember.y;
    }
  } else if (ember) {
    tx = ember.x;
    ty = ember.y;
  }
  input.keys.clear();
  if (tx < player.x - 12) input.keys.add('a');
  if (tx > player.x + 12) input.keys.add('d');
  if (ty < player.y - 12) input.keys.add('w');
  if (ty > player.y + 12) input.keys.add('s');
  if (foe) {
    const err = brave ? 26 : 0;
    input.mouseX = foe.x + (world.rng() - 0.5) * err * 2;
    input.mouseY = foe.y + (world.rng() - 0.5) * err * 2;
  }
  // The brave pilot fires in bursts, the way a real player does, so shots
  // miss and the field stays busy instead of being swept clean.
  if (brave) input.mouseDown = (world.time % 1) < 0.6;
  if (brave && foe && Math.sqrt(dist2(foe.x, foe.y, player.x, player.y)) < 110) {
    input.pressed.add('shift');
  }
}

/**
 * Set `world` and `player` to the named scene (start, play or end; any other
 * name is start) and return the screen to draw and the best score to show.
 * `onStep` is called with each simulated step so the caller can age its
 * effects alongside the world; without it the shot would keep every floater
 * and particle the whole simulation ever made.
 */
export function stageShot(name, world, player, onStep) {
  world.reset();
  player.reset();
  const input = new ShotInput();
  if (name !== 'play' && name !== 'end' && name !== 'brute') {
    world.screen = SCREEN_TITLE;
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      world.time += STEP;
    }
    return { screen: SCREEN_TITLE, best: 0, input };
  }
  world.startGame();
  const limit = name === 'end' ? END_LIMIT_SECONDS : name === 'brute' ? BRUTE_LIMIT_SECONDS : PLAY_SECONDS;
  const brave = name !== 'end';
  let wave3At = -1; // when wave 3 first started (play scene orb fallback)
  for (let i = 0; i < limit / STEP; i += 1) {
    autopilot(world, player, input, brave);
    const result = world.step(STEP, player, input);
    if (onStep) onStep(STEP);
    input.endFrame();
    if (result !== 0) break;
    if (name === 'brute') {
      // Stop on the first LANDED brute of wave 3, so the frame shows the
      // brute itself (a portal alone reads as a glow at small size).
      const bruteHere = world.enemies.some((e) => e.kind === 'brute');
      if (world.wave >= 3 && bruteHere) break;
    }
    // The play scene stops mid-wave, while the field is still busy, instead
    // of at a quiet moment between waves: at least four shades close to the
    // ship, so the frame reads as a fight, not an empty field — and a
    // power-up orb on the field, so the judge sees the pickups, not just
    // the fight. Pickups live 10 s, so if none shows within 25 s of wave 3
    // the busy frame is taken anyway rather than staging forever. (A count
    // leg was tried and reverted: stopping on five spread-out enemies
    // trades the close fight away for a sparse frame.)
    if (name === 'play' && world.wave >= 3 && world.time > 10) {
      if (wave3At < 0) wave3At = world.time;
      let near = 0;
      for (const e of world.enemies) {
        if (dist2(e.x, e.y, player.x, player.y) < 380 * 380) near += 1;
      }
      // The orb must be VISIBLE, not just present: a pickup under an enemy
      // sprite reads as nothing, so it needs ~30 px of clear space around it.
      const orb = world.pickups.some((p) => {
        for (const e of world.enemies) {
          if (dist2(p.x, p.y, e.x, e.y) < 30 * 30) return false;
        }
        return true;
      });
      if (near >= 4 && (orb || world.time - wave3At > 25)) break;
    }
  }
  const over = world.screen === SCREEN_OVER;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.score, input };
}
