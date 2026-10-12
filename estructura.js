/*
  Estructura continua de cada nivel (sin dependencias, la usa escena.js).

  En el plano los locales están separados por franjas blancas y hay huecos entre ellos que en la
  plaza real son muro, bodegas o pasillos de servicio. Para decidir qué es público:
    1. Se rasteriza el nivel a 1 px y un cierre morfológico tapa las franjas angostas entre locales.
    2. Del espacio libre que queda, solo es público lo que está conectado a la calle o a los
       espacios abiertos (calzada, plazas, diagonales, rotonda, experiencias) por un paso de al
       menos ~4 m de ancho. Lo demás (patios encerrados, rendijas sin salida) se vuelve edificio.
  Devuelve los rellenos como polígonos y dos consultas: macizo(x, y) y publico(x, y).
*/

function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// dilatación con un cuadrado de lado 2r+1 (por renglones y luego por columnas)
function dilatar(src, w, h, r) {
  const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h);
  const acc = new Int32Array(Math.max(w, h) + 1);
  for (let j = 0; j < h; j++) {
    const o = j * w;
    for (let i = 0; i < w; i++) acc[i + 1] = acc[i] + src[o + i];
    for (let i = 0; i < w; i++) tmp[o + i] = acc[Math.min(w, i + r + 1)] - acc[Math.max(0, i - r)] > 0 ? 1 : 0;
  }
  for (let i = 0; i < w; i++) {
    for (let j = 0; j < h; j++) acc[j + 1] = acc[j] + tmp[j * w + i];
    for (let j = 0; j < h; j++) out[j * w + i] = acc[Math.min(h, j + r + 1)] - acc[Math.max(0, j - r)] > 0 ? 1 : 0;
  }
  return out;
}
const invertir = (a) => { for (let i = 0; i < a.length; i++) a[i] = 1 - a[i]; return a; };
const erosionar = (src, w, h, r) => invertir(dilatar(invertir(Uint8Array.from(src)), w, h, r));

function simplificar(pts, tol) {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  let max = 0, k = 0;
  for (let i = 1; i < pts.length - 1; i++) { const d = distSeg(pts[i][0], pts[i][1], ax, ay, bx, by); if (d > max) { max = d; k = i; } }
  if (max <= tol) return [pts[0], pts[pts.length - 1]];
  return simplificar(pts.slice(0, k + 1), tol).slice(0, -1).concat(simplificar(pts.slice(k), tol));
}

// contornos de una máscara (interior a la izquierda): exteriores con área negativa, huecos con positiva
function contornos(M, w, h, areaMin, conHuecos = false) {
  const W1 = w + 1, sig = new Map();
  const arista = (ax, ay, bx, by) => { const k = ay * W1 + ax, l = sig.get(k); if (l) l.push(by * W1 + bx); else sig.set(k, [by * W1 + bx]); };
  const en = (i, j) => i >= 0 && j >= 0 && i < w && j < h && M[j * w + i] === 1;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (!M[j * w + i]) continue;
    if (!en(i, j - 1)) arista(i + 1, j, i, j);
    if (!en(i, j + 1)) arista(i, j + 1, i + 1, j + 1);
    if (!en(i - 1, j)) arista(i, j, i, j + 1);
    if (!en(i + 1, j)) arista(i + 1, j + 1, i + 1, j);
  }
  const lazos = [];
  for (const [inicio] of sig) {
    while (sig.get(inicio) && sig.get(inicio).length) {
      const pts = []; let v = inicio, dx = 0, dy = 0;
      do {
        const l = sig.get(v);
        const x = v % W1, y = (v - x) / W1;
        let idx = 0;
        if (l.length > 1) { const k = l.findIndex((u) => (u % W1) - x === dy && ((u - (u % W1)) / W1) - y === -dx); if (k >= 0) idx = k; }
        const u = l.splice(idx, 1)[0];
        const ux = u % W1, uy = (u - ux) / W1;
        if (ux - x !== dx || uy - y !== dy) pts.push([x, y]);
        dx = ux - x; dy = uy - y; v = u;
      } while (v !== inicio && sig.get(v) && sig.get(v).length);
      let a = 0;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
      if (a / 2 < -areaMin || (conHuecos && a / 2 > areaMin)) lazos.push(Object.assign(pts, { hueco: a > 0, area: Math.abs(a / 2) }));
    }
  }
  return lazos;
}

