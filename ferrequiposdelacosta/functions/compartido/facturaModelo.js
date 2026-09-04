// ⚠️  ARCHIVO GENERADO — NO EDITAR A MANO.
//
// Es una copia de src/Components/ClienteDetalle/facturaModelo.js, hecha por
// scripts/sincronizar-calculos.js en cada despliegue. Cualquier cambio que se
// escriba acá se pierde en el próximo deploy.
//
// Para cambiar una cuenta, tocá el original. Es el mismo archivo que usa la
// app, así que la corrección vale para las dos partes a la vez.

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
//   factura{}     lo del documento: numeroFactura, fechaCreacion, tipoPago,
//                 aplicaIva, la foto de lo que se emitió (subtotal, valorIva,
//                 total) y las dos marcas que sí se guardan:
//                 depositoResuelto y cerrada.
//
//   grupos[]      un despacho cada uno:
//                   grupo            "grupo-inicial" | "grupo-agregados-N"
//                   fechaSolicitud
//                   pagos[]          { medio, monto, tipoPago }
//                   adicionales{}    { transporte, valorTransporte,
//                                      deposito, valorDeposito }
//                   equipos[]        { nombre, cantidadEquipos, valorDia,
//                                      diasAlquilados, fechaDespacho,
//                                      fechaVencimiento, aplicaIva?,
//                                      vencimientoIndefinido?,
//                                      ampliaciones[], devolucion{}? }
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

export const pagosDe = (grupo) => lista(grupo?.pagos);
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
export const nuevoGrupo = ({ grupo, fechaSolicitud, pagos, adicionales, equipos }) => ({
  grupo,
  fechaSolicitud,
  pagos: lista(pagos),
  adicionales: adicionales ?? {
    transporte: "",
    valorTransporte: 0,
    deposito: false,
    valorDeposito: 0,
  },
  equipos: lista(equipos),
});
