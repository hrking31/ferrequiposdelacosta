// EL MODELO DE LA FACTURA: cómo está armado el documento.
//
// Acá no hay cuentas —eso es facturaCalculos.js—: hay una sola cosa, que es
// saber DÓNDE vive cada dato. Y es el único archivo que lo sabe, así que mover
// un campo se hace en un solo lugar.
//
// ── La forma del documento ────────────────────────────────────────────
//
//   clientes/{clienteId}/facturas/{facturaId}
//
//   factura{}     lo del documento: numeroFactura, fechaCreacion y las dos
//                 marcas que sí se guardan: depositoResuelto y cerrada. Nada
//                 más. El subtotal, el IVA, el total, el tipo de pago y la
//                 marca de IVA vivían acá y se fueron —ver abajo.
//
//   grupos[]      un despacho cada uno:
//                   grupo            "grupo-inicial" | "grupo-agregados-N"
//                   fechaSolicitud
//                   pagos{}          cómo se pagó ESTE despacho:
//                                      tipoPago  total|parcial|conAbono|sinPago
//                                      medios[]  { medio, monto }
//                   adicionales{}    { transporte, valorTransporte,
//                                      deposito, valorDeposito }
//                   equipos[]        { nombre, cantidadEquipos, valorDia,
//                                      diasAlquilados, fechaDespacho,
//                                      fechaVencimiento, aplicaIva,
//                                      vencimientoIndefinido?,
//                                      ampliaciones[], devolucion{}? }
//
//                   devolucion{}    fechaDevolucion, buenEstado,
//                                   motivo          qué le PASÓ (si volvió mal)
//                                   valorRetenido
//                                   motivoDevolucion?  por qué lo DEVUELVE,
//                                                      solo si lo anotaron
//
//   abonos[]      la plata que ENTRA después:
//                   { fecha, medio, monto, tipo, desdeFactura? }
//                   tipo: "sistema" | "cliente" | "agregado"
//
//   entregas[]    la plata que SALE hacia el cliente, el reverso del abono:
//                   { fecha, medio, monto, nota }
//
//   gestiones[]   la bitácora de la cobranza.
//
// ── Las tres decisiones que sostienen esta forma ──────────────────────
//
// **Nada suelto en la raíz.** Abrir una factura en Firebase es leer cuatro
// nombres, no veinte campos en fila.
//
// **La plata del despacho vive en el GRUPO, no en el equipo.** Un solo flete
// lleva el benitín y los gatos, y un solo pago cubre lo que salió ese día. No
// es prolijidad: cuando una línea de equipo se parte en dos al devolver una
// parte, con el pago abajo había que acordarse de no copiarlo a las dos
// mitades, o la factura lo contaba dos veces y se inventaba un saldo a favor.
// Con el pago en el grupo no hay nada que copiar.
//
// **Se guardan hechos, no conclusiones.** El saldo, el estado de la factura y
// el de cada equipo no están acá: se calculan al mostrarlos, porque cambian
// solos con el calendario. Las dos excepciones son `cerrada` y
// `depositoResuelto`, que solo cambian si alguien escribe.
//
// Por eso salieron el `subtotal`, el `valorIva` y el `total` del nodo
// `factura`. Se guardaban como "la foto de lo que se emitió", pero un total
// guardado nace vencido: al día siguiente el equipo sigue afuera, corre un día
// más y el número ya miente. No era teórico —ese campo es el bug de los
// $144.440, donde lo exigible salía del total viejo y una factura se iba de
// cartera debiendo $1.727.140—. Al final no los leía ninguna pantalla: se
// escribían y se leían a sí mismos.
//
// **El tipo de pago es del despacho, no de la factura.** Un solo dato arriba
// no puede contar que el alta se pagó completa y que el lote agregado la
// semana pasada quedó a deber. Va dentro de `pagos`, con los medios, porque
// es parte de cómo se pagó ese despacho y no un dato suelto al lado.
//
// **El IVA es de cada equipo.** La marca `aplicaIva` se escribe siempre, en
// cada equipo, al crearlo. La factura tenía la suya y los equipos del alta se
// guardaban sin ninguna, así que el IVA se decidía mirando hacia arriba: un
// solo interruptor para toda la factura, y dos criterios distintos según por
// dónde hubiera entrado el equipo. Con la marca puesta en cada uno, un equipo
// exento puede ir al lado de uno gravado.

