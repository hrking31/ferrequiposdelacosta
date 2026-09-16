import { describe, it, expect, vi, afterEach } from "vitest";
import {
  calcularEquipo,
  calcularEstadoEquipo,
  equipoVencido,
  equipoAlDia,
  proyectarAmpliacion,
  cerrarTramoVencido,
  abrirTramoVencido,
  sellarFacturaPagada,
  diasDeEquipo,
  obtenerFechaDespachoSugerida,
  obtenerFechaHoyBogota,
  calcularAlquiler,
  calcularIvaEquipos,
  facturaLlevaIva,
  equipoLlevaIva,
  calcularTransporteTotal,
  calcularDepositoTotal,
  calcularRetenido,
  calcularDepositoDevuelto,
  depositoPendiente,
  sumarPagos,
  sumarAbonos,
  sumarEntregas,
  calcularCuentaFactura,
  calcularExigible,
  calcularEstadoFactura,
  facturaCerrada,
  contarUnidadesVencidas,
  plazoVencidoFactura,
  hayEquiposAlDia,
  equiposQueVencieronHoy,
  calcularCuentaCliente,
  ordenarFacturasConSaldo,
  repartirEntreFacturas,
  separarExcedentePago,
  calcularEstadoCliente,
  calcularAporteFactura,
  calcularTotalesFacturas,
  calcularGestionFactura,
  contarLlamadasSinRespuesta,
  movimientosFactura,
  describirMovimientosFactura,
  diasDeAlquiler,
  calcularFechaDevolucion,
  cubiertoHasta,
  calcularVencimiento,
} from "./facturaCuentas";
import { GRUPO_INICIAL } from "./facturaModelo";

// Casi todas estas funciones reciben la fecha de hoy como parámetro: así
// quedan deterministas y se prueban sin depender del reloj real.
const HOY = "2026-09-08";

// Un equipo suelto, con lo mínimo. Por defecto sale el 04 por 10 días, así
// que está cubierto hasta el 13 y a la fecha de HOY todavía no venció.
//
// `venceEl` es el atajo para el caso más común de estas pruebas: un equipo
// cubierto hasta tal día. Como esa fecha ya no se guarda —se encadena desde
// los días del alta, ver cubiertoHasta—, se ajustan los días; y si el día
// pedido cae antes del despacho por defecto, el equipo sale ESE día por uno.
const equipo = ({ venceEl, ...extra } = {}) => {
  const base = {
    nombre: "GATOS METALICOS",
    cantidadEquipos: 10,
    valorDia: 1500,
    diasAlquilados: 10,
    fechaDespacho: "2026-09-04",
    ampliaciones: [],
    vencidos: [],
    ...extra,
  };
  if (!venceEl) return base;

  const dias = diasDeAlquiler(base.fechaDespacho, venceEl);
  return dias > 0
    ? { ...base, diasAlquilados: dias }
    : { ...base, fechaDespacho: venceEl, diasAlquilados: 1 };
};

// Un tramo en que el equipo estuvo pasado de plazo. Sin `hasta` es el que
// está corriendo hoy.
const tramo = (desde, hasta = null, indefinida = false) => ({
  desde,
  hasta,
  indefinida,
});

// Una factura con un solo despacho.
const facturaCon = (equipos, extra = {}) => ({
  factura: {
    numeroFactura: "1240",
    fechaCreacion: "2026-09-04",
    depositoResuelto: false,
    cerrada: false,
    ...(extra.factura ?? {}),
  },
  grupos: [
    {
      grupo: GRUPO_INICIAL,
      fechaSolicitud: "2026-09-04",
      pagos: { tipoPago: extra.tipoPago ?? "parcial", medios: extra.pagos ?? [] },
      adicionales: extra.adicionales ?? {
        transporte: "",
        valorTransporte: 0,
        deposito: false,
        valorDeposito: 0,
      },
      // La marca del IVA se le escribe a cada equipo que no traiga la suya,
      // que es lo que hace el formulario al guardar. La factura no la tiene.
      equipos: equipos.map((eq) => ({
        aplicaIva: eq.aplicaIva ?? Boolean(extra.factura?.aplicaIva),
        ...eq,
      })),
    },
    ...(extra.grupos ?? []),
  ],
  abonos: extra.abonos ?? [],
  entregas: extra.entregas ?? [],
  gestiones: extra.gestiones ?? [],
});

describe("la regla de las 3 p.m.", () => {
  // Bogotá es UTC−5, así que las 3 p.m. de allá son las 20:00 UTC. Se fija el
  // reloj para que la prueba no dependa de a qué hora se corra.
  const alasHoraBogota = (isoUtc) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(isoUtc));
  };

  afterEach(() => {
    vi.useRealTimers();
  });

  it("antes de las 3 el equipo sale hoy", () => {
    alasHoraBogota("2026-09-08T19:00:00Z"); // 14:00 en Bogotá
    expect(obtenerFechaDespachoSugerida()).toBe("2026-09-08");
  });

  it("a las 3 en punto ya sale mañana", () => {
    alasHoraBogota("2026-09-08T20:00:00Z"); // 15:00 en Bogotá
    expect(obtenerFechaDespachoSugerida()).toBe("2026-09-09");
  });

  it("y de noche también, contando el día de Bogotá y no el de UTC", () => {
    // 04:00 UTC del 9 son las 23:00 del 8 en Bogotá: el día es el 8, y como ya
    // pasaron las 3, el equipo sale el 9.
    alasHoraBogota("2026-09-09T04:00:00Z");
    expect(obtenerFechaDespachoSugerida()).toBe("2026-09-09");
    expect(obtenerFechaHoyBogota()).toBe("2026-09-08");
  });

  // Lo que YA PASÓ se fecha hoy, sin importar la hora. Es la distinción que
  // faltaba: la misma función servía para las dos cosas y una factura hecha a
  // las 4 de la tarde nacía fechada mañana, igual que la solicitud de un
  // despacho agregado y el pago que venía con ella.
  it("lo que ya pasó se fecha hoy, aunque sean las 4 de la tarde", () => {
    alasHoraBogota("2026-09-08T21:00:00Z"); // 16:00 en Bogotá
    expect(obtenerFechaHoyBogota()).toBe("2026-09-08");
    // Y el despacho de esos equipos sí es mañana: son dos fechas distintas.
    expect(obtenerFechaDespachoSugerida()).toBe("2026-09-09");
  });
});

describe("los días de alquiler", () => {
  // El día de salida cuenta como el primero: sale y vuelve el mismo día es 1.
  it("sale y vuelve el mismo día es un día, no cero", () => {
    expect(diasDeAlquiler("2026-09-04", "2026-09-04")).toBe(1);
    expect(diasDeAlquiler("2026-09-04", "2026-09-13")).toBe(10);
  });

  it("la fecha de devolución cuenta el día de despacho", () => {
    expect(calcularFechaDevolucion("2026-09-04", 10)).toBe("2026-09-13");
    // Ampliar suma completo: el día de vencimiento ya estaba contado.
    expect(calcularVencimiento("2026-09-13", 2)).toBe("2026-09-15");
  });
});

