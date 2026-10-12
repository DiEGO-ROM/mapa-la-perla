/*
  Escena 3D compartida de La Perla (la usan el mapa isométrico y el recorrido en primera persona).
  Construye calles, pisos, edificios de los tres niveles a partir de datos-zonas.js y la utilería
  de cada experiencia (fuente, cancha, rampas, pabellón, etc.).
*/
import * as THREE from 'three';

const S = 0.2;                 // unidades 3D por píxel del plano
const ALTO_NIVEL = 5.4;        // altura de cada nivel
const ALTO_LOCAL = 4.4;        // altura del volumen de cada local
export const X = (px) => (px - 600) * S;
export const Z = (py) => (py - 520) * S;
export const aPlano = (x, z) => [x / S + 600, z / S + 520];
export const MUNDO = { S, ALTO_NIVEL, ALTO_LOCAL };

const COLOR_TIENDA = { Liverpool: '#ff4fa0', Coppel: '#ffd23f', 'Cinépolis': '#3d6bff' };
const INK = '#141414';

function lienzo(w, h, dibujar, repetir) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  dibujar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repetir) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repetir[0], repetir[1]); }
  return t;
}
function baldosa(base, linea, celdas = 4) {
  return lienzo(128, 128, (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = linea; ctx.lineWidth = 3;
    const p = w / celdas;
    for (let i = 0; i <= celdas; i++) {
      ctx.beginPath(); ctx.moveTo(i * p, 0); ctx.lineTo(i * p, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * p); ctx.lineTo(w, i * p); ctx.stroke();
    }
  }, [1, 1]);
}
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .78, ...extra });
const basico = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, toneMapped: false, ...extra });

