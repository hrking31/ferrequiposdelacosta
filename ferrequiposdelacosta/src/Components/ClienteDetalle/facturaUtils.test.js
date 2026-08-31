import {
  listaPagos,
  calcularFechaDevolucion,
  calcularVencimiento,
  diferenciaEnDias,
  obtenerFechaHoyBogota,
  obtenerFechaInicialEfectiva,
  obtenerAmpliaciones,
  obtenerHistorialVencimientos,
  calcularCantidadPendiente,
  equipoDevueltoCompleto,
  calcularAmpliacionEquipo,
  calcularAmpliacionFactura,
  sumarAbonos,
  separarExcedentePago,
  sumarPagosFactura,
  pagoInicialFactura,
  sumarPagosDeAgregados,
  calcularCuentaFactura,
  calcularSaldoAntesDeAmpliar,
  ordenarFacturasConSaldo,
  repartirEntreFacturas,
  calcularCuentaCliente,
  calcularEstadoFactura,
  calcularEstadoCliente,
  facturaCerrada,
  movimientosFactura,
  describirMovimientosFactura,
  calcularDepositoTotal,
  calcularDepositoDevuelto,
  depositoPendiente,
  obtenerGestiones,
  contarLlamadasSinRespuesta,
  calcularGestionFactura,
  gestionesDeSeguimiento,
  estadoEnSeguimiento,
  facturaEnSeguimiento,
  equiposQueVencieronHoy,
  etiquetaVencimiento,
} from "./facturaUtils";

// Pruebas del corazón de la lógica de facturas. Casi todas estas funciones
// aceptan la fecha de hoy (hoyIso) como parámetro: al inyectársela quedan
// deterministas y se prueban sin depender del reloj real.
//
// HOY fija la fecha de referencia de las pruebas que la necesitan.
const HOY = "2026-08-15";

// ── Fechas y días ────────────────────────────────────────────────────────

describe("diferenciaEnDias", () => {
  it("cuenta los días entre dos fechas (positivo si la segunda es posterior)", () => {
    expect(diferenciaEnDias("2026-08-01", "2026-08-04")).toBe(3);
  });

  it("es negativa si la segunda fecha es anterior", () => {
    expect(diferenciaEnDias("2026-08-04", "2026-08-01")).toBe(-3);
  });

  it("misma fecha son 0 días, y sin datos también", () => {
    expect(diferenciaEnDias("2026-08-01", "2026-08-01")).toBe(0);
    expect(diferenciaEnDias(null, "2026-08-01")).toBe(0);
  });
});

describe("calcularFechaDevolucion", () => {
  it("cuenta el día de despacho como el primer día (despacho + días - 1)", () => {
    expect(calcularFechaDevolucion("2026-08-23", 2)).toBe("2026-08-24");
    expect(calcularFechaDevolucion("2026-08-23", 1)).toBe("2026-08-23");
  });

  it("devuelve null si falta la fecha o los días", () => {
    expect(calcularFechaDevolucion(null, 2)).toBeNull();
    expect(calcularFechaDevolucion("2026-08-23", 0)).toBeNull();
  });
});

describe("calcularVencimiento", () => {
  it("suma los días completos, sin restar 1 (para ampliar un plazo vigente)", () => {
    expect(calcularVencimiento("2026-08-24", 3)).toBe("2026-08-27");
  });

  it("devuelve null si falta algún dato", () => {
    expect(calcularVencimiento(null, 3)).toBeNull();
  });
});

// ── Cantidades y devoluciones ──────────────────────────────────────────────

describe("calcularCantidadPendiente", () => {
  it("resta lo devuelto a la cantidad", () => {
    expect(calcularCantidadPendiente({ cantidad: 5, cantidadDevuelta: 2 })).toBe(3);
    expect(calcularCantidadPendiente({ cantidad: 5 })).toBe(5);
  });

  it("nunca es negativa y tolera datos ausentes", () => {
    expect(calcularCantidadPendiente({ cantidad: 2, cantidadDevuelta: 5 })).toBe(0);
    expect(calcularCantidadPendiente(undefined)).toBe(0);
  });
});

describe("equipoDevueltoCompleto", () => {
  it("es verdadero solo cuando no queda nada pendiente", () => {
    expect(equipoDevueltoCompleto({ cantidad: 5, cantidadDevuelta: 5 })).toBe(true);
    expect(equipoDevueltoCompleto({ cantidad: 5, cantidadDevuelta: 2 })).toBe(false);
  });
});

// ── Pagos y abonos ─────────────────────────────────────────────────────────

describe("listaPagos", () => {
  it("devuelve los pagos tal cual", () => {
    const pagos = [{ medio: "Nequi", monto: 100 }];
    expect(listaPagos({ pagos })).toEqual(pagos);
  });

  it("devuelve lista vacía cuando no hay pagos", () => {
    expect(listaPagos({})).toEqual([]);
    expect(listaPagos(null)).toEqual([]);
  });
});

describe("sumarAbonos", () => {
  it("suma los montos, tolerando textos y objetos incompletos", () => {
    expect(sumarAbonos([{ monto: 100 }, { monto: "50" }, {}])).toBe(150);
  });

  it("es 0 sin abonos", () => {
    expect(sumarAbonos([])).toBe(0);
    expect(sumarAbonos(null)).toBe(0);
  });
});

describe("separarExcedentePago", () => {
  it("no toca los pagos si no hay excedente", () => {
    const { excedente, medio } = separarExcedentePago(
      [{ medio: "Nequi", monto: 100 }],
      100,
    );
    expect(excedente).toBe(0);
    expect(medio).toBeNull();
  });

  it("recorta el sobrante empezando por el último medio cargado", () => {
    const resultado = separarExcedentePago(
      [
        { medio: "Bancolombia", monto: 60 },
        { medio: "Efectivo", monto: 60 },
      ],
      100,
    );
    expect(resultado.excedente).toBe(20);
    expect(resultado.medio).toBe("Efectivo");
    expect(resultado.pagos).toEqual([
      { medio: "Bancolombia", monto: 60 },
      { medio: "Efectivo", monto: 40 },
    ]);
  });
});

