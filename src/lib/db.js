/**
 * Capa de datos para la aplicación con soporte para Roles (Admin / Docente).
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

export const isDemo = import.meta.env.VITE_USE_DEMO === 'true';

const LS = {
  get: (k, d) => {
    try {
      return JSON.parse(localStorage.getItem(k)) ?? d;
    } catch {
      return d;
    }
  },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

export const DEMO_USER = { email: 'admin@demo.mx', password: 'admin1234' };
export const DEMO_TEACHER = { email: 'docente@demo.mx', password: 'demo1234' };

function demoSeed() {
  if (LS.get('hab_groups')) return;
  const groups = [];
  for (const g of ['1°', '2°', '3°']) {
    for (const s of ['A', 'B']) {
      groups.push({ id: uid(), grado: g, grupo: s, activo: true, created_at: new Date().toISOString() });
    }
  }
  LS.set('hab_groups', groups);
  LS.set('hab_responses', []);
}
demoSeed();

/* ============================== AUTH ============================== */
const authListeners = new Set();

export async function getSession() {
  return LS.get('hab_session', null);
}

function authHeaders() {
  const session = LS.get('hab_session', null);
  const headers = { 'Content-Type': 'application/json' };
  if (session && session.token) {
    headers['Authorization'] = `Bearer ${session.token}`;
  }
  return headers;
}

export async function signIn(email, password) {
  if (isDemo) {
    const e = email.trim().toLowerCase();
    if (e === DEMO_USER.email && password === DEMO_USER.password) {
      const s = { user: { email, nombre: 'Administrador Demo', role: 'admin' }, token: 'demo-admin' };
      LS.set('hab_session', s);
      authListeners.forEach((f) => f(s));
      return s;
    }
    if (e === DEMO_TEACHER.email && password === DEMO_TEACHER.password) {
      const allG = LS.get('hab_groups', []);
      const teacherGroups = allG.slice(0, 2); // Asignar 2 grupos en demo
      const s = {
        user: { email, nombre: 'Profesor Demo', role: 'docente', assignedGroups: teacherGroups },
        token: 'demo-teacher',
      };
      LS.set('hab_session', s);
      authListeners.forEach((f) => f(s));
      return s;
    }
    throw new Error('Credenciales inválidas');
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Credenciales inválidas');
    }

    const session = { user: data.user, token: data.token };
    LS.set('hab_session', session);
    authListeners.forEach((f) => f(session));
    return session;
  } catch (err) {
    throw new Error(err.message || 'Error de conexión con el servidor');
  }
}

export async function signOut() {
  localStorage.removeItem('hab_session');
  authListeners.forEach((f) => f(null));
}

export function onAuthChange(fn) {
  authListeners.add(fn);
  return () => authListeners.delete(fn);
}

/* ============================= USUARIOS (ADMIN) ==================== */
export async function listUsers() {
  if (isDemo) {
    return [
      { id: '1', email: 'admin@demo.mx', nombre: 'Admin Demo', role: 'admin', groups: [] },
      { id: '2', email: 'docente@demo.mx', nombre: 'Profesor Demo', role: 'docente', groups: (LS.get('hab_groups', [])).slice(0, 2) },
    ];
  }
  const res = await fetch(`${API_BASE}/api/users`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Error al listar usuarios');
  return await res.json();
}

export async function createUser(userData) {
  if (isDemo) return { id: uid(), ...userData };
  const res = await fetch(`${API_BASE}/api/users`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(userData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al crear usuario');
  return data;
}

export async function updateUserGroups(userId, groupIds) {
  if (isDemo) return;
  const res = await fetch(`${API_BASE}/api/users/${userId}/groups`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ group_ids: groupIds }),
  });
  if (!res.ok) throw new Error('Error al actualizar grupos del usuario');
}

export async function deleteUser(userId) {
  if (isDemo) return;
  const res = await fetch(`${API_BASE}/api/users/${userId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Error al eliminar usuario');
}

/* ============================= GRUPOS ============================= */
const sortGroups = (a, b) =>
  a.grado.localeCompare(b.grado, 'es', { numeric: true }) || a.grupo.localeCompare(b.grupo, 'es');

export async function listGroups({ activeOnly = false } = {}) {
  const session = LS.get('hab_session', null);
  const isTeacher = session?.user?.role === 'docente';
  const assigned = session?.user?.assignedGroups || [];

  if (isDemo) {
    let list = LS.get('hab_groups', []);
    if (isTeacher) {
      const allowedIds = new Set(assigned.map((g) => g.id));
      list = list.filter((g) => allowedIds.has(g.id));
    }
    return list.filter((g) => !activeOnly || g.activo).sort(sortGroups);
  }

  try {
    const res = await fetch(`${API_BASE}/api/groups?activeOnly=${activeOnly}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Error al obtener grupos');
    const data = await res.json();
    return data.sort(sortGroups);
  } catch (err) {
    console.warn('API no disponible, usando almacenamiento local temporal:', err.message);
    let list = LS.get('hab_groups', []);
    if (isTeacher) {
      const allowedIds = new Set(assigned.map((g) => g.id));
      list = list.filter((g) => allowedIds.has(g.id));
    }
    return list.filter((g) => !activeOnly || g.activo).sort(sortGroups);
  }
}

