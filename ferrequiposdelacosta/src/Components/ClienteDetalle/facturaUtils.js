// Los íconos de los estados y de las gestiones viven acá, al lado de sus
// etiquetas (ver ESTADO_FACTURA_INFO y GESTION_INFO más abajo): así una
// pantalla que muestre un estado no tiene que saber con qué se dibuja.
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import AgricultureIcon from "@mui/icons-material/Agriculture";
import ErrorIcon from "@mui/icons-material/Error";
import PaidIcon from "@mui/icons-material/Paid";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import PhoneMissedIcon from "@mui/icons-material/PhoneMissed";
import EventRepeatIcon from "@mui/icons-material/EventRepeat";
import AssignmentReturnIcon from "@mui/icons-material/AssignmentReturn";

// Medios de pago que maneja la empresa (Nequi y Nequi A son cuentas Nequi
// distintas, de dos personas diferentes).
export const MODOS_PAGO = ["Nequi", "Nequi A", "Bancolombia", "Daviplata", "Efectivo"];

// Viven en Utils/formato.js, que es donde va todo lo de presentación. Se
// reexportan desde acá para no tocar a quienes ya las importaban de este módulo.
export { formatearMonedaInput, limpiarMonedaInput } from "../../Utils/formato";

// Vive en Utils/formato.js, que es donde va todo lo de presentación. Se
// reexporta desde acá para no tocar a quienes ya la importaban de este módulo.
export { formatearFechaLegible } from "../../Utils/formato";

// Un pago puede repartirse en más de un medio (ej. parte por Bancolombia,
// parte en efectivo). Las facturas/equipos viejos solo tenían un campo
// `modoPago` de texto: esto lo convierte a la misma forma de lista para que
// la UI no tenga que distinguir formato viejo/nuevo.
export const normalizarPagos = (pagos, modoPagoLegado, montoLegado) => {
  if (Array.isArray(pagos) && pagos.length > 0) return pagos;
  if (modoPagoLegado) return [{ medio: modoPagoLegado, monto: Number(montoLegado) || 0 }];
  return [];
};

const obtenerHoraBogota = () =>
  Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Bogota",
      hour: "numeric",
      hour12: false,
    }).format(new Date()),
  );

// La fecha de hoy en Colombia, en formato AAAA-MM-DD. Se usa como referencia
// para saber si un equipo está vencido y para contar los días de los equipos
// que quedaron con devolución indefinida.
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
  const ahora = new Date();
  const horaBogota = obtenerHoraBogota();

  const [anio, mes, dia] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(ahora)
    .split("-")
    .map(Number);

  const fechaBase = new Date(Date.UTC(anio, mes - 1, dia));
  if (horaBogota >= 15) {
    fechaBase.setUTCDate(fechaBase.getUTCDate() + 1);
  }

  const pad = (n) => String(n).padStart(2, "0");
  return `${fechaBase.getUTCFullYear()}-${pad(fechaBase.getUTCMonth() + 1)}-${pad(fechaBase.getUTCDate())}`;
};

// Fecha de devolución = fecha de despacho + días de alquiler, contando el
// propio día de despacho como el primer día (ej: despacho 23, 2 días →
// devolución 24, no 25).
export const calcularFechaDevolucion = (fechaIso, dias) => {
  if (!fechaIso || !dias) return null;
  const [anio, mes, dia] = fechaIso.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  fecha.setUTCDate(fecha.getUTCDate() + Number(dias) - 1);
  const pad = (n) => String(n).padStart(2, "0");
  return `${fecha.getUTCFullYear()}-${pad(fecha.getUTCMonth() + 1)}-${pad(fecha.getUTCDate())}`;
};

