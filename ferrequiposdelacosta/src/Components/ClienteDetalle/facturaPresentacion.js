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
import {
  calcularAmpliacionEquipo,
  equipoDevueltoCompleto,
  etiquetaVencimiento,
  obtenerFechaHoyBogota,
  obtenerHistorialVencimientos,
} from "./facturaCalculos";
import { formatearFechaLegible, formatearMoneda } from "../../Utils/formato";

// El nombre y el ícono de cada estado de factura. Los estados en sí, y el
// orden en que van, viven en facturaCalculos.js (ESTADOS_FACTURA_EN_ORDEN).
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

// El nombre y el ícono de cada gestión. Los tipos en sí viven en
// facturaCalculos.js (TIPOS_GESTION), porque calcularGestionFactura los
// necesita y no puede depender de estos íconos.
export const GESTION_INFO = {
  sinGestionar: { label: "Sin gestionar", Icono: RadioButtonUncheckedIcon },
  sinRespuesta: { label: "Sin respuesta", Icono: PhoneMissedIcon },
  prorroga: { label: "Renovación", Icono: EventRepeatIcon },
  parcial: { label: "Parcial", Icono: AssignmentReturnIcon },
  cobro: { label: "Cobro", Icono: PaidIcon },
};

// ── La historia de fechas de un equipo ─────────────────────────────────
//
// Los chips que cuentan qué pasó con una línea de equipo: cuándo salió, hasta
// cuándo tenía que volver, cuántos días se le agregaron y cuántos lleva de
// más. Es la MISMA lista para Seguimiento y para Detalle Cliente.
//
// Que sea una sola función no es prolijidad: antes cada pantalla armaba sus
// chips por su cuenta y terminaron contando cosas distintas de la misma
// factura. Detalle mostraba "+2 días · $400.000" y "7 días vencidos ·
// $1.400.000"; Seguimiento, para el mismo equipo, "+9 días · $1.800.000" y
// otra vez los 7 días vencidos al lado — porque no le restaba los días
// abiertos al total. Se leía como si se cobraran $3.200.000 de más cuando
// eran $1.800.000.
//
// Cada chip sale como DATO, no como componente: `{ clave, label, Icono,
// tono }`. El tono dice qué peso tiene, y cada pantalla lo pinta con sus
// propias variantes de Chip —Seguimiento usa el color de la urgencia, Detalle
// distingue el alta de lo agregado después—. Lo que se unifica es QUÉ dice
// cada chip, no cómo se ve.
//
//   neutro      un dato más, sin urgencia
//   resuelto    una fecha que ya pasó pero que se resolvió ampliando: es
//               historia, no un problema abierto
//   acento      los días que se pactaron al ampliar
//   exito       algo a favor del cliente (devolvió, se le descontó)
//   alerta      vence hoy: hay que actuar antes de que pase a rojo
//   urgente     ya venció y sigue afuera
//   indefinido  quedó sin fecha y el cliente tiene que avisar
export const describirFechasEquipo = (equipo, hoyIso = obtenerFechaHoyBogota()) => {
  const chips = [];
  const devuelto = equipoDevueltoCompleto(equipo);
  const valorPorDia =
    (Number(equipo?.cantidad) || 0) * (Number(equipo?.valor) || 0);
  const conValor = (monto) =>
    valorPorDia > 0 ? ` · ${formatearMoneda(monto)}` : "";
  const plural = (n, palabra) => `${n} ${palabra}${n === 1 ? "" : "s"}`;

  // 1. De dónde salió.
  if (equipo?.fechaDespacho) {
    chips.push({
      clave: "despacho",
      tono: "neutro",
      Icono: LocalShippingIcon,
      label: `Despacho ${formatearFechaLegible(equipo.fechaDespacho)}`,
    });
  }

  if (devuelto && equipo?.fechaDevolucion) {
    chips.push({
      clave: "devuelto",
      tono: "exito",
      Icono: AssignmentReturnIcon,
      label: `Devuelto ${formatearFechaLegible(equipo.fechaDevolucion)}`,
    });
  }

  // 2. Las fechas por las que ya pasó. Van en tono "resuelto", no en rojo:
  //    esa fecha se venció, sí, pero se resolvió dándole más días. Dejarlas en
  //    rojo ponía dos fechas rojas seguidas y no se sabía cuál mandaba.
  obtenerHistorialVencimientos(equipo).forEach((fecha, indice) => {
    chips.push({
      clave: `vencimiento-${indice}`,
      tono: "resuelto",
      Icono: EventBusyIcon,
      label: `${etiquetaVencimiento(indice)} ${formatearFechaLegible(fecha)}`,
    });
  });

  // 3. Los días que se PACTARON al ampliar, sin los que corren solos: el total
  //    que devuelve el cálculo los trae sumados, y los abiertos tienen su
  //    propio chip más abajo.
  const ampliacion = calcularAmpliacionEquipo(equipo, hoyIso);
  const diasPactados = ampliacion.dias - ampliacion.diasAbiertos;
  if (diasPactados > 0) {
    const neto = Math.max(0, diasPactados * valorPorDia - ampliacion.descuento);
    chips.push({
      clave: "ampliacion",
      tono: "acento",
      label: `+${plural(diasPactados, "día")}${conValor(neto)}`,
    });
  }

  if (ampliacion.descuento > 0) {
    chips.push({
      clave: "descuento",
      tono: "exito",
      Icono: SavingsIcon,
      label: `Descuento ${formatearMoneda(ampliacion.descuento)}`,
    });
  }

  // 4. Hasta cuándo quedó. Va después de las ampliaciones a propósito: primero
  //    se lee de dónde viene y recién al final en qué quedó.
  if (equipo?.vencimientoIndefinido) {
    chips.push({
      clave: "indefinido",
      tono: "indefinido",
      Icono: EventIcon,
      label: "Entrega indefinida — el cliente debe avisar",
    });
  } else if (!devuelto && equipo?.fechaVencimiento) {
    // Misma regla que usa Seguimiento para agrupar: hoy es ámbar, antes de hoy
    // es rojo. La fecha vigente es la única que se pinta de urgencia.
    const vencido = equipo.fechaVencimiento < hoyIso;
    const venceHoy = equipo.fechaVencimiento === hoyIso;
    chips.push({
      clave: "vencimiento",
      tono: vencido ? "urgente" : venceHoy ? "alerta" : "neutro",
      Icono: vencido ? EventBusyIcon : AssignmentReturnIcon,
      label: `${vencido ? "Venció" : venceHoy ? "Vence hoy" : "Devuelve"} ${formatearFechaLegible(
        equipo.fechaVencimiento,
      )}`,
    });
  }

  // 5. Lo que se acumuló desde que venció y nadie pactó nada.
  if (ampliacion.diasAbiertos > 0) {
    chips.push({
      clave: "diasVencidos",
      tono: "urgente",
      label: `${plural(ampliacion.diasAbiertos, "día")} vencido${
        ampliacion.diasAbiertos === 1 ? "" : "s"
      }${conValor(ampliacion.diasAbiertos * valorPorDia)}`,
    });
  }

  return chips;
};

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
