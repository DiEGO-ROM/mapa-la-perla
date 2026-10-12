/*
  Escena 3D compartida de La Perla (la usan el mapa isométrico y el recorrido en primera persona).
  Construye calles, pisos, edificios de los tres niveles a partir de datos-zonas.js, los frentes de
  cada tienda (vitrina, toldo y letrero) y la utilería grande de cada experiencia.
*/
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { estructuraNivel } from './estructura.js';

const S = 0.2;                 // unidades 3D por píxel del plano
const ALTO_NIVEL = 5.4;        // altura de cada nivel
const ALTO_LOCAL = 4.4;        // altura del volumen de cada local
export const X = (px) => (px - 600) * S;
export const Z = (py) => (py - 520) * S;
export const aPlano = (x, z) => [x / S + 600, z / S + 520];
export const MUNDO = { S, ALTO_NIVEL, ALTO_LOCAL };

const COLOR_TIENDA = { Liverpool: '#ff4fa0', Coppel: '#ffd23f', 'Cinépolis': '#3d6bff' };
const INK = '#141414';
const PALETA = ['#ff6b2c', '#1fb36b', '#ff5fa2', '#3d6bff', '#ffc31f', '#a259ff'];

/* ---------------- utilidades ---------------- */
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
function ajustar(ctx, texto, maxW, tam, peso) {
  let t = tam;
  ctx.font = `${peso} ${t}px Montserrat, sans-serif`;
  while (ctx.measureText(texto).width > maxW && t > 10) { t -= 2; ctx.font = `${peso} ${t}px Montserrat, sans-serif`; }
}
// Letrero cuadriculado: fondo, borde negro grueso, texto centrado
function texLetrero(texto, { fondo = '#ffffff', color = INK, acento = null, w = 1024, h = 192 } = {}) {
  return lienzo(w, h, (ctx, W, H) => {
    ctx.fillStyle = fondo; ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = 14; ctx.strokeStyle = INK; ctx.strokeRect(7, 7, W - 14, H - 14);
    let x0 = 0;
    if (acento) { ctx.fillStyle = acento; ctx.fillRect(14, 14, H - 28, H - 28); ctx.fillStyle = INK; ctx.fillRect(H - 14, 14, 7, H - 28); x0 = H - 14; }
    ajustar(ctx, texto, W - x0 - 60, H * .5, 900);
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(texto, x0 + (W - x0) / 2, H * .54);
  });
}
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .72, ...extra });
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
  const g = r0 ? new THREE.RingGeometry(r0 * S, r * S, 72) : new THREE.CircleGeometry(r * S, 72);
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
// caja con contorno negro (estilo de juguete)
function bloque(w, h, d, mat, x, y, z, padre) {
  const m = caja(w, h, d, mat, x, y, z, padre);
  bordes(m.geometry, m);
  return m;
}
function letreroPlano(texto, ancho, alto, opciones, padre) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), basico('#ffffff', { map: texLetrero(texto, { ...opciones, w: Math.round(Math.min(2048, 192 * ancho / alto)), h: 192 }) }));
  padre.add(m);
  return m;
}
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}


