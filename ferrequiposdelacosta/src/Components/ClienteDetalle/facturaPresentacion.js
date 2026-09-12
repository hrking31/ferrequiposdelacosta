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
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import EventIcon from "@mui/icons-material/Event";
import SavingsIcon from "@mui/icons-material/Savings";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import {
  calcularEquipo,
  calcularEstadoEquipo,
  calcularVencimiento,
  diasDeAlquiler,
  diasDeEquipo,
  esPagoDeVencidos,
  etiquetaVencimiento,
  obtenerFechaHoyBogota,
} from "./facturaCuentas";
import { ampliacionesDe, estaDevuelto } from "./facturaModelo";
import { formatearFechaLegible, formatearMoneda } from "../../Utils/formato";

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
  devolucionParcial: { label: "Devolución parcial", Icono: AssignmentReturnIcon },
  devolucionTotal: { label: "Devolución total", Icono: AssignmentReturnIcon },
  cobro: { label: "Cobro", Icono: PaidIcon },
};

// Las fechas de vencimiento por las que ya pasó un equipo: la que tenía antes
// de cada ampliación. La vigente no está acá — esa la pinta su propio chip.
const historialVencimientos = (equipo) =>
  ampliacionesDe(equipo)
    .map((ampliacion) => ampliacion?.fechaAnterior)
    .filter(Boolean);

// ── La historia de fechas de un equipo ─────────────────────────────────
//
// Los chips que cuentan qué pasó con una línea de equipo: cuándo salió, hasta
// cuándo tenía que volver, cuántos días se le agregaron y cuántos lleva de
// más. Es la MISMA lista para Seguimiento y para Detalle Cliente.
//
// Que sea una sola función no es prolijidad: antes cada pantalla armaba sus
// chips por su cuenta y terminaron contando cosas distintas de la misma
// factura. Detalle mostraba "+2 días $ 400.000" y "7 días vencidos
// $ 1.400.000"; Seguimiento, para el mismo equipo, "+9 días $ 1.800.000" y
// otra vez los 7 días vencidos al lado — porque no le restaba los días
// abiertos al total. Se leía como si se cobraran $3.200.000 de más cuando
// eran $1.800.000.
//
// Cada chip sale como DATO, no como componente: `{ clave, label, Icono, tono,
// tramo, enCadena }`. El tono dice qué peso tiene, y cada pantalla lo pinta con
// sus propias variantes de Chip —Seguimiento usa el color de la urgencia,
// Detalle distingue el alta de lo agregado después—. Lo que se unifica es QUÉ
// dice cada chip, no cómo se ve.
//
//   neutro      un dato más, sin urgencia
//   resuelto    una fecha que ya pasó pero que se resolvió ampliando: es
//               historia, no un problema abierto
//   acento      los días que se pactaron al ampliar
//   exito       algo a favor del cliente (devolvió, se le descontó)
//   alerta      vence hoy: hay que actuar antes de que pase a rojo
//   urgente     ya venció y sigue afuera
//   indefinido  quedó sin fecha y el cliente tiene que avisar
//
// ── Los tres tramos ──
//
// Los chips venían saliendo en una fila plana, todos del mismo peso, y eso los
// volvía difíciles de leer aunque cada uno dijera la verdad: "se venció el 05",
// "se le dieron 2 días" y "quedó para el 07" son tres partes de UNA frase, y
// estaban cortadas en tres fichas sueltas mezcladas con el precio por día.
//
// Ahora cada chip declara a qué tramo pertenece, y las pantallas los dibujan
// separados por un corte fino:
//
//   1 TRAYECTO  qué se llevó y cuándo salió (y cuándo volvió, si volvió)
//   2 PLAZO     hasta cuándo era, qué se le amplió, en qué quedó
//   3 VENCIDO   lo que pasó con el plazo una vez cumplido: los días que
//               corren solos si no devolvió, o los que no se le cobran si
//               devolvió antes
//
// `enCadena` marca los chips del tramo 2 que son eslabones de la misma
// secuencia temporal (vencía → +2 días → venció): las pantallas les ponen una
// flecha adelante. El descuento va en el mismo tramo pero SIN flecha, porque no
// es un paso de la cadena sino una condición de esos días.
export const TRAMO_FECHAS = {
  TRAYECTO: 1,
  PLAZO: 2,
  VENCIDO: 3,
};

