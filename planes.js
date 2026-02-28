/* planes.js ─ Real airline plane drawing with authentic liveries (Canvas 2D) */

// ── Airline definitions ────────────────────────────────────────────────────

const AIRLINES = {
  southwest: {
    key: 'southwest',
    name: 'Southwest Airlines',
    tagline: 'Heart of the Skies',
    cardBg: ['#304CB2', '#1a2e7a'],
    fuselageTop: '#f8f8f8',
    fuselageMid: '#e8e8e8',
    fuselageBot: '#c0c0c0',
    wingTop: '#d0d0d8',
    wingBot: '#909098',
    tailColor: '#304CB2',
    engineColor: '#888',
    stripeColors: ['#304CB2', '#FFBF27', '#F9423A']
  },
  alaska: {
    key: 'alaska',
    name: 'Alaska Airlines',
    tagline: 'Spirit of the North',
    cardBg: ['#01426A', '#012848'],
    fuselageTop: '#f5f5f5',
    fuselageMid: '#e5e5e5',
    fuselageBot: '#bbb',
    wingTop: '#d8d8d8',
    wingBot: '#888',
    tailColor: '#01426A',
    engineColor: '#888',
    accentColor: '#C8A951'
  },
  delta: {
    key: 'delta',
    name: 'Delta Air Lines',
    tagline: 'Keep Climbing',
    cardBg: ['#003366', '#001e44'],
    fuselageTop: '#f5f5f5',
    fuselageMid: '#e8e8e8',
    fuselageBot: '#bbb',
    wingTop: '#d5d5d5',
    wingBot: '#858585',
    tailColor: '#CC0000',
    engineColor: '#888',
    tailAccent: '#003366'
  },
  united: {
    key: 'united',
    name: 'United Airlines',
    tagline: 'Fly the Friendly Skies',
    cardBg: ['#002244', '#001428'],
    fuselageTop: '#f5f5f5',
    fuselageMid: '#eaeaea',
    fuselageBot: '#bbb',
    wingTop: '#d5d5d8',
    wingBot: '#888',
    tailColor: '#002244',
    engineColor: '#888',
    stripeColor: '#5C88DA'
  },
  american: {
    key: 'american',
    name: 'American Airlines',
    tagline: 'Going for Great',
    cardBg: ['#0078D2', '#004a8a'],
    fuselageTop: '#d8e0e8',
    fuselageMid: '#c0cad4',
    fuselageBot: '#909aaa',
    wingTop: '#c8d0d8',
    wingBot: '#808890',
    tailColor: '#0078D2',
    engineColor: '#999',
    stripe1: '#C8102E',
    stripe2: '#0078D2'
  },
  jetblue: {
    key: 'jetblue',
    name: 'JetBlue Airways',
    tagline: 'You Above All',
    cardBg: ['#003876', '#001e4a'],
    fuselageTop: '#f5f8ff',
    fuselageMid: '#e8eef8',
    fuselageBot: '#c0cce0',
    wingTop: '#d0d8e8',
    wingBot: '#8090a8',
    tailColor: '#003876',
    engineColor: '#8090a8',
    waveColor: '#003876'
  },
  hawaiian: {
    key: 'hawaiian',
    name: 'Hawaiian Airlines',
    tagline: 'The Spirit of Aloha',
    cardBg: ['#4B1869', '#2d0e40'],
    fuselageTop: '#f5f5f5',
    fuselageMid: '#e8e8e8',
    fuselageBot: '#bbb',
    wingTop: '#d5d5d5',
    wingBot: '#858585',
    tailColor: '#4B1869',
    engineColor: '#888',
    beltColor: '#4B1869',
    accentColor: '#F5A800'
  }
};

const AIRLINE_KEYS = Object.keys(AIRLINES);

// ── Helper utilities ───────────────────────────────────────────────────────

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Core plane drawing ─────────────────────────────────────────────────────
// Draws the plane centered at (cx, cy), facing RIGHT, at given scale.
// bankAngle = rotation in radians (positive = nose-down)

