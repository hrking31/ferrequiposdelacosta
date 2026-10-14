import { describe, it, expect } from "vitest";
import {
  borradorDe,
  equipoNuevoEnBorrador,
  erroresDelBorrador,
  facturaCorregida,
  hayCorrecciones,
  quitarHecho,
} from "./correccionFactura";
import {
  calcularCuentaFactura,
  calcularEstadoFactura,
  rearmarEquipo,
} from "./facturaCuentas";
import { grupoAgregados } from "./facturaModelo";
import {
  unEquipo,
  unEquipoDevuelto,
  unGrupo,
  unTramoVencido,
  unaAmpliacion,
  unaFactura,
} from "../../test/facturas";

// CORREGIR UNA FACTURA YA CARGADA. Lo que se fija acá es lo que se ESCRIBE:
// que el dato corregido quede, que los días vencidos se rehagan, y —sobre
// todo— que lo que nadie tocó salga idéntico. Son facturas reales.
const HOY = "2026-10-13";

// El caso que lo pidió: 6 cerchas a $1.500 que salieron el 01/09 por 7 días y
// volvieron a tiempo, pero la factura se digitó el 10/10 y la devolución quedó
// con esa fecha. 33 días de mora que no existieron.
const cerchasDevueltasTarde = () =>
  unEquipoDevuelto({
    nombre: "CERCHAS METALICAS",
    cantidad: 6,
    valorDia: 1500,
    dias: 7,
    fechaDespacho: "2026-09-01",
    aplicaIva: false,
    vencidos: [unTramoVencido({ desde: "2026-09-08", hasta: "2026-10-10" })],
    fechaDevolucion: "2026-10-10",
  });

const facturaVieja = (extra = {}) => ({
  id: "f1",
  ...unaFactura({
    numeroFactura: "0412",
    fechaCreacion: "2026-09-01",
    tipoPago: "total",
    pagos: [{ medio: "Efectivo", monto: 113000 }],
    valorDeposito: 50000,
    depositoResuelto: { retenido: 0, motivo: "", fecha: "2026-10-10" },
    equipos: [cerchasDevueltasTarde()],
    ...extra,
  }),
});

// Cambia un hecho del primer equipo del primer despacho.
const conHecho = (borrador, tipo, cambio) => ({
  ...borrador,
  grupos: borrador.grupos.map((grupo, posicion) =>
    posicion > 0
      ? grupo
      : {
          ...grupo,
          equipos: grupo.equipos.map((item, indice) =>
            indice > 0
              ? item
              : {
                  ...item,
                  hechos: item.hechos
                    .map((hecho) =>
                      hecho.tipo === tipo ? (cambio ? { ...hecho, ...cambio } : null) : hecho,
                    )
                    .filter(Boolean),
                },
          ),
        },
  ),
});

const conEquipo = (borrador, cambio, indiceEquipo = 0) => ({
  ...borrador,
  grupos: borrador.grupos.map((grupo, posicion) =>
    posicion > 0
      ? grupo
      : {
          ...grupo,
          equipos: grupo.equipos.map((item, indice) =>
            indice === indiceEquipo ? { ...item, ...cambio } : item,
          ),
        },
  ),
});

