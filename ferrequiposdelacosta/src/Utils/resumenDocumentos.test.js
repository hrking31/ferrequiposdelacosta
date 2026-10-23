import {
  aporteCotizacion,
  aporteCuentaCobro,
  cotizacionesDelMes,
  cuentasCobroDelMes,
  diferenciaPorMes,
  inicioDeMesBogota,
  mesBogota,
} from "./resumenDocumentos";

// Las cotizaciones y cuentas de cobro del mes en la pizarra del menú: cuántas
// hay en cada estado. Lo que importa: que cada cambio de estado mueva un
// número de una casilla a otra sin tocar el total, que cada documento se
// cuente en el mes en que nació (en hora de Colombia), y que el estado que no
// se guarda salga bien de restar.

// 15 de octubre de 2026, mediodía en Colombia.
const OCTUBRE = Date.UTC(2026, 9, 15, 17);

const cotizacion = (status) => ({ createdAt: OCTUBRE, status });
const cuenta = (status, cambios = {}) => ({
  creadaEn: OCTUBRE,
  status,
  emitida: true,
  ...cambios,
});

describe("el mes, en hora de Colombia", () => {
  it("las 9 p.m. del 31 de octubre en Colombia siguen siendo octubre", () => {
    // En hora universal ya es 1 de noviembre.
    expect(mesBogota(Date.UTC(2026, 10, 1, 2))).toBe("2026-10");
  });

  it("el mes empieza a la medianoche de Colombia", () => {
    const inicio = inicioDeMesBogota(OCTUBRE);

    expect(mesBogota(inicio)).toBe("2026-10");
    expect(mesBogota(inicio - 1)).toBe("2026-09");
  });
});

describe("aporteCotizacion", () => {
  it("cada estado en su casilla; la pendiente solo en el total", () => {
    expect(aporteCotizacion(cotizacion("pendiente"))).toEqual({
      mes: "2026-10",
      valores: { total: 1, pausadas: 0, enProceso: 0, emitidas: 0 },
    });
    expect(aporteCotizacion(cotizacion("pausada")).valores.pausadas).toBe(1);
    expect(aporteCotizacion(cotizacion("enProceso")).valores.enProceso).toBe(1);
    expect(aporteCotizacion(cotizacion("creada")).valores.emitidas).toBe(1);
  });

  it("sin documento o sin fecha no aporta", () => {
    expect(aporteCotizacion(null)).toBeNull();
    expect(aporteCotizacion({ status: "creada" })).toBeNull();
  });
});

describe("aporteCuentaCobro", () => {
  it("cada estado en su casilla; la emitida solo en el total", () => {
    expect(aporteCuentaCobro(cuenta("creada"))).toEqual({
      mes: "2026-10",
      valores: { total: 1, pausadas: 0, enProceso: 0, pagadas: 0 },
    });
    expect(aporteCuentaCobro(cuenta("pagada")).valores.pagadas).toBe(1);
    expect(aporteCuentaCobro(cuenta("enProceso")).valores.enProceso).toBe(1);
  });

  it("una emitida que se volvió a guardar sin emitir cuenta como pausada", () => {
    expect(aporteCuentaCobro(cuenta("pausada")).valores.pausadas).toBe(1);
  });

  it("un borrador que nunca se emitió no cuenta", () => {
    expect(aporteCuentaCobro(cuenta("pausada", { emitida: undefined }))).toBeNull();
  });
});

describe("diferenciaPorMes", () => {
  it("abrir una cotización la pasa a en proceso, sin tocar el total", () => {
    const diferencia = diferenciaPorMes(
      aporteCotizacion(cotizacion("pendiente")),
      aporteCotizacion(cotizacion("enProceso")),
    );

    expect(diferencia).toEqual({ "2026-10": { enProceso: 1 } });
  });

  it("emitirla la saca de en proceso y la pasa a emitidas", () => {
    const diferencia = diferenciaPorMes(
      aporteCotizacion(cotizacion("enProceso")),
      aporteCotizacion(cotizacion("creada")),
    );

    expect(diferencia).toEqual({ "2026-10": { enProceso: -1, emitidas: 1 } });
  });

  it("una nueva suma, una borrada resta", () => {
    const nueva = aporteCotizacion(cotizacion("pendiente"));

    expect(diferenciaPorMes(null, nueva)).toEqual({ "2026-10": { total: 1 } });
    expect(diferenciaPorMes(nueva, null)).toEqual({ "2026-10": { total: -1 } });
  });

  it("guardar una cotización sin cambiarle el estado no mueve nada", () => {
    const misma = aporteCotizacion(cotizacion("creada"));

    expect(diferenciaPorMes(misma, misma)).toEqual({});
  });

  it("marcar pagada una cuenta la pasa a pagadas", () => {
    const diferencia = diferenciaPorMes(
      aporteCuentaCobro(cuenta("creada")),
      aporteCuentaCobro(cuenta("pagada")),
    );

    expect(diferencia).toEqual({ "2026-10": { pagadas: 1 } });
  });

  it("emitir un borrador lo suma al total", () => {
    const diferencia = diferenciaPorMes(
      aporteCuentaCobro(cuenta("pausada", { emitida: undefined })),
      aporteCuentaCobro(cuenta("creada")),
    );

    expect(diferencia).toEqual({ "2026-10": { total: 1 } });
  });
});

describe("lo que lee la app", () => {
  it("cotizaciones: las pendientes son las que no están en otro estado", () => {
    const porMes = { "2026-10": { total: 35, pausadas: 1, enProceso: 3, emitidas: 30 } };

    expect(cotizacionesDelMes(porMes, "2026-10")).toEqual({
      total: 35,
      pendientes: 1,
      pausadas: 1,
      enProceso: 3,
      emitidas: 30,
    });
  });

  it("cuentas: las emitidas son las que no están en otro estado", () => {
    const porMes = { "2026-10": { total: 16, pausadas: 0, enProceso: 2, pagadas: 2 } };

    expect(cuentasCobroDelMes(porMes, "2026-10")).toEqual({
      total: 16,
      emitidas: 12,
      pausadas: 0,
      enProceso: 2,
      pagadas: 2,
    });
  });

  it("un mes que todavía no tiene nada es cero", () => {
    expect(cotizacionesDelMes({ "2026-10": { total: 12 } }, "2026-11")).toEqual({
      total: 0,
      pendientes: 0,
      pausadas: 0,
      enProceso: 0,
      emitidas: 0,
    });
  });

  it("sin el dato en la pizarra, null: el detalle no está listo", () => {
    expect(cotizacionesDelMes(undefined, "2026-10")).toBeNull();
    expect(cuentasCobroDelMes(null, "2026-10")).toBeNull();
  });
});