describe("sumarPagosFactura", () => {
  it("suma el pago del alta más el de los equipos agregados después", () => {
    const factura = {
      pagos: [{ medio: "Nequi", monto: 200 }],
      equipos: [
        { agregadoPosteriormente: true, pagos: [{ medio: "Efectivo", monto: 100 }] },
        { agregadoPosteriormente: false, pagos: [{ medio: "Efectivo", monto: 999 }] },
      ],
    };
    expect(sumarPagosFactura(factura)).toBe(300);
  });

  it("separa el pago del alta del de los equipos agregados", () => {
    const factura = {
      pagos: [{ medio: "Bancolombia", monto: 200 }],
      equipos: [
        { agregadoPosteriormente: true, pagos: [{ medio: "Nequi", monto: 100 }] },
      ],
    };
    expect(pagoInicialFactura(factura)).toBe(200);
    expect(sumarPagosDeAgregados(factura)).toBe(100);
    expect(sumarPagosFactura(factura)).toBe(300);
  });

  it("sin pagos cargados no suma nada", () => {
    expect(sumarPagosFactura({ equipos: [] })).toBe(0);
  });
});

// ── Cuenta de la factura y del cliente ─────────────────────────────────────

describe("calcularCuentaFactura", () => {
  it("sin ampliaciones, el total es el valorTotal y descuenta lo recibido", () => {
    const factura = {
      valorTotal: 1000,
      pagos: [{ medio: "Nequi", monto: 400 }],
      abonos: [{ monto: 100 }],
      equipos: [{ cantidad: 1, valor: 100 }],
    };
    const cuenta = calcularCuentaFactura(factura, HOY);
    expect(cuenta.total).toBe(1000);
    expect(cuenta.recibido).toBe(500);
    expect(cuenta.saldoPendiente).toBe(500);
  });

  it("cuenta el pago del alta y el del equipo agregado, cada uno una vez", () => {
    const factura = {
      valorTotal: 1000,
      pagos: [{ medio: "Bancolombia", monto: 500 }],
      equipos: [
        { cantidad: 1, valor: 100 },
        { agregadoPosteriormente: true, pagos: [{ medio: "Nequi", monto: 100 }] },
      ],
    };
    const cuenta = calcularCuentaFactura(factura, HOY);
    expect(cuenta.pagado).toBe(600);
    expect(cuenta.saldoPendiente).toBe(400);
  });

  // Los dos lados de la devolución anticipada, que es lo que pidió el dueño:
  // el camino es uno solo —restar del total— y el saldo saca la conclusión.
  //
  // 10 chazas, 5 días a $20.000 = $1.000.000 sin IVA. Devuelve 2 días antes:
  // el crédito es 10 x 2 x $20.000 = $400.000, y el total queda en $600.000.
  const conDevolucionAnticipada = {
    valorTotal: 1000000,
    aplicaIva: false,
    equipos: [
      {
        cantidad: 10,
        valor: 20000,
        dias: 5,
        cantidadDevuelta: 10,
        fechaDespacho: "2026-08-10",
        fechaVencimiento: "2026-08-14",
        fechaDevolucion: "2026-08-12",
      },
    ],
  };

  it("si el cliente NO había pagado, la devolución anticipada baja la factura", () => {
    const cuenta = calcularCuentaFactura(conDevolucionAnticipada, HOY);
    expect(cuenta.total).toBe(600000);
    expect(cuenta.saldoPendiente).toBe(600000);
    expect(cuenta.saldoAFavor).toBe(0);
  });

  it("si YA había pagado, la devolución anticipada le queda a favor", () => {
    const pagada = {
      ...conDevolucionAnticipada,
      pagos: [{ medio: "Nequi", monto: 1000000 }],
    };
    const cuenta = calcularCuentaFactura(pagada, HOY);
    expect(cuenta.total).toBe(600000);
    expect(cuenta.saldoPendiente).toBe(0);
    // Los $400.000 de los días que no usó: plata suya, que se le devuelve.
    expect(cuenta.saldoAFavor).toBe(400000);
  });
});

describe("calcularSaldoAntesDeAmpliar", () => {
  // El caso de la factura 1234, con sus números reales. Es lo que se le puede
  // reclamar hoy mientras tenga equipos afuera con plazo vigente: los días
  // recién concedidos todavía los está usando.
  //
  // El valor GUARDADO de la factura no lleva ni las ampliaciones ni los
  // créditos —los dos se calculan al vuelo—, así que sin restar lo devuelto
  // sin usar este número le cobraba 9 días que el equipo no estuvo afuera:
  // decía $208.700 donde el cliente debía $144.440.
  it("descuenta lo que devolvió sin usar, con su IVA", () => {
    const factura = {
      valorTotal: 2481200,
      aplicaIva: true,
      pagos: [{ monto: 1198500 }],
      abonos: [{ monto: 600000 }, { monto: 474000 }],
      equipos: [
        // 4 gatos a $1.500 el día, 10 días cobrados, devueltos el mismo día
        // que salieron: 9 días sin usar son $54.000 más $10.260 de IVA.
        {
          nombre: "GATOS METALICOS",
          cantidad: 4,
          dias: 10,
          valor: 1500,
          aplicaIva: true,
          fechaDespacho: "2026-08-21",
          fechaVencimiento: "2026-08-30",
          cantidadDevuelta: 4,
          fechaDevolucion: "2026-08-21",
        },
      ],
    };

    expect(calcularSaldoAntesDeAmpliar(factura, "2026-08-28")).toBe(144440);
  });
});

describe("calcularCuentaCliente", () => {
  it("el saldo del cliente es NETO: el sobrante de una tapa lo que falta en otra", () => {
    const facturas = [
      { valorTotal: 1000, pagos: [{ monto: 1000 }], equipos: [] },
      { valorTotal: 500, pagos: [], equipos: [] },
    ];
    const cuenta = calcularCuentaCliente(facturas, HOY);
    expect(cuenta.saldoPendiente).toBe(500);
  });
});

// ── Ampliaciones de plazo ──────────────────────────────────────────────────

