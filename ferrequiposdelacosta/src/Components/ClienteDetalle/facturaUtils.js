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

// Historial de vencimientos de un equipo: todas las fechas por las que pasó
// ANTES de la vigente. Cada vez que se amplía el plazo se le agrega la fecha
// que estaba rigiendo hasta ese momento.
//
// Las facturas creadas antes de que existiera este historial solo guardaban
// "fechaVencimientoOriginal" (una sola fecha, la primera). Para esas se
// devuelve esa única fecha, así siguen mostrándose bien sin migrar datos.
export const obtenerHistorialVencimientos = (equipo) => {
  if (Array.isArray(equipo?.vencimientos)) {
    return equipo.vencimientos.filter(Boolean);
  }
  return equipo?.fechaVencimientoOriginal ? [equipo.fechaVencimientoOriginal] : [];
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
