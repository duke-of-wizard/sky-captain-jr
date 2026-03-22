/* obstacles.js ─ Obstacle classes, PowerUp, and ObstacleSpawner
   Depends on: CANVAS_W, CANVAS_H, ctx (from renderer.js) */

// ── Base Obstacle class ────────────────────────────────────────────────────

class Obstacle {
  constructor(type, x, y, w, h, speed) {
    this.type   = type;
    this.x      = x;
    this.y      = y;
    this.width  = w;
    this.height = h;
    this.speed  = speed;
    this.active = true;
    this.warned  = false;
    this.nearMissed = false;
    this.phase  = Math.random() * Math.PI * 2;
    this.age    = 0;
  }

  update(dt) {
    const lvlSpeed = window.currentLevel ? currentLevel.scrollSpeed : 180;
    this.x -= (this.speed + lvlSpeed) * dt;
    this.phase += dt;
    this.age   += dt;
    if (this.x + this.width < -80) this.active = false;
    this.updateSelf(dt);
  }

  updateSelf(dt) {}

  getHitbox() {
    // Forgiving hitbox: 62% of visual size, centered
    const px = 0.19, py = 0.19;
    return {
      x: this.x + this.width  * px,
      y: this.y + this.height * py,
      w: this.width  * (1 - px * 2),
      h: this.height * (1 - py * 2)
    };
  }

  draw(ctx) {}

