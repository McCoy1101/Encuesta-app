import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

import { HABILIDADES, AUTOESTIMA, ASERTIVIDAD } from './src/tests/definitions.js';
import { scoreTest } from './src/tests/scoring.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Pool de conexiones a MySQL / TiDB Cloud
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'habilidades_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true,
  },
});

/* ========================================================================== */
/*                CATÁLOGO DE PREGUNTAS Y SEMILLAS                            */
/* ========================================================================== */
async function syncQuestionsCatalog() {
  try {
    const qList = [];

    // 1. Habilidades
    for (const sec of HABILIDADES.sections) {
      for (const q of sec.questions) {
        qList.push({
          id: `habilidades_${sec.key}_${q.id}`,
          test_code: 'habilidades',
          section_key: sec.key,
          section_title: sec.title,
          question_num: q.id,
          question_text: q.text,
          options_info: JSON.stringify({ SI: 'Sí', NO: 'No' }),
        });
      }
    }

    // 2. Autoestima
    for (const q of AUTOESTIMA.questions) {
      qList.push({
        id: `autoestima_${q.id}`,
        test_code: 'autoestima',
        section_key: null,
        section_title: 'Autoestima',
        question_num: String(q.id),
        question_text: q.text,
        options_info: JSON.stringify(q.options),
      });
    }

    // 3. Asertividad
    const scaleMap = Object.fromEntries(ASERTIVIDAD.scale.map((s) => [String(s.value), s.label]));
    for (const q of ASERTIVIDAD.questions) {
      qList.push({
        id: `asertividad_${q.id}`,
        test_code: 'asertividad',
        section_key: null,
        section_title: 'Asertividad',
        question_num: String(q.id),
        question_text: q.text,
        options_info: JSON.stringify(scaleMap),
      });
    }

    for (const item of qList) {
      await pool.query(
        `INSERT INTO questions (id, test_code, section_key, section_title, question_num, question_text, options_info)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           section_title = VALUES(section_title),
           question_text = VALUES(question_text),
           options_info = VALUES(options_info)`,
        [item.id, item.test_code, item.section_key, item.section_title, item.question_num, item.question_text, item.options_info]
      );
    }

    console.log(`✅ Catálogo de preguntas sincronizado (${qList.length} preguntas disponibles).`);
  } catch (err) {
    console.warn('⚠️ No se pudo sincronizar el catálogo de preguntas:', err.message);
  }
}

// Verificación inicial de conexión
pool.getConnection()
  .then(async (conn) => {
    console.log('✅ Conexión exitosa a MySQL (' + (process.env.DB_NAME || 'habilidades_db') + ')');
    conn.release();
    await syncQuestionsCatalog();
  })
  .catch((err) => {
    console.error('⚠️ No se pudo conectar a MySQL:', err.message);
  });

/* ========================================================================== */
/*                MIDDLEWARE DE AUTORIZACIÓN POR ROLES                        */
/* ========================================================================== */
async function authenticateUser(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      if (token.startsWith('session-')) {
        const email = Buffer.from(token.replace('session-', ''), 'base64').toString('utf8');
        const [users] = await pool.query('SELECT id, email, nombre, role FROM users WHERE LOWER(email) = LOWER(?)', [email]);
        if (users.length > 0) {
          req.user = users[0];
          // Obtener los grupos asignados a este usuario
          const [userGroups] = await pool.query('SELECT group_id FROM user_groups WHERE user_id = ?', [req.user.id]);
          req.user.assignedGroupIds = userGroups.map((g) => g.group_id);
        }
      }
    } catch (e) {
      console.warn('Error al verificar token:', e.message);
    }
  }
  next();
}

app.use(authenticateUser);

/* ========================================================================== */
/*                             RUTAS DE LA API                                */
/* ========================================================================== */

// Health check
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: error.message });
  }
});

/* -------------------------------- AUTH ----------------------------------- */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const [rows] = await pool.query(
      'SELECT id, email, nombre, role FROM users WHERE LOWER(email) = LOWER(?) AND password = ?',
      [email.trim(), password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = rows[0];

    // Obtener grupos asignados al docente
    const [assigned] = await pool.query(
      `SELECT g.id, g.grado, g.grupo 
       FROM ` + "`groups`" + ` g
       INNER JOIN user_groups ug ON g.id = ug.group_id
       WHERE ug.user_id = ?`,
      [user.id]
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        role: user.role, // 'admin' o 'docente'
        assignedGroups: assigned,
      },
      token: 'session-' + Buffer.from(user.email).toString('base64'),
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno en el servidor' });
  }
});

