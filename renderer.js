/* renderer.js ─ All drawing: world parallax, UI screens, particles
   Defines global CANVAS_W, CANVAS_H, canvas, ctx used by all other scripts. */

const CANVAS_W = 1280;
const CANVAS_H = 720;

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

// ── Button layout registry (game.js reads these for hit-testing) ───────────
const _UI = {
  introPlayBtn:    null,
  planeCards:      [],
  difficultyBtns:  [],
  pauseBtns:       {},
  winBtns:         {},
  loseBtns:        {}
};

// ── Cloud pool (static, reused each frame) ─────────────────────────────────
const FAR_CLOUDS = _buildClouds(12, 0.08, 0.38, 0.22, 0.30);
const MID_CLOUDS = _buildClouds(8,  0.30, 0.52, 0.28, 0.40);

function _buildClouds(count, yMin, yMax, alphaMin, alphaMax) {
  const clouds = [];
  for (let i = 0; i < count; i++) {
    clouds.push({
      baseX: Math.random() * CANVAS_W * 1.8,
      y: yMin * CANVAS_H + Math.random() * (yMax - yMin) * CANVAS_H,
      w: 100 + Math.random() * 180,
      h: 40  + Math.random() * 60,
      alpha: alphaMin + Math.random() * (alphaMax - alphaMin),
      puffs: _cloudPuffs(6 + Math.floor(Math.random() * 5))
    });
  }
  return clouds;
}

function _cloudPuffs(n) {
  const puffs = [];
  for (let i = 0; i < n; i++) {
    puffs.push({
      ox: (Math.random() - 0.3) * 0.9,
      oy: (Math.random() - 0.5) * 0.5,
      r:  0.25 + Math.random() * 0.45
    });
  }
  return puffs;
}

// ── Mountain silhouettes (generated once per terrain type) ────────────────
const _mtnCache = {};

function _getMountains(terrain, layer) {
  const key = terrain + '_' + layer;
  if (_mtnCache[key]) return _mtnCache[key];
  const cfg = TERRAIN_CONFIGS[terrain] || TERRAIN_CONFIGS.coastal;
  const count = layer === 'bg' ? 18 : 14;
  const minH  = layer === 'bg' ? 0.18 : 0.10;
  const maxH  = layer === 'bg' ? 0.35 : 0.22;
  const pts   = [];
  const seg   = (CANVAS_W * 2.5) / count;
  pts.push({ x: 0, y: CANVAS_H });
  for (let i = 0; i <= count; i++) {
    const h = minH + Math.random() * (maxH - minH);
    pts.push({ x: i * seg, y: CANVAS_H * (0.72 - h) });
  }
  pts.push({ x: CANVAS_W * 2.5, y: CANVAS_H });
  _mtnCache[key] = pts;
  return pts;
}

// ── Sky time-of-day palettes (top, mid, bot, hor = horizon glow) ──────────
const SKY_PALETTES = [
  { t: 0.0,  top: '#1a0a2e', mid: '#6b3060', bot: '#f4845f', hor: '#ffb347' },  // dawn
  { t: 0.18, top: '#0d2060', mid: '#1565C0', bot: '#90caf9', hor: '#c8e8ff' },  // morning
  { t: 0.35, top: '#082060', mid: '#1565C0', bot: '#42a5f5', hor: '#b3e5fc' },  // day
  { t: 0.65, top: '#0a1840', mid: '#1a3a8a', bot: '#5c9fd4', hor: '#aad4f5' },  // afternoon
  { t: 0.78, top: '#1a0a2e', mid: '#b71c1c', bot: '#ff8a65', hor: '#ffcc02' },  // dusk
  { t: 0.90, top: '#0d0722', mid: '#1a0a40', bot: '#4a1a60', hor: '#7a2860' },  // twilight
  { t: 1.0,  top: '#000010', mid: '#0d0d2b', bot: '#1a1a4e', hor: '#1a1a4e' }   // night
];

function _getSkyColors(tod) {
  let lo = SKY_PALETTES[0], hi = SKY_PALETTES[SKY_PALETTES.length - 1];
  for (let i = 0; i < SKY_PALETTES.length - 1; i++) {
    if (tod >= SKY_PALETTES[i].t && tod <= SKY_PALETTES[i + 1].t) {
      lo = SKY_PALETTES[i]; hi = SKY_PALETTES[i + 1];
      break;
    }
  }
  const t = (lo.t === hi.t) ? 0 : (tod - lo.t) / (hi.t - lo.t);
  return {
    top: _lerpColor(lo.top, hi.top, t),
    mid: _lerpColor(lo.mid, hi.mid, t),
    bot: _lerpColor(lo.bot, hi.bot, t),
    hor: _lerpColor(lo.hor, hi.hor, t)
  };
}

// ── Screen-shake state ─────────────────────────────────────────────────────
let _shake = { dur: 0, intensity: 0 };

// ── Main render dispatcher ─────────────────────────────────────────────────

