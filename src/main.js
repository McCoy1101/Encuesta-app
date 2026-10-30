import './style.css';
import { route, setNotFound, setBeforeEach, startRouter, navigate, currentPath } from './router.js';
import { getSession, signOut, onAuthChange, isDemo } from './lib/db.js';
import { destroyCharts } from './lib/charts.js';
import { $, toast } from './lib/ui.js';
import { homeView, testView, studentResultView } from './views/student.js';
import { loginView, dashboardView, resultsView, detailView, groupReportView, compareView, groupsView } from './views/admin.js';

const app = $('#app');
const header = $('#topbar');
let session = null;

const ADMIN_LINKS = [
  ['/admin', '📊 Panel'],
  ['/admin/resultados', '📝 Resultados'],
  ['/admin/reporte-grupo', '🏫 Reporte por grupo'],
  ['/admin/comparativo', '📈 Comparativo'],
  ['/admin/grupos', '⚙️ Grupos'],
];

function renderHeader() {
  const path = currentPath();
  const inAdmin = path.startsWith('/admin');
  header.innerHTML = `
    <div class="container">
      <a class="brand" href="#${inAdmin && session ? '/admin' : '/'}" id="brand-link">
        <span class="brand-logo">🎓</span><span>Habilidades<span class="grad-text">+</span></span>
        ${isDemo ? '<span class="badge demo">DEMO</span>' : ''}
      </a>
      <button class="btn ghost icon-btn menu-btn" id="menu-btn" aria-label="Menú">☰</button>
      <nav class="nav" id="nav">
        ${
          inAdmin && session
            ? ADMIN_LINKS.map(([href, label]) => `<a href="#${href}" class="${path === href || (href !== '/admin' && path.startsWith(href)) ? 'active' : ''}">${label}</a>`).join('') +
              `<a href="#/" title="Vista del alumno">👁️ Vista alumno</a><a href="#" id="logout-link">Salir</a>`
            : `<a href="#/" class="${!inAdmin ? 'active' : ''}">Tests</a><a href="#/admin" id="teacher-link" class="${inAdmin ? 'active' : ''}">🔐 Docentes</a>`
        }
      </nav>
    </div>`;
  $('#menu-btn').addEventListener('click', () => $('#nav').classList.toggle('open'));
  $('#logout-link')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await signOut();
    navigate('/');
  });
}

// ---------------- rutas ----------------
route('/', () => homeView(app));
route('/g/:groupId', ({ groupId }) => homeView(app, { groupId }));
route('/test/:code', ({ code }) => testView(app, { code }));
route('/resultado', () => studentResultView(app));
route('/login', () => loginView(app));
route('/admin', () => dashboardView(app), { auth: true });
route('/admin/resultados', () => resultsView(app), { auth: true });
route('/admin/resultado/:id', (p) => detailView(app, p), { auth: true });
route('/admin/reporte-grupo', () => groupReportView(app), { auth: true });
route('/admin/comparativo', () => compareView(app), { auth: true });
route('/admin/grupos', () => groupsView(app), { auth: true });
setNotFound(() => navigate('/'));

setBeforeEach(async (r) => {
  destroyCharts();
  window.scrollTo(0, 0);
  if (r.meta.auth && !session) {
    renderHeader();
    loginView(app);
    return false;
  }
  if (r.pattern === '/login' && session) {
    navigate('/admin');
    return false;
  }
  renderHeader();
});

window.addEventListener('unhandledrejection', (e) => {
  console.error(e.reason);
  toast('Ocurrió un error: ' + (e.reason?.message || 'desconocido'), 'error');
});

(async () => {
  session = await getSession();
  onAuthChange((s) => {
    session = s;
    renderHeader();
  });
  startRouter();
})();