function enPoligono(p, x, y) {
  let d = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) d = !d;
  }
  return d;
}
function rasterizar(M, w, h, x0, y0, p, valor = 1) {
  let ya = Infinity, yb = -Infinity;
  p.forEach(([, y]) => { ya = Math.min(ya, y); yb = Math.max(yb, y); });
  for (let j = Math.max(0, Math.floor(ya - y0)); j < Math.min(h, Math.ceil(yb - y0) + 1); j++) {
    const yc = y0 + j + .5, xs = [];
    for (let i = 0, k = p.length - 1; i < p.length; k = i++) {
      const [ax, ay] = p[k], [bx, by] = p[i];
      if ((ay > yc) !== (by > yc)) xs.push(ax + ((yc - ay) * (bx - ax)) / (by - ay));
    }
    xs.sort((a, b) => a - b);
    for (let q = 0; q + 1 < xs.length; q += 2) {
      const ia = Math.max(0, Math.ceil(xs[q] - x0 - .5)), ib = Math.min(w - 1, Math.floor(xs[q + 1] - x0 - .5));
      for (let i = ia; i <= ib; i++) M[j * w + i] = valor;
    }
  }
}
const circuloPoly = ({ cx, cy, r }) => Array.from({ length: 40 }, (_, i) => [cx + r * Math.cos((i / 40) * Math.PI * 2), cy + r * Math.sin((i / 40) * Math.PI * 2)]);
const aPoly = (f) => (Array.isArray(f) ? f : circuloPoly(f));

/*
  polys: polígonos de los locales del nivel.
  opciones.espacios: polígonos o círculos {cx, cy, r} que son públicos con seguridad (semillas).
  opciones.losa: polígonos del piso de un nivel alto. Sin losa es planta baja: alrededor está la calle.
  opciones.vacios: polígonos o círculos sin piso pero abiertos (vacíos de los niveles altos).
  opciones.alcance: en niveles altos, qué tan lejos de un vacío o terraza llega el pasillo público.
  opciones.limites: [x1, y1, x2, y2] del área a analizar.
*/
function analizar(polys, { espacios = [], losa = null, vacios = [], limites, radio, paso, alcance }) {
  const [lx1, ly1, lx2, ly2] = limites;
  const x0 = Math.floor(lx1), y0 = Math.floor(ly1);
  const w = Math.ceil(lx2) - x0, h = Math.ceil(ly2) - y0;
  const N = w * h;
  const aire = !!losa;
  const base = new Uint8Array(N);
  polys.forEach((p) => rasterizar(base, w, h, x0, y0, p));
  // 1. franjas angostas entre locales
  const cierre = erosionar(dilatar(base, w, h, radio), w, h, radio);
  // 2. espacio libre y lo que se alcanza desde las semillas por pasos anchos
  const vacio = new Uint8Array(N);
  vacios.forEach((f) => rasterizar(vacio, w, h, x0, y0, aPoly(f)));
  const pisable = new Uint8Array(N);
  if (aire) { losa.forEach((p) => rasterizar(pisable, w, h, x0, y0, p)); for (let i = 0; i < N; i++) pisable[i] |= vacio[i]; } else pisable.fill(1);
  const libre = new Uint8Array(N);
  for (let i = 0; i < N; i++) libre[i] = pisable[i] && !cierre[i] ? 1 : 0;
  const semilla = Uint8Array.from(vacio);
  espacios.forEach((f) => rasterizar(semilla, w, h, x0, y0, aPoly(f)));
  if (!aire) { for (let i = 0; i < w; i++) semilla[i] = semilla[N - w + i] = 1; for (let j = 0; j < h; j++) semilla[j * w] = semilla[j * w + w - 1] = 1; }
  const nucleo = erosionar(libre, w, h, paso);
  const cerca = aire ? dilatar(semilla, w, h, alcance) : null;
  if (cerca) for (let i = 0; i < N; i++) nucleo[i] &= cerca[i];
  const inunda = (desde, por) => {
    const marca = new Uint8Array(N), cola = new Int32Array(N);
    let cab = 0, fin = 0;
    for (let i = 0; i < N; i++) if (desde[i] && por[i]) { marca[i] = 1; cola[fin++] = i; }
    while (cab < fin) {
      const i = cola[cab++], x = i % w;
      if (x > 0 && !marca[i - 1] && por[i - 1]) { marca[i - 1] = 1; cola[fin++] = i - 1; }
      if (x < w - 1 && !marca[i + 1] && por[i + 1]) { marca[i + 1] = 1; cola[fin++] = i + 1; }
      if (i >= w && !marca[i - w] && por[i - w]) { marca[i - w] = 1; cola[fin++] = i - w; }
      if (i < N - w && !marca[i + w] && por[i + w]) { marca[i + w] = 1; cola[fin++] = i + w; }
    }
    return marca;
  };
  const pub = dilatar(inunda(semilla, nucleo), w, h, paso);
  for (let i = 0; i < N; i++) pub[i] = (pub[i] && libre[i] && (!cerca || cerca[i])) || (semilla[i] && libre[i]) ? 1 : 0;
  // 3. en niveles altos, lo libre que no es pasillo y da al exterior es azotea (sin piso)
  let techo = null;
  if (aire) {
    const resto = new Uint8Array(N), orilla = new Uint8Array(N);
    for (let i = 0; i < N; i++) resto[i] = libre[i] && !pub[i] ? 1 : 0;
    for (let i = 0; i < N; i++) {
      if (!resto[i]) continue;
      const x = i % w;
      if (x === 0 || x === w - 1 || i < w || i >= N - w || !pisable[i - 1] || !pisable[i + 1] || !pisable[i - w] || !pisable[i + w]) orilla[i] = 1;
    }
    techo = inunda(orilla, resto);
  }
  // 4. construido = lo que no es público, ni vacío, ni azotea
  const construido = new Uint8Array(N);
  for (let i = 0; i < N; i++) construido[i] = (base[i] || pisable[i]) && !pub[i] && !vacio[i] && !(techo && techo[i]) ? 1 : 0;
  const relleno = new Uint8Array(N);
  for (let i = 0; i < N; i++) relleno[i] = construido[i] && !base[i] ? 1 : 0;
  // el relleno se mete 1 px en cada local para que no queden rendijas
  const grueso = dilatar(relleno, w, h, 1);
  for (let i = 0; i < N; i++) grueso[i] &= construido[i];
  const aPlano = (pts) => simplificar([...pts, pts[0]], .9).slice(0, -1).map(([x, y]) => [x0 + x, y0 + y]);
  const rellenos = contornos(grueso, w, h, 30).map(aPlano).filter((p) => p.length >= 3);
  const idx = (x, y) => { const i = Math.floor(x - x0), j = Math.floor(y - y0); return i >= 0 && j >= 0 && i < w && j < h ? j * w + i : -1; };
  const res = {
    rellenos,
    macizo: (x, y) => { const i = idx(x, y); return i >= 0 && construido[i] === 1; },
    publico: (x, y) => { const i = idx(x, y); return i >= 0 && pub[i] === 1 && !vacio[i]; },
    _debug: { w, h, x0, y0, base, construido, pub, techo },
  };
  if (aire) {
    // piso del nivel (con sus huecos) y barandales donde el pasillo da a un vacío o a la azotea
    const piso = new Uint8Array(N);
    for (let i = 0; i < N; i++) piso[i] = (construido[i] || pub[i]) && !vacio[i] ? 1 : 0;
    const lazos = contornos(piso, w, h, 40, true).map((l) => Object.assign(aPlano(l), { hueco: l.hueco, area: l.area })).filter((p) => p.length >= 3);
    const exteriores = lazos.filter((l) => !l.hueco).sort((a, b) => a.area - b.area);
    res.losas = exteriores.map((p) => ({ contorno: p, huecos: [] }));
    lazos.filter((l) => l.hueco).forEach((hq) => {
      const k = exteriores.findIndex((p) => enPoligono(p, hq[0][0] + .01, hq[0][1] + .01) || enPoligono(p, hq[1][0] + .01, hq[1][1] + .01));
      if (k >= 0) res.losas[k].huecos.push(hq);
    });
    const esPiso = (x, y) => { const i = idx(x, y); return i >= 0 && piso[i] === 1; };
    const esPasillo = (x, y) => { const i = idx(x, y); return i >= 0 && pub[i] === 1 && !vacio[i]; };
    res.barandales = [];
    lazos.forEach((p) => {
      for (let q = 0; q < p.length; q++) {
        const [ax, ay] = p[q], [bx, by] = p[(q + 1) % p.length];
        const L = Math.hypot(bx - ax, by - ay); if (L < 1) continue;
        const nx = (by - ay) / L, ny = -(bx - ax) / L;   // normal hacia el piso (el interior queda a la izquierda)
        const n = Math.max(1, Math.round(L / 5));
        let desde = null;
        for (let k = 0; k <= n; k++) {
          let ok = false;
          if (k < n) {
            const xm = ax + ((bx - ax) * (k + .5)) / n, ym = ay + ((by - ay) * (k + .5)) / n;
            ok = esPasillo(xm + nx * 3, ym + ny * 3) && !esPiso(xm - nx * 2, ym - ny * 2);
          }
          const x = ax + ((bx - ax) * k) / n, y = ay + ((by - ay) * k) / n;
          if (ok && !desde) desde = [x, y];
          if (!ok && desde) { res.barandales.push([desde[0], desde[1], x, y]); desde = null; }
        }
      }
    });
  }
  return res;
}