// Extiende una fecha de vencimiento ya existente sumándole días adicionales
// (usado al "ampliar vencimiento" de un equipo ya despachado: esos días se
// suman completos, sin restar 1, porque el día de vencimiento actual ya
// está contado).
export const calcularVencimiento = (fechaIso, dias) => {
  if (!fechaIso || !dias) return null;
  const [anio, mes, dia] = fechaIso.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  fecha.setUTCDate(fecha.getUTCDate() + Number(dias));
  const pad = (n) => String(n).padStart(2, "0");
  return `${fecha.getUTCFullYear()}-${pad(fecha.getUTCMonth() + 1)}-${pad(fecha.getUTCDate())}`;
};

// ── Ampliaciones de plazo ──────────────────────────────────────────────
//
// Cada vez que se le amplía el vencimiento a un equipo queda registrado
// desde qué fecha, hasta cuál, cuántos días se sumaron y qué descuento se
// le hizo a esos días. Se guarda en el equipo como:
//
//   ampliaciones: [{ fechaAnterior, fechaNueva, dias, descuento }]
//
// Hay dos formatos anteriores que se siguen leyendo para no migrar datos:
//   - "vencimientos": lista de fechas sin datos comerciales.
//   - "fechaVencimientoOriginal": una sola fecha, el formato más viejo.
// En ambos casos el descuento se asume en cero, que es lo que pasaba.
export const obtenerAmpliaciones = (equipo) => {
  if (Array.isArray(equipo?.ampliaciones)) {
    return equipo.ampliaciones.filter(Boolean);
  }

  // Formato intermedio: solo fechas. Se reconstruyen los tramos encadenando
  // cada fecha con la siguiente, y la última con el vencimiento vigente.
  const fechas = Array.isArray(equipo?.vencimientos)
    ? equipo.vencimientos.filter(Boolean)
    : equipo?.fechaVencimientoOriginal
      ? [equipo.fechaVencimientoOriginal]
      : [];

  return fechas.map((fecha, i) => {
    const fechaNueva = fechas[i + 1] || equipo?.fechaVencimiento;
    return {
      fechaAnterior: fecha,
      fechaNueva,
      dias: diferenciaEnDias(fecha, fechaNueva),
      descuento: 0,
    };
  });
};

// Las fechas por las que pasó el equipo antes de la vigente, para mostrarlas
// numeradas ("1er vencimiento", "2do vencimiento"...).
export const obtenerHistorialVencimientos = (equipo) =>
  obtenerAmpliaciones(equipo)
    .map((ampliacion) => ampliacion.fechaAnterior)
    .filter(Boolean);

// ── Devoluciones ────────────────────────────────────────────────────────
//
// Cada línea de equipo puede devolverse en más de una tanda: se guarda
//
//   cantidadDevuelta: number  (cuánto de `cantidad` ya volvió)
//   fechaDevolucion: string   (se pone cuando queda en cantidad, es decir,
//                              cuando la línea se cierra del todo)
//
// Cuando una devolución no cubre toda la línea, en vez de guardar cantidades
// mixtas se PARTE la línea en dos (ver RegistrarDevolucionDialog): así
// `cantidad` sigue siendo constante en toda la vida de cada línea, que es lo
// que asume calcularAmpliacionEquipo más abajo.
export const calcularCantidadPendiente = (equipo) =>
  Math.max(0, (Number(equipo?.cantidad) || 0) - (Number(equipo?.cantidadDevuelta) || 0));

export const equipoDevueltoCompleto = (equipo) => calcularCantidadPendiente(equipo) <= 0;