export const describirFechasEquipo = (equipo, hoyIso = obtenerFechaHoyBogota()) => {
  const chips = [];
  const devuelto = estaDevuelto(equipo);
  const valorPorDia =
    (Number(equipo?.cantidadEquipos) || 0) * (Number(equipo?.valorDia) || 0);
  const conValor = (monto) =>
    valorPorDia > 0 ? ` ${formatearMoneda(monto)}` : "";
  const plural = (n, palabra) => `${n} ${palabra}${n === 1 ? "" : "s"}`;

  // ── TRAMO 1: qué se llevó, cuándo salió, cuándo volvió ──────────────
  //
  // La fecha de salida va primero: es el arranque de la historia. Los días
  // contratados y el precio por día vienen detrás porque son las condiciones de
  // ese despacho, no fechas. Antes estos dos abrían la fila y empujaban las
  // fechas al medio, donde se mezclaban con lo que vino después.
  if (equipo?.fechaDespacho) {
    chips.push({
      clave: "despacho",
      tramo: TRAMO_FECHAS.TRAYECTO,
      tono: "neutro",
      Icono: LocalShippingIcon,
      label: `Salió ${formatearFechaLegible(equipo.fechaDespacho)}`,
    });
  }

  if (Number(equipo?.diasAlquilados) > 0) {
    chips.push({
      clave: "dias",
      tramo: TRAMO_FECHAS.TRAYECTO,
      tono: "neutro",
      Icono: EventIcon,
      label: plural(Number(equipo.diasAlquilados), "día"),
    });
  }

  if (Number(equipo?.valorDia) > 0) {
    chips.push({
      clave: "valorDia",
      tramo: TRAMO_FECHAS.TRAYECTO,
      tono: "neutro",
      Icono: AttachMoneyIcon,
      label: `${formatearMoneda(Number(equipo.valorDia))}/día`,
    });
  }

  if (devuelto && equipo?.devolucion?.fechaDevolucion) {
    chips.push({
      clave: "devuelto",
      tramo: TRAMO_FECHAS.TRAYECTO,
      tono: "exito",
      Icono: AssignmentReturnIcon,
      label: `Devuelto ${formatearFechaLegible(equipo.devolucion.fechaDevolucion)}`,
    });
  }

  // ── TRAMO 2: el plazo y lo que se pactó sobre él ────────────────────
  //
  // Las fechas por las que ya pasó van en tono "resuelto", no en rojo: esa
  // fecha se venció, sí, pero se resolvió dándole más días. Dejarlas en rojo
  // ponía dos fechas rojas seguidas y no se sabía cuál mandaba.
  //
  // Con una sola ampliación dice "Vencía 05/08" —en pasado, que es lo que se
  // entiende sin explicación—. Recién si hubo varias se numeran, porque ahí sí
  // hace falta saber cuál fue primero.
  const historial = historialVencimientos(equipo);
  historial.forEach((fecha, indice) => {
    chips.push({
      clave: `vencimiento-${indice}`,
      tramo: TRAMO_FECHAS.PLAZO,
      tono: "resuelto",
      enCadena: true,
      Icono: EventBusyIcon,
      label:
        historial.length === 1
          ? `Vencía ${formatearFechaLegible(fecha)}`
          : `${etiquetaVencimiento(indice)} ${formatearFechaLegible(fecha)}`,
    });
  });

  // Los días que se le AGREGARON al ampliar, sin los que corren solos: esos
  // tienen su propio chip en el tramo siguiente.
  const cuenta = calcularEquipo(equipo, hoyIso);
  // El reparto de días —los del alta, los ampliados y los vencidos— sale de
  // una sola función, compartida con el desglose de la ficha y con los PDF.
  const dias = diasDeEquipo(equipo, hoyIso);
  const diasAmpliados = dias.ampliados;
  if (diasAmpliados > 0) {
    // El valor es el NETO de esos días: lo que de verdad se cobra por ellos,
    // ya con el descuento restado. El descuento tiene su propio chip al lado,
    // que dice de dónde salió la diferencia.
    const netoAmpliado = Math.max(
      0,
      diasAmpliados * valorPorDia - cuenta.descuento,
    );
    chips.push({
      clave: "ampliacion",
      tramo: TRAMO_FECHAS.PLAZO,
      tono: "acento",
      enCadena: true,
      label: `+${plural(diasAmpliados, "día")}${conValor(netoAmpliado)}`,
    });
  }

  // Sin flecha: no es un paso de la cadena, es una condición de esos días.
  if (cuenta.descuento > 0) {
    chips.push({
      clave: "descuento",
      tramo: TRAMO_FECHAS.PLAZO,
      tono: "exito",
      Icono: SavingsIcon,
      label: `Descuento ${formatearMoneda(cuenta.descuento)}`,
    });
  }

  // Hasta cuándo quedó. Cierra el tramo a propósito: primero se lee de dónde
  // viene y recién al final en qué quedó.
  if (equipo?.vencimientoIndefinido) {
    chips.push({
      clave: "indefinido",
      tramo: TRAMO_FECHAS.PLAZO,
      tono: "indefinido",
      enCadena: historial.length > 0 || diasAmpliados > 0,
      Icono: EventIcon,
      label: "Entrega indefinida",
    });
  } else if (!devuelto && equipo?.fechaVencimiento) {
    // Misma regla que usa Seguimiento para agrupar: hoy es ámbar, antes de hoy
    // es rojo. La fecha vigente es la única que se pinta de urgencia.
    const vencido = equipo.fechaVencimiento < hoyIso;
    const venceHoy = equipo.fechaVencimiento === hoyIso;
    chips.push({
      clave: "vencimiento",
      tramo: TRAMO_FECHAS.PLAZO,
      tono: vencido ? "urgente" : venceHoy ? "alerta" : "neutro",
      // La flecha solo si hay de dónde venir: en una factura sin renovaciones
      // este chip es el único del tramo y una flecha suelta no ataría nada.
      enCadena: historial.length > 0 || diasAmpliados > 0,
      Icono: vencido ? EventBusyIcon : AssignmentReturnIcon,
      label: `${vencido ? "Venció" : venceHoy ? "Vence hoy" : "Devuelve"} ${formatearFechaLegible(
        equipo.fechaVencimiento,
      )}`,
    });
  }

  // ── TRAMO 3: lo que pasó con el plazo una vez cumplido ──────────────
  //
  // Los días que se le vencieron y el cliente YA PAGÓ. Van en verde y con su
  // valor: la cifra ahí no reclama nada, cuenta lo que entró.
  //
  // Es el registro de que ese equipo estuvo afuera de fecha, y tiene que
  // sobrevivir al pago: sin él, una vez sellados los días, la pantalla no
  // podría distinguir a un cliente que devolvió a tiempo de otro que se pasó
  // dos días y los pagó. Lo que no sobrevive es el rojo — ver
  // sellarDiasVencidos.
  if (dias.pagados > 0) {
    chips.push({
      clave: "diasVencidosPagados",
      tramo: TRAMO_FECHAS.VENCIDO,
      tono: "exito",
      Icono: PaidIcon,
      label: `${plural(dias.pagados, "día")} vencido${
        dias.pagados === 1 ? "" : "s"
      } pagado${dias.pagados === 1 ? "" : "s"}${conValor(dias.pagados * valorPorDia)}`,
    });
  }

  // Vale igual para el que sigue afuera y para el que ya volvió: los días de
  // más son días vencidos aunque el equipo esté de vuelta en la bodega.
  if (dias.vencidos > 0) {
    chips.push({
      clave: "diasVencidos",
      tramo: TRAMO_FECHAS.VENCIDO,
      tono: "urgente",
      label: `${plural(dias.vencidos, "día")} vencido${
        dias.vencidos === 1 ? "" : "s"
      }${conValor(dias.vencidos * valorPorDia)}`,
    });
  }

  // El espejo: devolvió ANTES de la fecha, así que no usó todo lo que había
  // pactado.
  //
  // Va SIN monto, y es a propósito. Antes acá había un crédito en negativo,
  // porque el total llevaba cobrados los días completos y había que
  // descontarlos aparte. Ahora esos días nunca se cobraron: el chip cuenta un
  // hecho —devolvió antes— y poner una cifra haría pensar que hay una plata a
  // favor que no existe.
  if (devuelto && equipo?.fechaVencimiento) {
    // Lo que le habían prometido, menos lo que alcanzó a usar de eso. Los días
    // vencidos no entran: ahí el sobrante es cero por definición.
    const diasSinUsar =
      diasDeAlquiler(equipo.fechaDespacho, equipo.fechaVencimiento) -
      (dias.alta + dias.ampliados);
    if (diasSinUsar > 0) {
      chips.push({
        clave: "diasSinUsar",
        tramo: TRAMO_FECHAS.VENCIDO,
        tono: "exito",
        Icono: SavingsIcon,
        label: `Devolvió ${plural(diasSinUsar, "día")} antes`,
      });
    }
  }

  return chips;
};

