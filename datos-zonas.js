/*
  Datos compartidos por los dos prototipos del mapa de La Perla.

  Coordenadas en "unidades de mapa": x crece hacia el oriente (0–240) y y hacia el sur (0–178).
  Av. Mariano Otero corre por el borde sur (y 162–176).
  En el recorrido 3D, 1 unidad = 1 m del mundo del juego.

  IMPORTANTE: la distribución de las zonas es ILUSTRATIVA. Los textos, m², horarios y reglas
  vienen de laperla.com.mx; la posición de cada zona debe ajustarse con el plano oficial.
*/
(function () {
  // Íconos de línea (24×24), solo paths para usarlos en SVG y en Canvas (Path2D).
  const circ = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
  const ICONOS = {
    walk: `${circ(13, 4.5, 1.7)} M10 21l2-6 3 3v3 M12 15l1-6-3 1.5-2 3.5 M13 9l2.5 3H19`,
    bag: 'M5 8h14l-1 12H6z M9 8V6.5a3 3 0 0 1 6 0V8',
    film: 'M3 7h18v12H3z M3 11h18 M7 7l2 4 M12 7l2 4 M17 7l2 4',
    food: 'M7 3v7a2 2 0 0 0 4 0V3 M9 12v9 M16 3c-2 1.5-2.5 6 0 8v10',
    paw: `${circ(7.5, 9.5, 1.6)} ${circ(11.2, 6, 1.6)} ${circ(15.4, 6, 1.6)} ${circ(18.6, 10, 1.6)} M8 17.5c0-3 2-5.5 4.5-5.5s4.5 2.5 4.5 5.5c0 1.8-2 2-4.5 2s-4.5-.2-4.5-2z`,
    skate: `M3 13c0 1.2.8 2 2 2h14c1.2 0 2-.8 2-2 ${circ(7.5, 18.2, 1.5)} ${circ(16.5, 18.2, 1.5)}`,
    ball: `${circ(12, 12, 8)} M4 12h16 M12 4v16 M6.5 6.3c2.8 3 2.8 8.4 0 11.4 M17.5 6.3c-2.8 3-2.8 8.4 0 11.4`,
    kids: 'M5 21V8h4v13 M9 9l10 12 M4 8l3-4 3 4',
    fountain: 'M12 13V4 M8.5 8c1-2.5 6-2.5 7 0 M4 14h16l-2 6H6z',
    pavilion: 'M3 11l9-6 9 6 M5 11v9 M9.5 11v9 M14.5 11v9 M19 11v9 M3 20h18',
    stage: 'M10 5.5a2 2 0 0 1 4 0v4a2 2 0 0 1-4 0z M8 9.5a4 4 0 0 0 8 0 M12 13.5v3 M3 17h18v3H3z',
  };

  const zonas = [
    {
      id: 'calzada', nombre: 'Calzada La Perla', categoria: 'Paseo y comida', icono: 'walk',
      acento: '#ff6b2c', plano: '#ffd9c6', filtros: ['experiencias', 'comida', 'pet'], sello: true,
      forma: { tipo: 'poly', puntos: [[58, 40], [176, 40], [176, 56], [132, 56], [132, 160], [112, 160], [112, 56], [58, 56]] },
      pin: [122, 86], acceso: [122, 128],
      m2: '3,207 m²', horario: null,
      desc: 'Espacio público 100% peatonal, sin autos, pensado para reunirse, comer y divertirse. Aquí se concentran puestos de antojitos locales, cafés y restaurantes al aire libre.',
      datos: ['100% peatonal', 'Antojitos y cafés', 'Funciones familiares'],
    },
    {
      id: 'jardin', nombre: 'El Jardín', categoria: 'Naturaleza', icono: 'fountain',
      acento: '#1fb36b', plano: '#c8efd9', filtros: ['experiencias', 'pet'], sello: true,
      forma: { tipo: 'circ', cx: 84, cy: 88, r: 20 },
      pin: [84, 99], acceso: [84, 80],
      m2: '490.80 m²', horario: null,
      desc: 'Un jardín en el corazón de La Perla. Una pasarela te acerca poco a poco hasta su fuente de chorro vertical: un lugar para reunirse, pasear, reflexionar y tomar un respiro.',
      datos: ['Fuente de chorro vertical', 'Pasarela', 'Zona de descanso'],
    },
    {
      id: 'patio', nombre: 'El Patio', categoria: 'Niñas y niños', icono: 'kids',
      acento: '#ff5fa2', plano: '#ffd4e7', filtros: ['experiencias', 'ninos'], sello: true,
      forma: { tipo: 'rect', x: 142, y: 102, w: 32, h: 26 },
      pin: [158, 112], acceso: [158, 115],
      m2: '479 m²', horario: 'Todos los días · 11:00 – 21:00',
      desc: 'Área de juegos para peques y no tan peques, con piso acolchado para jugar con seguridad. En su nivel 1 está el Foro Urbano, sede de talleres y eventos.',
      datos: ['De 5 a 11 años', 'Estatura máx. 1.50 m', 'Siempre con un adulto'],
    },
    {
      id: 'cancha', nombre: 'La Cancha', categoria: 'Deporte', icono: 'ball',
      acento: '#3d6bff', plano: '#d5dfff', filtros: ['experiencias', 'deporte'], sello: true,
      forma: { tipo: 'rect', x: 60, y: 120, w: 40, h: 30 },
      pin: [80, 134], acceso: [80, 132], vista: [80, 121],
      m2: '218 m²', horario: 'Abierta al público · consulta horarios de clases',
      desc: 'Cancha de básquetbol 3x3 para juegos, clases y torneos, con gradas, aro profesional y marcador digital. ¡Déjalo todo en La Cancha!',
      datos: ['Básquet 3x3', 'Máx. 12 personas', 'Torneos abiertos'],
    },
    {
      id: 'rampas', nombre: 'Las Rampas', categoria: 'Deporte', icono: 'skate',
      acento: '#ffc31f', plano: '#fff0c2', filtros: ['experiencias', 'deporte'], sello: true,
      forma: { tipo: 'rect', x: 14, y: 122, w: 38, h: 28 },
      pin: [33, 133], acceso: [33, 127],
      m2: '203.64 m²', horario: 'L–V 10:00–17:00 · L, J y V 19:00–22:00 · S y D 15:00–22:00',
      desc: 'Skate park para principiantes y expertos, con picos pronunciados y curvas fluidas para trucos y saltos.',
      datos: ['Casco obligatorio', 'Solo patinetas', 'Máx. 10 personas'],
    },
    {
      id: 'pabellon', nombre: 'El Pabellón', categoria: 'Arte y cultura', icono: 'pavilion',
      acento: '#c9864a', plano: '#f3dfc8', filtros: ['experiencias'], sello: true,
      forma: { tipo: 'rect', x: 142, y: 66, w: 30, h: 26 },
      pin: [157, 77], acceso: [157, 79],
      m2: '350 m²', horario: null,
      desc: 'Una estructura de madera pensada como centro de inspiración y creatividad: exposiciones, experiencias y venta de obra de artistas y artesanos, en un ambiente cálido y acogedor.',
      datos: ['Exposiciones', 'Artistas y artesanos', 'Intercambio cultural'],
    },
    {
      id: 'canino', nombre: 'Club Canino', categoria: 'Pet friendly', icono: 'paw',
      acento: '#7ccf3f', plano: '#e0f5d0', filtros: ['experiencias', 'pet'], sello: true,
      forma: { tipo: 'rect', x: 12, y: 82, w: 40, h: 30 },
      pin: [32, 95], acceso: [32, 97],
      m2: '218 m²', horario: 'Todos los días · 10:00 – 20:30',
      desc: 'Espacio ampliado para perros grandes y chicos, con mobiliario para jugar y ejercitarse. Su jardín exterior está abierto a quienes visitan la plaza con su mascota. Parte del programa Manada Segura®.',
      datos: ['Correa y collar', 'Estaciones de limpieza', 'Manada Segura®'],
    },
    {
      id: 'mercado', nombre: 'Mercado La Perla', categoria: 'Comida', icono: 'food',
      acento: '#ff9f1c', plano: '#ffe6c2', filtros: ['comida'], sello: true,
      forma: { tipo: 'rect', x: 182, y: 68, w: 48, h: 48 },
      pin: [206, 90], acceso: [177, 92], edificio: { alto: 9, frente: 'W' },
      m2: null, horario: null,
      desc: 'El mercado gastronómico de La Perla: delicias que no te puedes perder, todas en un mismo lugar.',
      datos: ['Mercado gastronómico', 'Para compartir'],
    },
    {
      id: 'foro', nombre: 'Foro Abierto', categoria: 'Eventos', icono: 'stage',
      acento: '#a259ff', plano: '#ead9ff', filtros: ['experiencias', 'entretenimiento'], sello: true,
      forma: { tipo: 'rect', x: 182, y: 124, w: 48, h: 28 },
      pin: [200, 136], acceso: [204, 138], vista: [221, 138],
      m2: null, horario: 'Según cartelera de eventos',
      desc: 'Escenario al aire libre para conciertos, funciones y fiestas de temporada, como la fiesta de disfraces de Halloween.',
      datos: ['Conciertos', 'Eventos de temporada'],
    },
    {
      id: 'liverpool', nombre: 'Liverpool', categoria: 'Tienda ancla', icono: 'bag',
      acento: '#141414', plano: '#f1f1ef', filtros: ['tiendas'], sello: false,
      forma: { tipo: 'rect', x: 10, y: 12, w: 48, h: 62 },
      pin: [34, 40], acceso: [63, 48], edificio: { alto: 16, frente: 'E' },
      m2: null, horario: null,
      desc: 'Tienda departamental ancla de La Perla. Llegó desde Plaza del Sol, donde abrió en 1969.',
      datos: ['Tienda ancla', 'Moda, hogar y más'],
    },
    {
      id: 'cinepolis', nombre: 'Cinépolis', categoria: 'Entretenimiento', icono: 'film',
      acento: '#ff3b3b', plano: '#f1f1ef', filtros: ['entretenimiento'], sello: false,
      forma: { tipo: 'rect', x: 176, y: 12, w: 54, h: 48 },
      pin: [203, 33], acceso: [171, 49], edificio: { alto: 20, frente: 'W' },
      m2: null, horario: null,
      desc: 'El cine de La Perla, en el nivel 2: estrenos, palomitas y planes de fin de semana.',
      datos: ['Nivel 2', 'Ancla de entretenimiento'],
    },
    {
      id: 'moda', nombre: 'Zara · Inditex', categoria: 'Moda', icono: 'bag',
      acento: '#141414', plano: '#f1f1ef', filtros: ['tiendas'], sello: false,
      forma: { tipo: 'rect', x: 68, y: 12, w: 46, h: 28 },
      pin: [91, 24], acceso: [91, 47], edificio: { alto: 12, frente: 'S' },
      m2: null, horario: null,
      desc: 'Las marcas de Inditex en La Perla: Zara, Bershka, Pull&Bear, Stradivarius, Massimo Dutti, Oysho y Zara Home.',
      datos: ['Tiendas de dos niveles', '7 marcas'],
    },
    {
      id: 'moda2', nombre: 'H&M y más', categoria: 'Moda', icono: 'bag',
      acento: '#141414', plano: '#f1f1ef', filtros: ['tiendas'], sello: false,
      forma: { tipo: 'rect', x: 120, y: 12, w: 46, h: 28 },
      pin: [143, 24], acceso: [143, 47], edificio: { alto: 12, frente: 'S' },
      m2: null, horario: null,
      desc: 'H&M, Adidas, Coppel, Forever 21, Kiehl\'s, Gandhi, Starbucks y muchas más: La Perla tiene espacio para más de 236 locales.',
      datos: ['Moda', 'Belleza', 'Libros y café'],
    },
  ];

  // Perlas escondidas para el juego "Caza de perlas" del mapa aéreo.
  const perlas = [
    { pos: [22, 22], dato: 'La Perla se construyó donde estaba la antigua planta de Kodak en Zapopan.' },
    { pos: [212, 20], dato: 'La Perla tiene espacio para más de 236 locales comerciales.' },
    { pos: [92, 81], dato: 'El Jardín mide 490.80 m² y su fuente lanza un chorro vertical.' },
    { pos: [45, 145], dato: 'En Las Rampas el casco es obligatorio. ¡Máximo 10 skaters a la vez!' },
    { pos: [96, 146], dato: 'La Cancha tiene gradas, aro profesional y marcador digital para jugar 3x3.' },
    { pos: [17, 107], dato: 'Con Manada Segura®, La Perla es un centro de vida dog friendly.' },
    { pos: [168, 70], dato: 'El Pabellón es una estructura de madera de 350 m² para artistas y artesanos.' },
    { pos: [146, 125], dato: 'El Patio está pensado para peques de 5 a 11 años y abre de 11:00 a 21:00.' },
    { pos: [226, 112], dato: 'Mercado La Perla: delicias que no te puedes perder.' },
    { pos: [128, 151], dato: 'La Calzada La Perla tiene 3,207 m² 100% peatonales.' },
  ];

  // Pistas para el juego "¿Dónde está?".
  const acertijos = [
    { zona: 'rampas', pista: 'Aquí el casco es obligatorio y solo se permiten patinetas.' },
    { zona: 'cancha', pista: 'Juega 3x3 con marcador digital y gradas llenas.' },
    { zona: 'jardin', pista: 'Una pasarela te lleva hasta una fuente de chorro vertical.' },
    { zona: 'patio', pista: 'Piso acolchado y juegos para peques de 5 a 11 años.' },
    { zona: 'pabellon', pista: 'Estructura de madera donde artistas y artesanos muestran su obra.' },
    { zona: 'canino', pista: 'Tu perro corre y juega aquí de 10:00 a 20:30.' },
    { zona: 'calzada', pista: '3,207 m² sin autos, llenos de antojitos y cafés.' },
    { zona: 'liverpool', pista: 'La tienda ancla que llegó desde Plaza del Sol.' },
    { zona: 'cinepolis', pista: 'Palomitas y estrenos en el nivel 2.' },
    { zona: 'mercado', pista: 'Delicias que no te puedes perder, todas en un mismo lugar.' },
    { zona: 'foro', pista: 'Escenario al aire libre para conciertos y fiestas de disfraces.' },
  ];

  // Árboles (compartidos para que el mapa y el recorrido coincidan).
  const arboles = [];
  const arbol = (x, y) => arboles.push([Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
  for (let x = 8; x <= 100; x += 11) arbol(x, 155);
  for (let x = 142; x <= 236; x += 11) arbol(x, 155);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.35;
    if (Math.cos(a) > 0.85) continue; // deja libre la pasarela del lado oriente
    arbol(84 + Math.cos(a) * 17, 88 + Math.sin(a) * 17);
  }
  [16, 28, 40].forEach((x) => arbol(x, 78));
  [64, 78, 106, 120, 134, 148].forEach((y) => { arbol(107, y); arbol(137, y); });
  [20, 36, 66, 82, 96].forEach((x) => arbol(x, 116));
  [72, 86, 100, 114].forEach((y) => arbol(236, y));
  [148, 158, 168].forEach((x) => arbol(x, 97));
  [190, 205, 220].forEach((x) => arbol(x, 120));

  // Series de luces colgantes de la Calzada (segmentos entre postes).
  const luces = [];
  for (let y = 60; y < 156; y += 12) { luces.push([113, y, 131, y + 6]); luces.push([131, y + 6, 113, y + 12]); }
  for (let x = 60; x + 14 <= 174; x += 14) { luces.push([x, 41, x + 7, 55]); luces.push([x + 7, 55, x + 14, 41]); }

  // Puestos de comida sobre la Calzada.
  const puestos = [
    { pos: [115.5, 98], color: '#ff6b2c' },
    { pos: [128.5, 110], color: '#ff5fa2' },
    { pos: [115.5, 122], color: '#3d6bff' },
    { pos: [128.5, 134], color: '#1fb36b' },
    { pos: [115.5, 146], color: '#ffc31f' },
  ];

  // Mesas con sombrilla sobre la Calzada.
  const mesas = [[120, 70], [124, 102], [121, 140], [97, 48], [151, 48]];

  function contiene(zona, x, y) {
    const f = zona.forma;
    if (f.tipo === 'rect') return x >= f.x && x <= f.x + f.w && y >= f.y && y <= f.y + f.h;
    if (f.tipo === 'circ') return (x - f.cx) ** 2 + (y - f.cy) ** 2 <= f.r ** 2;
    let dentro = false; // poly: ray casting
    const p = f.puntos;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const [xi, yi] = p[i]; const [xj, yj] = p[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
    }
    return dentro;
  }

  // Color de tinta legible (negro o blanco) sobre un color de acento.
  function tinta(hex) {
    const n = parseInt(hex.slice(1), 16);
    const l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    return l < 0.55 ? '#ffffff' : '#141414';
  }

  window.LA_PERLA = {
    tinta,
    mundo: { ancho: 240, alto: 178, sitio: { ancho: 240, alto: 160 } },
    ICONOS, zonas, perlas, acertijos, arboles, luces, puestos, mesas, contiene,
    zona: (id) => zonas.find((z) => z.id === id),
  };
})();