// Lo que suma una ampliación en un equipo: días agregados, cuánto valen a
// precio de lista, cuánto se descontó y el neto que se cobraría.
// El descuento se resta ANTES del IVA.
//
// Además de las ampliaciones pactadas, se cuentan los días de los equipos que
// quedaron con devolución indefinida: mientras el cliente no devuelva, cada
// día que pasa desde su vencimiento se cobra igual que un día ampliado (sin
// descuento, porque no se pactó ninguno). Se cuenta desde el día siguiente al
// vencimiento: si venció el 25 y hoy es 28, son 3 días.
export const calcularAmpliacionEquipo = (equipo, hoyIso = obtenerFechaHoyBogota()) => {
  const porDia = (Number(equipo?.cantidad) || 0) * (Number(equipo?.valor) || 0);

  const resumen = obtenerAmpliaciones(equipo).reduce(
    (acumulado, ampliacion) => {
      const dias = Number(ampliacion.dias) || 0;
      const descuento = Number(ampliacion.descuento) || 0;
      return {
        dias: acumulado.dias + dias,
        bruto: acumulado.bruto + dias * porDia,
        descuento: acumulado.descuento + descuento,
        neto: acumulado.neto + Math.max(0, dias * porDia - descuento),
      };
    },
    { dias: 0, bruto: 0, descuento: 0, neto: 0 },
  );

  const diasAbiertos = equipo?.vencimientoIndefinido
    ? Math.max(0, diferenciaEnDias(equipo.fechaVencimiento, hoyIso))
    : 0;

  return {
    dias: resumen.dias + diasAbiertos,
    bruto: resumen.bruto + diasAbiertos * porDia,
    descuento: resumen.descuento,
    neto: resumen.neto + diasAbiertos * porDia,
    // Se expone aparte por si una vista necesita distinguir los días que
    // corren solos de los que se pactaron.
    diasAbiertos,
  };
};

// Lo mismo pero sumando todos los equipos de una factura, y proyectando cómo
// quedaría la factura si esas ampliaciones se cobraran.
//
// El IVA de la ampliación sigue lo que se marcó en la factura: si se emitió
// con IVA los días extra también lo llevan, y si no, no. Las facturas viejas
// no guardaban ese dato, así que se deduce de si tienen IVA cargado.
export const calcularAmpliacionFactura = (factura, hoyIso = obtenerFechaHoyBogota()) => {
  const equipos = Array.isArray(factura?.equipos) ? factura.equipos : [];

  const resumen = equipos.reduce(
    (acumulado, equipo) => {
      const ampliacion = calcularAmpliacionEquipo(equipo, hoyIso);
      return {
        dias: acumulado.dias + ampliacion.dias,
        bruto: acumulado.bruto + ampliacion.bruto,
        descuento: acumulado.descuento + ampliacion.descuento,
        neto: acumulado.neto + ampliacion.neto,
      };
    },
    { dias: 0, bruto: 0, descuento: 0, neto: 0 },
  );

  const llevaIva = factura?.aplicaIva ?? Number(factura?.iva) > 0;
  const iva = llevaIva ? resumen.neto * 0.19 : 0;
  const total = resumen.neto + iva;

  return {
    ...resumen,
    llevaIva,
    iva,
    total,
    hay: total > 0,
    nuevoSubtotal: (Number(factura?.subtotal) || 0) + resumen.neto,
    nuevoIva: (Number(factura?.iva) || 0) + iva,
    nuevoTotal: (Number(factura?.valorTotal) || 0) + total,
    nuevoSaldo: (Number(factura?.saldoPendiente) || 0) + total,
  };
};

// ── Abonos y estado de cuenta ──────────────────────────────────────────
//
// Un abono es plata que el cliente entrega DESPUÉS de emitida la factura,
// para bajar lo que quedó debiendo. Se guardan en la factura como:
//
//   abonos: [{ fecha, medio, monto }]
//
// Son independientes de los pagos del alta (factura.pagos) y de los que trae
// cada equipo agregado: aquellos dicen cómo se pagó en su momento, estos
// cuánto se fue abonando después.
export const sumarAbonos = (abonos) =>
  (Array.isArray(abonos) ? abonos : []).reduce(
    (total, abono) => total + (Number(abono?.monto) || 0),
    0,
  );

