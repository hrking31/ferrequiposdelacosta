import {
  ACOMODO,
  ANCHO,
  FIN,
  FIN_SALIDA,
  caidaEn,
  crearTramoSuelto,
  medidas,
  salidaEn,
} from "./cinta";

// LA CINTA DE LA PUERTA DEL PERSONAL. Lo que se ve no se puede probar acá
// (no hay dibujo de verdad), pero sí las cuentas que lo deciden: dónde
// termina el carné, que nada se salga de la pantalla y que la cinta suelta
// quede quieta al final —el dueño no quería la punta subiendo y bajando—.
const ALTO = 650; // el carné con el espacio del mosquetón

// Los números del trazo, de a pares (x, y).
const puntos = (d) => {
  const n = d.match(/-?\d+(\.\d+)?/g).map(Number);
  return Array.from({ length: n.length / 2 }, (_, i) => [n[2 * i], n[2 * i + 1]]);
};

describe("la caída del carné", () => {
  it("arranca fuera de la pantalla, arriba", () => {
    expect(caidaEn(0, ALTO)).toBeLessThan(-ALTO);
  });

  it("baja hasta el fondo y vuelve: al final queda en su lugar", () => {
    expect(caidaEn(800, ALTO)).toBeGreaterThan(0.5 * ALTO);
    expect(caidaEn(2000, ALTO)).toBe(0);
    expect(caidaEn(FIN, ALTO)).toBe(0);
  });
});

describe("la salida (devolver el carné)", () => {
  it("se hunde un poquito y después la cinta lo saca por arriba", () => {
    expect(salidaEn(0, ALTO)).toBe(0);
    expect(salidaEn(300, ALTO)).toBeGreaterThan(0);
    expect(salidaEn(FIN_SALIDA, ALTO)).toBeLessThan(-1.5 * ALTO);
  });
});

describe("dónde va cada cosa", () => {
  it("en el computador sobra lugar: la cinta cuelga libre al lado del carné", () => {
    const m = medidas(330, 480, 1200);

    expect(m.choca).toBe(true);
    expect(m.gx - ANCHO).toBeGreaterThan(330 / 2);
  });

  it.each([
    ["un celular angosto", 272, 360],
    ["un celular común", 287, 375],
    ["el computador", 330, 1200],
  ])("en %s ni el carné ni la cinta se salen de la pantalla", (_caso, ancho, pantalla) => {
    const m = medidas(ancho, 480, pantalla);

    // El borde izquierdo del carné y el derecho de la cinta, contados desde
    // el centro de la pantalla.
    expect(m.corrida - ancho / 2).toBeGreaterThanOrEqual(-pantalla / 2);
    expect(m.corrida + m.gx + ANCHO).toBeLessThanOrEqual(pantalla / 2);
  });
});

describe("el tramo suelto", () => {
  const m = medidas(330, 480, 1200);
  const forma = crearTramoSuelto(m, (ms) => caidaEn(ms, ALTO), { acomodo: ACOMODO });

  it("al final cuelga derecho, del gancho hacia abajo", () => {
    const p = puntos(forma(FIN));

    expect(p.every(([x]) => Math.abs(x - m.gx) < 0.2)).toBe(true);
    expect(p.at(-1)[1]).toBeGreaterThan(p[0][1]);
  });

  it("ya acomodado no se mueve: la punta no sube ni baja", () => {
    const quieta = puntos(forma(ACOMODO[1] + 100)).at(-1);
    const despues = puntos(forma(FIN)).at(-1);

    expect(despues).toEqual(quieta);
  });

  it("mientras se mueve, nunca pasa por encima del carné", () => {
    // La forma ya viene medida desde la ranura del carné, que se mueve con él.
    for (let ms = 0; ms <= FIN; ms += 250) {
      for (const [x, py] of puntos(forma(ms))) {
        const sobreElCarne = py > m.caja.arriba && py < m.caja.abajo;
        if (sobreElCarne) expect(Math.abs(x)).toBeGreaterThanOrEqual(330 / 2);
      }
    }
  });
});