  // Draw a warning arrow on right edge when obstacle is off screen
  drawWarning(ctx) {
    if (this.x > CANVAS_W + 30) {
      const wy = Math.max(30, Math.min(CANVAS_H - 30, this.y + this.height * 0.5));
      const t  = Date.now() * 0.006;
      const blink = Math.sin(t) > 0 ? 1 : 0.3;
      ctx.save();
      ctx.globalAlpha = blink;
      ctx.fillStyle = '#FF5252';
      ctx.beginPath();
      ctx.moveTo(CANVAS_W - 12, wy);
      ctx.lineTo(CANVAS_W - 34, wy - 14);
      ctx.lineTo(CANVAS_W - 34, wy + 14);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}

// ── BirdFlock ──────────────────────────────────────────────────────────────

class BirdFlock extends Obstacle {
  constructor(x, y) {
    super('birds', x, y, 130, 65, 55);
    this.birds = [];
    const count = 9 + Math.floor(Math.random() * 8);
    for (let i = 0; i < count; i++) {
      this.birds.push({
        ox: (i % 5) * 22 - 44,
        oy: Math.floor(i / 5) * 18 - 10 + (Math.random() - 0.5) * 10,
        wingPhase: Math.random() * Math.PI * 2,
        wingSpeed: 5 + Math.random() * 3,
        size: 7 + Math.random() * 4
      });
    }
  }

  updateSelf(dt) {
    this.birds.forEach(b => {
      b.wingPhase += b.wingSpeed * dt;
    });
  }

  draw(ctx) {
    this.drawWarning(ctx);
    ctx.save();
    ctx.translate(this.x + this.width * 0.5, this.y + this.height * 0.5);

    // Danger indicator: red pulsing glow behind obstacle
    const dangerPulse = 0.18 + 0.12 * Math.sin(Date.now() * 0.005);
    const dangerGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, this.width * 0.55);
    dangerGrad.addColorStop(0, `rgba(255,60,60,${dangerPulse})`);
    dangerGrad.addColorStop(1, 'rgba(255,60,60,0)');
    ctx.beginPath();
    ctx.arc(0, 0, this.width * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = dangerGrad;
    ctx.fill();

    // Danger label
    ctx.font = 'bold 11px Arial';
    ctx.fillStyle = `rgba(255,80,80,${0.6 + 0.3 * Math.sin(Date.now() * 0.004)})`;
    ctx.textAlign = 'center';
    ctx.fillText('⚠ BIRDS', 0, -this.height * 0.45);
    ctx.textAlign = 'left';

    this.birds.forEach(b => {
      ctx.save();
      ctx.translate(b.ox, b.oy);
      const wing = Math.sin(b.wingPhase) * 0.45;
      // Simple M-shape bird
      ctx.beginPath();
      ctx.moveTo(-b.size, 0);
      ctx.lineTo(-b.size * 0.4, -b.size * wing);
      ctx.lineTo(0, 0);
      ctx.lineTo(b.size * 0.4, -b.size * wing);
      ctx.lineTo(b.size, 0);
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1.8;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
    });
    ctx.restore();
  }
}

// ── StormCloud ─────────────────────────────────────────────────────────────

class StormCloud extends Obstacle {
  constructor(x, y) {
    const w = 200 + Math.random() * 80;
    const h = 130 + Math.random() * 50;
    super('storm', x, y, w, h, 18);
    this.lightningTimer = 1.5 + Math.random() * 2;
    this.lightningFlash = false;
    this.puffs = this._genPuffs();
    this.rainDrops = this._genRain();
    this.boltPath = null;
  }

  _genPuffs() {
    const n = 7 + Math.floor(Math.random() * 4);
    const puffs = [];
    for (let i = 0; i < n; i++) {
      puffs.push({
        ox: Math.random() * 0.9,
        oy: Math.random() * 0.55,
        r:  (28 + Math.random() * 38)
      });
    }
    return puffs;
  }

  _genRain() {
    const drops = [];
    for (let i = 0; i < 18; i++) {
      drops.push({
        ox: Math.random(),
        len: 12 + Math.random() * 14
      });
    }
    return drops;
  }

  _genBolt() {
    const pts = [{ x: this.width * 0.5, y: this.height * 0.35 }];
    let cx = this.width * 0.5, cy = this.height * 0.35;
    while (cy < this.height) {
      cx += (Math.random() - 0.5) * 30;
      cy += 18 + Math.random() * 12;
      pts.push({ x: cx, y: cy });
    }
    return pts;
  }

  updateSelf(dt) {
    this.lightningTimer -= dt;
    if (this.lightningTimer <= 0) {
      this.lightningFlash = true;
      this.boltPath = this._genBolt();
      this.lightningTimer = 1.8 + Math.random() * 2.5;
      if (window.Audio) Audio.play('thunder');
      setTimeout(() => { this.lightningFlash = false; }, 110);
    }
  }

  draw(ctx) {
    this.drawWarning(ctx);
    ctx.save();
    ctx.translate(this.x, this.y);

    // Danger indicator: red pulsing border
    const dangerPulse = 0.2 + 0.15 * Math.sin(Date.now() * 0.005);
    ctx.save();
    ctx.strokeStyle = `rgba(255,60,60,${dangerPulse})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(-5, -5, this.width + 10, this.height + 10);
    ctx.setLineDash([]);
    // Danger label
    ctx.font = 'bold 12px Arial';
    ctx.fillStyle = `rgba(255,80,80,${0.7 + 0.3 * Math.sin(Date.now() * 0.004)})`;
    ctx.textAlign = 'center';
    ctx.fillText('⚠ STORM', this.width * 0.5, -8);
    ctx.textAlign = 'left';
    ctx.restore();

    // Cloud puffs
    this.puffs.forEach(p => {
      const px = this.width * p.ox;
      const py = this.height * p.oy;
      const grad = ctx.createRadialGradient(px, py, 0, px, py, p.r);
      grad.addColorStop(0, 'rgba(50,55,75,0.96)');
      grad.addColorStop(0.5, 'rgba(40,45,65,0.85)');
      grad.addColorStop(1, 'rgba(30,35,55,0)');
      ctx.beginPath();
      ctx.arc(px, py, p.r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    });

    // Rain streaks
    ctx.save();
    ctx.globalAlpha = 0.55;
    this.rainDrops.forEach(d => {
      const rx = this.width * d.ox;
      const ry = this.height * 0.62 + (this.phase * 80 % (this.height * 0.4));
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 2, ry + d.len);
      ctx.strokeStyle = 'rgba(130,170,255,0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
    ctx.restore();

    // Lightning bolt
    if (this.lightningFlash && this.boltPath && this.boltPath.length > 1) {
      ctx.save();
      ctx.shadowColor = '#ffff99';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(this.boltPath[0].x, this.boltPath[0].y);
      this.boltPath.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = '#ffffaa';
      ctx.lineWidth = 3;
      ctx.stroke();
      // White inner bolt
      ctx.beginPath();
      ctx.moveTo(this.boltPath[0].x, this.boltPath[0].y);
      this.boltPath.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    ctx.restore();
  }
}

// ── OtherPlane ─────────────────────────────────────────────────────────────

class OtherPlane extends Obstacle {
  constructor(x, y) {
    super('otherplane', x, y, 220, 80, 120);
    // Pick a random airline different from player
    const allKeys = AIRLINE_KEYS.filter(k => !window.game || k !== game.selectedAirline);
    this.airlineKey = allKeys[Math.floor(Math.random() * allKeys.length)];
    this.flyDir = Math.random() > 0.5 ? 1 : -1; // +1 same dir, -1 opposite
    if (this.flyDir === -1) {
      this.speed = 200; // head-on, faster
    }
  }

  draw(ctx) {
    this.drawWarning(ctx);

    // Danger indicator
    const dangerPulse = 0.18 + 0.12 * Math.sin(Date.now() * 0.005);
    const cx = this.x + this.width * 0.5, cy = this.y + this.height * 0.5;
    const dg = ctx.createRadialGradient(cx, cy, 20, cx, cy, this.width * 0.5);
    dg.addColorStop(0, `rgba(255,60,60,${dangerPulse})`);
    dg.addColorStop(1, 'rgba(255,60,60,0)');
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, this.width * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = dg;
    ctx.fill();
    ctx.font = 'bold 11px Arial';
    ctx.fillStyle = `rgba(255,80,80,${0.6 + 0.3 * Math.sin(Date.now() * 0.004)})`;
    ctx.textAlign = 'center';
    ctx.fillText('⚠ TRAFFIC', cx, cy - this.height * 0.55);
    ctx.textAlign = 'left';
    ctx.restore();

    ctx.save();
    const scale = 0.72;
    const flipX = this.flyDir === -1 ? -1 : 1;
    ctx.translate(this.x + this.width * 0.5, this.y + this.height * 0.5);
    ctx.scale(flipX * scale, scale);
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 6;
    drawPlane(ctx, this.airlineKey, 0, 0, 1.0, 0);
    ctx.restore();
  }
}

// ── FogBank ────────────────────────────────────────────────────────────────

class FogBank extends Obstacle {
  constructor(x, y) {
    super('fog', x, y, 280 + Math.random() * 120, 140, 8);
    this.alpha = 0.55 + Math.random() * 0.25;
  }

  draw(ctx) {
    this.drawWarning(ctx);
    ctx.save();
    // Soft foggy gradient
    const grad = ctx.createRadialGradient(
      this.x + this.width * 0.5, this.y + this.height * 0.5, 20,
      this.x + this.width * 0.5, this.y + this.height * 0.5, this.width * 0.58
    );
    grad.addColorStop(0, `rgba(210,220,235,${this.alpha})`);
    grad.addColorStop(0.5, `rgba(200,215,230,${this.alpha * 0.75})`);
    grad.addColorStop(1, 'rgba(195,210,228,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // "FOG" label (subtle)
    ctx.globalAlpha = 0.4;
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#556';
    ctx.textAlign = 'center';
    ctx.fillText('FOG', this.x + this.width * 0.5, this.y + this.height * 0.5);
    ctx.textAlign = 'left';
    ctx.restore();
  }
}

// ── WindGust ───────────────────────────────────────────────────────────────

class WindGust extends Obstacle {
  constructor(x, y) {
    const isUp = Math.random() > 0.5;
    super('wind', x, y, 130, 80, 35);
    this.force = isUp ? -180 : 180; // push up or down
    this.isUp  = isUp;
    this.lines = [];
    for (let i = 0; i < 5; i++) {
      this.lines.push({
        oy: 0.1 + i * 0.18,
        len: 0.5 + Math.random() * 0.4,
        speed: 2.5 + Math.random() * 2
      });
    }
  }

  draw(ctx) {
    this.drawWarning(ctx);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = 0.75;

    const color = this.isUp ? '#80D8FF' : '#FF8A80';
    const arrowDir = this.isUp ? -1 : 1;

    // Wavy lines
    this.lines.forEach((l, i) => {
      const ly = this.height * l.oy;
      ctx.beginPath();
      for (let x = 0; x <= this.width * l.len; x += 4) {
        const y = ly + Math.sin((x / 20) + this.phase * l.speed) * 5;
        if (x === 0) ctx.moveTo(x, y);
        else         ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Arrow showing direction
    const ax = this.width * 0.55, ay = this.height * 0.5;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax, ay + arrowDir * 28);
    ctx.lineTo(ax - 10, ay + arrowDir * 14);
    ctx.moveTo(ax, ay + arrowDir * 28);
    ctx.lineTo(ax + 10, ay + arrowDir * 14);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Label
    ctx.font = 'bold 13px Arial';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(this.isUp ? '↑ UPDRAFT' : '↓ DOWNDRAFT', this.width * 0.5, ay + arrowDir * 42);
    ctx.textAlign = 'left';

    ctx.restore();
  }
}

// ── PowerUp ────────────────────────────────────────────────────────────────

const POWERUP_CONFIGS = {
  star:   { emoji: '⭐', glow: '255,215,0',   inner: '#FFE082', outer: '#F57F17', label: 'STAR!'   },
  shield: { emoji: '🛡',  glow: '100,181,246', inner: '#90CAF9', outer: '#1565C0', label: 'SHIELD!' },
  life:   { emoji: '❤️', glow: '239,83,80',   inner: '#EF9A9A', outer: '#B71C1C', label: 'LIFE!'   },
  fuel:   { emoji: '⛽', glow: '102,187,106', inner: '#A5D6A7', outer: '#2E7D32', label: 'FUEL!'   }
};

class PowerUp {
  constructor(type, x, y) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.radius = 26;
    this.collected = false;
    this.bobPhase = Math.random() * Math.PI * 2;
    this.glowPhase = 0;
    this.cfg = POWERUP_CONFIGS[type] || POWERUP_CONFIGS.star;
    this.speed = 0;
  }

  update(dt) {
    const lvlSpeed = window.currentLevel ? currentLevel.scrollSpeed : 180;
    this.x -= lvlSpeed * dt;
    this.bobPhase  += dt * 2.8;
    this.glowPhase += dt * 4;
    if (this.x < -60) this.collected = true;
  }

  draw(ctx) {
    const by = this.y + Math.sin(this.bobPhase) * 9;
    const glowAlpha = 0.28 + Math.sin(this.glowPhase) * 0.18;

    ctx.save();

    // Friendly green ring to distinguish from obstacles
    const ringPulse = 0.5 + 0.3 * Math.sin(Date.now() * 0.006);
    ctx.beginPath();
    ctx.arc(this.x, by, this.radius + 6, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(76,175,80,${ringPulse})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Friendly label
    ctx.font = 'bold 11px Arial';
    ctx.fillStyle = `rgba(76,230,100,${0.7 + 0.3 * Math.sin(Date.now() * 0.005)})`;
    ctx.textAlign = 'center';
    const labels = { star: '★ +100', shield: '🛡 SHIELD', life: '♥ LIFE', fuel: '⛽ FUEL' };
    ctx.fillText(labels[this.type] || '★ BONUS', this.x, by - this.radius - 12);
    ctx.textAlign = 'left';

    // Outer glow
    const outerGrad = ctx.createRadialGradient(this.x, by, 0, this.x, by, this.radius + 14);
    outerGrad.addColorStop(0, `rgba(${this.cfg.glow},${glowAlpha * 1.8})`);
    outerGrad.addColorStop(1, `rgba(${this.cfg.glow},0)`);
    ctx.beginPath();
    ctx.arc(this.x, by, this.radius + 14, 0, Math.PI * 2);
    ctx.fillStyle = outerGrad;
    ctx.fill();

    // Circle body
    const grad = ctx.createRadialGradient(
      this.x - this.radius * 0.3, by - this.radius * 0.3, 2,
      this.x, by, this.radius
    );
    grad.addColorStop(0, this.cfg.inner);
    grad.addColorStop(1, this.cfg.outer);
    ctx.beginPath();
    ctx.arc(this.x, by, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.shadowColor = `rgb(${this.cfg.glow})`;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Shine highlight
    ctx.beginPath();
    ctx.arc(this.x - 8, by - 8, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fill();

    // Emoji icon
    ctx.font = `${this.radius * 1.1}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.cfg.emoji, this.x, by);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';

    ctx.restore();
  }
}

// ── ObstacleSpawner ────────────────────────────────────────────────────────

class ObstacleSpawner {
  constructor(difficulty, levelConfig) {
    this.difficulty   = difficulty;
    this.levelConfig  = levelConfig;
    this.obstacles    = [];
    this.powerups     = [];
    this.spawnTimer   = 1.5;   // initial delay
    this.puSpawnTimer = 3.0;
    this.minGap       = { easy: 3.2, medium: 2.0, hard: 1.2 }[difficulty] || 2.0;
    this.densityMult  = { easy: 0.55, medium: 1.0, hard: 1.75 }[difficulty] || 1.0;
  }