describe("obtenerAmpliaciones", () => {
  it("usa la lista nueva de ampliaciones cuando existe", () => {
    const equipo = { ampliaciones: [{ dias: 2, descuento: 0 }] };
    expect(obtenerAmpliaciones(equipo)).toEqual([{ dias: 2, descuento: 0 }]);
  });

  it("reconstruye los tramos del formato viejo (lista de fechas)", () => {
    const equipo = {
      vencimientos: ["2026-08-10"],
      fechaVencimiento: "2026-08-15",
    };
    expect(obtenerAmpliaciones(equipo)).toEqual([
      {
        fechaAnterior: "2026-08-10",
        fechaNueva: "2026-08-15",
        dias: 5,
        descuento: 0,
      },
    ]);
  });

  it("sin datos de ampliación devuelve lista vacía", () => {
    expect(obtenerAmpliaciones({})).toEqual([]);
  });
});

describe("obtenerHistorialVencimientos", () => {
  it("lista las fechas por las que pasó el equipo", () => {
    const equipo = {
      ampliaciones: [
        { fechaAnterior: "2026-08-10", fechaNueva: "2026-08-15" },
        { fechaAnterior: "2026-08-15", fechaNueva: "2026-08-20" },
      ],
    };
    expect(obtenerHistorialVencimientos(equipo)).toEqual([
      "2026-08-10",
      "2026-08-15",
    ]);
  });
});

describe("calcularAmpliacionEquipo", () => {
  it("suma los días pactados a precio de lista, restando el descuento antes del IVA", () => {
    const equipo = {
      cantidad: 1,
      valor: 100,
      ampliaciones: [{ dias: 2, descuento: 50 }],
    };
    const ampliacion = calcularAmpliacionEquipo(equipo, HOY);
    expect(ampliacion.dias).toBe(2);
    expect(ampliacion.bruto).toBe(200);
    expect(ampliacion.neto).toBe(150);
  });

  it("cuenta los días corridos de una devolución indefinida (sin descuento)", () => {
    const equipo = {
      cantidad: 1,
      valor: 100,
      vencimientoIndefinido: true,
      fechaVencimiento: "2026-08-12",
    };
    const ampliacion = calcularAmpliacionEquipo(equipo, HOY); // HOY = 15 → 3 días
    expect(ampliacion.diasAbiertos).toBe(3);
    expect(ampliacion.neto).toBe(300);
  });

  // El caso que se estaba regalando: el cliente no avisó nada, simplemente no
  // devolvió. Antes esto daba 0 y los días solo se veían como aviso en
  // Seguimiento, sin entrar en ninguna cuenta.
  it("cuenta los días de un equipo vencido aunque nadie lo haya marcado indefinido", () => {
    const equipo = {
      cantidad: 1,
      valor: 100,
      fechaVencimiento: "2026-08-12",
    };
    const ampliacion = calcularAmpliacionEquipo(equipo, HOY);
    expect(ampliacion.diasAbiertos).toBe(3);
    expect(ampliacion.neto).toBe(300);
  });

  // El otro agujero: los días se calculaban al vuelo desde la marca de
  // indefinido, así que al devolver el equipo se borraban de la cuenta.
  it("congela los días en la fecha de devolución en vez de perderlos", () => {
    const equipo = {
      cantidad: 1,
      valor: 100,
      cantidadDevuelta: 1,
      fechaVencimiento: "2026-08-12",
      fechaDevolucion: "2026-08-14",
    };
    // Devolvió el 14, dos días después de vencer: se le cobran esos dos, no
    // los tres que habrían corrido hasta hoy.
    expect(calcularAmpliacionEquipo(equipo, HOY).diasAbiertos).toBe(2);
  });

  it("un equipo devuelto antes de la fecha no suma días vencidos", () => {
    const equipo = {
      cantidad: 1,
      valor: 100,
      cantidadDevuelta: 1,
      fechaVencimiento: "2026-08-12",
      fechaDevolucion: "2026-08-10",
    };
    expect(calcularAmpliacionEquipo(equipo, HOY).diasAbiertos).toBe(0);
  });

  it("un equipo que todavía no vence no suma días", () => {
    const equipo = { cantidad: 1, valor: 100, fechaVencimiento: "2026-08-20" };
    expect(calcularAmpliacionEquipo(equipo, HOY).diasAbiertos).toBe(0);
  });

  // El caso de la factura 1573: se amplió, la ampliación también se venció y
  // pasaron días sin registrar nada. Se cobran los pactados MÁS los corridos.
  it("suma los días pactados y los corridos después de la ampliación", () => {
    const equipo = {
      cantidad: 1,
      valor: 100,
      ampliaciones: [{ dias: 2, descuento: 0 }],
      fechaVencimiento: "2026-08-13",
    };
    const ampliacion = calcularAmpliacionEquipo(equipo, HOY);
    expect(ampliacion.dias).toBe(4); // 2 pactados + 2 corridos
    expect(ampliacion.neto).toBe(400);
  });
});

