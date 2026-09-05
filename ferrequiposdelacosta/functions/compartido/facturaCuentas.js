// ⚠️  ARCHIVO GENERADO — NO EDITAR A MANO.
//
// Es una copia de src/Components/ClienteDetalle/facturaCuentas.js, hecha por
// scripts/sincronizar-calculos.js en cada despliegue. Cualquier cambio que se
// escriba acá se pierde en el próximo deploy.
//
// Para cambiar una cuenta, tocá el original. Es el mismo archivo que usa la
// app, así que la corrección vale para las dos partes a la vez.

// LAS CUENTAS de una factura: qué se cobra, cuánto se debe y en qué estado
// está cada cosa. Todo sale de los datos guardados y de la fecha de hoy.
//
// Este archivo NO sabe nada de pantalla: ni un ícono, ni un color, ni un
// componente. Es un requisito, no prolijidad — una copia corre en el servidor,
// dentro de la Cloud Function que mantiene los totales del menú, y allá no
// existe React.
//
// ── La regla que ordena todo ──────────────────────────────────────────
//
// **Se guardan hechos, se calculan conclusiones.** Un equipo se vence solo a
// la medianoche sin que nadie escriba nada, así que su estado no puede estar
// guardado: un dato guardado no se entera de algo que no pasó. Lo mismo el
// saldo y el estado de la factura.
//
// Las dos únicas excepciones —`cerrada` y `depositoResuelto`— solo cambian si
// alguien escribe, y por eso sí se guardan.
//
// ── Cómo se cobra un equipo ───────────────────────────────────────────
//
// Siempre la misma multiplicación: **cantidad × valor del día × días**. Lo
// único que cambia es de dónde salen los días:
//
//   ya volvió    los que usó, que quedaron congelados en `diasAlquilados` el
//                día que volvió (ver el modelo). Si volvió antes, ahí ya están
//                los pocos días que estuvo afuera; si se pasó, los de más.
//
//   sigue afuera lo pactado —`diasAlquilados` más los días de cada
//                ampliación— y, si ya se pasó de la fecha, los que lleva
//                corriendo desde que salió.
//
// No hay créditos que restar ni excepciones que recordar. La versión anterior
// necesitaba una maquinaria aparte para descontar los días que el cliente
// pagó y no usó, y de ahí salieron dos errores de plata.

import {
  abonosDe,
  adicionalesDe,
  ampliacionesDe,
  datosFactura,
  entregasDe,
  equiposDe,
  gestionesDe,
  gruposDe,
  pagosDe,
  sigueAfuera,
// Con la extensión .js, y es obligatorio: este archivo viaja como copia al
// servidor, y allá lo carga Node directamente. Node exige la extensión en los
// imports relativos; Vite la completa solo, así que sin ella funciona en la
// app y el despliegue de las funciones falla.
} from "./facturaModelo.js";

// Medios de pago que maneja la empresa (Nequi y Nequi A son cuentas Nequi
// distintas, de dos personas diferentes).
export const MODOS_PAGO = ["Nequi", "Nequi A", "Bancolombia", "Daviplata", "Efectivo"];

export const IVA = 0.19;

const numero = (valor) => Number(valor) || 0;
const sumar = (lista, campo) =>
  (Array.isArray(lista) ? lista : []).reduce(
    (total, item) => total + numero(item?.[campo]),
    0,
  );

// ── Fechas ─────────────────────────────────────────────────────────────

const obtenerHoraBogota = () =>
  Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Bogota",
      hour: "numeric",
      hour12: false,
    }).format(new Date()),
  );

// La fecha de hoy en Colombia, en formato AAAA-MM-DD. Es la referencia de
// todos los cálculos que dependen del calendario.
export const obtenerFechaHoyBogota = () => {
  const [anio, mes, dia] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .split("-");
  return `${anio}-${mes}-${dia}`;
};

// Regla de negocio: antes de las 3pm (hora Colombia) el alquiler arranca el
// mismo día; a partir de las 3pm arranca al día siguiente.
export const obtenerFechaInicialEfectiva = () => {
  const horaBogota = obtenerHoraBogota();
  const [anio, mes, dia] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .split("-")
    .map(Number);

  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (horaBogota >= 15) fecha.setUTCDate(fecha.getUTCDate() + 1);
  return aIso(fecha);
};