function drawPlane(ctx, airlineKey, cx, cy, scale, bankAngle) {
  const al = AIRLINES[airlineKey] || AIRLINES.southwest;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(bankAngle || 0);
  ctx.scale(scale, scale);
  _drawPlaneBody(ctx, al);
  ctx.restore();
}

function _drawPlaneBody(ctx, al) {
  // ── COORDINATE SYSTEM (origin = fuselage center)
  // x: -118 (tail) → +125 (nose tip)
  // y: -66 (top of tail fin) → +72 (bottom of near engine)

  // ── 1. FAR (upper) wing ─────────────────────────────
  const farWingGrad = ctx.createLinearGradient(0, -18, 0, -50);
  farWingGrad.addColorStop(0, al.wingTop);
  farWingGrad.addColorStop(1, al.wingBot);
  ctx.beginPath();
  ctx.moveTo(22, -14);          // root leading edge
  ctx.lineTo(-42, -14);         // root trailing edge
  ctx.lineTo(-70, -48);         // tip trailing (swept back, wider span)
  ctx.lineTo(-28, -44);         // tip leading
  ctx.closePath();
  ctx.fillStyle = farWingGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // Far horizontal stabilizer
  ctx.beginPath();
  ctx.moveTo(-90, -14);
  ctx.lineTo(-116, -14);
  ctx.lineTo(-120, -30);
  ctx.lineTo(-96, -27);
  ctx.closePath();
  ctx.fillStyle = al.wingBot;
  ctx.fill();

  // ── 2. FUSELAGE ──────────────────────────────────────
  const fuseGrad = ctx.createLinearGradient(0, -15, 0, 15);
  fuseGrad.addColorStop(0, al.fuselageTop);
  fuseGrad.addColorStop(0.3, '#ffffff');
  fuseGrad.addColorStop(0.55, al.fuselageMid);
  fuseGrad.addColorStop(1, al.fuselageBot);

  ctx.beginPath();
  ctx.moveTo(125, 0);
  ctx.bezierCurveTo(130, -9, 112, -15, 88, -15);
  ctx.lineTo(-96, -15);
  ctx.bezierCurveTo(-110, -15, -120, -8, -118, 0);
  ctx.bezierCurveTo(-120, 8, -110, 15, -96, 15);
  ctx.lineTo(88, 15);
  ctx.bezierCurveTo(112, 15, 130, 9, 125, 0);
  ctx.closePath();
  ctx.fillStyle = fuseGrad;
  ctx.fill();

  // Fuselage outline
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Top highlight sheen
  const sheenGrad = ctx.createLinearGradient(0, -15, 0, -2);
  sheenGrad.addColorStop(0, 'rgba(255,255,255,0.58)');
  sheenGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.moveTo(112, -15);
  ctx.lineTo(-96, -15);
  ctx.bezierCurveTo(-110, -15, -120, -8, -118, 0);
  ctx.bezierCurveTo(-120, 8, -110, 0, -96, -4);
  ctx.lineTo(112, -4);
  ctx.bezierCurveTo(126, -7, 128, -13, 112, -15);
  ctx.fillStyle = sheenGrad;
  ctx.fill();

  // ── 3. AIRLINE-SPECIFIC LIVERY ───────────────────────
  _drawLivery(ctx, al);

  // ── 4. NEAR (lower) wing ─────────────────────────────
  const nearWingGrad = ctx.createLinearGradient(0, 14, 0, 72);
  nearWingGrad.addColorStop(0, al.wingTop);
  nearWingGrad.addColorStop(1, al.wingBot);
  ctx.beginPath();
  ctx.moveTo(24, 14);           // root leading edge
  ctx.lineTo(-46, 14);          // root trailing edge
  ctx.lineTo(-78, 70);          // tip trailing (swept back, wider)
  ctx.lineTo(-22, 66);          // tip leading
  ctx.closePath();
  ctx.fillStyle = nearWingGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Winglet on near wing tip (airline color accent)
  ctx.beginPath();
  ctx.moveTo(-22, 66);
  ctx.lineTo(-78, 70);
  ctx.lineTo(-84, 60);
  ctx.lineTo(-26, 58);
  ctx.closePath();
  ctx.fillStyle = al.tailColor;
  ctx.fill();

  // Near horizontal stabilizer
  ctx.beginPath();
  ctx.moveTo(-90, 14);
  ctx.lineTo(-116, 14);
  ctx.lineTo(-122, 34);
  ctx.lineTo(-98, 31);
  ctx.closePath();
  ctx.fillStyle = al.wingTop;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // ── 5. TAIL FIN (vertical stabilizer) ────────────────
  const tailGrad = ctx.createLinearGradient(-112, -15, -84, -64);
  tailGrad.addColorStop(0, al.tailColor);
  tailGrad.addColorStop(1, _lighten(al.tailColor, 36));
  ctx.beginPath();
  ctx.moveTo(-86, -15);          // base front
  ctx.lineTo(-116, -15);         // base rear
  ctx.lineTo(-114, -66);         // tip top-rear (taller fin)
  ctx.lineTo(-80, -26);          // tip top-front
  ctx.closePath();
  ctx.fillStyle = tailGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Tail fin logo decoration
  _drawTailLogo(ctx, al);

  // ── 6. ENGINES (larger nacelles) ─────────────────────
  _drawEngine(ctx, al, -14, 50, 1.0);    // near engine
  _drawEngine(ctx, al, -10, -32, 0.80);  // far engine (smaller = depth)

  // ── 7. WINDOWS ───────────────────────────────────────
  for (let i = 0; i < 12; i++) {
    const wx = 76 - i * 14;
    if (wx < -80) break;
    const wgrad = ctx.createRadialGradient(wx, -8, 0, wx, -8, 5.5);
    wgrad.addColorStop(0, '#d8eeff');
    wgrad.addColorStop(0.5, '#a8d4f8');
    wgrad.addColorStop(1, '#6099cc');
    ctx.beginPath();
    ctx.ellipse(wx, -8, 5, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = wgrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,90,130,0.5)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // Cockpit windows (front, larger)
  ctx.beginPath();
  ctx.ellipse(96, -6, 8, 7, -0.25, 0, Math.PI * 2);
  ctx.fillStyle = '#8ec8f8';
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,90,130,0.4)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Second cockpit pane
  ctx.beginPath();
  ctx.ellipse(108, -4, 6, 5.5, -0.2, 0, Math.PI * 2);
  ctx.fillStyle = '#a8d8f8';
  ctx.fill();
}

