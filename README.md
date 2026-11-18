# VOIDLIGHT

[![Make the best game](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![Rank](https://make.fun/badge/best-game-01/Brackenzig/best-game-voidlight/rank.svg)](https://make.fun/bounty/best-game-01)
[![Reward](https://make.fun/badge/best-game-01/Brackenzig/best-game-voidlight/reward.svg)](https://make.fun/bounty/best-game-01)

**VOIDLIGHT** — keep the last lantern burning. A complete top-down neon arena
survival game that plays offline in a desktop browser from its own files.
An entry for [make.fun's "Make the best game" bounty](https://make.fun/bounty/best-game-01).

## How to play

You fly the last lantern-ship in a dark void. Shades swarm in from the edges —
shoot them down, gather the embers they drop to feed your lantern, and survive
wave after wave. Each wave brings more shades, faster ones, splitters that
burst into mites, and every fifth wave a brute. Kills build a combo multiplier;
getting hit breaks it.

| Key | Action |
| --- | --- |
| WASD / arrows | Fly |
| Mouse | Aim |
| Hold click / Space | Fire (Space fires at the nearest shade) |
| Shift | Dash (brief invulnerability, 1.15s cooldown) |
| P / Esc | Pause |
| M | Mute |
| R (on the game-over screen) | Fly again |

Power-ups drop from fallen shades: **Shield** (absorbs one hit), **Rapid fire**,
**Spread shot**, and a rare **+1 hull**. You have 3 hull — lose them all and the
light goes out.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network: every file the game loads lives under `game/`,
and every sound is synthesized live with WebAudio.

## Layout

- `game/index.html` — the page and canvas
- `game/src/main.js` — bootstrap, main loop, state machine
- `game/src/world.js` — waves, collisions, score, combo, pickups
- `game/src/player.js` — movement, dash, weapons
- `game/src/enemies.js` — shade kinds and their steering
- `game/src/render.js` — all drawing, HUD, and screens
- `game/src/particles.js` — explosions, trails, floating text, shake
- `game/src/audio.js` — synthesized sound effects and ambient pad
- `game/src/config.js` — palette and tuning
- `game/src/input.js` — keyboard and mouse state
- `game/src/random.js` — seeded randomness
- `game/src/shots.js` — deterministic screenshot scenes (`?shot=start|play|end`)

## License

MIT — see [LICENSE](LICENSE).
