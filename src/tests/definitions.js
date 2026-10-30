/**
 * Definición de los instrumentos (transcritos de Test.docx).
 *  - Anexo 10: Encuesta sobre las Habilidades de Estudio
 *  - Anexo 13: Test de Autoestima
 *  - Anexo 14: Test de Asertividad
 */

const L = 'ABCDEFGHIJKLMNOPQRST'.split('');
const yesNo = (items) => items.map((text, i) => ({ id: L[i], text }));

export const HABILIDADES = {
  code: 'habilidades',
  anexo: 'Anexo 10',
  title: 'Habilidades de Estudio',
  short: 'Organización, técnicas y motivación para el estudio',
  icon: '📚',
  color: 'var(--c-violet)',
  minutes: 15,
  type: 'yesno',
  instructions: [
    'La presente encuesta está formada por tres breves cuestionarios, en los cuales puedes indicar los problemas referentes a organización, técnicas y motivación en el estudio, que quizá perjudican tu rendimiento académico. Si contestas todas las preguntas con sinceridad y reflexión podrás identificar muchos de tus actuales defectos al estudiar.',
    'Cada cuestionario contiene veinte preguntas, a las que se contestará con SÍ o NO. No hay respuestas "correctas" o "incorrectas", ya que la contestación adecuada es tu juicio sincero sobre tu modo de actuar y tus actitudes personales respecto al estudio. Responde tan rápido como puedas, pero sin caer en el descuido, y no dediques demasiado tiempo a una sola pregunta. No omitas ninguna de ellas.',
  ],
  sections: [
    {
      key: 'org',
      roman: 'I',
      title: 'Organización del estudio',
      description: 'Problemas sobre el uso efectivo del tiempo de estudio, así como el lugar donde se estudia.',
      questions: yesNo([
        '¿Sueles dejar para el último la preparación de tus trabajos?',
        '¿Crees que el sueño o el cansancio te impidan estudiar eficazmente en muchas ocasiones?',
        '¿Es frecuente que no termines tu tarea a tiempo?',
        '¿Tiendes a emplear tiempo en leer revistas, ver televisión o charlar cuando debieras dedicarlo a estudiar?',
        'Tus actividades sociales o deportivas, ¿te llevan a descuidar, a menudo, tus tareas escolares?',
        '¿Sueles dejar pasar un día o más antes de repasar los apuntes tomados en clase?',
        '¿Sueles dedicar tu tiempo libre entre las 4:00 de la tarde y las 9:00 de la noche a otras actividades que no sean estudiar?',
        '¿Descubres algunas veces, de pronto, que debes entregar una tarea antes de lo que creías?',
        '¿Te retrasas, con frecuencia, en una asignatura debido a que tienes que estudiar otra?',
        '¿Te parece que tu rendimiento es muy bajo, en relación con el tiempo que dedicas al estudio?',
        '¿Está situado tu escritorio directamente frente a una ventana, puerta u otra fuente de distracción?',
        '¿Sueles tener fotografías, trofeos o recuerdos sobre tu mesa de escritorio?',
        '¿Sueles estudiar recostado en la cama o arrellanado en un asiento cómodo?',
        '¿Produce resplandor la lámpara que utilizas al estudiar?',
        'Tu mesa de estudio, ¿está tan desordenada y llena de objetos que no dispones de sitio suficiente para estudiar con eficacia?',
        '¿Sueles interrumpir tu estudio por personas que vienen a visitarte?',
        '¿Estudias, con frecuencia, mientras tienes puesta la televisión y/o la radio?',
        'En el lugar donde estudias, ¿se pueden ver con facilidad revistas, fotos de jóvenes o materiales pertenecientes a tu afición?',
        '¿Con frecuencia interrumpen tu estudio actividades o ruidos que provienen del exterior?',
        '¿Suele hacerse lento tu estudio debido a que no tienes a la mano los libros y los materiales necesarios?',
      ]),
    },
    {
      key: 'tec',
      roman: 'II',
      title: 'Técnicas de estudio',
      description: 'Problemas de lectura de libros, toma de apuntes, preparación de exámenes y la realización de los mismos.',
      questions: yesNo([
        '¿Tiendes a comenzar la lectura de un libro de texto sin hojear previamente los subtítulos y las ilustraciones?',
        '¿Te saltas por lo general las figuras, gráficas y tablas cuando estudias un tema?',
        '¿Suele serte difícil seleccionar los puntos importantes de los temas de estudio?',
        '¿Te sorprendes con cierta frecuencia pensando en algo que no tiene nada que ver con lo que estudias?',
        '¿Sueles tener dificultad en entender tus apuntes de clase cuando tratas de revisarlos, después de cierto tiempo?',
        'Al tomar notas, ¿te sueles quedar atrás con frecuencia debido a que no puedes escribir con suficiente rapidez?',
        'Poco después de comenzar un curso, ¿sueles encontrarte con tus apuntes formando un "revoltijo"?',
        '¿Tomas normalmente tus apuntes tratando de escribir las palabras exactas del docente?',
        'Cuando tomas notas de un libro, ¿tienes la costumbre de copiar el material necesario palabra por palabra?',
        '¿Te es difícil preparar un temario apropiado para una evaluación?',
        '¿Tienes problemas para organizar los datos o el contenido de una evaluación?',
        '¿Al repasar el temario de una evaluación formulas un resumen de este?',
        '¿Te preparas a veces para una evaluación memorizando fórmulas, definiciones o reglas que no entiendes con claridad?',
        '¿Te resulta difícil decidir qué estudiar y cómo estudiarlo cuando preparas una evaluación?',
        '¿Sueles tener dificultades para organizar, en un orden lógico, las asignaturas que debes estudiar por temas?',
        'Al preparar una evaluación, ¿sueles estudiar toda la asignatura en el último momento?',
        '¿Sueles entregar tus exámenes sin revisarlos detenidamente, para ver si tienen algún error cometido por descuido?',
        '¿Te es posible con frecuencia terminar una evaluación de exposición de un tema en el tiempo prescrito?',
        '¿Sueles perder puntos en exámenes con preguntas de "Verdadero - Falso" debido a que no lees detenidamente?',
        '¿Empleas normalmente mucho tiempo en contestar la primera mitad de la prueba y tienes que apresurarte en la segunda?',
      ]),
    },
    {
      key: 'mot',
      roman: 'III',
      title: 'Motivación para el estudio',
      description: 'Problemas relacionados con la actitud indiferente o negativa hacia el valor de la educación y la indiferencia hacia tus docentes.',
      questions: yesNo([
        'Después de los primeros días o semanas del curso, ¿tiendes a perder interés por el estudio?',
        '¿Crees que, en general, basta estudiar lo necesario para obtener un "aprobado" en las asignaturas?',
        '¿Te sientes frecuentemente confuso o indeciso sobre cuáles deben ser tus metas formativas y profesionales?',
        '¿Sueles pensar que no vale la pena el tiempo y el esfuerzo que son necesarios para lograr una educación universitaria?',
        '¿Crees que es más importante divertirte y disfrutar de la vida que estudiar?',
        '¿Sueles pasar el tiempo de clase en divagaciones o soñando despierto en lugar de atender al docente?',
        '¿Te sientes habitualmente incapaz de concentrarte en tus estudios debido a que estás inquieto, aburrido o de mal humor?',
        '¿Piensas con frecuencia que las asignaturas que estudias tienen poco valor práctico para ti?',
        '¿Sientes frecuentes deseos de abandonar la escuela y conseguir un trabajo?',
        '¿Sueles tener la sensación de que lo que se enseña en los centros docentes no te prepara para afrontar los problemas de la vida adulta?',
        '¿Sueles dedicarte al estudio de modo casual, según el estado de ánimo en que te encuentres?',
        '¿Te horroriza estudiar libros de texto porque son insípidos y aburridos?',
        '¿Esperas normalmente a que te fijen la fecha de una evaluación para comenzar a estudiar los textos o repasar tus apuntes de clase?',
        '¿Sueles pensar que los exámenes son pruebas penosas de las que no se puede escapar y respecto a las cuales lo que debe hacerse es sobrevivir, del modo que sea?',
        '¿Sientes con frecuencia que tus docentes no comprenden las necesidades de los estudiantes?',
        '¿Tienes normalmente la sensación de que tus docentes exigen demasiadas horas de estudio fuera de clase?',
        '¿Dudas, por lo general, en pedir ayuda a tus docentes en tareas que te son difíciles?',
        '¿Sueles pensar que tus docentes no tienen contacto con los temas y sucesos de actualidad?',
        '¿Te sientes reacio, por lo general, a hablar con tus docentes de tus proyectos futuros, de estudio o profesionales?',
        '¿Criticas con frecuencia a tus docentes cuando charlas con tus compañeros?',
      ]),
    },
  ],
};

