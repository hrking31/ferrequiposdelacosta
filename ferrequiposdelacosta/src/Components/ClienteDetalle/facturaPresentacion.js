// LO QUE SE DIBUJA de los estados y las gestiones: su nombre en pantalla y su
// ícono, en un solo lugar, para que una pantalla que muestre un estado no
// tenga que saber con qué se pinta.
//
// Está separado de facturaCalculos.js porque estos íconos son componentes de
// React: existen en el navegador y no en el servidor. Una copia de las cuentas
// corre dentro de la Cloud Function que mantiene los totales del menú, y con
// un solo import de MUI de por medio dejaría de poder hacerlo.
//
// La regla: **si dibuja, va acá; si calcula, va a facturaCalculos.js**.
//
// El color de cada estado no está acá sino en el tema
// (`palette.custom.estadoFactura` y `palette.custom.gestionFactura`).
//
// Nadie importa este archivo directamente: se sigue pidiendo todo a
// facturaUtils.js, que reexporta esto y las cuentas juntas.
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
import {
  calcularFechaDevolucion,
  calcularEstadoEquipo,
  calcularVencimiento,
  diasDeAlquiler,
  cubiertoHasta,
  diasDeEquipo,
  obtenerFechaHoyBogota,
} from "./facturaCuentas";
import {
  ampliacionesDe,
  estaDevuelto,
  indefinidaDe,
  vencidosDe,
} from "./facturaModelo";
import {
  formatearDias as enDias,
} from "../../Utils/formato";

// El nombre y el ícono de cada estado de factura. Los estados en sí, y el
// orden en que van, viven en facturaCuentas.js (ESTADOS_FACTURA_EN_ORDEN).
export const ESTADO_FACTURA_INFO = {
  pendiente: { label: "Pendiente", Icono: HourglassTopIcon },
  activa: { label: "Activa", Icono: AgricultureIcon },
  vencida: { label: "Vencida", Icono: ErrorIcon },
  cobro: { label: "Cobro", Icono: PaidIcon },
  finalizada: { label: "Finalizada", Icono: CheckCircleIcon },
};

// El nombre de cada estado de EQUIPO. Los estados y su orden viven en
// facturaCuentas.js (ESTADOS_EQUIPO_EN_ORDEN); el color, en el tema
// (custom.estadoEquipo).
//
// Sin ícono, a diferencia de los de factura: van en la lista de equipos de la
// ficha, uno por renglón, y ahí el color del borde ya distingue. Un ícono por
// fila sería ruido en una lista de diez equipos.
export const ESTADO_EQUIPO_INFO = {
  pendiente: { label: "Pendiente" },
  activo: { label: "Activo" },
  ampliacion: { label: "Ampliación" },
  vencido: { label: "Vencido" },
  devuelto: { label: "Devuelto" },
};

// La entrega indefinida no es un estado aparte —el equipo está vencido igual,
// solo que con permiso— pero sí es un rótulo: aparece en el historial, en el
// hito del acuerdo y en los tramos que corrieron así.
export const ETIQUETA_ENTREGA_INDEFINIDA = "Entrega indefinida";

// El rótulo más largo que puede llevar un equipo: los cinco estados más la
// entrega indefinida. TODOS los rótulos miden esto —el de la fila y los de la
// historia— así que las dos columnas se leen como una sola.
//
// Se calcula de las listas de arriba en vez de escribir un ancho en píxeles:
// cambiar una palabra ajusta el ancho solo.
export const ROTULO_ESTADO_MAS_LARGO = [
  ...Object.values(ESTADO_EQUIPO_INFO).map((info) => info.label),
  ETIQUETA_ENTREGA_INDEFINIDA,
].reduce((masLargo, label) => (label.length > masLargo.length ? label : masLargo), "");

// El cliente usa el mismo vocabulario que sus facturas, más "inactivo" para
// cuando no tiene ninguna.
export const ESTADO_CLIENTE_INFO = {
  inactivo: { label: "Inactivo", Icono: RemoveCircleOutlineIcon },
  ...ESTADO_FACTURA_INFO,
};

// El nombre y el ícono de cada gestión. Los tipos en sí viven en
// facturaCuentas.js (TIPOS_GESTION), porque calcularGestionFactura los
// necesita y no puede depender de estos íconos.
export const GESTION_INFO = {
  sinGestionar: { label: "Sin gestionar", Icono: RadioButtonUncheckedIcon },
  sinRespuesta: { label: "Sin respuesta", Icono: PhoneMissedIcon },
  prorroga: { label: "Renovación", Icono: EventRepeatIcon },
  // "Parcial" y no "Devolución parcial": el ícono que lleva al lado ya es el
  // de devolución, y el rótulo largo obligaba al chip a medir 172px —40 más
  // que todos los demás— para una etiqueta que se entiende igual.
  devolucionParcial: { label: "Parcial", Icono: AssignmentReturnIcon },
  devolucionTotal: { label: "Devolución total", Icono: AssignmentReturnIcon },
  cobro: { label: "Cobro", Icono: PaidIcon },
};

