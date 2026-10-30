/** Panel de docentes: login, dashboard, resultados, detalle, reportes, comparativo y grupos. */
import { TESTS, TEST_LIST, HABILIDADES, ASERTIVIDAD } from '../tests/definitions.js';
import { scoreTest, levelOrder, requiredKeys, AUTO_LEVELS, HAB_LEVELS, habLevelOf } from '../tests/scoring.js';
import * as db from '../lib/db.js';
import { esc, toast, confirmDialog, $, $$, fmtDateTime, fmtDate, groupLabel, downloadCSV, avg, round1, pct } from '../lib/ui.js';
import { chart, destroyCharts, barOpts, LEVEL9, PALETTE, SERIES } from '../lib/charts.js';
import { renderResult, toneOf, habTone } from './resultView.js';
import { navigate } from '../router.js';

/* ============================== helpers ============================== */
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

async function loadScored(filter) {
  const rows = await db.listResponses(filter);
  return rows.map((r) => ({ ...r, s: scoreTest(r.test_code, r.answers) }));
}

/** Para reportes: si un alumno contestó el mismo test varias veces, se toma el intento más reciente. */
function latestOnly(rows) {
  const seen = new Set();
  return rows.filter((r) => {
    const k = `${r.test_code}|${r.group_id}|${norm(r.student_name)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const METRIC = {
  habilidades: { label: 'Puntaje total promedio', max: 60, of: (s) => s.total },
  autoestima: { label: 'Puntos promedio', max: 40, of: (s) => s.points },
  asertividad: { label: 'Respuestas asertivas promedio', max: 9, of: (s) => s.high },
};

const levelColors = (code) =>
  code === 'habilidades' ? LEVEL9 : code === 'autoestima' ? [PALETTE.red, PALETTE.amber, PALETTE.green, PALETTE.sky] : [PALETTE.green, PALETTE.red];

const loading = (app) => (app.innerHTML = '<main class="container"><div class="spinner"></div></main>');

const empty = (msg, icon = '📭', action = '') => `<div class="empty"><div class="e-icon">${icon}</div><p>${msg}</p>${action}</div>`;

function testTabs(active, id = 'test-tabs') {
  return `<div class="tabs" id="${id}">${TEST_LIST.map((t) => `<button data-code="${t.code}" class="${t.code === active ? 'on' : ''}">${t.icon} ${t.title.replace('Test de ', '')}</button>`).join('')}</div>`;
}

function pageHead(title, subtitle, actions = '') {
  return `<div class="row spread" style="margin-bottom:1.5rem">
    <div><h1 style="font-size:2rem;margin:0">${title}</h1>${subtitle ? `<p class="muted" style="margin:.25rem 0 0">${subtitle}</p>` : ''}</div>
    <div class="row no-print">${actions}</div></div>`;
}

function printHeader(title) {
  return `<div class="print-only" style="margin-bottom:1rem"><h2>${esc(title)}</h2><div class="small">Generado el ${esc(fmtDate(new Date()))}</div></div>`;
}

/* =============================== LOGIN =============================== */
export function loginView(app) {
  app.innerHTML = `
  <main class="container" style="min-height:70vh;display:grid;place-items:center">
    <form class="card pad-lg glow" id="login-form" style="width:min(420px,100%)">
      <div class="center" style="margin-bottom:1.5rem">
        <div class="brand-logo" style="width:56px;height:56px;font-size:1.6rem;margin:0 auto 1rem;border-radius:16px">🔐</div>
        <h1 style="font-size:1.8rem;margin:0">Acceso docentes</h1>
        <p class="muted small">Consulta resultados y genera reportes</p>
      </div>
      ${db.isDemo ? `<div class="callout small" style="--c:var(--c-amber);margin-bottom:1rem">
        <b>Modo demo</b>:<br/>
        👑 Admin (ve todo): <code>admin@demo.mx</code> / <code>admin1234</code><br/>
        🧑‍🏫 Docente (solo sus grupos): <code>docente@demo.mx</code> / <code>demo1234</code>
      </div>` : ''}
      <div class="stack">
        <label class="field">Correo<input id="login-email" type="email" autocomplete="username" required value="${db.isDemo ? db.DEMO_USER.email : ''}"/></label>
        <label class="field">Contraseña<input id="login-password" type="password" autocomplete="current-password" required value="${db.isDemo ? db.DEMO_USER.password : ''}"/></label>
        <button class="btn primary block lg" id="login-btn">Entrar</button>
      </div>
    </form>
  </main>`;
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#login-btn');
    btn.disabled = true;
    btn.textContent = 'Verificando…';
    try {
      await db.signIn($('#login-email').value, $('#login-password').value);
      navigate('/admin');
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  });
}

/* ============================= DASHBOARD ============================= */
export async function dashboardView(app) {
  loading(app);
  const [all, groups] = await Promise.all([loadScored(), db.listGroups()]);
  const rows = latestOnly(all);
  const students = new Map();
  for (const r of rows) {
    const k = `${r.group_id}|${norm(r.student_name)}`;
    if (!students.has(k)) students.set(k, { name: r.student_name, grado: r.grado, grupo: r.grupo, risks: [] });
    if (r.s.risk) students.get(k).risks.push(r);
  }
  const alerts = [...students.values()].filter((x) => x.risks.length).sort((a, b) => b.risks.length - a.risks.length);

  destroyCharts();
  app.innerHTML = `
  <main class="container">
    ${pageHead('Panel general', 'Resumen de todas las aplicaciones', `<a href="#/admin/resultados" class="btn">Ver resultados</a><a href="#/admin/grupos" class="btn primary">+ Grupos</a>`)}
    ${
      db.isDemo
        ? `<div class="card" style="margin-bottom:1.25rem;border-color:hsla(38,95%,60%,.4)">
        <div class="row spread"><div><span class="badge demo">MODO DEMO</span>
        <p class="muted small" style="margin:.5rem 0 0">Los datos se guardan sólo en este navegador. Configura Supabase (ver README) para usarlo en producción.</p></div>
        <div class="row"><button class="btn sm" id="demo-sample">🎲 Generar datos de ejemplo</button><button class="btn sm danger" id="demo-reset">Borrar todo</button></div></div></div>`
        : ''
    }
    <div class="grid grid-4">
      <div class="card kpi"><span class="icon">📝</span><span class="value">${all.length}</span><span class="label">Tests aplicados</span></div>
      <div class="card kpi"><span class="icon">👥</span><span class="value">${students.size}</span><span class="label">Alumnos evaluados</span></div>
      <div class="card kpi"><span class="icon">🏫</span><span class="value">${groups.filter((g) => g.activo).length}</span><span class="label">Grupos activos</span></div>
      <div class="card kpi"><span class="icon">⚠️</span><span class="value" style="color:var(--c-red)">${alerts.length}</span><span class="label">Alumnos con alguna alerta</span></div>
    </div>

    <div class="grid grid-3" style="margin-top:1.25rem">
      ${TEST_LIST.map((t) => {
        const n = rows.filter((r) => r.test_code === t.code).length;
        return `<div class="card"><div class="card-title"><h3>${t.icon} ${t.title}</h3><span class="badge">${n}</span></div>
          ${n ? `<div class="chart-box sm"><canvas id="dash-${t.code}"></canvas></div>` : empty('Sin aplicaciones aún', t.icon)}</div>`;
      }).join('')}
    </div>

    <div class="grid grid-2" style="margin-top:1.25rem">
      <div class="card">
        <div class="card-title"><h3>⚠️ Alumnos que requieren atención</h3><a class="btn sm ghost" href="#/admin/resultados?alert=1">Ver todos</a></div>
        ${
          alerts.length
            ? `<div class="table-wrap"><table><thead><tr><th>Alumno</th><th>Grupo</th><th>Alertas</th></tr></thead><tbody>
          ${alerts
            .slice(0, 8)
            .map(
              (a) => `<tr><td>${esc(a.name)}</td><td>${esc(a.grado)} ${esc(a.grupo)}</td>
            <td>${a.risks.map((r) => `<a href="#/admin/resultado/${r.id}" class="badge risk" style="text-decoration:none">${TESTS[r.test_code].icon} ${esc(r.s.level)}</a>`).join(' ')}</td></tr>`,
            )
            .join('')}
          </tbody></table></div>`
            : empty('Ningún alumno con alertas 🎉', '✅')
        }
      </div>
      <div class="card">
        <div class="card-title"><h3>🕒 Aplicaciones recientes</h3></div>
        ${
          all.length
            ? `<div class="table-wrap"><table><thead><tr><th>Alumno</th><th>Test</th><th>Resultado</th></tr></thead><tbody>
          ${all
            .slice(0, 8)
            .map(
              (r) => `<tr class="clickable" data-id="${r.id}"><td>${esc(r.student_name)}<div class="muted small">${esc(r.grado)} ${esc(r.grupo)} · ${esc(fmtDateTime(r.created_at))}</div></td>
            <td>${TESTS[r.test_code].icon} ${TESTS[r.test_code].title.replace('Test de ', '')}</td><td><span class="badge ${toneOf(r.test_code, r.s)}">${esc(r.s.level)}</span></td></tr>`,
            )
            .join('')}
          </tbody></table></div>`
            : empty('Aún no hay respuestas. Comparte el enlace con tus alumnos.', '🔗', `<a href="#/admin/grupos" class="btn sm">Obtener enlaces</a>`)
        }
      </div>
    </div>
  </main>`;

  for (const t of TEST_LIST) {
    const rs = rows.filter((r) => r.test_code === t.code);
    if (!rs.length) continue;
    const labels = levelOrder(t.code);
    const data = labels.map((l) => rs.filter((r) => r.s.level === l).length);
    chart($(`#dash-${t.code}`), {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: levelColors(t.code), borderWidth: 0 }] },
      options: { cutout: '62%', plugins: { legend: { position: 'right', labels: { boxWidth: 8, font: { size: 11 } } } } },
    });
  }

  $$('tr.clickable', app).forEach((tr) => tr.addEventListener('click', () => navigate(`/admin/resultado/${tr.dataset.id}`)));
  $('#demo-sample')?.addEventListener('click', async () => {
    await db.demoGenerateSample(requiredKeys);
    toast('Datos de ejemplo generados', 'ok');
    dashboardView(app);
  });
  $('#demo-reset')?.addEventListener('click', async () => {
    if (await confirmDialog({ title: '¿Borrar todos los datos demo?', message: 'Se eliminarán grupos y respuestas de este navegador.', okText: 'Borrar', danger: true })) {
      db.demoReset();
      dashboardView(app);
    }
  });
}

