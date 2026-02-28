/* audio.js ─ All sounds generated via Web Audio API. No external files needed. */

const Audio = (function () {
  let actx = null;
  let enabled = true;
  let engineOsc = null;
  let engineGain = null;
  let bgLoop = null;
  let bgGain = null;
  let bgScheduled = false;

  function getCtx() {
    if (!actx) {
      actx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }

  // ── Individual sounds ──────────────────────────────────────────────────────

  function playStarCollect() {
    const c = getCtx();
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = c.createOscillator();
      const g   = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = c.currentTime + i * 0.09;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.28, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(g); g.connect(c.destination);
      osc.start(t); osc.stop(t + 0.25);
    });
  }

  function playCheckpoint() {
    const c = getCtx();
    [880, 1100, 1320].forEach((freq, i) => {
      const osc = c.createOscillator();
      const g   = c.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t = c.currentTime + i * 0.13;
      g.gain.setValueAtTime(0.35, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(g); g.connect(c.destination);
      osc.start(t); osc.stop(t + 0.5);
    });
  }

  function playCheer() {
    const c = getCtx();
    const major = [261, 329, 392, 523, 659, 784];
    major.forEach((freq, i) => {
      const osc = c.createOscillator();
      const g   = c.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t = c.currentTime + i * 0.07;
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(g); g.connect(c.destination);
      osc.start(t); osc.stop(t + 0.55);
    });
  }

  function playCrash() {
    const c = getCtx();
    // Descending wail
    const osc = c.createOscillator();
    const g   = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(700, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.65);
    g.gain.setValueAtTime(0.38, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.8);
    osc.connect(g); g.connect(c.destination);
    osc.start(); osc.stop(c.currentTime + 0.85);

    // Thud
    const bufLen = Math.floor(c.sampleRate * 0.18);
    const buf = c.createBuffer(1, bufLen, c.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.06));
    }
    const src = c.createBufferSource();
    const ng  = c.createGain();
    const flt = c.createBiquadFilter();
    src.buffer = buf;
    flt.type = 'lowpass'; flt.frequency.value = 220;
    ng.gain.value = 0.55;
    src.connect(flt); flt.connect(ng); ng.connect(c.destination);
    src.start(c.currentTime + 0.06);
  }

  function playThunder() {
    const c = getCtx();
    const bufLen = Math.floor(c.sampleRate * 1.6);
    const buf = c.createBuffer(1, bufLen, c.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    const flt = c.createBiquadFilter();
    const g   = c.createGain();
    src.buffer = buf;
    flt.type = 'lowpass'; flt.frequency.value = 130;
    g.gain.setValueAtTime(0.55, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.6);
    src.connect(flt); flt.connect(g); g.connect(c.destination);
    src.start();
  }

  function playWind() {
    const c = getCtx();
    const bufLen = Math.floor(c.sampleRate * 0.9);
    const buf = c.createBuffer(1, bufLen, c.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    const flt = c.createBiquadFilter();
    const g   = c.createGain();
    src.buffer = buf;
    flt.type = 'bandpass';
    flt.frequency.setValueAtTime(350, c.currentTime);
    flt.frequency.linearRampToValueAtTime(1100, c.currentTime + 0.45);
    flt.frequency.linearRampToValueAtTime(280, c.currentTime + 0.9);
    g.gain.setValueAtTime(0.12, c.currentTime);
    g.gain.linearRampToValueAtTime(0.28, c.currentTime + 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.9);
    src.connect(flt); flt.connect(g); g.connect(c.destination);
    src.start();
  }

  function playWhoosh() {
    const c = getCtx();
    const bufLen = Math.floor(c.sampleRate * 0.25);
    const buf = c.createBuffer(1, bufLen, c.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    const flt = c.createBiquadFilter();
    const g   = c.createGain();
    src.buffer = buf;
    flt.type = 'highpass'; flt.frequency.value = 1400;
    g.gain.setValueAtTime(0.22, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
    src.connect(flt); flt.connect(g); g.connect(c.destination);
    src.start();
  }

  // ── Engine hum (continuous) ────────────────────────────────────────────────

  function startEngine() {
    if (!enabled) return;
    const c = getCtx();
    if (engineOsc) { try { engineOsc.stop(); } catch(e){} }

    engineOsc  = c.createOscillator();
    engineGain = c.createGain();
    const flt  = c.createBiquadFilter();

    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 95;
    flt.type = 'lowpass'; flt.frequency.value = 380;
    engineGain.gain.setValueAtTime(0, c.currentTime);
    engineGain.gain.linearRampToValueAtTime(0.07, c.currentTime + 0.8);

    engineOsc.connect(flt); flt.connect(engineGain); engineGain.connect(c.destination);
    engineOsc.start();
  }

  function stopEngine() {
    if (!engineOsc) return;
    try {
      const c = getCtx();
      engineGain.gain.linearRampToValueAtTime(0, c.currentTime + 0.4);
      engineOsc.stop(c.currentTime + 0.45);
    } catch(e) {}
    engineOsc = null;
  }

  // ── Background music (generative pentatonic loop) ─────────────────────────

  const PENTA = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3, 784.0];

  function startBgMusic(theme) {
    if (!enabled || bgScheduled) return;
    bgScheduled = true;
    const c = getCtx();
    bgGain = c.createGain();
    bgGain.gain.value = 0.06;
    bgGain.connect(c.destination);
    scheduleBgNotes(c, c.currentTime);
  }

  function scheduleBgNotes(c, startTime) {
    const tempo  = 0.38; // seconds per beat
    const beats  = 16;
    const scale  = PENTA;
    for (let i = 0; i < beats; i++) {
      if (Math.random() > 0.45) {
        const freq  = scale[Math.floor(Math.random() * scale.length)];
        const t     = startTime + i * tempo;
        const dur   = tempo * (0.4 + Math.random() * 0.5);
        const osc   = c.createOscillator();
        const g     = c.createGain();
        osc.type = Math.random() > 0.5 ? 'sine' : 'triangle';
        osc.frequency.value = freq * (Math.random() > 0.8 ? 2 : 1);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.55, t + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(g);
        if (bgGain) g.connect(bgGain);
        osc.start(t); osc.stop(t + dur + 0.05);
      }
    }
    // Schedule next loop slightly before this one ends
    const loopDur = beats * tempo;
    if (enabled && bgScheduled) {
      bgLoop = setTimeout(() => scheduleBgNotes(c, startTime + loopDur), (loopDur - 0.5) * 1000);
    }
  }

  function stopBgMusic() {
    bgScheduled = false;
    clearTimeout(bgLoop);
    if (bgGain) {
      try { bgGain.gain.linearRampToValueAtTime(0, getCtx().currentTime + 0.5); } catch(e){}
      bgGain = null;
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  return {
    init() {
      // AudioContext requires user gesture – create on first interaction
      const unlock = () => {
        getCtx();
        document.removeEventListener('pointerdown', unlock);
        document.removeEventListener('keydown', unlock);
      };
      document.addEventListener('pointerdown', unlock);
      document.addEventListener('keydown', unlock);
    },

    setEnabled(val) {
      enabled = val;
      if (!val) { stopEngine(); stopBgMusic(); }
    },

    play(sound) {
      if (!enabled) return;
      try {
        switch (sound) {
          case 'star':       playStarCollect(); break;
          case 'checkpoint': playCheckpoint();  break;
          case 'cheer':      playCheer();       break;
          case 'crash':      playCrash();       break;
          case 'thunder':    playThunder();     break;
          case 'wind':       playWind();        break;
          case 'whoosh':     playWhoosh();      break;
        }
      } catch(e) {}
    },

    startEngine,
    stopEngine,
    startBgMusic,
    stopBgMusic
  };
})();