// Cuando el cliente entrega MÁS de lo que dice la factura, ese sobrante no se
// guarda como pago —quedaría cobrado de más y el saldo no cerraría— sino como
// un abono aparte, que es lo que realmente es: plata suya a cuenta de la deuda.
//
// Devuelve los pagos recortados hasta cubrir justo el total, cuánto sobró y
// por qué medio entró ese sobrante. El recorte empieza por el último medio
// cargado, que es el que se estaba completando cuando se pasó del total.
export const separarExcedentePago = (pagos, total) => {
  const validos = (Array.isArray(pagos) ? pagos : [])
    .filter((pago) => pago?.medio && Number(pago.monto) > 0)
    .map((pago) => ({ medio: pago.medio, monto: Number(pago.monto) }));

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

  return {
    pagos: recortados.reverse().filter((pago) => pago.monto > 0),
    excedente,
    medio,
  };
};

// La cuenta de una factura en un solo lugar, para que todas las pantallas
// digan lo mismo.
//
// `totalMostrado` es opcional y sirve para la regla de siempre: lo que se
// MUESTRA lleva los días ampliados, lo que se GUARDA no. Quien pinta la
// pantalla le pasa el total con ampliación; quien guarda no le pasa nada y
// usa el valorTotal tal cual está en la base.
//
// Si el cliente pagó de más, el sobrante NO se resta del saldo (que nunca
// baja de cero): sale por separado como saldo a favor.
export const calcularEstadoCuenta = (factura, totalMostrado) => {
  const total = totalMostrado ?? (Number(factura?.valorTotal) || 0);
  const abonos = sumarAbonos(factura?.abonos);
  const pagado = (Number(factura?.montoPagado) || 0) + abonos;

  return {
    total,
    abonos,
    pagado,
    // Lo que se pagó al emitir la factura, sin contar los abonos.
    pagadoInicial: Number(factura?.montoPagado) || 0,
    saldoPendiente: Math.max(0, total - pagado),
    saldoAFavor: Math.max(0, pagado - total),
  };
};

// Lo que el cliente entregó al momento de facturar: el pago del alta más el
// de cada lote de equipos que se agregó después. No incluye los abonos, que
// son plata posterior y se cuentan aparte.
//
// Ojo: esto NO es factura.montoPagado (que solo guarda el pago del alta, y en
// las facturas viejas ni eso). Por eso `calcularEstadoCuenta` —que sí lo usa—
// se queda para los formularios, y las pantallas que muestran la cuenta al día
// usan esta.
export const sumarPagosFactura = (factura) => {
  const sumar = (pagos) =>
    pagos.reduce((total, pago) => total + (Number(pago?.monto) || 0), 0);

  const pagoInicial = sumar(
    normalizarPagos(factura?.pagos, factura?.modoPago, factura?.montoPagado),
  );

  const equipos = Array.isArray(factura?.equipos) ? factura.equipos : [];
  const pagoAgregados = equipos
    .filter((equipo) => equipo?.agregadoPosteriormente)
    .reduce(
      (total, equipo) =>
        total + sumar(normalizarPagos(equipo.pagos, equipo.modoPago, null)),
      0,
    );

  return pagoInicial + pagoAgregados;
};

// La cuenta de una factura tal como se MUESTRA: el total ya trae los días
// ampliados sumados (regla de siempre: con ampliación se muestra, sin ella se
// guarda). Si el cliente entregó de más, el sobrante no baja el saldo —que
// nunca es negativo— sino que sale aparte como saldo a favor.
export const calcularCuentaFactura = (
  factura,
  hoyIso = obtenerFechaHoyBogota(),
) => {
  const ampliacion = calcularAmpliacionFactura(factura, hoyIso);
  const total = ampliacion.hay
    ? ampliacion.nuevoTotal
    : Number(factura?.valorTotal) || 0;
  const pagado = sumarPagosFactura(factura);
  const abonos = sumarAbonos(factura?.abonos);
  const recibido = pagado + abonos;

  return {
    total,
    pagado,
    abonos,
    recibido,
    saldoPendiente: Math.max(0, total - recibido),
    saldoAFavor: Math.max(0, recibido - total),
  };
};