/* ============================= RESULTADOS ============================= */
const filters = { test: '', grado: '', group: '', q: '', from: '', to: '', alert: false };

export async function resultsView(app) {
  const qs = new URLSearchParams(location.hash.split('?')[1] || '');
  if (qs.has('alert')) filters.alert = true;
  if (qs.has('group')) filters.group = qs.get('group');
  loading(app);
  const [all, groups] = await Promise.all([loadScored(), db.listGroups()]);
  const grados = [...new Set(groups.map((g) => g.grado))];

  app.innerHTML = `
  <main class="container">
    ${pageHead('Resultados', 'Todas las respuestas registradas', `
      <button class="btn ghost" id="export-sabana-btn" title="Exporta todas las preguntas con su texto y la opción contestada">📋 Sábana Detallada</button>
      <button class="btn" id="export-btn">⬇️ Exportar Resumen</button>
    `)}
    <div class="card">
      <div class="filters">
        <label class="field">Test<select id="f-test"><option value="">Todos</option>${TEST_LIST.map((t) => `<option value="${t.code}">${t.title}</option>`).join('')}</select></label>
        <label class="field">Grado<select id="f-grado"><option value="">Todos</option>${grados.map((g) => `<option>${esc(g)}</option>`).join('')}</select></label>
        <label class="field">Grupo<select id="f-group"><option value="">Todos</option>${groups.map((g) => `<option value="${g.id}">${esc(groupLabel(g))}</option>`).join('')}</select></label>
        <label class="field">Buscar alumno<input id="f-q" placeholder="Nombre…"/></label>
        <label class="field">Desde<input type="date" id="f-from"/></label>
        <label class="field">Hasta<input type="date" id="f-to"/></label>
      </div>
      <div class="row spread" style="margin-bottom:1rem">
        <label class="row small muted" style="gap:.5rem;cursor:pointer"><input type="checkbox" id="f-alert" style="width:auto"/> Sólo alumnos con alerta</label>
        <span class="muted small" id="count"></span>
      </div>
      <div id="results-table"></div>
    </div>
  </main>`;

  const ids = { test: '#f-test', grado: '#f-grado', group: '#f-group', q: '#f-q', from: '#f-from', to: '#f-to' };
  for (const [k, sel] of Object.entries(ids)) $(sel).value = filters[k];
  $('#f-alert').checked = filters.alert;

  const apply = () => {
    const q = norm(filters.q);
    return all.filter(
      (r) =>
        (!filters.test || r.test_code === filters.test) &&
        (!filters.grado || r.grado === filters.grado) &&
        (!filters.group || r.group_id === filters.group) &&
        (!q || norm(r.student_name).includes(q)) &&
        (!filters.from || r.created_at.slice(0, 10) >= filters.from) &&
        (!filters.to || r.created_at.slice(0, 10) <= filters.to) &&
        (!filters.alert || r.s.risk),
    );
  };

  const render = () => {
    const rows = apply();
    $('#count').textContent = `${rows.length} resultado${rows.length === 1 ? '' : 's'}`;
    $('#results-table').innerHTML = rows.length
      ? `<div class="table-wrap" style="max-height:65vh"><table>
      <thead><tr><th>Fecha</th><th>Alumno</th><th>Grupo</th><th>Test</th><th>Puntaje</th><th>Resultado</th><th></th></tr></thead><tbody>
      ${rows
        .map(
          (r) => `<tr class="clickable" data-id="${r.id}">
          <td class="muted small">${esc(fmtDateTime(r.created_at))}</td>
          <td><b>${esc(r.student_name)}</b></td>
          <td>${esc(r.grado)} ${esc(r.grupo)}</td>
          <td>${TESTS[r.test_code].icon} ${esc(TESTS[r.test_code].title.replace('Test de ', ''))}</td>
          <td class="small">${esc(r.s.headline)}</td>
          <td><span class="badge ${toneOf(r.test_code, r.s)}">${esc(r.s.level)}</span></td>
          <td><button class="btn sm ghost danger" data-del="${r.id}" title="Eliminar">🗑️</button></td></tr>`,
        )
        .join('')}
      </tbody></table></div>`
      : empty('No hay resultados con esos filtros', '🔍');
  };

  for (const [k, sel] of Object.entries(ids)) {
    $(sel).addEventListener(k === 'q' ? 'input' : 'change', (e) => {
      filters[k] = e.target.value;
      if (k === 'grado') {
        filters.group = '';
        $('#f-group').innerHTML = `<option value="">Todos</option>` + groups.filter((g) => !filters.grado || g.grado === filters.grado).map((g) => `<option value="${g.id}">${esc(groupLabel(g))}</option>`).join('');
      }
      render();
    });
  }
  $('#f-alert').addEventListener('change', (e) => {
    filters.alert = e.target.checked;
    render();
  });

  $('#results-table').addEventListener('click', async (e) => {
    const del = e.target.closest('[data-del]');
    if (del) {
      e.stopPropagation();
      const ok = await confirmDialog({ title: '¿Eliminar este resultado?', message: 'Esta acción no se puede deshacer.', okText: 'Eliminar', danger: true });
      if (!ok) return;
      await db.deleteResponse(del.dataset.del);
      all.splice(all.findIndex((r) => r.id === del.dataset.del), 1);
      toast('Resultado eliminado', 'ok');
      return render();
    }
    const tr = e.target.closest('tr.clickable');
    if (tr) navigate(`/admin/resultado/${tr.dataset.id}`);
  });

  $('#export-btn').addEventListener('click', () => {
    const rows = apply();
    if (!rows.length) return toast('No hay datos para exportar', 'error');
    exportResults(rows, filters.test);
  });

  $('#export-sabana-btn').addEventListener('click', async () => {
    try {
      toast('Generando sábana detallada...', 'info');
      const sabana = await db.getSabana({ test_code: filters.test, group_id: filters.group });
      if (!sabana || !sabana.length) return toast('No hay registros en la sábana con esos filtros', 'error');

      const head = [
        'ID Respuesta',
        'Fecha',
        'Alumno Completo',
        'Nombre(s)',
        'Apellido Paterno',
        'Apellido Materno',
        'Grado',
        'Grupo',
        'Test',
        'Sección / Área',
        'Código Pregunta',
        'Texto de la Pregunta',
        'Opción Elegida',
        'Texto de Respuesta',
      ];
      const data = [head];

      for (const row of sabana) {
        data.push([
          row.response_id || row.id,
          fmtDateTime(row.fecha),
          row.alumno_completo || row.alumno,
          row.nombres || '',
          row.apellido_paterno || '',
          row.apellido_materno || '',
          row.grado,
          row.grupo,
          TESTS[row.test]?.title || row.test,
          row.seccion || '',
          row.question_id,
          row.pregunta,
          row.clave_respuesta,
          row.texto_respuesta || '',
        ]);
      }

      downloadCSV(`sabana_detallada_${filters.test || 'todos'}_${new Date().toISOString().slice(0, 10)}.csv`, data);
      toast('Sábana descargada exitosamente', 'ok');
    } catch (err) {
      console.error(err);
      toast('Error al descargar la sábana', 'error');
    }
  });

  render();
}