export const AUTOESTIMA = {
  code: 'autoestima',
  anexo: 'Anexo 13',
  title: 'Test de Autoestima',
  short: 'Detección de problemas emocionales',
  icon: '💜',
  color: 'var(--c-pink)',
  minutes: 8,
  type: 'multiple',
  instructions: [
    'Realiza el siguiente test para evaluar y comprobar tu nivel de autoestima.',
    'Contesta con la mayor sinceridad posible a cada una de las siguientes preguntas, eligiendo la respuesta que más se identifique con tu forma de pensar o de actuar.',
  ],
  questions: [
    {
      id: '1',
      text: 'A la hora de tomar decisiones en tu vida, como proponer cosas nuevas en el trabajo, iniciar alguna actividad de ocio o elegir un color nuevo para pintar tu casa, ¿sueles buscar la aprobación o el apoyo de las personas que te rodean?',
      options: {
        a: 'No, consideras que tu opinión es buena y que la de los demás no tiene por qué serlo siempre.',
        b: 'Sí, pero sólo ante las decisiones que consideras demasiado importantes como para actuar precipitadamente.',
        c: 'Sí, siempre que puedes consultas con los demás. Te equivocas con frecuencia y quieres hacer las cosas bien.',
        d: 'Depende de la decisión. Sueles tener claro lo que vas a hacer, pero consideras las posibilidades que te ofrecen los demás.',
      },
    },
    {
      id: '2',
      text: 'Imagina que estás en una reunión social o familiar importante; adviertes que no vas vestido para la ocasión y que desentonas con los demás, ¿cómo te comportas?',
      options: {
        a: 'No le das importancia, te comportas con naturalidad y si alguien te lo comenta haces alguna broma al respecto.',
        b: 'Te da mucha vergüenza. Procuras situarte en algún lugar discreto y pasar desapercibido.',
        c: 'Te sientes incómodo pero tratas de no pensar en ello, te integras en la reunión y das alguna excusa por tu error.',
        d: 'No te importa nada en absoluto; aunque no lleves la ropa adecuada tienes estilo y sabes llevar bien cualquier cosa.',
      },
    },
    {
      id: '3',
      text: 'Tienes muchas ganas de irte a comprar ropa y le pides a algún amigo que te acompañe. Esta persona es más alta y más atractiva que tú, y todo lo que se prueba le queda mucho mejor que a ti.',
      options: {
        a: 'Admiras el estilo de tu acompañante; al final compras un par de prendas necesarias pero muy simples en cuanto a forma y color.',
        b: 'No estás dispuesto a que te gane, decides comprar varias prendas muy modernas y bastante caras.',
        c: 'Admiras su estilo pero eres muy consciente del tuyo, compras la ropa que mejor te sienta y que necesitas, y pasas un rato ameno probando cosas diferentes.',
        d: 'A su lado te sientes bastante poca cosa, te quita las ganas de probarte nada y mucho menos de comprar. Pones una excusa y te marchas.',
      },
    },
    {
      id: '4',
      text: 'Un día conoces a alguien nuevo y muy interesante, estás charlando animadamente y llega el momento de hablar de ti, ¿cuál de las siguientes opciones se ajusta mejor a lo que cuentas?',
      options: {
        a: 'No crees que tengas mucho que contar: tu trabajo es muy corriente, tus amigos son normales y tus aficiones también. Prefieres que esta persona te cuente su vida.',
        b: 'Tu trabajo te gusta y, aunque sea corriente, siempre lo enfocas desde una perspectiva interesante; tus aficiones son tu pasión y disfrutas hablando de ellas, también hablas de tus proyectos futuros.',
        c: 'Hablas en líneas generales de tu trabajo y de tus aficiones; sobre todo hablas de tus amigos y de lo más interesante de sus vidas.',
        d: 'Más que de tu trabajo actual, hablas de tus proyectos y tus objetivos, de lo que vas a hacer para lograrlos, de lo buenas que son tus amistades y lo poco usual de tus aficiones. Te gusta hablar de ti.',
      },
    },
    {
      id: '5',
      text: 'En tu lugar de trabajo o de estudios se está explicando algo que es completamente nuevo para ti. Llega un momento en que te das cuenta de que no has entendido casi nada, ¿qué haces?',
      options: {
        a: 'Paras la explicación y pides que se empiece de nuevo; si tú no lo entiendes, habrá mucha gente que tampoco lo haga.',
        b: 'Si hay más gente que pregunte tú también lo haces; si no, buscas aparte al ponente para que te aclare las dudas.',
        c: 'Te da mucha vergüenza preguntar y demostrar así que no entiendes. Más tarde preguntarás a algún amigo o intentarás informarte por tu cuenta.',
        d: 'Tomas nota de lo que no entiendes para preguntarlo al finalizar la charla; si sigues con dudas pedirás información complementaria para prepararte mejor.',
      },
    },
    {
      id: '6',
      text: 'Tener un trabajo (o actividad) bien remunerado y que nos guste es algo difícil de conseguir. Si tuvieras que valorar tu empleo o tu situación actual, ¿cómo la definirías?',
      options: {
        a: 'Satisfactoria: tratas de buscar el lado positivo de las cosas y nunca te faltan proyectos y objetivos que perseguir.',
        b: 'Horrible; no obstante, sabes que las cosas están mal y que tienes que aguantar lo que sea. Estás muy agradecido por tener trabajo.',
        c: 'No te preocupa especialmente el tema; tienes un montón de proyectos más importantes y con tu valía los alcanzarás.',
        d: 'Has logrado que no te afecte; consideras más importante tu vida personal y privada y eso es por lo que luchas.',
      },
    },
    {
      id: '7',
      text: 'Has tenido un día duro: trabajaste con más ahínco para finalizar una tarea, hiciste todas las gestiones pendientes, resolviste un par de problemas domésticos y encima le hiciste un favor a un amigo. ¿Qué haces al llegar a casa?',
      options: {
        a: 'Prefieres no pensarlo; el día ha sido duro pero para ti no es algo nuevo, sólo pides poder dormir bien y que mañana sea un día más tranquilo.',
        b: 'Se lo cuentas a todo el mundo; te gusta que se te reconozca cuando haces las cosas bien y exiges en casa que te mimen por haberte esforzado tanto.',
        c: 'Estás muy satisfecho y decides darte un capricho: un baño de espuma y ver una buena película, o comprarte un regalito que hace tiempo querías.',
        d: 'Te preocupa que se te haya olvidado algo o haber hecho algo mal por la prisa; repasas mentalmente las actividades y al día siguiente esperas no tener queja de nadie.',
      },
    },
    {
      id: '8',
      text: 'En tu escuela o trabajo buscan a una persona que los represente en un concurso. Piden que cumpla unos requisitos, entre ellos explicar bien su trabajo y hacer una demostración práctica del mismo.',
      options: {
        a: 'No te planteas ser voluntario; hay mil personas más capacitadas que tú para la demostración y no se te da bien hablar en público.',
        b: 'Te presentas voluntario; puede ser una experiencia interesante y si sales elegido puedes hacer una presentación innovadora.',
        c: 'No te presentas; serías capaz de hacerlo bien pero crees que hay gente mejor preparada y más original que tú.',
        d: 'Te presentas y estás casi seguro de que te elegirán; haces buenos proyectos y darás una buena imagen.',
      },
    },
    {
      id: '9',
      text: '¿Con cuál de las siguientes frases sobre la buena fortuna estás más de acuerdo?',
      options: {
        a: 'La buena suerte puede tocarle a todo el mundo; yo me considero una persona afortunada a la que la vida le sonríe.',
        b: 'Para tener buena suerte hay que trabajar duro; sólo los muy afortunados la tienen sin apenas esfuerzo.',
        c: 'Yo no tengo suerte; tanto los premios como las cosas especiales sólo les pasan a los demás.',
        d: 'La suerte respecto a los premios es una cuestión de probabilidad, y respecto a las cosas de la vida, siempre depende de cómo se perciban.',
      },
    },
    {
      id: '10',
      text: 'En una fiesta en la que no conoces a nadie excepto a los anfitriones, te presentan a un grupo de personas de aspecto interesante. ¿Cuál es tu actitud?',
      options: {
        a: 'Te interesa conocerlos no sólo para pasar un buen rato en la reunión sino porque puede ser una forma de iniciar una amistad.',
        b: 'Esperas causarles una buena impresión y decir cosas que les puedan interesar.',
        c: 'Te gustaría llevarlos a tu terreno en la conversación para así poder hablar de los temas que más te interesan.',
        d: 'Antes de iniciar una conversación escuchas lo que dicen, y esperas a que hablen de temas que tú conozcas para participar.',
      },
    },
  ],
};