function _drawEngine(ctx, al, cx, cy, scale) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  const ew = 40, eh = 13;

  // Pylon
  ctx.beginPath();
  ctx.moveTo(-4, -eh);
  ctx.lineTo(4, -eh);
  ctx.lineTo(2, -eh - 13);
  ctx.lineTo(-2, -eh - 13);
  ctx.closePath();
  ctx.fillStyle = '#aaa';
  ctx.fill();

  // Nacelle body gradient
  const ngGrad = ctx.createLinearGradient(0, -eh, 0, eh);
  ngGrad.addColorStop(0, '#e0e0e0');
  ngGrad.addColorStop(0.3, '#c8c8c8');
  ngGrad.addColorStop(0.7, '#a0a0a0');
  ngGrad.addColorStop(1, '#707070');

  ctx.beginPath();
  ctx.ellipse(0, 0, ew, eh, 0, 0, Math.PI * 2);
  ctx.fillStyle = ngGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Intake front face
  const intakeGrad = ctx.createRadialGradient(ew * 0.72, 0, 1, ew * 0.72, 0, eh * 0.78);
  intakeGrad.addColorStop(0, '#222');
  intakeGrad.addColorStop(0.6, '#444');
  intakeGrad.addColorStop(1, '#888');
  ctx.beginPath();
  ctx.ellipse(ew * 0.72, 0, eh * 0.78, eh * 0.78, 0, 0, Math.PI * 2);
  ctx.fillStyle = intakeGrad;
  ctx.fill();

  // Fan blades (8 blades)
  ctx.strokeStyle = 'rgba(80,80,80,0.6)';
  ctx.lineWidth = 0.8;
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(ew * 0.72, 0);
    ctx.lineTo(ew * 0.72 + Math.cos(ang) * eh * 0.72, Math.sin(ang) * eh * 0.72);
    ctx.stroke();
  }

  // Exhaust nozzle (back)
  ctx.beginPath();
  ctx.moveTo(-ew, -eh * 0.6);
  ctx.lineTo(-ew - 10, -eh * 0.4);
  ctx.lineTo(-ew - 10, eh * 0.4);
  ctx.lineTo(-ew, eh * 0.6);
  ctx.fillStyle = '#888';
  ctx.fill();

  ctx.restore();
}

