import { useState } from "react";
import PropTypes from "prop-types";
import {
  Avatar,
  Box,
  Chip,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import PhoneIcon from "@mui/icons-material/Phone";
import UpdateIcon from "@mui/icons-material/Update";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
// Los mismos íconos que usan las facturas en Detalle Cliente, para que un
// equipo se lea igual en las dos pantallas.
import EventIcon from "@mui/icons-material/Event";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
// Ojo: es "Return", no "Returned". El que termina en "-ed" es un ícono
// distinto (de "ya devuelto") y no el que se usa para la ACCIÓN de
// registrar una devolución en ninguna otra parte de la app.
import AssignmentReturnIcon from "@mui/icons-material/AssignmentReturn";
import SavingsIcon from "@mui/icons-material/Savings";
import HistoryIcon from "@mui/icons-material/History";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import {
  diferenciaEnDias,
  calcularAmpliacionEquipo,
  calcularAmpliacionFactura,
  calcularCantidadPendiente,
  equipoDevueltoCompleto,
  calcularEstadoFactura,
  calcularGestionFactura,
  obtenerGestiones,
  GESTION_INFO,
} from "../ClienteDetalle/facturaUtils";
import { formatearMonedaOVacio, formatearHoraLegible } from "../../Utils/formato";
import AmpliarVencimientoDialog from "./AmpliarVencimientoDialog";
import RegistrarDevolucionDialog from "./RegistrarDevolucionDialog";
import RegistrarLlamadaDialog from "./RegistrarLlamadaDialog";


// Una factura entra a Seguimiento cuando vence, pero adentro puede tener
// equipos en distinta situación: unos ya vencidos, otros que vencen hoy y
// otros que todavía no. Se agrupan en ese orden, con lo urgente arriba.
const GRUPOS_VENCIMIENTO = [
  { clave: "hoy", titulo: "Vence hoy" },
  { clave: "vencido", titulo: "Vencido" },
  { clave: "vence", titulo: "Vence" },
  { clave: "indefinido", titulo: "Entrega indefinida" },
];

const clasificarVencimiento = (equipo, hoy) => {
  if (equipo.vencimientoIndefinido || !equipo.fechaVencimiento) return "indefinido";
  if (!hoy) return "vence";
  if (equipo.fechaVencimiento === hoy) return "hoy";
  if (equipo.fechaVencimiento < hoy) return "vencido";
  return "vence";
};

// Devuelve los equipos repartidos por grupo y ordenados por fecha dentro de
// cada uno. Los grupos que quedan vacíos no aparecen.
const agruparPorVencimiento = (equipos = [], hoy) => {
  const porGrupo = {};
  equipos.forEach((equipo, index) => {
    const clave = clasificarVencimiento(equipo, hoy);
    if (!porGrupo[clave]) porGrupo[clave] = [];
    porGrupo[clave].push({ equipo, index });
  });

  Object.values(porGrupo).forEach((lista) =>
    lista.sort((a, b) =>
      String(a.equipo.fechaVencimiento || "").localeCompare(
        String(b.equipo.fechaVencimiento || ""),
      ),
    ),
  );

  return GRUPOS_VENCIMIENTO.map((grupo) => ({
    ...grupo,
    items: porGrupo[grupo.clave] || [],
  })).filter((grupo) => grupo.items.length > 0);
};

const CODIGOS_SIN_TELEFONO = ["SN", "NT", "N/A", ""];

const tieneTelefonoValido = (telefono) =>
  telefono && !CODIGOS_SIN_TELEFONO.includes(String(telefono).trim().toUpperCase());

const obtenerNombreCompleto = (cliente) => {
  if (!cliente) return "";
  if (cliente.tipo === "empresa") return cliente.razonSocial || cliente.nombreOriginal;
  return [cliente.nombres, cliente.apellido].filter(Boolean).join(" ") || cliente.nombreOriginal;
};

// Ojo: esta es la variante que devuelve NADA si el valor no es un número, no la
// que muestra "$ 0". Ver Utils/formato.js.
const formatearMoneda = formatearMonedaOVacio;

const formatearFecha = (isoDate) => {
  if (!isoDate) return null;
  const [anio, mes, dia] = isoDate.split("-");
  return `${dia}/${mes}/${anio}`;
};

// Cada anotación de la línea de tiempo, contada en una frase. Los tipos son
// los que guarda la factura en `gestiones` (ver facturaUtils): la llamada la
// registra quien llama, las otras tres se anotan solas al hacer la acción.
const describirGestion = (registro) => {
  if (registro.tipo === "llamada") {
    const aQuien = registro.numero ? ` a ${registro.numero}` : "";
    return `Llamada${aQuien} — ${registro.contesto ? "contestó" : "no contestó"}`;
  }

  if (registro.tipo === "prorroga") {
    if (registro.indefinida && !registro.dias) return "Renovación: entrega indefinida";
    const dias = Number(registro.dias) || 0;
    const texto = `Renovación: ${dias} día${dias === 1 ? "" : "s"}`;
    return registro.indefinida ? `${texto} y entrega indefinida` : texto;
  }

  if (registro.tipo === "parcial" || registro.tipo === "total") {
    const unidades = Number(registro.unidades) || 0;
    const cuantos = unidades > 0 ? `: ${unidades} equipo${unidades === 1 ? "" : "s"}` : "";
    return `Devolución ${registro.tipo === "total" ? "total" : "parcial"}${cuantos}`;
  }

  return registro.tipo;
};

// ── El recordatorio de WhatsApp ────────────────────────────────────────
//
// Hay un texto por cada gestión, porque no es lo mismo escribirle a quien
// nunca contestó que a quien ya devolvió la mitad de los equipos. El que se
// manda depende de la gestión vigente de la factura ABIERTA en la tarjeta, no
// del cliente: con varias facturas en seguimiento, los números (equipos
// pendientes, saldo) no se podrían atribuir a ninguna.
//
// Todos comparten el saludo y la despedida, y todos tutean.
const construirMensajeWhatsapp = ({
  gestion,
  nombre,
  numeroFactura,
  hoy,
  equiposPendientes,
  saldo,
  fechaProrroga,
}) => {
  const saludo = `👋 Hola, ${nombre}.`;
  const despedida = "Gracias por confiar en Ferrequipos de la Costa.";
  const contacto = "Por favor comunícate con nosotros.";
  const laFactura = `tu factura N° ${numeroFactura}`;

  // "5 equipos pendientes de devolución y un saldo aproximado de $800.000",
  // saltándose la parte que no aplique. El saldo va como "aproximado" porque
  // incluye los días que siguen corriendo.
  const situacion = [
    equiposPendientes > 0 &&
      `${equiposPendientes} equipo${equiposPendientes === 1 ? "" : "s"} pendiente${
        equiposPendientes === 1 ? "" : "s"
      } de devolución`,
    saldo > 0 && `un saldo aproximado de ${formatearMoneda(saldo)}`,
  ]
    .filter(Boolean)
    .join(" y ");

  // Ya devolvió todo y solo debe plata: hablarle de devoluciones o de
  // extender el alquiler no tendría sentido, esto es cobranza.
  if (gestion === "cobro") {
    return [
      saludo,
      "",
      `Te recordamos que ${laFactura} tiene un saldo pendiente de ${formatearMoneda(saldo)}.`,
      "",
      "Ya recibimos todos los equipos, así que solo queda pendiente el pago.",
      "",
      `Si ya lo realizaste o quieres coordinarlo, ${contacto.toLowerCase()}`,
      "",
      despedida,
    ].join("\n");
  }

  // Se le dio más plazo. Si la fecha nueva todavía no llegó es un aviso; si
  // ya pasó, es un reclamo — el mismo texto sirve para los dos cambiando el
  // tiempo del verbo.
  if (gestion === "prorroga") {
    const plazo = fechaProrroga
      ? `El plazo que acordamos ${
          fechaProrroga < hoy ? "venció" : "vence"
        } el ${formatearFecha(fechaProrroga)}.`
      : "Habíamos acordado extender el alquiler hasta que nos avises.";

    return [
      saludo,
      "",
      `Te escribimos por ${laFactura}, a la que le extendimos el período de alquiler.`,
      "",
      plazo,
      ...(situacion ? ["", `A la fecha tienes ${situacion}.`] : []),
      "",
      `Si necesitas más tiempo o quieres coordinar la devolución, ${contacto.toLowerCase()}`,
      "",
      despedida,
    ].join("\n");
  }

  // Devolvió una parte. Primero se le reconoce lo que entregó: si no, el
  // mensaje suena a que no se registró su devolución.
  if (gestion === "parcial") {
    return [
      saludo,
      "",
      `Recibimos la devolución de parte de los equipos de ${laFactura}. ¡Gracias!`,
      ...(situacion ? ["", `Todavía quedan ${situacion}.`] : []),
      "",
      `Cuando puedas coordinar la entrega del resto, ${contacto.toLowerCase()}`,
      "",
      despedida,
    ].join("\n");
  }

  // Se le llamó y no contestó. Se dice, pero sin reproche: explica por qué
  // se le escribe por acá.
  if (gestion === "sinRespuesta") {
    return [
      saludo,
      "",
      "Hemos intentado comunicarnos contigo por teléfono sin lograrlo, por eso te escribimos por este medio.",
      "",
      `${laFactura.charAt(0).toUpperCase()}${laFactura.slice(1)} tiene el período de alquiler vencido${
        situacion ? `, con ${situacion}` : ""
      }.`,
      "",
      `Para extender el alquiler o coordinar la devolución, ${contacto.toLowerCase()}`,
      "",
      despedida,
    ].join("\n");
  }

  // Sin gestionar: el primer aviso, el día que se vence.
  return [
    saludo,
    "",
    `Te recordamos que hoy, ${formatearFecha(
      hoy,
    )}, finaliza el período de alquiler de los equipos registrados en ${laFactura}.`,
    ...(situacion ? ["", `Actualmente tienes ${situacion}.`] : []),
    "",
    "Si deseas extender el alquiler o coordinar la devolución, por favor comunícate con nosotros.",
    "",
    despedida,
  ].join("\n");
};

export default function ClienteSeguimientoCard({
  cliente,
  facturas,
  hoy,
  onEquiposActualizados,
}) {
  const theme = useTheme();
  const acento =
    theme.palette.custom.accent;
  const esMovil = useMediaQuery(theme.breakpoints.down("sm"));
  const [tabFactura, setTabFactura] = useState(0);
  const [detalleAbierto, setDetalleAbierto] = useState(false);
  // La bitácora de gestión arranca plegada: con varias llamadas registradas
  // la lista completa puede ocupar la pantalla entera, en PC igual que en
  // móvil. Se pliega/despliega aparte del resto de la factura.
  const [gestionAbierta, setGestionAbierta] = useState(false);
  // Plegar la factura, igual que en Detalle Cliente: arrancan TODAS plegadas
  // y lo que se guarda es cuáles se fueron abriendo, así la lista de clientes
  // se ve completa de un vistazo.
  const [facturasAbiertas, setFacturasAbiertas] = useState({});
  const facturaPlegada = (facturaId) => !facturasAbiertas[facturaId];
  const togglePlegarFactura = (facturaId) =>
    setFacturasAbiertas((prev) => ({ ...prev, [facturaId]: !prev[facturaId] }));
  const [ampliarOpen, setAmpliarOpen] = useState(false);
  const [devolucionOpen, setDevolucionOpen] = useState(false);
  const [llamadaOpen, setLlamadaOpen] = useState(false);

  // Acá se muestra la GESTIÓN, no el estado: el estado de la factura se ve en
  // Clientes y en Detalle Cliente. Son dos escalas distintas y no se mezclan
  // (ver facturaUtils).
  const coloresGestion = theme.palette.custom.gestionFactura;

  // Los colores de bloque son los MISMOS que en Detalle Cliente: un equipo se
  // ve igual en las dos pantallas. Los que se sumaron después de emitida la
  // factura van en violeta, como allá.
  const colorEquipos = theme.palette.custom.seccionEquipos;
  const colorEquiposAgregados = theme.palette.custom.seccionEquiposAgregados;
  const colorGestion = theme.palette.custom.seccionGestion;

  // El grupo "Entrega indefinida" (sin fecha, el cliente debe avisar) iba con
  // el mismo gris que "Vence": dos situaciones distintas —una tiene fecha
  // futura conocida, la otra no tiene ninguna— quedaban visualmente
  // idénticas. Va en teal, fijo en los dos modos como los demás colores de
  // bloque: no hay otro tono libre en la paleta de este componente (rojo,
  // ámbar, azul, violeta, rosa y verde ya están tomados).
  const colorIndefinido = "#0D9488";

  // El recuadro teñido de los bloques de factura: borde del color, un
  // resplandor hacia adentro y un degradado en diagonal. Copiado tal cual de
  // ClienteDetalle para que las dos pantallas no se separen.
  const recuadroDeBloque = (color) => ({
    p: 1,
    borderRadius: 1,
    bgcolor: "background.paper",
    border: "1px solid",
    borderColor: color,
    boxShadow: `inset 0 0 12px ${alpha(color, 0.2)}`,
    position: "relative",
    overflow: "hidden",
    "&::before": {
      content: '""',
      position: "absolute",
      inset: 0,
      borderRadius: "inherit",
      background: `linear-gradient(135deg, ${alpha(color, 0.12)}, ${alpha(color, 0.03)})`,
      pointerEvents: "none",
    },
  });

  // Tarjeta de un equipo: cantidad y nombre arriba, y abajo los datos como
  // chips. Si ya se le amplió el vencimiento, la fecha original aparece
  // marcada como "Vencido"; la vigente va aparte, según en qué situación está.
  const renderEquipo = (equipo, key, situacion) => {
    // Lo que cuesta un día de este equipo: el precio diario por la cantidad
    // alquilada. Sirve para valorizar tanto los días vencidos como los que se
    // le agregaron al ampliar.
    const valorPorDia =
      (Number(equipo.cantidad) || 0) * (Number(equipo.valor) || 0);

    // Días que lleva vencido: desde que venció hasta hoy.
    const diasVencidos =
      situacion === "vencido" ? diferenciaEnDias(equipo.fechaVencimiento, hoy) : 0;

    // Días agregados y lo que valen ya con el descuento aplicado. Si el equipo
    // quedó con entrega indefinida, acá ya vienen sumados los días que lleva
    // sin devolver.
    const ampliacionEquipo = calcularAmpliacionEquipo(equipo, hoy);

    const conValor = (dias) =>
      valorPorDia > 0 ? ` · ${formatearMoneda(dias * valorPorDia)}` : "";

    // El recuadro entero lleva el color de la URGENCIA, el mismo del rótulo
    // de su grupo: rojo lo vencido, ámbar lo que vence hoy, gris lo que
    // todavía tiene plazo, teal lo de entrega indefinida. En Seguimiento eso
    // importa más que de dónde vino el equipo —a diferencia de Detalle
    // Cliente, donde no hay urgencias que seguir y el color sí distingue el
    // alta de lo agregado después—.
    const color =
      situacion === "vencido"
        ? theme.palette.error.main
        : situacion === "hoy"
          ? theme.palette.warning.main
          : situacion === "indefinido"
            ? colorIndefinido
            : theme.palette.text.secondary;

    return (
      <Box key={key} sx={recuadroDeBloque(color)}>
        <Stack direction="row" alignItems="center" gap={1}>
          <Chip
            variant="meta"
            label={equipo.cantidad}
            size="small"
            sx={{ fontWeight: "bold", flexShrink: 0, color: "custom.accent" }}
          />
          <Typography variant="body2" fontWeight="bold" sx={{ flex: 1, minWidth: 0 }}>
            {equipo.nombre}
          </Typography>
        </Stack>

        <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.75 }}>
          <Chip
            variant="meta"
            size="small"
            icon={<EventIcon />}
            label={`${equipo.dias} día${Number(equipo.dias) === 1 ? "" : "s"}`}
          />

          {Number(equipo.valor) > 0 && (
            <Chip
              variant="meta"
              size="small"
              icon={<AttachMoneyIcon />}
              label={`${formatearMoneda(Number(equipo.valor))}/día`}
            />
          )}

          {equipo.fechaDespacho && (
            <Chip
              variant="meta"
              size="small"
              icon={<LocalShippingIcon />}
              label={`Despacho ${formatearFecha(equipo.fechaDespacho)}`}
            />
          )}

          {/* La fecha con la que había nacido el equipo, antes de la primera
              ampliación. Mismo chip que en Detalle Cliente: uno solo con la
              fecha original, no uno por cada ampliación que hubo después. */}
          {equipo.fechaVencimientoOriginal && (
            <Chip
              size="small"
              variant="metaEstado"
              icon={<EventBusyIcon />}
              sx={{
                bgcolor: "error.main",
                color: "error.contrastText",
                border: "none",
                "& .MuiChip-icon": { color: "inherit" },
              }}
              label={`Vencido ${formatearFecha(equipo.fechaVencimientoOriginal)}`}
            />
          )}

          {/* Días que se le sumaron al plazo, con lo que cuestan ya
              descontado, y el descuento aparte para que no quede escondido. */}
          {ampliacionEquipo.dias > 0 && (
            <Chip
              variant="meta"
              size="small"
              sx={{ color: "custom.accent" }}
              label={`+${ampliacionEquipo.dias} día${
                ampliacionEquipo.dias === 1 ? "" : "s"
              }${
                ampliacionEquipo.bruto > 0
                  ? ` · ${formatearMoneda(ampliacionEquipo.neto)}`
                  : ""
              }`}
            />
          )}

          {ampliacionEquipo.descuento > 0 && (
            <Chip
              variant="metaEstado"
              size="small"
              icon={<SavingsIcon />}
              sx={{
                fontWeight: 600,
                color: "success.main",
                "& .MuiChip-icon": { color: "inherit" },
              }}
              label={`Descuento ${formatearMoneda(ampliacionEquipo.descuento)}`}
            />
          )}

          {situacion === "indefinido" ? (
            <Chip
              size="small"
              variant="metaEstado"
              icon={<EventIcon />}
              sx={{
                bgcolor: colorIndefinido,
                color: theme.palette.getContrastText(colorIndefinido),
                border: "none",
                "& .MuiChip-icon": { color: "inherit" },
              }}
              label="Entrega indefinida — el cliente debe avisar"
            />
          ) : (
            equipo.fechaVencimiento && (
              <Chip
                size="small"
                variant={situacion === "vencido" ? "metaEstado" : "meta"}
                icon={situacion === "vencido" ? <EventBusyIcon /> : <AssignmentReturnIcon />}
                sx={
                  situacion === "vencido"
                    ? {
                        bgcolor: "error.main",
                        color: "error.contrastText",
                        border: "none",
                        // Sobre el rojo pleno, el ícono va del color del texto.
                        "& .MuiChip-icon": { color: "inherit" },
                      }
                    : { fontWeight: "bold" }
                }
                label={`${
                  situacion === "vencido"
                    ? "Venció"
                    : situacion === "hoy"
                      ? "Vence hoy"
                      : "Devuelve"
                } ${formatearFecha(equipo.fechaVencimiento)}`}
              />
            )
          )}

          {/* Lo que se acumuló desde que venció: cuántos días lleva y cuánto
              representa a precio de este equipo. */}
          {diasVencidos > 0 && (
            <Chip
              size="small"
              variant="metaEstado"
              sx={{ color: "error.main" }}
              label={`${diasVencidos} día${diasVencidos === 1 ? "" : "s"} vencido${
                diasVencidos === 1 ? "" : "s"
              }${conValor(diasVencidos)}`}
            />
          )}
        </Stack>
      </Box>
    );
  };

  // Línea de equipo ya devuelta del todo: se muestra aparte y atenuada, para
  // no mezclarla con lo que todavía hay que seguir.
  const renderEquipoDevuelto = (equipo, key) => (
    <Box
      key={key}
      sx={{
        ...recuadroDeBloque(
          equipo.agregadoPosteriormente ? colorEquiposAgregados : colorEquipos,
        ),
        // Atenuado: ya no hay nada que hacer con este equipo, pero se sigue
        // viendo para saber qué se devolvió y cuándo.
        opacity: 0.65,
      }}
    >
      <Stack direction="row" alignItems="center" gap={1}>
        <Chip
          variant="meta"
          label={equipo.cantidad}
          size="small"
          sx={{ fontWeight: "bold", flexShrink: 0 }}
        />
        <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
          {equipo.nombre}
        </Typography>
        <Chip
          size="small"
          variant="meta"
          icon={<AssignmentReturnIcon />}
          sx={{ color: "success.main", "& .MuiChip-icon": { color: "inherit" } }}
          label={`Devuelto ${formatearFecha(equipo.fechaDevolucion) || ""}`}
        />
      </Stack>
    </Box>
  );

  const gradosGrisPestana = theme.palette.custom.pestanaInactiva;

  const indiceActivo = Math.min(tabFactura, facturas.length - 1);
  const factura = facturas[indiceActivo];

  // La gestión vigente: lo último que se hizo con esta factura, salvo que ya
  // haya devuelto todo y solo deba plata —ahí manda "Cobro"—.
  const estadoFactura = calcularEstadoFactura(factura, hoy);
  const gestionClave = calcularGestionFactura(factura, estadoFactura);
  const gestionInfo = GESTION_INFO[gestionClave] || GESTION_INFO.sinGestionar;
  const gestionColor = coloresGestion[gestionClave] || theme.palette.custom.estadoNeutro;
  const IconoGestion = gestionInfo.Icono;
  const gestiones = obtenerGestiones(factura);

  // El cálculo de las ampliaciones vive en facturaUtils, compartido con
  // ClienteDetalle y con el diálogo que las guarda: así las tres pantallas
  // no pueden dar números distintos.
  const ampliacion = calcularAmpliacionFactura(factura, hoy);

  // Subtotal e IVA se muestran ya con los días ampliados sumados (menos el
  // descuento): son lo que hoy se le cobraría al cliente, no lo que decía la
  // factura el día que se emitió. Si la factura no traía el dato, se deja
  // vacío como antes en vez de mostrar un cero.
  const subtotal = formatearMoneda(
    typeof factura.subtotal === "number" ? ampliacion.nuevoSubtotal : factura.subtotal,
  );
  const iva = formatearMoneda(
    typeof factura.iva === "number" ? ampliacion.nuevoIva : factura.iva,
  );
  const deposito = formatearMoneda(factura.deposito);
  const valorTotal = formatearMoneda(
    ampliacion.hay ? ampliacion.nuevoTotal : Number(factura.valorTotal) || 0,
  );
  const transporteMonto = formatearMoneda(factura.valorTransporte);
  const transporteTipo = typeof factura.transporte === "string" ? factura.transporte : null;
  const textoTransporte =
    transporteTipo === "Sin transporte"
      ? "Sin transporte"
      : ["Transporte", transporteTipo, transporteMonto].filter(Boolean).join(" ");
  const fecha = formatearFecha(factura.fecha);

  // Con los días ampliados incluidos, igual que el subtotal y el IVA.
  const saldoPendienteNumero = ampliacion.hay
    ? ampliacion.nuevoSaldo
    : Number(factura.saldoPendiente) || 0;
  const saldoPendiente = formatearMoneda(saldoPendienteNumero);

  const telefonoValido = tieneTelefonoValido(cliente.telefono);
  const numeroWhatsapp = telefonoValido ? String(cliente.telefono).replace(/\D/g, "") : "";

  // Cuántos equipos le faltan devolver de ESTA factura, para decírselo en el
  // mensaje. Es la suma de lo pendiente de cada línea, no la cantidad de
  // líneas: si de una de 8 andamios devolvió 3, faltan 5.
  const equiposPendientes = (factura.equipos || [])
    .filter((equipo) => typeof equipo === "object")
    .reduce((total, equipo) => total + calcularCantidadPendiente(equipo), 0);

  // Hasta cuándo se le extendió el plazo: la fecha más lejana entre los
  // equipos que todavía no volvió, sin contar los que quedaron con entrega
  // indefinida (esos no tienen fecha que recordarle).
  const fechaProrroga =
    (factura.equipos || [])
      .filter(
        (equipo) =>
          typeof equipo === "object" &&
          calcularCantidadPendiente(equipo) > 0 &&
          !equipo.vencimientoIndefinido &&
          equipo.fechaVencimiento,
      )
      .map((equipo) => equipo.fechaVencimiento)
      .sort()
      .pop() || null;

  const mensajeWhatsapp = construirMensajeWhatsapp({
    gestion: gestionClave,
    nombre: obtenerNombreCompleto(cliente),
    numeroFactura: factura.numeroFactura ?? "s/n",
    hoy,
    equiposPendientes,
    saldo: saldoPendienteNumero,
    fechaProrroga,
  });
  const linkWhatsapp = `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(mensajeWhatsapp)}`;

  // La pizarra de totales: el aspecto lo pone el tema, acá solo van las filas.
  // Los renglones "nuevo" solo aparecen si la factura tiene ampliaciones.
  const cuadroTotales = valorTotal && (
    <Box>
      {/* El acento del tema, no el color de un bloque: esto resume TODO lo de
          arriba (pago, equipos, adicionales), no una sección puntual. Mismo
          criterio que en Detalle Cliente. */}
      <Typography
        variant="overline"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          lineHeight: 1.6,
          color: "custom.accent",
        }}
      >
        <AccountBalanceWalletIcon fontSize="small" />
        Estado de cuenta
      </Typography>
      <Paper variant="totales" sx={{ minWidth: { sm: 260 } }}>
      <Box className="fila total">
        <Typography variant="subtitle1" fontWeight="bold">
          Total factura
        </Typography>
        <Typography variant="subtitle1" fontWeight="bold">
          {valorTotal}
        </Typography>
      </Box>

      {/* Lo ya cobrado. Solo aparece cuando queda saldo: con la factura
          saldada sería el mismo número del total, repetido. La clase "pagado"
          es la que lo pinta verde —sin ella cae en el blanco tiza del
          renglón común, que es lo que pasaba acá y no en Detalle Cliente—. */}
      {saldoPendienteNumero > 0 && (
        <Box className="fila pagado">
          <Typography variant="body2">Pagado</Typography>
          <Typography variant="body2">
            {formatearMoneda(Number(factura.montoPagado) || 0)}
          </Typography>
        </Box>
      )}

      {/* Siempre visible: rojo si queda algo por cobrar, verde si la factura
          ya está saldada. Así se lee de un vistazo en qué situación está. */}
      <Box
        className={saldoPendienteNumero > 0 ? "fila alerta" : "fila ok"}
        sx={{ mt: 1 }}
      >
        <Typography variant="body2" fontWeight="bold">
          Saldo pendiente
        </Typography>
        <Typography variant="body2" fontWeight="bold">
          {saldoPendiente}
        </Typography>
      </Box>

      </Paper>
    </Box>
  );

  // Capas detrás de la carpeta activa: sugieren que hay más facturas "debajo".
  const capasDePila = Math.min(facturas.length - 1, 2);

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        boxShadow: 1,
        p: 2,
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 0.5, pb: 1 }}>
        <Avatar sx={{ bgcolor: gestionColor, width: 36, height: 36 }}>
          {cliente.tipo === "empresa" ? (
            <BusinessIcon sx={{ fontSize: 18 }} />
          ) : (
            <PersonIcon sx={{ fontSize: 18 }} />
          )}
        </Avatar>
        <Box>
          <Typography variant="subtitle1" fontWeight="bold">
            {obtenerNombreCompleto(cliente)}
          </Typography>
          {telefonoValido ? (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography variant="caption" color="text.secondary">
                {cliente.telefono}
              </Typography>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ ml: 0.5 }}>
                <Tooltip title="Escribir por WhatsApp">
                  <IconButton
                    size="small"
                    component="a"
                    href={linkWhatsapp}
                    target="_blank"
                    rel="noopener"
                    sx={{
                      bgcolor: theme.palette.custom.whatsapp.main,
                      color: theme.palette.common.white,
                      width: 30,
                      height: 30,
                      // Cuadrados con la esquina apenas redondeada, igual que
                      // los botones de acción de la factura.
                      borderRadius: 1,
                      "&:hover": { bgcolor: theme.palette.custom.whatsapp.dark },
                    }}
                  >
                    <WhatsAppIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>

                {/* Este botón NO marca: abre el registro de la llamada, que
                    es lo único que se puede hacer en las dos pantallas. En el
                    celular, el marcador se abre desde adentro del diálogo;
                    desde el computador solo se anota si contestó o no. */}
                <Tooltip title="Registrar llamada">
                  <IconButton
                    size="small"
                    onClick={() => setLlamadaOpen(true)}
                    sx={{
                      bgcolor: theme.palette.custom.call.main,
                      color: theme.palette.common.white,
                      width: 30,
                      height: 30,
                      borderRadius: 1,
                      "&:hover": { bgcolor: theme.palette.custom.call.dark },
                    }}
                  >
                    <PhoneIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>
          ) : (
            cliente.telefono && (
              <Typography variant="caption" color="text.secondary">
                {cliente.telefono}
              </Typography>
            )
          )}
        </Box>
      </Stack>

      <Box sx={{ position: "relative" }}>
        {Array.from({ length: capasDePila }).map((_, i) => (
          <Box
            key={`pila-${i}`}
            aria-hidden
            sx={{
              position: "absolute",
              inset: 0,
              top: (i + 1) * 7,
              borderRadius: 3,
              bgcolor: theme.palette.custom.tabStripBackground,
              border: "1px solid",
              borderColor: "divider",
              transform: `scale(${1 - (i + 1) * 0.03})`,
              zIndex: -(i + 1),
            }}
          />
        ))}

        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Stack
            direction="row"
            sx={{
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {facturas.map((f, idx) => {
                const activo = idx === indiceActivo;
                return (
                  <Box
                    key={f.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setTabFactura(idx)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setTabFactura(idx);
                    }}
                    sx={{
                      cursor: "pointer",
                      userSelect: "none",
                      flexShrink: 0,
                      px: 2,
                      py: 0.75,
                      mr: idx === facturas.length - 1 ? 0 : -1.5,
                      whiteSpace: "nowrap",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      borderTopLeftRadius: 10,
                      borderTopRightRadius: 10,
                      border: "1px solid",
                      borderColor: activo ? "custom.accent" : "divider",
                      bgcolor: activo ? "custom.accent" : gradosGrisPestana,
                      // La pestaña activa va rellena con el acento, así que su
                      // texto usa el token pensado para ir encima.
                      color: activo ? "custom.onAccent" : "text.secondary",
                      position: "relative",
                      zIndex: activo ? facturas.length + 1 : facturas.length - idx,
                      mb: 0,
                      boxShadow:
                        !activo && idx < facturas.length - 1
                          ? theme.palette.custom.sombraPestana
                          : "none",
                      transition: "background-color 0.15s ease",
                    }}
                  >
                    Fact. {f.numeroFactura ?? "s/n"}
                  </Box>
                );
              })}
          </Stack>

          <Box
            sx={{
              position: "relative",
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "custom.accent",
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
              borderBottomLeftRadius: 8,
              borderBottomRightRadius: 8,
              boxShadow: 4,
              p: 2,
              pt: { xs: 2, sm: 2.5 },
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 1 }}
            >
              {fecha && (
                <Typography variant="body2" color="text.secondary">
                  Fecha despacho: {fecha}
                </Typography>
              )}

              {/* Acciones de la factura arriba a la derecha, junto al chip de
                  estado — mismo patrón que las facturas de ClienteDetalle. */}
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Tooltip title="Ampliar vencimiento">
                  <IconButton
                    size="small"
                    onClick={() => setAmpliarOpen(true)}
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                      p: 0.5,
                      color: acento,
                    }}
                  >
                    <UpdateIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Registrar devolución">
                  <IconButton
                    size="small"
                    onClick={() => setDevolucionOpen(true)}
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                      p: 0.5,
                      color: acento,
                    }}
                  >
                    <AssignmentReturnIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                {/* La gestión vigente. No se puede cambiar a mano: la ponen
                    las acciones de arriba (llamar, ampliar, devolver). Sin
                    contador: cuántas veces se llamó queda en la línea de
                    tiempo de abajo, acá solo el nombre. */}
                <Chip
                  icon={<IconoGestion />}
                  label={gestionInfo.label}
                  size="small"
                  variant="estadoCompacto"
                  sx={{
                    bgcolor: gestionColor,
                    color: theme.palette.getContrastText(gestionColor),
                    "& .MuiChip-icon": { color: "inherit" },
                  }}
                />


                {/* Pliega la factura y deja a la vista solo este encabezado,
                    igual que en Detalle Cliente. */}
                <Tooltip
                  title={
                    facturaPlegada(factura.id)
                      ? "Mostrar factura"
                      : "Ocultar factura"
                  }
                >
                  <IconButton
                    size="small"
                    onClick={() => togglePlegarFactura(factura.id)}
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                      p: 0.5,
                      color: acento,
                    }}
                  >
                    {facturaPlegada(factura.id) ? (
                      <ExpandMoreIcon fontSize="small" />
                    ) : (
                      <ExpandLessIcon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>

            {/* La línea de tiempo de la factura: todo lo que se hizo para
                destrabarla, en orden. Se pliega con el resto de la factura
                —un cliente con la tarjeta cerrada no la ve— pero además tiene
                su PROPIA flecha: con varias llamadas registradas la lista
                puede ser larga y no tiene por qué ocupar toda la pantalla
                cada vez que se abre la factura, ni en PC ni en móvil. */}
            {!facturaPlegada(factura.id) && gestiones.length > 0 && (
              <Box sx={{ mb: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography
                    variant="overline"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      lineHeight: 1.6,
                      color: colorGestion,
                    }}
                  >
                    <HistoryIcon fontSize="small" />
                    Gestión {gestiones.length}
                  </Typography>
                  <Tooltip title={gestionAbierta ? "Ocultar gestión" : "Ver gestión"}>
                    <IconButton
                      size="small"
                      onClick={() => setGestionAbierta((prev) => !prev)}
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                        p: 0.5,
                        color: acento,
                      }}
                    >
                      {gestionAbierta ? (
                        <ExpandLessIcon fontSize="small" />
                      ) : (
                        <ExpandMoreIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                </Stack>

                {gestionAbierta && (
                  <Box sx={{ ...recuadroDeBloque(colorGestion), mt: 0.5 }}>
                    <Stack spacing={0.25}>
                      {gestiones.map((registro, i) => (
                        <Stack
                          key={`gestion-${i}`}
                          direction="row"
                          spacing={1}
                          alignItems="baseline"
                          flexWrap="wrap"
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ flexShrink: 0, fontVariantNumeric: "tabular-nums" }}
                          >
                            {formatearFecha(registro.fecha)} {formatearHoraLegible(registro.hora)}
                          </Typography>
                          <Typography variant="caption" sx={{ minWidth: 0 }}>
                            {describirGestion(registro)}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Box>
            )}

            {!facturaPlegada(factura.id) && factura.equipos?.length > 0 && (
              <Stack spacing={1} sx={{ mb: 1 }}>
                {agruparPorVencimiento(
                  factura.equipos.filter((equipo) => !equipoDevueltoCompleto(equipo)),
                  hoy,
                ).map((grupo) => (
                  <Box key={grupo.clave}>
                    {/* El encabezado dice en qué situación está el grupo, así
                        cada renglón solo necesita mostrar la fecha. Mismo
                        formato que los rótulos de sección de Detalle Cliente:
                        overline con el ícono adelante. */}
                    <Typography
                      variant="overline"
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        lineHeight: 1.6,
                        // Semáforo: rojo lo que ya venció, ámbar lo que vence
                        // hoy (hay que actuar YA, antes de que pase a rojo),
                        // gris lo que todavía tiene plazo. Antes "Vence hoy"
                        // iba en el acento del tema, el mismo azul que ahora
                        // llevan "Total factura" y "Estado de cuenta" más
                        // abajo — se perdía entre esos y el azul del bloque de
                        // equipos.
                        color:
                          grupo.clave === "vencido"
                            ? "error.main"
                            : grupo.clave === "hoy"
                              ? "warning.main"
                              : grupo.clave === "indefinido"
                                ? colorIndefinido
                                : "text.secondary",
                      }}
                    >
                      {grupo.clave === "vencido" ? (
                        <EventBusyIcon fontSize="small" />
                      ) : (
                        <EventIcon fontSize="small" />
                      )}
                      {grupo.titulo} {grupo.items.length}
                    </Typography>

                    <Stack spacing={0.5}>
                      {grupo.items.map(({ equipo, index }) =>
                        renderEquipo(equipo, `${equipo.nombre}-${index}`, grupo.clave),
                      )}
                    </Stack>
                  </Box>
                ))}

                {factura.equipos.some((equipo) => equipoDevueltoCompleto(equipo)) && (
                  <Box>
                    <Typography
                      variant="overline"
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        lineHeight: 1.6,
                        color: "success.main",
                      }}
                    >
                      <AssignmentReturnIcon fontSize="small" />
                      Devuelto
                    </Typography>
                    <Stack spacing={0.5}>
                      {factura.equipos
                        .map((equipo, index) => ({ equipo, index }))
                        .filter(({ equipo }) => equipoDevueltoCompleto(equipo))
                        .map(({ equipo, index }) =>
                          renderEquipoDevuelto(equipo, `devuelto-${equipo.nombre}-${index}`),
                        )}
                    </Stack>
                  </Box>
                )}
              </Stack>
            )}

            {facturaPlegada(factura.id) ? null : esMovil ? (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography
                    variant="overline"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      lineHeight: 1.6,
                      color: "custom.accent",
                    }}
                  >
                    <ReceiptLongIcon fontSize="small" />
                    Total factura
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setDetalleAbierto((prev) => !prev)}
                  >
                    {detalleAbierto ? (
                      <ExpandLessIcon fontSize="small" />
                    ) : (
                      <ExpandMoreIcon fontSize="small" />
                    )}
                  </IconButton>
                </Stack>
                {detalleAbierto && (
                  <Stack spacing={0.5} sx={{ mt: 1 }}>
                    {subtotal && <Typography variant="body2">Subtotal {subtotal}</Typography>}
                    {iva && <Typography variant="body2">IVA (19%) {iva}</Typography>}
                    {deposito && <Typography variant="body2">Depósito {deposito}</Typography>}
                    {(transporteTipo || transporteMonto) && (
                      <Typography variant="body2">{textoTransporte}</Typography>
                    )}
                    {cuadroTotales}
                  </Stack>
                )}
              </Box>
            ) : (
              <Box>
                <Typography
                  variant="overline"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    lineHeight: 1.6,
                    color: "custom.accent",
                  }}
                >
                  <ReceiptLongIcon fontSize="small" />
                  Total factura
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    gap: 2,
                  }}
                >
                  <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="flex-end">
                    {subtotal && <Typography variant="body2">Subtotal {subtotal}</Typography>}
                    {iva && <Typography variant="body2">IVA (19%) {iva}</Typography>}
                    {deposito && <Typography variant="body2">Depósito {deposito}</Typography>}
                    {(transporteTipo || transporteMonto) && (
                      <Typography variant="body2">{textoTransporte}</Typography>
                    )}
                  </Stack>

                  {cuadroTotales}
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      <RegistrarLlamadaDialog
        open={llamadaOpen}
        onClose={() => setLlamadaOpen(false)}
        cliente={cliente}
        factura={factura}
        onActualizado={onEquiposActualizados}
      />

      <AmpliarVencimientoDialog
        open={ampliarOpen}
        onClose={() => setAmpliarOpen(false)}
        cliente={cliente}
        factura={factura}
        onActualizado={onEquiposActualizados}
      />

      <RegistrarDevolucionDialog
        open={devolucionOpen}
        onClose={() => setDevolucionOpen(false)}
        cliente={cliente}
        factura={factura}
        onActualizado={onEquiposActualizados}
      />
    </Box>
  );
}

ClienteSeguimientoCard.propTypes = {
  cliente: PropTypes.object.isRequired,
  facturas: PropTypes.array.isRequired,
  hoy: PropTypes.string,
  onEquiposActualizados: PropTypes.func,
};