// El saldo que queda en una factura con esta lista de abonos: el total
// facturado menos el pago del alta menos todos los abonos. Nunca baja de
// cero —si se pagó de más, eso se ve aparte como saldo a favor. Usa los
// valores CRUDOS de la factura (sin ampliación): es la misma regla de
// siempre, lo que se guarda no lleva los días ampliados.
export const calcularSaldoConAbonos = (factura, abonos) =>
  Math.max(
    0,
    (Number(factura?.valorTotal) || 0) -
      (Number(factura?.montoPagado) || 0) -
      sumarAbonos(abonos),
  );

// Las facturas de un cliente que todavía tienen saldo, ordenadas de mayor a
// menor saldo (empate: la más antigua primero). Es el orden en que se les va
// aplicando un abono: primero a la que más debe. El saldo que se compara acá
// SÍ lleva los días ampliados —es "lo que se ve"— para saber quién debe más
// hoy. La usan tanto el botón Abono como el excedente de "Agregar equipo".
export const ordenarFacturasConSaldo = (facturas, hoyIso = obtenerFechaHoyBogota()) =>
  (Array.isArray(facturas) ? facturas : [])
    .map((factura) => ({ factura, cuenta: calcularCuentaFactura(factura, hoyIso) }))
    .filter(({ cuenta }) => cuenta.saldoPendiente > 0)
    .sort((a, b) => {
      const porSaldo = b.cuenta.saldoPendiente - a.cuenta.saldoPendiente;
      if (porSaldo !== 0) return porSaldo;
      return (a.factura.fecha || "").localeCompare(b.factura.fecha || "");
    });

// Reparte un monto entre una lista de facturas con saldo ya ordenadas (ver
// ordenarFacturasConSaldo): a cada una le asigna lo que le falta para
// saldarse, y si sobra pasa a la siguiente. La última que llega a recibir
// algo se lleva TODO lo que quede, así que si sobra después de saldar a
// todas, ese remanente queda ahí como saldo a favor en vez de perderse.
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