// ── Livery drawing (per airline) ──────────────────────────────────────────

function _drawLivery(ctx, al) {
  ctx.save();
  // Clip to fuselage shape (must match _drawPlaneBody fuselage path)
  ctx.beginPath();
  ctx.moveTo(125, 0);
  ctx.bezierCurveTo(130, -9, 112, -15, 88, -15);
  ctx.lineTo(-96, -15);
  ctx.bezierCurveTo(-110, -15, -120, -8, -118, 0);
  ctx.bezierCurveTo(-120, 8, -110, 15, -96, 15);
  ctx.lineTo(88, 15);
  ctx.bezierCurveTo(112, 15, 130, 9, 125, 0);
  ctx.closePath();
  ctx.clip();

  switch (al.key) {
    case 'southwest':  _liverySouthwest(ctx, al);  break;
    case 'alaska':     _liveryAlaska(ctx, al);     break;
    case 'delta':      _liveryDelta(ctx, al);      break;
    case 'united':     _liveryUnited(ctx, al);     break;
    case 'american':   _liveryAmerican(ctx, al);   break;
    case 'jetblue':    _liveryJetBlue(ctx, al);    break;
    case 'hawaiian':   _liveryHawaiian(ctx, al);   break;
  }
  ctx.restore();
}

function _liverySouthwest(ctx, al) {
  // Three bold swooping stripes: blue → yellow → red
  const stripes = [
    { color: '#F9423A', y1: 5,   y2: 15 },
    { color: '#FFBF27', y1: -2,  y2: 5  },
    { color: '#304CB2', y1: -10, y2: -2 }
  ];
  stripes.forEach(s => {
    ctx.beginPath();
    ctx.moveTo(-120, s.y1);
    ctx.bezierCurveTo(-55, s.y1 + 2, 45, s.y2 - 2, 125, s.y1);
    ctx.lineTo(125, s.y2);
    ctx.bezierCurveTo(45, s.y2 + 1, -55, s.y1 + 3, -120, s.y2);
    ctx.closePath();
    ctx.fillStyle = s.color;
    ctx.fill();
  });
  ctx.fillStyle = '#304CB2';
  ctx.font = 'bold 13px Arial';
  ctx.fillText('SOUTHWEST', -44, -4);
}

function _liveryAlaska(ctx, al) {
  ctx.fillStyle = '#01426A';
  ctx.fillRect(-120, 4, 246, 12);
  ctx.fillStyle = '#C8A951';
  ctx.fillRect(-120, 1, 246, 4);
  ctx.fillStyle = '#01426A';
  ctx.font = 'italic bold 13px Georgia';
  ctx.fillText('Alaska', -32, -2);
}

function _liveryDelta(ctx, al) {
  ctx.fillStyle = '#CC0000';
  ctx.fillRect(-120, -13, 246, 6);
  ctx.fillStyle = '#003366';
  ctx.font = 'bold 14px Arial';
  ctx.fillText('delta', -22, 5);
}

