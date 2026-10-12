/*
  Datos compartidos por los dos prototipos del mapa de La Perla.

  Trazo tomado de los planos del directorio oficial (Planta baja, Nivel 1 y Nivel 2).
  Sistema de coordenadas: píxeles del plano de Nivel 1 (x hacia el oriente, y hacia el sur).
  Los planos de Planta baja y Nivel 2 venían a otra escala, así que se convierten con pb() y n2().

  Calles: Texcoco al norte y al oriente, Mariano Otero al sur.
  IMPORTANTE: la ubicación de las experiencias (Jardín, Cancha, Pabellón, etc.) dentro de las
  figuras de color del plano es una interpretación y debe confirmarse con la plaza.
*/
(function () {
  // ---------- Conversión de planos a un solo sistema ----------
  const pbPt = ([x, y]) => [Math.round((x - 114) / 0.84), Math.round((y - 89) / 0.84)];
  const n2Pt = ([x, y]) => [Math.round(0.62 * x - 35), Math.round(0.62 * y - 4.6)];
  const R = (x1, y1, x2, y2) => [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
  const pb = (p) => p.map(pbPt);
  const n2 = (p) => p.map(n2Pt);
  const n1 = (p) => p;

  // ---------- Categorías del directorio ----------
  const CATEGORIAS = {
    moda: { nombre: 'Moda y accesorios', color: '#ff5fa2' },
    comida: { nombre: 'Comida y café', color: '#ff6b2c' },
    deporte: { nombre: 'Deporte y calzado', color: '#3d6bff' },
    belleza: { nombre: 'Belleza y salud', color: '#a259ff' },
    tecnologia: { nombre: 'Tecnología', color: '#ffc31f' },
    hogar: { nombre: 'Hogar y regalos', color: '#1fb36b' },
    diversion: { nombre: 'Diversión y niños', color: '#7ccf3f' },
    servicios: { nombre: 'Servicios y bancos', color: '#8f8f8a' },
    ancla: { nombre: 'Tiendas ancla', color: '#141414' },
    local: { nombre: 'Local', color: '#d9d9d4' },
  };

  // ---------- Tiendas por nivel: [nombre, categoría, polígono] ----------
  const T = (n, c, p) => ({ nombre: n, cat: c, poly: p });

  const PLANTA_BAJA = [
    // Franja poniente (frente a la Calzada)
    T('The Cheesecake Factory', 'comida', pb([[172, 122], [219, 122], [219, 222], [158, 222], [158, 214], [165, 214], [165, 196], [172, 196]])),
    T('Campomar', 'comida', pb([[128, 297], [202, 297], [202, 378], [160, 378], [160, 340], [128, 340]])),
    T('Omigoto', 'comida', pb(R(153, 389, 202, 402))),
    T('Starbucks', 'comida', pb(R(153, 411, 202, 430))),
    T('Moshi Moshi', 'comida', pb([[138, 517], [138, 505], [150, 505], [150, 497], [170, 497], [170, 489], [188, 489], [188, 478], [202, 478], [202, 517]])),
    T('Lululemon', 'deporte', pb(R(135, 524, 202, 562))),
    T('Tous', 'moda', pb(R(143, 571, 202, 584))),
    T('Cotidiano', 'comida', pb([[143, 594], [202, 594], [202, 654], [153, 654], [153, 610], [143, 610]])),
    T('Brisket House', 'comida', pb(R(160, 664, 202, 680))),
    T('Mango', 'moda', pb([[128, 668], [150, 668], [150, 688], [202, 688], [202, 727], [128, 727]])),
    T('Nike', 'deporte', pb([[138, 818], [220, 818], [220, 928], [192, 928], [192, 983], [138, 983], [138, 937], [160, 937], [160, 900], [138, 900]])),
    T('Dockers', 'moda', pb(R(195, 933, 220, 983))),
    // Bloque norte-poniente
    T('', 'local', pb([[340, 97], [492, 97], [492, 123], [435, 123], [435, 150], [425, 150], [425, 165], [400, 165], [400, 225], [340, 225]])),
    T('Dione', 'moda', pb(R(408, 170, 433, 225))),
    T('Timberland', 'deporte', pb(R(441, 172, 466, 225))),
    T('Julio', 'moda', pb(R(475, 147, 500, 225))),
    T('MAC Cosmetics', 'belleza', pb(R(510, 162, 535, 203))),
    T('Tohhaa', 'comida', pb(R(517, 140, 536, 154))),
    T('The Flow Shop', 'moda', pb(R(508, 97, 535, 130))),
    T('', 'local', pb(R(607, 150, 632, 198))),
    // Columna central poniente
    T('Succo', 'comida', pb([[373, 316], [398, 316], [398, 350], [450, 350], [450, 380], [373, 380]])),
    T('Lenso', 'moda', pb(R(407, 316, 432, 342))),
    T('Swarovski', 'moda', pb(R(441, 316, 457, 342))),
    T("Women'Secret", 'moda', pb(R(467, 316, 498, 366))),
    T('Noro', 'comida', pb(R(373, 391, 492, 425))),
    T('Palominos', 'comida', pb(R(373, 435, 492, 470))),
    T('Zincolote', 'comida', pb(R(353, 480, 433, 497))),
    T('SSAM', 'moda', pb(R(353, 513, 425, 540))),
    T('Qúté Studio de Belleza', 'belleza', pb(R(353, 550, 425, 563))),
    T('iShop', 'tecnologia', pb(R(353, 573, 425, 605))),
    T('The North Face', 'deporte', pb(R(353, 617, 425, 632))),
    T('Adolfo Domínguez', 'moda', pb(R(353, 643, 401, 660))),
    T('Banana Republic', 'moda', pb([[353, 668], [401, 668], [401, 660], [433, 660], [433, 688], [409, 688], [409, 727], [353, 727]])),
    T('Bimba y Lola', 'moda', pb(R(411, 690, 433, 727))),
    T('Stop', 'moda', pb(R(509, 345, 532, 423))),
    T('Vans', 'deporte', pb(R(541, 345, 563, 398))),
    T('Huawei', 'tecnologia', pb(R(541, 405, 583, 423))),
    T('Innvictus', 'deporte', pb(R(593, 345, 633, 474))),
    T('Springfield', 'moda', pb([[645, 298], [668, 302], [668, 390], [645, 390]])),
    T('Cloe', 'moda', pb([[678, 322], [700, 345], [690, 358], [678, 350]])),
    T('Steve Madden', 'moda', pb([[684, 366], [712, 344], [722, 358], [692, 382]])),
    T('Aldo', 'moda', pb([[690, 392], [726, 368], [738, 381], [702, 405]])),
    T('Zolar', 'tecnologia', pb([[714, 412], [744, 392], [756, 405], [726, 419]])),
    T('Stradivarius', 'moda', pb([[650, 433], [762, 418], [778, 440], [780, 482], [650, 482]])),
    T('American Eagle', 'moda', pb([[630, 491], [762, 491], [770, 502], [770, 560], [630, 560]])),
    T('Zara', 'moda', pb([[443, 525], [598, 525], [598, 698], [500, 698], [500, 727], [443, 727]])),
    T('H&M', 'moda', pb([[608, 570], [776, 575], [700, 700], [672, 743], [643, 743], [608, 705]])),
    // Bloques nororiente
    T('C&A', 'moda', pb([[620, 117], [835, 103], [835, 128], [718, 224], [645, 224], [645, 138], [620, 138]])),
    T('Cuidado con el Perro', 'moda', pb([[722, 232], [848, 164], [880, 170], [880, 208], [790, 288]])),
    T('Mumuso', 'hogar', pb([[764, 276], [812, 250], [824, 262], [826, 278], [782, 294]])),
    T('47', 'moda', pb([[782, 300], [812, 284], [820, 294], [790, 308]])),
    T('Innovasport', 'deporte', pb([[795, 312], [920, 254], [996, 254], [996, 336], [905, 344], [840, 384]])),
    T('Santander', 'servicios', pb(R(1008, 255, 1103, 335))),
    T('Banamex', 'servicios', pb(R(1008, 372, 1053, 386))),
    T('', 'local', pb(R(1062, 372, 1103, 386))),
    T('Scotiabank', 'servicios', pb(R(1008, 397, 1103, 428))),
    T('Shasa', 'moda', pb([[842, 388], [935, 343], [970, 343], [970, 386], [878, 428]])),
    T('Pull & Bear', 'moda', pb([[878, 434], [940, 392], [968, 392], [998, 414], [998, 492], [915, 492]])),
    T("Chili's", 'comida', pb([[1008, 457], [1072, 457], [1072, 472], [1060, 492], [1008, 492]])),
    T('AT&T', 'tecnologia', pb(R(1082, 458, 1103, 475))),
    T('Sushi Factory', 'comida', pb([[1008, 549], [1058, 549], [1072, 560], [1072, 587], [1008, 587]])),
    T('Bershka', 'moda', pb([[878, 592], [915, 566], [998, 550], [998, 605], [870, 605]])),
    T('Pikolinos', 'moda', pb([[870, 607], [933, 607], [933, 652], [840, 652]])),
    T('Smart Bamboo', 'moda', pb(R(937, 607, 998, 652))),
    // Sur
    T('Massimo Dutti', 'moda', pb([[338, 818], [400, 818], [400, 905], [390, 905], [390, 930], [410, 930], [410, 958], [338, 958]])),
    T('Zara Home', 'hogar', pb(R(410, 818, 455, 933))),
    T('Oysho', 'moda', pb(R(466, 818, 503, 928))),
    T('GAP', 'moda', pb([[511, 845], [565, 845], [571, 850], [571, 920], [560, 920], [560, 948], [530, 948], [530, 940], [511, 940]])),
    T('Sfera', 'moda', pb([[605, 830], [648, 830], [648, 818], [683, 818], [683, 958], [620, 958], [620, 940], [605, 940]])),
    T('Liverpool', 'ancla', pb([[690, 818], [718, 818], [838, 660], [1005, 660], [1005, 597], [1103, 597], [1103, 958], [690, 958]])),
  ];

  const NIVEL_1 = [
    T('La Insurgente', 'comida', n1([[57, 14], [127, 14], [127, 28], [140, 28], [140, 80], [57, 80]])),
    T('York Pub', 'comida', n1(R(57, 91, 140, 139))),
    T('', 'local', n1(R(267, 9, 337, 139))),
    T('', 'local', n1([[340, 9], [460, 9], [460, 35], [390, 35], [390, 78], [348, 78], [348, 35], [340, 35]])),
    T('Outdoor & Adventure', 'deporte', n1(R(347, 90, 373, 139))),
    T('Gong Cha', 'comida', n1(R(383, 97, 397, 139))),
    T('GNC', 'belleza', n1(R(407, 97, 421, 139))),
    T('Europiel', 'belleza', n1(R(438, 54, 462, 110))),
    T('Sally Beauty', 'belleza', n1(R(471, 63, 501, 110))),
    T('Avo Beauty', 'belleza', n1(R(511, 58, 542, 110))),
    T('', 'local', n1([[470, 9], [500, 9], [500, 20], [542, 20], [542, 47], [478, 47], [478, 35], [470, 35]])),
    T('', 'local', n1([[553, 14], [622, 14], [622, 110], [588, 110], [588, 25], [553, 25]])),
    T('Black & Glow', 'belleza', n1([[633, 14], [700, 14], [700, 96], [655, 96], [655, 48], [633, 48]])),
    T('Lefties', 'moda', n1([[700, 14], [900, 17], [1021, 38], [1021, 133], [940, 133], [788, 246], [668, 110], [638, 110], [638, 100], [700, 100]])),
    T('Coppel', 'ancla', n1([[795, 258], [946, 143], [1171, 143], [1171, 241], [965, 241], [845, 325]])),
    T('', 'local', n1([[853, 330], [980, 252], [980, 352], [960, 352], [893, 398]])),
    T('', 'local', n1(R(992, 253, 1171, 353))),
    T('Aldo Conti', 'moda', n1([[903, 413], [940, 384], [962, 384], [962, 428], [935, 440]])),
    T('Miniso', 'hogar', n1([[941, 455], [972, 425], [972, 384], [996, 384], [996, 470], [955, 470]])),
    T('Thoro', 'moda', n1(R(1006, 372, 1063, 470))),
    T('', 'local', n1([[1081, 372], [1158, 372], [1158, 430], [1130, 438], [1105, 470], [1081, 470]])),
    T('La Vaka', 'comida', n1(R(13, 268, 87, 437))),
    T('Cortázar', 'moda', n1(R(323, 304, 397, 347))),
    T('', 'local', n1(R(323, 358, 397, 377))),
    T('Bombo', 'comida', n1([[323, 386], [420, 386], [420, 437], [412, 437], [412, 455], [323, 455]])),
    T('Gandhi', 'diversion', n1(R(305, 465, 412, 502))),
    T('Steren', 'tecnologia', n1(R(443, 325, 472, 376))),
    T('Game Planet', 'diversion', n1(R(482, 325, 498, 376))),
    T('GoX Multiverse', 'diversion', n1([[443, 389], [510, 389], [510, 325], [543, 325], [543, 382], [690, 382], [690, 447], [559, 447], [559, 425], [543, 425], [543, 487], [503, 487], [503, 447], [470, 430], [443, 430]])),
    T('Nutrisa', 'comida', n1(R(552, 325, 568, 362))),
    T('Ópticas Lux', 'servicios', n1(R(579, 325, 612, 362))),
    T('Bizzarro', 'moda', n1(R(622, 325, 656, 362))),
    T('Pandora', 'moda', n1([[665, 325], [690, 325], [698, 335], [685, 362], [665, 362]])),
    T('Natura', 'belleza', n1([[697, 355], [712, 338], [727, 362], [705, 368]])),
    T('LOB', 'moda', n1([[713, 376], [732, 372], [742, 386], [713, 386]])),
    T('Ben & Frank', 'servicios', n1([[720, 398], [750, 398], [760, 415], [720, 415]])),
    T('Mobo', 'moda', n1([[709, 428], [770, 428], [778, 447], [709, 447]])),
    T('Cantia', 'moda', n1(R(283, 520, 445, 565))),
    T('Martí', 'deporte', n1([[283, 575], [445, 575], [445, 648], [432, 648], [432, 675], [378, 675], [378, 660], [343, 660], [343, 675], [283, 675]])),
    T('Luuna', 'hogar', n1([[283, 683], [329, 683], [329, 695], [342, 695], [342, 708], [283, 708]])),
    T('Florsheim', 'moda', n1(R(283, 718, 317, 763))),
    T('', 'local', n1(R(327, 725, 342, 763))),
    T('Flexi', 'moda', n1(R(352, 693, 380, 763))),
    T('', 'local', n1(R(390, 693, 420, 763))),
    T('Frequent Flyer', 'moda', n1(R(430, 693, 454, 708))),
    T('Zara', 'moda', n1(R(463, 510, 578, 707))),
    T('H&M', 'moda', n1([[588, 466], [660, 466], [660, 575], [778, 575], [693, 707], [588, 707]])),
    T('Juguetibici', 'diversion', n1([[709, 466], [730, 466], [730, 482], [778, 482], [770, 510], [709, 510]])),
    T("Carter's", 'diversion', n1([[672, 466], [698, 466], [698, 520], [770, 520], [778, 565], [672, 565]])),
    T('Recoleta', 'comida', n1(R(45, 490, 103, 515))),
    T('Boxers Barber Shop', 'servicios', n1(R(63, 526, 103, 542))),
    T('SAS Shoes', 'moda', n1(R(45, 553, 103, 595))),
    T('Skechers', 'deporte', n1(R(45, 605, 103, 675))),
    T('MAJA', 'moda', n1([[22, 690], [55, 690], [55, 686], [103, 686], [103, 700], [22, 700]])),
    T('Femeie', 'moda', n1([[22, 709], [103, 712], [103, 727], [22, 727]])),
    T('', 'local', n1(R(14, 737, 103, 763))),
    T('Log-On', 'moda', n1([[903, 610], [955, 562], [1010, 562], [1010, 638], [945, 638], [945, 620], [903, 620]])),
    T('BalaBala', 'diversion', n1(R(1012, 562, 1063, 638))),
    T('Devlyn', 'servicios', n1([[877, 660], [895, 630], [934, 630], [934, 660]])),
    T('Pizza del Perro Negro', 'comida', n1([[1081, 562], [1105, 562], [1158, 595], [1158, 672], [1100, 672], [1100, 640], [1081, 640]])),
    T('Liverpool', 'ancla', n1([[668, 915], [860, 683], [1157, 683], [1157, 1038], [668, 1038]])),
    T('', 'local', n1([[24, 893], [125, 893], [125, 1050], [52, 1050], [52, 975], [40, 975], [40, 965], [24, 965]])),
    T('', 'local', n1([[267, 893], [342, 893], [342, 995], [410, 995], [410, 1020], [459, 1020], [459, 1050], [267, 1050]])),
    T('', 'local', n1(R(357, 893, 383, 946))),
    T('Michael Domit', 'moda', n1(R(394, 893, 420, 946))),
    T('', 'local', n1(R(431, 921, 459, 975))),
    T('Puma', 'deporte', n1([[469, 921], [541, 921], [541, 1000], [493, 1000], [493, 988], [469, 988]])),
    T('Studio F', 'moda', n1([[585, 921], [617, 921], [617, 1013], [593, 1013], [585, 1000]])),
    T('Plazapar', 'moda', n1(R(628, 921, 658, 1003))),
  ];

  const NIVEL_2 = [
    T('', 'local', n2(R(32, 44, 260, 228))),
    T('', 'local', n2([[469, 22], [655, 22], [655, 157], [720, 157], [720, 228], [469, 228]])),
    T('Just Jump', 'diversion', n2([[670, 25], [973, 25], [973, 56], [915, 56], [915, 181], [747, 181], [747, 130], [729, 130], [729, 60], [670, 60]])),
    T('', 'local', n2(R(990, 24, 1058, 99))),
    T('Supercolchones', 'hogar', n2(R(990, 116, 1058, 181))),
    T('', 'local', n2([[1062, 25], [1301, 25], [1301, 142], [1272, 142], [1166, 222], [1124, 181], [1085, 181], [1085, 153], [1098, 153], [1098, 76], [1062, 76]])),
    T('Inflalandia', 'diversion', n2([[1178, 236], [1279, 158], [1619, 158], [1619, 301], [1318, 301], [1265, 334]])),
    T('', 'local', n2([[1276, 349], [1325, 318], [1500, 318], [1500, 370], [1372, 370], [1324, 406]])),
    T('', 'local', n2([[1334, 422], [1380, 388], [1502, 388], [1502, 433], [1410, 433], [1367, 465]])),
    T('¡Recorcholis!', 'diversion', n2([[1377, 481], [1418, 450], [1518, 450], [1518, 401], [1534, 401], [1534, 333], [1664, 333], [1664, 266], [1832, 262], [1832, 576], [1761, 576], [1761, 538], [1697, 538], [1697, 566], [1565, 566], [1565, 628], [1473, 628]])),
    T('Fresh Salads', 'comida', n2(R(1581, 605, 1632, 628))),
    T('Qin Oriental', 'comida', n2(R(1648, 605, 1697, 628))),
    T('Calibu', 'comida', n2(R(1715, 636, 1764, 658))),
    T('Litali', 'comida', n2(R(1781, 636, 1832, 658))),
    T('Chicken House', 'comida', n2(R(1861, 636, 1895, 658))),
    T('Popeyes', 'comida', n2(R(1845, 920, 1895, 955))),
    T('Doña Tota', 'comida', n2([[1715, 1021], [1760, 1021], [1760, 1043], [1735, 1043], [1735, 1073], [1715, 1073]])),
    T('Panda Roll', 'comida', n2(R(1777, 1021, 1835, 1045))),
    T('Argentina Exp.', 'comida', n2(R(1864, 1021, 1892, 1054))),
    T('Kaneishi', 'comida', n2(R(1648, 1052, 1697, 1073))),
    T('Sun-Fa', 'comida', n2(R(1580, 1052, 1632, 1073))),
    T('KFC', 'comida', n2([[1445, 1100], [1475, 1052], [1563, 1052], [1563, 1100]])),
    T('Kids Stop', 'diversion', n2([[667, 437], [717, 437], [717, 481], [678, 481], [678, 553], [667, 553]])),
    T('', 'local', n2([[565, 494], [602, 494], [602, 437], [649, 437], [649, 567], [565, 567]])),
    T('', 'local', n2(R(531, 437, 585, 480))),
    T('Eternia', 'moda', n2(R(531, 495, 548, 535))),
    T('SNAPS', 'moda', n2(R(531, 553, 548, 602))),
    T('', 'local', n2(R(531, 618, 548, 670))),
    T('Punto Celular', 'tecnologia', n2(R(531, 687, 548, 720))),
    T('Pinkola', 'moda', n2(R(531, 737, 548, 770))),
    T('Todo Moda', 'moda', n2(R(531, 785, 548, 835))),
    T('Cinépolis', 'ancla', n2([[565, 583], [1168, 583], [1168, 1098], [703, 1098], [703, 1184], [565, 1184]])),
    T('Local de comida', 'comida', n2(R(747, 527, 782, 551))),
    T('Local de comida', 'comida', n2(R(797, 527, 847, 551))),
    T('Local de comida', 'comida', n2(R(864, 527, 914, 551))),
    T('Local de comida', 'comida', n2(R(930, 527, 980, 551))),
    T('Local de comida', 'comida', n2(R(997, 527, 1047, 551))),
    T('Local de comida', 'comida', n2(R(1063, 527, 1115, 551))),
    T('Local de comida', 'comida', n2([[1131, 527], [1178, 527], [1195, 551], [1131, 551]])),
    T('2Cap', 'moda', n2([[1207, 568], [1255, 636], [1240, 648], [1207, 648]])),
    T('Michoacana Delicatessen', 'comida', n2([[1207, 665], [1245, 665], [1265, 652], [1280, 676], [1280, 692], [1207, 692]])),
    T('Genki Poke', 'comida', n2(R(1207, 724, 1277, 780))),
    T("Carl's Jr", 'comida', n2(R(1207, 798, 1277, 956))),
    T('La Flor de Córdoba', 'comida', n2([[1207, 987], [1277, 987], [1277, 1012], [1268, 1020], [1250, 1007], [1207, 1007]])),
    T('', 'local', n2([[1207, 1025], [1250, 1025], [1260, 1035], [1207, 1110]])),
    T('Toutems', 'hogar', n2(R(730, 1130, 847, 1152))),
    T('AT&T', 'tecnologia', n2(R(864, 1130, 935, 1152))),
    T('', 'local', n2(R(952, 1130, 1023, 1152))),
    T('Santa Clara', 'comida', n2(R(1040, 1130, 1110, 1152))),
    T('Dolphy', 'comida', n2([[1127, 1130], [1193, 1130], [1178, 1152], [1127, 1152]])),
    T('Limited Edition', 'moda', n2(R(493, 1110, 555, 1129))),
    T('Moonskin', 'belleza', n2(R(493, 1131, 555, 1150))),
    T('Sharewow', 'moda', n2(R(493, 1166, 555, 1184))),
    T('Bhaang CBD Stores', 'belleza', n2(R(493, 1201, 563, 1221))),
    T('Antifashion', 'moda', n2(R(493, 1223, 563, 1243))),
    T('Coleccionistas y Autógrafos', 'diversion', n2(R(580, 1215, 638, 1243))),
    T('Óptica Jorge Lozano', 'servicios', n2(R(655, 1215, 718, 1243))),
    T('Dairy Queen', 'comida', n2(R(121, 547, 201, 570))),
    T('Treffen', 'comida', n2(R(56, 651, 201, 706))),
    T('Muay Thai', 'deporte', n2([[54, 818], [93, 818], [93, 798], [200, 798], [200, 856], [115, 856], [115, 920], [54, 920]])),
    T('', 'local', n2(R(56, 437, 124, 473))),
    T('', 'local', n2(R(142, 437, 201, 530))),
    T('', 'local', n2([[73, 553], [104, 553], [104, 587], [201, 587], [201, 622], [73, 622]])),
    T('', 'local', n2([[73, 936], [198, 936], [198, 1243], [73, 1243], [73, 1112], [102, 1112], [102, 1027], [73, 1027]])),
    T('', 'local', n2(R(74, 1450, 233, 1735))),
    T('', 'local', n2([[467, 1453], [587, 1453], [587, 1568], [560, 1568], [560, 1660], [600, 1660], [600, 1733], [467, 1733]])),
    T('', 'local', n2(R(617, 1453, 714, 1588))),
    T('', 'local', n2(R(732, 1512, 914, 1720))),
    T('', 'local', n2([[983, 1500], [1103, 1500], [1103, 1652], [1037, 1652], [1037, 1668], [998, 1668], [998, 1652], [983, 1652]])),
    T('Liverpool', 'ancla', n2([[1121, 1508], [1427, 1137], [1963, 1137], [1963, 1692], [1121, 1692]])),
  ];

  const NIVELES = [
    { id: 0, nombre: 'Planta baja', corto: 'PB', tiendas: PLANTA_BAJA },
    { id: 1, nombre: 'Nivel 1', corto: 'N1', tiendas: NIVEL_1 },
    { id: 2, nombre: 'Nivel 2', corto: 'N2', tiendas: NIVEL_2 },
  ];
  NIVELES.forEach((nv) => nv.tiendas.forEach((t, i) => { t.nivel = nv.id; t.id = `n${nv.id}-${i}`; }));

  // ---------- Espacios abiertos (huecos lilas del plano) ----------
  const ESPACIOS = {
    calzada: [[43, 163], [412, 163], [412, 242], [253, 242], [253, 712], [125, 712], [125, 242], [43, 242]],
    calzadaSur: [[125, 730], [249, 730], [249, 787], [415, 787], [415, 864], [44, 864], [44, 787], [125, 787]],
    plazaNorte: R(462, 138, 617, 297),
    plazaSur: R(462, 731, 617, 890),
    diagonalNE: [[667, 165], [684, 165], [861, 405], [785, 405], [667, 245]],
    diagonalSE: [[667, 785], [785, 625], [861, 625], [684, 865], [667, 865]],
    rotonda: { cx: 862, cy: 514, r: 72 },
  };

  // ---------- Calles ----------
  const CALLES = [
    { nombre: 'TEXCOCO', poly: R(-80, -95, 1300, -25), eje: 'x' },
    { nombre: 'TEXCOCO', poly: R(1200, -95, 1275, 1160), eje: 'y' },
    { nombre: 'MARIANO OTERO', poly: R(-80, 1080, 1300, 1150), eje: 'x' },
  ];

  // ---------- Íconos de línea (24×24, solo paths para SVG y Canvas) ----------
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
    star: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6-4.5-4.2 6.1-.7z',
  };

  // ---------- Experiencias (cada una con su minijuego) ----------
  // forma: polígono o círculo en coordenadas del plano. acceso: punto donde está la estación de juego.
  const zonas = [
    {
      id: 'calzada', nombre: 'Calzada La Perla', categoria: 'Paseo y comida', icono: 'walk', acento: '#ff6b2c', nivel: 0,
      forma: { tipo: 'poly', puntos: ESPACIOS.calzada }, pin: [189, 400], acceso: [189, 450],
      juego: 'luces', m2: '3,207 m²', horario: null,
      desc: 'Espacio público 100% peatonal, sin autos, para reunirse, comer y divertirse: antojitos locales, cafés y restaurantes al aire libre.',
      datos: ['100% peatonal', 'Antojitos y cafés', 'Funciones familiares'],
    },
    {
      id: 'jardin', nombre: 'El Jardín', categoria: 'Naturaleza', icono: 'fountain', acento: '#1fb36b', nivel: 0,
      forma: { tipo: 'circ', cx: ESPACIOS.rotonda.cx, cy: ESPACIOS.rotonda.cy, r: ESPACIOS.rotonda.r }, pin: [862, 514], acceso: [862, 600],
      juego: 'jardin', m2: '490.80 m²', horario: null,
      desc: 'Un jardín en el corazón de La Perla. Una pasarela te acerca hasta su fuente de chorro vertical: un lugar para reunirse, pasear y tomar un respiro.',
      datos: ['Fuente de chorro vertical', 'Pasarela', 'Zona de descanso'],
    },
    {
      id: 'cancha', nombre: 'La Cancha', categoria: 'Deporte', icono: 'ball', acento: '#3d6bff', nivel: 0,
      forma: { tipo: 'poly', puntos: pb(R(527, 225, 618, 312)) }, pin: pbPt([572, 268]), acceso: pbPt([572, 322]),
      juego: 'tiro', m2: '218 m²', horario: 'Abierta al público · consulta horarios de clases',
      desc: 'Cancha de básquetbol 3x3 para juegos, clases y torneos, con gradas, aro profesional y marcador digital.',
      datos: ['Básquet 3x3', 'Máx. 12 personas', 'Torneos abiertos'],
    },
    {
      id: 'pabellon', nombre: 'El Pabellón', categoria: 'Arte y cultura', icono: 'pavilion', acento: '#c9864a', nivel: 0,
      forma: { tipo: 'poly', puntos: pb(R(520, 720, 618, 818)) }, pin: pbPt([569, 769]), acceso: pbPt([569, 710]),
      juego: 'obra', m2: '350 m²', horario: null,
      desc: 'Estructura de madera pensada como centro de inspiración y creatividad: exposiciones y venta de obra de artistas y artesanos.',
      datos: ['Exposiciones', 'Artistas y artesanos', 'Intercambio cultural'],
    },
    {
      id: 'rampas', nombre: 'Las Rampas', categoria: 'Deporte', icono: 'skate', acento: '#ffc31f', nivel: 0,
      forma: { tipo: 'poly', puntos: pb([[124, 750], [222, 750], [238, 756], [248, 768], [250, 778], [248, 790], [238, 800], [222, 805], [124, 805]]) }, pin: pbPt([185, 777]), acceso: pbPt([270, 777]),
      juego: 'truco', m2: '203.64 m²', horario: 'L–V 10:00–17:00 · L, J y V 19:00–22:00 · S y D 15:00–22:00',
      desc: 'Skate park para principiantes y expertos, con picos pronunciados y curvas fluidas para trucos y saltos.',
      datos: ['Casco obligatorio', 'Solo patinetas', 'Máx. 10 personas'],
    },
    {
      id: 'canino', nombre: 'Club Canino', categoria: 'Pet friendly', icono: 'paw', acento: '#7ccf3f', nivel: 0,
      forma: { tipo: 'circ', cx: pbPt([180, 262])[0], cy: pbPt([180, 262])[1], r: 36 }, pin: pbPt([180, 262]), acceso: pbPt([225, 262]),
      juego: 'agilidad', m2: '218 m²', horario: 'Todos los días · 10:00 – 20:30',
      desc: 'Espacio para perros grandes y chicos, con mobiliario para jugar y ejercitarse. Parte del programa Manada Segura®.',
      datos: ['Correa y collar', 'Estaciones de limpieza', 'Manada Segura®'],
    },
    {
      id: 'patio', nombre: 'El Patio', categoria: 'Niñas y niños', icono: 'kids', acento: '#ff5fa2', nivel: 0,
      forma: { tipo: 'poly', puntos: ESPACIOS.diagonalNE }, pin: [745, 290], acceso: [735, 300], vista: [774, 338],
      juego: 'columpio', m2: '479 m²', horario: 'Todos los días · 11:00 – 21:00',
      desc: 'Área de juegos para peques, con piso acolchado para jugar con seguridad. En su nivel 1 está el Foro Urbano.',
      datos: ['De 5 a 11 años', 'Estatura máx. 1.50 m', 'Siempre con un adulto'],
    },
    {
      id: 'foro', nombre: 'Foro Abierto', categoria: 'Eventos', icono: 'stage', acento: '#a259ff', nivel: 0,
      forma: { tipo: 'poly', puntos: ESPACIOS.diagonalSE }, pin: [745, 760], acceso: [725, 792],
      juego: 'ritmo', m2: null, horario: 'Según cartelera de eventos',
      desc: 'Escenario al aire libre para conciertos, funciones y fiestas de temporada.',
      datos: ['Conciertos', 'Eventos de temporada'],
    },
    {
      id: 'mercado', nombre: 'Mercado La Perla', categoria: 'Comida', icono: 'food', acento: '#ff9f1c', nivel: 2,
      forma: { tipo: 'poly', puntos: n2([[1440, 690], [1900, 690], [1900, 1010], [1440, 1010]]) }, pin: n2Pt([1670, 850]), acceso: n2Pt([1600, 850]),
      juego: 'horapico', m2: null, horario: null,
      desc: 'La terraza gastronómica de La Perla en el Nivel 2: delicias que no te puedes perder, todas en un mismo lugar.',
      datos: ['Terraza gastronómica', 'Nivel 2'],
    },
    {
      id: 'cinepolis', nombre: 'Cinépolis', categoria: 'Entretenimiento', icono: 'film', acento: '#ff3b3b', nivel: 2, tienda: 'Cinépolis',
      forma: null, pin: n2Pt([866, 840]), acceso: pbPt([780, 540]),
      juego: 'palomitas', m2: null, horario: null,
      desc: 'El cine de La Perla, en el Nivel 2: estrenos, palomitas y planes de fin de semana.',
      datos: ['Nivel 2', 'Ancla de entretenimiento'],
    },
    {
      id: 'liverpool', nombre: 'Liverpool', categoria: 'Tienda ancla', icono: 'bag', acento: '#ff5fa2', nivel: 0, tienda: 'Liverpool',
      forma: null, pin: [930, 850], acceso: [820, 692],
      juego: 'outfit', m2: null, horario: null,
      desc: 'Tienda departamental ancla de La Perla, en sus tres niveles. Llegó desde Plaza del Sol, donde abrió en 1969.',
      datos: ['Tienda ancla', 'Planta baja, Nivel 1 y 2'],
    },
  ];

  // Árboles en espacios abiertos y banquetas
  const arboles = [];
  for (let x = -40; x <= 1180; x += 55) { arboles.push([x, -14]); arboles.push([x, 1068]); }
  for (let y = 20; y <= 1050; y += 55) arboles.push([1188, y]);
  for (let y = 260; y <= 700; y += 48) { arboles.push([137, y]); arboles.push([241, y]); }
  [[60, 175], [110, 230], [300, 175], [380, 230], [80, 845], [200, 845], [330, 800], [400, 845]].forEach((p) => arboles.push(p));
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; arboles.push([862 + Math.cos(a) * 92, 514 + Math.sin(a) * 92]); }

  // Acertijos para "¿Dónde está?"
  const acertijos = [
    { tienda: 'Gandhi', nivel: 1, pista: '¿Dónde compras libros y discos?' },
    { tienda: 'Cinépolis', nivel: 2, pista: '¿Dónde ves los estrenos?' },
    { tienda: 'Starbucks', nivel: 0, pista: 'Un café sobre la Calzada.' },
    { tienda: 'Zara', nivel: 0, pista: 'La tienda de moda más grande de la planta baja.' },
    { tienda: '¡Recorcholis!', nivel: 2, pista: 'Videojuegos y premios en el Nivel 2.' },
    { tienda: 'Nike', nivel: 0, pista: 'Tenis y ropa deportiva junto a Mariano Otero.' },
    { tienda: 'Miniso', nivel: 1, pista: 'Regalitos y cosas para tu casa en el Nivel 1.' },
    { tienda: 'KFC', nivel: 2, pista: 'Pollo frito en la terraza del Nivel 2.' },
    { tienda: 'Steren', nivel: 1, pista: 'Cables, bocinas y gadgets.' },
    { tienda: 'Innovasport', nivel: 0, pista: 'Artículos deportivos rumbo a Texcoco.' },
    { tienda: 'Just Jump', nivel: 2, pista: 'Trampolines en el Nivel 2.' },
    { tienda: 'Sushi Factory', nivel: 0, pista: 'Sushi frente a Texcoco.' },
    { zona: 'jardin', pista: 'La fuente de chorro vertical.' },
    { zona: 'cancha', pista: 'Aquí se juega básquet 3x3.' },
    { zona: 'rampas', pista: 'Casco obligatorio y solo patinetas.' },
    { zona: 'canino', pista: 'Tu perro juega aquí de 10:00 a 20:30.' },
  ];

  function enPoligono(p, x, y) {
    let dentro = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const [xi, yi] = p[i]; const [xj, yj] = p[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
    }
    return dentro;
  }
  function contiene(zona, x, y) {
    const f = zona.forma;
    if (!f) return false;
    if (f.tipo === 'circ') return (x - f.cx) ** 2 + (y - f.cy) ** 2 <= f.r ** 2;
    return enPoligono(f.puntos, x, y);
  }
  function centroide(p) {
    let a = 0, cx = 0, cy = 0;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const f = p[j][0] * p[i][1] - p[i][0] * p[j][1];
      a += f; cx += (p[j][0] + p[i][0]) * f; cy += (p[j][1] + p[i][1]) * f;
    }
    if (Math.abs(a) < 1e-6) return p[0];
    return [cx / (3 * a), cy / (3 * a)];
  }
  function area(p) {
    let a = 0;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += p[j][0] * p[i][1] - p[i][0] * p[j][1];
    return Math.abs(a / 2);
  }
  NIVELES.forEach((nv) => nv.tiendas.forEach((t) => { t.centro = centroide(t.poly); t.area = area(t.poly); }));

  function tinta(hex) {
    const n = parseInt(hex.slice(1), 16);
    const l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    return l < 0.55 ? '#ffffff' : '#141414';
  }

  window.LA_PERLA = {
    NIVELES, CATEGORIAS, ESPACIOS, CALLES, ICONOS, zonas, arboles, acertijos,
    contiene, enPoligono, centroide, tinta,
    zona: (id) => zonas.find((z) => z.id === id),
    buscarTienda: (nombre, nivel) => NIVELES[nivel].tiendas.find((t) => t.nombre === nombre),
    todasLasTiendas: () => NIVELES.flatMap((nv) => nv.tiendas.filter((t) => t.nombre)),
    limites: { x1: -90, y1: -110, x2: 1290, y2: 1165 },
  };
})();
