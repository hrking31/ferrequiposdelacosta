import {
  normalizarPagos,
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
  calcularEstadoCuenta,
  sumarPagosFactura,
  pagosDelAlta,
  pagoInicialFactura,
  sumarPagosDeAgregados,
  calcularCuentaFactura,
  calcularSaldoConAbonos,
  ordenarFacturasConSaldo,
  repartirEntreFacturas,
  calcularCuentaCliente,
  calcularEstadoFactura,
  calcularEstadoCliente,
  facturaCerrada,
  calcularDepositoTotal,
  calcularDepositoDevuelto,
  depositoPendiente,
  obtenerGestiones,
  contarLlamadasSinRespuesta,
  calcularGestionFactura,
  facturaEnSeguimiento,
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

describe("normalizarPagos", () => {
  it("deja la lista tal cual si ya es una lista con datos", () => {
    const pagos = [{ medio: "Nequi", monto: 100 }];
    expect(normalizarPagos(pagos, "Bancolombia", 999)).toEqual(pagos);
  });

  it("convierte el formato viejo (un solo medio) a lista", () => {
    expect(normalizarPagos(null, "Bancolombia", 500)).toEqual([
      { medio: "Bancolombia", monto: 500 },
    ]);
  });

  it("devuelve lista vacía si no hay nada", () => {
    expect(normalizarPagos(null, null, null)).toEqual([]);
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

  it("entiende el formato viejo (modoPago + montoPagado)", () => {
    const factura = { modoPago: "Bancolombia", montoPagado: 150, equipos: [] };
    expect(sumarPagosFactura(factura)).toBe(150);
  });

  // El caso que costaba plata: en una factura del Excel, `montoPagado` viene
  // ACUMULADO —al agregar un equipo pagado, la app se lo sumó— así que sumarle
  // otra vez el pago del equipo contaba esa plata dos veces.
  it("no cuenta dos veces el pago de un equipo agregado a una factura vieja", () => {
    const factura = {
      modoPago: "Bancolombia",
      // $200 del alta + $100 del equipo que se agregó después.
      montoPagado: 300,
      equipos: [
        { agregadoPosteriormente: true, pagos: [{ medio: "Nequi", monto: 100 }] },
      ],
    };
    expect(sumarPagosFactura(factura)).toBe(300);
    expect(pagoInicialFactura(factura)).toBe(200);
    expect(sumarPagosDeAgregados(factura)).toBe(100);
  });
});

describe("pagosDelAlta", () => {
  it("en el formato nuevo devuelve la lista tal cual", () => {
    const pagos = [
      { medio: "Nequi", monto: 200 },
      { medio: "Efectivo", monto: 50 },
    ];
    const factura = {
      pagos,
      equipos: [
        { agregadoPosteriormente: true, pagos: [{ medio: "Nequi", monto: 900 }] },
      ],
    };
    expect(pagosDelAlta(factura)).toEqual(pagos);
  });

  it("en el formato viejo arma un renglón con el monto ya limpio", () => {
    const factura = {
      modoPago: "Bancolombia",
      montoPagado: 300,
      equipos: [
        { agregadoPosteriormente: true, pagos: [{ medio: "Nequi", monto: 100 }] },
      ],
    };
    expect(pagosDelAlta(factura)).toEqual([{ medio: "Bancolombia", monto: 200 }]);
  });

  it("nunca devuelve un pago negativo", () => {
    const factura = {
      modoPago: "Bancolombia",
      montoPagado: 50,
      equipos: [
        { agregadoPosteriormente: true, pagos: [{ medio: "Nequi", monto: 100 }] },
      ],
    };
    expect(pagosDelAlta(factura)).toEqual([{ medio: "Bancolombia", monto: 0 }]);
  });

  it("sin medio de pago no inventa un renglón", () => {
    expect(pagosDelAlta({ equipos: [] })).toEqual([]);
  });
});

// ── Cuenta de la factura y del cliente ─────────────────────────────────────

describe("calcularEstadoCuenta", () => {
  it("suma pagos y abonos, y calcula el saldo pendiente", () => {
    const factura = { valorTotal: 1000, montoPagado: 400, abonos: [{ monto: 100 }] };
    const cuenta = calcularEstadoCuenta(factura);
    expect(cuenta.total).toBe(1000);
    expect(cuenta.pagado).toBe(500);
    expect(cuenta.saldoPendiente).toBe(500);
    expect(cuenta.saldoAFavor).toBe(0);
  });

  it("usa el total mostrado cuando se le pasa (con días ampliados)", () => {
    const factura = { valorTotal: 1000, montoPagado: 400 };
    expect(calcularEstadoCuenta(factura, 1200).saldoPendiente).toBe(800);
  });

  it("si se pagó de más, el sobrante sale como saldo a favor", () => {
    const factura = { valorTotal: 1000, montoPagado: 1200 };
    const cuenta = calcularEstadoCuenta(factura);
    expect(cuenta.saldoPendiente).toBe(0);
    expect(cuenta.saldoAFavor).toBe(200);
  });
});

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

  // Antes, en una factura del Excel el pago del equipo agregado se contaba dos
  // veces: la pantalla mostraba $700 pagados y $300 de saldo cuando el cliente
  // había entregado $600 y debía $400.
  it("en una factura vieja no infla lo pagado con el equipo agregado", () => {
    const factura = {
      valorTotal: 1000,
      modoPago: "Bancolombia",
      // $500 del alta + $100 del equipo agregado.
      montoPagado: 600,
      equipos: [
        { cantidad: 1, valor: 100 },
        { agregadoPosteriormente: true, pagos: [{ medio: "Nequi", monto: 100 }] },
      ],
    };
    const cuenta = calcularCuentaFactura(factura, HOY);
    expect(cuenta.pagado).toBe(600);
    expect(cuenta.saldoPendiente).toBe(400);
  });
});

describe("calcularSaldoConAbonos", () => {
  it("resta pago del alta y abonos al total facturado (crudo)", () => {
    const factura = { valorTotal: 1000, montoPagado: 300 };
    expect(calcularSaldoConAbonos(factura, [{ monto: 200 }])).toBe(500);
  });

  it("nunca baja de cero", () => {
    const factura = { valorTotal: 1000, montoPagado: 900 };
    expect(calcularSaldoConAbonos(factura, [{ monto: 200 }])).toBe(0);
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

  it("un equipo devuelto a tiempo no suma días", () => {
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