/* ======================================================================= */
export function crearPlaza(D, { modo = 'iso', movil = false } = {}) {
  const scene = new THREE.Scene();
  const raiz = new THREE.Group();
  scene.add(raiz);
  const animados = [];
  const pickables = [];
  const obstaculos = [];      // polígonos en coordenadas de plano (solo planta baja)
  const circulos = [];        // { x, y, r } en plano
  const estaciones = [];
  const fps = modo === 'fps';

  // ---------- Luz ----------
  const hemi = new THREE.HemisphereLight('#ffffff', '#c9c2b0', 1.25);
  scene.add(hemi);
  const sol = new THREE.DirectionalLight('#fff3dc', 2.4);
  sol.position.set(-70, 120, 60);
  sol.castShadow = true;
  sol.shadow.mapSize.set(movil ? 1024 : 2048, movil ? 1024 : 2048);
  Object.assign(sol.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 10, far: 400 });
  sol.shadow.camera.updateProjectionMatrix();
  sol.shadow.bias = -0.0006;
  sol.shadow.normalBias = 0.05;
  scene.add(sol, sol.target);

  // ---------- Suelo, calles y espacios abiertos ----------
  const suelo = new THREE.Group();
  raiz.add(suelo);
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), std('#bfe39f', { roughness: 1 }));
  piso.position.y = -0.06; piso.receiveShadow = true; suelo.add(piso);

  const L = D.limites;
  const texPiso = baldosa('#f4f1ea', '#e6e1d6', 4); texPiso.repeat.set(1 / 8, 1 / 8);
  sueloPoligono([[L.x1 + 40, -18], [1190, -18], [1190, 1072], [L.x1 + 40, 1072]], std('#ffffff', { map: texPiso, roughness: .95 }), 0, suelo);

  const asfalto = std('#3b3c42', { roughness: .95 });
  const raya = basico('#f5f2ea');
  D.CALLES.forEach((c) => {
    sueloPoligono(c.poly, asfalto, 0.01, suelo);
    const [[x1, y1], , [x2, y2]] = c.poly;
    if (c.eje === 'x') {
      const ym = (y1 + y2) / 2;
      for (let x = x1 + 10; x < x2 - 10; x += 40) caja(16 * S, .02, 1.6 * S, raya, X(x + 8), .04, Z(ym), suelo).castShadow = false;
    } else {
      const xm = (x1 + x2) / 2;
      for (let y = y1 + 10; y < y2 - 10; y += 40) caja(1.6 * S, .02, 16 * S, raya, X(xm), .04, Z(y + 8), suelo).castShadow = false;
    }
  });
  const banqueta = std('#dcd7cc', { roughness: .95 });
  sueloPoligono([[L.x1 + 40, -25], [1200, -25], [1200, -18], [L.x1 + 40, -18]], banqueta, .03, suelo);
  sueloPoligono([[L.x1 + 40, 1072], [1200, 1072], [1200, 1080], [L.x1 + 40, 1080]], banqueta, .03, suelo);
  sueloPoligono([[1190, -25], [1200, -25], [1200, 1080], [1190, 1080]], banqueta, .03, suelo);

  const E = D.ESPACIOS;
  const texCalzada = baldosa('#ffd9c6', '#ffbf9f', 4); texCalzada.repeat.set(.25, .25);
  const matCalzada = std('#ffffff', { map: texCalzada, roughness: .9 });
  sueloPoligono(E.calzada, matCalzada, .05, suelo);
  sueloPoligono(E.calzadaSur, matCalzada, .05, suelo);
  sueloPoligono([[126, 864], [266, 864], [266, 1072], [126, 1072]], matCalzada, .05, suelo);
  const texPlaza = baldosa('#f7f3ea', '#e2dccd', 2); texPlaza.repeat.set(.2, .2);
  sueloPoligono(E.plazaNorte, std('#ffffff', { map: texPlaza }), .05, suelo);
  sueloPoligono(E.plazaSur, std('#ffffff', { map: texPlaza }), .05, suelo);
  const texPatio = baldosa('#ffd4e7', '#ffb3d3', 3); texPatio.repeat.set(.25, .25);
  sueloPoligono(E.diagonalNE, std('#ffffff', { map: texPatio }), .05, suelo);
  const texForo = baldosa('#ead9ff', '#d6bcff', 3); texForo.repeat.set(.25, .25);
  sueloPoligono(E.diagonalSE, std('#ffffff', { map: texForo }), .05, suelo);

  // ---------- Edificios por nivel: una estructura continua con el techo de cada local en su color ----------
  const niveles = [0, 1, 2].map(() => { const g = new THREE.Group(); raiz.add(g); return g; });
  const gris = [std('#e9e9e4'), std('#c9c9c3')];
  const LOSA_EXT = [[8, 4], [1186, 4], [1186, 1052], [268, 1052], [268, 866], [415, 866], [415, 787], [249, 787], [249, 730], [125, 730], [125, 787], [8, 787]];
  const LOSA_SO = [[8, 866], [124, 866], [124, 1052], [8, 1052]];
  const ALTO_MURO = ALTO_LOCAL - .3;
  const baseNivel = (n) => n * ALTO_NIVEL + (n ? .18 : 0);
  const altoTapa = (t) => (t.cat === 'ancla' ? .8 : t.cat === 'local' ? .22 : .4);
  const texAzotea = baldosa('#cbc3b4', '#bdb4a3', 2); texAzotea.repeat.set(.2, .2);
  const muroMats = [std('#ffffff', { map: texAzotea, roughness: .95 }), std('#fbf8f2', { roughness: .85 })];   // [azotea, muros]
  const pilastra = std('#ddd5c6', { roughness: .85 });
  const cacheMat = {}, cacheFascia = {};
  const colorDe = (t) => (t.cat === 'local' ? '#cfc7b8' : COLOR_TIENDA[t.nombre] || D.CATEGORIAS[t.cat].color);
  function materialesDe(t) {
    const color = colorDe(t);
    if (!cacheMat[color]) {
      const lateral = new THREE.Color(color);
      if (t.cat !== 'ancla') lateral.lerp(new THREE.Color('#ffffff'), t.cat === 'local' ? 0 : .12);
      const techo = new THREE.Color(color).lerp(new THREE.Color('#ffffff'), t.cat === 'local' ? .3 : .4);
      cacheMat[color] = [std(techo, { roughness: .7 }), std(lateral, { roughness: .6 })];
    }
    return cacheMat[color];
  }
  const fasciaDe = (color) => (cacheFascia[color] = cacheFascia[color] || std(color, { roughness: .55 }));
  const extruir = (poly, alto) => new THREE.ExtrudeGeometry(forma(poly), { depth: alto, bevelEnabled: false }).rotateX(-Math.PI / 2);
  const VACIOS = [E.calzada, E.plazaNorte, E.plazaSur, E.diagonalNE, E.diagonalSE, E.rotonda];
  const formasZona = (n) => D.zonas.filter((z) => z.nivel === n && z.forma).map((z) => (z.forma.tipo === 'circ' ? z.forma : z.forma.puntos));
  const estructuras = D.NIVELES.map((nv) => {
    const polys = nv.tiendas.map((t) => t.poly);
    if (nv.id === 0) return estructuraNivel(polys, { espacios: [E.calzada, E.calzadaSur, E.plazaNorte, E.plazaSur, E.diagonalNE, E.diagonalSE, E.rotonda, ...formasZona(0)], limites: [-20, -40, 1215, 1095] });
    return estructuraNivel(polys, { losa: [LOSA_EXT, LOSA_SO], vacios: VACIOS, espacios: formasZona(nv.id), limites: [0, -4, 1195, 1060] });
  });
  const tiendasMallas = [], tapasMallas = [], murosGeo = [[], [], []];
  D.NIVELES.forEach((nv) => {
    const n = nv.id, y0 = baseNivel(n);
    nv.tiendas.forEach((t) => {
      const mats = materialesDe(t), ht = altoTapa(t);
      // muro neutro hasta la azotea
      const muro = extruir(t.poly, ALTO_MURO); muro.translate(0, y0, 0); murosGeo[n].push(muro);
      bordes(muro, niveles[n], null, .9);
      // techo del local en su color, para que se lea cada tienda desde arriba
      const tapa = new THREE.Mesh(extruir(t.poly, ht), mats);
      tapa.position.y = y0 + ALTO_MURO; tapa.userData = { mats, nivel: n };
      niveles[n].add(tapa); tapasMallas.push(tapa);
      bordes(tapa.geometry, niveles[n], tapa.position, .9);
      // volumen completo e invisible: sirve para tocar y resaltar la tienda
      const m = new THREE.Mesh(extruir(t.poly, ALTO_MURO + ht), mats);
      m.position.y = y0; m.visible = false;
      m.userData = { tienda: t, mats, nivel: n };
      niveles[n].add(m);
      if (t.nombre) pickables.push(m);
      tiendasMallas.push(m);
      if (n === 0) obstaculos.push(t.poly);
    });
    // muros que unen los locales (lo que en el plano es la franja blanca entre ellos)
    estructuras[n].rellenos.forEach((p) => {
      const g = extruir(p, ALTO_MURO); g.translate(0, y0, 0); murosGeo[n].push(g);
      bordes(g, niveles[n], null, .9);
      if (n === 0) obstaculos.push(p);
    });
  });

  // ---------- Frentes de tienda: vitrina, franja de color, pilastras, toldo y letrero ----------
  const letrerosAtlas = [];
  const vidrio = std('#2a3a4c', { roughness: .1, metalness: .5, emissive: '#ffd59a', emissiveIntensity: .05 });
  // Un frente solo puede dar a espacio público (calle, calzada, plazas o pasillo junto a un vacío).
  // Entre los posibles se prefiere el que mira a los espacios interiores de la plaza y luego el más largo.
  const ESPACIOS_INT = [E.calzada, E.calzadaSur, E.plazaNorte, E.plazaSur, E.diagonalNE, E.diagonalSE];
  const haciaPlaza = (x, y) => ESPACIOS_INT.some((p) => D.enPoligono(p, x, y)) || Math.hypot(x - E.rotonda.cx, y - E.rotonda.cy) < E.rotonda.r + 30;
  function frentesDe(t, n) {
    const p = t.poly, out = [], est = estructuras[n];
    for (let i = 0; i < p.length; i++) {
      const [ax, ay] = p[i], [bx, by] = p[(i + 1) % p.length];
      const len = Math.hypot(bx - ax, by - ay);
      if (len < 10) continue;
      let nx = (by - ay) / len, ny = -(bx - ax) / len;
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      if (D.enPoligono(p, mx + nx * 4, my + ny * 4)) { nx = -nx; ny = -ny; }
      // al menos dos de tres puntos de la orilla deben asomarse a espacio público
      const asoma = [.2, .5, .8].filter((s) => {
        const x = ax + (bx - ax) * s, y = ay + (by - ay) * s;
        return [4, 10].every((d) => est.publico(x + nx * d, y + ny * d));
      }).length;
      if (asoma < 2) continue;
      if (n === 0 && (my + ny * 10 < -16 || my + ny * 10 > 1072 || mx + nx * 10 > 1190)) continue;
      const plaza = [20, 45, 80].some((d) => haciaPlaza(mx + nx * d, my + ny * d));
      out.push({ mx, my, nx, ny, len, puntos: len * (plaza ? 2 : 1) });
    }
    out.sort((a, b) => b.puntos - a.puntos);
    const elegidos = out.slice(0, 1);
    if (out[1] && out[1].len > 40 && Math.abs(out[1].nx * out[0].nx + out[1].ny * out[0].ny) < .5) elegidos.push(out[1]);
    return elegidos;
  }
  const blancoBasico = basico('#ffffff');
  const frentes = new Map();   // tienda -> su frente principal (para poner la etiqueta ahí)
  D.NIVELES.forEach((nv) => {
    const n = nv.id, y0 = baseNivel(n);
    nv.tiendas.forEach((t) => {
      const color = colorDe(t), local = t.cat === 'local' || !t.nombre;
      frentesDe(t, n).forEach((f, k) => {
        const g = new THREE.Group();
        g.position.set(X(f.mx), y0, Z(f.my));
        g.rotation.y = Math.atan2(f.nx, f.ny);
        niveles[n].add(g);
        const ancho = f.len * S;
        const vit = caja(ancho * .84, 2.6, .12, vidrio, 0, 1.4, .1, g); vit.castShadow = false;
        // franja de color sobre la vitrina: aquí va el nombre
        caja(ancho * .92, .9, .2, fasciaDe(color), 0, ALTO_MURO - .45, .1, g).castShadow = false;
        // pilastras que marcan dónde empieza y termina cada local
        [-1, 1].forEach((l) => caja(.5, ALTO_MURO, .36, pilastra, l * (ancho / 2 - .25), ALTO_MURO / 2, .12, g));
        if (n === 0 && !local) {
          const toldo = caja(ancho * .8, .14, 1.3, fasciaDe(color), 0, 2.85, .8, g); toldo.rotation.x = .32;
          bordes(toldo.geometry, toldo);
          for (let i = -2; i <= 2; i += 2) { const fr = caja(ancho * .8 / 7, .16, 1.32, blancoBasico, i * ancho * .8 / 7, 2.85, .8, g); fr.rotation.x = .32; fr.castShadow = false; }
        }
        // el nombre va en la franja de color del frente, en los tres niveles y en los dos mapas
        if (!local && (k === 0 || (f.len > 50 && !movil))) {
          const w = Math.min(ancho * .86, Math.max(3, t.nombre.length * .55 + 1.6), 13);
          letrerosAtlas.push({ texto: t.nombre, acento: color, w, h: .82, grupo: g, pos: [0, ALTO_MURO - .45, .22], nivel: n });
        }
        if (k === 0) frentes.set(t, { x: f.mx, y: f.my, nx: f.nx, ny: f.ny, nivel: n });
      });
    });
  });

  // ---------- Utilería de las experiencias ----------
  const props = new THREE.Group();
  niveles[0].add(props);
  const madera = std('#c9864a'); const maderaClara = std('#e8b77e'); const metal = std('#4a4d55', { metalness: .4, roughness: .45 });
  const blanco = std('#ffffff'); const agua = std('#5ec4ff', { roughness: .08, metalness: .1, transparent: true, opacity: .88 });
  const colorMat = PALETA.map((c) => std(c, { roughness: .55 }));
  const pielMats = ['#ffd8b0', '#c8955c', '#8a5a3a'].map((c) => std(c));
  const pantalon = std('#3a3f4a');
  // persona sencilla de juguete (piernas, torso de color y cabeza)
  function persona(padre, x, z, i, esc = 1) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(esc); padre.add(g);
    caja(.34, .8, .26, pantalon, 0, .4, 0, g);
    caja(.52, .75, .32, colorMat[i % 6], 0, 1.18, 0, g);
    malla(new THREE.SphereGeometry(.22, 10, 8), pielMats[i % 3], 0, 1.78, 0, g);
    return g;
  }
  const gotaTex = lienzo(64, 64, (ctx) => { const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64); });

  // Partículas de agua reutilizables
  function chorros(n, emisor, padre, tam = .35) {
    const pos = new Float32Array(n * 3), vel = new Float32Array(n * 3);
    const reiniciar = (i, t0 = 0) => { const e = emisor(i); for (let k = 0; k < 3; k++) { vel[i * 3 + k] = e.v[k]; pos[i * 3 + k] = e.p[k] + e.v[k] * t0; } vel[i * 3 + 1] -= 9.8 * t0; pos[i * 3 + 1] -= 4.9 * t0 * t0; };
    for (let i = 0; i < n; i++) reiniciar(i, Math.random() * 1.6);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: gotaTex, color: '#d4f1ff', size: tam, transparent: true, opacity: .9, depthWrite: false, toneMapped: false }));
    pts.frustumCulled = false; padre.add(pts);
    const piso = emisor(0).piso;
    animados.push((dt) => {
      for (let i = 0; i < n; i++) {
        vel[i * 3 + 1] -= 9.8 * dt;
        pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        if (pos[i * 3 + 1] < piso) reiniciar(i);
      }
      geo.attributes.position.needsUpdate = true;
    });
  }

  /* ----- El Jardín: fuente monumental con la gran perla ----- */
  {
    const r = E.rotonda, fx = X(r.cx), fz = Z(r.cy);
    sueloCirculo(r.cx, r.cy, r.r, std('#7fd18c', { roughness: 1 }), .07, props);
    sueloCirculo(r.cx, r.cy, r.r * .74, std('#ffffff'), .09, props, r.r * .62);
    // tres niveles de fuente
    const piedra = std('#f3eee4', { roughness: .6 });
    const b1 = malla(new THREE.CylinderGeometry(5.6, 6, 1.1, 48), piedra, fx, .55, fz, props); bordes(b1.geometry, b1);
    malla(new THREE.CylinderGeometry(5.1, 5.1, .15, 48), agua, fx, 1.05, fz, props, false);
    malla(new THREE.CylinderGeometry(.9, 1.2, 3, 24), piedra, fx, 2.2, fz, props);
    const b2 = malla(new THREE.CylinderGeometry(3, 2.4, .6, 40), piedra, fx, 3.6, fz, props); bordes(b2.geometry, b2);
    malla(new THREE.CylinderGeometry(2.7, 2.7, .12, 40), agua, fx, 3.86, fz, props, false);
    malla(new THREE.CylinderGeometry(.5, .7, 1.6, 20), piedra, fx, 4.6, fz, props);
    const b3 = malla(new THREE.CylinderGeometry(1.6, 1.2, .45, 32), piedra, fx, 5.5, fz, props); bordes(b3.geometry, b3);
    // la perla
    const perla = malla(new THREE.SphereGeometry(1.25, 40, 28), new THREE.MeshPhysicalMaterial({ color: '#fff9ff', roughness: .15, clearcoat: 1, sheen: 1, sheenColor: new THREE.Color('#ffb3d3'), iridescence: 1, iridescenceIOR: 1.4 }), fx, 6.9, fz, props);
    perla.userData.vivo = true;
    animados.push((dt, t) => { perla.rotation.y = t * .4; perla.position.y = 6.9 + Math.sin(t * 1.5) * .12; });
    // chorros: central alto y ocho arcos desde la orilla
    chorros(movil ? 260 : 420, () => { const a = Math.random() * Math.PI * 2, rr = Math.random() * .6; return { p: [fx, 7.6, fz], v: [Math.cos(a) * rr, 8 + Math.random() * 2, Math.sin(a) * rr], piso: 1.1 }; }, props, .4);
    chorros(movil ? 200 : 320, () => { const k = Math.floor(Math.random() * 8), a = (k / 8) * Math.PI * 2; return { p: [fx + Math.cos(a) * 5.4, 1.2, fz + Math.sin(a) * 5.4], v: [-Math.cos(a) * 1.6, 5.2 + Math.random() * .6, -Math.sin(a) * 1.6], piso: 1.05 }; }, props, .32);
    circulos.push({ x: r.cx, y: r.cy, r: 31 });
    // camas de flores, bancas y faroles
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, rr = r.r * .86 * S;
      const fl = malla(new THREE.IcosahedronGeometry(.7, 0), colorMat[i % 6], fx + Math.cos(a) * rr, .6, fz + Math.sin(a) * rr, props);
      fl.scale.y = .8;
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4, rr = r.r * .55 * S;
      const fa = new THREE.Group(); fa.position.set(fx + Math.cos(a) * rr, 0, fz + Math.sin(a) * rr); props.add(fa);
      caja(.18, 4.2, .18, std(INK), 0, 2.1, 0, fa);
      malla(new THREE.SphereGeometry(.45, 16, 12), basico('#fff4c9'), 0, 4.4, 0, fa, false);
    }
  }

  /* ----- La Cancha: cancha 3x3 con aro grande, gradas y balón monumental ----- */
  {
    const z = D.zona('cancha'); const [[x1, y1], , [x2, y2]] = z.forma.puntos;
    const w = (x2 - x1) * S, h = (y2 - y1) * S, cx = X((x1 + x2) / 2), cz = Z((y1 + y2) / 2);
    const tex = lienzo(512, 512, (ctx, W, H) => {
      ctx.fillStyle = '#ff6b2c'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#3d6bff'; ctx.fillRect(30, 30, W - 60, H - 60);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 9; ctx.strokeRect(30, 30, W - 60, H - 60);
      ctx.fillStyle = '#2a52d6'; ctx.fillRect(W / 2 - 75, 30, 150, 190);
      ctx.strokeRect(W / 2 - 75, 30, 150, 190);
      ctx.beginPath(); ctx.arc(W / 2, 220, 62, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(70, 30); ctx.lineTo(70, 110); ctx.arc(W / 2, 110, W / 2 - 70, Math.PI, 0, true); ctx.lineTo(W - 70, 30); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.font = '900 64px Montserrat, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('LA PERLA', W / 2, H - 70);
    });
    const pisoC = new THREE.Mesh(new THREE.PlaneGeometry(w * .94, h * .94).rotateX(-Math.PI / 2), std('#ffffff', { map: tex }));
    pisoC.position.set(cx, .08, cz); pisoC.receiveShadow = true; props.add(pisoC);
    // aro profesional
    const az = cz - h * .43;
    bloque(1.4, 1.2, 1.4, std('#ffc31f'), cx, .6, az - 1, props);
    caja(.4, 6.2, .4, metal, cx, 3.1, az - 1, props);
    caja(.3, .3, 2.2, metal, cx, 6, az, props);
    const tablero = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.6, .18), [blanco, blanco, blanco, blanco, basico('#ffffff', { map: texLetrero('LA PERLA', { fondo: '#ffffff', w: 512, h: 320 }) }), blanco]);
    tablero.position.set(cx, 6.1, az + 1.1); tablero.castShadow = true; props.add(tablero); bordes(tablero.geometry, tablero);
    const aro = malla(new THREE.TorusGeometry(.7, .09, 10, 28), std('#ff6b2c'), cx, 5.2, az + 1.9, props); aro.rotation.x = Math.PI / 2;
    const red = malla(new THREE.CylinderGeometry(.7, .45, .9, 14, 1, true), new THREE.MeshBasicMaterial({ color: '#ffffff', wireframe: true }), cx, 4.75, az + 1.9, props, false);
    circulos.push({ x: (x1 + x2) / 2, y: y1 + 8, r: 7 });
    // gradas de colores
    for (let i = 0; i < 4; i++) bloque(w * .72, .55, 1.3, colorMat[(i + 2) % 6], cx, .28 + i * .55, cz + h * .3 + i * 1.3, props);
    obstaculos.push([[x1 + 15, y2 - 30], [x2 - 15, y2 - 30], [x2 - 15, y2 - 2], [x1 + 15, y2 - 2]]);
    // marcador
    const marc = new THREE.Group(); marc.position.set(cx + w * .42, 0, cz - h * .3); props.add(marc);
    caja(.3, 5.5, .3, std(INK), 0, 2.75, 0, marc);
    const pantalla = letreroPlano('21 : 18', 3.4, 1.6, { fondo: '#141414', color: '#ffc31f' }, marc); pantalla.position.set(0, 6, .2);
    const pantalla2 = pantalla.clone(); pantalla2.rotation.y = Math.PI; pantalla2.position.z = -.2; marc.add(pantalla2);
    // balón monumental
    const balon = new THREE.Group(); balon.position.set(cx - w * .4, 0, cz - h * .32); props.add(balon);
    bloque(2.6, 1, 2.6, std('#ffffff'), 0, .5, 0, balon);
    const bola = malla(new THREE.SphereGeometry(1.6, 28, 20), std('#ff6b2c', { roughness: .6 }), 0, 2.7, 0, balon);
    [0, Math.PI / 2].forEach((r0) => { const l = malla(new THREE.TorusGeometry(1.62, .06, 6, 40), std(INK), 0, 2.7, 0, balon, false); l.rotation.y = r0; });
    const ec = malla(new THREE.TorusGeometry(1.62, .06, 6, 40), std(INK), 0, 2.7, 0, balon, false); ec.rotation.x = Math.PI / 2;
    bola.userData.vivo = true;
    animados.push((dt, t) => { bola.rotation.y = t * .8; });
    circulos.push({ x: (x1 + x2) / 2 - w * 2, y: (y1 + y2) / 2 - h * 1.6, r: 8 });
  }

  /* ----- El Pabellón: casa de madera con techo de lamas a dos aguas y farolitos ----- */
  {
    const z = D.zona('pabellon'); const [[x1, y1], , [x2, y2]] = z.forma.puntos;
    const w = (x2 - x1) * S, h = (y2 - y1) * S, cx = X((x1 + x2) / 2), cz = Z((y1 + y2) / 2);
    const texMad = baldosa('#e8b77e', '#c9864a', 8);
    const pisoP = new THREE.Mesh(new THREE.BoxGeometry(w, .4, h), std('#ffffff', { map: texMad }));
    pisoP.position.set(cx, .2, cz); pisoP.receiveShadow = true; props.add(pisoP); bordes(pisoP.geometry, pisoP);
    const alto = 6.5, cumbre = 10;
    for (const a of [-1, 1]) for (const b of [-1, -.33, .33, 1]) bloque(.7, alto, .7, madera, cx + a * w * .44, alto / 2, cz + b * h * .44, props);
    // techo a dos aguas de lamas
    const mitad = w * .5, pend = Math.atan2(cumbre - alto, mitad);
    const largo = Math.hypot(mitad, cumbre - alto) + .6;
    for (const lado of [-1, 1]) {
      for (let i = 0; i < 16; i++) {
        const lama = caja(largo, .22, .55, i % 2 ? maderaClara : madera, cx + lado * mitad / 2, (alto + cumbre) / 2, cz - h * .48 + i * (h * .96 / 15), props);
        lama.rotation.z = -lado * pend;
      }
    }
    bloque(.5, .5, h * 1.02, madera, cx, cumbre + .1, cz, props);
    // farolitos de colores
    for (let i = 0; i < 10; i++) {
      const f = malla(new THREE.SphereGeometry(.38, 14, 10), basico(PALETA[i % 6]), cx - w * .35 + (i % 5) * w * .175, alto - .8, cz + (i < 5 ? -h * .2 : h * .2), props, false);
      f.userData.vivo = true;
      animados.push((dt, t) => { f.position.y = alto - .8 + Math.sin(t * 2 + i) * .08; });
    }
    // obras y mesas de artesanos
    [[-.25, -.2], [.25, -.2], [-.25, .22], [.25, .22]].forEach(([a, b], i) => {
      bloque(3.2, 1, 1.4, maderaClara, cx + a * w, .9, cz + b * h, props);
      const cuadro = letreroPlano(['ARTE', 'BARRO', 'TEXTIL', 'PINTURA'][i], 2.2, 1.6, { fondo: PALETA[i + 1], color: '#ffffff' }, props);
      cuadro.position.set(cx + a * w, 2.6, cz + b * h - .1);
    });
    const letrero = letreroPlano('EL PABELLÓN', 9, 1.6, { fondo: '#c9864a', color: '#ffffff' }, props);
    letrero.position.set(cx, alto + .9, cz + h * .5 + .1);
  }

  /* ----- Las Rampas: bowl con rampas grandes, grafiti y skater en acción ----- */
  {
    const z = D.zona('rampas');
    const [cx, cy] = D.centroide(z.forma.puntos);
    sueloPoligono(z.forma.puntos, std('#ffe28a', { roughness: .8 }), .07, props);
    const R = 3.4, P = 1.4, A = 11;
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(R + P, 0); s.lineTo(R + P, R); s.lineTo(R, R); s.absarc(0, R, R, 0, -Math.PI / 2, true);
    const g = new THREE.ExtrudeGeometry(s, { depth: A, bevelEnabled: false, curveSegments: 16 }); g.translate(0, 0, -A / 2);
    const conc = std('#dfe2e8', { roughness: .55 });
    const ext = 14;
    const r1 = malla(g, conc, X(cx) - ext + R + P, 0, Z(cy), props); r1.rotation.y = Math.PI; bordes(g, r1);
    const r2 = malla(g, conc, X(cx) + ext - R - P, 0, Z(cy), props); bordes(g, r2);
    [-1, 1].forEach((l) => { const c = malla(new THREE.CylinderGeometry(.12, .12, A, 10), std('#ff5fa2'), X(cx) + l * (ext - P), R, Z(cy), props); c.rotation.x = Math.PI / 2; });
    // muros de grafiti detrás de las rampas
    const grafiti = lienzo(512, 256, (ctx, W, H) => {
      ctx.fillStyle = '#141414'; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 14; i++) { ctx.fillStyle = PALETA[i % 6]; ctx.beginPath(); ctx.arc(Math.random() * W, Math.random() * H, 20 + Math.random() * 50, 0, Math.PI * 2); ctx.fill(); }
      ctx.font = '900 92px Montserrat, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 10; ctx.strokeStyle = '#141414'; ctx.strokeText('SKATE', W / 2, H * .64); ctx.fillStyle = '#ffffff'; ctx.fillText('SKATE', W / 2, H * .64);
    });
    [-1].forEach((l) => {
      const muro = new THREE.Mesh(new THREE.BoxGeometry(.4, 4, A), [std('#ffffff', { map: grafiti }), std('#ffffff', { map: grafiti }), std(INK), std(INK), std(INK), std(INK)]);
      muro.position.set(X(cx) + l * (ext + .2), 2, Z(cy)); muro.castShadow = true; props.add(muro);
    });
    // grafiti en el respaldo de la rampa que da a la Calzada
    const respaldo = new THREE.Mesh(new THREE.PlaneGeometry(A, R), basico('#ffffff', { map: grafiti }));
    respaldo.position.set(X(cx) + ext + .03, R / 2, Z(cy)); respaldo.rotation.y = Math.PI / 2; props.add(respaldo);
    // pirámide central
    bloque(5, 1, 3.4, std('#ff6b2c'), X(cx), .5, Z(cy), props);
    const cuna = new THREE.Shape(); cuna.moveTo(0, 0); cuna.lineTo(2.4, 0); cuna.lineTo(0, 1);
    const cg = new THREE.ExtrudeGeometry(cuna, { depth: 3.4, bevelEnabled: false }); cg.translate(0, 0, -1.7);
    malla(cg, std('#ff9f1c'), X(cx) + 2.5, 0, Z(cy), props);
    const c2 = malla(cg, std('#ff9f1c'), X(cx) - 2.5, 0, Z(cy), props); c2.rotation.y = Math.PI;
    const riel = malla(new THREE.CylinderGeometry(.09, .09, 8, 8), metal, X(cx), .9, Z(cy) + 4, props); riel.rotation.z = Math.PI / 2;
    // skater que va y viene
    const sk = new THREE.Group(); sk.userData.vivo = true; props.add(sk);
    bloque(1.5, .12, .45, std('#ff5fa2'), 0, .12, 0, sk);
    bloque(.5, 1.1, .4, std('#3d6bff'), 0, .85, 0, sk);
    bloque(.45, .7, .35, std('#ffc31f'), 0, 1.75, 0, sk);
    malla(new THREE.SphereGeometry(.28, 12, 10), std('#ffd8b0'), 0, 2.3, 0, sk);
    animados.push((dt, t) => {
      const u = Math.sin(t * 1.6);
      const x = u * (ext - P - .4);
      const d = Math.max(0, Math.abs(x) - (ext - P - R));
      const y = d > 0 ? R - Math.sqrt(Math.max(0, R * R - d * d)) : 0;
      sk.position.set(X(cx) + x, Math.min(R, y) + (Math.abs(u) > .97 ? (Math.abs(u) - .97) * 30 : 0), Z(cy) - 2.6);
      sk.rotation.z = d > 0 ? -Math.sign(x) * Math.asin(Math.min(1, d / R)) : 0;
      sk.rotation.y = Math.cos(t * 1.6) > 0 ? 0 : Math.PI;
    });
    obstaculos.push([[cx - 72, cy - 28], [cx - 48, cy - 28], [cx - 48, cy + 28], [cx - 72, cy + 28]]);
    obstaculos.push([[cx + 48, cy - 28], [cx + 72, cy - 28], [cx + 72, cy + 28], [cx + 48, cy + 28]]);
    obstaculos.push([[cx - 25, cy - 9], [cx + 25, cy - 9], [cx + 25, cy + 9], [cx - 25, cy + 9]]);
  }

  /* ----- Club Canino: circuito de agilidad, hueso gigante y perritos ----- */
  {
    const z = D.zona('canino'); const f = z.forma;
    const ccx = X(f.cx), ccz = Z(f.cy), rr = f.r * S;
    sueloCirculo(f.cx, f.cy, f.r, std('#a8e07a', { roughness: 1 }), .07, props);
    sueloCirculo(f.cx, f.cy, f.r, std('#7ccf3f'), .08, props, f.r - 2);
    const n = 36;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      if (Math.cos(a) > .9) continue; // entrada hacia la Calzada
      caja(.18, 1.3, .18, blanco, ccx + Math.cos(a) * rr, .65, ccz + Math.sin(a) * rr, props);
    }
    // vallas, túnel y slalom
    [[-.4, -.35], [0, -.5], [.35, -.3]].forEach(([a, b], i) => {
      const v = new THREE.Group(); v.position.set(ccx + a * rr, 0, ccz + b * rr); v.rotation.y = i * .7; props.add(v);
      caja(.14, 1.2, .14, blanco, -1, .6, 0, v); caja(.14, 1.2, .14, blanco, 1, .6, 0, v);
      bloque(2.2, .16, .16, colorMat[i * 2], 0, .85, 0, v);
    });
    const tunel = malla(new THREE.CylinderGeometry(1.1, 1.1, 4.5, 20, 1, true, 0, Math.PI), std('#a259ff', { side: THREE.DoubleSide }), ccx + .2 * rr, 0, ccz + .45 * rr, props);
    tunel.rotation.z = Math.PI / 2;
    for (let i = 0; i < 6; i++) caja(.12, 1.4, .12, i % 2 ? std('#ffc31f') : blanco, ccx - .55 * rr + i * .7, .7, ccz + .1 * rr, props);
    // casita
    const casa = new THREE.Group(); casa.position.set(ccx - .45 * rr, 0, ccz + .45 * rr); props.add(casa);
    bloque(3, 2.1, 2.6, std('#c9864a'), 0, 1.05, 0, casa);
    const techo = malla(new THREE.ConeGeometry(2.5, 1.5, 4), std('#ff6b2c'), 0, 2.85, 0, casa); techo.rotation.y = Math.PI / 4;
    caja(1, 1.2, .1, std(INK), 0, .6, 1.31, casa);
    // hueso gigante con el nombre
    const hueso = new THREE.Group(); hueso.position.set(ccx + .1 * rr, 0, ccz - .05 * rr); props.add(hueso);
    caja(.25, 3.2, .25, std(INK), -2, 1.6, 0, hueso); caja(.25, 3.2, .25, std(INK), 2, 1.6, 0, hueso);
    const cuerpoH = letreroPlano('CLUB CANINO', 5, 1.2, { fondo: '#ffffff' }, hueso); cuerpoH.position.set(0, 3.6, 0);
    const reversoH = cuerpoH.clone(); reversoH.rotation.y = Math.PI; hueso.add(reversoH);
    [[-2.7, .45], [-2.7, -.45], [2.7, .45], [2.7, -.45]].forEach(([a, b]) => malla(new THREE.SphereGeometry(.55, 14, 10), blanco, a, 3.6 + b, 0, hueso));
    // hidrante
    const hid = new THREE.Group(); hid.position.set(ccx + .45 * rr, 0, ccz + .35 * rr); props.add(hid);
    malla(new THREE.CylinderGeometry(.35, .4, 1.2, 14), std('#ff3b3b'), 0, .6, 0, hid);
    malla(new THREE.SphereGeometry(.38, 14, 10), std('#ff3b3b'), 0, 1.2, 0, hid);
    // perritos
    ['#c8955c', '#f4f1ea', '#3a3330', '#ffc31f'].forEach((c, i) => {
      const g2 = new THREE.Group();
      const m = std(c);
      caja(1.2, .55, .5, m, 0, .7, 0, g2); caja(.46, .44, .42, m, .68, 1, 0, g2); caja(.42, .1, .1, m, -.72, .9, 0, g2);
      caja(.12, .2, .12, std(INK), .62, 1.3, .14, g2); caja(.12, .2, .12, std(INK), .62, 1.3, -.14, g2);
      [[.4, .16], [.4, -.16], [-.4, .16], [-.4, -.16]].forEach(([a, b]) => caja(.13, .45, .13, m, a, .22, b, g2));
      g2.userData.vivo = true; props.add(g2);
      const r0 = 1.6 + i * 1.1, w0 = (i % 2 ? -1 : 1) * (.8 + i * .15);
      animados.push((dt, t) => {
        const a = t * w0 + i * 2;
        g2.position.set(ccx + .1 * rr + Math.cos(a) * r0, Math.abs(Math.sin(t * 9 + i)) * .14, ccz + .15 * rr + Math.sin(a) * r0);
        g2.rotation.y = Math.atan2(-Math.cos(a) * w0, -Math.sin(a) * w0);
      });
    });
    circulos.push({ x: f.cx - .45 * f.r, y: f.cy + .45 * f.r, r: 9 }, { x: f.cx + .1 * f.r, y: f.cy - .05 * f.r, r: 4 });
  }

  /* ----- Calzada La Perla: arcos de entrada, puestos con letrero y series de luces ----- */
  const focos = [];
  {
    // arcos monumentales
    const arco = (y, texto, color) => {
      const g = new THREE.Group(); g.position.set(X(189), 0, Z(y)); props.add(g);
      bloque(1.6, 9, 1.6, std(INK), -11.6, 4.5, 0, g); bloque(1.6, 9, 1.6, std(INK), 11.6, 4.5, 0, g);
      bloque(25, 2.2, 1.6, std(color), 0, 9.6, 0, g);
      [1, -1].forEach((l) => { const s2 = letreroPlano(texto, 22, 1.7, { fondo: '#ffffff' }, g); s2.position.set(0, 9.6, l * .82); if (l < 0) s2.rotation.y = Math.PI; });
      for (let i = 0; i < 12; i++) malla(new THREE.SphereGeometry(.22, 10, 8), basico('#fff1b8'), -11 + i * 2, 8.4, .85, g, false);
      obstaculos.push([[189 - 62, y - 5], [189 - 54, y - 5], [189 - 54, y + 5], [189 - 62, y + 5]], [[189 + 54, y - 5], [189 + 62, y - 5], [189 + 62, y + 5], [189 + 54, y + 5]]);
    };
    arco(990, 'LA PERLA®', '#ff6b2c');
    arco(250, 'CALZADA LA PERLA', '#ffc31f');
    const puestos = [[150, 300, 'TACOS'], [228, 360, 'CAFÉ'], [150, 430, 'ELOTES'], [228, 500, 'AGUAS FRESCAS'], [150, 570, 'NIEVES'], [228, 640, 'CREPAS']];
    puestos.forEach(([x, y, nombre], i) => {
      const c = PALETA[i];
      const g = new THREE.Group(); g.position.set(X(x), 0, Z(y)); g.rotation.y = x < 189 ? Math.PI / 2 : -Math.PI / 2; props.add(g);
      bloque(3.6, 2.6, 2.8, std('#c9864a'), 0, 1.3, -.2, g);
      bloque(3.7, 1, .6, std(c), 0, .5, 1.3, g);
      const t = bloque(4.2, .14, 2.1, std(c), 0, 3, .95, g); t.rotation.x = .3;
      bloque(4, .3, 3.3, std(c), 0, 2.8, -.2, g);
      const l = letreroPlano(nombre, 3.8, .9, { fondo: '#ffffff' }, g); l.position.set(0, 3.55, 1.25);
      obstaculos.push([[x - 11, y - 11], [x + 11, y - 11], [x + 11, y + 11], [x - 11, y + 11]]);
    });
    [[189, 330], [189, 470], [189, 610], [100, 200], [330, 200], [300, 825], [150, 825]].forEach(([x, y], i) => {
      const g = new THREE.Group(); g.position.set(X(x), 0, Z(y)); props.add(g);
      malla(new THREE.CylinderGeometry(.75, .75, .08, 16), blanco, 0, .78, 0, g);
      malla(new THREE.CylinderGeometry(.05, .05, 2.5, 6), metal, 0, 1.25, 0, g);
      const sombrilla = malla(new THREE.ConeGeometry(2, .7, 8), colorMat[i % 6], 0, 2.55, 0, g);
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + .4; malla(new THREE.CylinderGeometry(.26, .26, .5, 10), maderaClara, Math.cos(a) * 1.15, .25, Math.sin(a) * 1.15, g); }
      circulos.push({ x, y, r: 6 });
    });
    const cable = [];
    for (let y = 270; y < 700; y += 50) {
      [[130, y, 248, y + 25], [248, y + 25, 130, y + 50]].forEach(([ax, ay, bx, by]) => {
        let prev = null;
        for (let k = 0; k <= 12; k++) {
          const tt = k / 12;
          const p = new THREE.Vector3(X(ax + (bx - ax) * tt), 6.2 - 1 * 4 * tt * (1 - tt), Z(ay + (by - ay) * tt));
          if (prev) cable.push(prev, p);
          if (k > 0 && k < 12) focos.push(p.clone().add(new THREE.Vector3(0, -.15, 0)));
          prev = p;
        }
      });
      caja(.16, 6.4, .16, metal, X(130), 3.2, Z(y), props); caja(.16, 6.4, .16, metal, X(248), 3.2, Z(y + 25), props);
    }
    props.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(cable), new THREE.LineBasicMaterial({ color: '#3a3530' })));
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(.16, 8, 6), basico('#ffe29a'), focos.length);
    const m4 = new THREE.Matrix4(), col = new THREE.Color();
    focos.forEach((p, i) => { m4.makeTranslation(p.x, p.y, p.z); im.setMatrixAt(i, m4); im.setColorAt(i, col.set(i % 4 ? '#fff1b8' : PALETA[(i / 4) % 6 | 0])); });
    props.add(im);
  }
  const focoMat = props.children.find((c) => c.isInstancedMesh)?.material;

  /* ----- El Patio: torre con resbaladilla, carrusel, columpios y sube y baja ----- */
  {
    const P = (s, d = 0) => [676 + .595 * s - .804 * d, 205 + .804 * s + .595 * d];
    const rot = -Math.atan2(.804, .595) + Math.PI / 2;
    // columpios
    const [sx, sy] = P(20);
    const col = new THREE.Group(); col.position.set(X(sx), 0, Z(sy)); col.rotation.y = rot; props.add(col);
    bloque(.25, 4.2, .25, std('#3d6bff'), -2.4, 2.1, 0, col); bloque(.25, 4.2, .25, std('#3d6bff'), 2.4, 2.1, 0, col); bloque(5.2, .25, .25, std('#3d6bff'), 0, 4.2, 0, col);
    [-1.2, 1.2].forEach((dx, i) => {
      const a = new THREE.Group(); a.userData.vivo = true; a.position.set(dx, 4.2, 0); col.add(a);
      caja(.05, 3, .05, metal, -.4, -1.5, 0, a); caja(.05, 3, .05, metal, .4, -1.5, 0, a); bloque(1, .14, .55, colorMat[i ? 2 : 4], 0, -3, 0, a);
      animados.push((dt, t) => { a.rotation.x = Math.sin(t * 2.2 + i * 1.4) * .6; });
    });
    // torre con resbaladilla
    const [tx, ty] = P(80);
    const torre = new THREE.Group(); torre.position.set(X(tx), 0, Z(ty)); torre.rotation.y = rot; props.add(torre);
    [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]].forEach(([a, b]) => caja(.25, 4.6, .25, std('#1fb36b'), a, 2.3, b, torre));
    bloque(3.4, .3, 3.4, std('#ffc31f'), 0, 2.4, 0, torre);
    const techo = malla(new THREE.ConeGeometry(2.8, 2, 4), std('#ff5fa2'), 0, 5.6, 0, torre); techo.rotation.y = Math.PI / 4; bordes(techo.geometry, techo);
    const resb = bloque(1.2, .14, 5.5, std('#ff6b2c', { roughness: .3 }), 0, 1.25, 4.2, torre); resb.rotation.x = .42;
    for (let i = 0; i < 6; i++) caja(1.3, .1, .14, std('#a259ff'), 0, .35 + i * .38, -1.9, torre);
    circulos.push({ x: tx, y: ty, r: 10 });
    // carrusel
    const [cx2, cy2] = P(165);
    const carr = new THREE.Group(); carr.position.set(X(cx2), 0, Z(cy2)); props.add(carr);
    const base = malla(new THREE.CylinderGeometry(3.4, 3.6, .6, 32), std('#ffffff'), 0, .3, 0, carr); bordes(base.geometry, base);
    const giro = new THREE.Group(); giro.userData.vivo = true; giro.position.y = .6; carr.add(giro);
    const tTecho = lienzo(256, 32, (ctx, W, H) => { for (let i = 0; i < 16; i++) { ctx.fillStyle = i % 2 ? '#ffffff' : '#ff5fa2'; ctx.fillRect(i * 16, 0, 16, H); } });
    malla(new THREE.ConeGeometry(3.8, 1.8, 16), std('#ffffff', { map: tTecho }), 0, 4.2, 0, giro);
    malla(new THREE.CylinderGeometry(.35, .35, 3.6, 12), std('#ffc31f'), 0, 1.8, 0, giro);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const poste = new THREE.Group(); poste.position.set(Math.cos(a) * 2.5, 0, Math.sin(a) * 2.5); giro.add(poste);
      caja(.08, 3.3, .08, metal, 0, 1.65, 0, poste);
      const caballo = bloque(1.1, .55, .4, colorMat[i], 0, 1.1, 0, poste); caballo.rotation.y = -a; caballo.userData.vivo = true;
      animados.push((dt, t) => { caballo.position.y = 1.1 + Math.sin(t * 3 + i) * .25; });
    }
    animados.push((dt) => { giro.rotation.y += dt * .7; });
    circulos.push({ x: cx2, y: cy2, r: 19 });
    // sube y baja
    const [bx, by] = P(215);
    const sb = new THREE.Group(); sb.position.set(X(bx), 0, Z(by)); sb.rotation.y = rot; props.add(sb);
    bloque(.6, .9, .6, std('#3d6bff'), 0, .45, 0, sb);
    const tabla = new THREE.Group(); tabla.userData.vivo = true; tabla.position.y = .95; sb.add(tabla);
    bloque(5, .2, .5, std('#ffc31f'), 0, 0, 0, tabla);
    bloque(.5, .5, .5, std('#ff5fa2'), -2.2, .3, 0, tabla); bloque(.5, .5, .5, std('#1fb36b'), 2.2, .3, 0, tabla);
    animados.push((dt, t) => { tabla.rotation.z = Math.sin(t * 2) * .28; });
  }

  /* ----- Foro Abierto: escenario con arco de luces, pantalla animada y reflectores ----- */
  {
    // el escenario cruza la diagonal y mira hacia el suroeste, por donde llega la gente
    const sx = X(756), sz = Z(712);
    const foro = new THREE.Group(); foro.position.set(sx, 0, sz); foro.rotation.y = Math.atan2(-.59, .8); props.add(foro);
    // en el grupo, +z apunta hacia el público
    bloque(11, 1.4, 7, std(INK), 0, .7, 0, foro);
    bloque(11.6, .25, 7.4, std('#a259ff'), 0, 1.45, 0, foro);
    malla(new THREE.TorusGeometry(5.5, .35, 10, 40, Math.PI), std('#141414'), 0, 1.4, -2.6, foro);
    for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI; malla(new THREE.SphereGeometry(.3, 10, 8), basico(PALETA[i % 6]), Math.cos(a) * 5.5, 1.4 + Math.sin(a) * 5.5, -2.2, foro, false); }
    const pantallaMat = basico('#a259ff');
    const fondo = malla(new THREE.BoxGeometry(8.6, 4.6, .3), [std(INK), std(INK), std(INK), std(INK), pantallaMat, std(INK)], 0, 4.4, -3, foro);
    const titulo = letreroPlano('FORO ABIERTO', 7.6, 1.2, { fondo: '#ffffff' }, foro); titulo.position.set(0, 5.6, -2.8);
    const sub = letreroPlano('PRÓXIMOS EVENTOS', 6, .8, { fondo: '#141414', color: '#ffc31f' }, foro); sub.position.set(0, 3.9, -2.8);
    animados.push((dt, t) => { pantallaMat.color.setHSL((t * .08) % 1, .85, .6); });
    [-4.8, 4.8].forEach((x) => { bloque(1.4, 3.2, 1.2, std('#2a2a30'), x, 3, -1.5, foro); malla(new THREE.CylinderGeometry(.42, .42, .15, 16), std('#555'), x, 3.5, -.85, foro, false).rotation.x = Math.PI / 2; });
    // reflectores giratorios
    const conoMat = new THREE.MeshBasicMaterial({ color: '#fff1b8', transparent: true, opacity: .18, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false });
    [-3, 0, 3].forEach((x, i) => {
      const r = new THREE.Group(); r.userData.vivo = true; r.position.set(x, 8.2, -2.4); foro.add(r);
      const cono = new THREE.Mesh(new THREE.ConeGeometry(1.8, 7, 20, 1, true), conoMat); cono.position.y = -3.5; r.add(cono);
      animados.push((dt, t) => { r.rotation.z = Math.sin(t * 1.2 + i * 2) * .5; r.rotation.x = .35 + Math.cos(t * .9 + i) * .2; });
    });
    // bancas para el público
    for (let fila = 0; fila < 2; fila++) bloque(8, .5, .8, colorMat[fila + 3], 0, .25, 5.4 + fila * 1.7, foro);
    obstaculos.push([[726, 680], [786, 680], [786, 742], [726, 742]]);
  }

  /* ---------- Más vida en las experiencias: borde de color, gente y detalles ---------- */
  {
    // franja de color en la orilla de cada experiencia para que se lea como un lugar
    const bordeZona = (puntos, color) => {
      const m = std(color, { roughness: .5 });
      for (let i = 0; i < puntos.length; i++) {
        const [ax, ay] = puntos[i], [bx, by] = puntos[(i + 1) % puntos.length];
        const len = Math.hypot(bx - ax, by - ay) * S; if (len < .5) continue;
        const b = caja(len + .5, .08, .5, m, X((ax + bx) / 2), .1, Z((ay + by) / 2), props);
        b.rotation.y = -Math.atan2(by - ay, bx - ax); b.castShadow = false;
      }
    };
    ['cancha', 'pabellon', 'rampas', 'patio', 'foro'].forEach((id) => { const z = D.zona(id); bordeZona(z.forma.puntos, z.acento); });

    /* --- La Cancha: malla ciclónica, lámparas y jugadores --- */
    {
      const z = D.zona('cancha'); const [[x1, y1], , [x2, y2]] = z.forma.puntos;
      const texMalla = lienzo(64, 64, (ctx, W, H) => {
        ctx.strokeStyle = '#9aa3ad'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, H); ctx.moveTo(W, 0); ctx.lineTo(0, H); ctx.stroke();
      });
      const matMalla = new THREE.MeshBasicMaterial({ map: texMalla, transparent: true, alphaTest: .3, side: THREE.DoubleSide, toneMapped: false });
      const malla2 = (ax, ay, bx, by) => {
        const len = Math.hypot(bx - ax, by - ay) * S, alto = 3.2;
        const g = new THREE.PlaneGeometry(len, alto);
        const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 1.2, uv.getY(i) * alto / 1.2);
        const m = new THREE.Mesh(g, matMalla); m.position.set(X((ax + bx) / 2), alto / 2, Z((ay + by) / 2)); m.rotation.y = -Math.atan2(by - ay, bx - ax); props.add(m);
        const n = Math.max(1, Math.round(len / 3.5));
        for (let i = 0; i <= n; i++) caja(.14, alto + .1, .14, metal, X(ax + ((bx - ax) * i) / n), alto / 2, Z(ay + ((by - ay) * i) / n), props);
        caja(len, .1, .1, metal, X((ax + bx) / 2), alto, Z((ay + by) / 2), props).rotation.y = -Math.atan2(by - ay, bx - ax);
      };
      const xm = (x1 + x2) / 2;
      malla2(x1 + 3, y1 + 3, x2 - 3, y1 + 3);
      malla2(x1 + 3, y1 + 3, x1 + 3, y2 - 34);
      malla2(x2 - 3, y1 + 3, x2 - 3, y2 - 34);
      // lámparas altas en las esquinas
      [[x1 + 3, y1 + 3], [x2 - 3, y1 + 3], [x1 + 3, y2 - 34], [x2 - 3, y2 - 34]].forEach(([x, y]) => {
        caja(.22, 8, .22, std(INK), X(x), 4, Z(y), props);
        bloque(1.3, .45, .8, std('#2a2a30'), X(x), 8.1, Z(y), props);
        caja(1.1, .12, .6, basico('#fff6c9'), X(x), 7.85, Z(y), props).castShadow = false;
      });
      // jugadores: uno tira, dos defienden y el balón va y viene
      const cz = Z(y1 + 30);
      const juego = new THREE.Group(); juego.userData.vivo = true; props.add(juego);
      [[-2.2, 0], [1.6, -1.2], [2.4, 1.6]].forEach(([dx, dz], i) => persona(juego, X(xm) + dx, cz + dz, i + 1, 1.25));
      const pelota = malla(new THREE.SphereGeometry(.28, 12, 10), std('#ff6b2c'), X(xm) - 2.2, 1.2, cz, props);
      pelota.userData.vivo = true;
      animados.push((dt, t) => {
        juego.position.x = Math.sin(t * .9) * 1.4;
        const u = (t * .7) % 1;
        if (u < .55) { const k = u / .55; pelota.position.set(X(xm) - 2.2 + juego.position.x + k * (2.2 - juego.position.x), 2.2 + Math.sin(k * Math.PI) * 4.2, cz + (Z(y1 + 8) + 1.9 - cz) * k); }
        else { const k = (u - .55) / .45; pelota.position.set(X(xm) + (juego.position.x - 2.2) * k, .3 + Math.abs(Math.cos(k * Math.PI * 3)) * 2.4 * (1 - k), Z(y1 + 10) + (cz - Z(y1 + 10)) * k); }
      });
    }

    /* --- El Jardín: bancas alrededor de la fuente --- */
    {
      const r = E.rotonda, fx = X(r.cx), fz = Z(r.cy);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2, rr = r.r * .68 * S;
        const g = new THREE.Group(); g.position.set(fx + Math.cos(a) * rr, 0, fz + Math.sin(a) * rr); g.rotation.y = -a + Math.PI / 2; props.add(g);
        bloque(2.6, .2, .8, madera, 0, .55, 0, g); bloque(2.6, .6, .15, madera, 0, .95, .38, g);
        caja(.15, .5, .7, metal, -1.1, .25, 0, g); caja(.15, .5, .7, metal, 1.1, .25, 0, g);
      }
    }

    /* --- El Pabellón: papel picado colgando entre los postes --- */
    {
      const z = D.zona('pabellon'); const [[x1, y1], , [x2, y2]] = z.forma.puntos;
      const w = (x2 - x1) * S, h = (y2 - y1) * S, cx = X((x1 + x2) / 2), cz = Z((y1 + y2) / 2);
      const banderitas = PALETA.map((c) => basico(c, { side: THREE.DoubleSide }));
      for (let fila = 0; fila < 4; fila++) {
        const zz = cz - h * .38 + fila * h * .25;
        for (let i = 0; i < 14; i++) {
          const t = i / 13, x = cx - w * .44 + t * w * .88, y = 6.1 - Math.sin(t * Math.PI) * .7;
          const b = new THREE.Mesh(new THREE.PlaneGeometry(.55, .7), banderitas[(i + fila) % 6]); b.position.set(x, y, zz); props.add(b);
        }
      }
    }

    /* --- Las Rampas: más skaters y letrero --- */
    {
      const z = D.zona('rampas'); const [cx, cy] = D.centroide(z.forma.puntos);
      const ext = 14, R = 3.4, P = 1.4;
      [[1.3, 0, '#1fb36b', '#ff6b2c'], [2.1, 2.4, '#a259ff', '#ffc31f']].forEach(([vel, fase, cuerpo, tabla], i) => {
        const sk = new THREE.Group(); sk.userData.vivo = true; props.add(sk);
        bloque(1.5, .12, .45, std(tabla), 0, .12, 0, sk);
        bloque(.5, 1.1, .4, std(cuerpo), 0, .85, 0, sk);
        bloque(.45, .7, .35, std('#ffffff'), 0, 1.75, 0, sk);
        malla(new THREE.SphereGeometry(.28, 12, 10), pielMats[i + 1], 0, 2.3, 0, sk);
        animados.push((dt, t) => {
          const u = Math.sin(t * vel + fase);
          const x = u * (ext - P - .4);
          const d = Math.max(0, Math.abs(x) - (ext - P - R));
          const y = d > 0 ? R - Math.sqrt(Math.max(0, R * R - d * d)) : 0;
          sk.position.set(X(cx) + x, Math.min(R, y) + (Math.abs(u) > .97 ? (Math.abs(u) - .97) * 30 : 0) + (i && Math.abs(x) < 3 ? 1 + Math.sin(t * 6) * .2 : 0), Z(cy) + (i ? 2.6 : 0));
          sk.rotation.z = d > 0 ? -Math.sign(x) * Math.asin(Math.min(1, d / R)) : 0;
          sk.rotation.y = Math.cos(t * vel + fase) > 0 ? 0 : Math.PI;
        });
      });
      const poste = new THREE.Group(); poste.position.set(X(cx) + ext + 2, 0, Z(cy) + 6.5); props.add(poste);
      caja(.3, 5, .3, std(INK), 0, 2.5, 0, poste);
      [1, -1].forEach((l) => { const s2 = letreroPlano('LAS RAMPAS', 5.4, 1.3, { fondo: '#ffc31f' }, poste); s2.position.set(0, 5.3, l * .05); if (l < 0) s2.rotation.y = Math.PI; });
    }

    /* --- El Patio: pisos de hule, brincolín, arenero y arco de entrada --- */
    {
      const P = (s, d = 0) => [676 + .595 * s - .804 * d, 205 + .804 * s + .595 * d];
      const rot = -Math.atan2(.804, .595) + Math.PI / 2;
      const hule = ['#ffd23f', '#7fd8ff', '#b7f28a', '#ffb3d3'].map((c) => std(c, { roughness: 1 }));
      [[20, 18], [80, 22], [165, 26], [215, 16]].forEach(([s, r], i) => { const [x, y] = P(s); sueloCirculo(x, y, r, hule[i], .09, props); });
      // brincolín con un niño saltando
      const [tx, ty] = P(128, 14);
      const brinco = new THREE.Group(); brinco.position.set(X(tx), 0, Z(ty)); props.add(brinco);
      const aroB = malla(new THREE.TorusGeometry(2, .25, 8, 32), std('#3d6bff'), 0, .9, 0, brinco); aroB.rotation.x = Math.PI / 2;
      malla(new THREE.CircleGeometry(1.85, 32).rotateX(-Math.PI / 2), std(INK), 0, .85, 0, brinco, false);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; caja(.12, .9, .12, metal, Math.cos(a) * 2, .45, Math.sin(a) * 2, brinco); }
      const nino = persona(brinco, 0, 0, 4, .8); nino.userData.vivo = true;
      animados.push((dt, t) => { nino.position.y = .85 + Math.abs(Math.sin(t * 3.4)) * 1.6; });
      circulos.push({ x: tx, y: ty, r: 11 });
      // arenero con cubetas
      const [ax, ay] = P(132, -15);
      const arena = new THREE.Group(); arena.position.set(X(ax), 0, Z(ay)); arena.rotation.y = rot; props.add(arena);
      bloque(3, .4, 3, maderaClara, 0, .2, 0, arena);
      circulos.push({ x: ax, y: ay, r: 10 }, { x: P(100)[0], y: P(100)[1], r: 9 });   // arenero y final de la resbaladilla
      caja(2.6, .1, 2.6, std('#f3d58a', { roughness: 1 }), 0, .38, 0, arena);
      [[-.6, .5, 0], [.7, -.4, 2], [.2, .8, 4]].forEach(([a, b, c]) => malla(new THREE.CylinderGeometry(.25, .18, .4, 10), colorMat[c], a, .6, b, arena));
      // arco de entrada con globos, del lado de la rotonda
      const [gx, gy] = P(240);
      const arco = new THREE.Group(); arco.position.set(X(gx), 0, Z(gy)); arco.rotation.y = rot; props.add(arco);
      [-5.4, 5.4].forEach((x, i) => {
        bloque(.7, 6, .7, colorMat[i ? 2 : 3], x, 3, 0, arco);
        for (let k = 0; k < 5; k++) malla(new THREE.SphereGeometry(.55, 12, 10), colorMat[(k + i) % 6], x + Math.cos(k * 1.3) * .6, 6.6 + k * .35, Math.sin(k * 1.3) * .6, arco);
      });
      bloque(11.5, 1.6, .6, std('#ff5fa2'), 0, 6, 0, arco);
      [1, -1].forEach((l) => { const s2 = letreroPlano('EL PATIO', 6.5, 1.2, { fondo: '#ffffff' }, arco); s2.position.set(0, 6, l * .32); if (l < 0) s2.rotation.y = Math.PI; });
    }

    /* --- Foro Abierto: más gradas, público y torres de luces --- */
    {
      const foro = new THREE.Group(); foro.position.set(X(756), 0, Z(712)); foro.rotation.y = Math.atan2(-.59, .8); props.add(foro);
      for (let fila = 2; fila < 4; fila++) bloque(9 + fila, .5, .8, colorMat[(fila + 3) % 6], 0, .25, 5.4 + fila * 1.7, foro);
      [-7.4, 7.4].forEach((x) => {
        bloque(.6, 9, .6, std(INK), x, 4.5, 1.5, foro);
        bloque(1.8, .9, .9, std('#2a2a30'), x, 9.2, 1.5, foro);
        [-.5, 0, .5].forEach((dx) => malla(new THREE.SphereGeometry(.22, 10, 8), basico('#fff6c9'), x + dx, 9.1, 2, foro, false));
      });
      // público frente al escenario, en dos grupos que brincan a destiempo
      [0, 1].forEach((k) => {
        const g = new THREE.Group(); g.userData.vivo = true; foro.add(g);
        for (let i = 0; i < 9; i++) persona(g, -6 + i * 1.5 + k * .75, 12.4 + k * 1.6 + ((i * 7) % 3) * .3, i + k * 3, 1.15);
        animados.push((dt, t) => { g.position.y = Math.max(0, Math.sin(t * 5 + k * Math.PI)) * .35; });
      });
      foro.updateMatrixWorld(true);
      // las bancas también estorban al caminar (y la estación de juego no cae encima)
      for (let fila = 0; fila < 4; fila++) for (let x = -5; x <= 5; x += 2.5) {
        const b = foro.localToWorld(new THREE.Vector3(x, 0, 5.4 + fila * 1.7));
        const [bx, by] = aPlano(b.x, b.z); circulos.push({ x: bx, y: by, r: 5 });
      }
      const v = foro.localToWorld(new THREE.Vector3(0, 0, 13.2));
      const [px, py] = aPlano(v.x, v.z);
      circulos.push({ x: px, y: py, r: 22 });
    }
  }

  /* ----- Mercado (terraza del Nivel 2): solo en el mapa isométrico ----- */
  if (!fps) {
    const z = D.zona('mercado');
    const terraza = new THREE.Mesh(new THREE.ExtrudeGeometry(forma(z.forma.puntos), { depth: .5, bevelEnabled: false }).rotateX(-Math.PI / 2), std('#ffe6c2'));
    terraza.position.y = 2 * ALTO_NIVEL - .3; terraza.receiveShadow = true; terraza.castShadow = true; niveles[2].add(terraza);
    bordes(terraza.geometry, niveles[2], terraza.position);
    const [[x1, y1], , [x2, y2]] = z.forma.puntos;
    const tTienda = lienzo(256, 32, (ctx, W, H) => { for (let i = 0; i < 16; i++) { ctx.fillStyle = i % 2 ? '#ffffff' : '#ff9f1c'; ctx.fillRect(i * 16, 0, 16, H); } });
    [[.18, .28], [.42, .28], [.66, .28], [.18, .72], [.42, .72], [.66, .72]].forEach(([a, b], i) => {
      const x = x1 + (x2 - x1) * a, y = y1 + (y2 - y1) * b;
      const g = new THREE.Group(); g.position.set(X(x), 2 * ALTO_NIVEL + .2, Z(y)); niveles[2].add(g);
      [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]].forEach(([p, q]) => caja(.14, 2.8, .14, metal, p, 1.4, q, g));
      const carpa = malla(new THREE.ConeGeometry(3.2, 1.6, 4), std('#ffffff', { map: tTienda }), 0, 3.6, 0, g); carpa.rotation.y = Math.PI / 4;
      bloque(2.4, .9, 1.2, std('#c9864a'), 0, .45, 0, g);
    });
    // mesas con sombrilla, gente y series de luces sobre el pasillo central
    const yM = 2 * ALTO_NIVEL + .2;
    [[.88, .3], [.88, .55], [.88, .8], [.3, .5], [.54, .5]].forEach(([a, b], i) => {
      const g = new THREE.Group(); g.position.set(X(x1 + (x2 - x1) * a), yM, Z(y1 + (y2 - y1) * b)); niveles[2].add(g);
      malla(new THREE.CylinderGeometry(.9, .9, .1, 16), blanco, 0, .8, 0, g);
      caja(.1, 2.6, .1, metal, 0, 1.3, 0, g);
      malla(new THREE.ConeGeometry(2, .6, 8), colorMat[i % 6], 0, 2.7, 0, g);
      [0, 2].forEach((k) => persona(g, Math.cos(k + i) * 1.3, Math.sin(k + i) * 1.3, i + k, 1.1));
    });
    const cableM = [];
    for (let k = 0; k < 4; k++) {
      const xa = x1 + (x2 - x1) * (.08 + k * .25), xb = xa + (x2 - x1) * .2;
      for (let q = 0; q < 10; q++) {
        const t0 = q / 10, t1 = (q + 1) / 10, yy = y1 + (y2 - y1) * .5;
        cableM.push(new THREE.Vector3(X(xa + (xb - xa) * t0), yM + 4 - Math.sin(t0 * Math.PI) * .6, Z(yy)), new THREE.Vector3(X(xa + (xb - xa) * t1), yM + 4 - Math.sin(t1 * Math.PI) * .6, Z(yy)));
        malla(new THREE.SphereGeometry(.16, 8, 6), basico(PALETA[q % 6]), X(xa + (xb - xa) * t0), yM + 3.85 - Math.sin(t0 * Math.PI) * .6, Z(yy), niveles[2], false);
      }
    }
    niveles[2].add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(cableM), new THREE.LineBasicMaterial({ color: '#3a3530' })));
    const letrero = letreroPlano('MERCADO LA PERLA', 12, 1.8, { fondo: '#ff9f1c' }, niveles[2]);
    letrero.position.set(X((x1 + x2) / 2), 2 * ALTO_NIVEL + 2, Z(y2) + .2);
  }

  /* ----- Anuncios monumentales de las anclas ----- */
  {
    const anuncio = (nombre, texto, fondo, color, nivelTope) => {
      const t = D.buscarTienda(nombre, nivelTope);
      if (!t) return;
      const g = new THREE.Group();
      g.position.set(X(t.centro[0]), nivelTope * ALTO_NIVEL + ALTO_LOCAL + .8, Z(t.centro[1]));
      g.rotation.y = -Math.PI / 4;
      niveles[nivelTope].add(g);
      caja(.5, 3, .5, std(INK), -5, 1.5, 0, g); caja(.5, 3, .5, std(INK), 5, 1.5, 0, g);
      [1, -1].forEach((l) => { const s2 = letreroPlano(texto, 14, 3, { fondo, color }, g); s2.position.set(0, 4.2, l * .05); if (l < 0) s2.rotation.y = Math.PI; });
    };
    anuncio('Liverpool', 'Liverpool', '#ff4fa0', '#ffffff', 2);
    anuncio('Cinépolis', 'CINÉPOLIS', '#3d6bff', '#ffffff', 2);
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
    for (let i = 0; i < (movil ? 7 : 10); i++) {
      const g = new THREE.Group(); g.userData.vivo = true;
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
  // la estación va en el punto libre más cercano al centro de la experiencia
  function sitioJuego(z) {
    if (!z.forma || z.nivel !== 0) return z.acceso;
    const circ = z.forma.tipo === 'circ';
    const [cx, cy] = circ ? [z.forma.cx, z.forma.cy] : D.centroide(z.forma.puntos);
    const dentro = (x, y) => (circ ? Math.hypot(x - cx, y - cy) < z.forma.r - 6 : D.enPoligono(z.forma.puntos, x, y));
    for (let r = 0; r < 90; r += 4) {
      const n = r ? Math.ceil((2 * Math.PI * r) / 6) : 1;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + Math.PI / 2, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        if (dentro(x, y) && !choca(x, y, 9)) return [x, y];
      }
    }
    return z.acceso;
  }
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
    if (fps) {
      const [sx, sy] = sitioJuego(z);
      const g = new THREE.Group();
      g.position.set(X(sx), 0, Z(sy));
      const tex = lienzo(256, 384, (ctx, W, H) => {
        ctx.fillStyle = '#141414'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = z.acento; ctx.fillRect(10, 10, W - 20, 220);
        ctx.save(); ctx.translate(W / 2 - 60, 60); ctx.scale(5, 5);
        ctx.strokeStyle = D.tinta(z.acento); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.stroke(new Path2D(D.ICONOS[z.icono])); ctx.restore();
        ctx.fillStyle = '#ffc31f'; ctx.fillRect(10, 244, W - 20, 130);
        ctx.fillStyle = '#141414'; ctx.font = '900 44px Montserrat, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('▶ JUGAR', W / 2, 325);
      });
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, .25), [std(INK), std(INK), std(INK), std(INK), basico('#ffffff', { map: tex }), basico('#ffffff', { map: tex })]);
      panel.position.y = 2.2; panel.castShadow = true; g.add(panel);
      caja(.2, 1.2, .2, std(INK), 0, .6, 0, g);
      const aro = new THREE.Mesh(new THREE.RingGeometry(1.6, 2, 32).rotateX(-Math.PI / 2), basico(z.acento, { transparent: true, opacity: .8 }));
      aro.position.y = .1; g.add(aro);
      scene.add(g);
      animados.push((dt, t) => { panel.rotation.y = t * .8; aro.scale.setScalar(1 + Math.sin(t * 3) * .08); });
      estaciones.push({ zona: z, grupo: g, x: sx, y: sy });
    }
  });

  /* ---------- Losas de Nivel 1 y 2 con barandales de vidrio alrededor de los vacíos ---------- */
  {
    const texL = baldosa('#efeae0', '#ddd6c8', 4); texL.repeat.set(.25, .25);
    const matL = std('#ffffff', { map: texL, roughness: .9 });
    const vidrioB = new THREE.MeshStandardMaterial({ color: '#bfe6ff', transparent: true, opacity: .35, roughness: .1, metalness: .1, depthWrite: false });
    const barra = std(INK);
    const barandal = (ax, az, bx, bz, y, padre) => {
      const len = Math.hypot(bx - ax, bz - az); if (len < .3) return;
      const g = new THREE.Group(); g.position.set((ax + bx) / 2, y, (az + bz) / 2); g.rotation.y = -Math.atan2(bz - az, bx - ax); padre.add(g);
      caja(len, .1, .14, barra, 0, 1.1, 0, g);
      caja(len, .1, .1, barra, 0, .12, 0, g);
      const vid = caja(len, .9, .05, vidrioB, 0, .6, 0, g); vid.castShadow = false;
      const n = Math.max(1, Math.round(len / 2.4));
      for (let i = 0; i <= n; i++) caja(.09, 1.15, .09, barra, -len / 2 + (i * len) / n, .58, 0, g);
    };
    const r = E.rotonda;
    const cercaRotonda = (x, y) => Math.abs(Math.hypot(x - r.cx, y - r.cy) - r.r) < 6;
    [1, 2].forEach((n) => {
      const y = n * ALTO_NIVEL + .18, est = estructuras[n];
      // piso: solo pasillos públicos y lo construido; donde no hay nada se ve la azotea del nivel de abajo
      est.losas.forEach(({ contorno, huecos }) => {
        const sh = forma(contorno);
        huecos.forEach((h) => sh.holes.push(new THREE.Path(h.map(([x, yy]) => new THREE.Vector2(X(x), -Z(yy))))));
        const geo = new THREE.ExtrudeGeometry(sh, { depth: .35, bevelEnabled: false });
        geo.rotateX(-Math.PI / 2);
        const m = new THREE.Mesh(geo, matL); m.position.y = y - .35; m.castShadow = true; m.receiveShadow = true;
        niveles[n].add(m);
        bordes(geo, niveles[n], m.position, .9);
      });
      // barandal donde el pasillo da a un vacío o a una azotea (la rotonda lleva su aro redondo)
      est.barandales.forEach(([ax, ay, bx, by]) => {
        if (cercaRotonda(ax, ay) && cercaRotonda(bx, by)) return;
        barandal(X(ax), Z(ay), X(bx), Z(by), y, niveles[n]);
      });
      const cx = X(r.cx), cz = Z(r.cy), rr = r.r * S;
      const aro = malla(new THREE.TorusGeometry(rr, .07, 6, 72), barra, cx, y + 1.1, cz, niveles[n]); aro.rotation.x = Math.PI / 2;
      malla(new THREE.CylinderGeometry(rr, rr, .9, 72, 1, true), vidrioB, cx, y + .6, cz, niveles[n], false);
      for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; caja(.09, 1.15, .09, barra, cx + Math.cos(a) * rr, y + .58, cz + Math.sin(a) * rr, niveles[n]); }
    });
  }

  /* ---------- Atlas de letreros: todos los nombres de tienda en pocas texturas ---------- */
  if (letrerosAtlas.length) {
    const AT = 2048, ALTO = movil ? 56 : 72;
    const paginas = [];
    let ctx = null, x = 0, y = 0;
    const nueva = () => { const c = document.createElement('canvas'); c.width = c.height = AT; ctx = c.getContext('2d'); x = 0; y = 0; paginas.push({ c, geos: [[], [], []] }); };
    nueva();
    letrerosAtlas.forEach((l) => {
      const pw = Math.min(AT, Math.round((ALTO * l.w) / l.h));
      if (x + pw > AT) { x = 0; y += ALTO + 4; }
      if (y + ALTO > AT) nueva();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, pw, ALTO);
      ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.strokeRect(x + 3, y + 3, pw - 6, ALTO - 6);
      ctx.fillStyle = l.acento; ctx.fillRect(x + 8, y + 8, ALTO - 16, ALTO - 16);
      ctx.fillStyle = INK; ctx.fillRect(x + ALTO - 8, y + 8, 4, ALTO - 16);
      ajustar(ctx, l.texto, pw - ALTO - 18, ALTO * .5, 900);
      ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(l.texto, x + ALTO + (pw - ALTO) / 2 - 4, y + ALTO * .54);
      const g = new THREE.PlaneGeometry(l.w, l.h);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (x + uv.getX(i) * pw) / AT, 1 - (y + (1 - uv.getY(i)) * ALTO) / AT);
      l.grupo.updateMatrixWorld(true);
      g.applyMatrix4(new THREE.Matrix4().makeTranslation(l.pos[0], l.pos[1], l.pos[2]).premultiply(l.grupo.matrixWorld));
      paginas[paginas.length - 1].geos[l.nivel].push(g);
      x += pw + 4;
    });
    paginas.forEach((p) => {
      const t = new THREE.CanvasTexture(p.c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
      const mat = basico('#ffffff', { map: t });
      p.geos.forEach((geos, n) => {
        if (!geos.length) return;
        const m = new THREE.Mesh(mergeGeometries(geos), mat);
        m.userData.noFusionar = true; niveles[n].add(m);
      });
    });
  }

  /* ---------- Fusión de geometría: muchas piezas -> pocas llamadas de dibujo ---------- */
  const SOLO = ['position', 'normal', 'uv'];
  const limpia = (geo, attrs = SOLO) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    Object.keys(g.attributes).forEach((k) => { if (!attrs.includes(k)) g.deleteAttribute(k); });
    if (attrs.includes('uv') && !g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (attrs.includes('normal') && !g.attributes.normal) g.computeVertexNormals();
    g.clearGroups();
    return g;
  };
  const claveMat = (m) => [m.type, m.color && m.color.getHexString(), m.map ? m.map.uuid : '', m.transparent, m.opacity, m.side, m.emissive ? m.emissive.getHexString() : '', m.emissiveIntensity, m.roughness, m.metalness, m.wireframe, m.blending, m.toneMapped, m.depthWrite, m.flatShading].join('|');
  const tieneVivo = (o, tope) => { for (let p = o; p && p !== tope; p = p.parent) if (p.userData && p.userData.vivo) return true; return false; };
  function fusionar(grupo, conVivos = false) {
    grupo.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(grupo.matrixWorld).invert();
    const cubos = new Map(); const lineas = []; const quitar = [];
    grupo.traverse((o) => {
      if (o === grupo || tieneVivo(o, grupo)) return; // lo que se anima por separado no se fusiona
      const rel = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      if (o.isMesh && !o.isInstancedMesh && !Array.isArray(o.material) && !o.userData.tienda && !o.userData.zona && !o.userData.noFusionar) {
        const k = claveMat(o.material) + (o.castShadow ? 's' : '');
        if (!cubos.has(k)) cubos.set(k, { mat: o.material, geos: [], sombra: o.castShadow, recibe: o.receiveShadow });
        const g = limpia(o.geometry); g.applyMatrix4(rel); cubos.get(k).geos.push(g); quitar.push(o);
      } else if (o.isLineSegments && !o.userData.noFusionar) {
        const g = limpia(o.geometry, ['position']); g.applyMatrix4(rel); lineas.push(g); quitar.push(o);
      }
    });
    quitar.forEach((o) => { if (o.parent) o.parent.remove(o); });
    cubos.forEach(({ mat, geos, sombra, recibe }) => {
      const m = new THREE.Mesh(mergeGeometries(geos), mat); m.castShadow = sombra; m.receiveShadow = recibe; m.userData.noFusionar = true; grupo.add(m);
    });
    if (lineas.length) {
      const l = new THREE.LineSegments(mergeGeometries(lineas), new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: .9 }));
      l.userData.noFusionar = true; grupo.add(l);
      return l;
    }
    return null;
  }
  // tiendas: una malla por color y nivel (techos y muros por separado); las originales quedan invisibles para tocarlas
  const fusionTiendas = [[], [], []];
  const dividir = (geo) => {
    const partes = { 0: [], 1: [] };
    geo.groups.forEach((gr) => {
      const ng = new THREE.BufferGeometry();
      SOLO.forEach((k) => { const a = geo.attributes[k]; ng.setAttribute(k, new THREE.BufferAttribute(a.array.slice(gr.start * a.itemSize, (gr.start + gr.count) * a.itemSize), a.itemSize)); });
      partes[gr.materialIndex ? 1 : 0].push(ng);
    });
    return [partes[0], partes[1]];
  };
  niveles.forEach((g, n) => {
    const porMat = new Map();
    tapasMallas.filter((m) => m.userData.nivel === n).forEach((m) => {
      if (!porMat.has(m.userData.mats)) porMat.set(m.userData.mats, { tapas: [], lados: [] });
      m.updateMatrix();
      const geo = m.geometry.clone(); geo.applyMatrix4(m.matrix);
      const [tapas, lados] = dividir(geo);
      porMat.get(m.userData.mats).tapas.push(...tapas); porMat.get(m.userData.mats).lados.push(...lados);
      m.parent.remove(m);
    });
    porMat.forEach((v, mats) => {
      const t = new THREE.Mesh(mergeGeometries(v.tapas), mats[0]); const l = new THREE.Mesh(mergeGeometries(v.lados), mats[1]);
      [t, l].forEach((x) => { x.castShadow = true; x.receiveShadow = true; x.userData.noFusionar = true; g.add(x); });
      fusionTiendas[n].push({ t, l, mats });
    });
    // muros neutros del nivel: azoteas y fachadas en dos mallas
    const azoteas = [], muros = [];
    murosGeo[n].forEach((geo) => { const [a, b] = dividir(geo); azoteas.push(...a); muros.push(...b); });
    [[azoteas, muroMats[0]], [muros, muroMats[1]]].forEach(([geos, mat]) => {
      if (!geos.length) return;
      const x = new THREE.Mesh(mergeGeometries(geos), mat); x.castShadow = true; x.receiveShadow = true; x.userData.noFusionar = true; g.add(x);
    });
  });
  // piezas animadas: cada grupo se compacta por dentro
  const vivos = [];
  raiz.traverse((o) => { if (o.isGroup && o.userData.vivo) vivos.push(o); });
  vivos.forEach((g) => fusionar(g, true));
  fusionar(suelo);
  const lineasNivel = niveles.map((g) => fusionar(g));

  function mostrarNivel(nivel) {
    niveles.forEach((g, i) => {
      g.visible = i <= nivel;
      const activo = i === nivel;
      fusionTiendas[i].forEach(({ t, l, mats }) => { t.material = activo ? mats[0] : gris[0]; l.material = activo ? mats[1] : gris[1]; });
      if (lineasNivel[i]) lineasNivel[i].material.opacity = activo ? .9 : .25;
    });
  }

  function choca(px, py, r) {
    if (px < L.x1 + 45 || px > 1188 || py < -16 || py > 1070) return true;
    for (const c of circulos) if ((px - c.x) ** 2 + (py - c.y) ** 2 < (c.r + r) ** 2) return true;
    for (const p of obstaculos) {
      if (D.enPoligono(p, px, py)) return true;
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) if (distSeg(px, py, p[j][0], p[j][1], p[i][0], p[i][1]) < r) return true;
    }
    return false;
  }

  function actualizar(dt, t) { animados.forEach((f) => f(dt, t)); }

  const fachadas = [...Object.values(cacheFascia), ...Object.values(cacheMat).map((m) => m[1])];
  return { scene, raiz, niveles, pickables, tiendasMallas, fachadas, frentes, estaciones, hemi, sol, focoMat, vidrio, mostrarNivel, choca, actualizar };
}
