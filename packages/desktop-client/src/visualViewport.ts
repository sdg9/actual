// Modals size and position themselves against the *visual* viewport so they
// stay above the on-screen keyboard. Android Chrome overlays the keyboard on
// the layout viewport by default, so CSS viewport units can't express this.
export function installVisualViewportVariables() {
  if (typeof window === 'undefined') {
    return;
  }
  const root = document.documentElement;
  const viewport = window.visualViewport;

  let frame = 0;
  const update = () => {
    frame = 0;
    const height = viewport ? viewport.height : window.innerHeight;
    const offsetTop = viewport ? viewport.offsetTop : 0;
    root.style.setProperty('--visual-viewport-height', `${height}px`);
    root.style.setProperty('--visual-viewport-offset-top', `${offsetTop}px`);
  };
  const schedule = () => {
    if (!frame) {
      frame = requestAnimationFrame(update);
    }
  };

  update();
  if (viewport) {
    viewport.addEventListener('resize', schedule);
    viewport.addEventListener('scroll', schedule);
  } else {
    window.addEventListener('resize', schedule);
  }
}
