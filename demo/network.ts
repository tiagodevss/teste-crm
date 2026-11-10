import { DEMO_API_PATH, DEMO_BASE_PATH } from '../config/demo';

const notify = () => window.dispatchEvent(new CustomEvent('demo:external-blocked'));
export function isAllowedRequest(input: string | URL, base: string, basePath = DEMO_BASE_PATH): boolean {
  const url = new URL(input, base); const origin = new URL(base).origin;
  if (url.protocol === 'blob:') return url.origin === origin;
  return ['http:', 'https:'].includes(url.protocol) && url.origin === origin && url.pathname.startsWith(basePath) && (url.pathname.startsWith(`${basePath}__demo_api__/v1/`) || /\.(?:js|mjs|ts|tsx|css|png|jpe?g|svg|ico|webp|woff2?)(?:$)/i.test(url.pathname) || url.pathname.startsWith('/@') || url.pathname.startsWith('/node_modules/') || url.pathname.startsWith('/__vite'));
}
export function installNetworkGuard() {
  const allowed = (input: string | URL) => isAllowedRequest(input, window.location.href);
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const target = input instanceof Request ? input.url : String(input);
    if (!allowed(target)) { notify(); return Promise.reject(new Error('Demo: requisi\u00e7\u00e3o externa ou n\u00e3o autorizada bloqueada.')); }
    return originalFetch(input, init);
  };
  const open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
    if (!allowed(url)) { notify(); throw new Error('Demo: destino HTTP bloqueado.'); }
    return (open as any).call(this, method, url, ...args);
  } as typeof open;
  installStreamingGuard();
  navigator.sendBeacon = () => { notify(); return false; };
  const originalOpen = window.open.bind(window);
  const localNavigation = (target: string) => { const url = new URL(target, location.href); return (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'blob:') && url.origin === location.origin && (url.protocol === 'blob:' || url.pathname.startsWith(DEMO_BASE_PATH)); };
  window.open = (url, ...rest) => { if (url && !localNavigation(String(url))) { notify(); return null; } return originalOpen(url, ...rest); };
  document.addEventListener('click', event => {
    const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (anchor && !localNavigation(anchor.href)) { event.preventDefault(); event.stopImmediatePropagation(); notify(); }
  }, true);
}

/** MSW installs a WebSocket interceptor on start; restore this barrier afterwards. */
export function installStreamingGuard() {
  window.WebSocket = class { constructor() { notify(); throw new Error('WebSocket desativado na demonstra\u00e7\u00e3o.'); } } as unknown as typeof WebSocket;
  window.EventSource = class { constructor() { notify(); throw new Error('Streaming externo desativado na demonstra\u00e7\u00e3o.'); } } as unknown as typeof EventSource;
}