const Renderer = {

  render(state) {
    ctx.save();

    // Apply screen shake
    if (_shake.dur > 0) {
      const d = Math.random() * _shake.intensity;
      const a = Math.random() * Math.PI * 2;
      ctx.translate(Math.cos(a) * d, Math.sin(a) * d);
    }

    switch (state) {
      case 'intro':        _drawIntro();        break;
      case 'plane_select': _drawPlaneSelect();  break;
      case 'difficulty':   _drawDifficulty();   break;
      case 'game':         _drawGame();         break;
      case 'pause':        _drawGame(); _drawPause(); break;
      case 'win':          _drawGame(); _drawWin();   break;
      case 'lose':         _drawGame(); _drawLose();  break;
      case 'cutscene':     _drawCutscene();     break;
    }

    ctx.restore();
  },

  triggerShake(duration, intensity) {
    _shake.dur = duration;
    _shake.intensity = intensity || 10;
  },

  updateShake(dt) {
    if (_shake.dur > 0) _shake.dur -= dt;
  },

  // ── UI button getters (for click hit-testing in game.js) ────────────────
  getIntroPlayBtn()   { return _UI.introPlayBtn;   },
  getPlaneCards()     { return _UI.planeCards;      },
  getDifficultyBtns() { return _UI.difficultyBtns;  },
  getPauseBtns()      { return _UI.pauseBtns;       },
  getWinBtns()        { return _UI.winBtns;         },
  getLoseBtns()       { return _UI.loseBtns;        }
};

// ── GAME WORLD ─────────────────────────────────────────────────────────────

function _drawGame() {
  const lvl = window.currentLevel;
  const tod = lvl ? lvl.timeOfDay : 0.35;
  const terrain = lvl ? lvl.terrain : 'coastal';
  const cfg = TERRAIN_CONFIGS[terrain] || TERRAIN_CONFIGS.coastal;
  const offsets = window.scroll ? window.scroll.offsets : {};

  // Layer 0: Sky gradient
  _drawSky(tod);

  // Layer 1: Sun / moon
  _drawCelestial(tod);

  // Stars at night
  if (tod > 0.82) _drawStars(tod);

  // Layer 2: Far clouds (slow parallax)
  _drawCloudsLayer(FAR_CLOUDS, offsets.far_clouds || 0, 0.75, 'rgba(220,230,245,');

  // Layer 3: Background mountains
  _drawMountains(terrain, 'bg', offsets.bg_mountains || 0, cfg.bgMtnColor, tod);

  // Layer 4: Mid mountains
  _drawMountains(terrain, 'mg', offsets.mg_mountains || 0, cfg.mgMtnColor, tod);

  // Layer 5: Ground / ocean
  _drawGround(terrain, offsets.ground || 0, cfg, tod);

  // Layer 6: Mid clouds (after terrain, before obstacles)
  _drawCloudsLayer(MID_CLOUDS, offsets.far_clouds ? offsets.far_clouds * 1.4 : 0, 0.55, 'rgba(215,225,240,');

  // Layer 7: Obstacles + power-ups
  if (window.spawner) {
    for (const obs of window.spawner.obstacles) {
      if (obs.active) obs.draw(ctx);
    }
    for (const pu of window.spawner.powerups) {
      if (!pu.collected) pu.draw(ctx);
    }
  }

  // Layer 8: Particles (behind plane)
  _drawParticles();

  // Layer 9: Player plane
  _drawPlayerPlane();

  // Layer 10: Vignette overlay
  _drawVignette();

  // Layer 11: HUD
  HUD.draw(ctx);

  // Floating texts
  _drawFloatingTexts();

  // Banner
  _drawBanner();
}