describe("calcularEquipo — el que ya volvió", () => {
  // La regla que reemplazó a toda la maquinaria de créditos: los días de una
  // línea devuelta ya son los que usó, así que la multiplicación simple da
  // bien sin restar nada.
  it("cobra los días que usó, sin créditos que restar", () => {
    const devuelto = equipo({
      cantidadEquipos: 4,
      diasAlquilados: 1,
      devolucion: { fechaDevolucion: "2026-09-04", buenEstado: true, valorRetenido: 0 },
    });
    const cuenta = calcularEquipo(devuelto, HOY);
    expect(cuenta.dias).toBe(1);
    expect(cuenta.neto).toBe(6000); // 4 × 1.500 × 1
    expect(cuenta.devuelto).toBe(true);
  });

  // Aunque el calendario avance, una línea devuelta no cambia nunca más.
  it("no le corren más días después de volver", () => {
    const devuelto = equipo({
      cantidadEquipos: 4,
      diasAlquilados: 1,
      devolucion: { fechaDevolucion: "2026-09-04", buenEstado: true, valorRetenido: 0 },
    });
    expect(calcularEquipo(devuelto, "2026-12-31").neto).toBe(6000);
  });

  it("el que se pasó de la fecha ya trae esos días adentro", () => {
    // Salió el 4, volvió el 18: 15 días, cinco más de los 10 pactados.
    const tarde = equipo({
      cantidadEquipos: 1,
      valorDia: 20000,
      diasAlquilados: 15,
      devolucion: { fechaDevolucion: "2026-09-18", buenEstado: true, valorRetenido: 0 },
    });
    expect(calcularEquipo(tarde, HOY).neto).toBe(300000);
  });

  it("el descuento de una ampliación se resta igual", () => {
    const conDescuento = equipo({
      cantidadEquipos: 1,
      valorDia: 20000,
      diasAlquilados: 12,
      ampliaciones: [{ dias: 2, desde: "2026-09-14", hasta: "2026-09-15", descuento: 10000 }],
      devolucion: { fechaDevolucion: "2026-09-15", buenEstado: true, valorRetenido: 0 },
    });
    expect(calcularEquipo(conDescuento, HOY).neto).toBe(230000); // 12×20.000 − 10.000
  });
});

describe("calcularEquipo — el que sigue afuera", () => {
  it("en fecha se cobran los días pactados, no los transcurridos", () => {
    // Salió el 4, hoy es 8: lleva 5 días, pero pactó 10 y esos se le cobran.
    const cuenta = calcularEquipo(equipo(), HOY);
    expect(cuenta.dias).toBe(10);
    expect(cuenta.diasVencidos).toBe(0);
    expect(cuenta.neto).toBe(150000);
  });

  it("pasado el vencimiento se cobran los días que lleva", () => {
    // Salió el 4 por 10 días, cubierto hasta el 13. La madrugada del 14 le
    // abrió su tramo y hoy es el 18: cinco días de más.
    const cuenta = calcularEquipo(
      equipo({ vencidos: [tramo("2026-09-14")] }),
      "2026-09-18",
    );
    expect(cuenta.dias).toBe(15);
    expect(cuenta.diasPactados).toBe(10);
    expect(cuenta.diasVencidos).toBe(5);
    expect(cuenta.netoPactado).toBe(150000);
    expect(cuenta.netoVencido).toBe(75000);
    expect(cuenta.neto).toBe(225000);
  });

  it("los días ampliados cuentan como pactados", () => {
    // Cubierto hasta el 13 por el alta, y la ampliación lo lleva al 15.
    const ampliado = equipo({
      ampliaciones: [
        {
          fecha: "2026-09-13",
          dias: 2,
          desde: "2026-09-14",
          hasta: "2026-09-15",
          descuento: 0,
        },
      ],
    });
    const cuenta = calcularEquipo(ampliado, "2026-09-15");
    expect(cuenta.diasPactados).toBe(12);
    expect(cuenta.diasVencidos).toBe(0);
    expect(cuenta.neto).toBe(180000);
  });
});

describe("el estado de un equipo", () => {
  it("los cinco, en su orden de prioridad", () => {
    const porSalir = equipo({ fechaDespacho: "2026-09-20" });
    expect(calcularEstadoEquipo(porSalir, HOY)).toBe("pendiente");

    expect(calcularEstadoEquipo(equipo(), HOY)).toBe("activo");

    const conAmpliacion = equipo({
      ampliaciones: [{ dias: 2, desde: "2026-09-14", hasta: "2026-09-15" }],
    });
    expect(calcularEstadoEquipo(conAmpliacion, HOY)).toBe("ampliacion");

    expect(calcularEstadoEquipo(equipo(), "2026-09-20")).toBe("vencido");

    const devuelto = equipo({
      devolucion: { fechaDevolucion: "2026-09-06", buenEstado: true, valorRetenido: 0 },
    });
    expect(calcularEstadoEquipo(devuelto, "2026-12-31")).toBe("devuelto");
  });

  // El orden importa: uno que volvió tarde ya volvió, no está vencido.
  it("el devuelto gana aunque haya vuelto tarde", () => {
    const tarde = equipo({
      diasAlquilados: 20,
      devolucion: { fechaDevolucion: "2026-09-23", buenEstado: true, valorRetenido: 0 },
    });
    expect(calcularEstadoEquipo(tarde, "2026-09-30")).toBe("devuelto");
    expect(equipoVencido(tarde, "2026-09-30")).toBe(false);
  });

  it("el que se pasó de su fecha ampliada es vencido, no ampliación", () => {
    const ampliadoYVencido = equipo({
      ampliaciones: [{ diasAmpliados: 2 }],
      venceEl: "2026-09-15",
    });
    expect(calcularEstadoEquipo(ampliadoYVencido, "2026-09-16")).toBe("vencido");
  });

  it("la entrega indefinida cuenta como vencida: el cliente tenía que avisar", () => {
    const indefinido = equipo({
      indefinida: { activa: true, desde: "2026-09-05", hasta: null },
    });
    expect(calcularEstadoEquipo(indefinido, HOY)).toBe("vencido");
  });

  it("estar al día es estar afuera y en plazo", () => {
    expect(equipoAlDia(equipo(), HOY)).toBe(true);
    expect(equipoAlDia(equipo(), "2026-09-20")).toBe(false);
  });
});

describe("ampliar el plazo de un equipo vencido", () => {
  // Si al vencido se le suma el día a su fecha vieja, la nueva ya pasó y el
  // cliente no tiene el día que se le prometió.
  it("la fecha nueva arranca hoy, y se registran los días que corre de verdad", () => {
    // Cubierto hasta el 13, con su tramo abierto desde el 14. Hoy es el 17:
    // lleva 4 días de más.
    const vencido = equipo({ vencidos: [tramo("2026-09-14")] });
    const proyeccion = proyectarAmpliacion(vencido, 1, "2026-09-17");

    expect(proyeccion.diasVencidos).toBe(4); // del 14 al 17
    // El día que se le promete es MAÑANA: el tramo vencido se cierra hoy y
    // los días nuevos arrancan al día siguiente.
    expect(proyeccion.diasPedidos).toBe(1);
    expect(proyeccion.desde).toBe("2026-09-18");
    expect(proyeccion.hasta).toBe("2026-09-18");
  });

  it("uno que está en fecha suma los días a su vencimiento", () => {
    const proyeccion = proyectarAmpliacion(equipo(), 2, HOY);

    expect(proyeccion.diasVencidos).toBe(0);
    // Sigue cubierto hasta el 13, así que los dos días nuevos son el 14 y
    // el 15.
    expect(proyeccion.desde).toBe("2026-09-14");
    expect(proyeccion.hasta).toBe("2026-09-15");
  });
});