function forma(puntos) {
  return new THREE.Shape(puntos.map(([x, y]) => new THREE.Vector2(X(x), -Z(y))));
}
function sueloPoligono(puntos, material, y, padre) {
  const g = new THREE.ShapeGeometry(forma(puntos));
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, material);
  m.position.y = y; m.receiveShadow = true;
  padre.add(m);
  return m;
}
function sueloCirculo(cx, cy, r, material, y, padre, r0 = 0) {
  const g = r0 ? new THREE.RingGeometry(r0 * S, r * S, 64) : new THREE.CircleGeometry(r * S, 64);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, material);
  m.position.set(X(cx), y, Z(cy)); m.receiveShadow = true;
  padre.add(m);
  return m;
}
function malla(geo, mat, x, y, z, padre, sombra = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (sombra) { m.castShadow = true; m.receiveShadow = true; }
  padre.add(m);
  return m;
}
const caja = (w, h, d, mat, x, y, z, padre) => malla(new THREE.BoxGeometry(w, h, d), mat, x, y, z, padre);
function bordes(geo, padre, pos, opacidad = 1) {
  const l = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 35), new THREE.LineBasicMaterial({ color: INK, transparent: opacidad < 1, opacity: opacidad }));
  if (pos) l.position.copy(pos);
  padre.add(l);
  return l;
}
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function crearPlaza(D, { modo = 'iso', movil = false } = {}) {
  const scene = new THREE.Scene();
  const raiz = new THREE.Group();
  scene.add(raiz);
  const animados = [];
  const pickables = [];
  const obstaculos = [];      // polígonos en coordenadas de plano (solo planta baja)
  const circulos = [];        // { x, y, r } en plano
  const nocturnos = [];       // { mat, dia, noche } para el modo noche
  const estaciones = [];

  // ---------- Luz ----------
  const hemi = new THREE.HemisphereLight('#ffffff', '#c9c2b0', 1.25);
  scene.add(hemi);
  const sol = new THREE.DirectionalLight('#fff3dc', 2.4);
  sol.position.set(-70, 120, 60);
  sol.castShadow = true;
  sol.shadow.mapSize.set(movil ? 1024 : 2048, movil ? 1024 : 2048);
  Object.assign(sol.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 10, far: 400 });
  sol.shadow.bias = -0.0006;
  sol.shadow.normalBias = 0.05;
  scene.add(sol, sol.target);

  // ---------- Suelo, calles y espacios abiertos ----------
  const suelo = new THREE.Group();
  raiz.add(suelo);
  const pasto = std('#bfe39f', { roughness: 1 });
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), pasto);
  piso.position.y = -0.06; piso.receiveShadow = true; suelo.add(piso);

  const L = D.limites;
  const texPiso = baldosa('#f4f1ea', '#e6e1d6', 4); texPiso.repeat.set(1 / 8, 1 / 8);
  sueloPoligono([[L.x1 + 40, -18], [1190, -18], [1190, 1072], [L.x1 + 40, 1072]], std('#ffffff', { map: texPiso, roughness: .95 }), 0, suelo);

  const asfalto = std('#3b3c42', { roughness: .95 });
  D.CALLES.forEach((c) => {
    sueloPoligono(c.poly, asfalto, 0.01, suelo);
    const [[x1, y1], , [x2, y2]] = c.poly;
    const raya = basico('#f5f2ea');
    if (c.eje === 'x') {
      const ym = (y1 + y2) / 2;
      for (let x = x1 + 10; x < x2 - 10; x += 40) caja(16 * S, .02, 1.6 * S, raya, X(x + 8), .04, Z(ym), suelo).castShadow = false;
    } else {
      const xm = (x1 + x2) / 2;
      for (let y = y1 + 10; y < y2 - 10; y += 40) caja(1.6 * S, .02, 16 * S, raya, X(xm), .04, Z(y + 8), suelo).castShadow = false;
    }
  });
  // banquetas
  const banqueta = std('#dcd7cc', { roughness: .95 });
  sueloPoligono([[L.x1 + 40, -25], [1200, -25], [1200, -18], [L.x1 + 40, -18]], banqueta, .03, suelo);
  sueloPoligono([[L.x1 + 40, 1072], [1200, 1072], [1200, 1080], [L.x1 + 40, 1080]], banqueta, .03, suelo);
  sueloPoligono([[1190, -25], [1200, -25], [1200, 1080], [1190, 1080]], banqueta, .03, suelo);

  const E = D.ESPACIOS;
  const texCalzada = baldosa('#ffd9c6', '#ffbf9f', 4); texCalzada.repeat.set(.25, .25);
  const matCalzada = std('#ffffff', { map: texCalzada, roughness: .9 });
  sueloPoligono(E.calzada, matCalzada, .05, suelo);
  sueloPoligono(E.calzadaSur, matCalzada, .05, suelo);
  const texPlaza = baldosa('#f7f3ea', '#e2dccd', 2); texPlaza.repeat.set(.2, .2);
  sueloPoligono(E.plazaNorte, std('#ffffff', { map: texPlaza }), .05, suelo);
  sueloPoligono(E.plazaSur, std('#ffffff', { map: texPlaza }), .05, suelo);
  const texPatio = baldosa('#ffd4e7', '#ffb3d3', 3); texPatio.repeat.set(.25, .25);
  sueloPoligono(E.diagonalNE, std('#ffffff', { map: texPatio }), .05, suelo);
  const texForo = baldosa('#ead9ff', '#d6bcff', 3); texForo.repeat.set(.25, .25);
  sueloPoligono(E.diagonalSE, std('#ffffff', { map: texForo }), .05, suelo);

  // ---------- Edificios por nivel ----------
  const niveles = [0, 1, 2].map(() => { const g = new THREE.Group(); raiz.add(g); return g; });
  const gris = [std('#e9e9e4'), std('#c9c9c3')];
  const cacheMat = {};
  function materialesDe(t) {
    const color = COLOR_TIENDA[t.nombre] || D.CATEGORIAS[t.cat].color;
    const k = `${color}`;
    if (!cacheMat[k]) {
      const lateral = new THREE.Color(color);
      if (t.cat !== 'ancla') lateral.lerp(new THREE.Color('#ffffff'), t.cat === 'local' ? 0 : .12);
      const techo = new THREE.Color(color).lerp(new THREE.Color('#ffffff'), t.cat === 'local' ? .5 : t.cat === 'ancla' ? .55 : .62);
      cacheMat[k] = [std(techo, { roughness: .7 }), std(lateral, { roughness: .6 })];
    }
    return cacheMat[k];
  }
  const tiendasMallas = [];
  D.NIVELES.forEach((nv) => {
    nv.tiendas.forEach((t) => {
      const alto = t.cat === 'ancla' ? ALTO_LOCAL + .6 : t.cat === 'local' ? ALTO_LOCAL - .6 : ALTO_LOCAL;
      const geo = new THREE.ExtrudeGeometry(forma(t.poly), { depth: alto, bevelEnabled: true, bevelThickness: .18, bevelSize: .18, bevelSegments: 1 });
      geo.rotateX(-Math.PI / 2);
      const mats = materialesDe(t);
      const m = new THREE.Mesh(geo, mats);
      m.position.y = nv.id * ALTO_NIVEL + .18;
      m.castShadow = true; m.receiveShadow = true;
      m.userData = { tienda: t, mats, nivel: nv.id };
      niveles[nv.id].add(m);
      const b = bordes(geo, niveles[nv.id], m.position, .9);
      m.userData.bordes = b;
      if (t.nombre) pickables.push(m);
      tiendasMallas.push(m);
      // toldo de color sobre los locales con nombre (detalle "de juguete")
      if (t.nombre && t.cat !== 'ancla' && t.area > 600) {
        const toldo = new THREE.Mesh(new THREE.ExtrudeGeometry(forma(t.poly), { depth: .35, bevelEnabled: false }).rotateX(-Math.PI / 2), std(D.CATEGORIAS[t.cat].color, { roughness: .5 }));
        toldo.scale.set(.82, 1, .82);
        const c = new THREE.Vector3(X(t.centro[0]), 0, Z(t.centro[1]));
        toldo.position.set(c.x * .18, nv.id * ALTO_NIVEL + alto + .35, c.z * .18);
        toldo.castShadow = true;
        niveles[nv.id].add(toldo);
        m.userData.toldo = toldo;
      }
      if (nv.id === 0 && t.nombre !== 'Liverpool') obstaculos.push(t.poly);
      if (nv.id === 0 && t.nombre === 'Liverpool') obstaculos.push(t.poly);
      // ventanas que se encienden de noche (solo frentes de planta baja)
    });
  });
  // Losa de cada nivel superior bajo sus locales (pasillos interiores)
  const matLosa = std('#ece8df');

  // ---------- Utilería de cada experiencia ----------
  const props = new THREE.Group();
  niveles[0].add(props);
  const madera = std('#c9864a'); const maderaClara = std('#e8b77e'); const metal = std('#4a4d55', { metalness: .4, roughness: .45 });
  const blanco = std('#ffffff'); const agua = std('#5ec4ff', { roughness: .1, metalness: .1, transparent: true, opacity: .9 });

  // El Jardín (rotonda)
  {
    const r = E.rotonda;
    sueloCirculo(r.cx, r.cy, r.r, std('#7fd18c', { roughness: 1 }), .07, props);
    sueloCirculo(r.cx, r.cy, r.r * .62, std('#ffffff'), .09, props, r.r * .5);
    const fx = X(r.cx), fz = Z(r.cy);
    malla(new THREE.CylinderGeometry(4.2, 4.5, .9, 40), std('#f1ece2'), fx, .45, fz, props);
    malla(new THREE.CylinderGeometry(3.8, 3.8, .2, 40), agua, fx, .85, fz, props, false);
    const chorro = malla(new THREE.CylinderGeometry(.18, .55, 6, 12, 1, true), std('#bfeaff', { transparent: true, opacity: .75, roughness: .1 }), fx, 3.8, fz, props, false);
    const copete = malla(new THREE.SphereGeometry(1.1, 16, 10), std('#d9f4ff', { transparent: true, opacity: .7 }), fx, 6.8, fz, props, false);
    animados.push((dt, t) => { const k = 1 + Math.sin(t * 6) * .06; chorro.scale.set(1, k, 1); copete.position.y = 6.6 + Math.sin(t * 6) * .3; });
    circulos.push({ x: r.cx, y: r.cy, r: 24 });
    const flores = ['#ff5fa2', '#ffc31f', '#ff6b2c', '#a259ff', '#ffffff'];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2, rr = r.r * .82 * S;
      malla(new THREE.IcosahedronGeometry(.55, 0), std(flores[i % 5]), fx + Math.cos(a) * rr, .5, fz + Math.sin(a) * rr, props);
    }
  }
  // La Cancha
  {
    const z = D.zona('cancha'); const [[x1, y1], , [x2, y2]] = z.forma.puntos;
    const w = (x2 - x1) * S, h = (y2 - y1) * S, cx = X((x1 + x2) / 2), cz = Z((y1 + y2) / 2);
    const tex = lienzo(512, 512, (ctx, W, H) => {
      ctx.fillStyle = '#3d6bff'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.strokeRect(24, 24, W - 48, H - 48);
      ctx.strokeRect(W / 2 - 70, 24, 140, 180);
      ctx.beginPath(); ctx.arc(W / 2, 204, 60, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(W / 2, 60, 200, .15 * Math.PI, .85 * Math.PI); ctx.stroke();
    });
    const piso = new THREE.Mesh(new THREE.PlaneGeometry(w * .9, h * .9).rotateX(-Math.PI / 2), std('#ffffff', { map: tex }));
    piso.position.set(cx, .08, cz); piso.receiveShadow = true; props.add(piso);
    caja(.35, 4.2, .35, metal, cx, 2.1, cz - h * .45, props);
    caja(2.6, 1.6, .15, blanco, cx, 4, cz - h * .42, props);
    const aro = malla(new THREE.TorusGeometry(.42, .06, 8, 20), std('#ff6b2c'), cx, 3.5, cz - h * .37, props);
    aro.rotation.x = Math.PI / 2;
    [0, 1, 2].forEach((i) => caja(w * .7, .5 * (i + 1), 1.2, std(['#ffffff', '#ffc31f', '#ffffff'][i]), cx, .25 * (i + 1), cz + h * .38 + i * 1.2, props));
  }
  // El Pabellón
  {
    const z = D.zona('pabellon'); const [[x1, y1], , [x2, y2]] = z.forma.puntos;
    const w = (x2 - x1) * S, h = (y2 - y1) * S, cx = X((x1 + x2) / 2), cz = Z((y1 + y2) / 2);
    const texMad = baldosa('#e8b77e', '#c9864a', 6); texMad.repeat.set(1, 1);
    const pisoP = new THREE.Mesh(new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2), std('#ffffff', { map: texMad }));
    pisoP.position.set(cx, .09, cz); pisoP.receiveShadow = true; props.add(pisoP);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => caja(.7, 6, .7, madera, cx + a * w * .44, 3, cz + b * h * .44, props));
    for (let i = 0; i < 14; i++) caja(.35, .5, h * .95, maderaClara, cx - w * .46 + i * (w * .92 / 13), 6.2, cz, props);
    caja(w * .95, .45, .6, madera, cx, 5.9, cz - h * .44, props); caja(w * .95, .45, .6, madera, cx, 5.9, cz + h * .44, props);
    [[-.2, -.15, '#ff5fa2'], [.2, .1, '#3d6bff'], [-.1, .25, '#ffc31f']].forEach(([a, b, c]) => {
      caja(2.6, 1, 1.2, maderaClara, cx + a * w, .5, cz + b * h, props);
      caja(1.2, 1.4, .1, std(c), cx + a * w, 1.8, cz + b * h, props);
    });
  }
  // Las Rampas
  {
    const z = D.zona('rampas');
    sueloPoligono(z.forma.puntos, std('#ffe28a', { roughness: .8 }), .07, props);
    const [cx, cy] = D.centroide(z.forma.puntos);
    const R = 2.4, P = 1.2, A = 9;
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(R + P, 0); s.lineTo(R + P, R); s.lineTo(R, R); s.absarc(0, R, R, 0, -Math.PI / 2, true);
    const g = new THREE.ExtrudeGeometry(s, { depth: A, bevelEnabled: false, curveSegments: 14 }); g.translate(0, 0, -A / 2);
    const conc = std('#d9dbe0', { roughness: .6 });
    const r1 = malla(g, conc, X(cx) - 7, 0, Z(cy), props); r1.rotation.y = Math.PI; r1.position.x = X(cx) - 12 + R + P;
    const r2 = malla(g, conc, X(cx) + 12 - R - P, 0, Z(cy), props);
    caja(5, .9, 3, std('#ff6b2c'), X(cx), .45, Z(cy), props);
    const riel = malla(new THREE.CylinderGeometry(.08, .08, 6, 8), metal, X(cx), .7, Z(cy) + 3.4, props); riel.rotation.z = Math.PI / 2;
    obstaculos.push([[cx - 60, cy - 24], [cx - 42, cy - 24], [cx - 42, cy + 24], [cx - 60, cy + 24]]);
    obstaculos.push([[cx + 42, cy - 24], [cx + 60, cy - 24], [cx + 60, cy + 24], [cx + 42, cy + 24]]);
  }
  // Club Canino
  {
    const z = D.zona('canino'); const f = z.forma;
    sueloCirculo(f.cx, f.cy, f.r, std('#a8e07a', { roughness: 1 }), .07, props);
    const n = 26;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      if (a > -.4 && a < .4) continue; // entrada hacia la Calzada
      caja(.18, 1.2, .18, blanco, X(f.cx) + Math.cos(a) * f.r * S, .6, Z(f.cy) + Math.sin(a) * f.r * S, props);
    }
    const casa = new THREE.Group(); casa.position.set(X(f.cx) - 2, 0, Z(f.cy) - 1.5); props.add(casa);
    caja(2.4, 1.6, 2, std('#c9864a'), 0, .8, 0, casa);
    const techo = malla(new THREE.ConeGeometry(1.9, 1.1, 4), std('#ff6b2c'), 0, 2.15, 0, casa); techo.rotation.y = Math.PI / 4;
    const perros = ['#c8955c', '#f4f1ea', '#3a3330'].map((c, i) => {
      const g2 = new THREE.Group();
      const m = std(c);
      caja(1.1, .5, .45, m, 0, .65, 0, g2); caja(.42, .4, .38, m, .62, .92, 0, g2); caja(.4, .1, .1, m, -.68, .85, 0, g2);
      [[.38, .15], [.38, -.15], [-.38, .15], [-.38, -.15]].forEach(([a, b]) => caja(.12, .42, .12, m, a, .21, b, g2));
      props.add(g2);
      const r0 = 2 + i * 1.3, w0 = (i % 2 ? -1 : 1) * (.7 + i * .2);
      animados.push((dt, t) => {
        const a = t * w0 + i * 2;
        g2.position.set(X(f.cx) + 1.2 + Math.cos(a) * r0, Math.abs(Math.sin(t * 9 + i)) * .12, Z(f.cy) + 1 + Math.sin(a) * r0);
        g2.rotation.y = Math.atan2(-Math.cos(a) * w0, -Math.sin(a) * w0);
      });
      return g2;
    });
    circulos.push({ x: f.cx - 10, y: f.cy - 7, r: 8 });
  }
  // Calzada: puestos, mesas y series de luces
  const focos = [];
  {
    const puestos = [[150, 300, '#ff6b2c'], [228, 360, '#ff5fa2'], [150, 430, '#3d6bff'], [228, 500, '#1fb36b'], [150, 570, '#ffc31f'], [228, 640, '#a259ff']];
    puestos.forEach(([x, y, c]) => {
      const g = new THREE.Group(); g.position.set(X(x), 0, Z(y)); g.rotation.y = x < 189 ? Math.PI / 2 : -Math.PI / 2; props.add(g);
      caja(3, 2.2, 2.4, std('#c9864a'), 0, 1.1, -.2, g);
      caja(3.1, .9, .5, std(c), 0, .45, 1.1, g);
      const t = caja(3.5, .12, 1.8, std(c), 0, 2.5, .8, g); t.rotation.x = .3;
      caja(3.4, .25, 2.8, std(c), 0, 2.35, -.2, g);
      obstaculos.push([[x - 9, y - 9], [x + 9, y - 9], [x + 9, y + 9], [x - 9, y + 9]]);
    });
    [[189, 330], [189, 470], [189, 610], [100, 200], [330, 200], [300, 825], [150, 825]].forEach(([x, y], i) => {
      const g = new THREE.Group(); g.position.set(X(x), 0, Z(y)); props.add(g);
      malla(new THREE.CylinderGeometry(.7, .7, .08, 16), blanco, 0, .78, 0, g);
      malla(new THREE.CylinderGeometry(.05, .05, 2.4, 6), metal, 0, 1.2, 0, g);
      malla(new THREE.ConeGeometry(1.7, .6, 8), std(['#ff6b2c', '#3d6bff', '#ff5fa2', '#1fb36b', '#ffc31f', '#a259ff', '#ff6b2c'][i]), 0, 2.45, 0, g);
      circulos.push({ x, y, r: 5 });
    });
    // postes y cables zigzag
    const cable = [];
    for (let y = 250; y < 700; y += 50) {
      [[130, y, 248, y + 25], [248, y + 25, 130, y + 50]].forEach(([ax, ay, bx, by]) => {
        let prev = null;
        for (let k = 0; k <= 10; k++) {
          const t = k / 10;
          const p = new THREE.Vector3(X(ax + (bx - ax) * t), 5.4 - .9 * 4 * t * (1 - t), Z(ay + (by - ay) * t));
          if (prev) cable.push(prev, p);
          if (k > 0 && k < 10) focos.push(p.clone().add(new THREE.Vector3(0, -.12, 0)));
          prev = p;
        }
      });
      caja(.14, 5.6, .14, metal, X(130), 2.8, Z(y), props); caja(.14, 5.6, .14, metal, X(248), 2.8, Z(y + 25), props);
    }
    props.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(cable), new THREE.LineBasicMaterial({ color: '#3a3530' })));
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(.12, 8, 6), basico('#ffe29a'), focos.length);
    const m4 = new THREE.Matrix4();
    focos.forEach((p, i) => { m4.makeTranslation(p.x, p.y, p.z); im.setMatrixAt(i, m4); });
    props.add(im);
  }
  // El Patio (juegos infantiles)
  {
    const tx = X(720), tz = Z(265);
    [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]].forEach(([a, b]) => caja(.2, 3.2, .2, std('#3d6bff'), tx + a, 1.6, tz + b, props));
    caja(2.8, .25, 2.8, std('#ffc31f'), tx, 1.6, tz, props);
    const techo = malla(new THREE.ConeGeometry(2.2, 1.4, 4), std('#ff5fa2'), tx, 3.9, tz, props); techo.rotation.y = Math.PI / 4;
    const resb = caja(1, .12, 4.4, std('#ff6b2c'), tx + 2.6, .95, tz + 1.6, props); resb.rotation.set(.32, 0, 0); resb.rotation.y = -.6;
    const domo = new THREE.Group(); domo.position.set(X(790), 0, Z(340)); props.add(domo);
    for (let k = 0; k < 4; k++) { const a = malla(new THREE.TorusGeometry(2, .08, 6, 24, Math.PI), std('#1fb36b'), 0, 0, 0, domo); a.rotation.y = k * Math.PI / 4; }
    const columpio = new THREE.Group(); columpio.position.set(X(698), 0, Z(212)); columpio.rotation.y = .6; props.add(columpio);
    caja(.2, 3.4, .2, metal, -1.6, 1.7, 0, columpio); caja(.2, 3.4, .2, metal, 1.6, 1.7, 0, columpio); caja(3.6, .2, .2, metal, 0, 3.4, 0, columpio);
    const asiento = new THREE.Group(); asiento.position.y = 3.4; columpio.add(asiento);
    caja(.04, 2.4, .04, metal, -.4, -1.2, 0, asiento); caja(.04, 2.4, .04, metal, .4, -1.2, 0, asiento); caja(1, .12, .5, std('#ff5fa2'), 0, -2.4, 0, asiento);
    animados.push((dt, t) => { asiento.rotation.x = Math.sin(t * 2.2) * .55; });
    circulos.push({ x: 720, y: 265, r: 9 }, { x: 790, y: 360, r: 10 });
  }
  // Foro Abierto
  {
    // El escenario corre a lo largo de la diagonal, con la pantalla del lado de Liverpool
    const sx = X(768), sz = Z(735);
    const nx = .8, nz = .59; // normal hacia Liverpool
    const esc = caja(10, 1.2, 6, std(INK), sx, .6, sz, props); esc.rotation.y = .93;
    const pant = new THREE.Mesh(new THREE.PlaneGeometry(9, 4), basico('#ffffff', { map: lienzo(512, 228, (ctx, W, H) => { ctx.fillStyle = '#a259ff'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.font = '900 64px Montserrat, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('FORO ABIERTO', W / 2, 110); ctx.font = '700 28px Montserrat, sans-serif'; ctx.fillText('PRÓXIMOS EVENTOS', W / 2, 170); }) }));
    pant.position.set(sx + nx * 2.8, 4.2, sz + nz * 2.8); pant.rotation.y = Math.atan2(-nx, -nz); props.add(pant);
    caja(9.4, 4.4, .3, std(INK), sx + nx * 3, 4.2, sz + nz * 3, props).rotation.y = Math.atan2(-nx, -nz);
    ['#ff5fa2', '#ffc31f', '#3d6bff', '#1fb36b'].forEach((c, i) => {
      const k = (i - 1.5) * 2.2;
      malla(new THREE.SphereGeometry(.35, 10, 8), basico(c), sx + nz * k + nx * 2, 6.8, sz - nx * k + nz * 2, props, false);
    });
    obstaculos.push([[740, 707], [796, 707], [796, 763], [740, 763]]);
  }
  // Mercado (terraza del Nivel 2): solo en el mapa isométrico, desde el piso se vería flotando
  if (modo === 'iso') {
    const z = D.zona('mercado');
    const terraza = new THREE.Mesh(new THREE.ExtrudeGeometry(forma(z.forma.puntos), { depth: .5, bevelEnabled: false }).rotateX(-Math.PI / 2), std('#ffe6c2'));
    terraza.position.y = 2 * ALTO_NIVEL - .3; terraza.receiveShadow = true; terraza.castShadow = true; niveles[2].add(terraza);
    bordes(terraza.geometry, niveles[2], terraza.position);
    const [[x1, y1], , [x2, y2]] = z.forma.puntos;
    for (let i = 0; i < 6; i++) {
      const x = x1 + 25 + (i % 3) * (x2 - x1 - 50) / 2, y = y1 + 30 + Math.floor(i / 3) * (y2 - y1 - 60);
      const g = new THREE.Group(); g.position.set(X(x), 2 * ALTO_NIVEL + .2, Z(y)); niveles[2].add(g);
      malla(new THREE.CylinderGeometry(.7, .7, .08, 16), blanco, 0, .78, 0, g);
      malla(new THREE.ConeGeometry(1.6, .6, 8), std(['#ff6b2c', '#ffc31f', '#ff5fa2'][i % 3]), 0, 2.4, 0, g);
      malla(new THREE.CylinderGeometry(.05, .05, 2.3, 6), metal, 0, 1.2, 0, g);
    }
  }

  // ---------- Árboles ----------
  {
    const n = D.arboles.length;
    const troncos = new THREE.InstancedMesh(new THREE.CylinderGeometry(.22, .3, 1.8, 6), std('#8a5a3a'), n);
    const copas = new THREE.InstancedMesh(new THREE.SphereGeometry(1.6, 10, 8), std('#ffffff', { roughness: .9 }), n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
    D.arboles.forEach(([x, y], i) => {
      const k = .85 + ((i * 37) % 10) / 25;
      m4.compose(p.set(X(x), .9 * k, Z(y)), q, s.set(k, k, k)); troncos.setMatrixAt(i, m4);
      m4.compose(p.set(X(x), 2.6 * k, Z(y)), q, s.set(k, k * 1.05, k)); copas.setMatrixAt(i, m4);
      copas.setColorAt(i, col.set(['#3fbf6a', '#2fa85a', '#55cf78'][i % 3]));
      circulos.push({ x, y, r: 2.5 });
    });
    troncos.castShadow = copas.castShadow = true;
    suelo.add(troncos, copas);
  }

  // ---------- Autos ----------
  {
    const colores = ['#ff6b2c', '#3d6bff', '#ffffff', '#ffc31f', '#1fb36b', '#ff5fa2', '#141414'];
    for (let i = 0; i < 12; i++) {
      const g = new THREE.Group();
      const c = std(colores[i % colores.length], { roughness: .4 });
      caja(4, 1, 1.9, c, 0, .8, 0, g); caja(2.2, .8, 1.7, std('#9fd3ff', { roughness: .2 }), -.2, 1.6, 0, g);
      [[-1.3, .9], [1.3, .9], [-1.3, -.9], [1.3, -.9]].forEach(([a, b]) => { const r = malla(new THREE.CylinderGeometry(.38, .38, .25, 10), std(INK), a, .38, b, g); r.rotation.x = Math.PI / 2; });
      suelo.add(g);
      const calle = i % 3; const dir = i % 2 ? 1 : -1; const v = 9 + (i % 4) * 2;
      let pos = (i * 97) % 1300;
      animados.push((dt) => {
        pos += dir * v * dt / S;
        if (pos > 1250) pos = -60; if (pos < -60) pos = 1250;
        if (calle === 1) { g.position.set(X(1222 + (dir > 0 ? 0 : 30)), 0, Z(pos - 80)); g.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2; }
        else { const y = calle === 0 ? -60 + (dir > 0 ? 18 : -18) : 1115 + (dir > 0 ? 18 : -18); g.position.set(X(pos), 0, Z(y)); g.rotation.y = dir > 0 ? 0 : Math.PI; }
      });
    }
  }

  // ---------- Zonas: áreas táctiles y estaciones de juego ----------
  const zonaMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  D.zonas.forEach((z) => {
    let m = null;
    const y = z.nivel * ALTO_NIVEL + .3;
    if (z.forma && z.forma.tipo === 'circ') {
      m = new THREE.Mesh(new THREE.CylinderGeometry(z.forma.r * S, z.forma.r * S, .6, 32), zonaMat);
      m.position.set(X(z.forma.cx), y, Z(z.forma.cy));
    } else if (z.forma) {
      m = new THREE.Mesh(new THREE.ExtrudeGeometry(forma(z.forma.puntos), { depth: .6, bevelEnabled: false }).rotateX(-Math.PI / 2), zonaMat);
      m.position.y = y - .3;
    }
    if (m) { m.userData = { zona: z, nivel: z.nivel }; m.renderOrder = -1; niveles[z.nivel].add(m); pickables.push(m); }
    if (modo === 'fps') {
      const g = new THREE.Group();
      g.position.set(X(z.acceso[0]), 0, Z(z.acceso[1]));
      const tex = lienzo(256, 384, (ctx, W, H) => {
        ctx.fillStyle = '#141414'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = z.acento; ctx.fillRect(10, 10, W - 20, 220);
        ctx.save(); ctx.translate(W / 2 - 60, 60); ctx.scale(5, 5);
        ctx.strokeStyle = D.tinta(z.acento); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.stroke(new Path2D(D.ICONOS[z.icono])); ctx.restore();
        ctx.fillStyle = '#ffc31f'; ctx.fillRect(10, 244, W - 20, 130);
        ctx.fillStyle = '#141414'; ctx.font = '900 44px Montserrat, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('▶ JUGAR', W / 2, 330);
      });
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, .25), [std(INK), std(INK), std(INK), std(INK), basico('#ffffff', { map: tex }), basico('#ffffff', { map: tex })]);
      panel.position.y = 2.2; panel.castShadow = true; g.add(panel);
      caja(.2, 1.2, .2, std(INK), 0, .6, 0, g);
      const aro = new THREE.Mesh(new THREE.RingGeometry(1.6, 2, 32).rotateX(-Math.PI / 2), basico(z.acento, { transparent: true, opacity: .8 }));
      aro.position.y = .1; g.add(aro);
      scene.add(g);
      animados.push((dt, t) => { panel.rotation.y = t * .8; aro.scale.setScalar(1 + Math.sin(t * 3) * .08); });
      estaciones.push({ zona: z, grupo: g, x: z.acceso[0], y: z.acceso[1] });
    }
  });

  // ---------- Noche ----------
  const focoMat = props.children.find((c) => c.isInstancedMesh)?.material;

  function mostrarNivel(nivel) {
    niveles.forEach((g, i) => {
      g.visible = i <= nivel;
      g.children.forEach((c) => {
        if (!c.userData || !c.userData.tienda) return;
        const activo = i === nivel;
        c.material = activo ? c.userData.mats : gris;
        if (c.userData.toldo) c.userData.toldo.visible = activo;
        if (c.userData.bordes) c.userData.bordes.material.opacity = activo ? .9 : .25;
      });
    });
    props.visible = true;
  }

  function choca(px, py, r) {
    if (px < L.x1 + 45 || px > 1188 || py < -16 || py > 1070) return true;
    for (const c of circulos) if ((px - c.x) ** 2 + (py - c.y) ** 2 < (c.r + r) ** 2) return true;
    for (const p of obstaculos) {
      if (!p.length) continue;
      if (D.enPoligono(p, px, py)) return true;
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) if (distSeg(px, py, p[j][0], p[j][1], p[i][0], p[i][1]) < r) return true;
    }
    return false;
  }

  function actualizar(dt, t) { animados.forEach((f) => f(dt, t)); }

  return { scene, raiz, niveles, pickables, tiendasMallas, estaciones, hemi, sol, focoMat, mostrarNivel, choca, actualizar };
}