function _drawSky(tod) {
  const col = _getSkyColors(tod);
  const skyBottom = CANVAS_H * 0.74;
  const grad = ctx.createLinearGradient(0, 0, 0, skyBottom);
  grad.addColorStop(0,    col.top);
  grad.addColorStop(0.38, col.mid);
  grad.addColorStop(0.72, col.bot);
  grad.addColorStop(1,    col.hor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, skyBottom + 2);

  // Horizon atmospheric glow strip
  const glowH = 48;
  const glowGrad = ctx.createLinearGradient(0, skyBottom - glowH, 0, skyBottom + 12);
  glowGrad.addColorStop(0, 'rgba(0,0,0,0)');
  glowGrad.addColorStop(0.5, col.hor.replace('rgb(', 'rgba(').replace(')', ',0.22)').replace('#', 'rgba(').padEnd(22));
  glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
  // Use a simpler approach for the horizon glow
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = col.hor;
  ctx.fillRect(0, skyBottom - glowH * 0.5, CANVAS_W, glowH);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function _drawCelestial(tod) {
  const isNight = tod > 0.85;
  const cx = CANVAS_W * 0.82;
  const cy = CANVAS_H * 0.12;

  if (!isNight) {
    // Sun
    ctx.save();
    ctx.shadowColor = 'rgba(255,230,100,0.6)';
    ctx.shadowBlur = 40;
    const sunGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 48);
    sunGrad.addColorStop(0, '#fffde0');
    sunGrad.addColorStop(0.4, '#ffe066');
    sunGrad.addColorStop(0.7, '#ffc107');
    sunGrad.addColorStop(1, 'rgba(255,193,7,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, 48, 0, Math.PI * 2);
    ctx.fillStyle = sunGrad;
    ctx.fill();
    ctx.shadowBlur = 0;
    // Lens flare streak
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = '#ffe';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - 70, cy); ctx.lineTo(cx + 70, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - 70); ctx.lineTo(cx, cy + 70); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  } else {
    // Moon
    ctx.save();
    ctx.shadowColor = 'rgba(200,220,255,0.4)';
    ctx.shadowBlur = 25;
    const moonGrad = ctx.createRadialGradient(cx - 8, cy - 8, 2, cx, cy, 30);
    moonGrad.addColorStop(0, '#eef5ff');
    moonGrad.addColorStop(0.6, '#c8d8f0');
    moonGrad.addColorStop(1, 'rgba(180,200,230,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.fillStyle = moonGrad;
    ctx.fill();
    // Moon crescent shadow
    ctx.beginPath();
    ctx.arc(cx + 10, cy - 8, 24, 0, Math.PI * 2);
    ctx.fillStyle = _getSkyColors(tod).mid;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

function _drawStars(tod) {
  const alpha = Math.min(1, (tod - 0.82) / 0.12);
  ctx.save();
  ctx.globalAlpha = alpha * 0.85;
  ctx.fillStyle = '#ffffff';
  // Use a seeded pattern for consistent stars
  const seed = 42;
  for (let i = 0; i < 120; i++) {
    const x = ((seed * (i + 1) * 2654435761) % CANVAS_W);
    const y = ((seed * (i + 7) * 2246822519) % (CANVAS_H * 0.55));
    const r = 0.5 + (i % 3) * 0.4;
    const twinkle = 0.5 + 0.5 * Math.sin(Date.now() * 0.003 + i);
    ctx.globalAlpha = alpha * 0.4 * twinkle;
    ctx.beginPath();
    ctx.arc(Math.abs(x), Math.abs(y), r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function _drawCloudsLayer(clouds, offset, alpha, colorPrefix) {
  clouds.forEach(cl => {
    const x = ((cl.baseX - offset) % (CANVAS_W * 2 + cl.w)) - cl.w;
    cl.puffs.forEach(p => {
      const px = x + cl.w * (0.1 + p.ox * 0.8);
      const py = cl.y + cl.h * p.oy;
      const pr = cl.w * p.r * 0.5;

      // Pass 1: blue-gray shadow (drawn slightly lower = underside of cloud)
      const shadowY = py + pr * 0.22;
      const shadowGrad = ctx.createRadialGradient(px, shadowY, 0, px, shadowY, pr * 0.9);
      shadowGrad.addColorStop(0, `rgba(150,165,195,${alpha * 0.55})`);
      shadowGrad.addColorStop(0.5, `rgba(155,170,200,${alpha * 0.3})`);
      shadowGrad.addColorStop(1, 'rgba(150,165,195,0)');
      ctx.beginPath();
      ctx.arc(px, shadowY, pr * 0.9, 0, Math.PI * 2);
      ctx.fillStyle = shadowGrad;
      ctx.fill();

      // Pass 2: bright white top (slightly higher = lit top of cloud)
      const topY = py - pr * 0.08;
      const topGrad = ctx.createRadialGradient(px - pr * 0.12, topY - pr * 0.15, 0, px, topY, pr);
      topGrad.addColorStop(0, `rgba(255,255,255,${alpha})`);
      topGrad.addColorStop(0.45, `rgba(248,252,255,${alpha * 0.85})`);
      topGrad.addColorStop(0.75, `rgba(235,243,255,${alpha * 0.5})`);
      topGrad.addColorStop(1, 'rgba(230,240,255,0)');
      ctx.beginPath();
      ctx.arc(px, topY, pr, 0, Math.PI * 2);
      ctx.fillStyle = topGrad;
      ctx.fill();
    });
  });
}

function _drawMountains(terrain, layer, offset, colors, tod) {
  const pts = _getMountains(terrain, layer);
  const hazeAlpha = layer === 'bg' ? 0.45 : 0.2;
  const hazeColor = _getSkyColors(tod).bot;

  // Draw mountain silhouette
  ctx.beginPath();
  ctx.moveTo(pts[0].x - (offset % (CANVAS_W * 2.5)), pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x - (offset % (CANVAS_W * 2.5)), pts[i].y);
  }
  ctx.closePath();

  const mtnGrad = ctx.createLinearGradient(0, CANVAS_H * 0.35, 0, CANVAS_H * 0.75);
  mtnGrad.addColorStop(0, colors[0]);
  mtnGrad.addColorStop(0.5, colors[1] || colors[0]);
  mtnGrad.addColorStop(1, colors[1] || colors[0]);
  ctx.fillStyle = mtnGrad;
  ctx.fill();

  // Atmospheric haze overlay (far mountains fade toward sky color)
  ctx.beginPath();
  ctx.moveTo(pts[0].x - (offset % (CANVAS_W * 2.5)), pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x - (offset % (CANVAS_W * 2.5)), pts[i].y);
  }
  ctx.closePath();
  const hazeGrad = ctx.createLinearGradient(0, CANVAS_H * 0.35, 0, CANVAS_H * 0.72);
  hazeGrad.addColorStop(0, hazeColor.replace(')', `,${hazeAlpha})`).replace('rgb', 'rgba'));
  hazeGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hazeGrad;
  ctx.fill();

  // Snow caps on tall bg mountains (northwest / appalachian)
  if (layer === 'bg' && (terrain === 'northwest' || terrain === 'appalachian')) {
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i];
      const h = CANVAS_H * 0.72 - p.y;
      if (h > CANVAS_H * 0.12) {
        const sx = p.x - (offset % (CANVAS_W * 2.5));
        ctx.beginPath();
        ctx.moveTo(sx, p.y);
        ctx.lineTo(sx - 18, p.y + 28);
        ctx.lineTo(sx + 18, p.y + 28);
        ctx.closePath();
        ctx.fillStyle = 'rgba(240,245,255,0.85)';
        ctx.fill();
      }
    }
  }
}

function _drawGround(terrain, offset, cfg, tod) {
  const groundY = CANVAS_H * 0.73;
  const isNight = tod > 0.82;
  const cfg2 = cfg;

  if (cfg2.isDeepOcean || cfg2.hasOcean) {
    // Ocean: animated waves
    const waveOffset = (offset * 0.4) % CANVAS_W;
    const oceanGrad = ctx.createLinearGradient(0, groundY, 0, CANVAS_H);
    oceanGrad.addColorStop(0, cfg2.oceanColor1 || '#1565C0');
    oceanGrad.addColorStop(1, cfg2.oceanColor2 || '#1976D2');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, groundY, CANVAS_W, CANVAS_H - groundY);

    // Wave lines
    ctx.save();
    ctx.globalAlpha = 0.3;
    for (let w = 0; w < 6; w++) {
      const wy = groundY + 14 + w * 18;
      ctx.beginPath();
      for (let x = -CANVAS_W; x < CANVAS_W * 2; x += 2) {
        const wx = x - waveOffset + w * 30;
        const y = wy + Math.sin((wx / 80) + w) * 6;
        if (x === -CANVAS_W) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(180,220,255,0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  } else {
    // Land
    const landGrad = ctx.createLinearGradient(0, groundY, 0, CANVAS_H);
    landGrad.addColorStop(0, isNight ? _darken(cfg2.groundColor, 60) : cfg2.groundColor);
    landGrad.addColorStop(1, isNight ? _darken(cfg2.groundColor2 || cfg2.groundColor, 80) : (cfg2.groundColor2 || cfg2.groundColor));
    ctx.fillStyle = landGrad;
    ctx.fillRect(0, groundY, CANVAS_W, CANVAS_H - groundY);

    // Farm fields
    if (cfg2.hasFarmFields && cfg2.fieldColors) {
      const fieldW = 120;
      const fieldH = CANVAS_H - groundY;
      const offX = offset % fieldW;
      for (let fx = -offX; fx < CANVAS_W + fieldW; fx += fieldW) {
        const colorIdx = Math.floor(((fx + offset) / fieldW)) % cfg2.fieldColors.length;
        ctx.fillStyle = isNight
          ? _darken(cfg2.fieldColors[colorIdx], 70)
          : cfg2.fieldColors[colorIdx];
        ctx.fillRect(fx, groundY, fieldW - 2, fieldH);
      }
    }

    // City lights at night
    if (isNight && cfg2.hasCityLights) {
      ctx.save();
      ctx.globalAlpha = 0.85;
      const lightOffset = (offset * 0.5) % 80;
      for (let lx = -lightOffset; lx < CANVAS_W + 80; lx += 14) {
        if (Math.sin(lx * 0.3 + 1) > 0.1) {
          ctx.fillStyle = ['#FFD700','#FFA500','#FF6B6B','#88CCFF','#FFFACD'][Math.floor(lx * 0.07) % 5];
          ctx.fillRect(lx, groundY + 8 + (Math.abs(Math.sin(lx * 0.5)) * 18), 2, 2);
        }
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }
}

function _drawParticles() {
  if (!window.game || !game.particles) return;
  for (const p of game.particles) {
    if (p.life <= 0) continue;
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life) * 0.88;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = p.size > 8 ? 8 : 0;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function _drawPlayerPlane() {
  if (!window.player || !window.game) return;
  if (game.state !== 'game' && game.state !== 'pause' && game.state !== 'win' && game.state !== 'lose') return;

  // Invincibility flash (blink every 8 frames)
  if (game.invincible && (Math.floor(Date.now() / 90) % 2 === 0)) return;

  const px = player.x, py = player.y;
  const airline = game.selectedAirline || 'southwest';
  const bank = player.bank || 0;
  const SCALE = 1.0;

  ctx.save();

  // ── Contrail effect (drawn first, behind the plane) ────────────────────
  // Engines are at local (-12, +46) near and (-8, -28) far in plane coords
  const engPositions = [
    { lx: -12, ly: 46 },
    { lx: -8,  ly: -28 }
  ];
  const cosB = Math.cos(bank), sinB = Math.sin(bank);
  for (const e of engPositions) {
    // World position of engine center
    const ex = px + (e.lx * cosB - e.ly * sinB) * SCALE;
    const ey = py + (e.lx * sinB + e.ly * cosB) * SCALE;
    // Contrail trails left (opposite to flight direction = -x axis, rotated)
    const trailLen = 110;
    const tx = ex - cosB * trailLen;
    const ty = ey - sinB * trailLen;
    const cg = ctx.createLinearGradient(ex, ey, tx, ty);
    cg.addColorStop(0, 'rgba(255,255,255,0.38)');
    cg.addColorStop(0.4, 'rgba(255,255,255,0.18)');
    cg.addColorStop(1, 'rgba(255,255,255,0)');
    // Draw as a soft ribbon
    const perpX = -sinB * 4, perpY = cosB * 4;
    ctx.beginPath();
    ctx.moveTo(ex + perpX, ey + perpY);
    ctx.lineTo(tx + perpX * 0.3, ty + perpY * 0.3);
    ctx.lineTo(tx - perpX * 0.3, ty - perpY * 0.3);
    ctx.lineTo(ex - perpX, ey - perpY);
    ctx.closePath();
    ctx.fillStyle = cg;
    ctx.fill();
  }

  // ── Shield bubble ─────────────────────────────────────────────────────
  if (game.shieldActive) {
    const shieldAlpha = 0.25 + 0.2 * Math.sin(Date.now() * 0.008);
    ctx.save();
    ctx.shadowColor = '#64B5F6';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(px, py, 68, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(100,181,246,${shieldAlpha})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(100,181,246,${shieldAlpha * 2.5})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── Plane ──────────────────────────────────────────────────────────────
  drawPlane(ctx, airline, px, py, SCALE, bank);

  // ── Navigation lights ─────────────────────────────────────────────────
  // Near (lower) wingtip: local (-62, 60) = red
  // Far (upper) wingtip: local (-56, -40) = green
  // Tail: local (-105, 0) = white strobe
  const navOn    = Math.floor(Date.now() / 900) % 2 === 0;
  const strobeOn = Math.floor(Date.now() / 450) % 2 === 0;

  const _navLight = (lx, ly, color, size) => {
    const wx = px + (lx * cosB - ly * sinB) * SCALE;
    const wy = py + (lx * sinB + ly * cosB) * SCALE;
    ctx.save();
    ctx.beginPath();
    ctx.arc(wx, wy, size, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  };

  if (navOn) {
    _navLight(-62,  60, '#FF1744', 4);  // red  – near (lower) wingtip
    _navLight(-56, -40, '#00E676', 4);  // green – far (upper) wingtip
  }
  if (strobeOn) {
    _navLight(-105, 0, '#FFFFFF', 3);  // white strobe – tail
  }

  ctx.restore();
}

function _drawVignette() {
  const grad = ctx.createRadialGradient(
    CANVAS_W * 0.5, CANVAS_H * 0.5, CANVAS_H * 0.3,
    CANVAS_W * 0.5, CANVAS_H * 0.5, CANVAS_W * 0.72
  );
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.65, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

function _drawFloatingTexts() {
  if (!window.game || !game.floatingTexts) return;
  for (const ft of game.floatingTexts) {
    if (ft.life <= 0) continue;
    ctx.save();
    ctx.globalAlpha = Math.min(1, ft.life);
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = ft.color || '#FFD700';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
  ctx.textAlign = 'left';
}

function _drawBanner() {
  if (!window.game || !game.bannerText || game.bannerTimer <= 0) return;
  const alpha = Math.min(1, game.bannerTimer * 2);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = 'bold 42px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = game.bannerColor || '#4CAF50';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 8;
  ctx.fillText(game.bannerText, CANVAS_W * 0.5, CANVAS_H * 0.42);
  ctx.restore();
  ctx.textAlign = 'left';
}

// ── INTRO SCREEN ───────────────────────────────────────────────────────────

function _drawIntro() {
  // Animated background
  const t = Date.now() * 0.0008;
  const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  bgGrad.addColorStop(0, '#0a1440');
  bgGrad.addColorStop(0.45, '#1565C0');
  bgGrad.addColorStop(1, '#0d2060');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Animated clouds
  for (let i = 0; i < 5; i++) {
    const cx = ((t * 60 * (i + 1) * 0.4) + i * 280) % (CANVAS_W + 200);
    const cy = 80 + i * 85;
    _drawSingleCloud(cx, cy, 180 + i * 30, 0.25);
  }

  // Stars
  ctx.save();
  for (let i = 0; i < 80; i++) {
    const sx = (i * 137.5) % CANVAS_W;
    const sy = (i * 93.1) % (CANVAS_H * 0.55);
    const br = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i));
    ctx.globalAlpha = br * 0.7;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Demo plane flying across
  const planeX = ((t * 95) % (CANVAS_W + 260)) - 130;
  if (planeX > -130 && planeX < CANVAS_W + 130) {
    drawPlane(ctx, 'southwest', planeX, 220, 0.9, -0.04);
  }

  // Title: "SKY CAPTAIN JR."
  ctx.save();
  ctx.textAlign = 'center';

  // Shimmer layer behind main title
  const shimmer = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 4));
  ctx.font = 'bold 92px Arial';
  ctx.fillStyle = `rgba(255,255,220,${shimmer * 0.18})`;
  ctx.fillText('SKY CAPTAIN', CANVAS_W * 0.5 + 3, 403);

  // Shadow/glow
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 28 + 12 * Math.sin(t * 3);
  ctx.font = 'bold 88px Arial';
  ctx.fillStyle = '#FFD700';
  ctx.fillText('SKY CAPTAIN', CANVAS_W * 0.5, 400);

  ctx.shadowColor = '#FF8C00';
  ctx.shadowBlur = 20;
  ctx.font = 'bold 60px Arial';
  ctx.fillStyle = '#FF8C00';
  ctx.fillText('JUNIOR', CANVAS_W * 0.5, 468);
  ctx.shadowBlur = 0;

  ctx.font = '20px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('A Real Airline Adventure for Future Pilots!', CANVAS_W * 0.5, 510);

  // PLAY button
  const btnW = 220, btnH = 68;
  const bx = CANVAS_W * 0.5 - btnW / 2;
  const by = 560;
  _UI.introPlayBtn = { x: bx, y: by, w: btnW, h: btnH };

  const hovered = _isHovered(bx, by, btnW, btnH);
  const btnGrad = ctx.createLinearGradient(bx, by, bx, by + btnH);
  btnGrad.addColorStop(0, hovered ? '#FF8C00' : '#FF6D00');
  btnGrad.addColorStop(1, hovered ? '#E65100' : '#BF360C');
  roundRectPath(ctx, bx, by, btnW, btnH, 34);
  ctx.shadowColor = '#FF6D00';
  ctx.shadowBlur = hovered ? 28 : 16;
  ctx.fillStyle = btnGrad;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.font = 'bold 30px Arial';
  ctx.fillStyle = '#fff';
  ctx.fillText('✈  PLAY!', CANVAS_W * 0.5, by + 43);

  ctx.textAlign = 'left';
  ctx.restore();

  // Bottom tagline
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Arrow keys or on-screen buttons to fly · Ages 6-10', CANVAS_W * 0.5, CANVAS_H - 22);
  ctx.textAlign = 'left';
}

// ── PLANE SELECT ───────────────────────────────────────────────────────────

function _drawPlaneSelect() {
  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  bgGrad.addColorStop(0, '#0d1b3e');
  bgGrad.addColorStop(1, '#1a2a5e');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Title
  ctx.textAlign = 'center';
  ctx.font = 'bold 52px Arial';
  ctx.fillStyle = '#FFD700';
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 18;
  ctx.fillText('Choose Your Airline!', CANVAS_W * 0.5, 68);
  ctx.shadowBlur = 0;
  ctx.font = '20px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('Pick the real airline you want to fly!', CANVAS_W * 0.5, 102);

  // Airline cards: 4 per row
  const keys = AIRLINE_KEYS;
  const cw = 175, ch = 205, gap = 16;
  const row1Y = 130;
  const row2Y = row1Y + ch + 24;
  const perRow = 4;

  _UI.planeCards = [];
  keys.forEach((key, i) => {
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    const countInRow = row === 0 ? Math.min(perRow, keys.length) : keys.length - perRow;
    const rowW = countInRow * cw + (countInRow - 1) * gap;
    const rowStartX = (CANVAS_W - rowW) * 0.5;
    const cx = rowStartX + col * (cw + gap);
    const cy = row === 0 ? row1Y : row2Y;
    const selected = window.game && game.selectedAirline === key;
    const hovered = _isHovered(cx, cy, cw, ch);

    drawAirlineCard(ctx, key, cx, cy, cw, ch, selected, hovered);
    _UI.planeCards.push({ airline: key, rect: { x: cx, y: cy, w: cw, h: ch } });
  });

  ctx.textAlign = 'left';
}

// ── DIFFICULTY SELECT ──────────────────────────────────────────────────────

function _drawDifficulty() {
  const bgGrad = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
  bgGrad.addColorStop(0, '#0d1b3e');
  bgGrad.addColorStop(1, '#1a2a5e');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Show selected airline (small preview)
  if (window.game && game.selectedAirline) {
    drawPlane(ctx, game.selectedAirline, CANVAS_W * 0.5, 135, 0.85, -0.04);
    const al = AIRLINES[game.selectedAirline];
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '18px Arial';
    ctx.fillText('Flying with ' + al.name, CANVAS_W * 0.5, 196);
  }

  ctx.textAlign = 'center';
  ctx.font = 'bold 52px Arial';
  ctx.fillStyle = '#FFD700';
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 18;
  ctx.fillText('Choose Your Mission!', CANVAS_W * 0.5, 252);
  ctx.shadowBlur = 0;

  const diffs = [
    { key: 'easy',   label: '🐣  Cadet',   stars: '★☆☆', desc: 'Gentle ride! Short hops, few obstacles', color: ['#2E7D32','#1B5E20'], speed: 'Slow', route: 'LAX → SFO → SEA' },
    { key: 'medium', label: '✈  Pilot',    stars: '★★☆', desc: 'Getting exciting! More obstacles, longer flights', color: ['#F57F17','#E65100'], speed: 'Medium', route: 'SEA → ORD → ATL → JFK' },
    { key: 'hard',   label: '👨‍✈️  Captain', stars: '★★★', desc: 'Pro pilot! All obstacles, night flights!', color: ['#B71C1C','#7F0000'], speed: 'Fast', route: 'ORD → ATL → SFO → JFK → LAX' }
  ];

  const bw = 320, bh = 175, bgap = 28;
  const totalBW = diffs.length * bw + (diffs.length - 1) * bgap;
  const bStartX = (CANVAS_W - totalBW) * 0.5;
  const bY = 285;

  _UI.difficultyBtns = [];
  diffs.forEach((d, i) => {
    const bx = bStartX + i * (bw + bgap);
    const hovered = _isHovered(bx, bY, bw, bh);
    const selected = window.game && game.difficulty === d.key;

    const btnGrad = ctx.createLinearGradient(bx, bY, bx, bY + bh);
    btnGrad.addColorStop(0, d.color[0]);
    btnGrad.addColorStop(1, d.color[1]);
    roundRectPath(ctx, bx, bY, bw, bh, 18);

    ctx.shadowColor = d.color[0];
    ctx.shadowBlur = (hovered || selected) ? 22 : 10;
    ctx.fillStyle = btnGrad;
    ctx.fill();
    ctx.shadowBlur = 0;

    if (selected || hovered) {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px Arial';
    ctx.fillText(d.label, bx + bw * 0.5, bY + 44);

    ctx.font = '22px Arial';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(d.stars, bx + bw * 0.5, bY + 76);

    ctx.font = '14px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    // Word wrap description
    const words = d.desc.split(' ');
    let line = '', lineY = bY + 104;
    for (const word of words) {
      const test = line + word + ' ';
      const w = ctx.measureText(test).width;
      if (w > bw - 24 && line !== '') {
        ctx.fillText(line.trim(), bx + bw * 0.5, lineY);
        line = word + ' '; lineY += 20;
      } else { line = test; }
    }
    if (line) ctx.fillText(line.trim(), bx + bw * 0.5, lineY);

    ctx.font = '13px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('Route: ' + d.route, bx + bw * 0.5, bY + bh - 14);

    _UI.difficultyBtns.push({ difficulty: d.key, rect: { x: bx, y: bY, w: bw, h: bh } });
  });

  ctx.textAlign = 'left';
}

// ── PAUSE OVERLAY ──────────────────────────────────────────────────────────

function _drawPause() {
  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.textAlign = 'center';
  ctx.font = 'bold 64px Arial';
  ctx.fillStyle = '#FFD700';
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 20;
  ctx.fillText('⏸  PAUSED', CANVAS_W * 0.5, 290);
  ctx.shadowBlur = 0;

  const buttons = [
    { label: '▶  Resume', key: 'resume', color: '#2E7D32' },
    { label: '🏠  Main Menu', key: 'quit', color: '#37474F' }
  ];
  const bw = 240, bh = 62, bGap = 20;
  const totalH = buttons.length * bh + (buttons.length - 1) * bGap;
  const startY = CANVAS_H * 0.5 - totalH * 0.5 + 30;

  _UI.pauseBtns = {};
  buttons.forEach((b, i) => {
    const bx = CANVAS_W * 0.5 - bw * 0.5;
    const by = startY + i * (bh + bGap);
    const hovered = _isHovered(bx, by, bw, bh);
    roundRectPath(ctx, bx, by, bw, bh, 31);
    ctx.fillStyle = hovered ? _lightenCss(b.color, 20) : b.color;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = hovered ? 20 : 8;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px Arial';
    ctx.fillText(b.label, CANVAS_W * 0.5, by + 40);
    _UI.pauseBtns[b.key] = { x: bx, y: by, w: bw, h: bh };
  });

  ctx.textAlign = 'left';
}

// ── WIN SCREEN ─────────────────────────────────────────────────────────────

function _drawWin() {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.textAlign = 'center';
  ctx.font = 'bold 74px Arial';
  ctx.fillStyle = '#FFD700';
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 30;
  ctx.fillText('🎉  AMAZING LANDING!', CANVAS_W * 0.5, 200);
  ctx.shadowBlur = 0;

  if (window.game && game.scoreDetails) {
    const sd = game.scoreDetails;
    const rows = [
      { label: 'Flight Score', val: sd.base || 0 },
      { label: 'Perfect Bonus', val: sd.perfect || 0 },
      { label: 'Fuel Bonus', val: sd.fuel || 0 },
      { label: 'Happy Passengers', val: sd.happy || 0 }
    ];
    let y = 270;
    ctx.font = '22px Arial';
    rows.forEach(r => {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText(r.label, CANVAS_W * 0.5 - 80, y);
      ctx.fillStyle = '#FFD700';
      ctx.fillText('+' + r.val.toLocaleString(), CANVAS_W * 0.5 + 120, y);
      y += 34;
    });
    ctx.strokeStyle = 'rgba(255,215,0,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(CANVAS_W * 0.5 - 160, y); ctx.lineTo(CANVAS_W * 0.5 + 160, y);
    ctx.stroke();
    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('TOTAL: ' + (sd.total || 0).toLocaleString(), CANVAS_W * 0.5, y + 38);
  }

  const bw = 220, bh = 58, gap = 20;
  const totalW = bw * 2 + gap;
  const bStartX = CANVAS_W * 0.5 - totalW * 0.5;
  const bY = 520;

  const wBtns = [
    { key: 'next', label: '▶  Next Flight', color: '#1565C0' },
    { key: 'menu', label: '🏠  Menu', color: '#37474F' }
  ];
  _UI.winBtns = {};
  wBtns.forEach((b, i) => {
    const bx = bStartX + i * (bw + gap);
    const hovered = _isHovered(bx, bY, bw, bh);
    roundRectPath(ctx, bx, bY, bw, bh, 29);
    ctx.fillStyle = hovered ? _lightenCss(b.color, 25) : b.color;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = hovered ? 20 : 8;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 21px Arial';
    ctx.fillText(b.label, bx + bw * 0.5, bY + 37);
    _UI.winBtns[b.key] = { x: bx, y: bY, w: bw, h: bh };
  });

  ctx.textAlign = 'left';
}

// ── LOSE SCREEN ────────────────────────────────────────────────────────────

function _drawLose() {
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.textAlign = 'center';
  ctx.font = 'bold 72px Arial';
  ctx.fillStyle = '#FF5252';
  ctx.shadowColor = '#FF1744';
  ctx.shadowBlur = 24;
  ctx.fillText('Oh No! Crash Landing!', CANVAS_W * 0.5, 210);
  ctx.shadowBlur = 0;

  ctx.font = '28px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText("Don't give up — great pilots never quit!", CANVAS_W * 0.5, 275);

  if (window.game) {
    ctx.font = '24px Arial';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('Score: ' + Math.floor(game.score).toLocaleString(), CANVAS_W * 0.5, 325);
  }

  const bw = 260, bh = 62, gap = 22;
  const totalW = bw * 2 + gap;
  const bStartX = CANVAS_W * 0.5 - totalW * 0.5;
  const bY = 400;

  const lBtns = [
    { key: 'retry', label: '🔄  Try Again', color: '#2E7D32' },
    { key: 'menu',  label: '🏠  Main Menu', color: '#37474F' }
  ];
  _UI.loseBtns = {};
  lBtns.forEach((b, i) => {
    const bx = bStartX + i * (bw + gap);
    const hovered = _isHovered(bx, bY, bw, bh);
    roundRectPath(ctx, bx, bY, bw, bh, 31);
    ctx.fillStyle = hovered ? _lightenCss(b.color, 22) : b.color;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = hovered ? 20 : 8;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 23px Arial';
    ctx.fillText(b.label, bx + bw * 0.5, bY + 40);
    _UI.loseBtns[b.key] = { x: bx, y: bY, w: bw, h: bh };
  });

  ctx.textAlign = 'left';
}

// ── CUTSCENE (fun fact) ────────────────────────────────────────────────────

function _drawCutscene() {
  const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  bgGrad.addColorStop(0, '#0d1b3e');
  bgGrad.addColorStop(1, '#1a2a5e');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Flying plane animation
  const t = Date.now() * 0.0008;
  const planeX = ((t * 120) % (CANVAS_W + 260)) - 130;
  if (window.game && game.selectedAirline) {
    drawPlane(ctx, game.selectedAirline, planeX, 180, 0.9, -0.06);
  }

  // Cloud trail
  for (let i = 0; i < 4; i++) {
    _drawSingleCloud(planeX - 100 - i * 60, 180, 80 - i * 12, 0.18 - i * 0.03);
  }

  ctx.textAlign = 'center';
  ctx.font = 'bold 40px Arial';
  ctx.fillStyle = '#FFD700';
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 14;
  ctx.fillText('✈  Fun Fact!', CANVAS_W * 0.5, 280);
  ctx.shadowBlur = 0;

  // Get a fun fact based on current level
  const lvlIdx = window.game ? (game.levelIndex || 0) : 0;
  const fact = window.currentLevel ? currentLevel.funFact : FUN_FACTS[lvlIdx % FUN_FACTS.length].text;

  // Draw fact in a rounded box
  const bx = CANVAS_W * 0.12, by = 310, bw = CANVAS_W * 0.76, bh = 130;
  roundRectPath(ctx, bx, by, bw, bh, 18);
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,215,0,0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = '22px Arial';
  ctx.fillStyle = '#fff';
  _wrapText(ctx, fact, bx + 28, by + 42, bw - 56, 30);

  // Continue button
  const cbW = 200, cbH = 54;
  const cbX = CANVAS_W * 0.5 - cbW * 0.5;
  const cbY = 480;
  const hovered = _isHovered(cbX, cbY, cbW, cbH);
  roundRectPath(ctx, cbX, cbY, cbW, cbH, 27);
  ctx.fillStyle = hovered ? '#FF8C00' : '#FF6D00';
  ctx.shadowColor = '#FF6D00';
  ctx.shadowBlur = hovered ? 20 : 10;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px Arial';
  ctx.fillText('Next Flight ▶', CANVAS_W * 0.5, cbY + 35);

  ctx.textAlign = 'left';
}

// ── Utilities ──────────────────────────────────────────────────────────────

function _drawSingleCloud(cx, cy, w, alpha) {
  const puffs = [
    { ox: 0,    oy: 0,    r: w * 0.32 },
    { ox: -0.3, oy: 0.1,  r: w * 0.26 },
    { ox:  0.3, oy: 0.08, r: w * 0.25 },
    { ox:  0.1, oy: -0.1, r: w * 0.22 },
    { ox: -0.2, oy: -0.05,r: w * 0.20 }
  ];
  puffs.forEach(p => {
    const px = cx + w * p.ox, py = cy + w * p.oy;
    const pr = w * p.r;
    // Shadow pass
    const shadowGrad = ctx.createRadialGradient(px, py + pr * 0.2, 0, px, py + pr * 0.2, pr * 0.85);
    shadowGrad.addColorStop(0, `rgba(150,165,195,${alpha * 0.5})`);
    shadowGrad.addColorStop(1, 'rgba(150,165,195,0)');
    ctx.beginPath(); ctx.arc(px, py + pr * 0.2, pr * 0.85, 0, Math.PI * 2);
    ctx.fillStyle = shadowGrad; ctx.fill();
    // Bright top pass
    const topGrad = ctx.createRadialGradient(px - pr * 0.1, py - pr * 0.1, 0, px, py, pr);
    topGrad.addColorStop(0, `rgba(255,255,255,${alpha})`);
    topGrad.addColorStop(0.5, `rgba(240,248,255,${alpha * 0.82})`);
    topGrad.addColorStop(1, 'rgba(230,240,255,0)');
    ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fillStyle = topGrad; ctx.fill();
  });
}

function _isHovered(x, y, w, h) {
  if (!window.game) return false;
  return game.mouseX >= x && game.mouseX <= x + w &&
         game.mouseY >= y && game.mouseY <= y + h;
}

function _wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let curY = y;
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxWidth && line !== '') {
      ctx.fillText(line.trim(), x, curY);
      line = word + ' ';
      curY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line.trim(), x, curY);
}

function _lerpColor(c1, c2, t) {
  const p = (c) => {
    const v = parseInt(c.replace('#',''), 16);
    return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
  };
  const a = p(c1), b = p(c2);
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bv= Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bv})`;
}

function _darken(hex, amount) {
  if (!hex.startsWith('#')) return hex;
  const num = parseInt(hex.replace('#',''), 16);
  const r = Math.max(0, ((num >> 16) & 0xff) - amount);
  const g = Math.max(0, ((num >> 8)  & 0xff) - amount);
  const b = Math.max(0, ( num        & 0xff) - amount);
  return `rgb(${r},${g},${b})`;
}

function _lightenCss(hex, amount) {
  if (hex.startsWith('#')) {
    const num = parseInt(hex.replace('#',''), 16);
    const r = Math.min(255, ((num >> 16) & 0xff) + amount);
    const g = Math.min(255, ((num >> 8)  & 0xff) + amount);
    const b = Math.min(255, ( num        & 0xff) + amount);
    return `rgb(${r},${g},${b})`;
  }
  return hex;
}