// ⚠️  ARCHIVO GENERADO — NO EDITAR A MANO.
//
// Es una copia de src/Utils/resumenDocumentos.js, hecha por
// scripts/sincronizar-calculos.js en cada despliegue. Cualquier cambio que se
// escriba acá se pierde en el próximo deploy.
//
// Para cambiar algo, tocá el original. Es el mismo archivo que usa la app, así
// que la corrección vale para las dos partes a la vez.

// LAS COTIZACIONES Y CUENTAS DE COBRO DEL MES EN LA PIZARRA (2026-10-22).
//
// El menú mostraba cuántas cotizaciones y cuentas de cobro hubo en el mes
// preguntándoselo a la base en CADA visita: 2 lecturas cada vez que alguien
// entraba. Ahora lo lleva el servidor en la pizarra (resumen/totales), con el
// detalle que pidió el dueño —cotizadas y por atender, pagadas y por cobrar—,
// y el menú lo recibe en la misma lectura de siempre.
//
// Este archivo lo usan los dos lados: la app para leer la pizarra y el
// servidor para escribirla (viaja como copia a functions/compartido; ver
// scripts/sincronizar-calculos.js). Por eso no importa nada de pantalla.
//
// CÓMO SE MANTIENE. Cada vez que se escribe una cotización o una cuenta, el
// servidor recibe cómo estaba antes y cómo quedó, calcula lo que aportaba y lo
// que aporta, y suma la DIFERENCIA. Mismo método que los equipos activos con
// las facturas (ver calcularAporteFactura): cero lecturas, una escritura.
//
// POR MES. Los números se guardan bajo el mes en que nació cada documento
// ("2026-10"), no en un único casillero que haya que poner en cero el día 1: a
// la medianoche el menú simplemente empieza a leer el mes nuevo, que todavía
// no tiene nada. Y tocar en noviembre una cotización de octubre ajusta octubre,
// que es donde se contó.
//
// EL ESTADO QUE SE MUEVE. Abrir un documento lo deja "enProceso" mientras
// alguien lo trabaja. Decisión del dueño: eso no mueve ningún número. Se cuenta
// en el estado que traía (`statusPrevio`) hasta que se termine de verdad.

// El mes de un instante, en hora de Colombia: "AAAA-MM". El servidor corre en
// otra zona horaria y una cotización de las 9 p.m. del 31 caería en el mes
// siguiente.
export const mesBogota = (ms) => {
  const [anio, mes] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date(ms))
    .split("-");
  return `${anio}-${mes}`;
};

// Cuándo empezó ese mes en Colombia, en milisegundos. Colombia no cambia de
// hora en el año: siempre es 5 horas menos que la hora universal.
export const inicioDeMesBogota = (ms) => {
  const [anio, mes] = mesBogota(ms).split("-").map(Number);
  return Date.UTC(anio, mes - 1, 1, 5);
};

// El estado en que se cuenta un documento. Mismo criterio que
// calcularStatusPrevio (Utils/estadoDocumento): uno abierto sin estado anterior
// anotado es un trabajo a medias.
export const estadoReal = (documento) =>
  documento.status === "enProceso" ? documento.statusPrevio || "pausada" : documento.status;

// Lo que se cobra en una cuenta: el "Total a cancelar" que muestra la lista de
// cuentas, con el depósito por cobrar sumado aparte.
//
// Sin el tope en cero de la lista, a propósito: el repaso de la madrugada
// rehace esta misma cuenta con sumas de la base (total − pagado − abonos +
// depósito, de todas las cuentas juntas), y una suma no puede aplicar un tope
// documento por documento. Así los dos caminos dan siempre lo mismo. Solo se
// separarían con una cuenta cobrada de más, que no se emite.
export const montoCuentaCobro = (cuenta) =>
  (Number(cuenta.total) || 0) -
  (Number(cuenta.pagado) || 0) -
  (Number(cuenta.abonos) || 0) +
  (Number(cuenta.depositoPorCobrar) || 0);

// Lo que suma una cotización a su mes: cuenta en el total, y en cotizadas si ya
// se le mandó el precio al cliente. Las pendientes y las pausadas son "por
// atender": el cliente todavía no tiene respuesta. null si no existe.
export const aporteCotizacion = (cotizacion) => {
  const nacio = Number(cotizacion?.createdAt);
  if (!nacio) return null;
  return {
    mes: mesBogota(nacio),
    valores: { total: 1, cotizadas: estadoReal(cotizacion) === "creada" ? 1 : 0 },
  };
};

