// The game is always laid out in landscape. If the phone is held in portrait
// (for example with rotation lock on), the whole #app is rotated 90° with CSS,
// so turning the phone sideways shows it the right way up.
// Everything that deals in pixels asks this module for the app-space size and
// converts pointer coordinates through toApp().
export const view = { w: 0, h: 0, rot: false };

export function updateView() {
  const W = window.innerWidth, H = window.innerHeight;
  view.rot = H > W;
  view.w = view.rot ? H : W;
  view.h = view.rot ? W : H;
  const app = document.getElementById('app');
  if (app) {
    app.classList.toggle('rot', view.rot);
    app.style.width = view.w + 'px';
    app.style.height = view.h + 'px';
    app.style.transform = view.rot ? `translateX(${W}px) rotate(90deg)` : '';
  }
  return view;
}

// screen (client) coordinates -> app coordinates
export function toApp(cx, cy) {
  if (!view.rot) return { x: cx, y: cy };
  return { x: cy, y: window.innerWidth - cx };
}
// screen-space delta -> app-space delta
export function deltaToApp(dx, dy) {
  return view.rot ? { x: dy, y: -dx } : { x: dx, y: dy };
}