describe("cerrar el tramo vencido cuando el cliente paga", () => {
  // El caso real: un compresor de $150.000 el día, despachado el 01/09 por 7
  // días, cubierto hasta el 07. La madrugada del 08 le abrió su tramo, y al 09
  // lleva 2 días de más.
  const compresor = (extra = {}) => ({
    nombre: "COMPRESOR NEUMATICO",
    cantidadEquipos: 1,
    valorDia: 150000,
    diasAlquilados: 7,
    fechaDespacho: "2026-09-01",
    ampliaciones: [],
    vencidos: [tramo("2026-09-08")],
    ...extra,
  });

  it("cierra el tramo con el día del pago y no toca nada más", () => {
    const cerrado = cerrarTramoVencido(compresor(), "2026-09-09");

    expect(cerrado.vencidos).toHaveLength(1);
    expect(cerrado.vencidos[0]).toMatchObject({
      desde: "2026-09-08",
      hasta: "2026-09-09",
    });
    // Los días del alta no se tocan nunca, y no se inventa ninguna ampliación:
    // al cliente no se le concedió ni un día, se le cerró lo que ya pasó.
    expect(cerrado.diasAlquilados).toBe(7);
    expect(cerrado.ampliaciones).toHaveLength(0);
  });

  // Esos días ya están cobrados: cerrarlos no los descuenta ni los duplica.
  it("no mueve la cuenta ni un peso", () => {
    const antes = facturaCon([compresor()]);
    const despues = facturaCon([cerrarTramoVencido(compresor(), "2026-09-09")]);

    expect(calcularCuentaFactura(antes, "2026-09-09").total).toBe(1350000);
    expect(calcularCuentaFactura(despues, "2026-09-09").total).toBe(1350000);
  });

  it("el contador no crece hasta que la madrugada abra otro tramo", () => {
    const cerrado = cerrarTramoVencido(compresor(), "2026-09-09");

    // Los 2 días quedaron escritos y ahí se quedan: sin tramo abierto, el
    // calendario no cuenta nada nuevo.
    expect(calcularEquipo(cerrado, "2026-09-09").diasVencidos).toBe(2);
    expect(calcularEquipo(cerrado, "2026-09-10").diasVencidos).toBe(2);

    // La madrugada del 10 le abre uno nuevo, y ahí sí suma UNO: no los tres
    // que lleva afuera.
    const alDiaSiguiente = abrirTramoVencido(cerrado, "2026-09-10");
    expect(calcularEquipo(alDiaSiguiente, "2026-09-10").diasVencidos).toBe(3);
    expect(
      calcularCuentaFactura(facturaCon([alDiaSiguiente]), "2026-09-10").total,
    ).toBe(1500000);
  });

  it("los días se reparten entre el alta y lo vencido", () => {
    const cerrado = cerrarTramoVencido(compresor(), "2026-09-09");

    expect(diasDeEquipo(cerrado, "2026-09-09")).toMatchObject({
      alta: 7,
      ampliados: 0,
      vencidos: 2,
    });
  });

  it("el que no tiene ningún tramo abierto no se toca", () => {
    const alDia = compresor({ vencidos: [] });
    expect(cerrarTramoVencido(alDia, "2026-09-09")).toBe(alDia);
  });

  it("el que ya volvió corta su tramo el día de la devolución", () => {
    const devuelto = compresor({
      devolucion: { fechaDevolucion: "2026-09-09", buenEstado: true },
    });

    // Aunque el tramo siga abierto, la cuenta se corta ahí: no sigue
    // corriendo con el calendario.
    expect(calcularEquipo(devuelto, "2026-09-20").diasVencidos).toBe(2);
  });

  // El cliente pagó, pero sigue sin decir cuándo devuelve: el equipo no tiene
  // fecha de retorno y por eso no se mueve de seguimiento.
  it("el de entrega indefinida sigue vencido después de pagar", () => {
    const indefinido = cerrarTramoVencido(
      compresor({
        indefinida: { activa: true, desde: "2026-09-08", hasta: null },
        vencidos: [tramo("2026-09-08", null, true)],
      }),
      "2026-09-09",
    );

    expect(calcularEstadoEquipo(indefinido, "2026-09-09")).toBe("vencido");
    expect(calcularEquipo(indefinido, "2026-09-09").diasVencidos).toBe(2);

    // Y la madrugada siguiente le abre otro, también con permiso.
    const conNuevo = abrirTramoVencido(indefinido, "2026-09-10");
    expect(conNuevo.vencidos[1]).toMatchObject({
      desde: "2026-09-10",
      indefinida: true,
    });
  });

  it("cierra todos los equipos de la factura y avisa cuando no había nada", () => {
    const factura = facturaCon([compresor(), compresor({ nombre: "MEZCLADORA" })]);
    const grupos = sellarFacturaPagada(factura, "2026-09-09");

    expect(
      grupos[0].equipos.every((eq) => eq.vencidos[0]?.hasta === "2026-09-09"),
    ).toBe(true);
    // Ya cerrados, una segunda pasada no tiene nada que hacer.
    expect(sellarFacturaPagada({ ...factura, grupos }, "2026-09-09")).toBeNull();
  });

  // La factura sigue en seguimiento: el equipo no volvió y su cobertura se
  // acabó hoy.
  it("la factura pagada al día sigue vencida mientras el equipo esté afuera", () => {
    const factura = facturaCon([cerrarTramoVencido(compresor(), "2026-09-09")], {
      abonos: [{ fecha: "2026-09-09", medio: "Nequi", monto: 1350000 }],
    });

    expect(calcularCuentaFactura(factura, "2026-09-09").saldoPendiente).toBe(0);
    expect(calcularExigible(factura, "2026-09-09")).toBe(0);
    expect(calcularEstadoFactura(factura, "2026-09-09")).toBe("vencida");
  });
});