// El espejo de los días vencidos: si el equipo vuelve ANTES de la fecha, los
// días que el cliente pagó y no usó no se le cobran.
describe("calcularAmpliacionEquipo — devolución anticipada", () => {
  // 5 días desde el 10 (el de despacho cuenta como día 1) vencen el 14.
  // Devuelve el 12: usó 3 —el día de la devolución SÍ se cobra— y le quedan
  // 2 sin usar.
  const rana = {
    cantidad: 1,
    valor: 100,
    dias: 5,
    cantidadDevuelta: 1,
    fechaDespacho: "2026-08-10",
    fechaVencimiento: "2026-08-14",
    fechaDevolucion: "2026-08-12",
  };

  it("acredita los días que devolvió sin usar", () => {
    const ampliacion = calcularAmpliacionEquipo(rana, HOY);
    expect(ampliacion.diasSinUsar).toBe(2);
    expect(ampliacion.creditoSinUsar).toBe(200);
  });

  it("el crédito resta del neto, no suma", () => {
    expect(calcularAmpliacionEquipo(rana, HOY).neto).toBe(-200);
  });

  it("el día de la devolución se cobra: no cuenta como día sin usar", () => {
    // Devuelve justo el día que vence: no usó de más ni de menos.
    const alDia = { ...rana, fechaDevolucion: "2026-08-14" };
    const ampliacion = calcularAmpliacionEquipo(alDia, HOY);
    expect(ampliacion.diasSinUsar).toBe(0);
    expect(ampliacion.diasAbiertos).toBe(0);
    expect(ampliacion.neto).toBe(0);
  });

  it("mientras el equipo siga afuera no acredita nada", () => {
    // Sin devolver y con fecha futura: no hay días vencidos, pero tampoco
    // días sin usar. Todavía puede devolverlo tarde.
    const afuera = {
      cantidad: 1,
      valor: 100,
      dias: 5,
      fechaVencimiento: "2026-08-20",
    };
    const ampliacion = calcularAmpliacionEquipo(afuera, HOY);
    expect(ampliacion.diasSinUsar).toBe(0);
    expect(ampliacion.neto).toBe(0);
  });

  it("descuenta también el IVA de esos días", () => {
    // 5 días a $100, devuelve 2 antes: el crédito de $200 baja el subtotal
    // y su IVA con él.
    const factura = { aplicaIva: true, equipos: [rana] };
    const ampliacion = calcularAmpliacionFactura(factura, HOY);
    expect(ampliacion.neto).toBe(-200);
    expect(ampliacion.iva).toBeCloseTo(-38, 2);
    expect(ampliacion.total).toBeCloseTo(-238, 2);
    // Con `hay: total > 0` este crédito se ignoraba y la factura seguía
    // cobrando los días que el equipo no estuvo afuera.
    expect(ampliacion.hay).toBe(true);
  });

  it("en una devolución parcial acredita solo lo que volvió", () => {
    // La app parte la línea en dos al devolver parcial: 4 unidades cerradas
    // que volvieron antes, y 6 que el cliente todavía tiene.
    const factura = {
      aplicaIva: false,
      equipos: [
        {
          cantidad: 4,
          valor: 100,
          dias: 5,
          cantidadDevuelta: 4,
          fechaVencimiento: "2026-08-14",
          fechaDevolucion: "2026-08-12",
        },
        {
          cantidad: 6,
          valor: 100,
          dias: 5,
          fechaVencimiento: "2026-08-20",
        },
      ],
    };
    const ampliacion = calcularAmpliacionFactura(factura, HOY);
    // Solo las 4 que volvieron: 2 días x 4 x $100.
    expect(ampliacion.diasSinUsar).toBe(2);
    expect(ampliacion.creditoSinUsar).toBe(800);
    expect(ampliacion.neto).toBe(-800);
  });

  it("el crédito no puede pasarse de los días que se cobraron", () => {
    // Devolución con fecha absurda, muy anterior al despacho: el crédito se
    // topa en los 5 días cobrados y el equipo no queda en negativo.
    const imposible = { ...rana, fechaDevolucion: "2026-07-01" };
    const ampliacion = calcularAmpliacionEquipo(imposible, HOY);
    expect(ampliacion.diasSinUsar).toBe(5);
    expect(ampliacion.creditoSinUsar).toBe(500);
  });
});

describe("calcularAmpliacionFactura", () => {
  it("agrega IVA a la ampliación si la factura lleva IVA", () => {
    const factura = {
      aplicaIva: true,
      equipos: [{ cantidad: 1, valor: 100, ampliaciones: [{ dias: 2, descuento: 0 }] }],
    };
    const ampliacion = calcularAmpliacionFactura(factura, HOY);
    expect(ampliacion.neto).toBe(200);
    expect(ampliacion.iva).toBeCloseTo(38);
    expect(ampliacion.total).toBeCloseTo(238);
    expect(ampliacion.hay).toBe(true);
  });

  it("sin IVA, el total de la ampliación es el neto", () => {
    const factura = {
      aplicaIva: false,
      equipos: [{ cantidad: 1, valor: 100, ampliaciones: [{ dias: 2, descuento: 0 }] }],
    };
    const ampliacion = calcularAmpliacionFactura(factura, HOY);
    expect(ampliacion.iva).toBe(0);
    expect(ampliacion.total).toBe(200);
  });
});

// ── Reparto de un abono entre varias facturas ──────────────────────────────

describe("ordenarFacturasConSaldo", () => {
  it("deja primero la factura que más debe y descarta las saldadas", () => {
    const facturas = [
      { id: "chica", valorTotal: 300, pagos: [], equipos: [] },
      { id: "saldada", valorTotal: 500, pagos: [{ monto: 500 }], equipos: [] },
      { id: "grande", valorTotal: 500, pagos: [], equipos: [] },
    ];
    const ordenadas = ordenarFacturasConSaldo(facturas, HOY);
    expect(ordenadas.map((x) => x.factura.id)).toEqual(["grande", "chica"]);
  });
});

describe("repartirEntreFacturas", () => {
  it("le da a cada factura lo que le falta y pasa el resto a la siguiente", () => {
    const facturasConSaldo = [
      { factura: { id: "a" }, cuenta: { saldoPendiente: 300 } },
      { factura: { id: "b" }, cuenta: { saldoPendiente: 200 } },
    ];
    const reparto = repartirEntreFacturas(facturasConSaldo, 400);
    expect(reparto[0].aplicado).toBe(300);
    expect(reparto[1].aplicado).toBe(100);
  });

  it("la última factura se lleva todo el sobrante (queda como saldo a favor)", () => {
    const facturasConSaldo = [
      { factura: { id: "a" }, cuenta: { saldoPendiente: 300 } },
      { factura: { id: "b" }, cuenta: { saldoPendiente: 200 } },
    ];
    const reparto = repartirEntreFacturas(facturasConSaldo, 600);
    expect(reparto[0].aplicado).toBe(300);
    expect(reparto[1].aplicado).toBe(300);
  });
});

// ── El estado de la factura (se calcula, no se guarda) ─────────────────────