function exportResults(rows, code) {
  const head = ['Fecha', 'Alumno Completo', 'Nombre(s)', 'Apellido Paterno', 'Apellido Materno', 'Grado', 'Grupo', 'Test', 'Resultado', 'Alerta'];
  let extra = [];
  let keys = [];
  if (code === 'habilidades') extra = ['Organización (I)', 'Nivel I', 'Técnicas (II)', 'Nivel II', 'Motivación (III)', 'Nivel III', 'Total (IV)'];
  if (code === 'autoestima') extra = ['Cant. 1', 'Cant. 2', 'Cant. 3', 'Cant. 4', 'Mayoría', 'Puntos'];
  if (code === 'asertividad') extra = ['Cant. 1', 'Cant. 2', 'Cant. 3', 'Cant. 4', 'Casillas 1-2', 'Casillas 3-4', 'Puntos'];
  if (code) keys = requiredKeys(code);
  if (!code) extra = ['Puntaje'];

  const data = [head.concat(extra, keys.map((k) => `P_${k}`))];
  for (const r of rows) {
    const s = r.s;
    const base = [
      fmtDateTime(r.created_at),
      r.student_name,
      r.nombres || '',
      r.apellido_paterno || '',
      r.apellido_materno || '',
      r.grado,
      r.grupo,
      TESTS[r.test_code].title,
      s.level,
      s.risk ? 'Sí' : 'No',
    ];
    let x = [];
    if (!code) x = [s.headline];
    if (code === 'habilidades') x = ['org', 'tec', 'mot'].flatMap((k) => [s.sections[k].score, s.sections[k].level]).concat(s.total);
    if (code === 'autoestima') x = [s.counts[1], s.counts[2], s.counts[3], s.counts[4], s.majority.join(' y '), s.points];
    if (code === 'asertividad') x = [s.counts[1], s.counts[2], s.counts[3], s.counts[4], s.high, s.low, s.points];
    data.push(base.concat(x, keys.map((k) => r.answers[k] ?? '')));
  }
  downloadCSV(`resultados_${code || 'todos'}_${new Date().toISOString().slice(0, 10)}.csv`, data);
}

