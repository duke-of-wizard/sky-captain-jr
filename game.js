/* game.js ─ State machine, main loop, player physics, collision, scoring */

// ── Game state ─────────────────────────────────────────────────────────────

const GameState = {
  INTRO:        'intro',
  PLANE_SELECT: 'plane_select',
  DIFFICULTY:   'difficulty',
  GAME:         'game',
  LANDING:      'landing',
  PAUSE:        'pause',
  WIN:          'win',
  LOSE:         'lose',
  CUTSCENE:     'cutscene'
};

// Landing constants
const LANDING_ZONE_LENGTH = 2500;
const RUNWAY_Y  = CANVAS_H * 0.80;
const RUNWAY_H  = CANVAS_H * 0.10;
const TARGET_ZONE_START = 0.4;
const TARGET_ZONE_END   = 0.7;

var game = {
  state:          GameState.INTRO,
  selectedAirline: null,
  difficulty:      'easy',
  currentRoute:    [],
  levelIndex:      0,
  score:           0,
  lives:           3,
  fuel:            100,
  happiness:       100,
  invincible:      false,
  invincibleTimer: 0,
  shieldActive:    false,
  shieldTimer:     0,
  hadCrash:        false,
  levelComplete:   false,
  particles:       [],
  floatingTexts:   [],
  checkpoints:     [],
  checkpoint:      null,
  bannerText:      '',
  bannerColor:     '#4CAF50',
  bannerTimer:     0,
  copilotMsg:      '',
  copilotEmotion:  'happy',
  copilotTimer:    0,
  scoreDetails:    {},
  mouseX:          0,
  mouseY:          0,
  deltaTime:       0,
  lastTime:        0,
  paused:          false,
  soundEnabled:    true,
  hitFlashTimer:   0,
  landingPhase:    false,
  landingTimer:    0,
  landingSuccess:  false,
  landingScore:    0,
  runwayScrollX:   0,
  touchdownY:      0
};

// ── Player object ──────────────────────────────────────────────────────────

var player = {
  x:    360,
  y:    360,
  vy:   0,
  vx:   0,
  bank: 0,
  exhaustTimer: 0
};

// ── World scroll ───────────────────────────────────────────────────────────

var scroll = {
  worldX:  0,
  offsets: { far_clouds: 0, bg_mountains: 0, mg_mountains: 0, ground: 0 }
};

// ── Level / spawner globals ────────────────────────────────────────────────
var currentLevel = null;
var spawner      = null;

// ── Helpers ────────────────────────────────────────────────────────────────

function lerp(a, b, t)     { return a + (b - a) * Math.max(0, Math.min(1, t)); }
function clamp(v, lo, hi)  { return Math.max(lo, Math.min(hi, v)); }
function isInRect(x, y, r) { return r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }

// ── Init ───────────────────────────────────────────────────────────────────

function init() {
  Input.init(() => togglePause());
  Audio.init();

  // Mouse / touch tracking for button hover
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    game.mouseX = (e.clientX - rect.left) * (CANVAS_W / rect.width);
    game.mouseY = (e.clientY - rect.top)  * (CANVAS_H / rect.height);
  });

  // Click / tap dispatching
  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (CANVAS_W / rect.width);
    const y = (e.clientY - rect.top)  * (CANVAS_H / rect.height);
    handleClick(x, y);
  });
  canvas.addEventListener('touchend', e => {
    const rect = canvas.getBoundingClientRect();
    if (!e.changedTouches.length) return;
    const t = e.changedTouches[0];
    handleClick(
      (t.clientX - rect.left) * (CANVAS_W / rect.width),
      (t.clientY - rect.top)  * (CANVAS_H / rect.height)
    );
  }, { passive: true });

  // Sound button
  const soundBtn = document.getElementById('btn-sound');
  soundBtn.addEventListener('click', () => {
    game.soundEnabled = !game.soundEnabled;
    soundBtn.textContent = game.soundEnabled ? '🔊' : '🔇';
    Audio.setEnabled(game.soundEnabled);
  });

  game.lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

// ── Main loop ──────────────────────────────────────────────────────────────

