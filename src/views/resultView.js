/** Render del resultado individual (lo usa el alumno al terminar y el docente en el detalle). */
import { TESTS, HABILIDADES, AUTOESTIMA, ASERTIVIDAD } from '../tests/definitions.js';
import { scoreTest, AUTO_LEVELS, ASER_LEVELS, AUTO_KEY } from '../tests/scoring.js';
import { esc, fmtDateTime } from '../lib/ui.js';

export const habTone = (idx) => (idx <= 2 ? 'good' : idx <= 4 ? 'info' : idx <= 6 ? 'warn' : 'risk');
const toneColor = { good: 'var(--c-green)', info: 'var(--c-sky)', warn: 'var(--c-amber)', risk: 'var(--c-red)' };

export function toneOf(code, s) {
  if (code === 'habilidades') return habTone(s.totalLevelIndex);
  if (code === 'autoestima') return AUTO_LEVELS[s.main].tone;
  return ASER_LEVELS[s.key].tone;
}

function header(r, test) {
  return `
    <div class="card no-break" style="margin-bottom:1.25rem">
      <div class="row spread">
        <div>
          <div class="muted small">${esc(test.anexo)} · ${esc(test.title)}</div>
          <h2 style="margin:.2rem 0 0">${esc(r.student_name)}</h2>
        </div>
        <div class="row">
          <span class="badge">🏫 ${esc(r.grado)} ${esc(r.grupo)}</span>
          ${r.created_at ? `<span class="badge">🗓️ ${esc(fmtDateTime(r.created_at))}</span>` : ''}
        </div>
      </div>
    </div>`;
}

function ring(value, sub, pctVal, color) {
  return `<div class="ring" style="--p:${pctVal};--c:${color}"><div><div class="v">${value}</div><div class="s">${sub}</div></div></div>`;
}

function bar(label, right, pctVal, color) {
  return `<div class="bar-row"><div>${label}</div><div class="muted small">${right}</div>
    <div class="bar"><span style="width:${pctVal}%;--c:${color}"></span></div></div>`;
}

/* --------------------------- Habilidades --------------------------- */
function renderHab(r, s, { detailed }) {
  const tone = habTone(s.totalLevelIndex);
  const risky = HABILIDADES.sections.filter((sec) => habTone(s.sections[sec.key].levelIndex) === 'warn' || habTone(s.sections[sec.key].levelIndex) === 'risk');
  return `
  <div class="grid grid-2">
    <div class="card result-hero">
      <div class="muted small" style="margin-bottom:.75rem">Calificación total en habilidades (IV)</div>
      ${ring(s.total, 'de 60', (s.total / 60) * 100, toneColor[tone])}
      <span class="badge ${tone}" style="font-size:.95rem;padding:.4rem 1rem">${esc(s.level)}</span>
      <p class="muted small" style="margin-top:1rem">Se cuentan las respuestas <b>NO</b>. A mayor puntaje, mejores hábitos de estudio.</p>
    </div>
    <div class="card">
      <h3>Resultados por área</h3>
      ${HABILIDADES.sections
        .map((sec) => {
          const x = s.sections[sec.key];
          const t = habTone(x.levelIndex);
          return bar(`<b>${sec.roman}.</b> ${esc(sec.title)} <span class="badge ${t}" style="margin-left:.35rem">${esc(x.level)}</span>`, `${x.score}/20`, (x.score / 20) * 100, toneColor[t]);
        })
        .join('')}
    </div>
  </div>

  ${
    risky.length
      ? `<div class="card" style="margin-top:1.25rem">
      <h3>⚠️ Áreas a atender</h3>
      <p class="muted">Obtuviste <b>promedio bajo o inferior</b> en: ${risky.map((x) => `<b>${esc(x.title)}</b>`).join(', ')}. Relee las preguntas que contestaste con <b>SÍ</b> y pregúntate:</p>
      <div class="grid grid-3">
        <div class="callout" style="--c:var(--c-amber)"><b>a)</b> ¿Qué tan serio es el problema?</div>
        <div class="callout" style="--c:var(--c-pink)"><b>b)</b> ¿Qué lo causa?</div>
        <div class="callout" style="--c:var(--c-teal)"><b>c)</b> ¿Qué puedo hacer para corregirlo?</div>
      </div>
    </div>`
      : `<div class="card" style="margin-top:1.25rem"><h3>🌟 ¡Buen trabajo!</h3><p class="muted" style="margin:0">Ninguna de tus áreas quedó en promedio bajo o inferior. Sigue fortaleciendo tus hábitos.</p></div>`
  }

  <div class="grid grid-3" style="margin-top:1.25rem">
    ${HABILIDADES.sections
      .map((sec) => {
        const x = s.sections[sec.key];
        const qs = sec.questions.filter((q) => x.yes.includes(q.id));
        return `<div class="card">
          <h3>${esc(sec.title)}</h3>
          <p class="muted small">${esc(sec.description)}</p>
          <div class="small"><b>Respondiste SÍ en ${qs.length}:</b></div>
          ${qs.length ? `<ul class="yes-list small">${qs.map((q) => `<li><b>${q.id}.</b> ${esc(q.text)}</li>`).join('')}</ul>` : '<p class="muted small">Ninguna 🎉</p>'}
        </div>`;
      })
      .join('')}
  </div>`;
}