describe("calcularEstadoFactura", () => {
  it("pendiente: sin equipos todavía", () => {
    expect(calcularEstadoFactura({ equipos: [] }, HOY)).toBe("pendiente");
  });

  it("pendiente: los equipos aún no salieron", () => {
    const factura = { equipos: [{ cantidad: 1, fechaDespacho: "2026-08-20" }] };
    expect(calcularEstadoFactura(factura, HOY)).toBe("pendiente");
  });

  it("activa: equipos despachados y dentro de fecha", () => {
    const factura = {
      equipos: [
        { cantidad: 1, fechaDespacho: "2026-08-10", fechaVencimiento: "2026-08-20" },
      ],
    };
    expect(calcularEstadoFactura(factura, HOY)).toBe("activa");
  });

  it("vencida: se pasó la fecha con equipos sin devolver", () => {
    const factura = {
      equipos: [
        { cantidad: 1, fechaDespacho: "2026-08-10", fechaVencimiento: "2026-08-12" },
      ],
    };
    expect(calcularEstadoFactura(factura, HOY)).toBe("vencida");
  });

  it("cobro: devolvió todo pero queda saldo", () => {
    const factura = {
      valorTotal: 1000,
      pagos: [],
      equipos: [{ cantidad: 1, cantidadDevuelta: 1, valor: 100 }],
    };
    expect(calcularEstadoFactura(factura, HOY)).toBe("cobro");
  });

  it("finalizada: devolvió todo y no debe nada", () => {
    const factura = {
      valorTotal: 1000,
      pagos: [{ monto: 1000 }],
      equipos: [{ cantidad: 1, cantidadDevuelta: 1, valor: 100 }],
    };
    expect(calcularEstadoFactura(factura, HOY)).toBe("finalizada");
  });
});

// Es el único pedazo del estado que se guarda en Firestore, y de él dependen
// las consultas de las tres pantallas: si esto se equivoca, una factura
// desaparece de la vista o una cerrada se sigue arrastrando.
describe("movimientosFactura", () => {
  it("sin nada encima, hayAlgo es falso", () => {
    const factura = { equipos: [{ cantidad: 1, valor: 100 }] };
    expect(movimientosFactura(factura)).toEqual({
      cantidadAbonos: 0,
      cantidadAgregados: 0,
      equiposConHistoria: [],
      depositoResuelto: false,
      hayAlgo: false,
    });
  });

  it("detecta abonos, equipos agregados, ampliaciones y devoluciones", () => {
    const conAmpliacion = { ampliaciones: [{ fechaAnterior: "2026-08-01", fechaNueva: "2026-08-03", dias: 2, descuento: 0 }] };
    const conDevolucion = { cantidad: 10, cantidadDevuelta: 4 };
    const factura = {
      abonos: [{ monto: 100 }],
      equipos: [
        { agregadoPosteriormente: true },
        conAmpliacion,
        conDevolucion,
        { cantidad: 1 },
      ],
    };
    const movimientos = movimientosFactura(factura);
    expect(movimientos.cantidadAbonos).toBe(1);
    expect(movimientos.cantidadAgregados).toBe(1);
    expect(movimientos.equiposConHistoria).toEqual([conAmpliacion, conDevolucion]);
    expect(movimientos.hayAlgo).toBe(true);
  });

  it("detecta el depósito ya resuelto", () => {
    const factura = { equipos: [], depositoResuelto: { retenido: 0 } };
    expect(movimientosFactura(factura).depositoResuelto).toBe(true);
    expect(movimientosFactura(factura).hayAlgo).toBe(true);
  });

  it("sin factura no revienta", () => {
    expect(movimientosFactura(undefined).hayAlgo).toBe(false);
  });
});

describe("describirMovimientosFactura", () => {
  it("sin nada, no hay nada que avisar", () => {
    expect(describirMovimientosFactura({ equipos: [] })).toEqual([]);
  });

  it("junta cada cosa en su propia frase, en singular si hay una sola", () => {
    const factura = {
      abonos: [{ monto: 100 }],
      equipos: [
        { agregadoPosteriormente: true },
        { agregadoPosteriormente: true },
        { cantidad: 10, cantidadDevuelta: 4 },
      ],
      depositoResuelto: { retenido: 0 },
    };
    expect(describirMovimientosFactura(factura)).toEqual([
      "1 abono",
      "2 equipos agregados",
      "1 equipo con ampliación o devolución",
      "el depósito ya resuelto",
    ]);
  });
});

describe("facturaCerrada", () => {
  it("cerrada: devolvió todo y no debe nada", () => {
    const factura = {
      valorTotal: 1000,
      pagos: [{ monto: 1000 }],
      equipos: [{ cantidad: 1, cantidadDevuelta: 1, valor: 100 }],
    };
    expect(facturaCerrada(factura, HOY)).toBe(true);
  });

  it("abierta si devolvió todo pero queda saldo", () => {
    const factura = {
      valorTotal: 1000,
      pagos: [],
      equipos: [{ cantidad: 1, cantidadDevuelta: 1, valor: 100 }],
    };
    expect(facturaCerrada(factura, HOY)).toBe(false);
  });

  it("abierta si todavía tiene equipos afuera", () => {
    const factura = {
      valorTotal: 1000,
      pagos: [{ monto: 1000 }],
      equipos: [
        {
          cantidad: 1,
          valor: 100,
          fechaDespacho: "2026-08-10",
          fechaVencimiento: "2026-08-20",
        },
      ],
    };
    expect(facturaCerrada(factura, HOY)).toBe(false);
  });

  // Esa plata es del cliente: mientras no se le devuelva, la factura no
  // terminó. Antes esto caía en "finalizada" y la deuda con el cliente
  // quedaba tapada.
  it("abierta si el cliente pagó de más, aunque no deba nada", () => {
    const factura = {
      valorTotal: 1000,
      pagos: [{ monto: 1500 }],
      equipos: [{ cantidad: 1, cantidadDevuelta: 1, valor: 100 }],
    };
    expect(calcularEstadoFactura(factura, HOY)).toBe("cobro");
    expect(facturaCerrada(factura, HOY)).toBe(false);
  });

  it("abierta mientras no se resuelva el depósito", () => {
    const factura = {
      valorTotal: 1000,
      deposito: 200,
      pagos: [{ monto: 1000 }],
      equipos: [{ cantidad: 1, cantidadDevuelta: 1, valor: 100 }],
    };
    expect(calcularEstadoFactura(factura, HOY)).toBe("cobro");
    expect(facturaCerrada(factura, HOY)).toBe(false);
  });

  it("una factura sin datos no está cerrada", () => {
    expect(facturaCerrada({}, HOY)).toBe(false);
  });
});

