/**
 * Lógica de calificación de cada instrumento, según Test.docx.
 * Es la ÚNICA fuente de verdad: los reportes siempre recalculan desde las respuestas.
 */
import { HABILIDADES, AUTOESTIMA, ASERTIVIDAD } from './definitions.js';

/* ------------------------------------------------------------------ */
/* Anexo 10 · Habilidades de estudio                                   */
/* Se cuentan las respuestas NO y se compara con la tabla comparativa. */
/* ------------------------------------------------------------------ */

export const HAB_LEVELS = [
  'Muy alto',
  'Alto',
  'Por encima del promedio',
  'Promedio alto',
  'Promedio',
  'Promedio bajo',
  'Por debajo del promedio',
  'Bajo',
  'Muy bajo',
];

// [mínimo de cada nivel] en el mismo orden que HAB_LEVELS
const HAB_TABLE = {
  org: [20, 19, 18, 16, 14, 12, 11, 10, 0], // (I)  * el documento dice "14-13", se interpreta 14-15
  tec: [20, 18, 17, 16, 14, 13, 12, 11, 0], // (II)
  mot: [20, 19, 18, 17, 16, 15, 13, 12, 0], // (III)
  total: [57, 52, 50, 48, 43, 39, 37, 34, 0], // (IV)
};

/** Índice 0 (Muy alto) … 8 (Muy bajo) */
function habLevelIndex(table, score) {
  return table.findIndex((min) => score >= min);
}

/** Nivel textual para un puntaje de un área ('org'|'tec'|'mot'|'total'). */
export const habLevelOf = (key, score) => HAB_LEVELS[habLevelIndex(HAB_TABLE[key], score)];

/** Niveles en riesgo: "Promedio bajo o incluso peor" (instrucción 3 del documento). */
export const isHabRisk = (idx) => idx >= 5;

export function scoreHabilidades(answers) {
  const result = { sections: {}, total: 0 };
  for (const s of HABILIDADES.sections) {
    const noCount = s.questions.filter((q) => answers[`${s.key}_${q.id}`] === 'NO').length;
    const yes = s.questions.filter((q) => answers[`${s.key}_${q.id}`] === 'SI').map((q) => q.id);
    const idx = habLevelIndex(HAB_TABLE[s.key], noCount);
    result.sections[s.key] = { score: noCount, max: 20, levelIndex: idx, level: HAB_LEVELS[idx], yes };
    result.total += noCount;
  }
  const tIdx = habLevelIndex(HAB_TABLE.total, result.total);
  result.totalLevelIndex = tIdx;
  result.level = HAB_LEVELS[tIdx];
  result.risk = isHabRisk(tIdx);
  result.headline = `${result.total}/60`;
  return result;
}

/* ------------------------------------------------------------------ */
/* Anexo 13 · Autoestima                                               */
/* Cada opción equivale a 1-4; el resultado es la "mayoría" de valores. */
/* ------------------------------------------------------------------ */

// Tabla de equivalencias tal como aparece en el documento.
export const AUTO_KEY = {
  1: { a: 4, b: 2, c: 1, d: 3 },
  2: { a: 3, b: 1, c: 4, d: 1 },
  3: { a: 2, b: 4, c: 3, d: 1 },
  4: { a: 1, b: 3, c: 2, d: 4 },
  5: { a: 4, b: 2, c: 1, d: 3 },
  6: { a: 3, b: 1, c: 4, d: 2 },
  7: { a: 2, b: 4, c: 3, d: 1 },
  8: { a: 1, b: 3, c: 2, d: 4 },
  9: { a: 4, b: 2, c: 1, d: 3 },
  10: { a: 3, b: 1, c: 4, d: 2 },
};

export const AUTO_LEVELS = {
  1: {
    label: 'Autoestima baja',
    tone: 'risk',
    text: 'Tienes un nivel algo bajo de autoestima y se nota en la valoración que haces de ti mismo, de tu trabajo y de tu fortuna en la vida. Una de las razones por las que percibimos más las cosas negativas es que éstas son más destacables que las positivas. Para elevar el nivel de nuestra autoestima es necesario aceptarse tal como uno es y valorar más lo que somos y lo que tenemos. A veces puede parecer difícil, pero si practicas unos minutos diarios a pensar en las cosas positivas que tienes, irás poco a poco queriéndote más.',
  },
  2: {
    label: 'Autoestima suficiente',
    tone: 'warn',
    text: 'Tu nivel de autoestima es suficiente pero, más a menudo de lo que te gustaría, te falla y te abandona. Los sucesos negativos absorben más nuestros sentidos, por ello les damos más importancia de la que merecen. Todas las personas tenemos cosas positivas y todos cometemos errores o tenemos días flojos. La clave está en darle a cada cosa el justo valor que tiene, ver los errores como maneras de aprendizaje y reconocer las cosas buenas que poseemos. También podemos aprender a querernos a nosotros mismos cuidándonos con más mimo y dándonos gustos.',
  },
  3: {
    label: 'Autoestima muy buena',
    tone: 'good',
    text: 'Tu nivel de autoestima es muy bueno: sabes dar a las cosas el valor que merecen, reconoces lo bueno y no te dejas amilanar fácilmente por las adversidades. Eres una persona sensata y realista que tiene confianza en sí misma; tus objetivos no son irrealizables y te gusta luchar para conseguirlos. Has aprendido que las cosas no salen siempre como quieres, que todo requiere un esfuerzo y que es normal equivocarse. Un buen nivel de autoestima nos hace tener más ganas de luchar por las cosas y hace que la vida nos sea más amable y agradable.',
  },
  4: {
    label: 'Autoestima alta',
    tone: 'info',
    text: 'Tienes un alto nivel de autoestima y mucha confianza y seguridad en ti mismo. Ambos sentimientos son muy positivos y necesarios para conseguir lo que nos proponemos; sin embargo, es preciso ser cautelosos. Un exceso de autoestima puede hacernos perder la objetividad, hacernos creer demasiado buenos en algo y, si sobreviene una decepción o un fracaso, hacernos sufrir más de lo razonable. También, si nos creemos demasiado especiales, podemos hacer daño a los demás minusvalorando su esfuerzo. Siempre conviene tener una dosis de modestia.',
  },
};