describe("la cuenta de la factura", () => {
  // El caso del diseño: 4 gatos devueltos el mismo día y 6 que siguen afuera.
  const gatos = facturaCon(
    [
      equipo({
        cantidadEquipos: 4,
        diasAlquilados: 1,
        devolucion: { fechaDevolucion: "2026-09-04", buenEstado: true, valorRetenido: 0 },
      }),
      equipo({ cantidadEquipos: 6 }),
    ],
    { pagos: [{ medio: "Efectivo", monto: 150000, tipoPago: "total" }] },
  );

  it("suma los dos pedazos con la misma multiplicación", () => {
    const alquiler = calcularAlquiler(gatos, HOY);
    expect(alquiler.neto).toBe(96000); // 6.000 + 90.000
  });

  it("el total baja de los $150.000 del despacho a $96.000", () => {
    const cuenta = calcularCuentaFactura(gatos, HOY);
    expect(cuenta.total).toBe(96000);
    expect(cuenta.pagado).toBe(150000);
    expect(cuenta.saldoAFavor).toBe(54000);
    expect(cuenta.saldoPendiente).toBe(0);
  });

  it("el flete y el depósito son de cada despacho, y se suman todos", () => {
    const conDos = facturaCon([equipo()], {
      adicionales: {
        transporte: "Ida y vuelta",
        valorTransporte: 150000,
        deposito: true,
        valorDeposito: 300000,
      },
      grupos: [
        {
          grupo: "grupo-agregados-1",
          fechaSolicitud: "2026-09-06",
          pagos: { tipoPago: "sinPago", medios: [] },
          adicionales: {
            transporte: "Solo ida",
            valorTransporte: 80000,
            deposito: true,
            valorDeposito: 200000,
          },
          equipos: [],
        },
      ],
    });
    expect(calcularTransporteTotal(conDos)).toBe(230000);
    expect(calcularDepositoTotal(conDos)).toBe(500000);
  });

  // ── Los cuatro cargos ────────────────────────────────────────────────
  //
  // El bug que arreglaron: el flete iba dentro del subtotal Y en su propio
  // renglón, así que los cuatro números de la pantalla no daban el total; y
  // como el IVA salía de ese subtotal, se le cobraba IVA al flete.
  const unEquipoDe = (extra = {}) =>
    equipo({ cantidadEquipos: 1, valorDia: 100000, diasAlquilados: 10, ...extra });

  const conFlete = { transporte: "Solo ida", valorTransporte: 100000, deposito: false, valorDeposito: 0 };

  it("el subtotal es el alquiler pelado: el flete no va adentro", () => {
    const doc = facturaCon([unEquipoDe()], { adicionales: conFlete });
    const cuenta = calcularCuentaFactura(doc, HOY);
    expect(cuenta.subtotal).toBe(1000000);
    expect(cuenta.transporte).toBe(100000);
  });

  it("al flete no se le cobra IVA", () => {
    const doc = facturaCon([unEquipoDe()], {
      factura: { aplicaIva: true },
      adicionales: conFlete,
    });
    const cuenta = calcularCuentaFactura(doc, HOY);
    expect(cuenta.subtotal).toBe(1000000);
    expect(cuenta.iva).toBe(190000); // el 19% del alquiler, no de 1.100.000
    expect(cuenta.total).toBe(1290000);
  });

  it("los cuatro cargos suman el total, cada uno una sola vez", () => {
    const doc = facturaCon([unEquipoDe()], {
      factura: { aplicaIva: true },
      adicionales: { transporte: "Ida y vuelta", valorTransporte: 100000, deposito: true, valorDeposito: 300000 },
    });
    const cuenta = calcularCuentaFactura(doc, HOY);
    expect(cuenta.subtotal + cuenta.iva + cuenta.transporte + cuenta.deposito).toBe(cuenta.total);
    expect(cuenta.total).toBe(1590000); // 1.000.000 + 190.000 + 100.000 + 300.000
  });

  it("al depósito tampoco se le cobra IVA", () => {
    const doc = facturaCon([unEquipoDe()], {
      factura: { aplicaIva: true },
      adicionales: { transporte: "", valorTransporte: 0, deposito: true, valorDeposito: 300000 },
    });
    expect(calcularCuentaFactura(doc, HOY).iva).toBe(190000);
  });

  it("sin IVA el total es alquiler, flete y depósito", () => {
    const doc = facturaCon([unEquipoDe()], {
      adicionales: { transporte: "Solo ida", valorTransporte: 100000, deposito: true, valorDeposito: 300000 },
    });
    const cuenta = calcularCuentaFactura(doc, HOY);
    expect(cuenta.iva).toBe(0);
    expect(cuenta.total).toBe(1400000);
  });

  // ── El IVA es de cada equipo ─────────────────────────────────────────

  it("el IVA se suma equipo por equipo, no de un total", () => {
    const doc = facturaCon(
      [
        unEquipoDe({ aplicaIva: true }),
        unEquipoDe({ valorDia: 50000, aplicaIva: true }),
      ],
      { adicionales: conFlete },
    );
    // 1.000.000 y 500.000 de alquiler → 190.000 + 95.000
    expect(calcularIvaEquipos(doc, HOY)).toBe(285000);
  });

  it("un equipo exento al lado de uno gravado: solo paga el gravado", () => {
    const doc = facturaCon([
      unEquipoDe({ aplicaIva: true }),
      unEquipoDe({ aplicaIva: false }),
    ]);
    const cuenta = calcularCuentaFactura(doc, HOY);
    expect(cuenta.subtotal).toBe(2000000);
    expect(cuenta.iva).toBe(190000);
  });

  it("el equipo sin marca no lleva IVA: no hay a quién heredarle", () => {
    // La factura ya no guarda una marca de arriba. Quien crea el equipo se la
    // escribe siempre, así que un equipo sin ella es un equipo exento.
    const doc = facturaCon([{ ...unEquipoDe(), aplicaIva: undefined }]);
    expect(equipoLlevaIva(doc.grupos[0].equipos[0])).toBe(false);
    expect(calcularCuentaFactura(doc, HOY).iva).toBe(0);
  });

  it("el equipo marcado sin IVA no paga, aunque la factura sí lo tenga", () => {
    const doc = facturaCon([unEquipoDe({ aplicaIva: false })], {
      factura: { aplicaIva: true },
    });
    expect(equipoLlevaIva(doc.grupos[0].equipos[0])).toBe(false);
    expect(calcularCuentaFactura(doc, HOY).iva).toBe(0);
  });

  it("el equipo marcado con IVA paga, aunque la factura no lo tenga", () => {
    const doc = facturaCon([unEquipoDe({ aplicaIva: true })]);
    expect(calcularCuentaFactura(doc, HOY).iva).toBe(190000);
  });

  it("que la factura lleve IVA se deduce de sus equipos", () => {
    const conIva = facturaCon([unEquipoDe({ aplicaIva: true }), unEquipoDe({ aplicaIva: false })]);
    const sinIva = facturaCon([unEquipoDe({ aplicaIva: false })]);
    const vacia = facturaCon([]);

    // Alcanza con que UNO lo lleve: es lo que decide si la casilla de los
    // formularios arranca marcada.
    expect(facturaLlevaIva(conIva)).toBe(true);
    expect(facturaLlevaIva(sinIva)).toBe(false);
    expect(facturaLlevaIva(vacia)).toBe(false);
  });

  it("una factura sin equipos no tiene IVA que cobrar", () => {
    const doc = facturaCon([], { factura: { aplicaIva: true }, adicionales: conFlete });
    const cuenta = calcularCuentaFactura(doc, HOY);
    expect(cuenta.iva).toBe(0);
    expect(cuenta.total).toBe(100000); // solo el flete
  });

  it("el IVA corre con los días vencidos, como el alquiler", () => {
    // Pactó 2 días desde el 4 —cubierto hasta el 5— y su tramo corre desde
    // el 6. Hoy es 8: cinco días en total.
    const doc = facturaCon([
      unEquipoDe({
        diasAlquilados: 2,
        aplicaIva: true,
        vencidos: [tramo("2026-09-06")],
      }),
    ]);
    const cuenta = calcularCuentaFactura(doc, HOY);
    expect(cuenta.subtotal).toBe(500000);
    expect(cuenta.iva).toBe(95000);
  });

  it("el flete de cada despacho entra al total una sola vez", () => {
    const doc = facturaCon([unEquipoDe()], {
      adicionales: conFlete,
      grupos: [
        {
          grupo: "grupo-agregados-1",
          fechaSolicitud: "2026-09-06",
          pagos: { tipoPago: "sinPago", medios: [] },
          adicionales: { transporte: "Solo ida", valorTransporte: 80000, deposito: false, valorDeposito: 0 },
          equipos: [],
        },
      ],
    });
    const cuenta = calcularCuentaFactura(doc, HOY);
    expect(cuenta.transporte).toBe(180000);
    expect(cuenta.total).toBe(1180000);
  });

  it("las entregas restan de lo recibido", () => {
    const conEntrega = facturaCon([equipo()], {
      pagos: [{ medio: "Efectivo", monto: 200000 }],
      entregas: [{ fecha: HOY, medio: "Nequi", monto: 50000, nota: "" }],
    });
    expect(sumarEntregas(conEntrega)).toBe(50000);
    const cuenta = calcularCuentaFactura(conEntrega, HOY);
    expect(cuenta.pagado).toBe(200000);
    expect(cuenta.entregas).toBe(50000);
    expect(cuenta.recibido).toBe(150000);
  });

  it("los abonos suman a lo recibido", () => {
    const conAbono = facturaCon([equipo()], {
      abonos: [
        { fecha: HOY, medio: "Nequi", monto: 100000, tipo: "sistema" },
        { fecha: HOY, medio: "Efectivo", monto: 50000, tipo: "cliente" },
      ],
    });
    expect(sumarAbonos(conAbono)).toBe(150000);
    expect(calcularCuentaFactura(conAbono, HOY).recibido).toBe(150000);
  });

  it("el pago se lee de los grupos, y de todos", () => {
    const dosGrupos = facturaCon([equipo()], {
      pagos: [{ medio: "Bancolombia", monto: 500000 }],
      grupos: [
        {
          grupo: "grupo-agregados-1",
          fechaSolicitud: "2026-09-06",
          pagos: { tipoPago: "total", medios: [{ medio: "Efectivo", monto: 150000 }] },
          adicionales: {},
          equipos: [],
        },
      ],
    });
    expect(sumarPagos(dosGrupos)).toBe(650000);
  });
});