  update(dt) {
    this.spawnTimer   -= dt;
    this.puSpawnTimer -= dt;

    if (this.spawnTimer <= 0) {
      const interval = (this.minGap + Math.random() * 2.0) / this.densityMult;
      this.spawnTimer = interval;
      this._spawnObstacle();
    }

    if (this.puSpawnTimer <= 0) {
      this.puSpawnTimer = 6.0 + Math.random() * 8.0;
      this._spawnPowerUp();
    }

    this.obstacles = this.obstacles.filter(o => o.active);
    this.powerups  = this.powerups.filter(p => !p.collected);

    this.obstacles.forEach(o => o.update(dt));
    this.powerups.forEach(p => p.update(dt));
  }

  _spawnObstacle() {
    const types = this.levelConfig.obstacleTypes || ['birds', 'storm'];
    const type  = types[Math.floor(Math.random() * types.length)];
    const x     = CANVAS_W + 60 + Math.random() * 80;
    const y     = 50 + Math.random() * (CANVAS_H * 0.68 - 50);

    let obs;
    switch (type) {
      case 'birds':      obs = new BirdFlock(x, y);   break;
      case 'storm':      obs = new StormCloud(x, y);  break;
      case 'otherplane': obs = new OtherPlane(x, y);  break;
      case 'fog':        obs = new FogBank(x, y);     break;
      case 'wind':       obs = new WindGust(x, y);    break;
      default:           obs = new BirdFlock(x, y);
    }
    // Nudge obstacle Y if it would swallow an existing powerup
    const obsMgn = 24;
    const puBlocked = this.powerups.some(pu => {
      if (pu.collected || pu.x < CANVAS_W * 0.3) return false;
      return (pu.y + pu.radius + obsMgn) > obs.y &&
             (pu.y - pu.radius - obsMgn) < (obs.y + obs.height);
    });
    if (puBlocked) {
      obs.y = (obs.y < CANVAS_H * 0.4)
        ? Math.min(CANVAS_H * 0.65 - obs.height, obs.y + obs.height + obsMgn * 2)
        : Math.max(50, obs.y - obs.height - obsMgn * 2);
    }
    this.obstacles.push(obs);
  }

  _spawnPowerUp() {
    const types    = ['star', 'star', 'fuel', 'shield', 'life'];
    const type     = types[Math.floor(Math.random() * types.length)];
    const x        = CANVAS_W + 40;
    const puRadius = 26;
    const margin   = 20;

    let y;
    for (let attempt = 0; attempt < 10; attempt++) {
      y = 70 + Math.random() * (CANVAS_H * 0.65 - 70);
      const overlaps = this.obstacles.some(obs => {
        if (!obs.active || obs.x < CANVAS_W * 0.3) return false;
        return (y + puRadius + margin) > obs.y &&
               (y - puRadius - margin) < (obs.y + obs.height);
      });
      if (!overlaps) break;
    }
    this.powerups.push(new PowerUp(type, x, y));
  }

  clearAhead() {
    // On respawn, clear obstacles that would immediately hit the player
    this.obstacles = this.obstacles.filter(o => o.x > CANVAS_W * 0.45 || o.x + o.width < 0);
  }
}
