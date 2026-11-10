/** Paths are shared by the app, MSW and deployment tests. No production URLs. */
export function normalizeDemoBase(base: string): string {
  if (!base.startsWith('/') || base.startsWith('//') || /[?#\\]/.test(base) || base.split('/').some(p => p === '..' || p === '.')) {
    throw new Error('Use an absolute local base path, for example /teste-crm/.');
  }
  return base.endsWith('/') ? base : `${base}/`;
}
export function demoRoute(base: string, route: string): string {
  if (!route.startsWith('/') || route.startsWith('//') || /[\\#]/.test(route)) throw new Error('Invalid internal demo route.');
  return `${normalizeDemoBase(base)}#${route}`;
}
export function isWithinDemo(url: URL, origin: string, base: string): boolean {
  return (url.protocol === 'http:' || url.protocol === 'https:') && url.origin === origin && url.pathname.startsWith(normalizeDemoBase(base));
}