/* ============================== DETALLE ============================== */
export async function detailView(app, { id }) {
  loading(app);
  const r = await db.getResponse(id);
  if (!r) {
    app.innerHTML = `<main class="container">${empty('Resultado no encontrado', '❓', '<a class="btn" href="#/admin/resultados">Volver</a>')}</main>`;
    return;
  }
  app.innerHTML = `
  <main class="container">
    <div class="row spread no-print" style="margin-bottom:1rem">
      <button class="btn ghost" id="back-btn">← Volver</button>
      <div class="row"><button class="btn" id="print-btn">🖨️ Imprimir / PDF</button><button class="btn danger" id="del-btn">🗑️ Eliminar</button></div>
    </div>
    ${printHeader('Reporte individual')}
    ${renderResult(r, { detailed: true })}
  </main>`;
  $('#back-btn').addEventListener('click', () => history.back());
  $('#print-btn').addEventListener('click', () => window.print());
  $('#del-btn').addEventListener('click', async () => {
    if (await confirmDialog({ title: '¿Eliminar este resultado?', message: 'Esta acción no se puede deshacer.', okText: 'Eliminar', danger: true })) {
      await db.deleteResponse(id);
      toast('Resultado eliminado', 'ok');
      navigate('/admin/resultados');
    }
  });
}

/* ========================== REPORTE POR GRUPO ========================== */
const groupState = { groupId: '', test: 'habilidades' };

export async function groupReportView(app) {
  loading(app);
  const groups = await db.listGroups();
  if (!groups.length) {
    app.innerHTML = `<main class="container">${empty('Primero da de alta grupos', '🏫', '<a class="btn primary" href="#/admin/grupos">Ir a grupos</a>')}</main>`;
    return;
  }
  if (!groups.some((g) => g.id === groupState.groupId)) groupState.groupId = groups[0].id;

  app.innerHTML = `
  <main class="container">
    ${pageHead('Reporte por grupo', 'Promedios, distribución por nivel y áreas de oportunidad', `<button class="btn" id="print-btn">🖨️ Imprimir / PDF</button>`)}
    <div class="row spread no-print" style="margin-bottom:1.25rem">
      <label class="field" style="min-width:200px">Grupo<select id="g-select">${groups.map((g) => `<option value="${g.id}" ${g.id === groupState.groupId ? 'selected' : ''}>${esc(groupLabel(g))}${g.activo ? '' : ' (inactivo)'}</option>`).join('')}</select></label>
      ${testTabs(groupState.test)}
    </div>
    <div id="report"></div>
  </main>`;

  const draw = async () => {
    destroyCharts();
    const box = $('#report');
    box.innerHTML = '<div class="spinner"></div>';
    const g = groups.find((x) => x.id === groupState.groupId);
    const rows = latestOnly(await loadScored({ test_code: groupState.test, group_id: g.id })).sort((a, b) => a.student_name.localeCompare(b.student_name, 'es'));
    const t = TESTS[groupState.test];
    const head = printHeader(`Reporte de grupo ${groupLabel(g)} · ${t.title}`);
    if (!rows.length) {
      box.innerHTML = head + `<div class="card">${empty(`Ningún alumno de ${groupLabel(g)} ha contestado ${t.title}.`, t.icon)}</div>`;
      return;
    }
    if (groupState.test === 'habilidades') box.innerHTML = head + groupHab(rows);
    if (groupState.test === 'autoestima') box.innerHTML = head + groupAuto(rows);
    if (groupState.test === 'asertividad') box.innerHTML = head + groupAser(rows);
    drawGroupCharts(groupState.test, rows);
    $$('tr.clickable', box).forEach((tr) => tr.addEventListener('click', () => navigate(`/admin/resultado/${tr.dataset.id}`)));
  };

  $('#g-select').addEventListener('change', (e) => {
    groupState.groupId = e.target.value;
    draw();
  });
  $('#test-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    groupState.test = b.dataset.code;
    $$('#test-tabs button').forEach((x) => x.classList.toggle('on', x === b));
    draw();
  });
  $('#print-btn').addEventListener('click', () => window.print());
  draw();
}

function kpis(items) {
  return `<div class="grid grid-4">${items.map(([icon, value, label, color]) => `<div class="card kpi"><span class="icon">${icon}</span><span class="value" ${color ? `style="color:${color}"` : ''}>${value}</span><span class="label">${label}</span></div>`).join('')}</div>`;
}