export const GRUPO_INICIAL = "grupo-inicial";

// El nombre del despacho número n de equipos agregados (1, 2, 3…).
export const grupoAgregados = (n) => `grupo-agregados-${n}`;

// El nombre del próximo grupo de agregados de una factura.
export const siguienteGrupoAgregados = (doc) =>
  grupoAgregados(
    gruposDe(doc).filter((grupo) => grupo?.grupo !== GRUPO_INICIAL).length + 1,
  );

const lista = (valor) => (Array.isArray(valor) ? valor.filter(Boolean) : []);

// ── Los atajos de lectura ─────────────────────────────────────────────

export const datosFactura = (doc) => doc?.factura ?? {};

export const gruposDe = (doc) => lista(doc?.grupos);

// Cómo se pagó un despacho: total, parcial, con abono o sin pago.
export const tipoPagoDe = (grupo) => grupo?.pagos?.tipoPago ?? "sinPago";

export const grupoInicialDe = (doc) =>
  gruposDe(doc).find((grupo) => grupo?.grupo === GRUPO_INICIAL) ?? null;

// Todos los equipos de la factura, con su grupo al lado. Casi ninguna cuenta
// necesita saber de qué despacho salió cada uno, pero la que sí —el flete, el
// depósito, lo que se pagó— lo tiene acá sin volver a recorrer nada.
export const equiposDe = (doc) =>
  gruposDe(doc).flatMap((grupo) =>
    lista(grupo.equipos).map((equipo, indice) => ({ equipo, grupo, indice })),
  );

export const abonosDe = (doc) => lista(doc?.abonos);
export const entregasDe = (doc) => lista(doc?.entregas);
export const gestionesDe = (doc) => lista(doc?.gestiones);

// Los medios con los que se pagó un despacho. Sigue devolviendo una lista, así
// que quien recorre pagos no se entera de que ahora cuelgan de un nodo.
export const pagosDe = (grupo) => lista(grupo?.pagos?.medios);
export const adicionalesDe = (grupo) => grupo?.adicionales ?? {};
export const ampliacionesDe = (equipo) => lista(equipo?.ampliaciones);

// ── Lo que se deduce de la forma, no una cuenta ───────────────────────

// Una línea devuelta volvió ENTERA: al devolver una parte, la línea se parte en
// dos. Por eso alcanza con mirar si tiene el nodo, sin restar cantidades.
export const estaDevuelto = (equipo) => Boolean(equipo?.devolucion);
export const sigueAfuera = (equipo) => !equipo?.devolucion;

// Los que todavía están en la obra.
export const equiposAfuera = (doc) =>
  equiposDe(doc).filter(({ equipo }) => sigueAfuera(equipo));

// ── Cómo se arma un documento nuevo ───────────────────────────────────

// Una factura recién creada: su primer despacho y nada más. Los abonos, las
// entregas y las gestiones nacen vacíos porque todavía no pasó nada.
export const nuevaFactura = ({ factura, grupoInicial }) => ({
  factura,
  grupos: grupoInicial ? [grupoInicial] : [],
  abonos: [],
  entregas: [],
  gestiones: [],
});

// Un despacho: su plata y sus equipos.
export const nuevoGrupo = ({
  grupo,
  fechaSolicitud,
  tipoPago,
  pagos,
  adicionales,
  equipos,
}) => ({
  grupo,
  fechaSolicitud,
  // Todo lo del pago de ESTE despacho junto: cómo se pagó y con qué medios.
  //
  // El tipo estaba arriba, en la factura, uno solo para todos, y no alcanzaba:
  // el alta puede ir pagada completa y el lote agregado a los días quedar sin
  // pagar. Y va acá y no suelto al lado porque un despacho tiene UN tipo de
  // pago con uno o varios medios —parte por Nequi, parte en efectivo—, no un
  // tipo por medio. Repetido en cada medio, además, se perdería justo en el
  // caso "sin pago", donde no hay ningún medio que anotar.
  pagos: {
    tipoPago: tipoPago ?? "sinPago",
    medios: lista(pagos),
  },
  adicionales: adicionales ?? {
    transporte: "",
    valorTransporte: 0,
    deposito: false,
    valorDeposito: 0,
  },
  equipos: lista(equipos),
});