describe("el depósito", () => {
  const conDeposito = (extra = {}) =>
    facturaCon(
      [
        equipo({
          cantidadEquipos: 1,
          valorDia: 10000,
          diasAlquilados: 1,
          devolucion: {
            fechaDevolucion: "2026-09-04",
            buenEstado: extra.buenEstado ?? true,
            valorRetenido: extra.valorRetenido ?? 0,
          },
        }),
      ],
      {
        factura: { depositoResuelto: extra.depositoResuelto ?? false },
        adicionales: { transporte: "", valorTransporte: 0, deposito: true, valorDeposito: 500000 },
      },
    );

  it("mientras no se resuelva, sigue siendo un cargo", () => {
    const sinResolver = conDeposito();
    expect(calcularDepositoDevuelto(sinResolver)).toBe(0);
    expect(depositoPendiente(sinResolver)).toBe(true);
    expect(calcularCuentaFactura(sinResolver, HOY).deposito).toBe(500000);
  });

  it("al resolverse, lo que se le devuelve deja de cobrarse", () => {
    const resuelto = conDeposito({ depositoResuelto: true, valorRetenido: 50000, buenEstado: false });
    expect(calcularRetenido(resuelto)).toBe(50000);
    expect(calcularDepositoDevuelto(resuelto)).toBe(450000);
    expect(depositoPendiente(resuelto)).toBe(false);
    // Queda como cargo solo lo retenido, que sí es ingreso.
    expect(calcularCuentaFactura(resuelto, HOY).deposito).toBe(50000);
  });

  it("nunca se retiene más de lo que el cliente dejó", () => {
    const excedido = conDeposito({ depositoResuelto: true, valorRetenido: 900000, buenEstado: false });
    expect(calcularDepositoDevuelto(excedido)).toBe(0);
  });
});

describe("lo exigible hoy", () => {
  // Es lo que arregla el error de los $144.440: no parte de ninguna foto
  // vieja, sino de los días que el cliente ya consumió.
  it("no cobra los días que el cliente todavía tiene por delante", () => {
    // Pactó 10 días desde el 4, hoy es 8: lleva 5 consumidos de 10.
    const enCurso = facturaCon([equipo({ cantidadEquipos: 1, valorDia: 10000 })]);
    expect(calcularCuentaFactura(enCurso, HOY).total).toBe(100000);
    expect(calcularExigible(enCurso, HOY)).toBe(50000);
  });

  it("con todo devuelto, lo exigible es la cuenta completa", () => {
    const cerrada = facturaCon([
      equipo({
        cantidadEquipos: 1,
        valorDia: 10000,
        diasAlquilados: 3,
        devolucion: { fechaDevolucion: "2026-09-06", buenEstado: true, valorRetenido: 0 },
      }),
    ]);
    expect(calcularExigible(cerrada, HOY)).toBe(30000);
  });

  it("lo que ya pagó baja lo exigible", () => {
    const pagada = facturaCon([equipo({ cantidadEquipos: 1, valorDia: 10000 })], {
      pagos: [{ medio: "Efectivo", monto: 50000 }],
    });
    expect(calcularExigible(pagada, HOY)).toBe(0);
  });

  // Lo exigible arrastraba el mismo error que el total: le cobraba IVA al
  // flete y decidía el IVA con la marca de la factura, no con la del equipo.
  it("el IVA de lo exigible sale de lo consumido, no de lo pactado", () => {
    const doc = facturaCon([
      equipo({ cantidadEquipos: 1, valorDia: 100000, aplicaIva: true }),
    ]);
    // 5 días consumidos de 10 → 500.000 y su 19%
    expect(calcularExigible(doc, HOY)).toBe(595000);
  });

  it("al flete no se le cobra IVA en lo exigible", () => {
    const doc = facturaCon(
      [equipo({ cantidadEquipos: 1, valorDia: 100000, aplicaIva: true })],
      {
        adicionales: { transporte: "Solo ida", valorTransporte: 100000, deposito: false, valorDeposito: 0 },
      },
    );
    expect(calcularExigible(doc, HOY)).toBe(695000);
  });

  it("el flete y el depósito se exigen enteros: no se reparten por día", () => {
    const doc = facturaCon([equipo({ cantidadEquipos: 1, valorDia: 10000 })], {
      adicionales: { transporte: "Solo ida", valorTransporte: 100000, deposito: true, valorDeposito: 300000 },
    });
    // 50.000 consumidos + 100.000 de flete + 300.000 de depósito
    expect(calcularExigible(doc, HOY)).toBe(450000);
  });

  it("el equipo exento no suma IVA a lo exigible", () => {
    const doc = facturaCon(
      [equipo({ cantidadEquipos: 1, valorDia: 100000, aplicaIva: false })],
      { factura: { aplicaIva: true } },
    );
    expect(calcularExigible(doc, HOY)).toBe(500000);
  });
});