/* ------------------------------- GESTIÓN USUARIOS (ADMIN) ----------------- */
// Listar docentes y sus grupos asignados (Solo Admin)
app.get('/api/users', async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, email, nombre, role, created_at FROM users ORDER BY role ASC, nombre ASC'
    );
    const [assignments] = await pool.query(
      `SELECT ug.user_id, g.id as group_id, g.grado, g.grupo 
       FROM user_groups ug 
       JOIN \`groups\` g ON ug.group_id = g.id`
    );

    const userMap = users.map((u) => ({
      ...u,
      groups: assignments.filter((a) => a.user_id === u.id).map((a) => ({ id: a.group_id, grado: a.grado, grupo: a.grupo })),
    }));

    res.json(userMap);
  } catch (err) {
    console.error('Error al listar usuarios:', err);
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
});

// Crear usuario docente
app.post('/api/users', async (req, res) => {
  try {
    const { email, password, nombre, role = 'docente', group_ids = [] } = req.body;
    if (!email || !password || !nombre) {
      return res.status(400).json({ error: 'Email, nombre y contraseña son requeridos' });
    }

    const id = crypto.randomUUID();
    await pool.query(
      'INSERT INTO users (id, email, password, nombre, role) VALUES (?, ?, ?, ?, ?)',
      [id, email.trim().toLowerCase(), password, nombre.trim(), role]
    );

    // Asignar grupos si vienen
    if (Array.isArray(group_ids) && group_ids.length > 0) {
      const values = group_ids.map((gid) => [id, gid]);
      await pool.query('INSERT INTO user_groups (user_id, group_id) VALUES ?', [values]);
    }

    res.status(201).json({ id, email, nombre, role });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe un usuario con ese correo electrónico' });
    }
    console.error('Error al crear usuario:', err);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// Actualizar grupos asignados a un docente
app.put('/api/users/:id/groups', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const { group_ids = [] } = req.body;

    await conn.beginTransaction();
    await conn.query('DELETE FROM user_groups WHERE user_id = ?', [id]);

    if (group_ids.length > 0) {
      const values = group_ids.map((gid) => [id, gid]);
      await conn.query('INSERT INTO user_groups (user_id, group_id) VALUES ?', [values]);
    }

    await conn.commit();
    conn.release();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('Error al actualizar grupos de usuario:', err);
    res.status(500).json({ error: 'Error al actualizar grupos' });
  }
});

// Eliminar usuario
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error al eliminar usuario:', err);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

/* ------------------------------- GRUPOS ---------------------------------- */
app.get('/api/groups', async (req, res) => {
  try {
    const activeOnly = req.query.activeOnly === 'true';
    let query = 'SELECT * FROM `groups` WHERE 1=1';
    const params = [];

    if (activeOnly) {
      query += ' AND activo = 1';
    }

    // FILTRO DE ROL: Si es docente, solo ve sus grupos asignados
    if (req.user && req.user.role === 'docente') {
      if (!req.user.assignedGroupIds || req.user.assignedGroupIds.length === 0) {
        return res.json([]); // No tiene grupos asignados
      }
      query += ` AND id IN (${req.user.assignedGroupIds.map(() => '?').join(',')})`;
      params.push(...req.user.assignedGroupIds);
    }

    query += ' ORDER BY grado ASC, grupo ASC';

    const [rows] = await pool.query(query, params);
    res.json(rows.map((r) => ({ ...r, activo: Boolean(r.activo) })));
  } catch (err) {
    console.error('Error en listGroups:', err);
    res.status(500).json({ error: 'Error al obtener grupos' });
  }
});

