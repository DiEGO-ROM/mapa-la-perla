/*
  Minijuegos de La Perla: uno por experiencia. Se juegan con toques y deslizando el dedo.
  Uso: abrirMinijuego('tiro', { zona, alTerminar: (estrellas, puntos) => {} })
*/
const C = { ink: '#141414', naranja: '#ff6b2c', verde: '#1fb36b', rosa: '#ff5fa2', azul: '#3d6bff', amarillo: '#ffc31f', morado: '#a259ff', gris: '#f4f4f2', madera: '#c9864a' };
const PALETA_MJ = [C.naranja, C.verde, C.rosa, C.azul, C.amarillo, C.morado];
const azar = (a, b) => a + Math.random() * (b - a);
const elegir = (arr) => arr[Math.floor(Math.random() * arr.length)];
const barajar = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

/* ---------- Sonido ---------- */
let audio = null;
function sonido(tipo, f = 660) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const t0 = audio.currentTime;
    const notas = { bien: [f, f * 1.5], mal: [180, 140], nota: [f], ganar: [523, 659, 784, 1046], golpe: [90] }[tipo] || [f];
    notas.forEach((fr, i) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = tipo === 'mal' ? 'square' : tipo === 'golpe' ? 'sine' : 'triangle';
      o.frequency.value = fr;
      const t = t0 + i * (tipo === 'ganar' ? .09 : .06);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(tipo === 'golpe' ? .18 : .07, t + .01);
      g.gain.exponentialRampToValueAtTime(.0001, t + (tipo === 'golpe' ? .18 : .3));
      o.connect(g).connect(audio.destination); o.start(t); o.stop(t + .35);
    });
  } catch (e) { /* sin audio */ }
}