function gameLoop(timestamp) {
  game.deltaTime = Math.min((timestamp - game.lastTime) / 1000, 0.05);
  game.lastTime  = timestamp;

  if ((game.state === GameState.GAME || game.state === GameState.LANDING) && !game.paused) {
    update(game.deltaTime);
  }

  Renderer.updateShake(game.deltaTime);
  Renderer.render(game.state);

  requestAnimationFrame(gameLoop);
}

// ── Update ─────────────────────────────────────────────────────────────────

function update(dt) {
  _updateScroll(dt);
  _updatePlayer(dt);
  _updateObstacles(dt);
  _updateParticles(dt);
  _checkCollisions();
  _checkPowerUps();
  _checkCheckpoints();
  _updateScore(dt);
  _updateCopilot(dt);
  _updateInvincibility(dt);
  _updateFloatingTexts(dt);
  _updateBanner(dt);
  if (game.hitFlashTimer > 0) game.hitFlashTimer -= dt;
  _checkLevelComplete();
  _updateLanding(dt);
}

// ── Scroll ─────────────────────────────────────────────────────────────────

function _updateScroll(dt) {
  const speed = currentLevel ? currentLevel.scrollSpeed : 180;
  scroll.offsets.far_clouds   += speed * 0.08 * dt;
  scroll.offsets.bg_mountains += speed * 0.15 * dt;
  scroll.offsets.mg_mountains += speed * 0.30 * dt;
  scroll.offsets.ground       += speed * 0.60 * dt;
  scroll.worldX += speed * dt;
}

// ── Player physics ─────────────────────────────────────────────────────────

function _updatePlayer(dt) {
  const thrustUp = 750;
  const maxVy    = 460;
  const gravity  = 100;

  if (Input.isUp())   player.vy -= thrustUp * dt;
  if (Input.isDown()) player.vy += thrustUp * 0.80 * dt;
  player.vy += gravity * dt;

  if      (Input.isLeft())  player.vx = lerp(player.vx, -200, dt * 10);
  else if (Input.isRight()) player.vx = lerp(player.vx,  350, dt * 10);
  else                      player.vx = lerp(player.vx,    0, dt * 12);

  player.vy = clamp(player.vy, -maxVy, maxVy);
  player.vx = clamp(player.vx, -230, 390);

  player.x = clamp(player.x + player.vx * dt, 55, CANVAS_W * 0.65);
  const maxY = (game.state === GameState.LANDING) ? RUNWAY_Y + 5 : CANVAS_H * 0.82;
  player.y = clamp(player.y + player.vy * dt, 28, maxY);

  // Visual bank angle
  const targetBank = clamp(player.vy / maxVy * 0.32, -0.32, 0.22);
  player.bank = lerp(player.bank, targetBank, dt * 5.5);

  // Drag
  player.vy *= Math.pow(0.82, dt * 60);

  // Engine exhaust particles
  player.exhaustTimer += dt;
  if (player.exhaustTimer >= 0.055) {
    player.exhaustTimer = 0;
    _emitExhaust();
  }
}

// ── Obstacles & power-ups ──────────────────────────────────────────────────

function _updateObstacles(dt) {
  if (spawner) spawner.update(dt);
}

// ── Particles ──────────────────────────────────────────────────────────────

function _updateParticles(dt) {
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const p = game.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += (p.gravity || 35) * dt;
    p.life -= p.decay * dt;
    p.size *= (p.shrink || 0.993);
    if (p.life <= 0 || p.size < 0.3) game.particles.splice(i, 1);
  }
}

function _updateFloatingTexts(dt) {
  for (let i = game.floatingTexts.length - 1; i >= 0; i--) {
    const ft = game.floatingTexts[i];
    ft.y  += ft.vy * dt;
    ft.life -= dt;
    if (ft.life <= 0) game.floatingTexts.splice(i, 1);
  }
}

function _updateBanner(dt) {
  if (game.bannerTimer > 0) game.bannerTimer -= dt;
}

// ── Collision detection ────────────────────────────────────────────────────

