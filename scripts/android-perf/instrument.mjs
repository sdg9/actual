// In-page instrumentation: click time, long tasks, resources fetched after click, ready time.
export const INSTALL = () => {
  if (window.__ap) return;
  const ap = (window.__ap = { click: 0, ready: 0, longTasks: [], res: [] });
  window.addEventListener(
    'pointerdown',
    () => {
      ap.click = performance.now();
      ap.longTasks = [];
      ap.ready = 0;
    },
    true,
  );
  new PerformanceObserver(l => {
    for (const e of l.getEntries()) {
      ap.longTasks.push([Math.round(e.startTime), Math.round(e.duration)]);
    }
  }).observe({ type: 'longtask', buffered: false });
};
export const READY_TXNS = () => {
  const ap = window.__ap;
  const tick = () => {
    const list = document.querySelector('[aria-label="Transaction list"]');
    const loading = document.querySelector(
      '[aria-label="Loading transactions..."]',
    );
    const q = window.__TANSTACK_QUERY_CLIENT__
      ?.getQueryCache()
      .find({ queryKey: ['payees', 'lists'], exact: true });
    if (
      list &&
      !loading &&
      list.querySelector('[role=option]') &&
      (!q || q.state.status === 'success')
    ) {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          ap.ready = performance.now();
        }),
      );
      return;
    }
    requestAnimationFrame(tick);
  };
  tick();
};
export const RESULT = () => {
  const ap = window.__ap;
  const res = performance
    .getEntriesByType('resource')
    .filter(r => r.startTime >= ap.click - 1)
    .map(r => [
      r.name.split('/').pop().slice(0, 40),
      Math.round(r.startTime - ap.click),
      Math.round(r.duration),
      r.transferSize,
    ]);
  return {
    tapToReady: Math.round(ap.ready - ap.click),
    longTasks: ap.longTasks
      .filter(t => t[0] >= ap.click - 5)
      .map(t => [t[0] - Math.round(ap.click), t[1]]),
    res,
  };
};
