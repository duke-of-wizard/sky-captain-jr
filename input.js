/* input.js ─ Keyboard and on-screen button input handler */

const Input = (function () {
  const keys  = {};
  const touch = { up: false, down: false, left: false, right: false };
  let   pauseCb = null;

  function init(pauseCallback) {
    pauseCb = pauseCallback;
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);
    bindDpadButtons();
  }

  function onKeyDown(e) {
    keys[e.code] = true;
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (pauseCb) pauseCb();
    }
    // Prevent page scroll during gameplay
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
      e.preventDefault();
    }
  }

  function onKeyUp(e) {
    keys[e.code] = false;
  }

  function bindDpadButtons() {
    ['up', 'down', 'left', 'right'].forEach(dir => {
      const btn = document.getElementById('btn-' + dir);
      if (!btn) return;

      btn.addEventListener('pointerdown', e => {
        e.preventDefault();
        touch[dir] = true;
        btn.classList.add('pressed');
      });
      btn.addEventListener('pointerup', e => {
        e.preventDefault();
        touch[dir] = false;
        btn.classList.remove('pressed');
      });
      btn.addEventListener('pointerleave', e => {
        touch[dir] = false;
        btn.classList.remove('pressed');
      });
      btn.addEventListener('pointercancel', e => {
        touch[dir] = false;
        btn.classList.remove('pressed');
      });
    });
  }

  return {
    init,
    isUp()    { return !!(keys['ArrowUp']    || keys['KeyW'] || touch.up);    },
    isDown()  { return !!(keys['ArrowDown']  || keys['KeyS'] || touch.down);  },
    isLeft()  { return !!(keys['ArrowLeft']  || keys['KeyA'] || touch.left);  },
    isRight() { return !!(keys['ArrowRight'] || keys['KeyD'] || touch.right); },
    reset()   { Object.keys(touch).forEach(k => touch[k] = false); }
  };
})();
