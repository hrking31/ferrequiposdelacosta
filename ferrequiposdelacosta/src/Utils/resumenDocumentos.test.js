import {
  aporteCotizacion,
  aporteCuentaCobro,
  cotizacionesDelMes,
  cotizacionesDesdeConteos,
  cuentasCobroDelMes,
  cuentasCobroDesdeSumas,
  diferenciaPorMes,
  inicioDeMesBogota,
  mesBogota,
} from "./resumenDocumentos";

// Las cotizaciones y cuentas de cobro del mes en la pizarra del menú. Lo que
// importa: que abrir un documento no mueva ningún número, que cada uno se
// cuente en el mes en que nació (en hora de Colombia), y que el recuento de la
// madrugada llegue a lo mismo que los ajustes de cada cambio.

// 15 de octubre de 2026, mediodía en Colombia.
const OCTUBRE = Date.UTC(2026, 9, 15, 17);

const cotizacion = (cambios = {}) => ({ createdAt: OCTUBRE, status: "pendiente", ...cambios });

const cuenta = (cambios = {}) => ({
  creadaEn: OCTUBRE,
  status: "creada",
  emitida: true,
  total: 1000000,
  pagado: 200000,
  abonos: 100000,
  depositoPorCobrar: 50000,
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
  it("una pendiente cuenta en el total, no en cotizadas", () => {
    expect(aporteCotizacion(cotizacion())).toEqual({
      mes: "2026-10",
      valores: { total: 1, cotizadas: 0 },
    });
  });

  it("una pausada tampoco está cotizada: el cliente no tiene respuesta", () => {
    expect(aporteCotizacion(cotizacion({ status: "pausada" })).valores.cotizadas).toBe(0);
  });

  it("una emitida está cotizada", () => {
    expect(aporteCotizacion(cotizacion({ status: "creada" })).valores.cotizadas).toBe(1);
  });

  it("abierta, se cuenta en el estado que traía", () => {
    const abierta = cotizacion({ status: "enProceso", statusPrevio: "creada" });

    expect(aporteCotizacion(abierta).valores.cotizadas).toBe(1);
  });

  it("sin documento o sin fecha no aporta", () => {
    expect(aporteCotizacion(null)).toBeNull();
    expect(aporteCotizacion(cotizacion({ createdAt: undefined }))).toBeNull();
  });
});

describe("aporteCuentaCobro", () => {
  it("una emitida suma su total a cancelar, con el depósito por cobrar", () => {
    expect(aporteCuentaCobro(cuenta())).toEqual({
      mes: "2026-10",
      valores: { total: 1, monto: 750000, pagadas: 0, montoPagadas: 0 },
    });
  });

  it("una pagada suma también en pagadas", () => {
    expect(aporteCuentaCobro(cuenta({ status: "pagada" })).valores).toEqual({
      total: 1,
      monto: 750000,
      pagadas: 1,
      montoPagadas: 750000,
    });
  });

  it("un borrador no cuenta", () => {
    expect(aporteCuentaCobro(cuenta({ status: "pausada", emitida: undefined }))).toBeNull();
  });
});

describe("diferenciaPorMes", () => {
  it("abrir una cotización a mirarla no mueve nada", () => {
    const antes = aporteCotizacion(cotizacion());
    const despues = aporteCotizacion(
      cotizacion({ status: "enProceso", statusPrevio: "pendiente" }),
    );

    expect(diferenciaPorMes(antes, despues)).toEqual({});
  });

  it("cotizarla la pasa de por atender a cotizadas, sin tocar el total", () => {
    const antes = aporteCotizacion(cotizacion({ status: "enProceso", statusPrevio: "pendiente" }));
    const despues = aporteCotizacion(cotizacion({ status: "creada" }));

    expect(diferenciaPorMes(antes, despues)).toEqual({ "2026-10": { cotizadas: 1 } });
  });

  it("una nueva suma, una borrada resta", () => {
    const nueva = aporteCotizacion(cotizacion());

    expect(diferenciaPorMes(null, nueva)).toEqual({ "2026-10": { total: 1 } });
    expect(diferenciaPorMes(nueva, null)).toEqual({ "2026-10": { total: -1 } });
  });

  it("marcar pagada mueve la cuenta y su plata a pagadas", () => {
    const antes = aporteCuentaCobro(cuenta());
    const despues = aporteCuentaCobro(cuenta({ status: "pagada" }));

    expect(diferenciaPorMes(antes, despues)).toEqual({
      "2026-10": { pagadas: 1, montoPagadas: 750000 },
    });
  });

  it("emitir un borrador la suma entera", () => {
    const borrador = aporteCuentaCobro(cuenta({ status: "pausada", emitida: undefined }));
    const emitida = aporteCuentaCobro(cuenta());

    expect(diferenciaPorMes(borrador, emitida)).toEqual({
      "2026-10": { total: 1, monto: 750000 },
    });
  });
});

