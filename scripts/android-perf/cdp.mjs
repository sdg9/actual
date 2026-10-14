// Minimal Chrome DevTools Protocol client with flattened sessions (Node 22+).
export async function cdp(
  url = process.env.CDP_WS || 'ws://localhost:9333/devtools/browser',
) {
  const ws = new WebSocket(url);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  let id = 0;
  const pending = new Map();
  const handlers = [];
  ws.addEventListener('message', event => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const [resolve, reject] = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) {
        reject(new Error(JSON.stringify(data.error)));
      } else {
        resolve(data.result);
      }
    } else {
      handlers.forEach(handler => handler(data));
    }
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const i = ++id;
      pending.set(i, [resolve, reject]);
      ws.send(JSON.stringify({ id: i, method, params, sessionId }));
    });
  return { ws, send, on: handler => handlers.push(handler) };
}