function _checkCollisions() {
  if (game.invincible || game.shieldActive || !spawner) return;
  const pr = 13; // player hitbox radius (smaller plane)
  const px = player.x, py = player.y;

  for (const obs of spawner.obstacles) {
    if (!obs.active) continue;
    if (obs.type === 'fog' || obs.type === 'wind') continue; // these don't kill, handled below

    const hb = obs.getHitbox();
    if (px + pr > hb.x && px - pr < hb.x + hb.w &&
        py + pr > hb.y && py - pr < hb.y + hb.h) {
      loseLife();
      return;
    }

    // Near-miss bonus
    const margin = 38;
    const nearX = px + pr + margin > hb.x && px - pr - margin < hb.x + hb.w;
    const nearY = py + pr + margin > hb.y && py - pr - margin < hb.y + hb.h;
    if (nearX && nearY && !(px + pr > hb.x && px - pr < hb.x + hb.w && py + pr > hb.y && py - pr < hb.y + hb.h)) {
      if (!obs.nearMissed) {
        obs.nearMissed = true;
        game.score += 50;
        _showFloatingText('+50 NEAR MISS!', player.x, player.y - 50, '#FFD700');
      }
    } else if (obs.x + obs.width < px - 50) {
      obs.nearMissed = false;
    }
  }

  // Wind gusts push the player
  for (const obs of spawner.obstacles) {
    if (obs.type !== 'wind' || !obs.active) continue;
    const hb = obs.getHitbox();
    if (px > hb.x && px < hb.x + hb.w && py > hb.y && py < hb.y + hb.h) {
      player.vy += obs.force * game.deltaTime * 55;
      game.happiness -= 12 * game.deltaTime;
      if (Math.random() < 0.02) Audio.play('wind');
    }
  }

  // Fog: drain happiness
  for (const obs of spawner.obstacles) {
    if (obs.type !== 'fog' || !obs.active) continue;
    const hb = obs.getHitbox();
    if (px > hb.x && px < hb.x + hb.w && py > hb.y && py < hb.y + hb.h) {
      game.happiness -= 6 * game.deltaTime;
    }
  }
}

// ── Power-up collection ────────────────────────────────────────────────────

function _checkPowerUps() {
  if (!spawner) return;
  const px = player.x, py = player.y;

  for (const pu of spawner.powerups) {
    if (pu.collected) continue;
    const dx = px - pu.x, dy = py - pu.y;
    if (Math.sqrt(dx * dx + dy * dy) < 38 + pu.radius) {
      _collectPowerUp(pu);
    }
  }
}

function _collectPowerUp(pu) {
  pu.collected = true;
  Audio.play('star');

  switch (pu.type) {
    case 'star':
      game.score += 500;
      _showFloatingText('+500 ⭐', pu.x, pu.y - 22, '#FFD700');
      copilotSay('Woohoo! Gold star!', 'excited');
      _emitSparkles(pu.x, pu.y, '#FFD700');
      break;
    case 'shield':
      game.shieldActive = true;
      game.shieldTimer  = 5.5;
      _showFloatingText('SHIELD! 🛡', pu.x, pu.y - 22, '#64B5F6');
      copilotSay('Shield activated!', 'excited');
      _emitSparkles(pu.x, pu.y, '#64B5F6');
      break;
    case 'life':
      if (game.lives < 3) game.lives++;
      _showFloatingText('+1 LIFE! ❤️', pu.x, pu.y - 22, '#EF5350');
      copilotSay('Extra life! Lucky!', 'excited');
      _emitSparkles(pu.x, pu.y, '#EF5350');
      break;
    case 'fuel':
      game.fuel = Math.min(100, game.fuel + 30);
      _showFloatingText('+30 FUEL ⛽', pu.x, pu.y - 22, '#66BB6A');
      copilotSay('Fuel topped up!', 'happy');
      _emitSparkles(pu.x, pu.y, '#66BB6A');
      break;
  }
}

// ── Checkpoints ────────────────────────────────────────────────────────────

function _checkCheckpoints() {
  if (!currentLevel) return;
  const progress = scroll.worldX / currentLevel.totalLength;

  for (const cp of game.checkpoints) {
    if (!cp.reached && progress >= cp.progress) {
      cp.reached   = true;
      game.checkpoint = { worldX: scroll.worldX, playerY: player.y, fuel: game.fuel };
      game.fuel      = Math.min(100, game.fuel + 22);
      game.happiness = Math.min(100, game.happiness + 14);
      Audio.play('checkpoint');
      copilotSay(['Checkpoint! Fantastic!', 'Halfway there!', 'Almost there!'][Math.round(cp.progress * 4 - 1)] || 'Great flying!', 'excited');
      _showBanner('CHECKPOINT! ✓', '#4CAF50');
      _emitSparkles(player.x, player.y, '#4CAF50');
    }
  }
}