describe("corregir una factura — lo que nadie tocó", () => {
  it("sin cambios no hay nada que guardar", () => {
    const factura = facturaVieja();

    expect(hayCorrecciones(factura, borradorDe(factura))).toBe(false);
  });

  it("y el documento sale idéntico: los mismos equipos, ni uno rearmado", () => {
    const factura = facturaVieja();
    const corregida = facturaCorregida(factura, borradorDe(factura), HOY);

    expect(corregida.grupos).toEqual(factura.grupos);
    expect(corregida.grupos[0].equipos[0]).toBe(factura.grupos[0].equipos[0]);
    expect(corregida.grupos[0].pagos).toBe(factura.grupos[0].pagos);
    expect(corregida.grupos[0].adicionales).toBe(factura.grupos[0].adicionales);
    expect(corregida.factura.depositoResuelto).toBe(factura.factura.depositoResuelto);
    expect(corregida.abonos).toEqual(factura.abonos);
  });

  // Lo escrito en una casilla llega como texto: volver a escribir el mismo
  // número no es corregir nada.
  it("escribir el mismo valor no cuenta como cambio", () => {
    const factura = facturaVieja();
    const borrador = conEquipo(borradorDe(factura), { cantidad: "6", valor: "1500" });

    expect(hayCorrecciones(factura, borrador)).toBe(false);
    expect(facturaCorregida(factura, borrador, HOY).grupos[0].equipos[0]).toBe(
      factura.grupos[0].equipos[0],
    );
  });

  it("corregir un equipo deja intacto al de al lado", () => {
    const vecino = unEquipo({
      nombre: "ANDAMIO",
      cantidad: 4,
      dias: 5,
      fechaDespacho: "2026-09-01",
      aplicaIva: false,
      vencidos: [unTramoVencido({ desde: "2026-09-06", hasta: null })],
    });
    const factura = facturaVieja({ equipos: [cerchasDevueltasTarde(), vecino] });

    const corregida = facturaCorregida(
      factura,
      conHecho(borradorDe(factura), "devolucion", { fecha: "2026-09-07" }),
      HOY,
    );

    expect(corregida.grupos[0].equipos[1]).toBe(factura.grupos[0].equipos[1]);
  });

  it("y tampoco toca los despachos agregados", () => {
    const agregado = unGrupo({
      grupo: grupoAgregados(1),
      fechaSolicitud: "2026-09-03",
      equipos: [unEquipo({ nombre: "RANA", fechaDespacho: "2026-09-03", aplicaIva: false })],
    });
    const base = facturaVieja();
    const factura = { ...base, grupos: [...base.grupos, agregado] };

    const corregida = facturaCorregida(
      factura,
      conHecho(borradorDe(factura), "devolucion", { fecha: "2026-09-07" }),
      HOY,
    );

    expect(corregida.grupos[1]).toEqual(agregado);
    expect(corregida.grupos[1].equipos[0]).toBe(agregado.equipos[0]);
  });
});

describe("corregir una factura — la devolución anotada un mes tarde", () => {
  it("como quedó cargada debe $297.000 de mora", () => {
    const cuenta = calcularCuentaFactura(facturaVieja(), HOY);

    expect(cuenta.netoVencido).toBe(297000);
    expect(cuenta.saldoPendiente).toBe(297000);
    expect(calcularEstadoFactura(facturaVieja(), HOY)).toBe("cobro");
  });

  it("con la fecha real, la mora desaparece y la factura queda finalizada", () => {
    const factura = facturaVieja();
    const borrador = conHecho(borradorDe(factura), "devolucion", { fecha: "2026-09-07" });

    expect(hayCorrecciones(factura, borrador)).toBe(true);
    expect(erroresDelBorrador(borrador, HOY)).toEqual([]);

    const corregida = facturaCorregida(factura, borrador, HOY);
    const [equipo] = corregida.grupos[0].equipos;
    expect(equipo.devolucion.fechaDevolucion).toBe("2026-09-07");
    expect(equipo.vencidos).toEqual([]);

    const cuenta = calcularCuentaFactura(corregida, HOY);
    expect(cuenta.netoVencido).toBe(0);
    expect(cuenta.saldoPendiente).toBe(0);
    // Sigue sin nada afuera: el depósito sigue resuelto, con su fecha.
    expect(corregida.factura.depositoResuelto).toEqual({
      retenido: 0,
      motivo: "",
      fecha: "2026-10-10",
    });
  });

  it("quitar la devolución deja el equipo afuera y el depósito otra vez pendiente", () => {
    const factura = facturaVieja();
    const corregida = facturaCorregida(
      factura,
      conHecho(borradorDe(factura), "devolucion", null),
      HOY,
    );

    const [equipo] = corregida.grupos[0].equipos;
    expect(equipo.devolucion).toBeUndefined();
    expect(equipo.vencidos).toEqual([
      { desde: "2026-09-08", hasta: null, indefinida: false },
    ]);
    expect(corregida.factura.depositoResuelto).toBe(false);
    expect(corregida.factura.cerrada).toBe(false);
    expect(calcularEstadoFactura(corregida, HOY)).toBe("vencida");
  });

  it("corregir lo retenido actualiza lo que se resolvió del depósito", () => {
    const factura = facturaVieja();
    const [{ devolucion }] = factura.grupos[0].equipos;
    const corregida = facturaCorregida(
      factura,
      conHecho(borradorDe(factura), "devolucion", {
        devolucion: {
          ...devolucion,
          buenEstado: false,
          motivo: "Una doblada",
          valorRetenido: 20000,
        },
      }),
      HOY,
    );

    expect(corregida.factura.depositoResuelto).toEqual({
      retenido: 20000,
      motivo: "CERCHAS METALICAS: Una doblada",
      fecha: "2026-10-10",
    });
  });
});

