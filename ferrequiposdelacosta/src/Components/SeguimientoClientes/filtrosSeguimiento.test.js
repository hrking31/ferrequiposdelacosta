import {
  unEquipo,
  unEquipoDevuelto,
  unaFactura,
  unTramoVencido,
} from "../../test/facturas";
import {
  cumpleDias,
  cumpleGestion,
  datosParaFiltrar,
  FILTROS_GESTION,
  opcionesDias,
} from "./filtrosSeguimiento";

// Los filtros de Seguimiento. Lo que importa: que los días sean los mismos que
// la tarjeta dice al lado de la fecha, y que el selector ofrezca solo los que
// hay.
const HOY = "2026-08-20";

const andamio = (extra = {}) =>
  unEquipo({
    nombre: "ANDAMIO",
    cantidad: 5,
    dias: 3,
    valorDia: 20000,
    fechaDespacho: "2026-08-01",
    ...extra,
  });

const facturaCon = (equipos) =>
  unaFactura({
    numeroFactura: "1573",
    fechaCreacion: "2026-08-01",
    subtotal: 300000,
    total: 300000,
    equipos,
  });

describe("filtrosSeguimiento — lo que se mira de cada factura", () => {
  it("cada equipo vencido marca sus días, desde que se abrió su tramo", () => {
    const factura = facturaCon([
      // Del 04 al 20: 17 días.
      andamio({ vencidos: [unTramoVencido({ desde: "2026-08-04", hasta: null })] }),
      // Del 18 al 20: 3 días.
      andamio({
        nombre: "MEZCLADORA",
        fechaDespacho: "2026-08-15",
        vencidos: [unTramoVencido({ desde: "2026-08-18", hasta: null })],
      }),
    ]);

    const datos = datosParaFiltrar(factura, HOY);
    // Nadie la llamó todavía.
    expect(datos.gestion).toBe("sinGestionar");
    expect(datos.dias.sort()).toEqual(["17", "3"]);
  });

  it("el equipo que vence hoy marca «hoy»", () => {
    // Del 01 por 20 días: cubierto hasta el 20, que es hoy.
    const factura = facturaCon([andamio({ dias: 20 })]);

    expect(datosParaFiltrar(factura, HOY).dias).toEqual(["hoy"]);
  });

  it("la que ya devolvió todo y solo debe plata va en «Cobro», sin días", () => {
    const factura = facturaCon([
      unEquipoDevuelto({
        nombre: "ANDAMIO",
        cantidad: 5,
        dias: 3,
        valorDia: 20000,
        fechaDespacho: "2026-08-01",
        vencidos: [unTramoVencido({ desde: "2026-08-04", hasta: "2026-08-05" })],
        fechaDevolucion: "2026-08-05",
      }),
    ]);

    expect(datosParaFiltrar(factura, HOY)).toEqual({ gestion: "cobro", dias: [] });
  });
});

describe("filtrosSeguimiento — los filtros", () => {
  const vencida = { gestion: "sinRespuesta", dias: ["hoy", "3"] };
  const cobro = { gestion: "cobro", dias: [] };

  it("ofrece las gestiones que el chip puede mostrar, sin «Devolución total»", () => {
    expect(FILTROS_GESTION.map((filtro) => filtro.label)).toEqual([
      "Todas",
      "Sin gestionar",
      "Sin respuesta",
      "Renovación",
      "Parcial",
      "Entrega pactada",
      "Cobro",
    ]);
  });

  it("«Todas» y «Todos» dejan pasar todo", () => {
    expect(cumpleGestion(cobro, "todos")).toBe(true);
    expect(cumpleDias(cobro, "todos")).toBe(true);
  });

  it("filtra por gestión", () => {
    expect(cumpleGestion(vencida, "sinRespuesta")).toBe(true);
    expect(cumpleGestion(cobro, "sinRespuesta")).toBe(false);
  });

  it("pasa la factura si alguno de sus equipos tiene esos días", () => {
    expect(cumpleDias(vencida, "3")).toBe(true);
    expect(cumpleDias(vencida, "hoy")).toBe(true);
    expect(cumpleDias(vencida, "2")).toBe(false);
    expect(cumpleDias(cobro, "3")).toBe(false);
  });
});

describe("filtrosSeguimiento — las opciones de días", () => {
  it("solo las que hay: Hoy, 1 y 3 sin el 2, con cuántas facturas tiene cada una", () => {
    const opciones = opcionesDias([
      { dias: ["3"] },
      { dias: ["hoy", "1"] },
      { dias: ["3"] },
      { dias: [] },
    ]);

    expect(opciones).toEqual([
      { valor: "hoy", label: "Hoy", cantidad: 1 },
      { valor: "1", label: "1 día", cantidad: 1 },
      { valor: "3", label: "3 días", cantidad: 2 },
    ]);
  });

  it("ordena por número, no por texto: el 12 va después del 3", () => {
    const opciones = opcionesDias([{ dias: ["12"] }, { dias: ["3"] }]);
    expect(opciones.map((o) => o.valor)).toEqual(["3", "12"]);
  });
});