// ── Score & resource management ────────────────────────────────────────────

function _updateScore(dt) {
  game.score += 10 * dt;

  // Fuel drain
  const drainRates = { easy: 3.0, medium: 4.8, hard: 6.8 };
  game.fuel -= (drainRates[game.difficulty] || 4.8) * dt;
  game.fuel   = clamp(game.fuel, 0, 100);

  // Happiness drain near storms
  if (spawner) {
    for (const obs of spawner.obstacles) {
      if (obs.type !== 'storm' || !obs.active) continue;
      const dx = player.x - (obs.x + obs.width  * 0.5);
      const dy = player.y - (obs.y + obs.height * 0.5);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 170) {
        game.happiness -= 18 * (1 - dist / 170) * dt;
      }
    }
  }
  game.happiness = clamp(game.happiness, 0, 100);

  // Fuel-empty consequences
  if (game.fuel <= 0) {
    game.happiness -= 28 * dt;
    if (game.happiness <= 0) {
      game.happiness = 0;
      loseLife();
    }
  }

  // Shield countdown
  if (game.shieldActive) {
    game.shieldTimer -= dt;
    if (game.shieldTimer <= 0) game.shieldActive = false;
  }

  // Low-fuel copilot warning (throttled)
  if (game.fuel < 18 && Math.floor(Date.now() / 4000) !== (game._lastFuelWarn || 0)) {
    game._lastFuelWarn = Math.floor(Date.now() / 4000);
    copilotSay('Low fuel! Speed up!', 'worried');
  }
}

function _updateCopilot(dt) {
  if (game.copilotTimer > 0) game.copilotTimer -= dt;

  // Upcoming obstacle warnings
  if (!spawner) return;
  for (const obs of spawner.obstacles) {
    if (obs.warned || obs.x < CANVAS_W || obs.x > CANVAS_W + 250) continue;
    obs.warned = true;
    switch (obs.type) {
      case 'storm':      copilotSay('Storm ahead! Hold on!', 'worried'); break;
      case 'birds':      copilotSay('Birds! Dodge them!', 'worried');    break;
      case 'otherplane': copilotSay('Plane! Watch out!', 'scared');      break;
      case 'wind':       copilotSay('Turbulence ahead!', 'worried');     break;
    }
    break; // only one warning at a time
  }
}

function _updateInvincibility(dt) {
  if (game.invincible) {
    game.invincibleTimer -= dt;
    if (game.invincibleTimer <= 0) game.invincible = false;
  }
}

// ── Level completion ───────────────────────────────────────────────────────

function _checkLevelComplete() {
  if (!currentLevel || game.levelComplete) return;

  const landingStart = currentLevel.totalLength - LANDING_ZONE_LENGTH;

  // Trigger landing phase
  if (scroll.worldX >= landingStart && game.state === GameState.GAME) {
    game.landingPhase = true;
    setState(GameState.LANDING);
    game.landingTimer = 0;
    game.landingSuccess = false;
    game.runwayScrollX = 0;
    copilotSay('Prepare for landing!', 'excited', 3.0);
    Audio.play('checkpoint');
    if (spawner) spawner.stopSpawning = true;
  }

  // Fly past entire zone = auto-complete with default score
  if (scroll.worldX >= currentLevel.totalLength && !game.landingSuccess) {
    game.landingSuccess = true;
    game.landingScore = 50;
    game.levelComplete = true;
    copilotSay('Landed! Nice try!', 'happy', 3.0);
    _completeLevelSuccess();
  }
}