// Se analiza a 2 px por celda (4 veces menos trabajo, importante en celulares) y se regresa a píxeles del plano.
export function estructuraNivel(polys, { espacios = [], losa = null, vacios = [], limites, radio = 8, paso = 10, alcance = 70, celda = 2 } = {}) {
  const k = celda;
  const p2 = (p) => p.map(([x, y]) => [x / k, y / k]);
  const f2 = (f) => (Array.isArray(f) ? p2(f) : { cx: f.cx / k, cy: f.cy / k, r: f.r / k });
  const r = analizar(polys.map(p2), {
    espacios: espacios.map(f2), losa: losa && losa.map(p2), vacios: vacios.map(f2), limites: limites.map((v) => v / k),
    radio: Math.round(radio / k), paso: Math.round(paso / k), alcance: Math.round(alcance / k),
  });
  const a1 = (p) => p.map(([x, y]) => [x * k, y * k]);
  return {
    rellenos: r.rellenos.map(a1),
    losas: r.losas && r.losas.map((l) => ({ contorno: a1(l.contorno), huecos: l.huecos.map(a1) })),
    barandales: r.barandales && r.barandales.map((b) => b.map((v) => v * k)),
    macizo: (x, y) => r.macizo(x / k, y / k),
    publico: (x, y) => r.publico(x / k, y / k),
    _debug: r._debug,
  };
}
