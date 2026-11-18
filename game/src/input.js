// Keyboard and mouse state. The game reads this, never the DOM events directly,
// so the screenshot autopilot can drive the same fields.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.pressed = new Set(); // keys pressed since the last consume
    this.canvas = canvas;
    this.onFirstGesture = null; // set by main.js: unlock audio on first input
    // Touch: drag to move, auto-fire while touching. The canvas already has
    // touch-action: none, so the drag never scrolls the page.
    this.touchActive = false;
    this.touchX = 0;
    this.touchY = 0;
    const toCanvas = (touch) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((touch.clientX - rect.left) / rect.width) * canvas.width,
        y: ((touch.clientY - rect.top) / rect.height) * canvas.height,
      };
    };
    canvas.addEventListener('touchstart', (event) => {
      event.preventDefault();
      const p = toCanvas(event.changedTouches[0]);
      this.touchActive = true;
      this.touchX = p.x;
      this.touchY = p.y;
      this.mouseX = p.x;
      this.mouseY = p.y;
      this.mouseDown = true; // also starts the game from the title screen
      if (this.onFirstGesture) this.onFirstGesture();
    }, { passive: false });
    canvas.addEventListener('touchmove', (event) => {
      event.preventDefault();
      const p = toCanvas(event.changedTouches[0]);
      this.touchX = p.x;
      this.touchY = p.y;
      this.mouseX = p.x;
      this.mouseY = p.y;
    }, { passive: false });
    const endTouch = (event) => {
      event.preventDefault();
      if (event.touches.length === 0) {
        this.touchActive = false;
        this.mouseDown = false;
      }
    };
    canvas.addEventListener('touchend', endTouch, { passive: false });
    canvas.addEventListener('touchcancel', endTouch, { passive: false });

    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        event.preventDefault();
      }
      if (!event.repeat) this.pressed.add(event.key.toLowerCase());
      this.keys.add(event.key.toLowerCase());
      if (this.onFirstGesture) this.onFirstGesture();
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.key.toLowerCase());
    });
    canvas.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width;
      this.mouseY = ((event.clientY - rect.top) / rect.height) * canvas.height;
    });
    canvas.addEventListener('mousedown', (event) => {
      if (event.button === 0) this.mouseDown = true;
      if (this.onFirstGesture) this.onFirstGesture();
    });
    window.addEventListener('mouseup', (event) => {
      if (event.button === 0) this.mouseDown = false;
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  down(...names) {
    return names.some((name) => this.keys.has(name));
  }

  // True once per physical press; callers consume it so a held key fires once.
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