// Los mismos chips repartidos en sus tramos, sin los que quedaron vacíos. Las
// pantallas dibujan un corte fino entre grupo y grupo.
//
// Una factura al día suele devolver dos grupos —lo que se llevó y hasta cuándo
// es—, y una sin renovaciones ni atrasos, uno solo. El agrupado no le agrega
// nada al caso simple: solo aparece cuando hay historia que contar.
export const agruparChipsFechas = (chips) =>
  Object.values(TRAMO_FECHAS)
    .map((tramo) => chips.filter((chip) => chip.tramo === tramo))
    .filter((grupo) => grupo.length > 0);

// El grupo "Entrega indefinida" (sin fecha, el cliente debe avisar) iba con el
// mismo gris que "Vence": dos situaciones distintas —una tiene fecha futura
// conocida, la otra no tiene ninguna— quedaban visualmente idénticas. Va en
// teal, fijo en los dos modos como los demás colores de bloque: no hay otro
// tono libre en la paleta (rojo, ámbar, azul, violeta, rosa y verde ya están
// tomados).
export const COLOR_ENTREGA_INDEFINIDA = "#0D9488";

// Con qué se pinta cada chip de describirFechasEquipo. Va acá y no en cada
// pantalla por lo mismo que el contenido: cuando el vestido se escribe dos
// veces, termina distinto. Recibe el tema porque necesita calcular el
// contraste de los fondos plenos.
//
// La clave entra además del tono por un solo motivo: de los dos chips
// "urgentes", la FECHA vigente vencida es el titular y va en rojo pleno,
// mientras que el contador de días vencidos va en texto rojo. Dos bloques
// sólidos seguidos compiten y no se sabe cuál leer primero.
export const estiloChipFecha = ({ clave, tono }, theme) => {
  const solido = (color) => ({
    variant: "metaEstado",
    sx: {
      bgcolor: color,
      color: theme.palette.getContrastText(color),
      border: "none",
      // Sobre un fondo pleno, el ícono va del color del texto.
      "& .MuiChip-icon": { color: "inherit" },
    },
  });

  switch (tono) {
    case "urgente":
      return clave === "vencimiento"
        ? solido(theme.palette.error.main)
        : { variant: "metaEstado", sx: { fontWeight: 600, color: "error.main" } };
    case "alerta":
      return solido(theme.palette.warning.main);
    case "indefinido":
      return solido(COLOR_ENTREGA_INDEFINIDA);
    case "exito":
      return {
        variant: "metaEstado",
        sx: {
          fontWeight: 600,
          color: "success.main",
          "& .MuiChip-icon": { color: "inherit" },
        },
      };
    case "acento":
      return { variant: "meta", sx: { color: "custom.accent" } };
    // Una fecha que ya pasó pero se resolvió ampliando: es historia, va
    // atenuada. Antes iba en rojo pleno igual que la vigente, y las dos
    // competían.
    case "resuelto":
      return { variant: "meta", sx: { color: "text.secondary" } };
    default:
      return { variant: "meta", sx: undefined };
  }
};

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
const enDias = (n) => `${n} ${n === 1 ? "día" : "días"}`;

