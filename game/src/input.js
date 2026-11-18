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