describe("el estado de la factura", () => {
  it("sin equipos está pendiente", () => {
    expect(calcularEstadoFactura(facturaCon([]), HOY)).toBe("pendiente");
  });

  it("con los equipos sin salir, sigue pendiente", () => {
    const porDespachar = facturaCon([equipo({ fechaDespacho: "2026-09-20" })]);
    expect(calcularEstadoFactura(porDespachar, HOY)).toBe("pendiente");
  });

  it("con equipos afuera y en plazo, está activa", () => {
    expect(calcularEstadoFactura(facturaCon([equipo()]), HOY)).toBe("activa");
  });

  it("con uno solo vencido, la factura entera está vencida", () => {
    const mixta = facturaCon([equipo(), equipo({ venceEl: "2026-09-01" })]);
    expect(calcularEstadoFactura(mixta, HOY)).toBe("vencida");
  });

  it("devolvió todo pero debe plata: está en cobro", () => {
    const debiendo = facturaCon([
      equipo({
        cantidadEquipos: 1,
        valorDia: 10000,
        diasAlquilados: 3,
        devolucion: { fechaDevolucion: "2026-09-06", buenEstado: true, valorRetenido: 0 },
      }),
    ]);
    expect(calcularEstadoFactura(debiendo, HOY)).toBe("cobro");
  });

  // Una factura terminada no puede estar tapando una deuda con el cliente.
  it("si le sobró plata al cliente, sigue en cobro", () => {
    const aFavor = facturaCon(
      [
        equipo({
          cantidadEquipos: 1,
          valorDia: 10000,
          diasAlquilados: 3,
          devolucion: { fechaDevolucion: "2026-09-06", buenEstado: true, valorRetenido: 0 },
        }),
      ],
      { pagos: [{ medio: "Efectivo", monto: 50000 }] },
    );
    expect(calcularCuentaFactura(aFavor, HOY).saldoAFavor).toBe(20000);
    expect(calcularEstadoFactura(aFavor, HOY)).toBe("cobro");
  });

  it("con el depósito sin definir tampoco termina", () => {
    const sinDefinir = facturaCon(
      [
        equipo({
          cantidadEquipos: 1,
          valorDia: 10000,
          diasAlquilados: 3,
          devolucion: { fechaDevolucion: "2026-09-06", buenEstado: true, valorRetenido: 0 },
        }),
      ],
      {
        pagos: [{ medio: "Efectivo", monto: 530000 }],
        adicionales: { transporte: "", valorTransporte: 0, deposito: true, valorDeposito: 500000 },
      },
    );
    expect(depositoPendiente(sinDefinir)).toBe(true);
    expect(calcularEstadoFactura(sinDefinir, HOY)).toBe("cobro");
  });

  it("todo devuelto, nada debido y el depósito resuelto: finalizada", () => {
    const lista = facturaCon(
      [
        equipo({
          cantidadEquipos: 1,
          valorDia: 10000,
          diasAlquilados: 3,
          devolucion: { fechaDevolucion: "2026-09-06", buenEstado: true, valorRetenido: 0 },
        }),
      ],
      { pagos: [{ medio: "Efectivo", monto: 30000 }] },
    );
    expect(calcularEstadoFactura(lista, HOY)).toBe("finalizada");
    expect(facturaCerrada(lista, HOY)).toBe(true);
  });

  // La regla de la prórroga: ampliar solo devuelve a "activa" si el cliente
  // quedó al día con lo que YA debía.
  it("una prórroga con deuda vieja no saca la factura de cartera", () => {
    const conDeuda = facturaCon([
      equipo({
        cantidadEquipos: 1,
        valorDia: 10000,
        ampliaciones: [{ diasAmpliados: 5, descuentoRealizado: 0 }],
        venceEl: "2026-09-18",
      }),
    ]);
    expect(calcularExigible(conDeuda, HOY)).toBeGreaterThan(0);
    expect(calcularEstadoFactura(conDeuda, HOY)).toBe("vencida");
  });

  // Una prórroga que nunca llegó tarde: al cliente se le dieron más días
  // antes de que venciera, así que no hay mora que arrastrar y ponerse al día
  // con lo vivido alcanza.
  it("con lo viejo pago, la prórroga sí la devuelve a activa", () => {
    const alDia = facturaCon(
      [
        equipo({
          cantidadEquipos: 1,
          valorDia: 10000,
          ampliaciones: [{ diasAmpliados: 5, descuentoRealizado: 0 }],
          venceEl: "2026-09-18",
        }),
      ],
      { pagos: [{ medio: "Efectivo", monto: 50000 }] },
    );
    expect(calcularExigible(alDia, HOY)).toBe(0);
    expect(calcularEstadoFactura(alDia, HOY)).toBe("activa");
  });

  // El caso de la 5698: al compresor se le vencieron 2 días, se le renovaron
  // 3 y esos 2 se consolidaron. El cliente se puso al día con lo ya vivido,
  // y con eso la factura salía de cartera debiendo los días que acababa de
  // contratar, con el equipo todavía afuera.
  //
  // Ahora se queda hasta que cancele TODO. El equipo sí sale: renovado deja
  // de estar vencido y desaparece de la lista de lo que hay que reclamar.
  const conMoraRenovada = (pagado) =>
    facturaCon(
      [
        equipo({
          cantidadEquipos: 1,
          valorDia: 150000,
          // 7 del alta, así que estaba cubierto hasta el 07.
          diasAlquilados: 7,
          fechaDespacho: "2026-09-01",
          // Se le vencieron 2 días —el 08 y el 09— y quedaron escritos con
          // sus fechas. Esa es la huella de que la factura estuvo en cartera,
          // y renovar el plazo ya no la puede borrar.
          vencidos: [tramo("2026-09-08", "2026-09-09")],
          // Y se le pactaron 3 días, que arrancan al día siguiente. La
          // ampliación dice SOLO lo que el cliente pidió.
          ampliaciones: [
            {
              fecha: "2026-09-09",
              dias: 3,
              desde: "2026-09-10",
              hasta: "2026-09-12",
              descuento: 0,
            },
          ],
        }),
      ],
      { pagos: [{ medio: "Efectivo", monto: pagado }] },
    );

  it("a la que se le venció la fecha no la saca de cartera ponerse al día", () => {
    // Los 8 días ya vividos, del 01 al 08, pagados: no queda nada exigible
    // hoy y el equipo tiene fecha por delante.
    const alDiaConLoVivido = conMoraRenovada(1200000);

    expect(calcularExigible(alDiaConLoVivido, HOY)).toBe(0);
    expect(calcularEstadoEquipo(alDiaConLoVivido.grupos[0].equipos[0], HOY)).toBe(
      "ampliacion",
    );
    // Le faltan los 4 días que ya contrató y todavía no usa.
    expect(calcularCuentaFactura(alDiaConLoVivido, HOY).saldoPendiente).toBe(
      600000,
    );
    expect(calcularEstadoFactura(alDiaConLoVivido, HOY)).toBe("vencida");
  });

  it("cancelado todo —lo que debía y lo que renovó— vuelve a activa", () => {
    const cancelada = conMoraRenovada(1800000);

    expect(calcularCuentaFactura(cancelada, HOY).saldoPendiente).toBe(0);
    expect(calcularEstadoFactura(cancelada, HOY)).toBe("activa");
  });
});

describe("qué hay que reclamar", () => {
  it("cuenta las unidades vencidas, no las líneas", () => {
    const mixta = facturaCon([
      equipo({ cantidadEquipos: 5, venceEl: "2026-09-01" }),
      equipo({ cantidadEquipos: 3 }), // en plazo, no se reclama
    ]);
    expect(contarUnidadesVencidas(mixta, HOY)).toBe(5);
    expect(hayEquiposAlDia(mixta, HOY)).toBe(true);
  });

  it("los devueltos no se reclaman", () => {
    const devuelta = facturaCon([
      equipo({
        cantidadEquipos: 5,
        venceEl: "2026-09-01",
        devolucion: { fechaDevolucion: "2026-09-02", buenEstado: true, valorRetenido: 0 },
      }),
    ]);
    expect(contarUnidadesVencidas(devuelta, HOY)).toBe(0);
  });

  // Para avisar por EQUIPO y no por factura: la que ya está en seguimiento
  // no volvería a "entrar" nunca más, y el segundo equipo vencería en silencio.
  it("detecta los que vencieron justo hoy", () => {
    const doc = facturaCon([
      equipo({ venceEl: "2026-09-08" }), // vence hoy
      equipo({ venceEl: "2026-09-01" }), // ya venía vencido
      equipo({ venceEl: "2026-09-20" }), // todavía no
    ]);
    const nuevos = equiposQueVencieronHoy(doc, "2026-09-08", "2026-09-07");
    expect(nuevos).toHaveLength(1);
    expect(cubiertoHasta(nuevos[0])).toBe("2026-09-08");
  });
});