app.post('/api/groups', async (req, res) => {
  try {
    let { grado, grupo } = req.body;
    grado = (grado || '').trim();
    grupo = (grupo || '').trim().toUpperCase();

    if (!grado || !grupo) {
      return res.status(400).json({ error: 'Grado y grupo son requeridos' });
    }

    const id = crypto.randomUUID();
    await pool.query('INSERT INTO `groups` (id, grado, grupo, activo) VALUES (?, ?, ?, 1)', [id, grado, grupo]);
    const [created] = await pool.query('SELECT * FROM `groups` WHERE id = ?', [id]);
    res.status(201).json({ ...created[0], activo: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ese grado y grupo ya existe' });
    }
    console.error('Error en createGroup:', err);
    res.status(500).json({ error: 'Error al crear grupo' });
  }
});

app.patch('/api/groups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { activo, grado, grupo } = req.body;
    const fields = [];
    const values = [];

    if (typeof activo === 'boolean') {
      fields.push('activo = ?');
      values.push(activo ? 1 : 0);
    }
    if (grado !== undefined) {
      fields.push('grado = ?');
      values.push(grado.trim());
    }
    if (grupo !== undefined) {
      fields.push('grupo = ?');
      values.push(grupo.trim().toUpperCase());
    }

    if (fields.length === 0) return res.status(400).json({ error: 'Nada que actualizar' });

    values.push(id);
    await pool.query(`UPDATE \`groups\` SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ success: true });
  } catch (err) {
    console.error('Error en updateGroup:', err);
    res.status(500).json({ error: 'Error al actualizar grupo' });
  }
});

app.delete('/api/groups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM `groups` WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({
        error: 'No se puede eliminar: el grupo tiene tests registrados. Desactívalo en su lugar.',
      });
    }
    console.error('Error en deleteGroup:', err);
    res.status(500).json({ error: 'Error al eliminar grupo' });
  }
});

/* ----------------------------- RESPUESTAS -------------------------------- */
// Enviar respuesta (Alumno)
app.post('/api/responses', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { test_code, student_name, nombres, apellido_paterno, apellido_materno, group, answers } = req.body;

    if (!test_code || !group || !answers) {
      conn.release();
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    // Armar nombre completo y partes separadas
    const cleanNombres = (nombres || '').trim();
    const cleanPaterno = (apellido_paterno || '').trim();
    const cleanMaterno = (apellido_materno || '').trim();
    const cleanName = (student_name || `${cleanNombres} ${cleanPaterno} ${cleanMaterno}`.trim()).replace(/\s+/g, ' ');

    if (!cleanName) {
      conn.release();
      return res.status(400).json({ error: 'El nombre del alumno es obligatorio' });
    }

    const id = crypto.randomUUID();
    const answersJson = typeof answers === 'string' ? answers : JSON.stringify(answers);

    let scoreSummary = null;
    try {
      scoreSummary = scoreTest(test_code, typeof answers === 'string' ? JSON.parse(answers) : answers);
    } catch {
      // Ignorar
    }

    await conn.beginTransaction();

    // 1. Guardar cabecera
    await conn.query(
      `INSERT INTO responses 
       (id, test_code, student_name, nombres, apellido_paterno, apellido_materno, group_id, grado, grupo, answers, score_summary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        test_code,
        cleanName,
        cleanNombres || null,
        cleanPaterno || null,
        cleanMaterno || null,
        group.id,
        group.grado,
        group.grupo,
        answersJson,
        scoreSummary ? JSON.stringify(scoreSummary) : null,
      ]
    );

    // 2. Guardar desglose en sábana detallada
    const rawAnswers = typeof answers === 'string' ? JSON.parse(answers) : answers;
    const detailRows = [];

    if (test_code === 'habilidades') {
      for (const sec of HABILIDADES.sections) {
        for (const q of sec.questions) {
          const key = `${sec.key}_${q.id}`;
          const val = rawAnswers[key] || '';
          detailRows.push([
            id,
            test_code,
            cleanName,
            cleanNombres || null,
            cleanPaterno || null,
            cleanMaterno || null,
            group.grado,
            group.grupo,
            `habilidades_${key}`,
            sec.title,
            q.text,
            val,
            val === 'SI' ? 'Sí' : val === 'NO' ? 'No' : val,
          ]);
        }
      }
    } else if (test_code === 'autoestima') {
      for (const q of AUTOESTIMA.questions) {
        const val = rawAnswers[String(q.id)] || '';
        const optText = q.options && q.options[val] ? q.options[val] : '';
        detailRows.push([
          id,
          test_code,
          cleanName,
          cleanNombres || null,
          cleanPaterno || null,
          cleanMaterno || null,
          group.grado,
          group.grupo,
          `autoestima_${q.id}`,
          'Autoestima',
          q.text,
          val,
          optText,
        ]);
      }
    } else if (test_code === 'asertividad') {
      const scaleMap = Object.fromEntries(ASERTIVIDAD.scale.map((s) => [String(s.value), s.label]));
      for (const q of ASERTIVIDAD.questions) {
        const val = String(rawAnswers[String(q.id)] || '');
        const optText = scaleMap[val] || '';
        detailRows.push([
          id,
          test_code,
          cleanName,
          cleanNombres || null,
          cleanPaterno || null,
          cleanMaterno || null,
          group.grado,
          group.grupo,
          `asertividad_${q.id}`,
          'Asertividad',
          q.text,
          val,
          optText,
        ]);
      }
    }

    if (detailRows.length > 0) {
      await conn.query(
        `INSERT INTO response_details 
         (response_id, test_code, student_name, nombres, apellido_paterno, apellido_materno, grado, grupo, question_id, section_title, question_text, answer_val, answer_text)
         VALUES ?`,
        [detailRows]
      );
    }

    await conn.commit();
    conn.release();

    res.status(201).json({ id, success: true });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('Error en submitResponse:', err);
    res.status(500).json({ error: 'Error al guardar la respuesta' });
  }
});

