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
// entraba. Ahora lo lleva el servidor en la pizarra (resumen/totales), con
// cuántas hay en cada estado, y el menú lo recibe en la misma lectura de
// siempre.
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
// UN NÚMERO POR ESTADO, TAL CUAL. Decisión del dueño: "En proceso" va aparte,
// no sumado al estado que traía, para que el cuadro sirva también para ver las
// que quedaron abiertas y olvidadas. Y sin plata en las cuentas de cobro: los
// montos dependían de que cada quien llenara bien lo pagado y los abonos, y
// daban un número errado por cualquier descuido.
//
// Se guardan todos los estados menos uno, que sale de restar al total: así un
// estado desconocido no se pierde, cae en ese.

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

const uno = (condicion) => (condicion ? 1 : 0);

// Lo que suma una cotización a su mes. Las pendientes no se guardan: son el
// total menos las demás. null si no existe.
export const aporteCotizacion = (cotizacion) => {
  const nacio = Number(cotizacion?.createdAt);
  if (!nacio) return null;
  const { status } = cotizacion;
  return {
    mes: mesBogota(nacio),
    valores: {
      total: 1,
      pausadas: uno(status === "pausada"),
      enProceso: uno(status === "enProceso"),
      emitidas: uno(status === "creada"),
    },
  };
};

// Lo que suma una cuenta de cobro a su mes. Solo las EMITIDAS, igual que el
// número del menú desde siempre: un borrador no se facturó. Una ya emitida
// puede volver a quedar pausada si alguien guarda cambios sin emitirla otra
// vez. Las emitidas sin más no se guardan: son el total menos las demás.
// null si no cuenta.
export const aporteCuentaCobro = (cuenta) => {
  const nacio = Number(cuenta?.creadaEn);
  if (!nacio || cuenta.emitida !== true) return null;
  const { status } = cuenta;
  return {
    mes: mesBogota(nacio),
    valores: {
      total: 1,
      pausadas: uno(status === "pausada"),
      enProceso: uno(status === "enProceso"),
      pagadas: uno(status === "pagada"),
    },
  };
};

// Cuánto hay que sumarle a cada mes entre cómo estaba un documento y cómo
// quedó: { "2026-10": { pausadas: -1, emitidas: 1 } }. Solo lo que se movió; si
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

// LO QUE LEE LA APP: el mes de hoy, con el estado que falta calculado. `porMes`
// llega en null mientras la pizarra no tenga el dato (entre que se publica y
// corre el primer recuento); un mes sin nada todavía es cero, no "no está
// listo".
const numerosDe = (porMes, mes, claves) => {
  const valores = porMes[mes] || {};
  return Object.fromEntries(claves.map((clave) => [clave, Number(valores[clave]) || 0]));
};

export const cotizacionesDelMes = (porMes, mes) => {
  if (!porMes) return null;
  const n = numerosDe(porMes, mes, ["total", "pausadas", "enProceso", "emitidas"]);
  return { ...n, pendientes: n.total - n.pausadas - n.enProceso - n.emitidas };
};

export const cuentasCobroDelMes = (porMes, mes) => {
  if (!porMes) return null;
  const n = numerosDe(porMes, mes, ["total", "pausadas", "enProceso", "pagadas"]);
  return { ...n, emitidas: n.total - n.pausadas - n.enProceso - n.pagadas };
};