describe("el plazo de la factura", () => {
  // El de la factura sale del equipo que la trajo a cartera: la fecha más
  // antigua entre los vencidos, y los días del que más lleva.
  it("toma la fecha más vieja y los días del que más se pasó", () => {
    const doc = facturaCon([
      // Cubierto hasta el 02, con su tramo corriendo desde el 03.
      equipo({
        diasAlquilados: 2,
        fechaDespacho: "2026-09-01",
        vencidos: [tramo("2026-09-03")],
      }),
      // Y este hasta el 05, con el suyo desde el 06.
      equipo({
        diasAlquilados: 5,
        fechaDespacho: "2026-09-01",
        vencidos: [tramo("2026-09-06")],
      }),
    ]);
    const plazo = plazoVencidoFactura(doc, HOY);
    expect(plazo.fecha).toBe("2026-09-02");
    // Del 2 al 8 son 6 días de más para el primero, 3 para el segundo.
    expect(plazo.dias).toBe(6);
  });

  it("sin equipos vencidos no hay plazo que mostrar", () => {
    // Sigue en cartera por la plata, no por un equipo afuera.
    const alDia = facturaCon([
      equipo({ diasAlquilados: 30, fechaDespacho: "2026-09-04", venceEl: "2026-10-03" }),
    ]);
    expect(plazoVencidoFactura(alDia, HOY)).toBeNull();
  });

  it("lo devuelto no cuenta, aunque haya vuelto tarde", () => {
    const doc = facturaCon([
      equipo({
        diasAlquilados: 2,
        fechaDespacho: "2026-09-01",
        venceEl: "2026-09-02",
        devolucion: { fechaDevolucion: "2026-09-07", buenEstado: true, valorRetenido: 0 },
      }),
    ]);
    expect(plazoVencidoFactura(doc, HOY)).toBeNull();
  });
});

describe("la cuenta del cliente y el reparto de abonos", () => {
  // Una factura que debe exactamente `monto`: el equipo ya volvió, así que el
  // calendario no le suma días y la cuenta queda fija.
  const conSaldo = (monto, fecha) =>
    facturaCon(
      [
        equipo({
          cantidadEquipos: 1,
          valorDia: monto,
          diasAlquilados: 1,
          devolucion: { fechaDevolucion: "2026-09-04", buenEstado: true, valorRetenido: 0 },
        }),
      ],
      { factura: { fechaCreacion: fecha } },
    );

  it("el saldo del cliente es NETO entre sus facturas", () => {
    const debe = conSaldo(100000, "2026-09-01");
    const leSobra = facturaCon(
      [
        equipo({
          cantidadEquipos: 1,
          valorDia: 10000,
          diasAlquilados: 1,
          devolucion: { fechaDevolucion: "2026-09-04", buenEstado: true, valorRetenido: 0 },
        }),
      ],
      { pagos: [{ medio: "Efectivo", monto: 40000 }] },
    );
    const cuenta = calcularCuentaCliente([debe, leSobra], HOY);
    expect(cuenta.saldoPendiente).toBe(70000); // 100.000 − 30.000 a favor
  });

  it("el abono va primero a la MÁS ANTIGUA, aunque deba menos", () => {
    // La vieja debe 500.000 y la nueva 800.000: manda la fecha, no el monto.
    // Con el criterio anterior —primero la que más debe— una factura chica y
    // vieja se quedaba abierta mientras los abonos se iban a una grande y
    // reciente, y la vieja es la que está más cerca de volverse incobrable.
    const vieja = conSaldo(500000, "2026-09-01");
    const nueva = conSaldo(800000, "2026-09-02");
    const orden = ordenarFacturasConSaldo([nueva, vieja], HOY);
    expect(orden[0].cuenta.saldoPendiente).toBe(500000);
    expect(orden[1].cuenta.saldoPendiente).toBe(800000);
  });

  it("dos del mismo día se ordenan por número de factura", () => {
    const conNumero = (numero, monto) =>
      facturaCon(
        [
          equipo({
            cantidadEquipos: 1,
            valorDia: monto,
            diasAlquilados: 1,
            devolucion: { fechaDevolucion: "2026-09-04", buenEstado: true, valorRetenido: 0 },
          }),
        ],
        { factura: { fechaCreacion: "2026-09-01", numeroFactura: numero } },
      );

    // Como números, no como texto: la 9 va antes que la 10.
    const orden = ordenarFacturasConSaldo(
      [conNumero("10", 300000), conNumero("9", 700000)],
      HOY,
    );
    expect(orden.map(({ factura }) => factura.factura.numeroFactura)).toEqual(["9", "10"]);
  });

  it("lo que sobra pasa a la siguiente, y el remanente no se pierde", () => {
    const a = conSaldo(100000, "2026-09-01");
    const b = conSaldo(50000, "2026-09-02");
    const reparto = repartirEntreFacturas(ordenarFacturasConSaldo([a, b], HOY), 200000);
    expect(reparto[0].aplicado).toBe(100000);
    expect(reparto[1].aplicado).toBe(100000); // la última se lleva el sobrante
  });

  it("lo que excede el total de un pago no es pago: es abono", () => {
    const { pagos, excedente, medio } = separarExcedentePago(
      [{ medio: "Bancolombia", monto: 200000 }, { medio: "Efectivo", monto: 100000 }],
      250000,
    );
    expect(excedente).toBe(50000);
    expect(medio).toBe("Efectivo");
    expect(pagos).toEqual([
      { medio: "Bancolombia", monto: 200000 },
      { medio: "Efectivo", monto: 50000 },
    ]);
  });

  it("el estado del cliente es el de la factura más urgente", () => {
    const vencida = facturaCon([equipo({ venceEl: "2026-09-01" })]);
    const activa = facturaCon([equipo()]);
    expect(calcularEstadoCliente([activa, vencida], HOY)).toBe("vencida");
    expect(calcularEstadoCliente([], HOY)).toBe("inactivo");
  });
});

describe("los totales del menú", () => {
  it("cuenta los equipos que están en la calle", () => {
    const activa = facturaCon([equipo({ cantidadEquipos: 6 })]);
    const aporte = calcularAporteFactura(activa, HOY);
    expect(aporte.equiposActivos).toBe(6);
  });

  it("los devueltos no están en la calle", () => {
    const doc = facturaCon([
      equipo({ cantidadEquipos: 4, devolucion: { fechaDevolucion: "2026-09-05", buenEstado: true, valorRetenido: 0 } }),
      equipo({ cantidadEquipos: 6 }),
    ]);
    expect(calcularAporteFactura(doc, HOY).equiposActivos).toBe(6);
  });

  it("una factura que no existe aporta cero", () => {
    expect(calcularAporteFactura(null, HOY)).toEqual({
      equiposActivos: 0,
      pagosPendientes: 0,
    });
  });

  it("suma los aportes de varias facturas", () => {
    const doc = facturaCon([equipo({ cantidadEquipos: 2 })]);
    const totales = calcularTotalesFacturas([doc, doc], HOY);
    expect(totales.equiposActivos).toBe(4);
  });
});

