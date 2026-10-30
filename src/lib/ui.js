/** Utilidades de UI sin dependencias. */

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function toast(msg, type = '') {
  let box = document.getElementById('toast');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => {
    t.style.transition = 'opacity .3s';
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 300);
  }, 3200);
}

export function confirmDialog({ title, message, okText = 'Confirmar', danger = false }) {
  return new Promise((resolve) => {
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3>${esc(title)}</h3>
        <p class="muted">${esc(message)}</p>
        <div class="row" style="justify-content:flex-end;margin-top:1.5rem">
          <button class="btn ghost" data-a="no">Cancelar</button>
          <button class="btn ${danger ? 'danger' : 'primary'}" data-a="ok" id="modal-ok">${esc(okText)}</button>
        </div>
      </div>`;
    const close = (v) => {
      back.remove();
      resolve(v);
    };
    back.addEventListener('click', (e) => {
      if (e.target === back) close(false);
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a) close(a === 'ok');
    });
    document.body.appendChild(back);
    back.querySelector('[data-a="ok"]').focus();
  });
}

const dtf = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
const df = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' });
export const fmtDateTime = (s) => dtf.format(new Date(s));
export const fmtDate = (s) => df.format(new Date(s));

export const groupLabel = (g) => `${g.grado} ${g.grupo}`;

export function downloadCSV(filename, rows) {
  const csv = rows
    .map((r) =>
      r
        .map((v) => {
          const s = String(v ?? '');
          return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(','),
    )
    .join('\r\n');
  // BOM para que Excel respete acentos
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
export const round1 = (n) => Math.round(n * 10) / 10;
export const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);

/** Efecto "spotlight" que sigue al cursor en tarjetas. */
export function spotlight(root) {
  root.addEventListener('pointermove', (e) => {
    const card = e.target.closest('.test-card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
}