function groupHab(rows) {
  const n = rows.length;
  const risk = rows.filter((r) => r.s.risk).length;
  const avgTotal = round1(avg(rows.map((r) => r.s.total)));
  // Preguntas con más "SÍ" (problemas más frecuentes del grupo)
  const items = HABILIDADES.sections.flatMap((sec) =>
    sec.questions.map((q) => ({ sec, q, n: rows.filter((r) => r.answers[`${sec.key}_${q.id}`] === 'SI').length })),
  );
  const top = items.sort((a, b) => b.n - a.n).slice(0, 10);
  const levelIdx = (r, k) => (k === 'total' ? r.s.totalLevelIndex : r.s.sections[k].levelIndex);

  return `
  ${kpis([
    ['👥', n, 'Alumnos evaluados'],
    ['📊', `${avgTotal}<small class="muted" style="font-size:1rem">/60</small>`, 'Promedio total (IV)'],
    ['🏷️', habLevelOf('total', avgTotal), 'Nivel promedio del grupo'],
    ['⚠️', `${pct(risk, n)}%`, `En promedio bajo o inferior (${risk})`, 'var(--c-red)'],
  ])}
  <div class="grid grid-2" style="margin-top:1.25rem">
    <div class="card"><h3>Promedio por área</h3><div class="chart-box"><canvas id="gc-areas"></canvas></div></div>
    <div class="card"><h3>Distribución por nivel (total)</h3><div class="chart-box"><canvas id="gc-levels"></canvas></div></div>
  </div>
  <div class="card" style="margin-top:1.25rem">
    <h3>Tabla comparativa del grupo</h3>
    <p class="muted small">Número de alumnos en cada nivel por área.</p>
    <div class="table-wrap"><table>
      <thead><tr><th>Interpretación</th><th class="num">Organización (I)</th><th class="num">Técnicas (II)</th><th class="num">Motivación (III)</th><th class="num">Total (IV)</th></tr></thead>
      <tbody>${HAB_LEVELS.map(
        (l, i) => `<tr><td><span class="badge ${habTone(i)}">${l}</span></td>${['org', 'tec', 'mot', 'total']
          .map((k) => {
            const c = rows.filter((r) => levelIdx(r, k) === i).length;
            return `<td class="num">${c ? `<b>${c}</b> <span class="muted small">(${pct(c, n)}%)</span>` : '<span class="muted">–</span>'}</td>`;
          })
          .join('')}</tr>`,
      ).join('')}</tbody>
    </table></div>
  </div>
  <div class="card" style="margin-top:1.25rem">
    <h3>🔎 Problemas más frecuentes del grupo</h3>
    <p class="muted small">Preguntas con mayor número de respuestas <b>SÍ</b>.</p>
    ${top
      .map(
        (x) => `<div class="bar-row"><div class="small"><span class="badge">${x.sec.roman}-${x.q.id}</span> ${esc(x.q.text)}</div><div class="muted small">${x.n}/${n} · ${pct(x.n, n)}%</div>
      <div class="bar"><span style="width:${pct(x.n, n)}%;--c:linear-gradient(90deg,var(--c-amber),var(--c-red))"></span></div></div>`,
      )
      .join('')}
  </div>
  <div class="card" style="margin-top:1.25rem">
    <h3>Alumnos</h3>
    <div class="table-wrap"><table>
      <thead><tr><th>Alumno</th><th class="num">I</th><th class="num">II</th><th class="num">III</th><th class="num">Total</th><th>Interpretación</th></tr></thead>
      <tbody>${rows
        .map(
          (r) => `<tr class="clickable" data-id="${r.id}"><td>${esc(r.student_name)}</td>
        ${['org', 'tec', 'mot'].map((k) => `<td class="num"><span class="badge ${habTone(r.s.sections[k].levelIndex)}">${r.s.sections[k].score}</span></td>`).join('')}
        <td class="num"><b>${r.s.total}</b></td><td><span class="badge ${habTone(r.s.totalLevelIndex)}">${esc(r.s.level)}</span></td></tr>`,
        )
        .join('')}</tbody>
    </table></div>
  </div>`;
}

function groupAuto(rows) {
  const n = rows.length;
  const byMain = [1, 2, 3, 4].map((k) => rows.filter((r) => r.s.main === k).length);
  const topIdx = byMain.indexOf(Math.max(...byMain));
  return `
  ${kpis([
    ['👥', n, 'Alumnos evaluados'],
    ['🏷️', AUTO_LEVELS[topIdx + 1].label.replace('Autoestima ', ''), 'Nivel más frecuente'],
    ['📊', round1(avg(rows.map((r) => r.s.points))), 'Puntos promedio (/40)'],
    ['⚠️', `${pct(byMain[0], n)}%`, `Con autoestima baja (${byMain[0]})`, 'var(--c-red)'],
  ])}
  <div class="grid grid-2" style="margin-top:1.25rem">
    <div class="card"><h3>Nivel predominante</h3><div class="chart-box"><canvas id="gc-levels"></canvas></div></div>
    <div class="card"><h3>Promedio de respuestas por valor</h3><div class="chart-box"><canvas id="gc-areas"></canvas></div></div>
  </div>
  <div class="card" style="margin-top:1.25rem">
    <h3>Alumnos</h3>
    <div class="table-wrap"><table>
      <thead><tr><th>Alumno</th><th class="num">1</th><th class="num">2</th><th class="num">3</th><th class="num">4</th><th>Mayoría</th><th>Interpretación</th></tr></thead>
      <tbody>${rows
        .map(
          (r) => `<tr class="clickable" data-id="${r.id}"><td>${esc(r.student_name)}</td>
        ${[1, 2, 3, 4].map((k) => `<td class="num">${r.s.counts[k]}</td>`).join('')}
        <td>${r.s.majority.join(' y ')}${r.s.tie ? ' <span class="muted small">(empate)</span>' : ''}</td>
        <td><span class="badge ${AUTO_LEVELS[r.s.main].tone}">${esc(r.s.level)}</span></td></tr>`,
        )
        .join('')}</tbody>
    </table></div>
  </div>`;
}

function groupAser(rows) {
  const n = rows.length;
  const low = rows.filter((r) => r.s.risk).length;
  return `
  ${kpis([
    ['👥', n, 'Alumnos evaluados'],
    ['✅', `${pct(n - low, n)}%`, `Asertivos (${n - low})`, 'var(--c-green)'],
    ['📊', round1(avg(rows.map((r) => r.s.high))) + '<small class="muted" style="font-size:1rem">/9</small>', 'Respuestas asertivas promedio'],
    ['⚠️', `${pct(low, n)}%`, `Baja asertividad (${low})`, 'var(--c-red)'],
  ])}
  <div class="grid grid-2" style="margin-top:1.25rem">
    <div class="card"><h3>Distribución</h3><div class="chart-box"><canvas id="gc-levels"></canvas></div></div>
    <div class="card"><h3>% que contestó "Casi nunca / Nunca" por afirmación</h3><div class="chart-box"><canvas id="gc-areas"></canvas></div></div>
  </div>
  <div class="card" style="margin-top:1.25rem">
    <h3>Afirmaciones</h3>
    ${ASERTIVIDAD.questions
      .map((q) => {
        const c = rows.filter((r) => Number(r.answers[q.id]) >= 3).length;
        return `<div class="bar-row"><div class="small"><span class="badge">${q.id}</span> ${esc(q.text)}</div><div class="muted small">${pct(c, n)}% casillas 3-4</div>
        <div class="bar"><span style="width:${pct(c, n)}%;--c:linear-gradient(90deg,var(--c-amber),var(--c-red))"></span></div></div>`;
      })
      .join('')}
  </div>
  <div class="card" style="margin-top:1.25rem">
    <h3>Alumnos</h3>
    <div class="table-wrap"><table>
      <thead><tr><th>Alumno</th><th class="num">1</th><th class="num">2</th><th class="num">3</th><th class="num">4</th><th class="num">Puntos</th><th>Interpretación</th></tr></thead>
      <tbody>${rows
        .map(
          (r) => `<tr class="clickable" data-id="${r.id}"><td>${esc(r.student_name)}</td>
        ${[1, 2, 3, 4].map((k) => `<td class="num">${r.s.counts[k]}</td>`).join('')}
        <td class="num">${r.s.points}</td><td><span class="badge ${r.s.risk ? 'risk' : 'good'}">${esc(r.s.level)}</span></td></tr>`,
        )
        .join('')}</tbody>
    </table></div>
  </div>`;
}