function _updateLanding(dt) {
  if (game.state !== GameState.LANDING) return;

  game.landingTimer += dt;
  game.runwayScrollX += (currentLevel ? currentLevel.scrollSpeed : 180) * dt;

  // Calculate landing progress (0 to 1)
  const landingStart = currentLevel.totalLength - LANDING_ZONE_LENGTH;
  const landingProgress = (scroll.worldX - landingStart) / LANDING_ZONE_LENGTH;

  // Check if player reached runway level within target zone
  if (player.y >= RUNWAY_Y - 10 &&
      landingProgress >= TARGET_ZONE_START &&
      landingProgress <= TARGET_ZONE_END) {
    game.landingSuccess = true;
    game.touchdownY = player.y;

    // Score based on centering in target zone
    const zoneMid = (TARGET_ZONE_START + TARGET_ZONE_END) / 2;
    const distFromCenter = Math.abs(landingProgress - zoneMid) / ((TARGET_ZONE_END - TARGET_ZONE_START) / 2);
    game.landingScore = Math.round(100 * (1 - distFromCenter));
    game.levelComplete = true;

    Audio.play('landing');
    copilotSay('Perfect landing! You\'re a real captain!', 'excited', 4.0);

    // Tire smoke particles
    for (let i = 0; i < 20; i++) {
      game.particles.push({
        x: player.x - 20 + Math.random() * 40,
        y: RUNWAY_Y,
        vx: -30 + Math.random() * 60,
        vy: -15 - Math.random() * 30,
        life: 0.8, decay: 1.2, size: 5 + Math.random() * 8,
        gravity: -5, shrink: 0.96,
        color: 'rgba(180,180,180,0.6)'
      });
    }

    _completeLevelSuccess();
  }
}

function _completeLevelSuccess() {
  Audio.play('cheer');
  Audio.stopEngine();

  const perfectBonus = game.hadCrash ? 0 : 1000;
  const fuelBonus    = Math.floor(game.fuel * 3);
  const happyBonus   = Math.max(0, Math.floor((game.happiness - 50) * 5));
  const landingBonus = game.landingScore ? Math.floor(game.landingScore * 5) : 0;

  game.scoreDetails = {
    base:    Math.floor(game.score),
    perfect: perfectBonus,
    fuel:    fuelBonus,
    happy:   happyBonus,
    landing: landingBonus,
    total:   Math.floor(game.score) + perfectBonus + fuelBonus + happyBonus + landingBonus
  };
  game.score = game.scoreDetails.total;

  // Confetti burst
  for (let i = 0; i < 90; i++) {
    const ang = (i / 90) * Math.PI * 2;
    const spd = 90 + Math.random() * 220;
    game.particles.push({
      x: CANVAS_W * 0.5, y: CANVAS_H * 0.45,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 110,
      life: 1.0, decay: 0.55, size: 7 + Math.random() * 9,
      gravity: 130, shrink: 0.97,
      color: ['#FF6B6B','#FFE66D','#4ECDC4','#FF8E53','#A8E6CF','#DDA0DD','#FFD700'][i % 7]
    });
  }

  copilotSay('Amazing landing! You rock!', 'excited', 4.0);
  setTimeout(() => setState(GameState.WIN), 1200);
}

// ── Lives & respawn ────────────────────────────────────────────────────────

function loseLife() {
  if (game.invincible || game.shieldActive) return;

  game.lives--;
  game.hadCrash     = true;
  game.invincible   = true;
  game.invincibleTimer = 2.5;

  Audio.play('crash');
  Renderer.triggerShake(0.55, 11);
  game.hitFlashTimer = 0.35;
  _emitExplosion(player.x, player.y);

  if (game.lives <= 0) {
    game.lives = 0;
    copilotSay("Don't worry, try again!", 'scared', 3);
    setTimeout(() => setState(GameState.LOSE), 1400);
  } else {
    const msgs = ["You got this! Keep going!", "Almost! Don't quit!", "Oops! Try again!"];
    copilotSay(msgs[Math.floor(Math.random() * msgs.length)], 'scared');
    if (game.checkpoint) {
      setTimeout(_respawnAtCheckpoint, 900);
    }
  }
}

function _respawnAtCheckpoint() {
  if (game.checkpoint) {
    scroll.worldX = game.checkpoint.worldX;
    // re-sync all parallax offsets proportionally
    const sp = currentLevel ? currentLevel.scrollSpeed : 180;
    const t  = scroll.worldX / sp;
    scroll.offsets.far_clouds   = sp * 0.08 * t;
    scroll.offsets.bg_mountains = sp * 0.15 * t;
    scroll.offsets.mg_mountains = sp * 0.30 * t;
    scroll.offsets.ground       = sp * 0.60 * t;
    player.y    = game.checkpoint.playerY || CANVAS_H * 0.45;
    game.fuel   = Math.max(game.fuel, Math.min(game.checkpoint.fuel || 45, 100));
  }
  player.vy = 0; player.vx = 0;
  game.happiness = Math.max(game.happiness, 38);
  if (spawner) spawner.clearAhead();
  Audio.startEngine();
}

