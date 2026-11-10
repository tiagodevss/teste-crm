import { http, HttpResponse } from 'msw';
import { setupWorker } from 'msw/browser';
import { DEMO_API_PATH, DEMO_BASE_PATH } from '../config/demo';
import { DemoError } from './types';
import { ACCESS_TOKEN } from './model';
import { createRepository } from './storage';
export type DemoRepository = ReturnType<typeof createRepository>;

export async function startDemoWorker(repository: DemoRepository) {
  const prefix = `${location.origin}${DEMO_API_PATH}`;
  const worker = setupWorker(http.all(`${prefix}/*`, async ({ request }) => {
    const url = new URL(request.url); const path = url.pathname.slice(DEMO_API_PATH.length);
    const publicPath = ['/auth/login', '/auth/refresh', '/auth/logout', '/settings/public'].includes(path);
    if (!publicPath && request.headers.get('authorization') !== `Bearer ${ACCESS_TOKEN}`) return HttpResponse.json({ message: 'Entre na demonstra\u00e7\u00e3o para continuar.' }, { status: 401 });
    try {
      const body = ['GET','HEAD'].includes(request.method) ? {} : await request.json().catch(() => ({}));
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new DemoError(400, 'Conte\u00fado da solicita\u00e7\u00e3o inv\u00e1lido.');
      const result = repository.request(request.method, path, url.searchParams, body);
      if (result.changed) window.dispatchEvent(new CustomEvent('demo:changed'));
      return HttpResponse.json(result.body, { status: result.status });
    } catch (error) {
      const status = error instanceof DemoError ? error.status : 500;
      const message = error instanceof DemoError ? error.message : 'Falha no cen\u00e1rio local. Recarregue a p\u00e1gina; nenhum servi\u00e7o externo foi chamado.';
      if (status === 501 || status === 500) console.error('[demo]', request.method, path, error);
      return HttpResponse.json({ message }, { status });
    }
  }));
  await worker.start({
    quiet: true,
    serviceWorker: { url: `${DEMO_BASE_PATH}mockServiceWorker.js`, options: { scope: DEMO_BASE_PATH } },
    onUnhandledRequest(request, print) {
      const url = new URL(request.url);
      if (url.origin !== location.origin || url.pathname.startsWith(DEMO_API_PATH) || /^\/v\d+(\/|$)/.test(url.pathname)) print.error();
      // Local application resources only. HTTP API calls use the reserved prefix.
    },
  });
  return worker;
}
