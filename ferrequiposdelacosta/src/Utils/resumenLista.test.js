import { diasDesde, masAntiguas, masPedidos, porPersona, textoEspera } from "./resumenLista";

// Lo que se saca de la lista ya cargada para la columna de la derecha del
// buzón y de las cuentas de cobro.
const DIA = 24 * 60 * 60 * 1000;
const AHORA = Date.UTC(2026, 9, 22, 17);

describe("cuánto lleva esperando", () => {
  it("días enteros, y 'hoy' si no pasó uno", () => {
    expect(diasDesde(AHORA - 2.5 * DIA, AHORA)).toBe(2);
    expect(textoEspera(0)).toBe("hoy");
    expect(textoEspera(1)).toBe("hace 1 día");
    expect(textoEspera(3)).toBe("hace 3 días");
  });
});

describe("masAntiguas", () => {
  it("de la más vieja a la más nueva, sin las que no tienen fecha", () => {
    const documentos = [
      { id: "b", fecha: AHORA - DIA },
      { id: "sin" },
      { id: "a", fecha: AHORA - 5 * DIA },
      { id: "c", fecha: AHORA },
    ];

    expect(masAntiguas(documentos, (d) => d.fecha, 2).map((d) => d.id)).toEqual(["a", "b"]);
  });
});

describe("masPedidos", () => {
  it("suma las cantidades de cada equipo, aunque esté escrito distinto", () => {
    const documentos = [
      { items: [{ description: "ANDAMIO", quantity: 10 }, { description: "TABLÓN", quantity: 8 }] },
      { items: [{ description: " andamio ", quantity: "5" }, { description: "", quantity: 9 }] },
    ];

    expect(masPedidos(documentos)).toEqual([
      { nombre: "ANDAMIO", cantidad: 15 },
      { nombre: "TABLÓN", cantidad: 8 },
    ]);
  });
});

describe("porPersona", () => {
  it("de quien más tiene a quien menos, sin los que no tienen nombre", () => {
    const documentos = [{ quien: "Aida" }, { quien: "Yas" }, { quien: "Yas" }, { quien: "" }];

    expect(porPersona(documentos, (d) => d.quien)).toEqual([
      { nombre: "Yas", cantidad: 2 },
      { nombre: "Aida", cantidad: 1 },
    ]);
  });
});