// ── State management ───────────────────────────────────────────────────────

function setState(newState) {
  game.state = newState;
  const controls = document.getElementById('controls');
  const soundBtn = document.getElementById('btn-sound');

  if (newState === GameState.GAME || newState === GameState.LANDING) {
    controls.style.display = 'grid';
    soundBtn.style.display = 'block';
    game.paused = false;
  } else {
    controls.style.display = 'none';
    soundBtn.style.display = (newState === GameState.PAUSE) ? 'block' : 'none';
  }
}

function togglePause() {
  if (game.state === GameState.GAME || game.state === GameState.LANDING) {
    game.paused = true;
    game._prePauseState = game.state;
    setState(GameState.PAUSE);
    Audio.stopEngine();
  } else if (game.state === GameState.PAUSE) {
    game.paused = false;
    setState(game._prePauseState || GameState.GAME);
    Audio.startEngine();
  }
}

// ── Level flow ─────────────────────────────────────────────────────────────

function startGame() {
  game.currentRoute = ROUTES[game.difficulty] || ROUTES.easy;
  game.levelIndex   = 0;
  game.score        = 0;
  game.hadCrash     = false;
  _startLevel();
}

function _startLevel() {
  const levelId = game.currentRoute[game.levelIndex];
  currentLevel = LEVELS[levelId];

  if (!currentLevel) {
    // All levels completed
    setState(GameState.INTRO);
    return;
  }

  // Reset world
  scroll.worldX  = 0;
  scroll.offsets = { far_clouds: 0, bg_mountains: 0, mg_mountains: 0, ground: 0 };

  // Reset player
  player.x = CANVAS_W * 0.28;
  player.y = CANVAS_H * 0.46;
  player.vy = 0; player.vx = 0; player.bank = 0;

  // Reset game state
  game.lives        = 3;
  game.fuel         = 100;
  game.happiness    = 100;
  game.invincible   = false;
  game.levelComplete = false;
  game.particles    = [];
  game.floatingTexts= [];
  game.checkpoint   = null;
  game.bannerText   = '';
  game.bannerTimer  = 0;
  game.copilotMsg      = '';
  game.copilotTimer    = 0;
  game.hitFlashTimer   = 0;
  game.landingPhase    = false;
  game.landingTimer    = 0;
  game.landingSuccess  = false;
  game.landingScore    = 0;
  game.runwayScrollX   = 0;
  game.touchdownY      = 0;

  // Set up checkpoints at 25%, 50%, 75%
  game.checkpoints = [
    { progress: 0.25, reached: false },
    { progress: 0.50, reached: false },
    { progress: 0.75, reached: false }
  ];

  spawner = new ObstacleSpawner(game.difficulty, currentLevel);

  Audio.startBgMusic(currentLevel.bgMusic || 'chill');
  Audio.startEngine();

  setState(GameState.GAME);

  // Welcome copilot message
  setTimeout(() => {
    if (game.state === GameState.GAME) {
      copilotSay(`Flying to ${currentLevel.to.name}!`, 'excited', 2.5);
    }
  }, 600);
}

function nextLevel() {
  game.levelIndex++;
  if (game.levelIndex >= game.currentRoute.length) {
    // Completed all levels for this difficulty
    Audio.stopBgMusic();
    Audio.stopEngine();
    setState(GameState.INTRO);
    return;
  }
  setState(GameState.CUTSCENE);
}

// ── Click handlers ─────────────────────────────────────────────────────────

function handleClick(x, y) {
  switch (game.state) {
    case GameState.INTRO:        _onIntroClick(x, y);        break;
    case GameState.PLANE_SELECT: _onPlaneSelectClick(x, y);  break;
    case GameState.DIFFICULTY:   _onDifficultyClick(x, y);   break;
    case GameState.PAUSE:        _onPauseClick(x, y);        break;
    case GameState.WIN:          _onWinClick(x, y);          break;
    case GameState.LOSE:         _onLoseClick(x, y);         break;
    case GameState.CUTSCENE:     _onCutsceneClick(x, y);     break;
  }
}