function drawGroupCharts(code, rows) {
  const labels = levelOrder(code);
  chart($('#gc-levels'), {
    type: code === 'habilidades' ? 'bar' : 'doughnut',
    data: { labels, datasets: [{ data: labels.map((l) => rows.filter((r) => r.s.level === l).length), backgroundColor: levelColors(code), borderWidth: 0, borderRadius: 8 }] },
    options: code === 'habilidades' ? barOpts({ x: { ticks: { font: { size: 10 } } } }) : { cutout: '60%', plugins: { legend: { position: 'right' } } },
  });

  if (code === 'habilidades') {
    chart($('#gc-areas'), {
      type: 'bar',
      data: {
        labels: HABILIDADES.sections.map((s) => s.title),
        datasets: [{ label: 'Promedio', data: HABILIDADES.sections.map((s) => round1(avg(rows.map((r) => r.s.sections[s.key].score)))), backgroundColor: [PALETTE.violet, PALETTE.pink, PALETTE.teal] }],
      },
      options: barOpts({ y: { max: 20 } }),
    });
  } else if (code === 'autoestima') {
    chart($('#gc-areas'), {
      type: 'bar',
      data: {
        labels: ['1 · Baja', '2 · Suficiente', '3 · Muy buena', '4 · Alta'],
        datasets: [{ data: [1, 2, 3, 4].map((k) => round1(avg(rows.map((r) => r.s.counts[k])))), backgroundColor: levelColors('autoestima') }],
      },
      options: barOpts({ y: { max: 10, ticks: { precision: 1 } } }),
    });
  } else {
    chart($('#gc-areas'), {
      type: 'bar',
      data: {
        labels: ASERTIVIDAD.questions.map((q) => `#${q.id}`),
        datasets: [{ data: ASERTIVIDAD.questions.map((q) => pct(rows.filter((r) => Number(r.answers[q.id]) >= 3).length, rows.length)), backgroundColor: PALETTE.amber }],
      },
      options: barOpts({ y: { max: 100, ticks: { callback: (v) => v + '%' } } }),
    });
  }
}

/* ============================= COMPARATIVO ============================= */
const cmpState = { test: 'habilidades', by: 'grupo' };

export async function compareView(app) {
  app.innerHTML = `
  <main class="container">
    ${pageHead('Comparativo', 'Compara resultados entre grupos o grados', `<button class="btn" id="cmp-export">⬇️ Exportar CSV</button><button class="btn" id="print-btn">🖨️ Imprimir / PDF</button>`)}
    <div class="row spread no-print" style="margin-bottom:1.25rem">
      ${testTabs(cmpState.test)}
      <div class="tabs" id="by-tabs"><button data-by="grupo" class="${cmpState.by === 'grupo' ? 'on' : ''}">Por grupo</button><button data-by="grado" class="${cmpState.by === 'grado' ? 'on' : ''}">Por grado</button></div>
    </div>
    <div id="cmp"></div>
  </main>`;

  let current = [];
  const draw = async () => {
    destroyCharts();
    const box = $('#cmp');
    box.innerHTML = '<div class="spinner"></div>';
    const code = cmpState.test;
    const t = TESTS[code];
    const m = METRIC[code];
    const rows = latestOnly(await loadScored({ test_code: code }));
    if (!rows.length) {
      box.innerHTML = `<div class="card">${empty(`Aún no hay aplicaciones de ${t.title}.`, t.icon)}</div>`;
      return;
    }
    const keyOf = (r) => (cmpState.by === 'grado' ? r.grado : `${r.grado} ${r.grupo}`);
    const buckets = new Map();
    rows.forEach((r) => {
      const k = keyOf(r);
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(r);
    });
    const levels = levelOrder(code);
    current = [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'es', { numeric: true }))
      .map(([k, rs]) => ({
        k,
        n: rs.length,
        avg: round1(avg(rs.map((r) => m.of(r.s)))),
        risk: rs.filter((r) => r.s.risk).length,
        dist: levels.map((l) => rs.filter((r) => r.s.level === l).length),
        sec: code === 'habilidades' ? HABILIDADES.sections.map((s) => round1(avg(rs.map((r) => r.s.sections[s.key].score)))) : null,
      }));

    box.innerHTML = `
      ${printHeader(`Comparativo ${cmpState.by === 'grado' ? 'por grado' : 'por grupo'} · ${t.title}`)}
      <div class="grid grid-2">
        <div class="card"><h3>${m.label} <span class="muted small">(máx. ${m.max})</span></h3><div class="chart-box"><canvas id="cmp-avg"></canvas></div></div>
        <div class="card"><h3>Distribución por nivel (%)</h3><div class="chart-box"><canvas id="cmp-dist"></canvas></div></div>
      </div>
      <div class="card" style="margin-top:1.25rem">
        <h3>Tabla comparativa</h3>
        <div class="table-wrap"><table>
          <thead><tr><th>${cmpState.by === 'grado' ? 'Grado' : 'Grupo'}</th><th class="num">Alumnos</th>
          ${code === 'habilidades' ? HABILIDADES.sections.map((s) => `<th class="num">${s.roman}</th>`).join('') : ''}
          <th class="num">${m.label}</th><th class="num">% con alerta</th>${levels.map((l) => `<th class="num" title="${esc(l)}">${esc(l)}</th>`).join('')}</tr></thead>
          <tbody>${current
            .map(
              (c) => `<tr><td><b>${esc(c.k)}</b></td><td class="num">${c.n}</td>
            ${c.sec ? c.sec.map((v) => `<td class="num">${v}</td>`).join('') : ''}
            <td class="num"><b>${c.avg}</b></td><td class="num"><span class="badge ${pct(c.risk, c.n) >= 40 ? 'risk' : pct(c.risk, c.n) >= 20 ? 'warn' : 'good'}">${pct(c.risk, c.n)}%</span></td>
            ${c.dist.map((d) => `<td class="num">${d || '<span class="muted">–</span>'}</td>`).join('')}</tr>`,
            )
            .join('')}</tbody>
        </table></div>
      </div>`;

    chart($('#cmp-avg'), {
      type: 'bar',
      data: {
        labels: current.map((c) => c.k),
        datasets:
          code === 'habilidades'
            ? HABILIDADES.sections.map((s, i) => ({ label: s.title, data: current.map((c) => c.sec[i]), backgroundColor: SERIES[i] }))
            : [{ label: m.label, data: current.map((c) => c.avg), backgroundColor: SERIES.slice(0, current.length) }],
      },
      options: barOpts({ plugins: { legend: { display: code === 'habilidades' } }, y: { max: code === 'habilidades' ? 20 : m.max } }),
    });
    chart($('#cmp-dist'), {
      type: 'bar',
      data: {
        labels: current.map((c) => c.k),
        datasets: levels.map((l, i) => ({ label: l, data: current.map((c) => pct(c.dist[i], c.n)), backgroundColor: levelColors(code)[i] })),
      },
      options: {
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 8, font: { size: 10 } } } },
        scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, max: 100, ticks: { callback: (v) => v + '%' } } },
      },
    });
  };

  $('#test-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    cmpState.test = b.dataset.code;
    $$('#test-tabs button').forEach((x) => x.classList.toggle('on', x === b));
    draw();
  });
  $('#by-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    cmpState.by = b.dataset.by;
    $$('#by-tabs button').forEach((x) => x.classList.toggle('on', x === b));
    draw();
  });
  $('#print-btn').addEventListener('click', () => window.print());
  $('#cmp-export').addEventListener('click', () => {
    if (!current.length) return toast('No hay datos para exportar', 'error');
    const code = cmpState.test;
    const levels = levelOrder(code);
    const secHead = code === 'habilidades' ? HABILIDADES.sections.map((s) => `${s.title} (prom.)`) : [];
    downloadCSV(`comparativo_${code}_${cmpState.by}.csv`, [
      [cmpState.by === 'grado' ? 'Grado' : 'Grupo', 'Alumnos', ...secHead, METRIC[code].label, '% con alerta', ...levels],
      ...current.map((c) => [c.k, c.n, ...(c.sec || []), c.avg, pct(c.risk, c.n), ...c.dist]),
    ]);
  });
  draw();
}