describe("corregir una factura — los datos del equipo y del despacho", () => {
  it("corrige la cantidad, el precio y los días sin perder la devolución", () => {
    const factura = facturaVieja();
    const corregida = facturaCorregida(
      factura,
      conEquipo(
        conHecho(borradorDe(factura), "devolucion", { fecha: "2026-09-07" }),
        { cantidad: "8", valor: "2000", dias: "5" },
      ),
      HOY,
    );

    const [equipo] = corregida.grupos[0].equipos;
    expect(equipo).toMatchObject({
      nombre: "CERCHAS METALICAS",
      cantidadEquipos: 8,
      valorDia: 2000,
      diasAlquilados: 5,
    });
    // Con 5 días estaba cubierto hasta el 05/09: volvió el 07, dos de mora.
    expect(equipo.vencidos).toEqual([
      { desde: "2026-09-06", hasta: "2026-09-07", indefinida: false },
    ]);
  });

  it("al cambiar los días se corre la ampliación que vino después", () => {
    const ampliado = unEquipo({
      nombre: "ANDAMIO",
      cantidad: 4,
      dias: 5,
      fechaDespacho: "2026-09-01",
      aplicaIva: false,
      ampliaciones: [unaAmpliacion({ fecha: "2026-09-05", dias: 3, desde: "2026-09-06" })],
    });
    const factura = facturaVieja({ equipos: [ampliado] });

    const corregida = facturaCorregida(
      factura,
      conEquipo(borradorDe(factura), { dias: "4" }),
      "2026-09-06",
    );

    // Con 4 días vencía el 04: la ampliación del 05 lo encuentra con un día
    // vencido, y sus 3 días arrancan el 06 igual.
    const [equipo] = corregida.grupos[0].equipos;
    expect(equipo.vencidos).toEqual([
      { desde: "2026-09-05", hasta: "2026-09-05", indefinida: false },
    ]);
    expect(equipo.ampliaciones[0]).toMatchObject({
      fecha: "2026-09-05",
      desde: "2026-09-06",
      hasta: "2026-09-08",
    });
  });

  it("corrige el número, el transporte, el depósito y el pago del despacho", () => {
    const factura = facturaVieja();
    const inicial = borradorDe(factura);
    const borrador = {
      ...inicial,
      numeroFactura: " 0413 ",
      grupos: [
        {
          ...inicial.grupos[0],
          transporte: "Solo ida",
          valorTransporte: "15000",
          valorDeposito: "80000",
          tipoPago: "parcial",
          pagos: [
            { medio: "Nequi", monto: "100000" },
            // Un renglón a medio llenar no es un pago.
            { medio: "", monto: "" },
          ],
        },
      ],
    };

    const corregida = facturaCorregida(factura, borrador, HOY);

    expect(corregida.factura.numeroFactura).toBe("0413");
    expect(corregida.grupos[0].adicionales).toEqual({
      transporte: "Solo ida",
      valorTransporte: 15000,
      deposito: true,
      valorDeposito: 80000,
    });
    expect(corregida.grupos[0].pagos).toEqual({
      tipoPago: "parcial",
      medios: [{ medio: "Nequi", monto: 100000 }],
    });
    // Y el equipo, que no se tocó, sigue siendo el mismo.
    expect(corregida.grupos[0].equipos[0]).toBe(factura.grupos[0].equipos[0]);
  });

  it("se puede cargar el equipo que faltó y quitar el que sobraba", () => {
    const factura = facturaVieja();
    const inicial = borradorDe(factura);
    const borrador = {
      ...inicial,
      grupos: [
        {
          ...inicial.grupos[0],
          equipos: [
            {
              ...equipoNuevoEnBorrador("nuevo-1", "2026-09-01", false),
              nombre: "TABLONES",
              cantidad: "2",
              dias: "3",
              valor: "4000",
            },
          ],
        },
      ],
    };

    expect(erroresDelBorrador(borrador, "2026-09-02")).toEqual([]);
    const corregida = facturaCorregida(factura, borrador, "2026-09-02");

    expect(corregida.grupos[0].equipos).toEqual([
      {
        nombre: "TABLONES",
        cantidadEquipos: 2,
        valorDia: 4000,
        diasAlquilados: 3,
        fechaDespacho: "2026-09-01",
        aplicaIva: false,
        ampliaciones: [],
        vencidos: [],
      },
    ]);
    // Quedó un equipo afuera: el depósito vuelve a estar pendiente.
    expect(corregida.factura.depositoResuelto).toBe(false);
  });
});