// Lo que suma una cuenta de cobro a su mes. Solo las EMITIDAS, igual que el
// número del menú desde siempre: un borrador no se facturó. null si no cuenta.
export const aporteCuentaCobro = (cuenta) => {
  const nacio = Number(cuenta?.creadaEn);
  if (!nacio || cuenta.emitida !== true) return null;

  const monto = montoCuentaCobro(cuenta);
  const pagada = estadoReal(cuenta) === "pagada";
  return {
    mes: mesBogota(nacio),
    valores: {
      total: 1,
      monto,
      pagadas: pagada ? 1 : 0,
      montoPagadas: pagada ? monto : 0,
    },
  };
};

// Cuánto hay que sumarle a cada mes entre cómo estaba un documento y cómo
// quedó: { "2026-10": { total: 1, cotizadas: 0 } }. Solo lo que se movió; si
// nada se movió, un objeto vacío y no se escribe.
export const diferenciaPorMes = (aporteAntes, aporteDespues) => {
  const cambios = {};
  const sumar = (aporte, signo) => {
    if (!aporte) return;
    cambios[aporte.mes] = cambios[aporte.mes] || {};
    Object.entries(aporte.valores).forEach(([clave, valor]) => {
      cambios[aporte.mes][clave] = (cambios[aporte.mes][clave] || 0) + signo * valor;
    });
  };
  sumar(aporteAntes, -1);
  sumar(aporteDespues, 1);

  return Object.fromEntries(
    Object.entries(cambios)
      .map(([mes, valores]) => [
        mes,
        Object.fromEntries(Object.entries(valores).filter(([, valor]) => valor !== 0)),
      ])
      .filter(([, valores]) => Object.keys(valores).length > 0),
  );
};

// EL RECUENTO (lunes, miércoles y viernes de madrugada). Por si un ajuste se
// perdió, el servidor rehace el mes con preguntas de contar y sumar, que
// cuestan 1 lectura cada una sin importar cuántos documentos haya. Estas dos
// arman, con esas respuestas, lo mismo que se va sumando con los ajustes.
//
// Las que alguien tiene abiertas se preguntan aparte: su estado dice
// "enProceso", pero se cuentan en el que traían.
export const cotizacionesDesdeConteos = ({ todas, cotizadas, cotizadasAbiertas }) => ({
  total: todas,
  cotizadas: cotizadas + cotizadasAbiertas,
});

// Cada grupo trae { cantidad, total, pagado, abonos, deposito }: las sumas de
// esos campos en todas sus cuentas.
const montoDeSumas = (sumas) =>
  (sumas.total || 0) - (sumas.pagado || 0) - (sumas.abonos || 0) + (sumas.deposito || 0);

export const cuentasCobroDesdeSumas = ({ emitidas, pagadas, pagadasAbiertas }) => ({
  total: emitidas.cantidad,
  monto: montoDeSumas(emitidas),
  pagadas: pagadas.cantidad + pagadasAbiertas.cantidad,
  montoPagadas: montoDeSumas(pagadas) + montoDeSumas(pagadasAbiertas),
});

// LO QUE LEE LA APP: el mes de hoy, con lo que falta calculado. `porMes` llega
// en null mientras la pizarra no tenga el dato (entre que se publica y corre
// el primer recuento); un mes sin nada todavía es cero, no "no está listo".
export const cotizacionesDelMes = (porMes, mes) => {
  if (!porMes) return null;
  const valores = porMes[mes] || {};
  const total = Number(valores.total) || 0;
  const cotizadas = Number(valores.cotizadas) || 0;
  return { total, cotizadas, porAtender: total - cotizadas };
};

export const cuentasCobroDelMes = (porMes, mes) => {
  if (!porMes) return null;
  const valores = porMes[mes] || {};
  const total = Number(valores.total) || 0;
  const monto = Number(valores.monto) || 0;
  const pagadas = Number(valores.pagadas) || 0;
  const montoPagadas = Number(valores.montoPagadas) || 0;
  return {
    total,
    monto,
    pagadas,
    montoPagadas,
    porCobrar: total - pagadas,
    montoPorCobrar: monto - montoPagadas,
  };
};