/* =============================== GRUPOS =============================== */
export async function groupsView(app) {
  loading(app);
  const session = await db.getSession();
  const isAdmin = session?.user?.role !== 'docente';
  const [groups, rows, users] = await Promise.all([
    db.listGroups(),
    db.listResponses(),
    isAdmin ? db.listUsers().catch(() => []) : Promise.resolve([]),
  ]);
  const countBy = rows.reduce((m, r) => ((m[r.group_id] = (m[r.group_id] || 0) + 1), m), {});
  const base = `${location.origin}${location.pathname}`;

  app.innerHTML = `
  <main class="container">
    ${pageHead('Grados y grupos', 'Catálogo de grupos y asignaciones')}
    <div class="grid" style="grid-template-columns:minmax(260px,340px) 1fr;align-items:start">
      <form class="card" id="group-form">
        <h3>Agregar grupo</h3>
        <div class="stack">
          <label class="field">Grado
            <select id="new-grado" required>
              <option value="">Selecciona grado...</option>
              <option value="1°">1°</option>
              <option value="2°">2°</option>
              <option value="3°">3°</option>
            </select>
          </label>
          <label class="field">Grupo<input id="new-grupo" placeholder="Ej. A, B, C" required maxlength="10"/></label>
          <button class="btn primary block" id="add-group-btn">+ Agregar</button>
        </div>
        <div class="callout small" style="margin-top:1.25rem">
          <b>🔗 Enlace para los alumnos</b><br/>
          <p class="muted small" style="margin:.25rem 0 .5rem">Comparte este único enlace general. Los alumnos seleccionan su grado y grupo al ingresar.</p>
          <code style="word-break:break-all">${esc(base)}</code>
          <button type="button" class="btn sm" style="margin-top:.5rem" data-copy="${esc(base)}">Copiar enlace general</button>
        </div>
      </form>
      <div class="card">
        ${
          groups.length
            ? `<div class="table-wrap"><table>
          <thead><tr><th>Grado</th><th>Grupo</th><th class="num">Tests</th><th>Estado</th><th></th></tr></thead>
          <tbody>${groups
            .map(
              (g) => `<tr data-id="${g.id}">
              <td><b>${esc(g.grado)}</b></td><td><b>${esc(g.grupo)}</b></td>
              <td class="num"><a href="#/admin/resultados?group=${g.id}">${countBy[g.id] || 0}</a></td>
              <td><button class="badge ${g.activo ? 'good' : ''}" data-toggle style="cursor:pointer;font:inherit;font-size:.78rem;font-weight:600">${g.activo ? '● Activo' : '○ Inactivo'}</button></td>
              <td style="text-align:right"><button class="btn sm ghost danger" data-del title="Eliminar">🗑️</button></td></tr>`,
            )
            .join('')}</tbody></table></div>
          <p class="muted small" style="margin:1rem 0 0">Los grupos <b>inactivos</b> no aparecen para los alumnos, pero conservan sus resultados en el historial.</p>`
            : empty('No hay grupos asignados o creados.', '🏫')
        }
      </div>
    </div>

    ${
      isAdmin
        ? `
      <div class="card" style="margin-top:2rem">
        <div class="row spread" style="margin-bottom:1rem">
          <div>
            <h3 style="margin:0">🧑‍🏫 Docentes y Asignación de Grupos</h3>
            <p class="muted small" style="margin:.25rem 0 0">Crea docentes y asígnales los grupos a los que tendrán acceso exclusivo</p>
          </div>
          <button class="btn primary sm" id="btn-new-teacher">+ Registrar Docente</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Docente</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Grupos asignados</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${users
                .map(
                  (u) => `<tr>
                <td><b>${esc(u.nombre || 'Docente')}</b></td>
                <td><code>${esc(u.email)}</code></td>
                <td><span class="badge ${u.role === 'admin' ? 'demo' : ''}">${u.role === 'admin' ? '👑 Admin (Ve todo)' : 'Docente'}</span></td>
                <td>
                  ${
                    u.role === 'admin'
                      ? '<span class="muted small">Todos los grupos</span>'
                      : (u.groups || []).length
                        ? (u.groups || []).map((g) => `<span class="badge good">${esc(g.grado)} ${esc(g.grupo)}</span>`).join(' ')
                        : '<span class="muted small">Ningún grupo asignado</span>'
                  }
                </td>
                <td style="text-align:right">
                  ${
                    u.role === 'docente'
                      ? `<button class="btn sm ghost" data-assign="${u.id}" data-name="${esc(u.nombre)}" data-groups='${JSON.stringify((u.groups || []).map((g) => g.id || g.group_id))}'>✏️ Asignar Grupos</button>`
                      : ''
                  }
                </td>
              </tr>`,
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>`
        : ''
    }
  </main>`;

  $('#group-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const grado = $('#new-grado').value.trim();
    const grupo = $('#new-grupo').value.trim();
    if (!grado || !grupo) return toast('Completa grado y grupo', 'error');
    try {
      await db.createGroup({ grado, grupo });
      toast(`Grupo ${grado} ${grupo.toUpperCase()} agregado`, 'ok');
      groupsView(app);
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  $('main', app).addEventListener('click', async (e) => {
    const copy = e.target.closest('[data-copy]');
    if (copy) {
      try {
        await navigator.clipboard.writeText(copy.dataset.copy);
        toast('Enlace copiado', 'ok');
      } catch {
        prompt('Copia el enlace:', copy.dataset.copy);
      }
      return;
    }
    const tr = e.target.closest('tr[data-id]');
    if (!tr) return;
    const g = groups.find((x) => x.id === tr.dataset.id);
    if (e.target.closest('[data-toggle]')) {
      await db.updateGroup(g.id, { activo: !g.activo });
      groupsView(app);
    } else if (e.target.closest('[data-del]')) {
      if (countBy[g.id]) return toast('Este grupo tiene resultados; desactívalo en lugar de eliminarlo.', 'error');
      if (await confirmDialog({ title: `¿Eliminar ${groupLabel(g)}?`, message: 'Se eliminará del catálogo.', okText: 'Eliminar', danger: true })) {
        try {
          await db.deleteGroup(g.id);
          groupsView(app);
        } catch (err) {
          toast(err.message, 'error');
        }
      }
    }
  });

  // Modal para registrar docente
  $('#btn-new-teacher')?.addEventListener('click', async () => {
    const modal = document.createElement('div');
    modal.className = 'modal-back';
    modal.innerHTML = `
      <div class="modal" style="max-width:440px">
        <h3>Registrar nuevo docente</h3>
        <div class="stack" style="margin-top:1rem">
          <label class="field">Nombre completo<input id="modal-docente-nombre" placeholder="Ej. Profr. Roberto Hernández" required /></label>
          <label class="field">Correo electrónico<input id="modal-docente-email" type="email" placeholder="docente@escuela.mx" required /></label>
          <label class="field">Contraseña<input id="modal-docente-pass" type="password" required /></label>
          <label class="field">Asignar grupos iniciales:
            <div style="max-height:140px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:.5rem;margin-top:.25rem">
              ${groups.map((g) => `<label class="row small" style="margin-bottom:.35rem"><input type="checkbox" value="${g.id}" class="m-group-check" style="width:auto"/> ${esc(groupLabel(g))}</label>`).join('')}
            </div>
          </label>
        </div>
        <div class="row" style="justify-content:flex-end;margin-top:1.5rem">
          <button class="btn ghost" id="modal-cancel">Cancelar</button>
          <button class="btn primary" id="modal-save">Guardar Docente</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#modal-cancel').onclick = () => modal.remove();
    modal.querySelector('#modal-save').onclick = async () => {
      const nombre = modal.querySelector('#modal-docente-nombre').value.trim();
      const email = modal.querySelector('#modal-docente-email').value.trim();
      const password = modal.querySelector('#modal-docente-pass').value;
      const group_ids = [...modal.querySelectorAll('.m-group-check:checked')].map((c) => c.value);

      if (!nombre || !email || !password) return toast('Completa todos los campos', 'error');

      try {
        await db.createUser({ nombre, email, password, role: 'docente', group_ids });
        toast('Docente registrado correctamente', 'ok');
        modal.remove();
        groupsView(app);
      } catch (err) {
        toast(err.message, 'error');
      }
    };
  });

  // Modal para editar grupos asignados a docente
  $('main', app).addEventListener('click', (e) => {
    const btn = e.target.closest('[data-assign]');
    if (!btn) return;
    const userId = btn.dataset.assign;
    const userName = btn.dataset.name;
    const currentGids = new Set(JSON.parse(btn.dataset.groups || '[]'));

    const modal = document.createElement('div');
    modal.className = 'modal-back';
    modal.innerHTML = `
      <div class="modal" style="max-width:440px">
        <h3>Grupos de ${esc(userName)}</h3>
        <p class="muted small">Marca los grados y grupos que este docente puede consultar:</p>
        <div style="max-height:220px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:.5rem;margin:1rem 0">
          ${groups
            .map(
              (g) => `<label class="row small" style="margin-bottom:.4rem;cursor:pointer">
            <input type="checkbox" value="${g.id}" class="m-assign-check" ${currentGids.has(g.id) ? 'checked' : ''} style="width:auto"/>
            <b>${esc(g.grado)} ${esc(g.grupo)}</b>
          </label>`,
            )
            .join('')}
        </div>
        <div class="row" style="justify-content:flex-end">
          <button class="btn ghost" id="assign-cancel">Cancelar</button>
          <button class="btn primary" id="assign-save">Guardar Cambios</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#assign-cancel').onclick = () => modal.remove();
    modal.querySelector('#assign-save').onclick = async () => {
      const groupIds = [...modal.querySelectorAll('.m-assign-check:checked')].map((c) => c.value);
      try {
        await db.updateUserGroups(userId, groupIds);
        toast('Asignaciones actualizadas', 'ok');
        modal.remove();
        groupsView(app);
      } catch (err) {
        toast(err.message, 'error');
      }
    };
  });
}
