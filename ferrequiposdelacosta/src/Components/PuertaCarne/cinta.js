// LA CINTA DE LA PUERTA DEL PERSONAL (2026-11-07). El carné cuelga de una
// cinta que cuelga de un gancho arriba, fuera de la pantalla: de un lado baja
// el carné y del otro cuelga el tramo suelto, detrás del carné (nunca lo tapa)
// y hasta debajo del borde de la pantalla.
//
// Todo se mide con la ranura del carné en el punto (0,0). El tramo del carné
// es una curva fija; el tramo suelto lo mueve una simulación de gravedad (una
// cadena de puntos unidos) para que se sacuda con la caída del carné y luego
// se calme. La caída también la mueve este archivo, así la cinta siente los
// mismos tirones. Se diseñó en una maqueta (artifact "Puerta del personal").

export const GANCHO_Y = -700; // altura del gancho: siempre fuera de la pantalla
export const BOCA = -129; // donde la cinta entra a la pieza negra del mosquetón
export const ANCHO = 22; // medio ancho de la cinta
export const PASO_MS = 1000 / 60;
export const PASOS = 420; // cuadros de simulación (7 s)
export const FIN = PASOS * PASO_MS;
const LARGO_SUELTA = 1750; // la punta queda siempre debajo de la pantalla
const SEP = 10; // distancia entre puntos de la cinta
// Con el carné ya quieto, la cinta suelta se acomoda de una sola vez hasta
// colgar derecha: sin esto la punta quedaba subiendo y bajando.
export const ACOMODO = [1700, 3200];

// La caída del carné, en fracciones de su alto: baja hasta el fondo de la
// pantalla, la cinta lo devuelve, dos rebotes y queda en su sitio (2 s).
const entra = (t) => t ** 2.2;
const sale = (t) => 1 - (1 - t) ** 2.2;
const suave = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const CAIDA = [
  [0, -1.5, entra],
  [0.4, 0.58, sale],
  [0.62, -0.14, suave],
  [0.78, 0.05, suave],
  [0.9, -0.015, suave],
  [1, 0],
];

export function caidaEn(ms, alto) {
  const t = Math.min(1, Math.max(0, ms / 2000));
  for (let i = 0; i < CAIDA.length - 1; i++) {
    const [t0, v0, curva] = CAIDA[i];
    const [t1, v1] = CAIDA[i + 1];
    if (t <= t1) return (v0 + (v1 - v0) * curva((t - t0) / (t1 - t0))) * alto;
  }
  return 0;
}

// LA SALIDA (devolver el carné al terminar el turno): se hunde un poquito,
// como cuando alguien toma impulso, y la cinta lo jala hacia arriba hasta
// sacarlo de la pantalla.
export const FIN_SALIDA = 1250;
export function salidaEn(ms, alto) {
  if (ms <= 300) return 0.04 * sale(Math.max(0, ms) / 300) * alto;
  const t = Math.min(1, (ms - 300) / 850);
  return (0.04 + (-1.7 - 0.04) * entra(t)) * alto;
}

// Curva suave que pasa por todos los puntos (Catmull-Rom → Bézier).
export function suavizar(p) {
  const f = (v) => v.toFixed(1);
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i - 1] || p[i];
    const b = p[i];
    const c = p[i + 1];
    const e = p[i + 2] || c;
    d +=
      ` C${f(b[0] + (c[0] - a[0]) / 6)} ${f(b[1] + (c[1] - a[1]) / 6)}` +
      ` ${f(c[0] - (e[0] - b[0]) / 6)} ${f(c[1] - (e[1] - b[1]) / 6)}` +
      ` ${f(c[0])} ${f(c[1])}`;
  }
  return d;
}

// Dónde va cada cosa según el ancho del carné y de la pantalla. El carné y la
// cinta suelta se centran juntos (el carné queda un poco a la izquierda), sin
// que el carné se salga por la izquierda: en un celular angosto manda esto, y
// la cinta cuelga junto al borde, pasando por detrás del carné.
export function medidas(anchoCarne, altoCarne, anchoEscena) {
  const izqCarne = -anchoCarne / 2;
  const gxIdeal = anchoCarne / 2 + ANCHO + 8;
  const mitad = anchoEscena / 2;
  const corrida = Math.max(-(izqCarne + gxIdeal + ANCHO) / 2, -mitad + 8 - izqCarne);
  const pared = mitad - 4 - ANCHO - corrida;
  const gx = Math.min(gxIdeal, pared);
  return {
    corrida,
    pared,
    gx,
    // Sin espacio al lado, la cinta no choca con el carné: pasa por detrás.
    choca: gx >= gxIdeal,
    caja: {
      izq: -anchoCarne / 2 - ANCHO,
      der: anchoCarne / 2 + ANCHO + 3,
      arriba: -30 - ANCHO,
      abajo: altoCarne - 30 + ANCHO,
    },
  };
}