// Listar respuestas con filtrado de rol
app.get('/api/responses', async (req, res) => {
  try {
    const { test_code, group_id } = req.query;
    let query = 'SELECT * FROM responses WHERE 1=1';
    const params = [];

    // FILTRO DE ROL: Si es docente, solo ve sus grupos asignados
    if (req.user && req.user.role === 'docente') {
      if (!req.user.assignedGroupIds || req.user.assignedGroupIds.length === 0) {
        return res.json([]);
      }
      query += ` AND group_id IN (${req.user.assignedGroupIds.map(() => '?').join(',')})`;
      params.push(...req.user.assignedGroupIds);
    }

    if (test_code) {
      query += ' AND test_code = ?';
      params.push(test_code);
    }
    if (group_id) {
      query += ' AND group_id = ?';
      params.push(group_id);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await pool.query(query, params);

    const formatted = rows.map((r) => ({
      ...r,
      answers: typeof r.answers === 'string' ? JSON.parse(r.answers) : r.answers,
      score_summary: typeof r.score_summary === 'string' ? JSON.parse(r.score_summary) : r.score_summary,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error en listResponses:', err);
    res.status(500).json({ error: 'Error al listar respuestas' });
  }
});

// Obtener una respuesta por ID
app.get('/api/responses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM responses WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Respuesta no encontrada' });
    const row = rows[0];

    // Verificar permiso si es docente
    if (req.user && req.user.role === 'docente') {
      if (!req.user.assignedGroupIds.includes(row.group_id)) {
        return res.status(403).json({ error: 'No tienes acceso a los resultados de este grupo' });
      }
    }

    row.answers = typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers;
    row.score_summary = typeof row.score_summary === 'string' ? JSON.parse(row.score_summary) : row.score_summary;
    res.json(row);
  } catch (err) {
    console.error('Error en getResponse:', err);
    res.status(500).json({ error: 'Error al obtener respuesta' });
  }
});

// Eliminar respuesta
app.delete('/api/responses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Solo admins pueden borrar
    if (req.user && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo el administrador puede eliminar registros' });
    }
    await pool.query('DELETE FROM responses WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error en deleteResponse:', err);
    res.status(500).json({ error: 'Error al eliminar respuesta' });
  }
});

// Sábana con filtrado por rol
app.get('/api/export/sabana', async (req, res) => {
  try {
    const { test_code, group_id } = req.query;
    let query = `
      SELECT 
        d.id,
        r.created_at AS fecha,
        r.student_name AS alumno_completo,
        r.nombres,
        r.apellido_paterno,
        r.apellido_materno,
        r.grado,
        r.grupo,
        r.test_code AS test,
        d.section_title AS seccion,
        d.question_id,
        d.question_text AS pregunta,
        d.answer_val AS clave_respuesta,
        d.answer_text AS texto_respuesta
      FROM responses r
      JOIN response_details d ON r.id = d.response_id
      WHERE 1=1
    `;
    const params = [];

    // FILTRO DE ROL: Si es docente, solo ve sus grupos
    if (req.user && req.user.role === 'docente') {
      if (!req.user.assignedGroupIds || req.user.assignedGroupIds.length === 0) {
        return res.json([]);
      }
      query += ` AND r.group_id IN (${req.user.assignedGroupIds.map(() => '?').join(',')})`;
      params.push(...req.user.assignedGroupIds);
    }

    if (test_code) {
      query += ' AND r.test_code = ?';
      params.push(test_code);
    }
    if (group_id) {
      query += ' AND r.group_id = ?';
      params.push(group_id);
    }

    query += ' ORDER BY r.created_at DESC, d.id ASC';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error en export sabana:', err);
    res.status(500).json({ error: 'Error al generar sábana de datos' });
  }
});

/* --------------------- SERVIR ARCHIVOS ESTÁTICOS ------------------------- */
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint no encontrado' });
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Servidor API activo. En modo desarrollo ejecuta Vite.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend escuchando en http://localhost:${PORT}`);
});