describe("el recuento llega a lo mismo que los ajustes", () => {
  it("cotizaciones: las cotizadas abiertas siguen siendo cotizadas", () => {
    expect(cotizacionesDesdeConteos({ todas: 12, cotizadas: 8, cotizadasAbiertas: 1 })).toEqual({
      total: 12,
      cotizadas: 9,
    });
  });

  it("cuentas: las mismas cifras que sumar cuenta por cuenta", () => {
    const documentos = [
      cuenta(),
      cuenta({ status: "pagada", total: 500000, pagado: 0, abonos: 0, depositoPorCobrar: 0 }),
      cuenta({
        status: "enProceso",
        statusPrevio: "pagada",
        total: 300000,
        pagado: 100000,
        abonos: 0,
        depositoPorCobrar: 0,
      }),
    ];
    const sumaDe = (lista) => ({
      cantidad: lista.length,
      total: lista.reduce((s, c) => s + c.total, 0),
      pagado: lista.reduce((s, c) => s + c.pagado, 0),
      abonos: lista.reduce((s, c) => s + c.abonos, 0),
      deposito: lista.reduce((s, c) => s + c.depositoPorCobrar, 0),
    });

    const recontado = cuentasCobroDesdeSumas({
      emitidas: sumaDe(documentos),
      pagadas: sumaDe([documentos[1]]),
      pagadasAbiertas: sumaDe([documentos[2]]),
    });

    const ajustado = documentos
      .map((documento) => aporteCuentaCobro(documento).valores)
      .reduce((suma, valores) => {
        Object.entries(valores).forEach(([clave, valor]) => {
          suma[clave] = (suma[clave] || 0) + valor;
        });
        return suma;
      }, {});

    expect(recontado).toEqual(ajustado);
    expect(recontado).toEqual({ total: 3, monto: 1450000, pagadas: 2, montoPagadas: 700000 });
  });
});

describe("lo que lee la app", () => {
  it("cotizaciones: por atender es lo que no se cotizó", () => {
    expect(cotizacionesDelMes({ "2026-10": { total: 12, cotizadas: 9 } }, "2026-10")).toEqual({
      total: 12,
      cotizadas: 9,
      porAtender: 3,
    });
  });

  it("cuentas: por cobrar es lo que no se pagó", () => {
    const porMes = { "2026-10": { total: 4, monto: 2750000, pagadas: 2, montoPagadas: 950000 } };

    expect(cuentasCobroDelMes(porMes, "2026-10")).toMatchObject({
      porCobrar: 2,
      montoPorCobrar: 1800000,
      pagadas: 2,
      montoPagadas: 950000,
    });
  });

  it("un mes que todavía no tiene nada es cero", () => {
    expect(cotizacionesDelMes({ "2026-10": { total: 12 } }, "2026-11")).toEqual({
      total: 0,
      cotizadas: 0,
      porAtender: 0,
    });
  });

  it("sin el dato en la pizarra, null: el detalle no está listo", () => {
    expect(cotizacionesDelMes(undefined, "2026-10")).toBeNull();
    expect(cuentasCobroDelMes(null, "2026-10")).toBeNull();
  });
});