describe("corregir una factura — lo que no deja guardar", () => {
  const errores = (borrador) => erroresDelBorrador(borrador, HOY);
  const inicial = () => borradorDe(facturaVieja());

  it("una factura bien cargada no tiene errores", () => {
    expect(errores(inicial())).toEqual([]);
  });

  it("pide el número y la fecha", () => {
    expect(errores({ ...inicial(), numeroFactura: "  ", fechaCreacion: "" })).toEqual([
      "Falta el número de la factura.",
      "Falta la fecha de creación.",
    ]);
  });

  it("dice a qué equipo le falta cada dato", () => {
    expect(errores(conEquipo(inicial(), { cantidad: "0", valor: "" }))).toEqual([
      "CERCHAS METALICAS: la cantidad no es válida.",
      "CERCHAS METALICAS: el precio por día no es válido.",
    ]);
  });

  it("la devolución no puede ser anterior al despacho ni futura", () => {
    expect(errores(conHecho(inicial(), "devolucion", { fecha: "2026-08-31" }))).toEqual([
      "CERCHAS METALICAS: la devolución no puede ser anterior al despacho.",
    ]);
    expect(errores(conHecho(inicial(), "devolucion", { fecha: "2026-10-14" }))).toEqual([
      "CERCHAS METALICAS: la devolución no puede tener una fecha futura.",
    ]);
  });

  it("ni anterior a una ampliación que el mismo equipo tiene después", () => {
    const ampliadoYDevuelto = unEquipoDevuelto({
      nombre: "ANDAMIO",
      dias: 5,
      fechaDespacho: "2026-09-01",
      ampliaciones: [unaAmpliacion({ fecha: "2026-09-05", dias: 3, desde: "2026-09-06" })],
      fechaDevolucion: "2026-09-08",
    });
    const borrador = conHecho(
      borradorDe(facturaVieja({ equipos: [ampliadoYDevuelto] })),
      "devolucion",
      { fecha: "2026-09-03" },
    );

    expect(errores(borrador)).toEqual([
      "ANDAMIO: la devolución no puede ser anterior a la ampliación del 05/09/2026.",
    ]);
  });

  it("si volvió mal hay que decir qué le pasó, y no retener más que su depósito", () => {
    const borrador = conHecho(inicial(), "devolucion", {
      devolucion: {
        fechaDevolucion: "2026-10-10",
        buenEstado: false,
        motivo: " ",
        valorRetenido: 60000,
      },
    });

    expect(errores(borrador)).toEqual([
      "CERCHAS METALICAS: falta decir qué le pasó.",
      "CERCHAS METALICAS: no se puede retener más que el depósito de su despacho.",
    ]);
  });

  it("un despacho no puede quedar sin equipos", () => {
    const sinEquipos = {
      ...inicial(),
      grupos: [{ ...inicial().grupos[0], equipos: [] }],
    };

    expect(errores(sinEquipos)).toEqual(["Despacho inicial: no puede quedar sin equipos."]);
  });
});