/* --------------------------- Autoestima --------------------------- */
function renderAuto(r, s, { detailed }) {
  const lvl = AUTO_LEVELS[s.main];
  const colors = { 1: 'var(--c-red)', 2: 'var(--c-amber)', 3: 'var(--c-green)', 4: 'var(--c-sky)' };
  return `
  <div class="grid grid-2">
    <div class="card result-hero">
      <div class="muted small" style="margin-bottom:.75rem">Resultado predominante</div>
      ${ring(s.majority.join('·'), `${s.counts[s.main]} de 10`, s.counts[s.main] * 10, colors[s.main])}
      <span class="badge ${lvl.tone}" style="font-size:.95rem;padding:.4rem 1rem">${esc(lvl.label)}</span>
      ${s.tie ? `<p class="muted small" style="margin-top:1rem">Empate entre ${s.majority.map((m) => `<b>${AUTO_LEVELS[m].label}</b>`).join(' y ')}.</p>` : ''}
    </div>
    <div class="card">
      <h3>Distribución de respuestas</h3>
      ${[1, 2, 3, 4].map((k) => bar(`<b>Mayoría de ${k}</b> · ${AUTO_LEVELS[k].label}`, `${s.counts[k]}`, s.counts[k] * 10, colors[k])).join('')}
      <p class="muted small" style="margin-top:1rem">Puntos totales: <b>${s.points}</b> / 40</p>
    </div>
  </div>
  ${s.majority
    .map(
      (m) => `<div class="card" style="margin-top:1.25rem"><div class="callout" style="--c:${colors[m]}">
      <h3 style="margin-bottom:.4rem">Mayoría de ${m} · ${esc(AUTO_LEVELS[m].label)}</h3><p style="margin:0">${esc(AUTO_LEVELS[m].text)}</p></div></div>`,
    )
    .join('')}
  ${
    detailed
      ? `<div class="card" style="margin-top:1.25rem"><h3>Respuestas</h3><div class="table-wrap"><table>
      <thead><tr><th>#</th><th>Opción</th><th>Valor</th><th>Respuesta</th></tr></thead><tbody>
      ${AUTOESTIMA.questions
        .map((q) => {
          const o = r.answers[q.id];
          return `<tr><td>${q.id}</td><td>${(o || '-').toUpperCase()}</td><td>${AUTO_KEY[q.id][o] ?? '-'}</td><td style="white-space:normal">${esc(q.options[o] || '')}</td></tr>`;
        })
        .join('')}
      </tbody></table></div></div>`
      : ''
  }`;
}

/* --------------------------- Asertividad --------------------------- */
function renderAser(r, s, { detailed }) {
  const lvl = ASER_LEVELS[s.key];
  const colors = { 1: 'var(--c-green)', 2: 'var(--c-teal)', 3: 'var(--c-amber)', 4: 'var(--c-red)' };
  const n = ASERTIVIDAD.questions.length;
  return `
  <div class="grid grid-2">
    <div class="card result-hero">
      <div class="muted small" style="margin-bottom:.75rem">Respuestas en casillas 1-2</div>
      ${ring(`${s.high}/${n}`, 'asertivas', (s.high / n) * 100, toneColor[lvl.tone])}
      <span class="badge ${lvl.tone}" style="font-size:.95rem;padding:.4rem 1rem">${esc(lvl.label)}</span>
      <p class="muted small" style="margin-top:1rem">Puntuación: <b>${s.points}</b> (rango ${n}–${s.max}; a mayor número, menor asertividad)</p>
    </div>
    <div class="card">
      <h3>Distribución de respuestas</h3>
      ${ASERTIVIDAD.scale.map((o) => bar(`<b>${o.value}</b> · ${o.label}`, `${s.counts[o.value]}`, (s.counts[o.value] / n) * 100, colors[o.value])).join('')}
    </div>
  </div>
  <div class="card" style="margin-top:1.25rem"><div class="callout" style="--c:${toneColor[lvl.tone]}"><p style="margin:0">${esc(lvl.text)}</p></div></div>
  ${
    detailed
      ? `<div class="card" style="margin-top:1.25rem"><h3>Respuestas</h3><div class="table-wrap"><table>
      <thead><tr><th>#</th><th>Afirmación</th><th>Respuesta</th></tr></thead><tbody>
      ${ASERTIVIDAD.questions
        .map((q) => {
          const v = Number(r.answers[q.id]);
          return `<tr><td>${q.id}</td><td style="white-space:normal">${esc(q.text)}</td><td><span class="badge ${v >= 3 ? 'warn' : 'good'}">${v} · ${ASERTIVIDAD.scale[v - 1]?.label || '-'}</span></td></tr>`;
        })
        .join('')}
      </tbody></table></div></div>`
      : ''
  }`;
}

export function renderResult(r, opts = {}) {
  const test = TESTS[r.test_code];
  const s = scoreTest(r.test_code, r.answers);
  const body = r.test_code === 'habilidades' ? renderHab(r, s, opts) : r.test_code === 'autoestima' ? renderAuto(r, s, opts) : renderAser(r, s, opts);
  return header(r, test) + body;
}
