/** Flujo del alumno: datos → elegir test → contestar → ver resultado. */
import { TEST_LIST, TESTS, HABILIDADES, AUTOESTIMA, ASERTIVIDAD } from '../tests/definitions.js';
import { requiredKeys } from '../tests/scoring.js';
import { listGroups, submitResponse } from '../lib/db.js';
import { esc, toast, confirmDialog, $, $$, spotlight } from '../lib/ui.js';
import { renderResult } from './resultView.js';
import { navigate } from '../router.js';

const SS = {
  get: (k, d = null) => {
    try {
      return JSON.parse(sessionStorage.getItem(k)) ?? d;
    } catch {
      return d;
    }
  },
  set: (k, v) => sessionStorage.setItem(k, JSON.stringify(v)),
  del: (k) => sessionStorage.removeItem(k),
};

/* =============================== HOME =============================== */
export async function homeView(app, params = {}) {
  const student = SS.get('hab_student', {});
  const done = SS.get('hab_done', []);
  app.innerHTML = `
  <main class="container">
    <section class="hero">
      <div class="eyebrow">✨ Orientación educativa</div>
      <h1>Conócete mejor y <span class="grad-text">mejora tu forma de estudiar</span></h1>
      <p>Contesta con sinceridad. No hay respuestas correctas o incorrectas: al terminar verás tus resultados al instante.</p>
    </section>

    <div class="steps">
      <div class="step active"><span class="dot">1</span>Tus datos</div>
      <div class="step"><span class="dot">2</span>Elige un test</div>
      <div class="step"><span class="dot">3</span>Resultados</div>
    </div>

    <form id="student-form" class="narrow card pad-lg glow" novalidate>
      <h2 style="font-size:1.3rem">👋 Tus datos</h2>
      <div class="grid" style="grid-template-columns:1fr">
        <label class="field">Nombre(s)
          <input id="student-nombres" name="nombres" autocomplete="given-name" placeholder="Ej. María Fernanda" value="${esc(student.nombres || '')}" required minlength="2" />
        </label>
        <div class="grid" style="grid-template-columns:1fr 1fr">
          <label class="field">Apellido Paterno
            <input id="student-paterno" name="paterno" autocomplete="family-name" placeholder="Ej. López" value="${esc(student.apellido_paterno || '')}" required minlength="2" />
          </label>
          <label class="field">Apellido Materno
            <input id="student-materno" name="materno" autocomplete="additional-name" placeholder="Ej. García" value="${esc(student.apellido_materno || '')}" required minlength="2" />
          </label>
        </div>
        <div class="grid" style="grid-template-columns:1fr 1fr">
          <label class="field">Grado
            <select id="student-grado" required><option value="">Cargando…</option></select>
          </label>
          <label class="field">Grupo
            <select id="student-grupo" required disabled><option value="">Elige grado</option></select>
          </label>
        </div>
      </div>

      <h2 style="font-size:1.3rem;margin-top:2rem">🧭 Elige el test a contestar</h2>
      <div class="grid grid-3" id="test-cards">
        ${TEST_LIST.map(
          (t) => `
          <button type="button" class="card test-card" data-code="${t.code}" id="card-${t.code}" style="--accent:${t.color}">
            ${done.includes(t.code) ? '<span class="badge good done-badge">✓ Contestado</span>' : ''}
            <div class="icon">${t.icon}</div>
            <div class="muted small">${t.anexo}</div>
            <h3 style="margin:.2rem 0 .4rem">${t.title}</h3>
            <p class="muted small" style="margin:0 0 .75rem">${t.short}</p>
            <span class="badge">⏱️ ~${t.minutes} min</span>
          </button>`,
        ).join('')}
      </div>

      <button class="btn primary lg block" id="start-btn" style="margin-top:2rem" disabled>Comenzar test →</button>
    </form>
  </main>`;

  spotlight(app);
  let selected = null;
  const gradoSel = $('#student-grado');
  const grupoSel = $('#student-grupo');
  const startBtn = $('#start-btn');
  let groups = [];

  const refresh = () => {
    startBtn.disabled = !selected;
  };

  try {
    groups = await listGroups({ activeOnly: true });
  } catch (e) {
    toast('No se pudieron cargar los grupos. Revisa tu conexión.', 'error');
  }
  const grados = [...new Set(groups.map((g) => g.grado))];
  gradoSel.innerHTML = `<option value="">Selecciona…</option>` + grados.map((g) => `<option>${esc(g)}</option>`).join('');
  if (!groups.length) gradoSel.innerHTML = `<option value="">Sin grupos dados de alta</option>`;

  const fillGrupos = (grado, pre) => {
    const opts = groups.filter((g) => g.grado === grado);
    grupoSel.disabled = !opts.length;
    grupoSel.innerHTML = `<option value="">Selecciona…</option>` + opts.map((g) => `<option value="${g.id}" ${g.id === pre ? 'selected' : ''}>${esc(g.grupo)}</option>`).join('');
  };
  gradoSel.addEventListener('change', () => fillGrupos(gradoSel.value));

  const preId = params.groupId || student.group?.id;
  const pre = groups.find((g) => g.id === preId);
  if (pre) {
    gradoSel.value = pre.grado;
    fillGrupos(pre.grado, pre.id);
  }

  $('#test-cards').addEventListener('click', (e) => {
    const card = e.target.closest('.test-card');
    if (!card) return;
    $$('.test-card').forEach((c) => c.classList.toggle('selected', c === card));
    selected = card.dataset.code;
    refresh();
  });

  $('#student-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const nombresEl = $('#student-nombres');
    const paternoEl = $('#student-paterno');
    const maternoEl = $('#student-materno');

    const nombres = nombresEl.value.trim().replace(/\s+/g, ' ');
    const apellido_paterno = paternoEl.value.trim().replace(/\s+/g, ' ');
    const apellido_materno = maternoEl.value.trim().replace(/\s+/g, ' ');
    const name = `${nombres} ${apellido_paterno} ${apellido_materno}`.trim();

    const group = groups.find((g) => g.id === grupoSel.value);
    nombresEl.classList.toggle('invalid', nombres.length < 2);
    paternoEl.classList.toggle('invalid', apellido_paterno.length < 2);
    gradoSel.classList.toggle('invalid', !gradoSel.value);
    grupoSel.classList.toggle('invalid', !group);

    if (nombres.length < 2) return toast('Escribe tu(s) nombre(s).', 'error');
    if (apellido_paterno.length < 2) return toast('Escribe tu apellido paterno.', 'error');
    if (!group) return toast('Selecciona tu grado y grupo.', 'error');
    if (!selected) return toast('Elige un test.', 'error');

    if (SS.get('hab_student', {}).name !== name) SS.set('hab_done', []);
    SS.set('hab_student', { name, nombres, apellido_paterno, apellido_materno, group });
    navigate(`/test/${selected}`);
  });
}