// ── La segunda entrega: ampliaciones, entrega pactada y descuentos ──────
//
// Los equipos de estas pruebas se arman con la misma función que los rearma,
// desde sus hechos: así son exactamente lo que la app habría escrito.
const VOLVIO = {
  fechaDevolucion: "2026-09-10",
  buenEstado: true,
  motivo: "",
  valorRetenido: 0,
};

// Un andamio a $10.000 que salió el 01/09 por 5 días —cubierto hasta el 05—.
// Se pasó el 06 y el 07, y el 07 pidió 3 días más con $5.000 de descuento en
// los nuevos y $4.000 en los dos vencidos. Volvió el 10, en plazo.
const andamioAmpliado = (ampliacion = {}) =>
  rearmarEquipo(
    unEquipo({
      nombre: "ANDAMIO",
      cantidad: 1,
      valorDia: 10000,
      dias: 5,
      fechaDespacho: "2026-09-01",
      aplicaIva: false,
    }),
    [
      {
        tipo: "ampliacion",
        fecha: "2026-09-07",
        dias: 3,
        descuento: 5000,
        descuentoVencidos: 4000,
        ...ampliacion,
      },
      {
        tipo: "devolucion",
        fecha: "2026-09-10",
        cobraElDia: true,
        descuentoVencidos: 0,
        devolucion: VOLVIO,
      },
    ],
    HOY,
  );

// 6 cerchas a $1.500 —$9.000 el día— que salieron el 01/09 por 7 días. Se
// pasaron desde el 08 y el cliente avisó el 10 que ya había terminado: se
// cobran el 08 y el 09, y siguen por recoger.
const cerchasPactadas = (hechos = []) =>
  rearmarEquipo(
    unEquipo({
      nombre: "CERCHAS METALICAS",
      cantidad: 6,
      valorDia: 1500,
      dias: 7,
      fechaDespacho: "2026-09-01",
      aplicaIva: false,
    }),
    [{ tipo: "entregaPactada", fecha: "2026-09-10", descuentoVencidos: 0 }, ...hechos],
    HOY,
  );

const conHechoEn = (borrador, posicion, cambio) =>
  conEquipo(borrador, {
    hechos: borrador.grupos[0].equipos[0].hechos.map((hecho, indice) =>
      indice === posicion ? { ...hecho, ...cambio } : hecho,
    ),
  });

const sinHechoEn = (borrador, posicion) =>
  conEquipo(borrador, {
    hechos: quitarHecho(borrador.grupos[0].equipos[0].hechos, posicion),
  });