export const trazoTenso = (gx) =>
  `M0 ${BOCA + 14} C0 ${BOCA - 30} ${0.06 * gx} ${BOCA - 90} ${0.16 * gx} ${BOCA - 160}` +
  ` L${gx} ${GANCHO_Y} L${gx} ${GANCHO_Y - 60}`;

// El tramo suelto. Devuelve `forma(ms)`: el trazo de la cinta en ese instante.
// Para volver atrás en el tiempo se rehace desde el principio.
// `caida(ms)` dice dónde está el carné. Al entrar la cinta solo acompaña al
// carné cuando baja más rápido que la gravedad, y al final se acomoda
// (`acomodo`); al salir lo sigue casi entero (`arrastre`), con un leve retraso.
export function crearTramoSuelto({ gx, pared, choca, caja }, caida, { acomodo = null, arrastre = 0 } = {}) {
  const n = Math.round(LARGO_SUELTA / SEP) + 1;
  let pos;
  let ant;
  let cuadro;
  let caidaActual;

  const reiniciar = () => {
    const y0 = caida(0);
    // una leve curva: una cinta nunca cuelga perfectamente recta (y así, si
    // un tirón la lanza hacia arriba, se dobla y vuelve a caer)
    pos = Array.from({ length: n }, (_, i) => [gx + 0.004 * i * i, GANCHO_Y + y0 + i * SEP]);
    ant = pos.map((q) => [...q]);
    cuadro = 0;
    caidaActual = y0;
  };

  const paso = () => {
    const ms = (cuadro + 1) * PASO_MS;
    const y = caida(ms);
    // Si el carné baja más rápido que la gravedad, la cinta lo acompaña (si
    // no, quedaría atrás y se enroscaría); al frenar sí sigue de largo.
    const tiron = y - 2 * caida(ms - PASO_MS) + caida(ms - 2 * PASO_MS);
    const empuje = arrastre ? arrastre * tiron : Math.max(0, tiron);
    for (let i = 1; i < n; i++) {
      const p = pos[i];
      const a = ant[i];
      const vx = (p[0] - a[0]) * 0.99;
      // el aire frena la tela: hacia arriba nunca sale disparada
      const vy = Math.max(-3.5, (p[1] - a[1]) * 0.99);
      a[0] = p[0];
      a[1] = p[1];
      p[0] += vx;
      p[1] += vy + 0.55 + empuje;
    }
    for (let k = 0; k < 24; k++) {
      pos[0] = [gx, GANCHO_Y + y];
      for (let i = 0; i < n - 1; i++) {
        const p = pos[i];
        const q = pos[i + 1];
        const dx = q[0] - p[0];
        const dy = q[1] - p[1];
        const dist = Math.hypot(dx, dy) || 1;
        const dif = (dist - SEP) / dist;
        const wp = i === 0 ? 0 : 0.5;
        const wq = i === 0 ? 1 : 0.5;
        p[0] += dx * dif * wp;
        p[1] += dy * dif * wp;
        q[0] -= dx * dif * wq;
        q[1] -= dy * dif * wq;
      }
      // la tela es algo rígida: no se dobla en pliegues filosos
      for (const [salto, minimo] of [
        [2, 1.93],
        [4, 3.6],
      ]) {
        for (let i = 0; i < n - salto; i++) {
          const p = pos[i];
          const q = pos[i + salto];
          const dx = q[0] - p[0];
          const dy = q[1] - p[1];
          const dist = Math.hypot(dx, dy) || 1;
          if (dist < minimo * SEP) {
            const dif = ((dist - minimo * SEP) / dist) * 0.5;
            if (i > 0) {
              p[0] += dx * dif;
              p[1] += dy * dif;
            }
            q[0] -= dx * dif;
            q[1] -= dy * dif;
          }
        }
      }
      for (let i = 1; i < n; i++) {
        const p = pos[i];
        const yl = p[1] - y;
        // el carné estorba: la cinta solo se aparta hacia los lados
        if (choca && p[0] > caja.izq && p[0] < caja.der && yl > caja.arriba && yl < caja.abajo) {
          p[0] = p[0] - caja.izq < caja.der - p[0] ? caja.izq : caja.der;
          ant[i][0] += (p[0] - ant[i][0]) * 0.05;
          ant[i][1] += (p[1] - ant[i][1]) * 0.05;
        }
        // y no se sale de la pantalla: si no cabe, pasa por detrás del carné
        if (p[0] > pared) p[0] = pared;
      }
    }
    caidaActual = y;
    cuadro++;
  };

  reiniciar();
  return (ms) => {
    const meta = Math.min(PASOS, Math.floor(ms / PASO_MS));
    if (meta < cuadro) reiniciar();
    while (cuadro < meta) paso();
    const t = acomodo ? Math.min(1, Math.max(0, (ms - acomodo[0]) / (acomodo[1] - acomodo[0]))) : 0;
    const e = t * t * (3 - 2 * t);
    return suavizar(
      pos.map(([x, py], i) => {
        const yl = py - caidaActual;
        return [x + (gx - x) * e, yl + (GANCHO_Y + i * SEP - yl) * e];
      }),
    );
  };
}