function _onIntroClick(x, y) {
  if (isInRect(x, y, Renderer.getIntroPlayBtn())) {
    Audio.play('star');
    setState(GameState.PLANE_SELECT);
  }
}

function _onPlaneSelectClick(x, y) {
  for (const card of Renderer.getPlaneCards()) {
    if (isInRect(x, y, card.rect)) {
      game.selectedAirline = card.airline;
      Audio.play('star');
      setState(GameState.DIFFICULTY);
      return;
    }
  }
}

function _onDifficultyClick(x, y) {
  for (const btn of Renderer.getDifficultyBtns()) {
    if (isInRect(x, y, btn.rect)) {
      game.difficulty = btn.difficulty;
      Audio.play('star');
      startGame();
      return;
    }
  }
}

function _onPauseClick(x, y) {
  const btns = Renderer.getPauseBtns();
  if (isInRect(x, y, btns.resume)) {
    togglePause();
  } else if (isInRect(x, y, btns.quit)) {
    Audio.stopEngine();
    Audio.stopBgMusic();
    setState(GameState.INTRO);
  }
}

function _onWinClick(x, y) {
  const btns = Renderer.getWinBtns();
  if (isInRect(x, y, btns.next)) {
    nextLevel();
  } else if (isInRect(x, y, btns.menu)) {
    Audio.stopEngine();
    Audio.stopBgMusic();
    setState(GameState.INTRO);
  }
}

function _onLoseClick(x, y) {
  const btns = Renderer.getLoseBtns();
  if (isInRect(x, y, btns.retry)) {
    _startLevel();
  } else if (isInRect(x, y, btns.menu)) {
    Audio.stopEngine();
    Audio.stopBgMusic();
    setState(GameState.INTRO);
  }
}

function _onCutsceneClick(x, y) {
  // Any click advances to next level
  _startLevel();
}

// ── Particle emitters ───────────────────────────────────────────────────────

function _emitExhaust() {
  // Two engine positions relative to plane orientation
  const ca = Math.cos(player.bank), sa = Math.sin(player.bank);
  const engines = [
    { dx: -56, dy: 30 },
    { dx: -50, dy: -18 }
  ];
  for (const e of engines) {
    const ex = player.x + e.dx * ca - e.dy * sa;
    const ey = player.y + e.dx * sa + e.dy * ca;
    const br = 180 + Math.floor(Math.random() * 60);
    game.particles.push({
      x: ex, y: ey,
      vx: -70 - Math.random() * 50,
      vy: (Math.random() - 0.5) * 18,
      life: 0.75, decay: 1.9, size: 4.5 + Math.random() * 4,
      gravity: 0, shrink: 0.92,
      color: `rgba(${br},${br},${br},0.45)`
    });
  }
}

function _emitExplosion(x, y) {
  const cols = ['#FF6600','#FF4400','#FFCC00','#FF8800','#FFFFFF','#FF3300'];
  for (let i = 0; i < 32; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 90 + Math.random() * 220;
    game.particles.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 55,
      life: 1.0, decay: 1.15, size: 7 + Math.random() * 11,
      gravity: 85, shrink: 0.955,
      color: cols[Math.floor(Math.random() * cols.length)]
    });
  }
}

function _emitSparkles(x, y, color) {
  for (let i = 0; i < 18; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 45 + Math.random() * 130;
    game.particles.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 30,
      life: 0.85, decay: 1.45, size: 3.5 + Math.random() * 6,
      gravity: 45, shrink: 0.962,
      color
    });
  }
}

// ── UI helpers ──────────────────────────────────────────────────────────────

function copilotSay(msg, emotion, duration) {
  game.copilotMsg     = msg;
  game.copilotEmotion = emotion || 'happy';
  game.copilotTimer   = duration || 3.0;
}

function _showFloatingText(text, x, y, color) {
  game.floatingTexts.push({ text, x, y, color, life: 1.6, vy: -38 });
}

function _showBanner(text, color) {
  game.bannerText  = text;
  game.bannerColor = color || '#4CAF50';
  game.bannerTimer = 2.2;
}

// ── Boot ───────────────────────────────────────────────────────────────────

window.addEventListener('load', init);