describe("corregir una factura — las ampliaciones", () => {
  const factura = () => facturaVieja({ equipos: [andamioAmpliado()] });
  const corregir = (borrador) => facturaCorregida(factura(), borrador, HOY).grupos[0].equipos[0];

  it("como quedó cargado: $75.000 de lo pactado y $16.000 de los vencidos", () => {
    const [equipo] = factura().grupos[0].equipos;

    expect(hayCorrecciones(factura(), borradorDe(factura()))).toBe(false);
    expect(equipo.vencidos).toEqual([
      { desde: "2026-09-06", hasta: "2026-09-07", indefinida: false, descuento: 4000 },
    ]);
    expect(calcularCuentaFactura(factura(), HOY).netoVencido).toBe(16000);
  });

  it("corregir los días corre el fin del plazo, y lo que quedó afuera es mora", () => {
    // Eran 3 días y se pidió 1: cubierto hasta el 08, y el 09 y el 10 se
    // pasó.
    const borrador = conHechoEn(borradorDe(factura()), 0, { dias: "1" });
    expect(erroresDelBorrador(borrador, HOY)).toEqual([]);

    const equipo = corregir(borrador);
    expect(equipo.ampliaciones).toEqual([
      {
        fecha: "2026-09-07",
        dias: 1,
        desde: "2026-09-08",
        hasta: "2026-09-08",
        descuento: 5000,
      },
    ]);
    expect(equipo.vencidos).toEqual([
      { desde: "2026-09-06", hasta: "2026-09-07", indefinida: false, descuento: 4000 },
      { desde: "2026-09-09", hasta: "2026-09-10", indefinida: false },
    ]);
  });

  it("corregir los descuentos los deja donde salen", () => {
    const equipo = corregir(
      conHechoEn(borradorDe(factura()), 0, { descuento: 0, descuentoVencidos: 20000 }),
    );

    expect(equipo.ampliaciones[0].descuento).toBe(0);
    expect(equipo.vencidos[0].descuento).toBe(20000);
  });

  it("quitarla: los días que cubría pasan a ser mora, sin el descuento", () => {
    const borrador = sinHechoEn(borradorDe(factura()), 0);
    expect(erroresDelBorrador(borrador, HOY)).toEqual([]);

    const equipo = corregir(borrador);
    expect(equipo.ampliaciones).toEqual([]);
    expect(equipo.vencidos).toEqual([
      { desde: "2026-09-06", hasta: "2026-09-10", indefinida: false },
    ]);
  });

  it("y el descuento en los vencidos de la devolución se puede corregir", () => {
    const sinAmpliacion = sinHechoEn(borradorDe(factura()), 0);
    const corregida = facturaCorregida(
      factura(),
      conHechoEn(sinAmpliacion, 0, { descuentoVencidos: 10000 }),
      HOY,
    );

    expect(corregida.grupos[0].equipos[0].vencidos[0].descuento).toBe(10000);
    // 5 días a $10.000, menos los $10.000.
    expect(calcularCuentaFactura(corregida, HOY).netoVencido).toBe(40000);
  });

  it("si se mueve a un día sin vencidos, su descuento de vencidos no tiene de dónde salir", () => {
    // El 05 todavía estaba cubierto: ese día no se cerró ningún día vencido.
    const borrador = conHechoEn(borradorDe(factura()), 0, { fecha: "2026-09-05" });

    expect(erroresDelBorrador(borrador, HOY)).toEqual([
      "ANDAMIO: la ampliación del 05/09/2026 trae descuento en los días vencidos, pero ese día no se cerró ningún día vencido.",
    ]);
    // Sin ese descuento, sí.
    expect(
      erroresDelBorrador(conHechoEn(borrador, 0, { descuentoVencidos: 0 }), HOY),
    ).toEqual([]);
  });

  it("ningún descuento puede pasar de lo que valen sus días", () => {
    const vencidos = erroresDelBorrador(
      conHechoEn(borradorDe(factura()), 0, { descuentoVencidos: 25000 }),
      HOY,
    );
    expect(vencidos).toHaveLength(1);
    expect(vencidos[0]).toMatch(
      /^ANDAMIO: el descuento en los días vencidos de la ampliación del 07\/09\/2026 pasa de lo que valen esos días/,
    );

    expect(
      erroresDelBorrador(conHechoEn(borradorDe(factura()), 0, { descuento: 40000 }), HOY),
    ).toEqual([
      "ANDAMIO: el descuento en los días nuevos de la ampliación del 07/09/2026 pasa de lo que valen esos días.",
    ]);
  });

  it("una ampliación sin días no se guarda", () => {
    expect(
      erroresDelBorrador(conHechoEn(borradorDe(factura()), 0, { dias: "" }), HOY),
    ).toEqual(["ANDAMIO: la ampliación del 07/09/2026 necesita los días que se pidieron."]);
  });
});