function _liveryUnited(ctx, al) {
  const stripeGrad = ctx.createLinearGradient(-120, 0, 125, 0);
  stripeGrad.addColorStop(0, '#5C88DA');
  stripeGrad.addColorStop(0.6, '#002244');
  stripeGrad.addColorStop(1, '#5C88DA');
  ctx.fillStyle = stripeGrad;
  ctx.fillRect(-120, -14, 246, 7);
  ctx.fillStyle = '#002244';
  ctx.font = 'bold 13px Arial Narrow';
  ctx.fillText('UNITED', -28, 6);
}

function _liveryAmerican(ctx, al) {
  ctx.fillStyle = '#C8102E';
  ctx.fillRect(-120, -13, 246, 6);
  ctx.fillStyle = '#0078D2';
  ctx.fillRect(-120, -5, 246, 5);
  ctx.fillStyle = '#002244';
  ctx.font = 'bold 12px Arial';
  ctx.fillText('AMERICAN', -40, 8);
}

function _liveryJetBlue(ctx, al) {
  for (let i = 0; i < 6; i++) {
    const yBase = -13 + i * 5;
    ctx.beginPath();
    ctx.moveTo(-120, yBase);
    ctx.bezierCurveTo(-65, yBase - 3, 22, yBase + 3, 125, yBase);
    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgba(0,56,118,${0.15 + i * 0.1})`;
    ctx.stroke();
  }
  ctx.fillStyle = '#003876';
  ctx.font = 'bold 13px Arial';
  ctx.fillText('jetBlue', -26, 7);
}

function _liveryHawaiian(ctx, al) {
  ctx.fillStyle = '#4B1869';
  ctx.fillRect(-120, -14, 246, 12);
  ctx.fillStyle = '#F5A800';
  ctx.fillRect(-120, -2, 246, 3);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px Georgia';
  ctx.fillText('HAWAIIAN', -38, -5);
}

function _drawTailLogo(ctx, al) {
  // Draw a small distinctive logo on the tail fin (repositioned for taller fin)
  const tx = -100, ty = -44, ts = 16;
  ctx.save();
  ctx.translate(tx, ty);

  switch (al.key) {
    case 'southwest': {
      // Heart shape
      ctx.beginPath();
      ctx.moveTo(0, ts * 0.35);
      ctx.bezierCurveTo(-ts * 0.5, -ts * 0.1, -ts, ts * 0.15, 0, ts * 0.9);
      ctx.bezierCurveTo(ts, ts * 0.15, ts * 0.5, -ts * 0.1, 0, ts * 0.35);
      ctx.fillStyle = '#F9423A';
      ctx.fill();
      break;
    }
    case 'alaska': {
      // Simplified Eskimo face circle
      ctx.beginPath();
      ctx.arc(0, 0, ts * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      // Eyes
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(-ts * 0.22, -ts * 0.1, ts * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc( ts * 0.22, -ts * 0.1, ts * 0.12, 0, Math.PI * 2); ctx.fill();
      // Smile
      ctx.beginPath();
      ctx.arc(0, ts * 0.08, ts * 0.3, 0.2, Math.PI - 0.2);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    }
    case 'delta': {
      // Delta triangle widget
      ctx.beginPath();
      ctx.moveTo(0, -ts * 0.8);
      ctx.lineTo(ts * 0.75, ts * 0.5);
      ctx.lineTo(-ts * 0.75, ts * 0.5);
      ctx.closePath();
      ctx.fillStyle = '#CC0000';
      ctx.fill();
      break;
    }
    case 'united': {
      // U globe circle
      ctx.beginPath();
      ctx.arc(0, 0, ts * 0.65, 0, Math.PI * 2);
      ctx.strokeStyle = '#5C88DA';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -ts * 0.65);
      ctx.lineTo(0, ts * 0.65);
      ctx.stroke();
      break;
    }
    case 'american': {
      // Eagle silhouette (simple triangle wings)
      ctx.beginPath();
      ctx.moveTo(0, -ts * 0.3);
      ctx.lineTo(-ts * 0.9, 0);
      ctx.lineTo(-ts * 0.3, ts * 0.25);
      ctx.lineTo(0, ts * 0.1);
      ctx.lineTo(ts * 0.3, ts * 0.25);
      ctx.lineTo(ts * 0.9, 0);
      ctx.closePath();
      ctx.fillStyle = '#C8102E';
      ctx.fill();
      break;
    }
    case 'jetblue': {
      // Blue circle
      ctx.beginPath();
      ctx.arc(0, 0, ts * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = '#5C88DA';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${ts * 0.7}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('jb', 0, 0);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      break;
    }
    case 'hawaiian': {
      // Simple Pualani dancer silhouette (stylized figure)
      ctx.fillStyle = '#F5A800';
      ctx.beginPath();
      ctx.arc(0, -ts * 0.45, ts * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -ts * 0.22);
      ctx.bezierCurveTo(-ts * 0.4, 0, -ts * 0.35, ts * 0.5, ts * 0.05, ts * 0.7);
      ctx.bezierCurveTo(ts * 0.4, ts * 0.5, ts * 0.3, 0, 0, -ts * 0.22);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

// ── Mini plane for HUD lives indicator ────────────────────────────────────

function drawMiniPlane(ctx, airlineKey, cx, cy, size) {
  const al = AIRLINES[airlineKey] || AIRLINES.southwest;
  ctx.save();
  ctx.translate(cx, cy);
  const s = size / 220;
  ctx.scale(s, s);

  // Simplified fuselage
  ctx.beginPath();
  ctx.moveTo(110, 0);
  ctx.bezierCurveTo(115, -8, 100, -14, 80, -14);
  ctx.lineTo(-88, -14);
  ctx.bezierCurveTo(-100, -14, -108, -7, -106, 0);
  ctx.bezierCurveTo(-108, 7, -100, 14, -88, 14);
  ctx.lineTo(80, 14);
  ctx.bezierCurveTo(100, 14, 115, 8, 110, 0);
  ctx.closePath();
  ctx.fillStyle = al.fuselageMid;
  ctx.fill();

  // Wing
  ctx.beginPath();
  ctx.moveTo(20, 12); ctx.lineTo(-38, 12); ctx.lineTo(-58, 54); ctx.lineTo(-16, 52);
  ctx.closePath();
  ctx.fillStyle = al.wingTop;
  ctx.fill();

  // Tail fin
  ctx.beginPath();
  ctx.moveTo(-80, -14); ctx.lineTo(-106, -14); ctx.lineTo(-104, -44); ctx.lineTo(-74, -22);
  ctx.closePath();
  ctx.fillStyle = al.tailColor;
  ctx.fill();

  ctx.restore();
}

// ── Plane select card ─────────────────────────────────────────────────────

function drawAirlineCard(ctx, airlineKey, x, y, w, h, selected, hovered) {
  const al = AIRLINES[airlineKey];

  // Card background with gradient
  const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
  bgGrad.addColorStop(0, al.cardBg[0]);
  bgGrad.addColorStop(1, al.cardBg[1]);
  roundRectPath(ctx, x, y, w, h, 16);
  ctx.fillStyle = bgGrad;
  ctx.fill();

  if (selected || hovered) {
    ctx.strokeStyle = selected ? '#FFD700' : 'rgba(255,255,255,0.6)';
    ctx.lineWidth = selected ? 4 : 2;
    ctx.stroke();
  }

  // Card glow on selected
  if (selected) {
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 20;
    roundRectPath(ctx, x, y, w, h, 16);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Draw mini plane
  drawPlane(ctx, airlineKey, x + w * 0.5, y + h * 0.42, 0.62, 0);

  // Airline name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(al.name, x + w * 0.5, y + h * 0.82);

  // Tagline
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '11px Arial';
  ctx.fillText(al.tagline, x + w * 0.5, y + h * 0.92);

  ctx.textAlign = 'left';
}

// ── Color utility ──────────────────────────────────────────────────────────

function _lighten(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + amount);
  const g = Math.min(255, ((num >> 8)  & 0xff) + amount);
  const b = Math.min(255, ( num        & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}