export const historialEquipo = (equipo, hoyIso = obtenerFechaHoyBogota()) => {
  const porDia =
    (Number(equipo?.cantidadEquipos) || 0) * (Number(equipo?.valorDia) || 0);
  const ampliaciones = ampliacionesDe(equipo);
  const dias = diasDeEquipo(equipo, hoyIso);
  const devuelto = estaDevuelto(equipo);
  const estado = calcularEstadoEquipo(equipo, hoyIso);
  const indefinidaDesde = equipo?.indefinidaDesde ?? null;

  // Un tramo corrió "con permiso" si para cuando empezó el cliente ya había
  // avisado que no sabía cuándo devolver.
  const conPermiso = (desde) =>
    Boolean(indefinidaDesde && desde && indefinidaDesde <= desde);

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

  // 2. EL VENCIMIENTO INICIAL, solo cuando dejó de ser el vigente. Mientras
  // siga siéndolo se lee abajo, en el próximo vencimiento: repetirlo arriba
  // sería la misma fecha dos veces.
  const primera = ampliaciones[0];
  if (primera?.fechaAnterior) {
    hitos.push({
      clave: "vencimiento-inicial",
      fecha: primera.fechaAnterior,
      tono: "vencido",
      titulo: "Vencimiento inicial",
      detalle: "Debía devolverse este día.",
      // El chip solo si de verdad se pasó. Al que le dieron más días ANTES de
      // vencer no se le venció nada, y decírselo sería inventarle una mora.
      chip: Number(primera.diasVencidos) > 0 ? "vencido" : null,
    });
  }

  // 3. LO QUE PASÓ CON CADA RENOVACIÓN, en dos hitos distintos: los días que
  // ya se le habían vencido —que se cierran ahí— y los que se le pactaron.
  ampliaciones.forEach((ampliacion, indice) => {
    const vencidos = Number(ampliacion?.diasVencidos) || 0;
    const pedidos = Number(ampliacion?.diasPedidos) || 0;
    const pagados = esPagoDeVencidos(ampliacion);

    if (vencidos > 0) {
      hitos.push({
        clave: `vencidos-${indice}`,
        // El último día del tramo, no el primero: los días corren DESDE la
        // fecha que tenía el equipo, así que el tramo se cierra tantos días
        // después. Es cuando el contador llegó a ese número.
        fecha: ampliacion?.fechaAnterior
          ? calcularVencimiento(ampliacion.fechaAnterior, vencidos)
          : null,
        tono: "vencido",
        // Mismo estado, distinta razón: con permiso cambia el nombre, no el
        // color.
        titulo: conPermiso(ampliacion?.fechaAnterior)
          ? "Entrega indefinida"
          : "Días vencidos",
        // "pagados" es lo que explica que el contador vuelva a cero sin meter
        // el pago en la historia: el pago es plata, y esto es el equipo.
        detalle: `${enDias(vencidos)}${pagados ? " · pagados" : ""}`,
        valor: vencidos * porDia,
        // Ya cerrados: van con el acento de lo pactado y no con el rojo de lo
        // que se está reclamando.
        valorTono: "acordado",
      });
    }

    if (pedidos > 0) {
      hitos.push({
        clave: `pactado-${indice}`,
        fecha: ampliacion?.fecha ?? ampliacion?.fechaNueva ?? null,
        tono: "acordado",
        titulo: "Seguimiento con cliente",
        detalle: `Se pactaron ${enDias(pedidos)}`,
        valor: Math.max(
          0,
          pedidos * porDia - (Number(ampliacion?.descuentoRealizado) || 0),
        ),
        valorTono: "acordado",
      });
    }
  });

  // 4. EL DÍA QUE QUEDÓ SIN FECHA. Es el único hito que necesita un dato
  // guardado aparte: la marca de entrega indefinida se prende y se apaga, y
  // cuándo se prendió no lo decía nadie.
  if (indefinidaDesde) {
    hitos.push({
      clave: "indefinida",
      fecha: indefinidaDesde,
      tono: "indefinida",
      titulo: "Seguimiento con cliente",
      detalle: "El cliente indicó que todavía no sabe cuándo lo devuelve.",
      chip: "indefinida",
    });
  }

  // 5. LO QUE ESTÁ CORRIENDO AHORA. A diferencia de los tramos de arriba,
  // este no está cerrado: crece un día por cada día que pasa, y por eso va en
  // rojo — es lo único de toda la historia que todavía se le reclama.
  if (dias.vencidos > 0) {
    hitos.push({
      clave: "vencidos-hoy",
      fecha: hoyIso,
      tono: "vencido",
      titulo: equipo?.vencimientoIndefinido
        ? "Entrega indefinida"
        : "Días vencidos",
      detalle: enDias(dias.vencidos),
      valor: dias.vencidos * porDia,
      valorTono: "vencido",
    });
  }

  // 6. LA VUELTA A BODEGA, con lo que se haya retenido por daños.
  if (devuelto && equipo?.devolucion?.fechaDevolucion) {
    const retenido = Number(equipo.devolucion.valorRetenido) || 0;
    hitos.push({
      clave: "devolucion",
      fecha: equipo.devolucion.fechaDevolucion,
      tono: "devuelto",
      titulo: "Devolución",
      detalle: retenido > 0 ? "Volvió con daños." : "El equipo volvió a bodega.",
      valor: retenido > 0 ? retenido : null,
      valorTono: "vencido",
      chip: retenido > 0 ? null : "devuelto",
    });
  }

  // 7. HASTA CUÁNDO QUEDÓ. El que está afuera sin fecha no lo lleva: eso ya
  // lo cuenta el hito del acuerdo, y una fila que dijera "sin fecha" sería
  // repetirlo.
  if (!devuelto && equipo?.fechaVencimiento && !equipo?.vencimientoIndefinido) {
    hitos.push({
      clave: "proximo-vencimiento",
      fecha: equipo.fechaVencimiento,
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