describe("las gestiones", () => {
  it("en cobro manda el cobro, sobre cualquier otra cosa", () => {
    const doc = facturaCon([], { gestiones: [{ tipo: "prorroga", fecha: HOY }] });
    expect(calcularGestionFactura(doc, "cobro")).toBe("cobro");
  });

  it("vale la última acción registrada", () => {
    const doc = facturaCon([], {
      gestiones: [
        { tipo: "prorroga", fecha: "2026-09-05" },
        { tipo: "devolucionParcial", fecha: "2026-09-06" },
      ],
    });
    expect(calcularGestionFactura(doc, "vencida")).toBe("devolucionParcial");
  });

  // Lo que importa de una llamada atendida es lo que se acordó en ella, que se
  // anota aparte.
  it("una llamada atendida no tapa la gestión anterior", () => {
    const doc = facturaCon([], {
      gestiones: [
        { tipo: "prorroga", fecha: "2026-09-05" },
        { tipo: "llamada", fecha: "2026-09-06", contesto: true },
      ],
    });
    expect(calcularGestionFactura(doc, "vencida")).toBe("prorroga");
  });

  it("una llamada sin respuesta sí es una gestión", () => {
    const doc = facturaCon([], {
      gestiones: [{ tipo: "llamada", fecha: HOY, contesto: false }],
    });
    expect(calcularGestionFactura(doc, "vencida")).toBe("sinRespuesta");
    expect(contarLlamadasSinRespuesta(doc)).toBe(1);
  });

  it("sin gestiones, sin gestionar", () => {
    expect(calcularGestionFactura(facturaCon([]), "vencida")).toBe("sinGestionar");
  });
});

// EL CICLO EMPIEZA DE NUEVO CON CADA VENCIMIENTO. Lo anotado antes resolvió el
// vencimiento anterior —tanto que hubo renovación— y deja de mandar sobre el
// cobro de hoy. Sigue guardado y se sigue viendo entero en la bitácora: lo que
// cambia es cuál de todos manda en el chip.
describe("las gestiones, cuando el equipo se vuelve a vencer", () => {
  const conTramoAbierto = (gestiones, desde = "2026-09-07") =>
    facturaCon([equipo({ vencidos: [{ desde }] })], { gestiones });

  it("la renovación que resolvió el vencimiento anterior ya no manda", () => {
    const doc = conTramoAbierto([{ tipo: "prorroga", fecha: "2026-09-05" }]);
    expect(calcularGestionFactura(doc, "vencida")).toBe("sinGestionar");
  });

  // Y es la que más mentía: esa llamada terminó contestada —por eso hubo
  // renovación—, así que decir "Sin respuesta" hoy sería al revés de la verdad.
  it("y tampoco la llamada sin respuesta de aquel ciclo", () => {
    const doc = conTramoAbierto([
      { tipo: "llamada", fecha: "2026-09-03", contesto: false },
      { tipo: "prorroga", fecha: "2026-09-05" },
    ]);
    expect(calcularGestionFactura(doc, "vencida")).toBe("sinGestionar");
  });

  it("lo hecho desde que se volvió a vencer sí manda", () => {
    const doc = conTramoAbierto([
      { tipo: "prorroga", fecha: "2026-09-05" },
      { tipo: "llamada", fecha: "2026-09-08", contesto: false },
    ]);
    expect(calcularGestionFactura(doc, "vencida")).toBe("sinRespuesta");
  });

  it("lo del mismo día en que se abrió el tramo cuenta", () => {
    const doc = conTramoAbierto([{ tipo: "prorroga", fecha: "2026-09-07" }]);
    expect(calcularGestionFactura(doc, "vencida")).toBe("prorroga");
  });

  // Con varios equipos manda el que se venció primero: lo que se hizo por ese
  // sigue siendo la gestión de este cobro, aunque hoy se haya vencido otro.
  it("con dos equipos vencidos vale el tramo más viejo", () => {
    const doc = facturaCon(
      [
        equipo({ vencidos: [{ desde: "2026-09-02" }] }),
        equipo({ nombre: "MEZCLADORA", vencidos: [{ desde: "2026-09-08" }] }),
      ],
      { gestiones: [{ tipo: "llamada", fecha: "2026-09-04", contesto: false }] },
    );
    expect(calcularGestionFactura(doc, "vencida")).toBe("sinRespuesta");
  });

  // La que está en cartera solo por la plata no tiene ciclo que reiniciar.
  it("sin ningún equipo vencido sigue mandando la última anotación", () => {
    const doc = facturaCon([equipo()], {
      gestiones: [{ tipo: "prorroga", fecha: "2026-09-05" }],
    });
    expect(calcularGestionFactura(doc, "vencida")).toBe("prorroga");
  });

  // El tramo cerrado es historia: ese vencimiento se resolvió y no reinicia
  // nada. Solo el que sigue corriendo marca desde cuándo se cuenta.
  it("un tramo ya cerrado no reinicia el ciclo", () => {
    const doc = facturaCon(
      [equipo({ vencidos: [{ desde: "2026-09-06", hasta: "2026-09-07" }] })],
      { gestiones: [{ tipo: "prorroga", fecha: "2026-09-05" }] },
    );
    expect(calcularGestionFactura(doc, "vencida")).toBe("prorroga");
  });
});

describe("qué tiene la factura encima", () => {
  it("una recién creada no tiene nada", () => {
    const nueva = facturaCon([equipo()]);
    expect(movimientosFactura(nueva).hayAlgo).toBe(false);
    expect(describirMovimientosFactura(nueva)).toEqual([]);
  });

  it("lista los abonos, los despachos agregados y los equipos con historia", () => {
    const conTodo = facturaCon(
      [
        equipo({
          devolucion: { fechaDevolucion: "2026-09-06", buenEstado: true, valorRetenido: 0 },
        }),
      ],
      {
        factura: { depositoResuelto: true },
        abonos: [{ fecha: HOY, medio: "Nequi", monto: 100000, tipo: "sistema" }],
        grupos: [
          {
            grupo: "grupo-agregados-1",
            fechaSolicitud: "2026-09-06",
            pagos: { tipoPago: "sinPago", medios: [] },
            adicionales: {},
            equipos: [],
          },
        ],
      },
    );
    const movimientos = movimientosFactura(conTodo);
    expect(movimientos.cantidadAbonos).toBe(1);
    expect(movimientos.cantidadAgregados).toBe(1);
    expect(movimientos.equiposConHistoria).toHaveLength(1);
    expect(movimientos.depositoResuelto).toBe(true);
    expect(describirMovimientosFactura(conTodo)).toEqual([
      "1 abono",
      "1 despacho agregado",
      "1 equipo con ampliación o devolución",
      "el depósito ya resuelto",
    ]);
  });
});

// ── ¿El equipo ya estaba vencido cuando se le renovó? ──────────────────
//
// Sale del caso real de la 0123 de ReYaz: 10 gatos salieron el 09 por 3 días,
// vencían el 11, y ESE MISMO 11 se les pactaron 4 más. No se pasó ni un día
// —la renovación quedó con cero días vencidos— pero el 11 el equipo ya estaba
// vencido y su factura ya estaba en cartera.
//
// Antes esto no lo calculaba nadie: con los días vencidos solos, ese caso se