describe("corregir una factura — la entrega pactada", () => {
  const factura = (hechos) => facturaVieja({ equipos: [cerchasPactadas(hechos)] });
  const corregir = (documento, borrador) =>
    facturaCorregida(documento, borrador, HOY).grupos[0].equipos[0];

  it("corregir la fecha del aviso mueve hasta dónde se cobra", () => {
    const documento = factura();
    // Avisó el 12, no el 10: se cobran del 08 al 11.
    const equipo = corregir(documento, conHechoEn(borradorDe(documento), 0, { fecha: "2026-09-12" }));

    expect(equipo.entregaPactada).toEqual({ fecha: "2026-09-12" });
    expect(equipo.vencidos).toEqual([
      { desde: "2026-09-08", hasta: "2026-09-11", indefinida: false },
    ]);
  });

  it("quitarla: la cuenta vuelve a correr como si nunca hubiera parado", () => {
    const documento = factura();
    const corregida = facturaCorregida(documento, sinHechoEn(borradorDe(documento), 0), HOY);
    const [equipo] = corregida.grupos[0].equipos;

    expect(equipo.entregaPactada).toBeUndefined();
    expect(equipo.vencidos).toEqual([
      { desde: "2026-09-08", hasta: null, indefinida: false },
    ]);
    expect(calcularEstadoFactura(corregida, HOY)).toBe("vencida");
  });

  it("quitar la entrega se lleva también su anulación", () => {
    const documento = factura([{ tipo: "entregaAnulada", fecha: "2026-09-20" }]);
    const { hechos } = borradorDe(documento).grupos[0].equipos[0];

    expect(hechos.map(({ tipo }) => tipo)).toEqual(["entregaPactada", "entregaAnulada"]);
    expect(quitarHecho(hechos, 0)).toEqual([]);
    // Quitar solo la anulación deja la entrega vigente.
    expect(quitarHecho(hechos, 1).map(({ tipo }) => tipo)).toEqual(["entregaPactada"]);
  });

  it("la anulación no puede ser anterior a la entrega", () => {
    const documento = factura([{ tipo: "entregaAnulada", fecha: "2026-09-20" }]);

    expect(
      erroresDelBorrador(conHechoEn(borradorDe(documento), 1, { fecha: "2026-09-09" }), HOY),
    ).toEqual(["CERCHAS METALICAS: la anulación no puede ser anterior a la entrega pactada."]);
  });

  it("mientras está vigente no puede pasar nada más que la devolución", () => {
    // Pidió 3 días el 08 y avisó el 15. Si el aviso se corre al 05, la
    // ampliación del 08 queda después de un equipo que solo esperaba que lo
    // recogieran.
    const documento = facturaVieja({
      equipos: [
        rearmarEquipo(
          unEquipo({
            nombre: "CERCHAS METALICAS",
            cantidad: 6,
            valorDia: 1500,
            dias: 7,
            fechaDespacho: "2026-09-01",
            aplicaIva: false,
          }),
          [
            { tipo: "ampliacion", fecha: "2026-09-08", dias: 3, descuento: 0, descuentoVencidos: 0 },
            { tipo: "entregaPactada", fecha: "2026-09-15", descuentoVencidos: 0 },
          ],
          HOY,
        ),
      ],
    });

    expect(
      erroresDelBorrador(conHechoEn(borradorDe(documento), 1, { fecha: "2026-09-05" }), HOY),
    ).toEqual([
      "CERCHAS METALICAS: la ampliación del 08/09/2026 no puede ser posterior a la entrega pactada del 05/09/2026.",
    ]);
  });
});

describe("corregir una factura — el cierre de mora que hizo un pago", () => {
  it("se le corrige el descuento, y el tramo lo lleva", () => {
    // Las cerchas se pasaron el 08 y el 09, y un pago del 09 saldó la mora.
    // Siguen afuera: desde el 10 corre otra.
    const conSello = rearmarEquipo(
      unEquipo({
        nombre: "CERCHAS METALICAS",
        cantidad: 6,
        valorDia: 1500,
        dias: 7,
        fechaDespacho: "2026-09-01",
        aplicaIva: false,
      }),
      [{ tipo: "sello", fecha: "2026-09-09", descuentoVencidos: 0 }],
      HOY,
    );
    const documento = facturaVieja({ equipos: [conSello] });
    const borrador = borradorDe(documento);
    const posicion = borrador.grupos[0].equipos[0].hechos.findIndex(
      ({ tipo }) => tipo === "sello",
    );

    const corregida = facturaCorregida(
      documento,
      conHechoEn(borrador, posicion, { descuentoVencidos: 9000 }),
      HOY,
    );

    expect(posicion).toBe(0);
    expect(corregida.grupos[0].equipos[0].vencidos).toEqual([
      { desde: "2026-09-08", hasta: "2026-09-09", indefinida: false, descuento: 9000 },
      { desde: "2026-09-10", hasta: null, indefinida: false },
    ]);
  });
});
