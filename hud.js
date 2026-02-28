/* hud.js ─ In-game HUD: fuel, happiness, lives, score, progress bar, co-pilot */

const HUD = (function () {

  // ── Co-pilot state ────────────────────────────────────────────────────────
  let blinkTimer = 0;
  const COPILOT_X = 14, COPILOT_Y = CANVAS_H - 118, COPILOT_R = 38;

  // ── Main draw ─────────────────────────────────────────────────────────────

  function draw(ctx) {
    if (!window.game) return;

    _drawScore(ctx);
    _drawLives(ctx);
    _drawFuelGauge(ctx);
    _drawHappinessGauge(ctx);
    _drawProgressBar(ctx);
    _drawCopilot(ctx);

    blinkTimer += window.game.deltaTime || 0.016;
  }

  // ── Score (top-center) ────────────────────────────────────────────────────

  function _drawScore(ctx) {
    const scoreStr = Math.floor(game.score).toLocaleString();
    ctx.save();
    ctx.textAlign = 'center';

    // Shadow
    ctx.font = 'bold 32px Arial';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#FFD700';
    ctx.fillText(scoreStr, CANVAS_W * 0.5, 40);
    ctx.shadowBlur = 0;

    ctx.font = '12px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('SCORE', CANVAS_W * 0.5, 55);

    ctx.textAlign = 'left';
    ctx.restore();
  }

  // ── Lives (top-left: mini planes) ─────────────────────────────────────────

  function _drawLives(ctx) {
    if (!game.selectedAirline) return;
    ctx.save();
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = i < game.lives ? 1.0 : 0.22;
      drawMiniPlane(ctx, game.selectedAirline, 24 + i * 46, 28, 36);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Fuel gauge (top-right) ────────────────────────────────────────────────

  function _drawFuelGauge(ctx) {
    _drawGauge(ctx, CANVAS_W - 168, 12, 148, 22, game.fuel / 100, 'FUEL ⛽',
      { low: '#FF5252', mid: '#FF9800', full: '#66BB6A' });
  }

  // ── Happiness gauge (below fuel) ─────────────────────────────────────────

  function _drawHappinessGauge(ctx) {
    _drawGauge(ctx, CANVAS_W - 168, 42, 148, 22, game.happiness / 100, 'HAPPY 😊',
      { low: '#FF5252', mid: '#FFC107', full: '#42A5F5' });
  }

  function _drawGauge(ctx, x, y, w, h, value, label, colors) {
    ctx.save();

    // Background pill
    _roundRect(ctx, x, y, w, h, h * 0.5);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fill();

    // Fill color
    const pct  = Math.max(0, Math.min(1, value));
    const fill = pct < 0.25 ? colors.low
               : pct < 0.60 ? colors.mid
               : colors.full;

    if (pct > 0) {
      _roundRect(ctx, x + 2, y + 2, (w - 4) * pct, h - 4, (h - 4) * 0.5);
      ctx.fillStyle = fill;
      ctx.shadowColor = fill;
      ctx.shadowBlur = pct < 0.3 ? 8 : 0;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Critical flash
    if (pct < 0.2) {
      const flash = Math.sin(Date.now() * 0.01) > 0;
      if (flash) {
        _roundRect(ctx, x, y, w, h, h * 0.5);
        ctx.strokeStyle = '#FF1744';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Label
    ctx.font = 'bold 11px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 3;
    ctx.fillText(label, x + 6, y + h - 5);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  // ── Progress bar (bottom of screen) ──────────────────────────────────────

  function _drawProgressBar(ctx) {
    if (!window.currentLevel) return;

    const bx = 64, by = CANVAS_H - 32, bw = CANVAS_W - 128, bh = 14;
    const progress = Math.min(1, scroll.worldX / currentLevel.totalLength);

    ctx.save();

    // Background track
    _roundRect(ctx, bx, by, bw, bh, 7);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fill();

    // Progress fill (gradient)
    if (progress > 0) {
      _roundRect(ctx, bx + 1, by + 1, (bw - 2) * progress, bh - 2, (bh - 2) * 0.5);
      const progGrad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      progGrad.addColorStop(0, '#2196F3');
      progGrad.addColorStop(0.5, '#4CAF50');
      progGrad.addColorStop(1, '#FFD700');
      ctx.fillStyle = progGrad;
      ctx.fill();
    }

    // Departure airport (left)
    ctx.font = 'bold 13px Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'right';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 3;
    ctx.fillText('✈ ' + currentLevel.from.code, bx - 6, by + 11);

    // Arrival airport (right)
    ctx.textAlign = 'left';
    ctx.fillText(currentLevel.to.code + ' 🛬', bx + bw + 6, by + 11);

    // Plane dot on progress bar
    const dotX = bx + bw * progress;
    ctx.beginPath();
    ctx.arc(dotX, by + bh * 0.5, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Checkpoint markers
    for (const cp of game.checkpoints) {
      const cpX = bx + bw * cp.progress;
      ctx.beginPath();
      ctx.arc(cpX, by + bh * 0.5, 4, 0, Math.PI * 2);
      ctx.fillStyle = cp.reached ? '#4CAF50' : 'rgba(255,255,255,0.5)';
      ctx.fill();
    }

    ctx.textAlign = 'left';
    ctx.restore();
  }

  // ── Co-pilot (bottom-left) ────────────────────────────────────────────────

  function _drawCopilot(ctx) {
    ctx.save();
    const cx = COPILOT_X + COPILOT_R;
    const cy = COPILOT_Y + COPILOT_R;
    const r  = COPILOT_R;

    // Head circle
    const headGrad = ctx.createRadialGradient(cx - 6, cy - 8, 2, cx, cy, r);
    headGrad.addColorStop(0, '#FFE0B2');
    headGrad.addColorStop(0.6, '#FFCC80');
    headGrad.addColorStop(1, '#FF9800');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = headGrad;
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#E65100';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Captain's hat
    ctx.fillStyle = '#1A237E';
    roundRectPath(ctx, cx - r + 4, cy - r + 2, (r - 4) * 2, 16, 4);
    ctx.fill();
    ctx.fillRect(cx - r, cy - r + 14, r * 2, 7);
    // Gold hat stripe
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(cx - r, cy - r + 15, r * 2, 3);
    // Hat peak
    ctx.fillStyle = '#1A237E';
    ctx.beginPath();
    ctx.arc(cx - r * 0.6, cy - r + 14, 6, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (blinking)
    const isBlinking = (blinkTimer % 3.8) < 0.13;
    ctx.fillStyle = '#333';
    if (!isBlinking) {
      // Open eyes
      ctx.beginPath(); ctx.arc(cx - 11, cy + 2, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 11, cy + 2, 5, 0, Math.PI * 2); ctx.fill();
      // Eye shine
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(cx - 9, cy, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 13, cy, 2, 0, Math.PI * 2); ctx.fill();
    } else {
      // Blink lines
      ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - 16, cy + 2); ctx.lineTo(cx - 6, cy + 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 6,  cy + 2); ctx.lineTo(cx + 16, cy + 2); ctx.stroke();
    }

    // Mouth based on emotion
    ctx.strokeStyle = '#5D2E0C'; ctx.lineWidth = 2;
    ctx.beginPath();
    const emotion = window.game ? game.copilotEmotion : 'happy';
    switch (emotion) {
      case 'happy': case 'excited':
        ctx.arc(cx, cy + 9, 12, 0.1, Math.PI - 0.1); // smile
        break;
      case 'worried':
        ctx.arc(cx, cy + 22, 12, Math.PI + 0.2, -0.2); // frown
        break;
      case 'scared':
        ctx.ellipse(cx, cy + 12, 7, 9, 0, 0, Math.PI * 2); // O
        break;
    }
    ctx.stroke();

    // Speech bubble
    const msg   = window.game ? game.copilotMsg : '';
    const timer = window.game ? game.copilotTimer : 0;
    if (msg && timer > 0) {
      const bx2 = cx + r + 10;
      const by2 = cy - r - 10;
      const bw2 = Math.min(240, msg.length * 8.5 + 28);
      const bh2 = 48;

      ctx.save();
      ctx.globalAlpha = Math.min(1, timer);

      // Bubble
      roundRectPath(ctx, bx2, by2, bw2, bh2, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
      ctx.stroke();

      // Tail
      ctx.beginPath();
      ctx.moveTo(bx2, by2 + bh2 * 0.5 + 5);
      ctx.lineTo(bx2 - 12, by2 + bh2 * 0.7);
      ctx.lineTo(bx2,      by2 + bh2 * 0.85);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fill();

      // Text (auto-wrap)
      ctx.fillStyle = '#222';
      ctx.font = '12.5px Arial';
      ctx.textAlign = 'left';
      const words = msg.split(' ');
      let line = '', ly = by2 + 18, lx = bx2 + 10;
      for (const w of words) {
        const test = line + w + ' ';
        if (ctx.measureText(test).width > bw2 - 20 && line) {
          ctx.fillText(line.trim(), lx, ly); line = w + ' '; ly += 16;
        } else { line = test; }
      }
      if (line) ctx.fillText(line.trim(), lx, ly);

      ctx.restore();
    }

    ctx.restore();
  }

  // ── Shared utility ─────────────────────────────────────────────────────────

  function _roundRect(ctx, x, y, w, h, r) {
    roundRectPath(ctx, x, y, w, h, r);
  }

  return { draw };

})();