// El grupo "Entrega indefinida" (sin fecha, el cliente debe avisar) iba con el
// mismo gris que "Vence": dos situaciones distintas —una tiene fecha futura
// conocida, la otra no tiene ninguna— quedaban visualmente idénticas. Va en
// teal, fijo en los dos modos como los demás colores de bloque: no hay otro
// tono libre en la paleta (rojo, ámbar, azul, violeta, rosa y verde ya están
// tomados).
export const COLOR_ENTREGA_INDEFINIDA = "#0D9488";

// ── LA HISTORIA DE UN EQUIPO, hito por hito ────────────────────────────
//
// Los chips de arriba cuentan el ESTADO de hoy: cuándo vence, cuántos días
// lleva de más. Esto cuenta lo que PASÓ, en el orden en que pasó, que es otra
// pregunta: por qué el equipo está donde está.
//
// La diferencia se ve en la entrega indefinida. Como chip vive mientras la
// marca esté encendida; al renovarle el plazo se apaga y no queda rastro de
// que el equipo estuvo sin fecha. Acá es un hito con su día, y los hitos no
// se apagan.
//
// Cada hito trae lo que la pantalla necesita y nada más: el día, qué pasó,
// cuánto costó y de qué tono es. El tono nombra la idea —vencido, acordado,
// devuelto— y el color sale del tema, igual que en el resto de la ficha.
//
// UNA REGLA DE COLOR, que es la del negocio: la entrega indefinida NO es un
// estado aparte. El equipo está vencido igual —tenía que volver y no volvió—,
// solo que con permiso. Así que su tramo lleva el rojo del vencimiento y lo
// único que cambia es el nombre. Darle color propio inventaría un sexto
// estado de equipo que ninguna otra pantalla conoce.
export const historialEquipo = (equipo, hoyIso = obtenerFechaHoyBogota()) => {
  const porDia =
    (Number(equipo?.cantidadEquipos) || 0) * (Number(equipo?.valorDia) || 0);
  const dias = diasDeEquipo(equipo, hoyIso);
  const devuelto = estaDevuelto(equipo);
  const estado = calcularEstadoEquipo(equipo, hoyIso);
  const indefinida = indefinidaDe(equipo);
  const tramos = vencidosDe(equipo);
  const cubierto = cubiertoHasta(equipo);
  const corte = equipo?.devolucion?.fechaDevolucion ?? hoyIso;

  const hitos = [];

  // 1. LA SALIDA. Un equipo cuyo despacho todavía no llegó no salió: su
  // historia arranca con lo único que pasó, que es que se programó.
  const porSalir = estado === "pendiente";
  hitos.push({
    clave: "salida",
    fecha: equipo?.fechaDespacho ?? null,
    tono: porSalir ? "pendiente" : "salida",
    titulo: porSalir ? "Salida programada" : "Salida en alquiler",
    detalle: porSalir
      ? `Pendiente: se entrega por ${enDias(dias.alta)}.`
      : `Se entregó el equipo por ${enDias(dias.alta)}.`,
    valor: dias.alta * porDia,
  });

  // 2. CADA PLAZO QUE SE CUMPLIÓ. Un renglón por cada fecha en la que el
  // equipo debía volver: la del alta y la de cada ampliación que se le dio
  // después.
  //
  // Antes solo existía el del alta, y el de una ampliación se leía abajo, en
  // el próximo vencimiento — que se apaga en cuanto el equipo vuelve. Así, el
  // BENITIN de la 8154 perdía el 16/09 el día que entró a bodega: la historia
  // decía que vencía el 14, que se le dieron 2 días, y después saltaba a 6
  // días vencidos sin decir nunca desde cuándo corrían.
  //
  // Se muestra el plazo que QUEDÓ ATRÁS. El que todavía no llegó es el
  // vigente y se lee abajo; el del equipo que volvió antes de tiempo no se
  // muestra, porque nunca llegó a vencer.
  const finDelAlta = calcularFechaDevolucion(
    equipo?.fechaDespacho,
    Number(equipo?.diasAlquilados) || 0,
  );
  const plazos = [
    ...new Set(
      [finDelAlta, ...ampliacionesDe(equipo).map((a) => a?.hasta)].filter(
        Boolean,
      ),
    ),
  ].sort();

  plazos.forEach((plazo, indice) => {
    if (plazo >= corte) return;

    // LLEGÓ A VENCERSE si al día siguiente arrancó un tramo, aunque ese tramo
    // no sume un solo día. El que se abre y se cierra en el acto —el cliente
    // renovó justo el día que vencía— igual deja escrito que el equipo llegó
    // a estar vencido, que es el caso de la 0123 de ReYaz, y así es como entra
    // a cartera ese día para poder avisarle que vence mañana.
    //
    // Al que le dieron más días ANTES de su fecha no se le venció nada: no
    // tiene tramo, y decírselo sería inventarle una mora.
    hitos.push({
      clave: `vencimiento-${indice}`,
      fecha: plazo,
      tono: "vencido",
      titulo: "Venció el plazo",
      detalle: "Debía devolverse este día.",
      chip: tramos.some(
        (tramo) => tramo?.desde === calcularVencimiento(plazo, 1),
      )
        ? "vencido"
        : null,
    });
  });

  // 3. CADA TRAMO QUE YA SE CERRÓ. El equipo se pasó de plazo y alguien lo
  // cerró —pagó, pidió días o devolvió—, así que sus dos fechas quedaron
  // escritas y no se recalculan nunca más.
  tramos.forEach((tramo, indice) => {
    if (!tramo?.hasta || !tramo?.desde) return;
    const diasTramo = diasDeAlquiler(tramo.desde, tramo.hasta);
    if (diasTramo <= 0) return;

    hitos.push({
      clave: `vencidos-${indice}`,
      // El último día del tramo, no el primero: es cuando el contador llegó a
      // ese número.
      fecha: tramo.hasta,
      tono: "vencido",
      // Mismo estado, distinta razón: con permiso cambia el nombre, no el
      // color.
      titulo: tramo.indefinida ? "Entrega indefinida" : "Días vencidos",
      // Solo los días. Si el cliente los pagó o no NO se dice acá: el equipo
      // muestra lo que CUESTA —para poder confirmar la cuenta—, nunca la
      // plata del cliente, que entra a su cuenta y puede repartirse entre
      // varias facturas.
      detalle: enDias(diasTramo),
      valor: diasTramo * porDia,
      // Ya cerrados: van con el acento de lo pactado y no con el rojo de lo
      // que se está reclamando.
      valorTono: "acordado",
    });
  });

  // 4. LO QUE EL CLIENTE PIDIÓ. La ampliación ya no mezcla días vencidos
  // adentro: son los días que pidió y nada más.
  ampliacionesDe(equipo).forEach((ampliacion, indice) => {
    const pedidos = Number(ampliacion?.dias) || 0;
    if (pedidos <= 0) return;

    hitos.push({
      clave: `pactado-${indice}`,
      fecha: ampliacion?.fecha ?? ampliacion?.desde ?? null,
      tono: "acordado",
      titulo: "Seguimiento con cliente",
      detalle: `Se pactaron ${enDias(pedidos)}`,
      valor: Math.max(
        0,
        pedidos * porDia - (Number(ampliacion?.descuento) || 0),
      ),
      valorTono: "acordado",
    });
  });

  // 5. EL DÍA QUE QUEDÓ SIN FECHA DE ENTREGA.
  if (indefinida?.desde) {
    hitos.push({
      clave: "indefinida",
      fecha: indefinida.desde,
      tono: "indefinida",
      titulo: "Seguimiento con cliente",
      detalle: "Cliente no sabe cuándo lo devuelve",
      chip: "indefinida",
    });
  }

  // 6. EL TRAMO QUE ESTÁ CORRIENDO. A diferencia de los de arriba, este no
  // está cerrado: crece un día por cada día que pasa, y por eso va en rojo —
  // es lo único de toda la historia que todavía se le reclama.
  const abierto = tramos.find((tramo) => !tramo?.hasta);
  if (abierto?.desde && dias.vencidos > 0) {
    const corriendo = diasDeAlquiler(abierto.desde, corte);
    hitos.push({
      clave: "vencidos-hoy",
      fecha: corte,
      tono: "vencido",
      titulo: abierto.indefinida ? "Entrega indefinida" : "Días vencidos",
      detalle: enDias(corriendo),
      valor: corriendo * porDia,
      valorTono: "vencido",
    });
  }

  // 7. LA VUELTA A BODEGA, con lo que se haya retenido por daños.
  if (devuelto && equipo?.devolucion?.fechaDevolucion) {
    const retenido = Number(equipo.devolucion.valorRetenido) || 0;
    hitos.push({
      clave: "devolucion",
      fecha: equipo.devolucion.fechaDevolucion,
      tono: "devuelto",
      titulo: "Devolución",
      // Lo que dijo el cliente al devolverlo, cuando alguien lo anotó: se
      // pregunta al registrar una devolución anticipada, y explica por qué el
      // equipo volvió antes de tiempo.
      detalle: equipo.devolucion.motivoDevolucion
        ? `Cliente: ${equipo.devolucion.motivoDevolucion}`
        : retenido > 0
          ? "Volvió con daños."
          : "El equipo volvió a bodega.",
      valor: retenido > 0 ? retenido : null,
      valorTono: "vencido",
      chip: retenido > 0 ? null : "devuelto",
    });
  }

  // 8. HASTA CUÁNDO QUEDÓ. El que está afuera sin fecha no lo lleva: eso ya
  // lo cuenta el hito del acuerdo, y una fila que dijera "sin fecha" sería
  // repetirlo.
  //
  // Solo si esa fecha TODAVÍA NO LLEGÓ: es un próximo vencimiento, no un
  // vencimiento cualquiera. La que ya pasó la cuenta arriba el plazo cumplido,
  // y sin esta condición el mismo día saldría dos veces —una como "venció" y
  // otra como "próximo"— en cuanto un equipo amanece pasado de fecha.
  if (!devuelto && cubierto && !indefinida?.activa && cubierto >= hoyIso) {
    hitos.push({
      clave: "proximo-vencimiento",
      fecha: cubierto,
      tono: estado,
      titulo: "Próximo vencimiento",
      // Sin descripción: "fecha de devolución" es lo mismo que acaba de decir
      // el título, y repetirlo ocupaba un renglón para no agregar nada.
      chip: estado,
    });
  }

  // En orden de calendario, y los del mismo día en el orden en que ocurrieron
  // —que es el que ya traen—. El descuento no tiene hito propio: viaja
  // restado en el valor de lo pactado, que es lo que de verdad se cobra.
  return hitos
    .map((hito, orden) => ({ ...hito, orden }))
    .sort((a, b) => {
      if (!a.fecha || !b.fecha || a.fecha === b.fecha) return a.orden - b.orden;
      return a.fecha < b.fecha ? -1 : 1;
    });
};

