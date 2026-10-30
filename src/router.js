/** Router mínimo basado en hash (compatible con cualquier hosting estático). */
const routes = [];
let notFound = null;
let beforeEach = null;

export function route(pattern, handler, meta = {}) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '/?$');
  routes.push({ re, keys, handler, meta, pattern });
}
export const setNotFound = (h) => (notFound = h);
export const setBeforeEach = (fn) => (beforeEach = fn);

export function navigate(path) {
  if (location.hash === '#' + path) resolve();
  else location.hash = path;
}

export const currentPath = () => (location.hash.slice(1) || '/').split('?')[0];

export async function resolve() {
  const path = currentPath();
  for (const r of routes) {
    const m = path.match(r.re);
    if (m) {
      const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      if (beforeEach && (await beforeEach(r, params)) === false) return;
      return r.handler(params, r);
    }
  }
  notFound?.();
}

export function startRouter() {
  window.addEventListener('hashchange', resolve);
  resolve();
}