export const ASERTIVIDAD = {
  code: 'asertividad',
  anexo: 'Anexo 14',
  title: 'Test de Asertividad',
  short: 'Capacidad de expresarte y defender tus derechos',
  icon: '🗣️',
  color: 'var(--c-teal)',
  minutes: 4,
  type: 'scale',
  instructions: ['Por favor marca la opción con la que mejor te identificas en cada afirmación.'],
  scale: [
    { value: 1, label: 'Con frecuencia' },
    { value: 2, label: 'De vez en cuando' },
    { value: 3, label: 'Casi nunca' },
    { value: 4, label: 'Nunca' },
  ],
  questions: [
    'En una reunión difícil, con un ambiente caldeado, soy capaz de hablar con confianza.',
    'Si no estoy seguro(a) de una cosa, puedo pedir ayuda fácilmente.',
    'Si alguna persona es injusta y agresiva, puedo controlar la situación con confianza.',
    'Si alguna persona se muestra irónica conmigo o con otras, puedo responder sin agresividad.',
    'Si creo que se está abusando de mí, soy capaz de denunciarlo sin alterarme.',
    'Si alguna persona me pide permiso para hacer algo que no me gusta (por ejemplo, fumar), puedo decirle que no sin sentirme culpable.',
    'Si alguna persona pide mi opinión sobre alguna cosa, me siento bien dándosela, aunque no concuerde con la de los demás.',
    'Puedo conectar fácil y efectivamente con personas que considero importantes.',
    'Cuando encuentro defectos en una tienda o restaurante, soy capaz de exponerlos sin atacar a las otras personas y sin sentirme mal.',
  ].map((text, i) => ({ id: String(i + 1), text })),
};

export const TESTS = {
  [HABILIDADES.code]: HABILIDADES,
  [AUTOESTIMA.code]: AUTOESTIMA,
  [ASERTIVIDAD.code]: ASERTIVIDAD,
};

export const TEST_LIST = [HABILIDADES, AUTOESTIMA, ASERTIVIDAD];