// ── LO ÚLTIMO QUE SE PACTÓ POR ESTE EQUIPO ─────────────────────────────
//
// Cartera no pregunta por la historia del equipo, pregunta a quién llamar
// hoy. Y antes de marcar el número hace falta saber si ya se habló: quien no
// lo sabe le reclama al cliente un equipo que él mismo le autorizó la semana
// pasada.
//
// Solo lo que es DEL EQUIPO —los días que se le dieron, que quedó sin fecha—.
// La llamada y el WhatsApp son del CLIENTE: se pregunta por todo lo que tiene
// afuera, no por un equipo, y por eso se leen una sola vez arriba, en la
// gestión de la factura.
//
// El devuelto no lleva nada: ya no hay nada que acordarle.
export const ultimoAcuerdoEquipo = (equipo) => {
  if (estaDevuelto(equipo)) return null;

  // Sin fecha de entrega manda sobre la última ampliación: es el acuerdo que
  // está vigente, y el que explica por qué este equipo no tiene fecha.
  const indefinida = indefinidaDe(equipo);
  if (indefinida?.activa && indefinida.desde) {
    return { fecha: indefinida.desde, texto: "Quedó sin fecha de entrega" };
  }

  const ampliaciones = ampliacionesDe(equipo);
  const ultima = ampliaciones[ampliaciones.length - 1];
  if (!ultima?.fecha) return null;

  return { fecha: ultima.fecha, texto: `Se le dieron ${enDias(ultima.dias)}` };
};

// ── DESDE CUÁNDO ESTÁ AFUERA ESTE EQUIPO ──────────────────────
//
// No es lo mismo negociar por un equipo que lleva catorce días en la obra que
// por uno que salió anteayer, y el plazo solo no lo dice: "se pasó 7 días"
// puede ser un alquiler corto o uno que ya lleva un mes.
//
// Cuenta hasta HOY mientras el equipo siga afuera, y hasta el día en que
// volvió si volvió. El que todavía no salió no lleva ninguno.
export const describirSalidaEquipo = (equipo, hoyIso = obtenerFechaHoyBogota()) => {
  const salida = equipo?.fechaDespacho;
  if (!salida) return null;

  const corte = equipo?.devolucion?.fechaDevolucion ?? hoyIso;

  return { fecha: salida, dias: Math.max(0, diasDeAlquiler(salida, corte)) };
};