/* ---------- Dibujo ---------- */
function caja(ctx, x, y, w, h, relleno, borde = 3, sombra = 0) {
  if (sombra) { ctx.fillStyle = C.ink; ctx.fillRect(x + sombra, y + sombra, w, h); }
  ctx.fillStyle = relleno; ctx.fillRect(x, y, w, h);
  if (borde) { ctx.lineWidth = borde; ctx.strokeStyle = C.ink; ctx.strokeRect(x, y, w, h); }
}
function texto(ctx, t, x, y, { tam = 18, peso = 800, color = C.ink, alin = 'center', base = 'middle' } = {}) {
  ctx.font = `${peso} ${tam}px Montserrat, system-ui, sans-serif`;
  ctx.fillStyle = color; ctx.textAlign = alin; ctx.textBaseline = base;
  ctx.fillText(t, x, y);
}
function circulo(ctx, x, y, r, relleno, borde = 3) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  if (relleno) { ctx.fillStyle = relleno; ctx.fill(); }
  if (borde) { ctx.lineWidth = borde; ctx.strokeStyle = C.ink; ctx.stroke(); }
}
function emoji(ctx, e, x, y, tam) {
  ctx.font = `${tam}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e, x, y);
}
function flotantes() {
  const lista = [];
  return {
    agregar(t, x, y, color = C.ink) { lista.push({ t, x, y, color, v: 1 }); },
    paso(dt) { lista.forEach((f) => { f.y -= 50 * dt; f.v -= dt * 1.1; }); for (let i = lista.length - 1; i >= 0; i--) if (lista[i].v <= 0) lista.splice(i, 1); },
    dibujar(ctx) { lista.forEach((f) => { ctx.globalAlpha = Math.max(0, f.v); texto(ctx, f.t, f.x, f.y, { tam: 22, peso: 900, color: f.color }); }); ctx.globalAlpha = 1; },
  };
}

/* ======================================================================
   JUEGOS
   ====================================================================== */
export const JUEGOS = {
  /* --------------------------- La Cancha --------------------------- */
  tiro: {
    titulo: 'Tiro 3x3', duracion: 30, umbrales: [3, 6, 9], unidad: 'canastas',
    instrucciones: 'Desliza el dedo hacia arriba para tirar. Entre más largo el deslizamiento, más fuerza. ¡El aro se mueve!',
    crear(W, H) {
      const g = H * 2.4;
      const s = { puntos: 0, t: 0, fx: flotantes(), bola: null, racha: 0 };
      const nueva = () => { s.bola = { x: W / 2, y: H * .84, vx: 0, vy: 0, vuela: false, paso: false, t: 0 }; };
      nueva();
      const aroY = H * .28;
      s.aroX = () => W / 2 + Math.sin(s.t * (1 + s.puntos * .08)) * W * .26;
      s.desliz = (dx, dy, dt) => {
        if (s.bola.vuela || dy > -25) return;
        const fuerza = Math.min(1.45, Math.max(.35, -dy / (H * .42)));
        s.bola.vy = -Math.sqrt(2 * g * fuerza * (H * .66));
        s.bola.vx = Math.max(-W * 1.3, Math.min(W * 1.3, (dx / Math.max(.08, dt)) * .32));
        s.bola.vuela = true;
        sonido('golpe');
      };
      s.actualizar = (dt) => {
        s.t += dt; s.fx.paso(dt);
        const b = s.bola;
        if (!b.vuela) return;
        b.t += dt;
        const yAnt = b.y;
        b.vy += g * dt; b.x += b.vx * dt; b.y += b.vy * dt;
        const ax = s.aroX();
        if (!b.paso && b.vy > 0 && yAnt < aroY && b.y >= aroY) {
          b.paso = true;
          if (Math.abs(b.x - ax) < 34) {
            s.puntos++; s.racha++;
            s.fx.agregar(s.racha > 2 ? `¡EN RACHA! ×${s.racha}` : '¡CANASTA!', ax, aroY - 40, C.naranja);
            sonido('bien', 700 + s.racha * 40);
          } else { s.racha = 0; }
        }
        if (b.y > H + 40 || b.t > 2.2 || b.x < -60 || b.x > W + 60) nueva();
      };
      s.dibujar = (ctx) => {
        ctx.fillStyle = '#d5dfff'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = C.azul; ctx.beginPath(); ctx.moveTo(0, H * .55); ctx.lineTo(W, H * .55); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(W / 2, H * .55, W * .32, H * .1, 0, 0, Math.PI); ctx.stroke();
        caja(ctx, 16, 16, 120, 54, C.ink, 0);
        texto(ctx, 'LOCAL', 76, 30, { tam: 11, color: '#fff' });
        texto(ctx, String(s.puntos).padStart(2, '0'), 76, 54, { tam: 24, color: C.naranja });
        const ax = s.aroX();
        caja(ctx, ax - 60, aroY - 78, 120, 78, '#fff', 3);
        caja(ctx, ax - 22, aroY - 48, 44, 32, '#fff', 3);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(ax + i * 9, aroY + 4); ctx.lineTo(ax + i * 6, aroY + 34); ctx.stroke(); }
        ctx.strokeStyle = C.naranja; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(ax - 36, aroY); ctx.lineTo(ax + 36, aroY); ctx.stroke();
        const b = s.bola;
        const r = 26 * (.55 + .45 * Math.min(1, b.y / H));
        circulo(ctx, b.x, b.y, r, C.naranja, 3);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(b.x - r, b.y); ctx.lineTo(b.x + r, b.y); ctx.moveTo(b.x, b.y - r); ctx.lineTo(b.x, b.y + r); ctx.stroke();
        if (!b.vuela) texto(ctx, '↑ DESLIZA PARA TIRAR', W / 2, H * .95, { tam: 13, color: '#fff' });
        s.fx.dibujar(ctx);
      };
      return s;
    },
  },

  /* --------------------------- Las Rampas --------------------------- */
  truco: {
    titulo: 'Truco perfecto', duracion: 30, umbrales: [700, 1800, 3200], unidad: 'puntos',
    instrucciones: 'El skater vuela en cada orilla de la rampa. Mientras está en el aire, desliza el dedo hacia la flecha que aparece para clavar el truco. Justo en lo más alto vale más. ¡Encadena trucos para multiplicar!',
    crear(W, H) {
      const R = Math.min(W * .4, H * .3), cx = W / 2, cy = H * .42;
      const altoAire = Math.min(H * .2, 150);
      const TA = .85;
      const FLECHAS = { arriba: ['↑', '360 FLIP'], abajo: ['↓', 'INDY GRAB'], izq: ['←', 'KICKFLIP'], der: ['→', 'HEELFLIP'] };
      const s = { puntos: 0, t: 0, fx: flotantes(), combo: 0, fase: 'rampa', p: .5, lado: 1, u: 0, flecha: null, hecho: false, caida: 0, giro: 0, giroTipo: 'arriba', chispas: [], exitos: 0, publico: 0, mejorCombo: 0 };
      const cruce = () => Math.max(.8, 1.3 - s.exitos * .035);
      const chispa = (x, y, n = 16) => { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = azar(80, 260); s.chispas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, vida: 1, c: elegir([C.amarillo, C.rosa, C.naranja, '#fff']) }); } };
      const posRampa = () => { const f = s.lado * (Math.PI / 2) * Math.cos(Math.PI * s.p); return { x: cx + R * Math.sin(f), y: cy + R * Math.cos(f), ang: -f }; };
      const posAire = () => ({ x: cx + s.lado * (R + 6), y: cy - altoAire * 4 * s.u * (1 - s.u), ang: s.lado * Math.PI / 2 * (1 - 2 * s.u) * .25 });
      s.desliz = (dx, dy) => {
        if (s.fase !== 'aire' || s.hecho) return;
        const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'der' : 'izq') : (dy < 0 ? 'arriba' : 'abajo');
        const p = posAire();
        if (dir === s.flecha) {
          const perfecto = Math.abs(s.u - .5) < .18;
          const mult = 1 + s.combo * .5;
          const pts = Math.round(100 * mult * (perfecto ? 1.5 : 1));
          s.puntos += pts; s.combo++; s.exitos++; s.hecho = true; s.giro = 1; s.giroTipo = dir; s.publico = 1;
          s.mejorCombo = Math.max(s.mejorCombo, s.combo);
          s.fx.agregar(`${perfecto ? '¡PERFECTO! ' : ''}${FLECHAS[dir][1]} +${pts}`, cx, p.y - 60, perfecto ? C.verde : C.naranja);
          chispa(p.x, p.y, perfecto ? 26 : 14);
          sonido('bien', 600 + s.combo * 60);
        } else {
          s.fase = 'caida'; s.caida = 1.1; s.combo = 0; s.hecho = true;
          s.fx.agregar('¡BAJÓN! era ' + FLECHAS[s.flecha][0], cx, cy - 40, C.rosa);
          sonido('mal');
        }
      };
      s.toque = () => {
        if (s.fase !== 'aire' || s.hecho) return;
        s.hecho = true; s.puntos += 40; s.giro = .5; s.giroTipo = 'abajo';
        s.fx.agregar('OLLIE +40', cx, posAire().y - 60, C.ink);
        sonido('nota', 520);
      };
      s.actualizar = (dt) => {
        s.t += dt; s.fx.paso(dt);
        s.giro = Math.max(0, s.giro - dt * 2.4);
        s.publico = Math.max(0, s.publico - dt * 1.5);
        s.chispas.forEach((c) => { c.vy += 500 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.vida -= dt * 1.6; });
        s.chispas = s.chispas.filter((c) => c.vida > 0);
        if (s.fase === 'rampa') {
          const antes = s.p;
          s.p += dt / cruce();
          if (antes < .62 && s.p >= .62) s.flecha = elegir(Object.keys(FLECHAS));
          if (s.p >= 1) { s.fase = 'aire'; s.lado = -s.lado; s.u = 0; s.hecho = false; }
        } else if (s.fase === 'aire') {
          s.u += dt / TA;
          if (s.u >= 1) {
            if (!s.hecho) { if (s.combo > 0) s.fx.agregar('combo perdido', cx, cy, '#777'); s.combo = 0; }
            s.fase = 'rampa'; s.p = 0; s.flecha = null;
          }
        } else if (s.fase === 'caida') {
          s.caida -= dt;
          if (s.caida <= 0) { s.fase = 'rampa'; s.p = .5; s.flecha = null; }
        }
      };
      s.dibujar = (ctx) => {
        const cielo = ctx.createLinearGradient(0, 0, 0, H); cielo.addColorStop(0, '#ffd9a8'); cielo.addColorStop(1, '#fff6d6');
        ctx.fillStyle = cielo; ctx.fillRect(0, 0, W, H);
        // ciudad al fondo
        for (let i = 0; i < 9; i++) { const w = W / 9, h = 40 + ((i * 53) % 70); ctx.fillStyle = i % 2 ? '#f3c79a' : '#ecb98a'; ctx.fillRect(i * w, cy - R * .6 - h, w - 4, h); }
        // muro de grafiti
        caja(ctx, cx - R - 30, cy - R * .6, R * 2 + 60, R * .34, C.ink, 3);
        ['#ff5fa2', '#ffc31f', '#3d6bff', '#1fb36b', '#ff6b2c'].forEach((c, i) => circulo(ctx, cx - R + i * R * .5, cy - R * .43, R * .09 + (i % 2) * 6, c, 0));
        texto(ctx, 'LA PERLA SKATE', cx, cy - R * .43, { tam: Math.min(26, R * .14), peso: 900, color: '#fff' });
        // rampa en U
        ctx.fillStyle = '#dfe2e8';
        ctx.beginPath(); ctx.moveTo(cx - R - 40, cy); ctx.lineTo(cx - R, cy); ctx.arc(cx, cy, R, Math.PI, 0, true); ctx.lineTo(cx + R + 40, cy); ctx.lineTo(cx + R + 40, cy + R + 26); ctx.lineTo(cx - R - 40, cy + R + 26); ctx.closePath(); ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = C.ink;
        ctx.beginPath(); ctx.moveTo(cx - R - 40, cy); ctx.lineTo(cx - R, cy); ctx.arc(cx, cy, R, Math.PI, 0, true); ctx.lineTo(cx + R + 40, cy); ctx.stroke();
        ctx.strokeRect(cx - R - 40, cy, R * 2 + 80, R + 26);
        [-1, 1].forEach((l) => { caja(ctx, cx + l * R - 5, cy - 6, 10, 12, C.rosa, 3); });
        // público
        for (let i = 0; i < 12; i++) {
          const x = (i + .5) * W / 12, salto = s.publico * Math.abs(Math.sin(s.t * 16 + i)) * 14;
          circulo(ctx, x, H * .9 - salto, 12, ['#ffd8b0', '#c8955c', '#8a5a3a'][i % 3], 2.5);
          caja(ctx, x - 12, H * .9 + 10 - salto, 24, 26, PALETA_MJ[i % 6], 2.5);
        }
        // skater
        const p = s.fase === 'aire' ? posAire() : posRampa();
        let ang = p.ang;
        if (s.fase === 'caida') ang += (1.1 - s.caida) * 9;
        ctx.save(); ctx.translate(p.x, p.y);
        if (s.fase === 'aire') ctx.translate(-s.lado * 0, 0);
        ctx.rotate(ang);
        const g = s.giro * Math.PI * 2;
        // tabla (gira según el truco)
        ctx.save();
        if (s.giroTipo === 'izq' || s.giroTipo === 'der') ctx.scale(1, Math.cos(g * (s.giroTipo === 'izq' ? 1 : -1)) || .05);
        else ctx.rotate(s.giroTipo === 'arriba' ? g : 0);
        caja(ctx, -28, -8, 56, 9, C.naranja, 2.5);
        circulo(ctx, -18, 4, 4.5, C.ink, 0); circulo(ctx, 18, 4, 4.5, C.ink, 0);
        ctx.restore();
        const agachado = s.giroTipo === 'abajo' && s.giro > 0 ? .6 : 1;
        caja(ctx, -11, -8 - 46 * agachado, 22, 46 * agachado, C.azul, 3);
        circulo(ctx, 0, -20 - 46 * agachado, 11, '#ffd8b0', 3);
        caja(ctx, -11, -33 - 46 * agachado, 22, 8, C.rosa, 2);
        ctx.restore();
        // flecha a deslizar
        if (s.flecha && s.fase !== 'caida' && !(s.fase === 'aire' && s.hecho)) {
          const activa = s.fase === 'aire';
          const fx = cx + (s.fase === 'aire' ? s.lado : -s.lado) * Math.min(R * .55, 120), fy = cy - altoAire - 30;
          const enPunto = activa && Math.abs(s.u - .5) < .18;
          ctx.globalAlpha = activa ? 1 : .45;
          caja(ctx, fx - 38, fy - 38, 76, 76, enPunto ? C.verde : activa ? C.amarillo : '#fff', 4, 5);
          texto(ctx, FLECHAS[s.flecha][0], fx, fy + 2, { tam: 48, peso: 900 });
          if (activa) { caja(ctx, fx - 38, fy + 46, 76, 10, '#fff', 2); caja(ctx, fx - 38 + 76 * .32, fy + 46, 76 * .36, 10, '#c8efd9', 0); caja(ctx, fx - 38 + 76 * Math.min(1, s.u) - 2, fy + 42, 4, 18, C.ink, 0); }
          ctx.globalAlpha = 1;
        }
        s.chispas.forEach((c) => { ctx.globalAlpha = Math.max(0, c.vida); caja(ctx, c.x - 4, c.y - 4, 8, 8, c.c, 1.5); });
        ctx.globalAlpha = 1;
        caja(ctx, 14, 14, 112, 54, s.combo > 1 ? C.naranja : '#fff', 3, 3);
        texto(ctx, 'COMBO', 70, 30, { tam: 10 }); texto(ctx, `×${(1 + s.combo * .5).toFixed(1)}`, 70, 52, { tam: 22, peso: 900 });
        texto(ctx, s.fase === 'aire' && !s.hecho ? '¡DESLIZA HACIA LA FLECHA!' : 'Toca en el aire = ollie · desliza = truco', W / 2, H * .8, { tam: 13, color: C.ink });
        s.fx.dibujar(ctx);
      };
      return s;
    },
  },

  /* --------------------------- Foro Abierto --------------------------- */
  ritmo: {
    titulo: 'Ritmo en el escenario', duracion: 30, umbrales: [20, 32, 42], unidad: 'notas',
    instrucciones: 'Las notas bajan por tres carriles. Toca el carril justo cuando la nota llegue a la línea.',
    crear(W, H) {
      const s = { puntos: 0, t: -1.2, fx: flotantes(), notas: [], destello: [0, 0, 0] };
      const bpm = 112, beat = 60 / bpm, viaje = 1.6, yLinea = H * .84;
      for (let t = 1; t < 29; t += beat) {
        if (Math.random() < .82) s.notas.push({ t, carril: Math.floor(Math.random() * 3), estado: 0 });
        if (Math.random() < .18) s.notas.push({ t: t + beat / 2, carril: Math.floor(Math.random() * 3), estado: 0 });
      }
      s.umbrales = [.45, .65, .82].map((k) => Math.round(s.notas.length * k));
      const colores = [C.rosa, C.amarillo, C.azul];
      const freq = [523, 659, 784];
      let siguienteBeat = 0;
      s.presion = (x) => {
        const c = Math.min(2, Math.floor(x / (W / 3)));
        s.destello[c] = .15;
        let mejor = null, dm = 1;
        s.notas.forEach((n) => { if (n.carril === c && n.estado === 0) { const d = Math.abs(n.t - s.t); if (d < dm) { dm = d; mejor = n; } } });
        if (mejor && dm < .16) {
          mejor.estado = 1; s.puntos++;
          s.fx.agregar(dm < .06 ? '¡PERFECTO!' : '¡BIEN!', (c + .5) * W / 3, yLinea - 40, dm < .06 ? C.verde : C.ink);
          sonido('nota', freq[c]);
        } else { sonido('mal'); }
      };
      s.actualizar = (dt) => {
        s.t += dt; s.fx.paso(dt);
        s.destello = s.destello.map((d) => Math.max(0, d - dt));
        if (s.t > siguienteBeat) { siguienteBeat += beat; if (s.t > 0) sonido('golpe'); }
        s.notas.forEach((n) => { if (n.estado === 0 && s.t - n.t > .2) { n.estado = 2; } });
      };
      s.dibujar = (ctx) => {
        ctx.fillStyle = '#1b1426'; ctx.fillRect(0, 0, W, H);
        for (let c = 0; c < 3; c++) {
          const x = c * W / 3;
          ctx.fillStyle = s.destello[c] > 0 ? colores[c] + '55' : 'rgba(255,255,255,.04)';
          ctx.fillRect(x + 6, 0, W / 3 - 12, H);
          ctx.globalAlpha = .9; caja(ctx, x + 12, yLinea - 22, W / 3 - 24, 44, s.destello[c] > 0 ? colores[c] : '#2a2238', 3); ctx.globalAlpha = 1;
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(x + 12, yLinea - 22, W / 3 - 24, 44);
        }
        s.notas.forEach((n) => {
          if (n.estado !== 0) return;
          const k = 1 - (n.t - s.t) / viaje;
          if (k < 0 || k > 1.2) return;
          const y = k * yLinea, x = (n.carril + .5) * W / 3;
          caja(ctx, x - 28, y - 16, 56, 32, colores[n.carril], 3);
        });
        ['#ff5fa2', '#ffc31f', '#3d6bff', '#1fb36b'].forEach((c, i) => circulo(ctx, W * (.2 + i * .2), 14, 8 + Math.sin(s.t * 6 + i) * 2, c, 2));
        if (s.t < 0) texto(ctx, s.t < -.6 ? 'LISTOS…' : '¡YA!', W / 2, H * .4, { tam: 40, color: '#fff', peso: 900 });
        s.fx.dibujar(ctx);
      };
      return s;
    },
  },

  /* --------------------------- Club Canino --------------------------- */
  agilidad: {
    titulo: 'Circuito de agilidad', duracion: 30, umbrales: [6, 12, 18], unidad: 'obstáculos',
    instrucciones: 'Toca para saltar las vallas y desliza hacia abajo para pasar agachado por los túneles.',
    crear(W, H) {
      const suelo = H * .72;
      const s = { puntos: 0, t: 0, fx: flotantes(), perro: { y: 0, vy: 0, agachado: 0, golpe: 0 }, obs: [], vel: W * .45, prox: 1.2 };
      const saltar = () => { if (s.perro.y === 0) { s.perro.vy = H * 1.25; sonido('nota', 520); } };
      s.presion = (x, y) => { if (y > H * .8) return; saltar(); };
      s.desliz = (dx, dy) => { if (dy > 30) { s.perro.agachado = .7; s.perro.vy = Math.min(s.perro.vy, -H); sonido('nota', 330); } else if (dy < -30) saltar(); };
      s.actualizar = (dt) => {
        s.t += dt; s.fx.paso(dt);
        s.vel = W * (.45 + s.t * .012);
        const p = s.perro;
        p.vy -= H * 3.4 * dt; p.y = Math.max(0, p.y + p.vy * dt); if (p.y === 0) p.vy = 0;
        p.agachado = Math.max(0, p.agachado - dt); p.golpe = Math.max(0, p.golpe - dt);
        s.prox -= dt;
        if (s.prox <= 0) { s.obs.push({ x: W + 40, tipo: Math.random() < .6 ? 'valla' : 'tunel', ok: false, choco: false }); s.prox = azar(1.05, 1.7) * (W / s.vel) * .45 + .5; }
        const px = W * .22;
        s.obs.forEach((o) => {
          o.x -= s.vel * dt;
          const cerca = Math.abs(o.x - px) < 34;
          if (cerca && !o.choco) {
            const falla = o.tipo === 'valla' ? p.y < H * .1 : (p.agachado <= 0 || p.y > 4);
            if (falla) { o.choco = true; p.golpe = .8; s.fx.agregar('¡UPS!', px, suelo - 90, C.rosa); sonido('mal'); }
          }
          if (!o.ok && !o.choco && o.x < px - 36) { o.ok = true; s.puntos++; s.fx.agregar('+1', px, suelo - 90, C.verde); sonido('bien', 760); }
        });
        s.obs = s.obs.filter((o) => o.x > -80);
      };
      s.dibujar = (ctx) => {
        ctx.fillStyle = '#e8f6ff'; ctx.fillRect(0, 0, W, H);
        [[.2, .15], [.65, .1], [.9, .22]].forEach(([a, b], i) => { const x = ((a * W - s.t * 20 * (i + 1)) % (W + 120) + W + 120) % (W + 120) - 60; caja(ctx, x, b * H, 90, 26, '#fff', 2); });
        ctx.fillStyle = C.verde; ctx.fillRect(0, suelo, W, H - suelo);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, suelo); ctx.lineTo(W, suelo); ctx.stroke();
        for (let x = -((s.t * s.vel) % 40); x < W; x += 40) caja(ctx, x, suelo + 18, 20, 6, '#7ccf3f', 0);
        s.obs.forEach((o) => {
          if (o.tipo === 'valla') {
            caja(ctx, o.x - 22, suelo - 48, 6, 48, '#fff', 2); caja(ctx, o.x + 16, suelo - 48, 6, 48, '#fff', 2);
            for (let i = 0; i < 4; i++) caja(ctx, o.x - 22 + i * 11, suelo - 44, 11, 9, i % 2 ? '#fff' : C.naranja, 1);
          } else {
            ctx.fillStyle = C.morado; ctx.beginPath(); ctx.ellipse(o.x, suelo, 40, 46, 0, Math.PI, 0); ctx.fill();
            ctx.lineWidth = 3; ctx.strokeStyle = C.ink; ctx.stroke();
            ctx.fillStyle = '#3a2266'; ctx.beginPath(); ctx.ellipse(o.x, suelo, 24, 26, 0, Math.PI, 0); ctx.fill();
          }
        });
        const p = s.perro, px = W * .22, py = suelo - p.y;
        if (p.golpe > 0 && Math.floor(p.golpe * 10) % 2) ctx.globalAlpha = .4;
        const bajo = p.agachado > 0 ? .55 : 1;
        caja(ctx, px - 28, py - 34 * bajo, 50, 22 * bajo, C.madera, 3);
        caja(ctx, px + 14, py - 50 * bajo, 22, 20, C.madera, 3);
        caja(ctx, px + 30, py - 42 * bajo, 10, 8, C.ink, 0);
        caja(ctx, px + 14, py - 58 * bajo, 7, 9, C.ink, 0);
        ctx.save(); ctx.translate(px - 28, py - 30 * bajo); ctx.rotate(-.6 + Math.sin(s.t * 18) * .4); caja(ctx, -16, -3, 16, 6, C.madera, 2); ctx.restore();
        if (p.agachado <= 0) [[-22, 0], [-12, 1], [6, 0], [14, 1]].forEach(([dx, f]) => caja(ctx, px + dx, py - 12, 6, 12 + (p.y === 0 ? Math.sin(s.t * 20 + f * 3) * 3 : 0), C.madera, 2));
        ctx.globalAlpha = 1;
        texto(ctx, 'TOCA = SALTAR  ·  ↓ DESLIZA = AGACHARSE', W / 2, H * .92, { tam: 12, color: '#fff' });
        s.fx.dibujar(ctx);
      };
      return s;
    },
  },

  /* --------------------------- El Jardín --------------------------- */
  jardin: {
    titulo: 'Que no se seque', duracion: 25, umbrales: [10, 20, 30], unidad: 'puntos',
    instrucciones: 'Las flores se van marchitando. Tócalas para regarlas con la fuente antes de que se sequen.',
    crear(W, H) {
      const cols = 3, filas = W > H ? 2 : 3;
      const s = { puntos: 0, t: 0, fx: flotantes(), flores: [], gotas: [] };
      const colores = [C.rosa, C.amarillo, C.morado, C.naranja, '#fff'];
      const mx = W * .08, top = H * .26, cw = (W - mx * 2) / cols, ch = (H * .7) / filas;
      for (let f = 0; f < filas; f++) for (let c = 0; c < cols; c++) s.flores.push({ x: mx + cw * (c + .5), y: top + ch * (f + .5), vida: azar(.6, 1), ritmo: azar(.08, .16), color: elegir(colores), muerta: 0 });
      s.presion = (x, y) => {
        const fl = s.flores.find((f) => Math.abs(f.x - x) < cw / 2 && Math.abs(f.y - y) < ch / 2);
        if (!fl || fl.muerta > 0) return;
        for (let i = 0; i < 10; i++) s.gotas.push({ x: W / 2, y: H * .12, tx: fl.x + azar(-14, 14), ty: fl.y - 30, k: -i * .03 });
        if (fl.vida < .35) { s.puntos += 2; s.fx.agregar('¡SALVADA! +2', fl.x, fl.y - 50, C.verde); sonido('bien', 820); }
        else if (fl.vida < .7) { s.puntos += 1; s.fx.agregar('+1', fl.x, fl.y - 50, C.azul); sonido('bien', 660); }
        else { s.fx.agregar('ya tiene agua', fl.x, fl.y - 50, '#777'); }
        fl.vida = 1;
      };
      s.actualizar = (dt) => {
        s.t += dt; s.fx.paso(dt);
        const acel = 1 + s.t * .07;
        s.flores.forEach((f) => {
          if (f.muerta > 0) { f.muerta -= dt; if (f.muerta <= 0) { f.vida = 1; f.color = elegir(colores); } return; }
          f.vida -= f.ritmo * acel * dt;
          if (f.vida <= 0) { f.muerta = 2; s.puntos = Math.max(0, s.puntos - 2); s.fx.agregar('se secó −2', f.x, f.y - 50, C.rosa); sonido('mal'); }
        });
        s.gotas.forEach((g) => { g.k += dt * 2.2; });
        s.gotas = s.gotas.filter((g) => g.k < 1);
      };
      s.dibujar = (ctx) => {
        ctx.fillStyle = '#c8efd9'; ctx.fillRect(0, 0, W, H);
        caja(ctx, W / 2 - 50, H * .1, 100, 28, '#f1ece2', 3);
        caja(ctx, W / 2 - 40, H * .1 + 4, 80, 10, '#7fd0ff', 0);
        ctx.strokeStyle = '#7fd0ff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(W / 2, H * .1); ctx.lineTo(W / 2, H * .03 + Math.sin(s.t * 8) * 4); ctx.stroke();
        s.flores.forEach((f) => {
          caja(ctx, f.x - 26, f.y + 6, 52, 34, '#d9734a', 3);
          const marchita = f.muerta > 0 ? 1 : 1 - f.vida;
          ctx.save(); ctx.translate(f.x, f.y + 6); ctx.rotate(marchita * .9);
          ctx.strokeStyle = f.muerta > 0 ? '#8a6b3a' : '#1f8a4f'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -46); ctx.stroke();
          const col = f.muerta > 0 ? '#8a6b3a' : f.color;
          for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; circulo(ctx, Math.cos(a) * 12, -50 + Math.sin(a) * 12, 10 * (f.muerta > 0 ? .6 : .7 + f.vida * .3), col, 2); }
          circulo(ctx, 0, -50, 7, C.amarillo, 2);
          ctx.restore();
          if (f.muerta <= 0) { caja(ctx, f.x - 26, f.y + 46, 52, 8, '#fff', 2); caja(ctx, f.x - 25, f.y + 47, 50 * Math.max(0, f.vida), 6, f.vida < .35 ? C.rosa : f.vida < .7 ? C.amarillo : C.verde, 0); }
        });
        s.gotas.forEach((g) => {
          if (g.k < 0) return;
          const x = g.x + (g.tx - g.x) * g.k, y = g.y + (g.ty - g.y) * g.k - Math.sin(g.k * Math.PI) * 80;
          circulo(ctx, x, y, 5, '#5ec4ff', 1.5);
        });
        s.fx.dibujar(ctx);
      };
      return s;
    },
  },

  /* --------------------------- El Patio --------------------------- */
  columpio: {
    titulo: 'Columpio al cielo', duracion: 60, umbrales: [90, 170, 240], unidad: 'puntos',
    instrucciones: 'Toca cuando el columpio pase por abajo (aro verde) para tomar impulso. Cuando vayas alto, desliza hacia arriba o toca «¡SUÉLTATE!» para salir volando: atrapa globos y cae en el tapete. Tienes 3 intentos.',
    crear(W, H) {
      const ESC = Math.max(14, Math.min(22, W / 26));       // píxeles por metro
      const suelo = H * .8, origenX = W * .22;
      const ph = Math.min(5.2, (suelo - H * .2) / ESC);     // altura del pivote en metros
      const Lm = ph - 1.3;                                   // largo de las cadenas
      const BOOST = 2.7;
      const s = { puntos: 0, t: 0, fx: flotantes(), intento: 1, fase: 'impulso', th: .12, w: 0, maxTh: 0, cam: 0, nino: null, globos: [], tapete: null, espera: 0, fin: false, total: [] };
      const aPant = (x, y) => [origenX + (x - s.cam) * ESC, suelo - y * ESC];
      const preparar = () => {
        s.fase = 'impulso'; s.th = .12; s.w = 0; s.maxTh = 0; s.nino = null; s.cam = 0;
        const c = azar(14, 30);
        s.tapete = { c, anillos: [[1.2, 50, C.rosa], [2.8, 25, C.amarillo], [4.6, 10, C.azul]] };
        s.globos = Array.from({ length: 7 }, (_, i) => ({ x: 5 + i * azar(3.2, 4.8), y: azar(2.5, Math.min(11, ph + 3)), c: elegir([C.rosa, C.amarillo, C.azul, C.verde, C.naranja, C.morado]), tomado: 0 }));
      };
      preparar();
      const boton = () => ({ x: W / 2 - 100, y: H * .86, w: 200, h: 50 });
      const puedeSoltar = () => s.fase === 'impulso' && s.maxTh > .55;
      const soltar = () => {
        if (!puedeSoltar()) return;
        const x = Lm * Math.sin(s.th), y = ph - Lm * Math.cos(s.th);
        let vx = Lm * s.w * Math.cos(s.th) * BOOST, vy = Lm * s.w * Math.sin(s.th) * BOOST;
        if (vx < 0) { vx = Math.abs(vx) * .25; vy = Math.abs(vy) * .2; }
        s.nino = { x, y, vx, vy, rot: 0, globos: 0, estela: [] };
        s.fase = 'vuelo';
        sonido('ganar');
      };
      s.presion = (x, y) => {
        const b = boton();
        if (puedeSoltar() && x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) return soltar();
        if (s.fase !== 'impulso') return;
        if (Math.abs(s.th) < .3) {
          const dir = s.w === 0 ? 1 : Math.sign(s.w);
          s.w += dir * 1.05; sonido('nota', 480 + s.maxTh * 300);
          s.fx.agregar('¡IMPULSO!', aPant(0, 1)[0], suelo - 40, C.verde);
        } else { s.w *= .65; sonido('mal'); s.fx.agregar('a destiempo', aPant(0, 1)[0], suelo - 40, C.rosa); }
      };
      s.desliz = (dx, dy) => { if (dy < -40) soltar(); };
      s.actualizar = (dt) => {
        s.t += dt; s.fx.paso(dt);
        // el columpio sigue meciéndose (con o sin niño)
        for (let i = 0; i < 4; i++) { const h = dt / 4; s.w += (-(9.8 / 2.2) * Math.sin(s.th) - (s.fase === 'impulso' ? .1 : .5) * s.w) * h; s.th += s.w * h; }
        s.th = Math.max(-1.45, Math.min(1.45, s.th));
        if (s.fase === 'impulso') s.maxTh = Math.max(s.maxTh * (1 - dt * .15), Math.abs(s.th));
        if (s.fase === 'vuelo') {
          const n = s.nino;
          n.vy -= 9.8 * dt; n.x += n.vx * dt; n.y += n.vy * dt; n.rot += dt * (4 + n.vx * .15);
          n.estela.push([n.x, n.y]); if (n.estela.length > 26) n.estela.shift();
          s.cam += (Math.max(0, n.x - (W * .45) / ESC) - s.cam) * Math.min(1, dt * 6);
          s.globos.forEach((g) => { if (!g.tomado && Math.hypot(g.x - n.x, g.y - n.y) < 1.3) { g.tomado = 1; n.globos++; sonido('bien', 900); s.fx.agregar('+10', ...aPant(g.x, g.y), C.verde); } });
          if (n.y <= 0) {
            n.y = 0;
            const d = Math.abs(n.x - s.tapete.c);
            const anillo = s.tapete.anillos.find(([r]) => d <= r / 2);
            const bono = anillo ? anillo[1] : 0;
            const pts = Math.round(n.x * 2) + n.globos * 10 + bono;
            s.puntos += pts; s.total.push(pts);
            s.fx.agregar(`${n.x.toFixed(1)} m · +${pts}${bono ? ` (tapete +${bono})` : ''}`, W / 2, H * .3, bono ? C.verde : C.ink);
            sonido(bono ? 'ganar' : 'golpe');
            s.fase = 'aterriza'; s.espera = 1.8;
          }
        } else if (s.fase === 'aterriza') {
          s.espera -= dt;
          if (s.espera <= 0) { if (s.intento >= 3) { s.fin = true; s.fase = 'listo'; } else { s.intento++; preparar(); } }
        }
        s.globos.forEach((g) => { if (g.tomado) g.tomado += dt * 3; });
      };
      s.dibujar = (ctx) => {
        const cielo = ctx.createLinearGradient(0, 0, 0, suelo); cielo.addColorStop(0, '#9fd6ff'); cielo.addColorStop(1, '#fff1f7');
        ctx.fillStyle = cielo; ctx.fillRect(0, 0, W, H);
        // nubes con paralaje
        for (let i = 0; i < 6; i++) { const x = ((i * 190 - s.cam * ESC * .3) % (W + 200) + W + 200) % (W + 200) - 100; caja(ctx, x, 40 + (i % 3) * 50, 90, 26, '#fff', 2); }
        // piso del patio
        ctx.fillStyle = '#ffd4e7'; ctx.fillRect(0, suelo, W, H - suelo);
        ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, suelo); ctx.lineTo(W, suelo); ctx.stroke();
        // marcas de distancia
        for (let m = 5; m < 80; m += 5) {
          const [x] = aPant(m, 0); if (x < -40 || x > W + 40) continue;
          caja(ctx, x - 2, suelo, 4, 12, C.ink, 0); texto(ctx, `${m} m`, x, suelo + 24, { tam: 11 });
        }
        // tapete objetivo
        const tp = s.tapete;
        [...tp.anillos].reverse().forEach(([r, , c]) => { const [x1] = aPant(tp.c - r / 2, 0), [x2] = aPant(tp.c + r / 2, 0); caja(ctx, x1, suelo - 6, x2 - x1, 10, c, 2.5); });
        texto(ctx, '50', aPant(tp.c, 0)[0], suelo - 16, { tam: 11, peso: 900 });
        // globos
        s.globos.forEach((g) => {
          const [x, y] = aPant(g.x, g.y); if (x < -40 || x > W + 40) return;
          if (g.tomado) { ctx.globalAlpha = Math.max(0, 1 - (g.tomado - 1)); circulo(ctx, x, y, 16 + g.tomado * 10, null, 2); ctx.globalAlpha = 1; return; }
          const b = Math.sin(s.t * 2 + g.x) * 4;
          ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y + 18 + b); ctx.lineTo(x, y + 44 + b); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(x, y + b, 14, 18, 0, 0, Math.PI * 2); ctx.fillStyle = g.c; ctx.fill(); ctx.lineWidth = 2.5; ctx.stroke();
          circulo(ctx, x - 5, y - 6 + b, 3, '#fff', 0);
        });
        // estructura del columpio
        const [px, py] = aPant(0, ph);
        const piernas = Math.min(W * .16, 90);
        ctx.lineWidth = 10; ctx.strokeStyle = C.azul; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(px - piernas, suelo); ctx.lineTo(px, py); ctx.lineTo(px + piernas, suelo); ctx.stroke();
        ctx.lineCap = 'butt'; ctx.lineWidth = 3; ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.moveTo(px - piernas, suelo); ctx.lineTo(px, py); ctx.lineTo(px + piernas, suelo); ctx.stroke();
        caja(ctx, px - 14, py - 8, 28, 14, C.amarillo, 3);
        const ax = px + Math.sin(s.th) * Lm * ESC, ay = py + Math.cos(s.th) * Lm * ESC;
        ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ax, ay); ctx.stroke();
        ctx.save(); ctx.translate(ax, ay); ctx.rotate(-s.th); caja(ctx, -20, -4, 40, 9, C.rosa, 2.5); ctx.restore();
        // aro de impulso
        if (s.fase === 'impulso') {
          const [bx, by] = aPant(0, ph - Lm);
          ctx.lineWidth = 6; ctx.strokeStyle = Math.abs(s.th) < .3 ? C.verde : 'rgba(0,0,0,.12)';
          ctx.beginPath(); ctx.arc(bx, by, 30, 0, Math.PI * 2); ctx.stroke();
        }
        // niño
        const dibujaNino = (x, y, rot) => {
          ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
          caja(ctx, -10, -30, 20, 26, C.amarillo, 2.5);
          circulo(ctx, 0, -40, 10, '#ffd8b0', 2.5);
          caja(ctx, -8, -4, 7, 16, C.azul, 2); caja(ctx, 1, -4, 7, 16, C.azul, 2);
          caja(ctx, -20, -28, 10, 6, C.amarillo, 2); caja(ctx, 10, -28, 10, 6, C.amarillo, 2);
          ctx.restore();
        };
        if (s.fase === 'impulso') dibujaNino(ax, ay - 2, -s.th);
        else if (s.nino) {
          s.nino.estela.forEach(([x, y], i) => { const [sx, sy] = aPant(x, y); ctx.globalAlpha = i / 30; circulo(ctx, sx, sy - 20, 4, C.rosa, 0); });
          ctx.globalAlpha = 1;
          const [nx, ny] = aPant(s.nino.x, s.nino.y);
          dibujaNino(nx, ny, s.fase === 'vuelo' ? s.nino.rot : 0);
        }
        // altura e intento
        caja(ctx, 14, 14, 116, 54, '#fff', 3, 3);
        texto(ctx, `INTENTO ${Math.min(3, s.intento)}/3`, 72, 30, { tam: 10 });
        texto(ctx, s.fase === 'impulso' ? `${Math.round(s.maxTh * 57)}°` : s.nino ? `${s.nino.x.toFixed(1)} m` : '', 72, 52, { tam: 20, peso: 900 });
        if (puedeSoltar()) {
          const b = boton();
          caja(ctx, b.x, b.y, b.w, b.h, C.naranja, 3, 4);
          texto(ctx, '¡SUÉLTATE! ↑', b.x + b.w / 2, b.y + b.h / 2, { tam: 18, peso: 900 });
        } else if (s.fase === 'impulso') texto(ctx, 'TOCA EN EL ARO VERDE PARA IMPULSARTE', W / 2, H * .9, { tam: 12 });
        s.fx.dibujar(ctx);
      };
      return s;
    },
  },

  /* --------------------------- El Pabellón --------------------------- */
  obra: {
    titulo: 'Arma la obra', duracion: 60, umbrales: [1, 20, 35], unidad: 'segundos de sobra',
    instrucciones: 'Una pieza de artesano quedó revuelta. Toca dos piezas para intercambiarlas hasta armarla.',
    crear(W, H) {
      const n = 3, lado = Math.min(W * .86, H * .66), ox = (W - lado) / 2, oy = H * .2, c = lado / n;
      const arte = document.createElement('canvas'); arte.width = arte.height = 600;
      const a = arte.getContext('2d');
      const pal = [C.rosa, C.amarillo, C.azul, C.verde, C.naranja, C.morado];
      a.fillStyle = '#fff6e8'; a.fillRect(0, 0, 600, 600);
      for (let i = 0; i < 6; i++) { a.fillStyle = pal[i]; a.fillRect(0, i * 100, 600, 50); }
      for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
        a.fillStyle = pal[(i + j) % 6]; a.beginPath();
        if ((i + j) % 2) a.arc(50 + i * 100, 75 + j * 100, 22, 0, Math.PI * 2); else { a.moveTo(50 + i * 100, 50 + j * 100); a.lineTo(78 + i * 100, 100 + j * 100); a.lineTo(22 + i * 100, 100 + j * 100); }
        a.fill();
      }
      a.strokeStyle = C.ink; a.lineWidth = 6; a.beginPath(); a.arc(300, 300, 150, 0, Math.PI * 2); a.stroke();
      a.fillStyle = '#fff'; a.beginPath(); a.arc(300, 300, 110, 0, Math.PI * 2); a.fill(); a.stroke();
      a.fillStyle = C.ink; a.font = '900 64px Montserrat, sans-serif'; a.textAlign = 'center'; a.textBaseline = 'middle'; a.fillText('PERLA', 300, 304);
      let orden = barajar([...Array(n * n).keys()]);
      while (orden.every((v, i) => v === i)) orden = barajar(orden);
      const s = { puntos: 0, t: 0, fx: flotantes(), orden, sel: -1, fin: false };
      s.presion = (x, y) => {
        if (s.fin) return;
        const i = Math.floor((x - ox) / c), j = Math.floor((y - oy) / c);
        if (i < 0 || j < 0 || i >= n || j >= n) return;
        const k = j * n + i;
        if (s.sel < 0) { s.sel = k; sonido('nota', 600); return; }
        [s.orden[s.sel], s.orden[k]] = [s.orden[k], s.orden[s.sel]];
        s.sel = -1; sonido('nota', 760);
        if (s.orden.every((v, idx) => v === idx)) { s.fin = true; s.puntos = Math.max(1, Math.round(60 - s.t)); sonido('ganar'); }
      };
      s.actualizar = (dt) => { s.t += dt; s.fx.paso(dt); };
      s.dibujar = (ctx) => {
        ctx.fillStyle = '#f3dfc8'; ctx.fillRect(0, 0, W, H);
        texto(ctx, 'ASÍ DEBE QUEDAR →', W - 100, H * .08, { tam: 11, alin: 'right' });
        ctx.drawImage(arte, W - 90, H * .03, 64, 64); ctx.lineWidth = 2; ctx.strokeStyle = C.ink; ctx.strokeRect(W - 90, H * .03, 64, 64);
        caja(ctx, ox - 10, oy - 10, lado + 20, lado + 20, C.madera, 3, 6);
        s.orden.forEach((pieza, k) => {
          const i = k % n, j = Math.floor(k / n), pi = pieza % n, pj = Math.floor(pieza / n);
          ctx.drawImage(arte, pi * 200, pj * 200, 200, 200, ox + i * c, oy + j * c, c, c);
          ctx.lineWidth = s.sel === k ? 6 : 2; ctx.strokeStyle = s.sel === k ? C.naranja : C.ink;
          ctx.strokeRect(ox + i * c + (s.sel === k ? 3 : 0), oy + j * c + (s.sel === k ? 3 : 0), c - (s.sel === k ? 6 : 0), c - (s.sel === k ? 6 : 0));
        });
        if (s.fin) texto(ctx, '¡OBRA COMPLETA!', W / 2, oy + lado + 40, { tam: 24, peso: 900, color: C.verde });
        s.fx.dibujar(ctx);
      };
      return s;
    },
  },

  /* --------------------------- Calzada La Perla --------------------------- */
  luces: {
    titulo: 'Enciende la calzada', duracion: 60, umbrales: [1, 20, 35], unidad: 'segundos de sobra',
    instrucciones: 'Gira los tramos de cable tocándolos hasta que la corriente llegue a todos los focos de la Calzada.',
    crear(W, H) {
      const n = 4, lado = Math.min(W * .86, H * .62), ox = (W - lado) / 2, oy = H * .22, c = lado / n;
      const N = 1, E = 2, Sd = 4, O = 8;
      const con = Array(n * n).fill(0), visto = Array(n * n).fill(false);
      const pila = [0]; visto[0] = true;
      while (pila.length) {
        const k = pila[pila.length - 1], i = k % n, j = Math.floor(k / n);
        const vec = barajar([[0, -1, N, Sd], [1, 0, E, O], [0, 1, Sd, N], [-1, 0, O, E]]).filter(([dx, dy]) => { const a = i + dx, b = j + dy; return a >= 0 && b >= 0 && a < n && b < n && !visto[b * n + a]; });
        if (!vec.length) { pila.pop(); continue; }
        const [dx, dy, m1, m2] = vec[0], k2 = (j + dy) * n + (i + dx);
        con[k] |= m1; con[k2] |= m2; visto[k2] = true; pila.push(k2);
      }
      const rot = (m) => ((m << 1) | (m >> 3)) & 15;
      const celdas = con.map((m) => { let r = m; const g = Math.floor(Math.random() * 4); for (let q = 0; q < g; q++) r = rot(r); return r; });
      const s = { puntos: 0, t: 0, fx: flotantes(), celdas, fin: false, vivo: [] };
      const energia = () => {
        const v = Array(n * n).fill(false); v[0] = true; const cola = [0];
        while (cola.length) {
          const k = cola.shift(), i = k % n, j = Math.floor(k / n), m = s.celdas[k];
          [[0, -1, N, Sd], [1, 0, E, O], [0, 1, Sd, N], [-1, 0, O, E]].forEach(([dx, dy, a, b]) => {
            const x = i + dx, y = j + dy; if (x < 0 || y < 0 || x >= n || y >= n) return;
            const k2 = y * n + x; if (!v[k2] && (m & a) && (s.celdas[k2] & b)) { v[k2] = true; cola.push(k2); }
          });
        }
        return v;
      };
      s.vivo = energia();
      s.presion = (x, y) => {
        if (s.fin) return;
        const i = Math.floor((x - ox) / c), j = Math.floor((y - oy) / c);
        if (i < 0 || j < 0 || i >= n || j >= n) return;
        s.celdas[j * n + i] = rot(s.celdas[j * n + i]); sonido('nota', 440 + i * 60);
        s.vivo = energia();
        if (s.vivo.every(Boolean)) { s.fin = true; s.puntos = Math.max(1, Math.round(60 - s.t)); sonido('ganar'); }
      };
      s.actualizar = (dt) => { s.t += dt; s.fx.paso(dt); };
      s.dibujar = (ctx) => {
        ctx.fillStyle = s.fin ? '#2a2138' : '#ffd9c6'; ctx.fillRect(0, 0, W, H);
        caja(ctx, ox - 46, oy + c * .5 - 18, 36, 36, C.amarillo, 3); texto(ctx, '⚡', ox - 28, oy + c * .5, { tam: 18 });
        ctx.strokeStyle = C.amarillo; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(ox - 10, oy + c * .5); ctx.lineTo(ox, oy + c * .5); ctx.stroke();
        s.celdas.forEach((m, k) => {
          const i = k % n, j = Math.floor(k / n), x = ox + i * c, y = oy + j * c, cx = x + c / 2, cy = y + c / 2;
          caja(ctx, x + 3, y + 3, c - 6, c - 6, '#fff', 3);
          const on = s.vivo[k];
          ctx.lineCap = 'square'; ctx.strokeStyle = on ? C.amarillo : '#bbb'; ctx.lineWidth = 12;
          [[N, 0, -1], [E, 1, 0], [Sd, 0, 1], [O, -1, 0]].forEach(([b, dx, dy]) => { if (m & b) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + dx * c / 2, cy + dy * c / 2); ctx.stroke(); } });
          ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
          [[N, 0, -1], [E, 1, 0], [Sd, 0, 1], [O, -1, 0]].forEach(([b, dx, dy]) => { if (m & b) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + dx * c / 2, cy + dy * c / 2); ctx.stroke(); } });
          const grado = [N, E, Sd, O].filter((b) => m & b).length;
          if (grado === 1) { if (on) circulo(ctx, cx, cy, c * .24, 'rgba(255,195,31,.35)', 0); circulo(ctx, cx, cy, c * .16, on ? C.amarillo : '#ddd', 3); }
          else circulo(ctx, cx, cy, 6, on ? C.amarillo : '#999', 2);
        });
        if (s.fin) texto(ctx, '¡CALZADA ENCENDIDA!', W / 2, oy + lado + 40, { tam: 22, peso: 900, color: C.amarillo });
        s.fx.dibujar(ctx);
      };
      return s;
    },
  },

  /* --------------------------- Mercado / comida --------------------------- */
  horapico: {
    titulo: 'Hora pico', duracion: 40, umbrales: [4, 8, 12], unidad: 'pedidos',
    instrucciones: 'Los clientes piden platillos. Toca los ingredientes del pedido y se lo entregas en cuanto esté completo.',
    crear(W, H) {
      const ING = [['🫓', 'Tortilla'], ['🥩', 'Carne'], ['🧀', 'Queso'], ['🌶️', 'Salsa'], ['🌽', 'Elote'], ['☕', 'Café']];
      const PLATOS = [['Taco', [0, 1, 3]], ['Quesadilla', [0, 2]], ['Elote', [4, 2, 3]], ['Café', [5]], ['Gringa', [0, 1, 2]], ['Esquite', [4, 3]]];
      const s = { puntos: 0, t: 0, fx: flotantes(), clientes: [null, null, null], plato: [], espera: [0, .6, 1.2] };
      const caras = ['🙂', '😋', '🤠', '😎', '🥳', '🧐'];
      const nuevo = () => { const [nombre, rec] = elegir(PLATOS); return { nombre, rec, cara: elegir(caras), pac: azar(9, 13), max: 0 }; };
      const bw = W / 3, by = H * .78, bh = H * .1;
      s.presion = (x, y) => {
        if (y >= by - bh && y < by + bh * 1.1) {
          const fila = y < by ? 0 : 1, col = Math.floor(x / bw), idx = fila * 3 + col;
          if (idx < 0 || idx > 5) return;
          s.plato.push(idx); sonido('nota', 500 + idx * 50);
          const conjunto = [...s.plato].sort().join();
          const posible = s.clientes.some((cl) => cl && s.plato.every((p) => cl.rec.includes(p)) && s.plato.length <= cl.rec.length && new Set(s.plato).size === s.plato.length);
          const listo = s.clientes.findIndex((cl) => cl && [...cl.rec].sort().join() === conjunto);
          if (listo >= 0) {
            s.puntos++; s.fx.agregar(`¡${s.clientes[listo].nombre} listo!`, (listo + .5) * W / 3, H * .2, C.verde);
            s.clientes[listo] = null; s.espera[listo] = .8; s.plato = []; sonido('bien', 780);
          } else if (!posible) { s.fx.agregar('ese no lo pidió nadie', W / 2, H * .6, C.rosa); s.plato = []; sonido('mal'); }
        } else if (y > by + bh * 1.1) { s.plato = []; }
      };
      s.actualizar = (dt) => {
        s.t += dt; s.fx.paso(dt);
        s.clientes.forEach((cl, i) => {
          if (!cl) { s.espera[i] -= dt; if (s.espera[i] <= 0) { s.clientes[i] = nuevo(); s.clientes[i].max = s.clientes[i].pac; } return; }
          cl.pac -= dt * (1 + s.t * .015);
          if (cl.pac <= 0) { s.clientes[i] = null; s.espera[i] = 1; s.fx.agregar('se fue 😢', (i + .5) * W / 3, H * .2, C.rosa); sonido('mal'); }
        });
      };
      s.dibujar = (ctx) => {
        ctx.fillStyle = '#ffe6c2'; ctx.fillRect(0, 0, W, H);
        caja(ctx, 0, H * .42, W, 18, C.naranja, 3);
        s.clientes.forEach((cl, i) => {
          const x = i * W / 3;
          if (!cl) return;
          emoji(ctx, cl.cara, x + W / 6, H * .12, 40);
          caja(ctx, x + 8, H * .2, W / 3 - 16, H * .19, '#fff', 3, 3);
          texto(ctx, cl.nombre.toUpperCase(), x + W / 6, H * .235, { tam: 12 });
          cl.rec.forEach((r, k) => emoji(ctx, ING[r][0], x + W / 6 + (k - (cl.rec.length - 1) / 2) * 30, H * .3, 24));
          caja(ctx, x + 14, H * .36, W / 3 - 28, 8, '#eee', 2);
          caja(ctx, x + 14, H * .36, (W / 3 - 28) * Math.max(0, cl.pac / cl.max), 8, cl.pac / cl.max < .3 ? C.rosa : C.verde, 0);
        });
        caja(ctx, W / 2 - 90, H * .5, 180, 70, '#fff', 3, 4);
        texto(ctx, 'TU PLATO', W / 2, H * .5 + 12, { tam: 10 });
        s.plato.forEach((p, k) => emoji(ctx, ING[p][0], W / 2 + (k - (s.plato.length - 1) / 2) * 40, H * .5 + 44, 30));
        ING.forEach(([e, nom], idx) => {
          const fila = Math.floor(idx / 3), col = idx % 3;
          const x = col * bw, y = by - bh + fila * bh;
          caja(ctx, x + 6, y + 4, bw - 12, bh - 8, '#fff', 3);
          emoji(ctx, e, x + bw / 2 - 22, y + bh / 2, 26);
          texto(ctx, nom, x + bw / 2 + 16, y + bh / 2, { tam: 12, alin: 'center' });
        });
        texto(ctx, 'toca aquí para tirar el plato', W / 2, H * .96, { tam: 11, color: '#7a5a3a' });
        s.fx.dibujar(ctx);
      };
      return s;
    },
  },

  /* --------------------------- Cinépolis --------------------------- */
  palomitas: {
    titulo: 'Atrapa las palomitas', duracion: 25, umbrales: [25, 50, 80], unidad: 'puntos',
    instrucciones: 'Mueve la cubeta con el dedo para atrapar las palomitas. Las de caramelo valen +3; las quemadas restan.',
    crear(W, H) {
      const s = { puntos: 0, t: 0, fx: flotantes(), cubeta: W / 2, items: [], prox: 0 };
      const by = H * .86, bw = Math.min(110, W * .26);
      s.mover = (x) => { s.cubeta = Math.max(bw / 2, Math.min(W - bw / 2, x)); };
      s.presion = (x) => s.mover(x);
      s.actualizar = (dt) => {
        s.t += dt; s.fx.paso(dt);
        s.prox -= dt;
        if (s.prox <= 0) {
          const r = Math.random();
          s.items.push({ x: W / 2 + azar(-30, 30), y: H * .2, vx: azar(-W * .45, W * .45), vy: -azar(H * .5, H * .9), tipo: r < .1 ? 'caramelo' : r < .2 ? 'quemada' : 'normal', rot: azar(0, 6) });
          s.prox = Math.max(.12, .35 - s.t * .008);
        }
        s.items.forEach((it) => {
          const yAnt = it.y; it.vy += H * 1.1 * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.rot += dt * 4;
          if (it.x < 10 || it.x > W - 10) it.vx *= -1;
          if (!it.fuera && it.vy > 0 && yAnt < by && it.y >= by && Math.abs(it.x - s.cubeta) < bw / 2) {
            it.fuera = true;
            const p = it.tipo === 'caramelo' ? 3 : it.tipo === 'quemada' ? -3 : 1;
            s.puntos = Math.max(0, s.puntos + p);
            if (it.tipo !== 'normal') s.fx.agregar(p > 0 ? '+3' : '−3', it.x, by - 30, p > 0 ? C.naranja : C.rosa);
            sonido(p > 0 ? 'bien' : 'mal', 900);
          }
        });
        s.items = s.items.filter((it) => !it.fuera && it.y < H + 30);
      };
      s.dibujar = (ctx) => {
        ctx.fillStyle = '#1d1a2a'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#2a2540'; ctx.fillRect(0, H * .6, W, H * .4);
        caja(ctx, W / 2 - 50, H * .08, 100, H * .14, '#ffefe0', 3);
        caja(ctx, W / 2 - 58, H * .06, 116, 16, C.rojo || '#ff3b3b', 3);
        texto(ctx, 'POP', W / 2, H * .15, { tam: 18, peso: 900, color: '#ff3b3b' });
        s.items.forEach((it) => {
          ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.rot);
          const col = it.tipo === 'caramelo' ? '#e8a23a' : it.tipo === 'quemada' ? '#3a2a20' : '#fff8e6';
          for (let i = 0; i < 4; i++) circulo(ctx, Math.cos(i * 1.6) * 6, Math.sin(i * 1.6) * 6, 7, col, 1.5);
          ctx.restore();
        });
        const x = s.cubeta;
        ctx.beginPath(); ctx.moveTo(x - bw / 2, by); ctx.lineTo(x + bw / 2, by); ctx.lineTo(x + bw * .38, by + 70); ctx.lineTo(x - bw * .38, by + 70); ctx.closePath();
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.save(); ctx.clip();
        for (let i = -3; i < 6; i++) { ctx.fillStyle = '#ff3b3b'; ctx.fillRect(x - bw / 2 + i * 22, by, 11, 70); }
        ctx.restore();
        ctx.lineWidth = 3; ctx.strokeStyle = C.ink; ctx.stroke();
        texto(ctx, '← MUEVE LA CUBETA →', W / 2, H * .97, { tam: 11, color: '#fff' });
        s.fx.dibujar(ctx);
      };
      return s;
    },
  },

  /* --------------------------- Liverpool y moda --------------------------- */
  outfit: {
    titulo: 'Arma el outfit', duracion: 50, umbrales: [4, 6, 8], unidad: 'aciertos',
    instrucciones: 'Te damos una ocasión. Elige una prenda de arriba, una de abajo y unos zapatos que combinen con el plan.',
    crear(W, H) {
      const OCASIONES = [['Boda en jardín', 'formal', '💍'], ['Concierto en el Foro', 'casual', '🎤'], ['Día de playa', 'playa', '🏖️'], ['Entrevista de trabajo', 'formal', '💼'], ['Partido en La Cancha', 'deporte', '🏀']];
      const ROPA = [
        [['👔', 'Camisa de lino', ['formal', 'playa']], ['🧥', 'Blazer', ['formal']], ['👕', 'Playera gráfica', ['casual']], ['🎽', 'Jersey deportivo', ['deporte']], ['👚', 'Top de tirantes', ['playa', 'casual']], ['🧶', 'Sudadera', ['casual', 'deporte']]],
        [['👖', 'Jeans', ['casual']], ['🩳', 'Shorts', ['playa', 'deporte']], ['👗', 'Falda midi', ['formal', 'casual']], ['🩲', 'Traje de baño', ['playa']], ['🧘', 'Pants', ['deporte', 'casual']], ['🕴️', 'Pantalón de vestir', ['formal']]],
        [['👞', 'Mocasines', ['formal']], ['👟', 'Tenis', ['casual', 'deporte']], ['🩴', 'Sandalias', ['playa']], ['🥾', 'Botines', ['casual', 'formal']], ['⛹️', 'Tenis de básquet', ['deporte']], ['👠', 'Tacones', ['formal']]],
      ];
      const s = { puntos: 0, t: 0, fx: flotantes(), ronda: 0, sel: [-1, -1, -1], opciones: [], ocasion: null, resultado: 0, fin: false };
      const armar = () => {
        s.ocasion = OCASIONES[(s.ronda + Math.floor(Math.random() * 5)) % 5];
        s.opciones = ROPA.map((fila) => {
          const buenas = fila.filter((r) => r[2].includes(s.ocasion[1])), malas = fila.filter((r) => !r[2].includes(s.ocasion[1]));
          return barajar([elegir(buenas), ...barajar(malas).slice(0, 2)]);
        });
        s.sel = [-1, -1, -1]; s.resultado = 0;
      };
      armar();
      const top = H * .24, fh = H * .2, cw = W / 3;
      s.presion = (x, y) => {
        if (s.resultado > 0 || s.fin) return;
        const f = Math.floor((y - top) / fh), c = Math.floor(x / cw);
        if (f < 0 || f > 2 || c < 0 || c > 2) return;
        s.sel[f] = c; sonido('nota', 500 + f * 100);
        if (s.sel.every((v) => v >= 0)) {
          const ok = s.sel.filter((v, i) => s.opciones[i][v][2].includes(s.ocasion[1])).length;
          s.puntos += ok; s.resultado = 1.8;
          s.fx.agregar(ok === 3 ? '¡LOOK PERFECTO!' : `${ok}/3 combinan`, W / 2, top - 20, ok === 3 ? C.verde : C.naranja);
          sonido(ok >= 2 ? 'bien' : 'mal', 700);
        }
      };
      s.actualizar = (dt) => {
        s.t += dt; s.fx.paso(dt);
        if (s.resultado > 0) { s.resultado -= dt; if (s.resultado <= 0) { s.ronda++; if (s.ronda >= 3) s.fin = true; else armar(); } }
      };
      s.dibujar = (ctx) => {
        ctx.fillStyle = '#ffeaf4'; ctx.fillRect(0, 0, W, H);
        caja(ctx, 16, 14, W - 32, H * .14, C.rosa, 3, 4);
        texto(ctx, `RONDA ${Math.min(3, s.ronda + 1)}/3 · LA OCASIÓN`, 32, 14 + H * .035, { tam: 11, alin: 'left' });
        emoji(ctx, s.ocasion[2], W - 52, 14 + H * .07, 34);
        texto(ctx, s.ocasion[0], 32, 14 + H * .095, { tam: Math.min(22, W / 18), peso: 900, alin: 'left' });
        ['ARRIBA', 'ABAJO', 'ZAPATOS'].forEach((et, f) => {
          texto(ctx, et, 16, top + f * fh + 2, { tam: 10, alin: 'left', base: 'top' });
          s.opciones[f].forEach((r, c) => {
            const elegido = s.sel[f] === c;
            const bien = s.resultado > 0 && elegido && r[2].includes(s.ocasion[1]);
            const mal = s.resultado > 0 && elegido && !bien;
            caja(ctx, c * cw + 8, top + f * fh + 16, cw - 16, fh - 22, bien ? '#c8efd9' : mal ? '#ffd4e7' : elegido ? C.amarillo : '#fff', 3, elegido ? 0 : 3);
            emoji(ctx, r[0], c * cw + cw / 2, top + f * fh + 16 + (fh - 22) * .4, 30);
            texto(ctx, r[1], c * cw + cw / 2, top + f * fh + 16 + (fh - 22) * .8, { tam: Math.min(12, cw / 10), peso: 700 });
          });
        });
        s.fx.dibujar(ctx);
      };
      return s;
    },
  },
};

/* ======================================================================
   Marco común: pantalla de inicio, tiempo, puntaje y resultado
   ====================================================================== */
const CSS = `
.mj-capa{position:fixed;inset:0;z-index:50;-webkit-touch-callout:none;-webkit-user-select:none;touch-action:none;background:#fff;display:flex;flex-direction:column;font-family:Montserrat,system-ui,sans-serif;color:#141414;-webkit-user-select:none;user-select:none}
.mj-cabeza{display:flex;align-items:stretch;border-bottom:2px solid #141414;min-height:56px;padding-top:env(safe-area-inset-top)}
.mj-cabeza .mj-titulo{flex:1;display:flex;align-items:center;gap:10px;padding:8px 14px;background:var(--acc);color:var(--t);font-weight:900;font-size:16px;text-transform:uppercase;letter-spacing:.03em}
.mj-cabeza .mj-dato{display:flex;flex-direction:column;justify-content:center;padding:6px 14px;border-left:2px solid #141414;min-width:74px}
.mj-cabeza .mj-dato small{font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;opacity:.7}
.mj-cabeza .mj-dato b{font-size:18px;font-weight:900}
.mj-cerrar{border:0;border-left:2px solid #141414;background:#fff;width:56px;font-size:24px;font-weight:700;cursor:pointer}
.mj-tiempo{height:10px;border-bottom:2px solid #141414;background:#fff}.mj-tiempo i{display:block;height:100%;background:#ff6b2c;width:100%}
.mj-lienzo{flex:1;position:relative;touch-action:none;overflow:hidden}
.mj-lienzo canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.mj-panel{position:absolute;inset:0;display:grid;place-items:center;padding:20px;background:rgba(255,255,255,.88)}
.mj-tarjeta{background:#fff;border:2px solid #141414;box-shadow:8px 8px 0 #141414;max-width:420px;width:100%;user-select:text}
.mj-tarjeta .mj-banda{background:var(--acc);color:var(--t);padding:18px 20px;border-bottom:2px solid #141414}
.mj-tarjeta .mj-banda small{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
.mj-tarjeta h2{margin:4px 0 0;font-size:28px;font-weight:900;line-height:1.05}
.mj-tarjeta .mj-cuerpo{padding:18px 20px 20px}
.mj-tarjeta p{margin:0 0 16px;font-size:14px;line-height:1.55;font-weight:500}
.mj-btn{display:inline-flex;align-items:center;justify-content:center;border:2px solid #141414;background:#ffc31f;color:#141414;padding:13px 20px;font:900 14px Montserrat,sans-serif;text-transform:uppercase;letter-spacing:.05em;box-shadow:4px 4px 0 #141414;cursor:pointer;margin:0 10px 10px 0}
.mj-btn:active{transform:translate(4px,4px);box-shadow:none}
.mj-btn.sec{background:#fff}
.mj-estrellas{display:flex;gap:8px;margin:4px 0 14px}
.mj-estrellas span{width:52px;height:52px;border:2px solid #141414;display:grid;place-items:center;font-size:28px;background:#fff;color:#ddd}
.mj-estrellas span.on{background:#ffc31f;color:#141414;animation:mj-pop .5s cubic-bezier(.2,1.8,.4,1) both}
.mj-estrellas span:nth-child(2).on{animation-delay:.15s}.mj-estrellas span:nth-child(3).on{animation-delay:.3s}
@keyframes mj-pop{from{transform:scale(0) rotate(-30deg)}to{transform:none}}
.mj-grande{font-size:56px;font-weight:900;line-height:1;margin:0 0 4px}
`;
function inyectarCSS() {
  if (document.getElementById('mj-css')) return;
  const st = document.createElement('style'); st.id = 'mj-css'; st.textContent = CSS; document.head.appendChild(st);
}
function tintaDe(hex) {
  const n = parseInt(hex.slice(1), 16);
  const l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return l < 0.55 ? '#ffffff' : '#141414';
}

export function abrirMinijuego(id, { zona = null, alTerminar = () => {}, mejor = 0 } = {}) {
  inyectarCSS();
  const def = JUEGOS[id];
  const acento = zona ? zona.acento : '#ff6b2c';
  const capa = document.createElement('div');
  capa.className = 'mj-capa';
  capa.style.setProperty('--acc', acento); capa.style.setProperty('--t', tintaDe(acento));
  capa.innerHTML = `
    <div class="mj-cabeza"><div class="mj-titulo">${def.titulo}</div>
      <div class="mj-dato"><small>Puntos</small><b data-p>0</b></div>
      <div class="mj-dato"><small>Tiempo</small><b data-t>${def.duracion}</b></div>
      <button class="mj-cerrar" aria-label="Salir">×</button></div>
    <div class="mj-tiempo"><i></i></div>
    <div class="mj-lienzo"><canvas></canvas><div class="mj-panel"></div></div>`;
  document.body.appendChild(capa);
  const lienzo = capa.querySelector('.mj-lienzo'), cv = capa.querySelector('canvas'), panel = capa.querySelector('.mj-panel');
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, juego = null, jugando = false, restante = def.duracion, raf = 0, ultimo = 0;

  const medir = () => {
    const r = lienzo.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  medir();
  const alRedimensionar = () => { medir(); if (juego && !jugando) juego = def.crear(W, H); };
  addEventListener('resize', alRedimensionar);

  const estrellasDe = (p, umb) => umb.filter((u) => p >= u).length;
  const cerrar = () => { cancelAnimationFrame(raf); removeEventListener('resize', alRedimensionar); capa.remove(); };
  capa.querySelector('.mj-cerrar').addEventListener('click', cerrar);

  function inicio() {
    juego = def.crear(W, H);
    dibujarCuadro(0);
    panel.style.display = '';
    panel.innerHTML = `<div class="mj-tarjeta"><div class="mj-banda"><small>${zona ? zona.nombre : 'Minijuego'}</small><h2>${def.titulo}</h2></div>
      <div class="mj-cuerpo"><p>${def.instrucciones}</p><p style="font-size:12px;color:#5c5c5c">${def.duracion} segundos · ★ ${(juego.umbrales || def.umbrales)[0]} · ★★ ${(juego.umbrales || def.umbrales)[1]} · ★★★ ${(juego.umbrales || def.umbrales)[2]} ${def.unidad}${mejor ? ` · tu récord: ${'★'.repeat(mejor)}` : ''}</p>
      <button class="mj-btn" data-jugar>¡A jugar!</button><button class="mj-btn sec" data-salir>Ahora no</button></div></div>`;
    panel.querySelector('[data-jugar]').onclick = () => { sonido('nota', 1); panel.style.display = 'none'; restante = def.duracion; jugando = true; ultimo = performance.now(); raf = requestAnimationFrame(bucle); };
    panel.querySelector('[data-salir]').onclick = cerrar;
  }
  function fin() {
    jugando = false;
    const umb = juego.umbrales || def.umbrales;
    const p = juego.puntos, e = estrellasDe(p, umb);
    if (e > 0) sonido('ganar');
    alTerminar(e, p);
    panel.style.display = '';
    panel.innerHTML = `<div class="mj-tarjeta"><div class="mj-banda"><small>Resultado</small><h2>${e === 3 ? '¡Increíble!' : e === 2 ? '¡Muy bien!' : e === 1 ? '¡Bien hecho!' : '¡Casi!'}</h2></div>
      <div class="mj-cuerpo"><div class="mj-grande">${p}</div><p style="margin-bottom:10px">${def.unidad}</p>
      <div class="mj-estrellas">${[1, 2, 3].map((k) => `<span class="${k <= e ? 'on' : ''}">★</span>`).join('')}</div>
      <p style="font-size:12px;color:#5c5c5c">★ ${umb[0]} · ★★ ${umb[1]} · ★★★ ${umb[2]} ${def.unidad}</p>
      <button class="mj-btn" data-otra>Otra vez</button><button class="mj-btn sec" data-salir>Salir</button></div></div>`;
    panel.querySelector('[data-otra]').onclick = inicio;
    panel.querySelector('[data-salir]').onclick = cerrar;
  }
  function dibujarCuadro() { ctx.clearRect(0, 0, W, H); juego.dibujar(ctx); }
  function bucle(ahora) {
    const dt = Math.min(.05, (ahora - ultimo) / 1000); ultimo = ahora;
    if (jugando) {
      restante -= dt;
      juego.actualizar(dt);
      capa.querySelector('[data-p]').textContent = juego.puntos;
      capa.querySelector('[data-t]').textContent = Math.max(0, Math.ceil(restante));
      capa.querySelector('.mj-tiempo i').style.width = `${Math.max(0, restante / def.duracion) * 100}%`;
      if (restante <= 0 || juego.fin) { dibujarCuadro(); setTimeout(fin, juego.fin ? 900 : 200); jugando = false; return; }
    }
    dibujarCuadro();
    raf = requestAnimationFrame(bucle);
  }

  // Entrada: toque inmediato, deslizar y arrastrar
  let ini = null;
  const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('pointerdown', (e) => {
    if (!jugando) return;
    const [x, y] = pos(e);
    ini = { x, y, t: performance.now() };
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
    juego.presion && juego.presion(x, y);
  });
  cv.addEventListener('pointermove', (e) => {
    if (!jugando) return;
    const [x, y] = pos(e);
    if (juego.mover && (ini || e.pointerType === 'mouse')) juego.mover(x, y);
  });
  cv.addEventListener('pointerup', (e) => {
    if (!jugando || !ini) return;
    const [x, y] = pos(e);
    const dx = x - ini.x, dy = y - ini.y, dt = (performance.now() - ini.t) / 1000;
    if (Math.hypot(dx, dy) > 25) { if (juego.desliz) juego.desliz(dx, dy, dt); } else if (juego.toque) juego.toque(x, y);
    ini = null;
  });

  inicio();
  return { cerrar };
}
