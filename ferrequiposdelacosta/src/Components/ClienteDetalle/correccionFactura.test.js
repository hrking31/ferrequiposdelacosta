import { describe, it, expect } from "vitest";
import {
  borradorDe,
  equipoNuevoEnBorrador,
  erroresDelBorrador,
  facturaCorregida,
  hayCorrecciones,
} from "./correccionFactura";
import { calcularCuentaFactura, calcularEstadoFactura } from "./facturaCuentas";
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