const aIso = (fecha) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${fecha.getUTCFullYear()}-${pad(fecha.getUTCMonth() + 1)}-${pad(fecha.getUTCDate())}`;
};

// Días calendario entre dos fechas. Positivo si "hasta" es posterior.
export const diferenciaEnDias = (desdeIso, hastaIso) => {
  if (!desdeIso || !hastaIso) return 0;
  const [a1, m1, d1] = desdeIso.split("-").map(Number);
  const [a2, m2, d2] = hastaIso.split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000);
};

// Días de alquiler entre dos fechas, contando el día de salida como el
// primero: sale y vuelve el mismo día son 1 día, no 0.
export const diasDeAlquiler = (desdeIso, hastaIso) =>
  desdeIso && hastaIso ? diferenciaEnDias(desdeIso, hastaIso) + 1 : 0;

// Fecha de devolución = despacho + días, contando el propio día de despacho
// (despacho el 23 por 2 días → vence el 24, no el 25).
export const calcularFechaDevolucion = (fechaIso, dias) => {
  if (!fechaIso || !dias) return null;
  const [anio, mes, dia] = fechaIso.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  fecha.setUTCDate(fecha.getUTCDate() + numero(dias) - 1);
  return aIso(fecha);
};

// Extiende un vencimiento ya existente: esos días se suman completos, sin
// restar 1, porque el día de vencimiento actual ya está contado.
export const calcularVencimiento = (fechaIso, dias) => {
  if (!fechaIso || !dias) return null;
  const [anio, mes, dia] = fechaIso.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  fecha.setUTCDate(fecha.getUTCDate() + numero(dias));
  return aIso(fecha);
};

// ── La cuenta de un equipo ─────────────────────────────────────────────
//
// Devuelve el desglose completo de una línea. Las pantallas lo muestran por
// partes —lo pactado por un lado, lo que corre por vencimiento por otro— y por
// eso cada pedazo sale separado en vez de un único número que ya no dice de
// dónde salió.
export const calcularEquipo = (equipo, hoyIso = obtenerFechaHoyBogota()) => {
  const porDia = numero(equipo?.cantidadEquipos) * numero(equipo?.valorDia);
  const ampliaciones = ampliacionesDe(equipo);

  const diasAmpliados = ampliaciones.reduce(
    (total, ampliacion) => total + numero(ampliacion.diasAmpliados),
    0,
  );
  const descuento = ampliaciones.reduce(
    (total, ampliacion) => total + numero(ampliacion.descuentoRealizado),
    0,
  );

  // Lo que se le prometió al cliente: los días del despacho más los que se le
  // agregaron después.
  const diasPactados = numero(equipo?.diasAlquilados) + diasAmpliados;

  if (!sigueAfuera(equipo)) {
    // Ya volvió: sus días quedaron congelados y son los que realmente usó.
    // No se les suman las ampliaciones —el rango de fechas ya las incluye— ni
    // se les descuenta nada por lo que no usó.
    const dias = numero(equipo.diasAlquilados);
    const bruto = dias * porDia;
    return {
      dias,
      diasPactados: dias,
      diasVencidos: 0,
      bruto,
      descuento,
      neto: Math.max(0, bruto - descuento),
      netoPactado: Math.max(0, bruto - descuento),
      netoVencido: 0,
      devuelto: true,
    };
  }

  // Sigue afuera: corre el calendario. Si todavía está en fecha se cobran los
  // días pactados; si se pasó, los que lleva desde que salió.
  const transcurridos = diasDeAlquiler(equipo?.fechaDespacho, hoyIso);
  const dias = Math.max(diasPactados, transcurridos);
  const diasVencidos = Math.max(0, dias - diasPactados);

  const netoPactado = Math.max(0, diasPactados * porDia - descuento);
  const netoVencido = diasVencidos * porDia;

  return {
    dias,
    diasPactados,
    diasVencidos,
    bruto: dias * porDia,
    descuento,
    neto: netoPactado + netoVencido,
    netoPactado,
    netoVencido,
    devuelto: false,
  };
};

// ── DE DÓNDE SALIÓ CADA DÍA que se le cobra a un equipo ────────────────
//
// Tres tramos, y cada uno cuenta una historia distinta sobre la misma plata:
//
//   alta      los que se pactaron al despacharlo
//   ampliados los que alguien AUTORIZÓ después, al ampliarle el plazo
//   vencidos  los que corrieron porque el cliente NO devolvió
//
// Las pantallas los nombran por separado —"días ampliados" no es lo mismo que
// "días vencidos"— y esta es la única función que decide cuál es cuál, para
// que el desglose de la ficha, los chips y el PDF no puedan discrepar.
//
// Para el que sigue afuera es directo. Para el que ya volvió hay que
// reconstruirlo: sus días quedaron congelados en uno solo, así que el reparto
// sale de comparar ese número con lo que decía su fecha de vencimiento.
export const diasDeEquipo = (equipo, hoyIso = obtenerFechaHoyBogota()) => {
  const cuenta = calcularEquipo(equipo, hoyIso);
  const ampliados = ampliacionesDe(equipo).reduce(
    (total, ampliacion) => total + numero(ampliacion.diasAmpliados),
    0,
  );

  if (!cuenta.devuelto) {
    return {
      alta: numero(equipo?.diasAlquilados),
      ampliados,
      vencidos: cuenta.diasVencidos,
    };
  }

  // Lo que se le había prometido en total, hasta la última fecha pactada.
  const pactados = equipo?.fechaVencimiento
    ? diasDeAlquiler(equipo.fechaDespacho, equipo.fechaVencimiento)
    : cuenta.dias;
  const usados = cuenta.dias;
  const alta = Math.max(0, pactados - ampliados);

  return {
    // Si devolvió antes, no alcanzó a usar ni los del alta.
    alta: Math.min(usados, alta),
    ampliados: Math.max(0, Math.min(usados, pactados) - alta),
    // Y si se pasó, los de más son vencidos aunque ya haya vuelto.
    vencidos: Math.max(0, usados - pactados),
  };
};

// ── El estado de un equipo ─────────────────────────────────────────────
//
// Se resuelve en orden y gana el primero. El orden no es un detalle: un equipo
// devuelto NO figura vencido aunque haya vuelto tarde —ya volvió—, y uno que
// se pasó de su fecha ampliada es vencido, no "ampliación".
export const ESTADOS_EQUIPO_EN_ORDEN = [
  "pendiente",
  "activo",
  "ampliacion",
  "vencido",
  "devuelto",
];

export const calcularEstadoEquipo = (equipo, hoyIso = obtenerFechaHoyBogota()) => {
  if (!sigueAfuera(equipo)) return "devuelto";
  // Todavía no salió de la bodega.
  if (equipo?.fechaDespacho && equipo.fechaDespacho > hoyIso) return "pendiente";
  // El que quedó con entrega indefinida cuenta como vencido: tenía que avisar
  // y no avisó, y mientras tanto corren días.
  if (equipo?.vencimientoIndefinido) return "vencido";
  if (equipo?.fechaVencimiento && equipo.fechaVencimiento <= hoyIso) return "vencido";
  if (ampliacionesDe(equipo).length > 0) return "ampliacion";
  return "activo";
};

export const equipoVencido = (equipo, hoyIso = obtenerFechaHoyBogota()) =>
  calcularEstadoEquipo(equipo, hoyIso) === "vencido";

// Un equipo que sigue afuera y todavía no vence: el cliente lo puede devolver
// sin que eso sea una gestión de cobranza.
export const equipoAlDia = (equipo, hoyIso = obtenerFechaHoyBogota()) =>
  ["activo", "ampliacion"].includes(calcularEstadoEquipo(equipo, hoyIso));

// Un equipo que volvió DESPUÉS de su fecha: esa devolución se consiguió con la
// factura ya vencida, así que es parte de la cobranza y Seguimiento la cuenta
// como suya.
//
// El que volvió en plazo no. Una factura entra a Seguimiento con los equipos
// que QUEDARON, no con los que ya habían vuelto: mostrar esos ahí obliga a
// quien cobra a preguntarse cuándo y por qué volvieron, y la respuesta no está
// en esa pantalla porque no pasó ahí. Su historia vive en la ficha del cliente.
export const equipoDevueltoEnCobranza = (equipo) =>
  Boolean(equipo?.devolucion?.fechaDevolucion) &&
  Boolean(equipo?.fechaVencimiento) &&
  equipo.devolucion.fechaDevolucion > equipo.fechaVencimiento;

// ── Lo que se le da a un equipo al ampliarle el plazo ──────────────────
//
// Cuando el cliente pide "un día más" y el equipo lleva 4 días vencidos, ese
// día que se le promete es MAÑANA. Sumarlo a la fecha vencida daría una fecha
// que ya pasó, así que el equipo seguiría figurando vencido y el cliente no
// tendría el día prometido.
//
// La fecha nueva se cuenta desde hoy, y la ampliación se registra por los días
// que la fecha corre DE VERDAD —los 4 vencidos que se consolidan más el
// pactado, 5 en el ejemplo—. Para perdonarle esos días está el descuento, que
// es una decisión que alguien toma y queda escrita.
export const proyectarAmpliacion = (
  equipo,
  diasPedidos,
  hoyIso = obtenerFechaHoyBogota(),
) => {
  const pedidos = Math.max(0, numero(diasPedidos));
  const diasVencidos = calcularEquipo(equipo, hoyIso).diasVencidos;
  const desde = diasVencidos > 0 ? hoyIso : equipo?.fechaVencimiento;

  return {
    diasVencidos,
    // Los que se le prometieron, que es lo que el cliente escuchó.
    diasPedidos: pedidos,
    // Y los que la fecha corre en total, que es lo que se cobra.
    dias: pedidos + diasVencidos,
    fechaNueva: pedidos > 0 ? calcularVencimiento(desde, pedidos) : null,
  };
};

// ── La cuenta de la factura ────────────────────────────────────────────

// El alquiler de todos los equipos, con su desglose.
export const calcularAlquiler = (doc, hoyIso = obtenerFechaHoyBogota()) =>
  equiposDe(doc).reduce(
    (acumulado, { equipo }) => {
      const cuenta = calcularEquipo(equipo, hoyIso);
      return {
        bruto: acumulado.bruto + cuenta.bruto,
        descuento: acumulado.descuento + cuenta.descuento,
        neto: acumulado.neto + cuenta.neto,
        netoPactado: acumulado.netoPactado + cuenta.netoPactado,
        netoVencido: acumulado.netoVencido + cuenta.netoVencido,
      };
    },
    { bruto: 0, descuento: 0, neto: 0, netoPactado: 0, netoVencido: 0 },
  );

// El transporte de TODA la factura: el de cada despacho, porque cada uno sale
// con su propio flete.
export const calcularTransporteTotal = (doc) =>
  gruposDe(doc).reduce(
    (total, grupo) => total + numero(adicionalesDe(grupo).valorTransporte),
    0,
  );

// ── El depósito: una garantía, no un ingreso ───────────────────────────
//
// Se le cobra al cliente junto con el alquiler —entra en el total— pero no es
// plata de la empresa: se devuelve cuando entrega los equipos en buen estado.
// Si vuelven dañados se retiene lo que corresponda, y ESO sí pasa a ser
// ingreso.
//
// Es de cada DESPACHO: el cliente pidió el benitín y dejó $300.000, y a los
// días pidió gatos y dejó otros $200.000. De ahí sale el tope de lo que se le
// puede retener a un equipo que vuelve mal.
export const calcularDepositoTotal = (doc) =>
  gruposDe(doc).reduce(
    (total, grupo) => total + numero(adicionalesDe(grupo).valorDeposito),
    0,
  );

// Lo retenido, sumando lo que se anotó en cada equipo que volvió mal.
export const calcularRetenido = (doc) =>
  equiposDe(doc).reduce(
    (total, { equipo }) => total + numero(equipo?.devolucion?.valorRetenido),
    0,
  );

// Lo que le corresponde al cliente. Cero mientras no se haya resuelto: hasta
// ese momento la garantía sigue vigente y el cargo en pie.
export const calcularDepositoDevuelto = (doc) => {
  if (!datosFactura(doc).depositoResuelto) return 0;
  const total = calcularDepositoTotal(doc);
  return Math.max(0, total - Math.min(total, calcularRetenido(doc)));
};

// Si todavía falta definir qué pasa con el depósito. Una factura así no puede
// terminar: la empresa está reteniendo plata que no es suya.
export const depositoPendiente = (doc) =>
  calcularDepositoTotal(doc) > 0 && !datosFactura(doc).depositoResuelto;

// Lo que entró por los despachos: el pago del alta y el de cada lote agregado.
// No incluye los abonos, que son plata posterior y se cuentan aparte.
export const sumarPagos = (doc) =>
  gruposDe(doc).reduce((total, grupo) => total + sumar(pagosDe(grupo), "monto"), 0);

export const sumarAbonos = (doc) => sumar(abonosDe(doc), "monto");

// Plata que SALIÓ hacia el cliente: el depósito que se le devuelve, o un
// sobrepago que se le reintegra. Es lo contrario de un abono y por eso resta.
export const sumarEntregas = (doc) => sumar(entregasDe(doc), "monto");

// La cuenta completa, tal como se muestra: el alquiler al día de hoy, los
// fletes, el depósito que todavía está en la empresa, y lo que el cliente
// entregó. Si pagó de más, el sobrante no baja el saldo —que nunca es
// negativo— sino que sale aparte como saldo a favor.
export const calcularCuentaFactura = (doc, hoyIso = obtenerFechaHoyBogota()) => {
  const alquiler = calcularAlquiler(doc, hoyIso);
  const transporte = calcularTransporteTotal(doc);
  const subtotal = alquiler.neto + transporte;

  const iva = datosFactura(doc).aplicaIva ? subtotal * IVA : 0;
  const deposito = calcularDepositoTotal(doc) - calcularDepositoDevuelto(doc);
  const total = subtotal + iva + deposito;

  const pagado = sumarPagos(doc);
  const abonos = sumarAbonos(doc);
  const entregas = sumarEntregas(doc);
  const recibido = pagado + abonos - entregas;

  return {
    alquiler: alquiler.neto,
    descuento: alquiler.descuento,
    netoPactado: alquiler.netoPactado,
    netoVencido: alquiler.netoVencido,
    transporte,
    subtotal,
    iva,
    deposito,
    total,
    pagado,
    abonos,
    entregas,
    recibido,
    saldoPendiente: Math.max(0, total - recibido),
    saldoAFavor: Math.max(0, recibido - total),
  };
};

// Lo que se le puede reclamar HOY. Distinto del saldo: los días que el cliente
// todavía tiene por delante —pactados pero no consumidos— se le cobran cuando
// devuelva, no ahora.
//
// Es el número que decide si una prórroga devuelve la factura a "activa".
// Antes salía del total GUARDADO de la factura, que no llevaba ni las
// ampliaciones ni los días vencidos: en una factura real decía $144.440 donde
// el cliente debía $1.727.140, y con pagar esos $144.440 la factura salía de
// cartera debiendo el resto.
export const calcularExigible = (doc, hoyIso = obtenerFechaHoyBogota()) => {
  const consumido = equiposDe(doc).reduce((total, { equipo }) => {
    const cuenta = calcularEquipo(equipo, hoyIso);
    if (cuenta.devuelto) return total + cuenta.neto;

    // Sigue afuera: solo los días que ya transcurrieron.
    const porDia = numero(equipo?.cantidadEquipos) * numero(equipo?.valorDia);
    const usados = Math.min(
      cuenta.dias,
      diasDeAlquiler(equipo?.fechaDespacho, hoyIso),
    );
    return total + Math.max(0, usados * porDia - cuenta.descuento);
  }, 0);

  const subtotal = consumido + calcularTransporteTotal(doc);
  const iva = datosFactura(doc).aplicaIva ? subtotal * IVA : 0;
  const deposito = calcularDepositoTotal(doc) - calcularDepositoDevuelto(doc);
  const cuenta = calcularCuentaFactura(doc, hoyIso);

  return Math.max(0, subtotal + iva + deposito - cuenta.recibido);
};

// ── El estado de la factura ────────────────────────────────────────────

export const ESTADOS_FACTURA_EN_ORDEN = [
  "pendiente",
  "activa",
  "vencida",
  "cobro",
  "finalizada",
];

export const calcularEstadoFactura = (doc, hoyIso = obtenerFechaHoyBogota()) => {
  const equipos = equiposDe(doc);

  // Sin equipos no hay nada que despachar todavía.
  if (equipos.length === 0) return "pendiente";

  const afuera = equipos.filter(({ equipo }) => sigueAfuera(equipo));

  // Ya no queda nada afuera: lo único que falta es la plata. "Finalizada"
  // significa que NO queda ningún asunto abierto, en ninguna de las dos
  // direcciones — ni el cliente debe, ni la empresa le debe a él, ni falta
  // definir el depósito. Mientras quede uno, sigue en "cobro", que es la lista
  // de lo que hay que resolver.
  if (afuera.length === 0) {
    const cuenta = calcularCuentaFactura(doc, hoyIso);
    if (cuenta.saldoPendiente > 0) return "cobro";
    if (cuenta.saldoAFavor > 0) return "cobro";
    if (depositoPendiente(doc)) return "cobro";
    return "finalizada";
  }

  const estados = afuera.map(({ equipo }) => calcularEstadoEquipo(equipo, hoyIso));

  // Todavía no salió ninguno.
  if (estados.every((estado) => estado === "pendiente")) return "pendiente";
  if (estados.includes("vencido")) return "vencida";

  // Regla de la prórroga: darle más días solo la devuelve a "activa" si el
  // cliente quedó al día con lo que YA debía. Lo que valen los días recién
  // agregados no cuenta acá: esos se cobran cuando devuelva, igual que
  // cualquier otro día de alquiler en curso. Si contaran, ampliar el
  // vencimiento nunca alcanzaría por sí solo para poner la factura al día.
  if (estados.includes("ampliacion") && calcularExigible(doc, hoyIso) > 0) {
    return "vencida";
  }

  return "activa";
};

// ── Cerrada: el único pedazo del estado que SÍ se guarda ───────────────
//
// Todo lo de arriba se calcula porque cambia SOLO con el calendario. Esto es
// lo contrario: una factura cerrada no tiene nada pendiente por ningún lado
// —devolvió todo, no debe plata y tampoco le sobró—, y eso no cambia sin que
// alguien escriba. De las escrituras el servidor se entera siempre.
//
// Guardarlo es lo que permite PREGUNTARLE a la base "dame solo las facturas
// abiertas" en vez de traerlas todas para averiguar cuáles son.
export const facturaCerrada = (doc, hoyIso = obtenerFechaHoyBogota()) =>
  calcularEstadoFactura(doc, hoyIso) === "finalizada";

// ── Cuántas unidades hay que reclamar ──────────────────────────────────

// Las que están afuera Y vencidas: lo que de verdad hay que reclamarle hoy.
// Deja fuera lo que sigue en plazo — un equipo que vence la semana que viene
// no se cobra hoy, aunque su factura ya esté vencida por otro.
export const contarUnidadesVencidas = (doc, hoyIso = obtenerFechaHoyBogota()) =>
  equiposDe(doc)
    .filter(({ equipo }) => equipoVencido(equipo, hoyIso))
    .reduce((total, { equipo }) => total + numero(equipo?.cantidadEquipos), 0);

export const hayEquiposAlDia = (doc, hoyIso = obtenerFechaHoyBogota()) =>
  equiposDe(doc).some(({ equipo }) => equipoAlDia(equipo, hoyIso));

// Los equipos que pasaron a vencidos con el cambio de día: hoy están vencidos,
// ayer no. Existe para poder avisar por EQUIPO y no por factura — una factura
// figura vencida en cuanto UNO de sus equipos lo está, así que la que ya está
// en seguimiento no volvería a "entrar" nunca más y el segundo equipo vencería
// en silencio.
export const equiposQueVencieronHoy = (doc, hoyIso, ayerIso) =>
  equiposDe(doc)
    .filter(
      ({ equipo }) =>
        sigueAfuera(equipo) &&
        equipoVencido(equipo, hoyIso) &&
        !equipoVencido(equipo, ayerIso),
    )
    .map(({ equipo }) => equipo);

// ── La cuenta del cliente ──────────────────────────────────────────────

// El resumen de TODAS las facturas de un cliente. Acá el saldo es NETO, a
// diferencia de una factura suelta: lo que sobró en una descuenta lo que se
// debe en otra, porque se mira su cuenta como un todo.
export const calcularCuentaCliente = (facturas, hoyIso = obtenerFechaHoyBogota()) => {
  const resumen = (Array.isArray(facturas) ? facturas : []).reduce(
    (acumulado, doc) => {
      const cuenta = calcularCuentaFactura(doc, hoyIso);
      return {
        total: acumulado.total + cuenta.total,
        pagado: acumulado.pagado + cuenta.pagado,
        abonos: acumulado.abonos + cuenta.abonos,
        recibido: acumulado.recibido + cuenta.recibido,
      };
    },
    { total: 0, pagado: 0, abonos: 0, recibido: 0 },
  );

  const neto = resumen.total - resumen.recibido;
  return {
    ...resumen,
    saldoPendiente: Math.max(0, neto),
    saldoAFavor: Math.max(0, -neto),
  };
};

// Las facturas de un cliente que todavía tienen saldo, de mayor a menor
// (empate: la más antigua primero). Es el orden en que se les va aplicando un
// abono: primero a la que más debe.
export const ordenarFacturasConSaldo = (facturas, hoyIso = obtenerFechaHoyBogota()) =>
  (Array.isArray(facturas) ? facturas : [])
    .map((doc) => ({ factura: doc, cuenta: calcularCuentaFactura(doc, hoyIso) }))
    .filter(({ cuenta }) => cuenta.saldoPendiente > 0)
    .sort((a, b) => {
      const porSaldo = b.cuenta.saldoPendiente - a.cuenta.saldoPendiente;
      if (porSaldo !== 0) return porSaldo;
      return (datosFactura(a.factura).fechaCreacion || "").localeCompare(
        datosFactura(b.factura).fechaCreacion || "",
      );
    });

// Reparte un monto entre facturas con saldo ya ordenadas: a cada una lo que le
// falta para saldarse, y si sobra pasa a la siguiente. La última que llega a
// recibir algo se lleva TODO lo que quede, así que un remanente no se pierde:
// queda como saldo a favor.
export const repartirEntreFacturas = (facturasConSaldo, monto) => {
  let restante = monto;
  return facturasConSaldo.map(({ factura, cuenta }, indice) => {
    if (restante <= 0) return { factura, cuenta, aplicado: 0 };
    const esUltima = indice === facturasConSaldo.length - 1;
    const aplicado = esUltima ? restante : Math.min(restante, cuenta.saldoPendiente);
    restante -= aplicado;
    return { factura, cuenta, aplicado };
  });
};

// Separa de un pago lo que excede el total: ese excedente no es pago, es
// abono. Se recorta de los últimos medios cargados.
export const separarExcedentePago = (pagos, total) => {
  const validos = (Array.isArray(pagos) ? pagos : [])
    .filter((pago) => pago?.medio && numero(pago.monto) > 0)
    .map((pago) => ({ medio: pago.medio, monto: numero(pago.monto) }));

  const suma = validos.reduce((acumulado, pago) => acumulado + pago.monto, 0);
  const excedente = Math.max(0, Math.round(suma - total));
  if (excedente === 0 || validos.length === 0) {
    return { pagos: validos, excedente: 0, medio: null };
  }

  const medio = validos[validos.length - 1].medio;
  let porDescontar = excedente;
  const recortados = [...validos].reverse().map((pago) => {
    if (porDescontar <= 0) return pago;
    const quita = Math.min(porDescontar, pago.monto);
    porDescontar -= quita;
    return { ...pago, monto: pago.monto - quita };
  });

  return { pagos: recortados.reverse().filter((pago) => pago.monto > 0), excedente, medio };
};

// ── El estado del cliente ──────────────────────────────────────────────
//
// Es un resumen de sus facturas, no un dato propio: gana la que exige atención
// más pronto. A diferencia del estado de la factura, este SÍ se guarda: la
// lista de clientes lee solo la colección `clientes`, y traer las facturas de
// todos para calcularlo al vuelo sería lento y caro. Lo mantiene el servidor.
const PRIORIDAD_ESTADO_CLIENTE = [
  "vencida", // se pasó la fecha y tiene equipos afuera: hay que llamar ya
  "cobro", // devolvió todo pero debe plata: hay que insistir
  "pendiente", // falta despachar: acción nuestra
  "activa", // equipos en la calle, corriendo días
  "finalizada", // solo si TODAS lo están
];

export const calcularEstadoCliente = (facturas, hoyIso = obtenerFechaHoyBogota()) => {
  const lista = Array.isArray(facturas) ? facturas : [];
  if (lista.length === 0) return "inactivo";

  const estados = lista.map((doc) => calcularEstadoFactura(doc, hoyIso));
  return PRIORIDAD_ESTADO_CLIENTE.find((estado) => estados.includes(estado)) ?? "inactivo";
};

// ── Los totales del panel del menú ─────────────────────────────────────
//
// Los dos números de "Equipos activos" y "Pagos pendientes". Los mantiene una
// Cloud Function en un solo documento y el menú lo lee de una. Viven acá para
// que el servidor use EXACTAMENTE esta lógica y no una versión suya.
export const ESTADOS_EQUIPOS_ACTIVOS = ["activa", "vencida"];

export const calcularAporteFactura = (doc, hoyIso = obtenerFechaHoyBogota()) => {
  if (!doc) return { equiposActivos: 0, pagosPendientes: 0 };

  const estado = calcularEstadoFactura(doc, hoyIso);
  const equiposActivos = ESTADOS_EQUIPOS_ACTIVOS.includes(estado)
    ? equiposDe(doc)
        .filter(({ equipo }) => sigueAfuera(equipo))
        .reduce((total, { equipo }) => total + numero(equipo?.cantidadEquipos), 0)
    : 0;

  return {
    equiposActivos,
    pagosPendientes: calcularCuentaFactura(doc, hoyIso).saldoPendiente,
  };
};

export const calcularTotalesFacturas = (facturas, hoyIso = obtenerFechaHoyBogota()) =>
  (Array.isArray(facturas) ? facturas : []).reduce(
    (acumulado, doc) => {
      const aporte = calcularAporteFactura(doc, hoyIso);
      return {
        equiposActivos: acumulado.equiposActivos + aporte.equiposActivos,
        pagosPendientes: acumulado.pagosPendientes + aporte.pagosPendientes,
      };
    },
    { equiposActivos: 0, pagosPendientes: 0 },
  );

// ── La gestión: qué se hizo para destrabar la factura ──────────────────
//
// El estado dice en qué punto está la factura; la gestión dice qué se hizo
// para moverla. Se ve SOLO en Seguimiento de cobro, y solo entran ahí las
// facturas vencidas o en cobro.
export const TIPOS_GESTION = [
  "sinGestionar",
  "sinRespuesta",
  "prorroga",
  "devolucionParcial",
  "devolucionTotal",
  "cobro",
];

export const obtenerGestiones = (doc) => gestionesDe(doc);

// Solo lo hecho con la factura ya vencida cuenta como cobranza. Lo anotado
// antes es historia, no gestión.
export const gestionesDeSeguimiento = (doc) =>
  obtenerGestiones(doc).filter((registro) => registro?.enSeguimiento !== false);

export const obtenerHoraBogotaHHMM = () =>
  new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());

export const crearRegistroGestion = (tipo, datos = {}) => ({
  tipo,
  fecha: obtenerFechaHoyBogota(),
  hora: obtenerHoraBogotaHHMM(),
  ...datos,
});

export const contarLlamadasSinRespuesta = (doc) =>
  obtenerGestiones(doc).filter(
    (registro) => registro.tipo === "llamada" && !registro.contesto,
  ).length;

// La gestión vigente: la última acción registrada, salvo que la factura ya
// esté en cobro —devolvió todo y debe plata—, que manda sobre cualquier otra
// cosa porque es lo único que queda por resolver.
export const calcularGestionFactura = (doc, estado) => {
  if (estado === "cobro") return "cobro";

  const gestiones = gestionesDeSeguimiento(doc);
  for (let i = gestiones.length - 1; i >= 0; i -= 1) {
    const registro = gestiones[i];
    if (registro.tipo === "llamada") {
      // Una llamada atendida no es una gestión en sí: lo que importa es lo que
      // se acordó en ella, que se anota aparte. Se sigue buscando hacia atrás.
      if (!registro.contesto) return "sinRespuesta";
      continue;
    }
    if (TIPOS_GESTION.includes(registro.tipo)) return registro.tipo;
  }
  return "sinGestionar";
};

// Las facturas que se trabajan en Seguimiento de cobro: las que tienen equipos
// vencidos afuera y las que ya devolvieron todo pero deben plata.
export const estadoEnSeguimiento = (estado) => ["vencida", "cobro"].includes(estado);

export const facturaEnSeguimiento = (doc, hoyIso = obtenerFechaHoyBogota()) =>
  estadoEnSeguimiento(calcularEstadoFactura(doc, hoyIso));

// ── Qué edición es segura ──────────────────────────────────────────────
//
// El formulario de editar no CORRIGE un dato: vuelve a armar la factura entera
// desde cero. Mientras solo tiene lo del alta eso es seguro. El problema es lo
// que pasó DESPUÉS —un abono, un despacho agregado, una ampliación, una
// devolución, un depósito ya resuelto—: cada una queda apoyada en un dato
// puntual, y el formulario no sabe que ya no está sola.
export const movimientosFactura = (doc) => {
  const grupos = gruposDe(doc);
  const cantidadAbonos = abonosDe(doc).length;
  const cantidadAgregados = grupos.filter((grupo) => grupo?.grupo !== "grupo-inicial").length;
  const equiposConHistoria = equiposDe(doc)
    .filter(({ equipo }) => ampliacionesDe(equipo).length > 0 || !sigueAfuera(equipo))
    .map(({ equipo }) => equipo);
  const depositoResuelto = Boolean(datosFactura(doc).depositoResuelto);

  return {
    cantidadAbonos,
    cantidadAgregados,
    equiposConHistoria,
    depositoResuelto,
    hayAlgo:
      cantidadAbonos > 0 ||
      cantidadAgregados > 0 ||
      equiposConHistoria.length > 0 ||
      depositoResuelto,
  };
};

// El texto del aviso que va arriba del formulario de editar. Vacío si no hay
// nada que avisar.
export const describirMovimientosFactura = (doc) => {
  const { cantidadAbonos, cantidadAgregados, equiposConHistoria, depositoResuelto } =
    movimientosFactura(doc);

  const partes = [];
  const plural = (n, singular, prefijo = "") =>
    `${n} ${prefijo}${singular}${n === 1 ? "" : "s"}`;

  if (cantidadAbonos > 0) partes.push(plural(cantidadAbonos, "abono"));
  if (cantidadAgregados > 0) partes.push(plural(cantidadAgregados, "despacho agregado"));
  if (equiposConHistoria.length > 0) {
    partes.push(
      `${equiposConHistoria.length} equipo${equiposConHistoria.length === 1 ? "" : "s"} con ampliación o devolución`,
    );
  }
  if (depositoResuelto) partes.push("el depósito ya resuelto");

  return partes;
};

// Etiqueta ordinal para cada fecha del historial de un equipo.
export const etiquetaVencimiento = (indice) => {
  const ordinales = ["1er", "2do", "3er", "4to", "5to", "6to", "7mo", "8vo", "9no", "10mo"];
  return `${ordinales[indice] || `${indice + 1}º`} vencimiento`;
};