/* ============================ TEST RUNNER ============================ */
export function testView(app, { code }) {
  const test = TESTS[code];
  const student = SS.get('hab_student');
  if (!test || !student) return navigate('/');

  const draftKey = `hab_draft_${code}`;
  const answers = SS.get(draftKey, {});
  const keys = requiredKeys(code);
  const save = () => SS.set(draftKey, answers);

  // ---- Instrucciones ----
  app.innerHTML = `
  <main class="narrow">
    <div class="card pad-lg glow" style="--accent:${test.color}">
      <div class="row" style="margin-bottom:1rem">
        <div class="test-card" style="pointer-events:none;width:auto"><div class="icon" style="margin:0">${test.icon}</div></div>
        <div><div class="muted small">${test.anexo}</div><h1 style="font-size:2rem;margin:0">${test.title}</h1></div>
      </div>
      <div class="row" style="margin-bottom:1.25rem">
        <span class="badge">👤 ${esc(student.name)}</span>
        <span class="badge">🏫 ${esc(student.group.grado)} ${esc(student.group.grupo)}</span>
        <span class="badge">📝 ${keys.length} preguntas</span>
      </div>
      <h3>Instrucciones</h3>
      ${test.instructions.map((p) => `<p class="muted">${esc(p)}</p>`).join('')}
      ${
        code === 'asertividad'
          ? `<div class="grid grid-4" style="gap:.5rem;margin-bottom:1rem">${test.scale.map((s) => `<div class="callout small" style="--c:${test.color}"><b>${s.value}</b> = ${s.label}</div>`).join('')}</div>`
          : ''
      }
      <div class="row spread" style="margin-top:1.5rem">
        <a href="#/" class="btn ghost">← Cambiar test</a>
        <button class="btn primary lg" id="begin-btn">${Object.keys(answers).length ? 'Continuar donde me quedé' : 'Estoy listo, comenzar'} →</button>
      </div>
    </div>
  </main>`;

  $('#begin-btn').addEventListener('click', () => {
    if (test.type === 'yesno') runYesNo();
    else if (test.type === 'multiple') runMultiple();
    else runScale();
  });

  const progressHTML = () => {
    const n = keys.filter((k) => answers[k] != null).length;
    return `<div class="row spread small"><span class="muted">${test.icon} ${test.title}</span><span><b id="prog-n">${n}</b> / ${keys.length}</span></div>
      <div class="progress" style="margin-top:.5rem"><span id="prog-bar" style="width:${(n / keys.length) * 100}%"></span></div>`;
  };
  const updateProgress = () => {
    const n = keys.filter((k) => answers[k] != null).length;
    $('#prog-n').textContent = n;
    $('#prog-bar').style.width = `${(n / keys.length) * 100}%`;
  };

  async function finish() {
    const missing = keys.filter((k) => answers[k] == null);
    if (missing.length) return toast(`Te faltan ${missing.length} preguntas por contestar.`, 'error');
    const ok = await confirmDialog({ title: '¿Enviar respuestas?', message: 'Una vez enviadas ya no podrás modificarlas.', okText: 'Enviar' });
    if (!ok) return;
    const btn = $('#finish-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Enviando…';
    }
    try {
      await submitResponse({
        test_code: code,
        student_name: student.name,
        nombres: student.nombres,
        apellido_paterno: student.apellido_paterno,
        apellido_materno: student.apellido_materno,
        group: student.group,
        answers,
      });
      const done = new Set(SS.get('hab_done', []));
      done.add(code);
      SS.set('hab_done', [...done]);
      SS.set('hab_last', {
        test_code: code,
        student_name: student.name,
        nombres: student.nombres,
        apellido_paterno: student.apellido_paterno,
        apellido_materno: student.apellido_materno,
        grado: student.group.grado,
        grupo: student.group.grupo,
        answers,
        created_at: new Date().toISOString(),
      });
      SS.del(draftKey);
      navigate('/resultado');
    } catch (e) {
      console.error(e);
      toast('No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.', 'error');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Enviar respuestas ✓';
      }
    }
  }

  /* ---------- SÍ / NO por secciones (Anexo 10) ---------- */
  function runYesNo(page = 0) {
    const sections = HABILIDADES.sections;
    const sec = sections[page];
    app.innerHTML = `
    <main class="narrow">
      <div class="quiz-head">${progressHTML()}</div>
      <div class="slide-in">
        <div class="muted small">Cuestionario ${page + 1} de ${sections.length}</div>
        <h2>${sec.roman}. ${sec.title}</h2>
        <div id="qs">
          ${sec.questions
            .map((q) => {
              const k = `${sec.key}_${q.id}`;
              return `<div class="q ${answers[k] ? 'answered' : ''}" data-k="${k}">
                <div class="num">${q.id}</div>
                <div class="text">${esc(q.text)}</div>
                <div class="yn">
                  <button type="button" data-v="SI" class="${answers[k] === 'SI' ? 'on' : ''}" id="q-${k}-si">Sí</button>
                  <button type="button" data-v="NO" class="${answers[k] === 'NO' ? 'on' : ''}" id="q-${k}-no">No</button>
                </div>
              </div>`;
            })
            .join('')}
        </div>
        <div class="row spread" style="margin-top:1.5rem">
          <button class="btn" id="prev-btn">${page === 0 ? '← Instrucciones' : '← Anterior'}</button>
          ${
            page < sections.length - 1
              ? `<button class="btn primary" id="next-btn">Siguiente cuestionario →</button>`
              : `<button class="btn primary" id="finish-btn">Enviar respuestas ✓</button>`
          }
        </div>
      </div>
    </main>`;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    $('#qs').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-v]');
      if (!b) return;
      const row = b.closest('.q');
      answers[row.dataset.k] = b.dataset.v;
      save();
      $$('button', row).forEach((x) => x.classList.toggle('on', x === b));
      row.classList.add('answered');
      row.classList.remove('missing');
      updateProgress();
    });

    const validatePage = () => {
      const miss = $$('.q').filter((r) => !answers[r.dataset.k]);
      miss.forEach((r) => {
        r.classList.remove('missing');
        void r.offsetWidth;
        r.classList.add('missing');
      });
      if (miss.length) {
        miss[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        toast(`Te faltan ${miss.length} preguntas en este cuestionario.`, 'error');
      }
      return !miss.length;
    };

    $('#prev-btn').addEventListener('click', () => (page === 0 ? testView(app, { code }) : runYesNo(page - 1)));
    $('#next-btn')?.addEventListener('click', () => validatePage() && runYesNo(page + 1));
    $('#finish-btn')?.addEventListener('click', () => validatePage() && finish());
  }

  /* ---------- Opción múltiple, una por pantalla (Anexo 13) ---------- */
  function runMultiple(i = null) {
    const qs = AUTOESTIMA.questions;
    if (i === null) {
      i = qs.findIndex((q) => !answers[q.id]);
      if (i < 0) i = qs.length - 1;
    }
    const q = qs[i];
    const allDone = keys.every((k) => answers[k]);
    app.innerHTML = `
    <main class="narrow">
      <div class="quiz-head">${progressHTML()}</div>
      <div class="card pad-lg slide-in" style="--accent:${AUTOESTIMA.color}">
        <div class="muted small" style="margin-bottom:.5rem">Pregunta ${i + 1} de ${qs.length}</div>
        <div class="mc-q">${esc(q.text)}</div>
        <div id="opts">
          ${Object.entries(q.options)
            .map(
              ([k, t]) => `<button type="button" class="option ${answers[q.id] === k ? 'on' : ''}" data-o="${k}" id="opt-${q.id}-${k}">
              <span class="letter">${k}</span><span>${esc(t)}</span></button>`,
            )
            .join('')}
        </div>
      </div>
      <div class="dots" style="margin:1.5rem 0">
        ${qs.map((x, j) => `<button type="button" data-j="${j}" class="${answers[x.id] ? 'answered' : ''} ${j === i ? 'current' : ''}">${j + 1}</button>`).join('')}
      </div>
      <div class="row spread">
        <button class="btn" id="prev-btn" ${i === 0 ? 'disabled' : ''}>← Anterior</button>
        ${
          allDone
            ? `<button class="btn primary" id="finish-btn">Enviar respuestas ✓</button>`
            : `<button class="btn" id="next-btn" ${i === qs.length - 1 || !answers[q.id] ? 'disabled' : ''}>Siguiente →</button>`
        }
      </div>
    </main>`;

    $('#opts').addEventListener('click', (e) => {
      const b = e.target.closest('.option');
      if (!b) return;
      answers[q.id] = b.dataset.o;
      save();
      $$('.option').forEach((x) => x.classList.toggle('on', x === b));
      setTimeout(() => {
        const next = qs.findIndex((x, j) => j > i && !answers[x.id]);
        const any = qs.findIndex((x) => !answers[x.id]);
        runMultiple(next >= 0 ? next : any >= 0 ? any : i);
      }, 320);
    });
    $('.dots').addEventListener('click', (e) => {
      const b = e.target.closest('[data-j]');
      if (b) runMultiple(Number(b.dataset.j));
    });
    $('#prev-btn').addEventListener('click', () => runMultiple(i - 1));
    $('#next-btn')?.addEventListener('click', () => runMultiple(i + 1));
    $('#finish-btn')?.addEventListener('click', finish);
  }

  /* ---------- Escala 1-4 (Anexo 14) ---------- */
  function runScale() {
    app.innerHTML = `
    <main class="narrow">
      <div class="quiz-head">${progressHTML()}</div>
      <div class="slide-in" style="--accent:${ASERTIVIDAD.color}">
        <h2>${ASERTIVIDAD.title}</h2>
        <p class="muted">${esc(ASERTIVIDAD.instructions[0])}</p>
        <div id="qs">
          ${ASERTIVIDAD.questions
            .map(
              (q) => `<div class="q scale-q ${answers[q.id] ? 'answered' : ''}" data-k="${q.id}">
              <div class="num">${q.id}</div>
              <div class="text">${esc(q.text)}</div>
              <div class="scale">
                ${ASERTIVIDAD.scale.map((s) => `<button type="button" data-v="${s.value}" class="${String(answers[q.id]) === String(s.value) ? 'on' : ''}" id="q-${q.id}-${s.value}"><small>${s.value}</small>${s.label}</button>`).join('')}
              </div>
            </div>`,
            )
            .join('')}
        </div>
        <div class="row spread" style="margin-top:1.5rem">
          <button class="btn" id="prev-btn">← Instrucciones</button>
          <button class="btn primary" id="finish-btn">Enviar respuestas ✓</button>
        </div>
      </div>
    </main>`;
    $('#qs').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-v]');
      if (!b) return;
      const row = b.closest('.q');
      answers[row.dataset.k] = b.dataset.v;
      save();
      $$('button', row).forEach((x) => x.classList.toggle('on', x === b));
      row.classList.add('answered');
      row.classList.remove('missing');
      updateProgress();
    });
    $('#prev-btn').addEventListener('click', () => testView(app, { code }));
    $('#finish-btn').addEventListener('click', () => {
      const miss = $$('.q').filter((r) => !answers[r.dataset.k]);
      miss.forEach((r) => {
        r.classList.remove('missing');
        void r.offsetWidth;
        r.classList.add('missing');
      });
      if (miss.length) {
        miss[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        return toast(`Te faltan ${miss.length} afirmaciones.`, 'error');
      }
      finish();
    });
  }
}

