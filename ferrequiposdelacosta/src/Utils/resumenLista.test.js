import {
  equiposEnMas,
  hoyYEstaSemana,
  inicioDeSemanaBogota,
  inicioDelDiaBogota,
  masFrecuentes,
} from "./resumenLista";

// Lo que se saca de la lista ya cargada para las estadísticas de la columna
// de la derecha del buzón y de las cuentas de cobro.
const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;
// Jueves 22/10/2026, 12 del mediodía en Colombia (17:00 en hora universal).
const AHORA = Date.UTC(2026, 9, 22, 17);
// Las 12 de la noche del jueves y del lunes 19/10 en Colombia.
const JUEVES = Date.UTC(2026, 9, 22, 5);
const LUNES = Date.UTC(2026, 9, 19, 5);

describe("el día y la semana en hora de Colombia", () => {
  it("el día empieza a las 12 de la noche de Colombia, no a la universal", () => {
    expect(inicioDelDiaBogota(AHORA)).toBe(JUEVES);
    // Las 11 p. m. del jueves en Colombia ya son viernes en hora universal.
    expect(inicioDelDiaBogota(JUEVES + 23 * HORA)).toBe(JUEVES);
  });

  it("la semana empieza el lunes, y un lunes es su propio comienzo", () => {
    expect(inicioDeSemanaBogota(AHORA)).toBe(LUNES);
    expect(inicioDeSemanaBogota(LUNES + 2 * HORA)).toBe(LUNES);
    // El domingo todavía es de esa semana.
    expect(inicioDeSemanaBogota(LUNES + 6 * DIA + 20 * HORA)).toBe(LUNES);
  });
});

describe("hoyYEstaSemana", () => {
  it("cuenta las de hoy y las de desde el lunes; las sin fecha no cuentan", () => {
    const documentos = [
      { fecha: AHORA - HORA }, // hoy
      { fecha: JUEVES - HORA }, // miércoles: esta semana, no hoy
      { fecha: LUNES }, // lunes a las 12: esta semana
      { fecha: LUNES - HORA }, // domingo: semana pasada
      {},
    ];

    expect(hoyYEstaSemana(documentos, (d) => d.fecha, AHORA)).toEqual({ hoy: 1, semana: 3 });
  });
});

describe("equiposEnMas", () => {
  it("cuenta en cuántos documentos aparece cada equipo, no las unidades", () => {
    const documentos = [
      // Un solo pedido grande no se lleva el ranking.
      { items: [{ description: "CHAZAS", quantity: 300 }] },
      { items: [{ description: "ANDAMIO", quantity: 2 }, { description: "TABLÓN", quantity: 8 }] },
      // El mismo equipo en dos renglones del mismo documento cuenta una vez, y
      // escrito distinto es el mismo.
      { items: [{ description: " andamio ", quantity: 1 }, { description: "ANDAMIO", quantity: 3 }] },
      { items: [{ description: "", quantity: 9 }] },
    ];

    expect(equiposEnMas(documentos)).toEqual([
      { nombre: "ANDAMIO", cantidad: 2 },
      { nombre: "CHAZAS", cantidad: 1 },
      { nombre: "TABLÓN", cantidad: 1 },
    ]);
  });
});

describe("masFrecuentes", () => {
  it("de quien más tiene a quien menos, sin los que no tienen nombre", () => {
    const documentos = [
      { cliente: "Aida" },
      { cliente: "Yas" },
      { cliente: " YAS " },
      { cliente: "" },
    ];

    expect(masFrecuentes(documentos, (d) => d.cliente)).toEqual([
      { nombre: "Yas", cantidad: 2 },
      { nombre: "Aida", cantidad: 1 },
    ]);
  });
});
