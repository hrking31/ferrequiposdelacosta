// ARMAR FACTURAS PARA LAS PRUEBAS.
//
// Un documento de factura tiene cuatro nodos y varios niveles de anidado (ver
// facturaModelo.js). Escribirlo entero en cada prueba es media pantalla de
// llaves donde el dato que la prueba realmente examina —dos días, un valor—
// queda enterrado.
//
// Con esto una prueba dice solo lo suyo:
//
//   const doc = unaFactura({ equipos: [unEquipo({ dias: 3, valorDia: 5000 })] });
//
// y cualquier campo que no nombre queda en un valor razonable y estable. Si
// mañana el modelo suma un campo obligatorio, se agrega acá una vez y no en
// las once pruebas.
import {
  GRUPO_INICIAL,
  grupoAgregados,
} from "../Components/ClienteDetalle/facturaModelo";

export { GRUPO_INICIAL, grupoAgregados };

// Una línea de equipo. `devolucion` se pasa solo cuando la prueba necesita un
// equipo que ya volvió: su sola presencia es lo que dice que no está afuera.
//
// OJO CON LAS FECHAS. Los días pactados y la fecha en que vencen tienen que
// decir lo mismo: `fechaVencimiento` sale de `fechaDespacho` más los días —los
// del alta más los de cada ampliación— menos uno. Si se pasa una fecha suelta
// que no cuadra, la cuenta le va a creer a los DÍAS y el equipo va a figurar
// vencido por un mes donde la prueba quería un día. Para mover el vencimiento,
// mové también el despacho.
export const unEquipo = ({
  nombre = "ANDAMIO",
  cantidad = 1,
  valorDia = 10000,
  dias = 10,
  fechaDespacho = "2026-08-10",
  fechaVencimiento,
  ampliaciones = [],
  ...resto
} = {}) => ({
  nombre,
  cantidadEquipos: cantidad,
  valorDia,
  diasAlquilados: dias,
  fechaDespacho,
  // Por defecto, la que sale de los días: despacho el 10 por 10 días vence el
  // 19, contando el propio día de salida.
  fechaVencimiento: fechaVencimiento ?? sumarDias(fechaDespacho, dias - 1),
  ampliaciones,
  ...resto,
});

// Un equipo que ya volvió. Sus días son los que de verdad estuvo afuera, que
// es lo que el diálogo de devolución escribe al cerrarlo.
export const unEquipoDevuelto = ({
  fechaDevolucion = "2026-08-15",
  buenEstado = true,
  motivo = "",
  valorRetenido = 0,
  ...resto
} = {}) =>
  unEquipo({
    ...resto,
    devolucion: { fechaDevolucion, buenEstado, motivo, valorRetenido },
  });

// Un despacho: sus equipos, su pago, su flete y su depósito.
export const unGrupo = ({
  grupo = GRUPO_INICIAL,
  fechaSolicitud = "2026-08-10",
  tipoPago = "sinPago",
  pagos = [],
  transporte = "",
  valorTransporte = 0,
  valorDeposito = 0,
  aplicaIva = false,
  equipos = [unEquipo({ aplicaIva })],
} = {}) => ({
  grupo,
  fechaSolicitud,
  pagos: { tipoPago, medios: pagos },
  adicionales: {
    transporte,
    valorTransporte,
    deposito: valorDeposito > 0,
    valorDeposito,
  },
  equipos,
});

// El documento entero. Se puede pasar `grupos` armados a mano, o dejar que
// arme uno solo con los `equipos` y la plata que se le den.
export const unaFactura = ({
  numeroFactura = "1000",
  fechaCreacion = "2026-08-10",
  tipoPago = "sinPago",
  // La marca del IVA es de cada EQUIPO, no de la factura. Se acepta acá por
  // comodidad —una prueba dice `aplicaIva: true` y listo— y se le baja a los
  // equipos que no traigan la suya, que es exactamente lo que hace el
  // formulario al guardar.
  aplicaIva = false,
  depositoResuelto = false,
  cerrada = false,
  grupos,
  abonos = [],
  entregas = [],
  gestiones = [],
  // Atajos para el caso común: una factura con un solo despacho.
  equipos,
  pagos,
  transporte,
  valorTransporte,
  valorDeposito,
} = {}) => ({
  factura: {
    numeroFactura,
    fechaCreacion,
    depositoResuelto,
    cerrada,
  },
  grupos:
    grupos ??
    [
      unGrupo({
        fechaSolicitud: fechaCreacion,
        tipoPago,
        ...(equipos
          ? {
              equipos: equipos.map((equipo) => ({
                aplicaIva: equipo.aplicaIva ?? aplicaIva,
                ...equipo,
              })),
            }
          : {}),
        ...(pagos ? { pagos } : {}),
        ...(transporte ? { transporte } : {}),
        ...(valorTransporte ? { valorTransporte } : {}),
        ...(valorDeposito ? { valorDeposito } : {}),
      }),
    ],
  abonos,
  entregas,
  gestiones,
});

// Sumar días a una fecha AAAA-MM-DD, sin zonas horarias de por medio.
function sumarDias(fechaIso, dias) {
  const [anio, mes, dia] = fechaIso.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  const pad = (n) => String(n).padStart(2, "0");
  return `${fecha.getUTCFullYear()}-${pad(fecha.getUTCMonth() + 1)}-${pad(
    fecha.getUTCDate(),
  )}`;
}