/* ============================== RESULTADO ============================== */
export function studentResultView(app) {
  const r = SS.get('hab_last');
  if (!r) return navigate('/');
  const done = SS.get('hab_done', []);
  const pending = TEST_LIST.filter((t) => !done.includes(t.code));
  app.innerHTML = `
  <main class="container">
    <div class="steps no-print">
      <div class="step done"><span class="dot">✓</span>Tus datos</div>
      <div class="step done"><span class="dot">✓</span>Test</div>
      <div class="step active"><span class="dot">3</span>Resultados</div>
    </div>
    <div class="center no-print" style="margin-bottom:1.5rem">
      <h1 style="font-size:2.2rem">🎉 ¡Gracias, <span class="grad-text">${esc(r.student_name.split(' ')[0])}</span>!</h1>
      <p class="muted">Tus respuestas se guardaron correctamente. Estos son tus resultados:</p>
    </div>
    ${renderResult(r)}
    <div class="card no-print" style="margin-top:1.25rem">
      <div class="row spread">
        <div>
          <h3 style="margin:0">${pending.length ? '¿Continuamos?' : '¡Completaste todos los tests! 🏆'}</h3>
          <p class="muted small" style="margin:0">${pending.length ? `Te ${pending.length === 1 ? 'falta' : 'faltan'}: ${pending.map((t) => t.title).join(', ')}` : 'Puedes cerrar esta ventana.'}</p>
        </div>
        <div class="row">
          <button class="btn" id="print-btn">🖨️ Imprimir / PDF</button>
          ${pending.length ? `<a class="btn primary" href="#/test/${pending[0].code}" id="next-test-btn">Siguiente: ${pending[0].title} →</a>` : `<button class="btn" id="exit-btn">Salir</button>`}
        </div>
      </div>
    </div>
  </main>`;
  $('#print-btn').addEventListener('click', () => window.print());
  $('#exit-btn')?.addEventListener('click', () => {
    ['hab_student', 'hab_done', 'hab_last'].forEach(SS.del);
    navigate('/');
  });
}