// El depósito se cobra con el alquiler pero no es de la empresa: es una
// garantía. Al devolverlo deja de contar como cargo y el total baja.
describe("el depósito", () => {
  // Devolvió todo, pagó los 1000 (800 de alquiler + 200 de depósito) y el
  // equipo volvió bien: se le devuelven los 200.
  const conDeposito = {
    valorTotal: 1000,
    deposito: 200,
    pagos: [{ monto: 1000 }],
    equipos: [{ cantidad: 1, cantidadDevuelta: 1, valor: 100 }],
  };

  it("suma el de la factura y el de los equipos agregados después", () => {
    expect(
      calcularDepositoTotal({
        deposito: 200,
        equipos: [
          { deposito: 50, agregadoPosteriormente: true },
          { deposito: 30, agregadoPosteriormente: true },
          { deposito: 999 },
        ],
      }),
    ).toBe(280);
  });

  it("no se devuelve nada mientras no se resuelva", () => {
    expect(calcularDepositoDevuelto(conDeposito)).toBe(0);
    expect(calcularCuentaFactura(conDeposito, HOY).total).toBe(1000);
    expect(depositoPendiente(conDeposito)).toBe(true);
  });

  it("al devolverlo entero, el total baja y queda saldo a favor", () => {
    const factura = { ...conDeposito, depositoResuelto: { retenido: 0 } };
    const cuenta = calcularCuentaFactura(factura, HOY);

    expect(cuenta.total).toBe(800);
    expect(cuenta.saldoAFavor).toBe(200);
    // Hay que entregarle esos 200: la factura todavía no termina.
    expect(calcularEstadoFactura(factura, HOY)).toBe("cobro");
  });

  it("lo retenido por daños sigue siendo ingreso", () => {
    const factura = {
      ...conDeposito,
      depositoResuelto: { retenido: 50, motivo: "Rayadura" },
    };
    const cuenta = calcularCuentaFactura(factura, HOY);

    expect(cuenta.depositoDevuelto).toBe(150);
    expect(cuenta.total).toBe(850);
    expect(cuenta.saldoAFavor).toBe(150);
  });

  it("si se retiene todo, la factura termina sin devolver nada", () => {
    const factura = {
      ...conDeposito,
      depositoResuelto: { retenido: 200, motivo: "Equipo perdido" },
    };
    const cuenta = calcularCuentaFactura(factura, HOY);

    expect(cuenta.depositoDevuelto).toBe(0);
    expect(cuenta.total).toBe(1000);
    expect(calcularEstadoFactura(factura, HOY)).toBe("finalizada");
  });

  // El caso del día a día: el cliente debe y el depósito se netea contra lo
  // que debe, así paga solo la diferencia.
  it("se netea contra lo que el cliente debe", () => {
    const factura = {
      valorTotal: 1000,
      deposito: 200,
      pagos: [{ monto: 600 }],
      equipos: [{ cantidad: 1, cantidadDevuelta: 1, valor: 100 }],
      depositoResuelto: { retenido: 0 },
    };
    // Debía 400; con los 200 del depósito a favor, paga 200.
    expect(calcularCuentaFactura(factura, HOY).saldoPendiente).toBe(200);
  });

  it("la entrega de la plata cierra la factura", () => {
    const factura = {
      ...conDeposito,
      depositoResuelto: { retenido: 0 },
      entregas: [{ fecha: "2026-08-13", medio: "Nequi", monto: 200 }],
    };
    const cuenta = calcularCuentaFactura(factura, HOY);

    expect(cuenta.saldoAFavor).toBe(0);
    expect(cuenta.saldoPendiente).toBe(0);
    expect(calcularEstadoFactura(factura, HOY)).toBe("finalizada");
    expect(facturaCerrada(factura, HOY)).toBe(true);
  });

  it("una factura sin depósito no queda pendiente por eso", () => {
    expect(depositoPendiente({ valorTotal: 1000 })).toBe(false);
  });
});

describe("calcularEstadoCliente", () => {
  it("sin facturas, el cliente está inactivo", () => {
    expect(calcularEstadoCliente([], HOY)).toBe("inactivo");
  });

  it("gana el estado más urgente entre sus facturas", () => {
    const facturas = [
      // activa
      { equipos: [{ cantidad: 1, fechaDespacho: "2026-08-10", fechaVencimiento: "2026-08-20" }] },
      // vencida
      { equipos: [{ cantidad: 1, fechaDespacho: "2026-08-10", fechaVencimiento: "2026-08-12" }] },
    ];
    expect(calcularEstadoCliente(facturas, HOY)).toBe("vencida");
  });
});

// ── Gestión (lo que se hizo para destrabar la factura) ─────────────────────

describe("obtenerGestiones", () => {
  it("filtra los registros vacíos", () => {
    expect(obtenerGestiones({ gestiones: [{ tipo: "llamada" }, null] })).toEqual([
      { tipo: "llamada" },
    ]);
  });
});

describe("contarLlamadasSinRespuesta", () => {
  it("cuenta solo las llamadas no contestadas", () => {
    const factura = {
      gestiones: [
        { tipo: "llamada", contesto: false },
        { tipo: "llamada", contesto: true },
        { tipo: "llamada", contesto: false },
      ],
    };
    expect(contarLlamadasSinRespuesta(factura)).toBe(2);
  });
});