export function scoreAutoestima(answers) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let points = 0;
  for (const q of AUTOESTIMA.questions) {
    const opt = answers[q.id];
    const v = AUTO_KEY[q.id]?.[opt];
    if (v) {
      counts[v]++;
      points += v;
    }
  }
  const max = Math.max(...Object.values(counts));
  const majority = Object.keys(counts).filter((k) => counts[k] === max).map(Number);
  const main = majority.length === 1 ? majority[0] : majority.slice().sort((a, b) => a - b)[0];
  // En empate se toma el valor más bajo como principal (criterio preventivo) y se reportan todos.
  return {
    counts,
    points,
    majority,
    tie: majority.length > 1,
    main,
    level: AUTO_LEVELS[main].label,
    risk: main === 1,
    headline: `Mayoría de ${majority.join(' y ')}`,
  };
}

/* ------------------------------------------------------------------ */
/* Anexo 14 · Asertividad                                              */
/* Mayoría en casillas 3 y 4 = menor nivel de asertividad.              */
/* ------------------------------------------------------------------ */

export const ASER_LEVELS = {
  alto: {
    label: 'Asertivo',
    tone: 'good',
    text: 'La mayoría de tus respuestas están en las casillas 1 y 2 ("Con frecuencia" / "De vez en cuando"). Esto indica que sueles expresar tus opiniones, necesidades y desacuerdos con confianza y respeto. ¡Sigue fortaleciendo esta habilidad!',
  },
  bajo: {
    label: 'Baja asertividad',
    tone: 'risk',
    text: 'La mayoría de tus respuestas están en las casillas 3 y 4 ("Casi nunca" / "Nunca"), lo que muestra un menor nivel de asertividad. Las personas que puntúan mayoritariamente en estas casillas deben plantearse seriamente cambiar su conducta si no quieren ver lesionados sus derechos.',
  },
};

export function scoreAsertividad(answers) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let points = 0;
  for (const q of ASERTIVIDAD.questions) {
    const v = Number(answers[q.id]);
    if (v >= 1 && v <= 4) {
      counts[v]++;
      points += v;
    }
  }
  const high = counts[1] + counts[2];
  const low = counts[3] + counts[4];
  const key = low > high ? 'bajo' : 'alto';
  return {
    counts,
    points,
    max: ASERTIVIDAD.questions.length * 4,
    high,
    low,
    key,
    level: ASER_LEVELS[key].label,
    risk: key === 'bajo',
    headline: `${low} de ${ASERTIVIDAD.questions.length} en casillas 3-4`,
  };
}

/* ------------------------------------------------------------------ */

export function scoreTest(code, answers) {
  switch (code) {
    case 'habilidades':
      return scoreHabilidades(answers);
    case 'autoestima':
      return scoreAutoestima(answers);
    case 'asertividad':
      return scoreAsertividad(answers);
    default:
      throw new Error(`Test desconocido: ${code}`);
  }
}

/** Lista de claves de pregunta requeridas por test (para validar que no se omita ninguna). */
export function requiredKeys(code) {
  if (code === 'habilidades') return HABILIDADES.sections.flatMap((s) => s.questions.map((q) => `${s.key}_${q.id}`));
  if (code === 'autoestima') return AUTOESTIMA.questions.map((q) => q.id);
  if (code === 'asertividad') return ASERTIVIDAD.questions.map((q) => q.id);
  return [];
}

/** Ordinal de niveles para gráficas/reportes por test. */
export function levelOrder(code) {
  if (code === 'habilidades') return HAB_LEVELS;
  if (code === 'autoestima') return [1, 2, 3, 4].map((k) => AUTO_LEVELS[k].label);
  if (code === 'asertividad') return [ASER_LEVELS.alto.label, ASER_LEVELS.bajo.label];
  return [];
}