export async function createGroup({ grado, grupo }) {
  grado = grado.trim();
  grupo = grupo.trim().toUpperCase();

  if (isDemo) {
    const all = LS.get('hab_groups', []);
    if (all.some((g) => g.grado === grado && g.grupo === grupo)) throw new Error('Ese grado y grupo ya existe');
    const g = { id: uid(), grado, grupo, activo: true, created_at: new Date().toISOString() };
    LS.set('hab_groups', [...all, g]);
    return g;
  }

  const res = await fetch(`${API_BASE}/api/groups`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ grado, grupo }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al crear grupo');
  return data;
}

export async function updateGroup(id, patch) {
  if (isDemo) {
    LS.set('hab_groups', LS.get('hab_groups', []).map((g) => (g.id === id ? { ...g, ...patch } : g)));
    return;
  }

  const res = await fetch(`${API_BASE}/api/groups/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(patch),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al actualizar grupo');
}

export async function deleteGroup(id) {
  if (isDemo) {
    LS.set('hab_groups', LS.get('hab_groups', []).filter((g) => g.id !== id));
    return;
  }

  const res = await fetch(`${API_BASE}/api/groups/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al eliminar grupo');
}

/* =========================== RESPUESTAS =========================== */
export async function submitResponse({ test_code, student_name, nombres, apellido_paterno, apellido_materno, group, answers }) {
  const cleanName = (student_name || `${nombres || ''} ${apellido_paterno || ''} ${apellido_materno || ''}`.trim()).replace(/\s+/g, ' ');
  const row = {
    test_code,
    student_name: cleanName,
    nombres: (nombres || '').trim(),
    apellido_paterno: (apellido_paterno || '').trim(),
    apellido_materno: (apellido_materno || '').trim(),
    group,
    answers,
  };

  if (isDemo) {
    const all = LS.get('hab_responses', []);
    LS.set('hab_responses', [...all, { ...row, group_id: group.id, grado: group.grado, grupo: group.grupo, id: uid(), created_at: new Date().toISOString() }]);
    return;
  }

  const res = await fetch(`${API_BASE}/api/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(row),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al enviar la respuesta');
}

export async function listResponses({ test_code, group_id } = {}) {
  const session = LS.get('hab_session', null);
  const isTeacher = session?.user?.role === 'docente';
  const assigned = session?.user?.assignedGroups || [];

  if (isDemo) {
    let list = LS.get('hab_responses', []);
    if (isTeacher) {
      const allowedIds = new Set(assigned.map((g) => g.id));
      list = list.filter((r) => allowedIds.has(r.group_id));
    }
    return list
      .filter((r) => (!test_code || r.test_code === test_code) && (!group_id || r.group_id === group_id))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  const params = new URLSearchParams();
  if (test_code) params.append('test_code', test_code);
  if (group_id) params.append('group_id', group_id);

  const res = await fetch(`${API_BASE}/api/responses?${params.toString()}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Error al listar respuestas');
  return await res.json();
}

export async function getResponse(id) {
  if (isDemo) return LS.get('hab_responses', []).find((r) => r.id === id) || null;

  const res = await fetch(`${API_BASE}/api/responses/${id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    if (res.status === 404 || res.status === 403) return null;
    throw new Error('Error al obtener respuesta');
  }
  return await res.json();
}

export async function deleteResponse(id) {
  if (isDemo) {
    LS.set('hab_responses', LS.get('hab_responses', []).filter((r) => r.id !== id));
    return;
  }

  const res = await fetch(`${API_BASE}/api/responses/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al eliminar respuesta');
}

export async function getSabana({ test_code, group_id } = {}) {
  const params = new URLSearchParams();
  if (test_code) params.append('test_code', test_code);
  if (group_id) params.append('group_id', group_id);

  const res = await fetch(`${API_BASE}/api/export/sabana?${params.toString()}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Error al obtener la sábana de respuestas');
  return await res.json();
}

/* ====================== DATOS DE EJEMPLO (demo) ====================== */
export async function demoGenerateSample(requiredKeysFn) {
  const groups = await listGroups();
  const nombres = ['Ana', 'Luis', 'María', 'José', 'Fernanda', 'Diego', 'Sofía', 'Carlos', 'Valeria', 'Jorge', 'Camila', 'Miguel', 'Daniela', 'Andrés', 'Paola', 'Emilio', 'Regina', 'Iván'];
  const apellidos = ['García', 'Hernández', 'López', 'Martínez', 'Pérez', 'Ramírez', 'Torres', 'Flores', 'Gómez', 'Díaz', 'Cruz', 'Morales'];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  for (const g of groups) {
    const bias = Math.random();
    for (let i = 0; i < 3; i++) {
      const name = `${pick(nombres)} ${pick(apellidos)} ${pick(apellidos)}`;
      for (const code of ['habilidades', 'autoestima', 'asertividad']) {
        const answers = {};
        for (const k of requiredKeysFn(code)) {
          if (code === 'habilidades') answers[k] = Math.random() < 0.55 + bias * 0.3 ? 'NO' : 'SI';
          if (code === 'autoestima') answers[k] = pick(['a', 'b', 'c', 'd']);
          if (code === 'asertividad') answers[k] = String(Math.min(4, Math.max(1, Math.round(1 + Math.random() * 2 + (1 - bias)))));
        }
        await submitResponse({ test_code: code, student_name: name, group: g, answers });
      }
    }
  }
}

export function demoReset() {
  ['hab_groups', 'hab_responses'].forEach((k) => localStorage.removeItem(k));
  demoSeed();
}