// El resumen de TODAS las facturas de un cliente, para la tarjeta de su
// encabezado.
//
// Acá el saldo es NETO, a diferencia de una factura suelta: lo que sobró en
// una descuenta lo que se debe en otra, porque lo que se está mirando es la
// cuenta del cliente como un todo, no la de un documento.
export const calcularCuentaCliente = (
  facturas,
  hoyIso = obtenerFechaHoyBogota(),
) => {
  const resumen = (Array.isArray(facturas) ? facturas : []).reduce(
    (acumulado, factura) => {
      const cuenta = calcularCuentaFactura(factura, hoyIso);
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

export // Los equipos que se agregaron juntos forman un lote: comparten un solo
// pago y unos solos adicionales, que quedan guardados en el primero de
// ellos. Los lotes nuevos traen "loteId"; en los guardados antes de que
// existiera ese campo se deduce, porque solo el primero del grupo lleva los
// datos de pago y los que le siguen sin datos son del mismo lote.
const agruparLotesAgregados = (equipos) => {
  const lotes = [];

  equipos.forEach((equipo) => {
    const ultimo = lotes[lotes.length - 1];
    const traeDatosDeLote =
      (Array.isArray(equipo.pagos) && equipo.pagos.length > 0) ||
      Boolean(equipo.tipoPago) ||
      Number(equipo.deposito) > 0 ||
      Boolean(equipo.transporte);

    const sigueElMismo =
      ultimo &&
      (equipo.loteId
        ? equipo.loteId === ultimo.loteId
        : !ultimo.loteId && !traeDatosDeLote);

    if (sigueElMismo) {
      ultimo.equipos.push(equipo);
      return;
    }

    lotes.push({
      loteId: equipo.loteId || null,
      // El primero del lote es el que carga el pago, el depósito y el
      // transporte de todo el grupo.
      cabecera: equipo,
      equipos: [equipo],
    });
  });

  return lotes;
};

// ── El estado de una factura: se CALCULA, no se guarda ─────────────────
//
// El estado no vive en Firestore: sale de los datos que la factura ya tiene
// (fechas, cantidades devueltas y saldo). Antes se guardaba en un campo, y eso
// obligaba a que alguien abriera la pantalla correcta para que se actualizara:
// una factura vencida ayer seguía diciendo "despachada" en la lista de
// clientes hasta que alguien entrara a Seguimiento.
//
//   pendiente    se facturó, todavía no llegó la fecha de despacho
//   activa       equipos entregados y el alquiler está vigente
//   vencida      se pasó la fecha con equipos sin devolver
//   cobro        devolvió todos los equipos, pero queda saldo
//   finalizada   devolvió todo y no debe nada
//
// El color de cada uno vive en el tema, en `palette.custom.estadoFactura`.
//
// Se ve en Clientes y en Detalle Cliente. En Seguimiento no: ahí se muestra la
// GESTIÓN (más abajo), que es otra escala.
export const ESTADOS_FACTURA_EN_ORDEN = [
  "pendiente",
  "activa",
  "vencida",
  "cobro",
  "finalizada",
];

// El nombre y el ícono de cada estado, en un solo lugar: agregar uno no
// obliga a acordarse de las pantallas que lo pintan.
export const ESTADO_FACTURA_INFO = {
  pendiente: { label: "Pendiente", Icono: HourglassTopIcon },
  activa: { label: "Activa", Icono: AgricultureIcon },
  vencida: { label: "Vencida", Icono: ErrorIcon },
  cobro: { label: "Cobro", Icono: PaidIcon },
  finalizada: { label: "Finalizada", Icono: CheckCircleIcon },
};

// El cliente usa el mismo vocabulario que sus facturas, más "inactivo" para
// cuando no tiene ninguna.
export const ESTADO_CLIENTE_INFO = {
  inactivo: { label: "Inactivo", Icono: RemoveCircleOutlineIcon },
  ...ESTADO_FACTURA_INFO,
};

// La fecha en que salieron los equipos. Cada línea trae la suya; las facturas
// que no la tienen caen en la fecha de la propia factura, que es la de
// despacho (así se rotula en pantalla).
const fechaDespachoDe = (equipo, factura) =>
  equipo?.fechaDespacho || factura?.fecha || null;

// Un equipo está vencido si ya llegó (o pasó) su fecha de devolución. Los que
// quedaron con entrega indefinida cuentan como vencidos: el cliente tenía que
// avisar y no avisó, y mientras tanto corren días.
const equipoVencido = (equipo, hoyIso) =>
  equipo?.vencimientoIndefinido ||
  (equipo?.fechaVencimiento && equipo.fechaVencimiento <= hoyIso);

// El estado de la factura, deducido de sus datos. Este es el único lugar
// donde se decide: todo lo demás pregunta acá.
export const calcularEstadoFactura = (factura, hoyIso = obtenerFechaHoyBogota()) => {
  const equipos = (Array.isArray(factura?.equipos) ? factura.equipos : []).filter(
    (equipo) => typeof equipo === "object",
  );

  // Sin líneas de equipo no hay nada que despachar todavía.
  if (equipos.length === 0) return "pendiente";

  const pendientes = equipos.filter((equipo) => calcularCantidadPendiente(equipo) > 0);

  // Ya no queda nada afuera: lo único que decide es si debe plata. Acá SÍ
  // cuenta lo que costaron las ampliaciones —ya no hay una renovación en
  // curso que se vaya a cobrar después, esta es la cuenta final—.
  if (pendientes.length === 0) {
    const saldoFinal = calcularCuentaFactura(factura, hoyIso).saldoPendiente;
    return saldoFinal > 0 ? "cobro" : "finalizada";
  }

  // Todavía no salieron los equipos.
  const yaSalio = pendientes.some((equipo) => {
    const fecha = fechaDespachoDe(equipo, factura);
    return fecha && fecha <= hoyIso;
  });
  if (!yaSalio) return "pendiente";

  if (pendientes.some((equipo) => equipoVencido(equipo, hoyIso))) return "vencida";

  // Regla de la prórroga: darle más días solo la devuelve a "activa" si el
  // cliente quedó al día con lo que YA debía —el saldo de ANTES de esta
  // renovación, "al día de la prórroga"—. Lo que valen los días recién
  // agregados no cuenta acá: esos se cobran cuando devuelva, igual que
  // cualquier otro día de alquiler en curso. Si se contaran, ampliar el
  // vencimiento nunca alcanzaría por sí solo para poner la factura al día.
  const hayProrroga = pendientes.some((equipo) => obtenerAmpliaciones(equipo).length > 0);
  if (hayProrroga) {
    const pagado = sumarPagosFactura(factura);
    const abonos = sumarAbonos(factura?.abonos);
    const saldoAntesDeAmpliar = Math.max(
      0,
      (Number(factura?.valorTotal) || 0) - pagado - abonos,
    );
    if (saldoAntesDeAmpliar > 0) return "vencida";
  }

  return "activa";
};

// El estado que se le muestra a un CLIENTE es un resumen de sus facturas, no
// un dato propio: gana la que exige atención más pronto. Este es el orden.
//
// A diferencia del estado de la factura, este SÍ se guarda en Firestore: la
// lista de clientes lee solo la colección `clientes`, y traer las facturas de
// todos para calcularlo al vuelo sería lento y caro. Se recalcula cada vez que
// se toca una factura y cada vez que se abre Seguimiento.
const PRIORIDAD_ESTADO_CLIENTE = [
  "vencida", // se pasó la fecha y tiene equipos afuera: hay que llamar ya
  "cobro", // devolvió todo pero debe plata: hay que insistir
  "pendiente", // falta despachar: acción nuestra
  "activa", // equipos en la calle, corriendo días
  "finalizada", // solo si TODAS lo están
];

// Resume las facturas de un cliente en un solo estado. Ojo: hay que pasarle
// TODAS las facturas del cliente, no un subconjunto filtrado.
export const calcularEstadoCliente = (facturas, hoyIso = obtenerFechaHoyBogota()) => {
  const lista = Array.isArray(facturas) ? facturas : [];

  // Sin facturas el cliente está inactivo, que es con lo que nace uno recién
  // creado.
  if (lista.length === 0) return "inactivo";

  const estados = lista.map((factura) => calcularEstadoFactura(factura, hoyIso));

  return PRIORIDAD_ESTADO_CLIENTE.find((estado) => estados.includes(estado)) ?? "inactivo";
};

// ── La gestión: qué se hizo para destrabar la factura ──────────────────
//
// El estado dice en qué punto está la factura; la gestión dice qué se hizo
// para moverla. Se ve SOLO en Seguimiento, y solo entran ahí las facturas
// vencidas o en cobro.
//
//   sinGestionar   recién entró, nadie la trabajó todavía
//   sinRespuesta   se llamó y el cliente no contestó
//   prorroga       se le autorizaron más días
//   parcial        devolvió una parte de los equipos
//   cobro          devolvió todos, pero quedó debiendo
//
// El color de cada una vive en el tema, en `palette.custom.gestionFactura`.
export const GESTION_INFO = {
  sinGestionar: { label: "Sin gestionar", Icono: RadioButtonUncheckedIcon },
  sinRespuesta: { label: "Sin respuesta", Icono: PhoneMissedIcon },
  prorroga: { label: "Renovación", Icono: EventRepeatIcon },
  parcial: { label: "Parcial", Icono: AssignmentReturnIcon },
  cobro: { label: "Cobro", Icono: PaidIcon },
};

// Todo lo que se hizo con la factura queda en una sola línea de tiempo,
// guardada en `factura.gestiones`:
//
//   { tipo, fecha, hora, ...datos propios del tipo }
//
// Los tipos son "llamada" (con el número marcado y si contestó o no),
// "prorroga" (con los días dados), "parcial" y "cobro" (las devoluciones).
// Las tres últimas se anotan solas al hacer la acción; la llamada la registra
// quien llama.
export const obtenerGestiones = (factura) =>
  (Array.isArray(factura?.gestiones) ? factura.gestiones : []).filter(Boolean);

// La hora de Colombia en formato HH:MM, para sellar cada registro.
export const obtenerHoraBogotaHHMM = () =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());

// Un registro nuevo para la línea de tiempo, ya sellado con la fecha y la
// hora de Colombia. Quien lo llama solo pasa el tipo y sus datos.
export const crearRegistroGestion = (tipo, datos = {}) => ({
  tipo,
  fecha: obtenerFechaHoyBogota(),
  hora: obtenerHoraBogotaHHMM(),
  ...datos,
});

// Cuántas veces se llamó sin que el cliente conteste. Es el número que
// acompaña al chip ("Sin respuesta ×3") y la medida de cuánto se insistió.
export const contarLlamadasSinRespuesta = (factura) =>
  obtenerGestiones(factura).filter(
    (registro) => registro.tipo === "llamada" && !registro.contesto,
  ).length;

// La gestión vigente: la última acción registrada, salvo que la factura ya
// esté en cobro —devolvió todo y debe plata—, que manda sobre cualquier otra
// cosa porque es lo único que queda por resolver.
//
// El contador de llamadas sin respuesta va aparte (ver arriba): así una
// factura en cobro sigue mostrando cuántas veces se insistió.
export const calcularGestionFactura = (factura, estado) => {
  if (estado === "cobro") return "cobro";

  const gestiones = obtenerGestiones(factura);
  for (let i = gestiones.length - 1; i >= 0; i -= 1) {
    const registro = gestiones[i];
    if (registro.tipo === "llamada") {
      // Una llamada atendida no es una gestión en sí: lo que importa es lo
      // que se acordó en ella (una prórroga, una devolución), que se anota
      // aparte. Se sigue buscando hacia atrás.
      if (!registro.contesto) return "sinRespuesta";
      continue;
    }
    if (GESTION_INFO[registro.tipo]) return registro.tipo;
  }

  return "sinGestionar";
};

// Las facturas que se trabajan en Seguimiento: las que tienen equipos
// vencidos afuera y las que ya devolvieron todo pero deben plata. Salen de la
// lista al volver a "activa" (prórroga con el saldo al día) o al finalizarse.
export const facturaEnSeguimiento = (factura, hoyIso = obtenerFechaHoyBogota()) =>
  ["vencida", "cobro"].includes(calcularEstadoFactura(factura, hoyIso));

// Etiqueta ordinal para cada fecha del historial: "1er vencimiento",
// "2do vencimiento", etc.
export const etiquetaVencimiento = (indice) => {
  const ordinales = ["1er", "2do", "3er", "4to", "5to", "6to", "7mo", "8vo", "9no", "10mo"];
  return `${ordinales[indice] || `${indice + 1}º`} vencimiento`;
};

// Días calendario entre dos fechas ISO. Positivo si "hasta" es posterior.
// Se usa para saber cuántos días lleva vencido un equipo y cuántos días se
// le agregaron al ampliarle el plazo.
export const diferenciaEnDias = (desdeIso, hastaIso) => {
  if (!desdeIso || !hastaIso) return 0;
  const [a1, m1, d1] = desdeIso.split("-").map(Number);
  const [a2, m2, d2] = hastaIso.split("-").map(Number);
  const desde = Date.UTC(a1, m1 - 1, d1);
  const hasta = Date.UTC(a2, m2 - 1, d2);
  return Math.round((hasta - desde) / 86400000);
};
