// Medios de pago que maneja la empresa (Nequi y Nequi A son cuentas Nequi
// distintas, de dos personas diferentes).
export const MODOS_PAGO = ["Nequi", "Nequi A", "Bancolombia", "Daviplata", "Efectivo"];

export const formatearMonedaInput = (valor) => (valor ? Number(valor).toLocaleString("es-CO") : "");

export const limpiarMonedaInput = (texto) => texto.replace(/\D/g, "");

export const formatearFechaLegible = (fechaIso) => {
  if (!fechaIso) return "";
  const [anio, mes, dia] = fechaIso.split("-");
  return `${dia}/${mes}/${anio}`;
};

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