describe("calcularGestionFactura", () => {
  it("en cobro manda 'cobro' por encima de todo", () => {
    expect(calcularGestionFactura({ gestiones: [] }, "cobro")).toBe("cobro");
  });

  it("una llamada sin respuesta marca 'sinRespuesta'", () => {
    const factura = { gestiones: [{ tipo: "llamada", contesto: false }] };
    expect(calcularGestionFactura(factura, "vencida")).toBe("sinRespuesta");
  });

  it("toma la última gestión real (una prórroga)", () => {
    const factura = {
      gestiones: [
        { tipo: "llamada", contesto: true },
        { tipo: "prorroga", dias: 5 },
      ],
    };
    expect(calcularGestionFactura(factura, "vencida")).toBe("prorroga");
  });

  it("una llamada atendida sola no es gestión: queda 'sinGestionar'", () => {
    const factura = { gestiones: [{ tipo: "llamada", contesto: true }] };
    expect(calcularGestionFactura(factura, "vencida")).toBe("sinGestionar");
  });

  // Devolver equipos antes de que la factura se venza se registra desde
  // Detalle Cliente y no es gestión de cobranza: nadie hizo nada para
  // destrabar un vencimiento que todavía no había pasado. Va marcado con
  // `enSeguimiento: false` y no debe fijar el chip, o la factura entraría a
  // Seguimiento ya rotulada como trabajada.
  it("una devolución hecha con la factura al día no fija el chip", () => {
    const factura = {
      gestiones: [{ tipo: "parcial", unidades: 3, enSeguimiento: false }],
    };
    expect(calcularGestionFactura(factura, "vencida")).toBe("sinGestionar");
  });

  it("la saltea y se queda con la devolución que sí fue de cobranza", () => {
    const factura = {
      gestiones: [
        { tipo: "parcial", unidades: 2, enSeguimiento: false },
        { tipo: "parcial", unidades: 1 },
      ],
    };
    expect(calcularGestionFactura(factura, "vencida")).toBe("parcial");
  });

  it("una llamada posterior manda sobre la devolución que no contaba", () => {
    const factura = {
      gestiones: [
        { tipo: "parcial", unidades: 3, enSeguimiento: false },
        { tipo: "llamada", contesto: false },
      ],
    };
    expect(calcularGestionFactura(factura, "vencida")).toBe("sinRespuesta");
  });

  // Las anotadas antes de que existiera la marca no la traen: sin ella cuentan
  // como siempre.
  it("sin la marca, la devolución cuenta como antes", () => {
    const factura = { gestiones: [{ tipo: "parcial", unidades: 3 }] };
    expect(calcularGestionFactura(factura, "vencida")).toBe("parcial");
  });

  it("en cobro el chip manda igual, aunque lo anotado no cuente", () => {
    const factura = {
      gestiones: [{ tipo: "parcial", unidades: 3, enSeguimiento: false }],
    };
    expect(calcularGestionFactura(factura, "cobro")).toBe("cobro");
  });
});

describe("gestionesDeSeguimiento", () => {
  // Lo anotado con la factura al día ya no se escribe, pero quedó guardado
  // entre el 2026-08-24 y el 2026-08-25 con `enSeguimiento: false`. No tiene
  // que aparecer en la línea de tiempo de Seguimiento: esa devolución no fue
  // cobranza, y vive en el equipo de la factura.
  it("deja fuera lo anotado con la factura al día", () => {
    const factura = {
      gestiones: [
        { tipo: "llamada", contesto: false },
        { tipo: "parcial", unidades: 4, enSeguimiento: false },
      ],
    };
    expect(gestionesDeSeguimiento(factura)).toEqual([{ tipo: "llamada", contesto: false }]);
  });

  it("las anotadas sin la marca se quedan", () => {
    const factura = { gestiones: [{ tipo: "parcial", unidades: 3 }] };
    expect(gestionesDeSeguimiento(factura)).toHaveLength(1);
  });

  it("una factura sin gestiones da una lista vacía", () => {
    expect(gestionesDeSeguimiento({})).toEqual([]);
  });
});

describe("estadoEnSeguimiento", () => {
  // Es la que decide si el botón de devolución de la ficha del cliente sigue
  // disponible: vencida o en cobro, esa devolución se registra en Seguimiento.
  it("solo vencida y cobro", () => {
    expect(estadoEnSeguimiento("vencida")).toBe(true);
    expect(estadoEnSeguimiento("cobro")).toBe(true);
    expect(estadoEnSeguimiento("activa")).toBe(false);
    expect(estadoEnSeguimiento("pendiente")).toBe(false);
    expect(estadoEnSeguimiento("finalizada")).toBe(false);
  });
});

describe("facturaEnSeguimiento", () => {
  it("entran las vencidas y las de cobro; no las activas", () => {
    const vencida = {
      equipos: [{ cantidad: 1, fechaDespacho: "2026-08-10", fechaVencimiento: "2026-08-12" }],
    };
    const activa = {
      equipos: [{ cantidad: 1, fechaDespacho: "2026-08-10", fechaVencimiento: "2026-08-20" }],
    };
    expect(facturaEnSeguimiento(vencida, HOY)).toBe(true);
    expect(facturaEnSeguimiento(activa, HOY)).toBe(false);
  });
});

describe("etiquetaVencimiento", () => {
  it("usa ordinales en español y cae a Nº para índices altos", () => {
    expect(etiquetaVencimiento(0)).toBe("1er vencimiento");
    expect(etiquetaVencimiento(1)).toBe("2do vencimiento");
    expect(etiquetaVencimiento(10)).toBe("11º vencimiento");
  });
});

// ── Funciones que dependen del reloj (formato / regla de las 3pm) ──────────

describe("obtenerFechaHoyBogota", () => {
  it("devuelve la fecha en formato AAAA-MM-DD", () => {
    expect(obtenerFechaHoyBogota()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("obtenerFechaInicialEfectiva (regla de las 3pm)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("antes de las 3pm en Colombia, el alquiler arranca el mismo día", () => {
    vi.useFakeTimers();
    // 18:00 UTC = 13:00 en Bogotá (UTC-5), antes de las 3pm.
    vi.setSystemTime(new Date("2026-08-15T18:00:00Z"));
    expect(obtenerFechaInicialEfectiva()).toBe("2026-08-15");
  });

  it("desde las 3pm en Colombia, arranca al día siguiente", () => {
    vi.useFakeTimers();
    // 21:00 UTC = 16:00 en Bogotá (UTC-5), pasadas las 3pm.
    vi.setSystemTime(new Date("2026-08-15T21:00:00Z"));
    expect(obtenerFechaInicialEfectiva()).toBe("2026-08-16");
  });
});

// ── "Entró hoy en seguimiento" ─────────────────────────────────────────────
//
// El aviso nocturno (recalcularTotalesPanel en functions/index.js) tiene que
// distinguir las facturas que ACABAN de entrar en seguimiento de las que ya
// estaban. No guarda ningún dato para eso: pregunta si la factura está en
// seguimiento HOY y no lo estaba AYER, aprovechando que estas funciones reciben
// la fecha como parámetro.
//
// Estas pruebas fijan ese patrón. Si se rompiera, el aviso avisaría todas las
// noches por las mismas facturas viejas, y en dos días nadie lo miraría.
describe("facturaEnSeguimiento — el patrón de \"entró hoy\"", () => {
  const facturaVencidaEl = (fechaVencimiento) => ({
    valorTotal: 300000,
    pagos: [],
    abonos: [],
    equipos: [
      {
        nombre: "ANDAMIO",
        cantidad: 1,
        dias: 3,
        valor: 100000,
        fechaDespacho: "2026-08-10",
        fechaVencimiento,
      },
    ],
  });

  const entroEseDia = (factura, hoy, ayer) =>
    facturaEnSeguimiento(factura, hoy) && !facturaEnSeguimiento(factura, ayer);

  it("la víspera del vencimiento todavía está tranquila", () => {
    const factura = facturaVencidaEl("2026-08-15");

    expect(facturaEnSeguimiento(factura, "2026-08-14")).toBe(false);
  });

  it("entra el MISMO día del vencimiento, y ahí hay que avisar", () => {
    // Un equipo cuenta como vencido cuando su fecha de devolución ya llegó
    // (fecha <= hoy), no al día siguiente: ese día tenía que volver.
    const factura = facturaVencidaEl("2026-08-15");

    expect(entroEseDia(factura, "2026-08-15", "2026-08-14")).toBe(true);
  });

  it("al día siguiente ya no es nueva: no se vuelve a avisar", () => {
    const factura = facturaVencidaEl("2026-08-15");

    // Sigue en seguimiento, pero ayer también estaba.
    expect(facturaEnSeguimiento(factura, "2026-08-16")).toBe(true);
    expect(entroEseDia(factura, "2026-08-16", "2026-08-15")).toBe(false);
  });

  it("una factura al día no entra ningún día", () => {
    const factura = facturaVencidaEl("2026-08-30");

    expect(entroEseDia(factura, "2026-08-16", "2026-08-15")).toBe(false);
  });
});

// El caso real que lo motivó: la factura 1234, el fin de semana del
// 2026-08-29. El sábado venció el equipo inicial y llegó el aviso; el domingo
// venció el agregado y no llegó nada, porque la factura ya estaba en
// seguimiento desde el sábado y no volvía a "entrar" nunca más.
describe("equiposQueVencieronHoy", () => {
  const facturaDeDosEquipos = () => ({
    valorTotal: 300000,
    pagos: [],
    abonos: [],
    equipos: [
      {
        nombre: "RANA",
        cantidad: 2,
        valor: 100000,
        fechaDespacho: "2026-08-20",
        fechaVencimiento: "2026-08-29",
      },
      {
        nombre: "ANDAMIO",
        cantidad: 1,
        valor: 50000,
        fechaDespacho: "2026-08-25",
        fechaVencimiento: "2026-08-30",
        agregadoPosteriormente: true,
      },
    ],
  });

  it("el sábado detecta el equipo inicial", () => {
    const vencidos = equiposQueVencieronHoy(
      facturaDeDosEquipos(),
      "2026-08-29",
      "2026-08-28",
    );

    expect(vencidos).toHaveLength(1);
    expect(vencidos[0].nombre).toBe("RANA");
  });

  it("el domingo detecta el agregado, aunque la factura ya estaba vencida", () => {
    const factura = facturaDeDosEquipos();

    // La factura no "entra" en seguimiento: ya estaba adentro desde el sábado.
    // Eso es justo lo que dejaba mudo al aviso viejo.
    expect(facturaEnSeguimiento(factura, "2026-08-29")).toBe(true);
    expect(facturaEnSeguimiento(factura, "2026-08-30")).toBe(true);

    const vencidos = equiposQueVencieronHoy(
      factura,
      "2026-08-30",
      "2026-08-29",
    );

    expect(vencidos).toHaveLength(1);
    expect(vencidos[0].nombre).toBe("ANDAMIO");
  });

  it("el lunes ya no repite ninguno de los dos", () => {
    const vencidos = equiposQueVencieronHoy(
      facturaDeDosEquipos(),
      "2026-08-31",
      "2026-08-30",
    );

    expect(vencidos).toEqual([]);
  });

  it("el equipo que sigue en plazo no aparece", () => {
    const vencidos = equiposQueVencieronHoy(
      facturaDeDosEquipos(),
      "2026-08-29",
      "2026-08-28",
    );

    expect(vencidos.map((equipo) => equipo.nombre)).not.toContain("ANDAMIO");
  });

  it("el que ya se devolvió no se reclama", () => {
    const factura = facturaDeDosEquipos();
    factura.equipos[0].cantidadDevuelta = 2;

    const vencidos = equiposQueVencieronHoy(
      factura,
      "2026-08-29",
      "2026-08-28",
    );

    expect(vencidos).toEqual([]);
  });

  it("devuelto a medias: lo que falta sigue contando", () => {
    const factura = facturaDeDosEquipos();
    factura.equipos[0].cantidadDevuelta = 1;

    const vencidos = equiposQueVencieronHoy(
      factura,
      "2026-08-29",
      "2026-08-28",
    );

    expect(vencidos).toHaveLength(1);
    expect(calcularCantidadPendiente(vencidos[0])).toBe(1);
  });

  it("el de entrega indefinida no avisa un día sí y otro también", () => {
    // Cuenta como vencido siempre, así que nunca cambia de ayer a hoy: si no
    // se filtrara, mandaría el mismo aviso cada madrugada para siempre.
    const factura = {
      equipos: [{ nombre: "MEZCLADORA", cantidad: 1, vencimientoIndefinido: true }],
    };

    expect(equiposQueVencieronHoy(factura, "2026-08-31", "2026-08-30")).toEqual([]);
  });

  it("una factura sin equipos no rompe nada", () => {
    expect(equiposQueVencieronHoy({}, "2026-08-31", "2026-08-30")).toEqual([]);
    expect(equiposQueVencieronHoy({ equipos: [] }, "2026-08-31", "2026-08-30")).toEqual([]);
  });
});
