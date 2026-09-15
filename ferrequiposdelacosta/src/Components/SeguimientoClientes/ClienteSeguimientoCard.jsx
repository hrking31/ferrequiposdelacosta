import { useState } from "react";
import PropTypes from "prop-types";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  useMediaQuery,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
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
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
// Ojo: es "Return", no "Returned". El que termina en "-ed" es un ícono
// distinto (de "ya devuelto") y no el que se usa para la ACCIÓN de
// registrar una devolución en ninguna otra parte de la app.
import AssignmentReturnIcon from "@mui/icons-material/AssignmentReturn";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import HistoryIcon from "@mui/icons-material/History";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";
import {
  calcularCuentaCliente,
  calcularCuentaFactura,
  contarUnidadesVencidas,
  plazoVencidoFactura,
  equipoVencido,
  calcularEstadoFactura,
  calcularGestionFactura,
  gestionesDeSeguimiento,
  datosFactura,
  equiposDe,
  equiposAfuera,
  sigueAfuera,
  GESTION_INFO,
  COLOR_ENTREGA_INDEFINIDA,
  cubiertoHasta,
  sinFechaDeEntrega,
  indefinidaDe,
  tramoVencidoAbierto,
  calcularVencimiento,
  calcularFechaDevolucion,
  describirSalidaEquipo,
  calcularEquipo,
  equipoLlevaIva,
} from "../ClienteDetalle/facturaUtils";
import {
  casillasDeCuenta,
  iconBtnSx,
  renderFilaDeCasillas,
} from "../ClienteDetalle/recuadrosCuenta";
import {
  formatearMonedaOVacio,
  formatearHoraLegible,
  formatearDias,
} from "../../Utils/formato";
import { abrirWhatsapp } from "../../Utils/whatsapp";
import AmpliarVencimientoDialog from "./AmpliarVencimientoDialog";
import RegistrarDevolucionDialog from "./RegistrarDevolucionDialog";
import RegistrarLlamadaDialog from "./RegistrarLlamadaDialog";
import AbonoDialog from "../ClienteDetalle/AbonoDialog";
import EntregarSaldoDialog from "../ClienteDetalle/EntregarSaldoDialog";


// Una factura entra a Seguimiento cuando vence, pero adentro puede tener
// equipos en distinta situación: unos ya vencidos, otros que vencen hoy y
// otros que todavía no. Se agrupan en ese orden, con lo urgente arriba.
//
// El grupo "Vence" —los que aún están en fecha— queda vacío a propósito: esta
// pantalla solo muestra lo vencido. Se deja igual porque los grupos sin
// equipos no se dibujan, y así un equipo mal clasificado se vería en vez de
// desaparecer sin dejar rastro.
const GRUPOS_VENCIMIENTO = [
  { clave: "hoy", titulo: "Vence hoy" },
  { clave: "vencido", titulo: "Vencido" },
  { clave: "vence", titulo: "Vence" },
  { clave: "indefinido", titulo: "Entrega indefinida" },
];

const clasificarVencimiento = (equipo, hoy) => {
  // Hasta cuándo está cubierto no se guarda: se encadena (ver
  // cubiertoHasta en las cuentas).
  const cubierto = cubiertoHasta(equipo);
  if (sinFechaDeEntrega(equipo) || !cubierto) return "indefinido";
  if (!hoy) return "vence";
  if (cubierto === hoy) return "hoy";
  if (cubierto < hoy) return "vencido";
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
      String(cubiertoHasta(a.equipo) || "").localeCompare(
        String(cubiertoHasta(b.equipo) || ""),
      ),
    ),
  );

  return GRUPOS_VENCIMIENTO.map((grupo) => ({
    ...grupo,
    items: porGrupo[grupo.clave] || [],
  })).filter((grupo) => grupo.items.length > 0);
};

// Cuántos equipos se nombran en la tarjeta plegada antes de contar el resto.
// Tres entran en un renglón hasta en un celular; el cuarto ya obliga a leer
// en vez de reconocer.
const MAX_EQUIPOS_PLEGADA = 3;

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

  if (
    registro.tipo === "devolucionParcial" ||
    registro.tipo === "devolucionTotal"
  ) {
    const unidades = Number(registro.unidades) || 0;
    const cuantos = unidades > 0 ? `: ${unidades} equipo${unidades === 1 ? "" : "s"}` : "";
    const cuanto = registro.tipo === "devolucionTotal" ? "total" : "parcial";
    return `Devolución ${cuanto}${cuantos}`;
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
  if (gestion === "devolucionParcial") {
    return [
      saludo,
      "",
      `Recibimos la devolución de parte de los equipos de ${laFactura}. ¡Gracias!`,
      // "tienes" y no "quedan": con un solo equipo, "quedan 1 equipo" no
      // concuerda. De paso queda igual que los otros mensajes, que ya dicen
      // "Actualmente tienes" y "A la fecha tienes".
      ...(situacion ? ["", `Todavía tienes ${situacion}.`] : []),
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
    // "de tu factura", y no "de los equipos registrados en tu factura":
    // pueden estar venciendo algunos y no todos, y la frase vieja los daba
    // por vencidos a todos. Cuáles son lo dice el renglón de abajo.
    `Te recordamos que hoy, ${formatearFecha(hoy)}, finaliza el período de alquiler de ${laFactura}.`,
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
  facturasConSaldo,
  hoy,
  onEquiposActualizados,
}) {
  const theme = useTheme();
  const esMovil = useMediaQuery(theme.breakpoints.down("sm"));
  // El mismo corte que usa la ficha del cliente para su pizarra: hasta 915px
  // los cuatro importes no entran en el hueco del encabezado.
  const anchoCorto = useMediaQuery("(max-width:915px)");
  const acento =
    theme.palette.custom.accent;
  const [tabFactura, setTabFactura] = useState(0);
  // La bitácora de gestión arranca plegada: con varias llamadas registradas
  // la lista completa puede ocupar la pantalla entera, en PC igual que en
  // móvil. Se pliega/despliega aparte del resto de la factura.
  const [gestionAbierta, setGestionAbierta] = useState(false);
  // Plegar la factura, igual que en Detalle Cliente: arrancan TODAS plegadas
  // y lo que se guarda es cuáles se fueron abriendo, así la lista de clientes
  // se ve completa de un vistazo.
  const [facturasAbiertas, setFacturasAbiertas] = useState({});
  // SOLO EN CELULAR: la cuenta y la ficha de cada equipo se abren para ver
  // todas sus casillas, una debajo de otra. En pantalla grande entran las
  // cuatro en fila y no hay nada que abrir.
  const [cuentasAbiertas, setCuentasAbiertas] = useState({});
  const [equiposAbiertos, setEquiposAbiertos] = useState({});
  const facturaPlegada = (facturaId) => !facturasAbiertas[facturaId];
  const togglePlegarFactura = (facturaId) =>
    setFacturasAbiertas((prev) => ({ ...prev, [facturaId]: !prev[facturaId] }));
  const [ampliarOpen, setAmpliarOpen] = useState(false);
  const [devolucionOpen, setDevolucionOpen] = useState(false);
  const [llamadaOpen, setLlamadaOpen] = useState(false);
  const [abonoOpen, setAbonoOpen] = useState(false);
  const [entregarOpen, setEntregarOpen] = useState(false);

  // El abono es del CLIENTE: se reparte entre todas sus facturas con saldo,
  // estén o no en cartera. Si la pantalla no las manda, se usan las de acá.
  const facturasDelCliente = facturasConSaldo ?? facturas;
  const hayQueCobrar = calcularCuentaCliente(facturasDelCliente, hoy).saldoPendiente > 0;

  // Acá se muestra la GESTIÓN, no el estado: el estado de la factura se ve en
  // Clientes y en Detalle Cliente. Son dos escalas distintas y no se mezclan
  // (ver facturaUtils).
  const coloresGestion = theme.palette.custom.gestionFactura;

  const colorGestion = theme.palette.custom.seccionGestion;

  // El teal de "Entrega indefinida". Vive junto a los chips de fechas, que lo
  // usan para el suyo: si estuviera acá suelto, el chip y el rótulo del grupo
  // podrían quedar de colores distintos.
  const colorIndefinido = COLOR_ENTREGA_INDEFINIDA;

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

  // El color de la URGENCIA: rojo lo vencido, ámbar lo que vence hoy, gris lo
  // que todavía tiene plazo, teal lo de entrega indefinida. En Seguimiento eso
  // importa más que de dónde vino el equipo.
  //
  // Lo miran el recuadro de cada equipo, su casilla de estado y el renglón de
  // la tarjeta plegada, y tienen que pintar igual: el mismo equipo no puede
  // ser rojo en un lado y teal en el otro.
  const colorDeSituacion = (situacion) =>
    situacion === "vencido"
      ? theme.palette.error.main
      : situacion === "hoy"
        ? theme.palette.warning.main
        : situacion === "indefinido"
          ? colorIndefinido
          : theme.palette.text.secondary;

  // LA MISMA CUADRÍCULA QUE LA FICHA DEL CLIENTE: dos equipos por fila en
  // pantalla grande, uno solo en el celular. Un equipo por renglón dejaba
  // recuadros del ancho de la pantalla para decir tres datos, y una factura de
  // seis equipos no entraba sin scrollear.
  //
  // Con un solo equipo el bloque se achica a la mitad, como allá: estirarlo de
  // lado a lado lo haría ver como si faltara algo al lado.
  //
  // `alignItems: start` para que cada recuadro mida lo suyo — si no, la
  // cuadrícula los estira todos a la altura del más alto.
  const cuadriculaDeEquipos = (cuantos) => ({
    display: "grid",
    gridTemplateColumns: {
      xs: "1fr",
      sm: `repeat(${Math.min(cuantos || 1, 2)}, 1fr)`,
    },
    gap: 1,
    mt: 0.5,
    alignItems: "start",
  });

  const anchoDelBloque = (cuantos) => ({
    width: { sm: Math.min(cuantos || 1, 2) === 1 ? "calc(50% - 4px)" : "100%" },
  });

  // Y su ícono, el mismo que encabeza su grupo al abrir la factura: calendario
  // tachado lo vencido, calendario lo que vence hoy. El reloj de arena es de
  // la entrega indefinida y solo de ella —no tiene fecha: no hay día que
  // dibujar, se está esperando el aviso del cliente—.
  const iconoDeSituacion = (situacion) =>
    situacion === "vencido"
      ? EventBusyIcon
      : situacion === "indefinido"
        ? HourglassTopIcon
        : EventIcon;

  // LAS CONDICIONES DEL EQUIPO, en la misma pizarra que la cuenta de la
  // factura: cuatro casillas del mismo ancho separadas por una línea. Eran
  // cuatro renglones de texto suelto, y con dos equipos por fila la tarjeta se
  // leía como un párrafo en vez de como una ficha.
  //
  // Sale de `renderPizarraTotales`, la misma función que dibuja la barra de la
  // factura: así las dos no pueden terminar distintas.
  //
  // La última casilla usa el RÓTULO para los días y el valor para la plata
  // —"4 días vencidos / $ 476.000"—, que es como se dice al hablar y hace
  // entrar los cinco datos en cuatro columnas.
  //
  // En el celular quedan las dos que deciden la llamada: cuatro casillas en
  // 350 píxeles no dejan entrar una fecha.
  const casillasDeEquipo = (equipo, situacion, abierta = false) => {
    const salida = describirSalidaEquipo(equipo, hoy);
    const { diasVencidos, netoVencido } = calcularEquipo(equipo, hoy);
    const vencido = diasVencidos > 0;

    // Desde cuándo corre lo que dice la casilla del estado. El tramo abierto
    // lo sabe; si todavía no se abrió —la madrugada lo escribe recién al día
    // siguiente— se cuenta desde el día después del último cubierto.
    //
    // Se mira la SITUACIÓN y no los días de mora: al que venció ayer todavía
    // no le corre ninguno, y aun así ya está vencido. Es la misma cuenta que
    // decide su grupo y su color, así que la casilla no puede decir otra cosa
    // que el rótulo de arriba.
    const tramoDelEstado =
      situacion === "indefinido"
        ? indefinidaDe(equipo).desde
        : situacion === "vencido"
          ? tramoVencidoAbierto(equipo)?.desde ||
            calcularVencimiento(cubiertoHasta(equipo), 1)
          : null;

    // El equipo ABRE la ficha, como el nombre abre cualquier renglón: se lee
    // primero y el resto de las casillas hablan de él. Lleva la cantidad
    // pegada al nombre, que es como se nombra un equipo al hablar: "los 5
    // andamios".
    //
    // Debajo, con qué salió. El chip queda afuera de la columna del texto
    // para que esa línea caiga bajo el NOMBRE y no bajo el número: así las
    // dos arrancan en el mismo punto y se leen como un bloque.
    const casillaEquipo = {
      clave: "equipo",
      // Sin ícono ni rótulo: el nombre del equipo no necesita que nada le
      // anuncie que es el nombre del equipo, y es lo primero que se lee.
      Icono: null,
      rotulo: null,
      valor: (
        <Box
          component="span"
          sx={{ display: "inline-flex", alignItems: "flex-start", gap: 0.75 }}
        >
          <Chip
            variant="meta"
            label={equipo.cantidadEquipos}
            size="small"
            sx={{ fontWeight: "bold", flexShrink: 0, color: "custom.accent" }}
          />
          <Box component="span" sx={{ display: "flex", flexDirection: "column" }}>
            {equipo.nombre}
            {salida && (
              <Box
                component="span"
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  fontSize: "0.72rem",
                  fontWeight: 400,
                  opacity: 0.85,
                }}
              >
                <LocalShippingIcon sx={{ fontSize: 14 }} />
                {/* El día que salió y los días que se le contrataron. Ese
                    plazo del alta no se toca nunca —las prórrogas se anotan
                    aparte—, así que dice con qué se despachó el equipo, no en
                    qué quedó. */}
                {`${formatearFecha(salida.fecha)} · ${formatearDias(equipo.diasAlquilados)}`}
              </Box>
            )}
          </Box>
        </Box>
      ),
      color: colorDeSituacion(situacion),
      envolver: true,
    };

    // Hasta cuándo lo tenía: el vencimiento del ALTA. Lo que pasó después
    // —que se venció, o que quedó sin fecha— lo cuenta la casilla del estado.
    const casillaVence = {
      clave: "vence",
      Icono: EventIcon,
      rotulo: "Vence",
      valor:
        formatearFecha(
          calcularFechaDevolucion(
            equipo?.fechaDespacho,
            Number(equipo?.diasAlquilados) || 0,
          ),
        ) || "—",
      color: "text.secondary",
    };

    const casillaVencidos = {
      clave: "vencidos",
      Icono: AttachMoneyIcon,
      // Los días en el rótulo y la plata en el valor: "4 días vencidos,
      // cuatrocientos mil" es como se dice al hablar, y deja el número de
      // días pegado a lo que cuestan.
      //
      // Al que se le acaba el plazo HOY le dice "0 días vencidos": ese día
      // todavía está pagado y no debe nada de más, la mora le empieza mañana.
      rotulo: `${formatearDias(diasVencidos)} vencidos`,
      // La cifra va SIN IVA y el "+ IVA" al lado, que es como se cotiza: el
      // impuesto se suma al final, sobre el total de la factura.
      valor: vencido ? (
        <Box component="span">
          {formatearMoneda(netoVencido)}
          {equipoLlevaIva(equipo) && (
            <Box
              component="span"
              sx={{ fontSize: "0.72rem", fontWeight: 400, opacity: 0.85 }}
            >
              {" + IVA"}
            </Box>
          )}
        </Box>
      ) : (
        // Sin plata que mostrar, la casilla queda en blanco: una raya se lee
        // como que el dato falta, y acá lo que pasa es que no hay nada que
        // cobrar todavía.
        ""
      ),
      color: vencido ? "error.main" : "text.secondary",
    };

    // CÓMO ESTÁ y desde cuándo. El vencido lleva el tramo de su mora —del
    // primer día vencido a hoy—; el que quedó sin fecha, solo el día en que
    // se pactó: no hay un "hasta" que contar, justamente porque no tiene
    // fecha.
    const casillaEstado = {
      clave: "estado",
      Icono: iconoDeSituacion(situacion),
      rotulo: null,
      valor:
        situacion === "indefinido"
          ? "Entrega indefinida"
          : situacion === "vencido"
            ? "Vencido"
            : "Vence hoy",
      extra: !tramoDelEstado
        ? null
        : situacion === "indefinido"
          ? formatearFecha(tramoDelEstado)
          : `${formatearFecha(tramoDelEstado)} - ${formatearFecha(hoy)}`,
      // "Entrega indefinida" no entra en un cuarto del hueco: baja de línea
      // en vez de cortarse a la mitad.
      envolver: true,
      color: colorDeSituacion(situacion),
    };

    // EN EL CELULAR, CERRADA, la ficha deja ver QUÉ es y CÓMO está, que es con
    // lo que se decide si hay que llamar. Las otras dos se abren con su
    // flecha: en un cuarto de pantalla de ancho no entran cuatro casillas sin
    // que las fechas se corten.
    if (esMovil && !abierta) return [casillaEquipo, casillaEstado];

    return [casillaEquipo, casillaVence, casillaEstado, casillaVencidos];
  };

  const renderEquipo = (equipo, key, situacion) => {
    const color = colorDeSituacion(situacion);
    const abierta = Boolean(equiposAbiertos[key]);

    return (
      <Box key={key} sx={recuadroDeBloque(color)}>
        {/* Cerrada, la flecha se centra en el alto del recuadro: el de entrega
            indefinida es más alto —su nombre baja de línea— y arriba quedaba
            descolgada. Abierta vuelve al borde: con las cuatro casillas en
            columna, el centro cae lejos de donde se la dejó. */}
        <Stack
          direction="row"
          alignItems={abierta ? "flex-start" : "center"}
          sx={{ gap: 0.5 }}
        >
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            {renderFilaDeCasillas(casillasDeEquipo(equipo, situacion, abierta), {
              colorDivisor: color,
              // En el celular abierta va en columna: cuatro casillas no entran
              // de lado en un teléfono sin que las fechas se corten.
              columna: esMovil && abierta,
            })}
          </Box>

          {/* Su flecha, solo en el celular: en pantalla grande las cuatro
              casillas ya están a la vista y no hay nada que abrir. */}
          {esMovil && (
            <Tooltip title={abierta ? "Ocultar el equipo" : "Ver el equipo"}>
              <IconButton
                size="small"
                onClick={() =>
                  setEquiposAbiertos((previos) => ({
                    ...previos,
                    [key]: !previos[key],
                  }))
                }
                sx={{ ...iconBtnSx, color, flexShrink: 0 }}
              >
                {abierta ? (
                  <ExpandLessIcon fontSize="small" />
                ) : (
                  <ExpandMoreIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Box>
    );
  };

  const gradosGrisPestana = theme.palette.custom.pestanaInactiva;

  const indiceActivo = Math.min(tabFactura, facturas.length - 1);
  const factura = facturas[indiceActivo];
  // Hasta cuándo era el plazo de ESTA factura y cuánto se pasó. Null si no
  // tiene equipos vencidos: sigue en cartera por la plata.
  const plazo = plazoVencidoFactura(factura, hoy);

  // La gestión vigente: lo último que se hizo con esta factura, salvo que ya
  // haya devuelto todo y solo deba plata —ahí manda "Cobro"—.
  const estadoFactura = calcularEstadoFactura(factura, hoy);
  const gestionClave = calcularGestionFactura(factura, estadoFactura);
  const gestionInfo = GESTION_INFO[gestionClave] || GESTION_INFO.sinGestionar;
  const gestionColor = coloresGestion[gestionClave] || theme.palette.custom.estadoNeutro;
  const IconoGestion = gestionInfo.Icono;
  // Solo lo trabajado con la factura ya vencida: una devolución registrada
  // desde la ficha del cliente, con la factura al día, no es cobranza y no
  // tiene por qué figurar acá (ver gestionesDeSeguimiento).
  const gestiones = gestionesDeSeguimiento(factura);

  const datos = datosFactura(factura);

  // La cuenta de la factura sale de la MISMA función que usa Detalle Cliente:
  // recalcula todo desde los pagos, los abonos y lo que se le entregó al
  // cliente, con los días de alquiler contados hasta hoy.
  //
  // Antes acá se leía el campo `saldoPendiente` que la factura tiene guardado y
  // se le sumaba la ampliación, y eso daba de menos y de más a la vez:
  //
  //   - Los abonos se perdían. Ese campo se recalcula al abonar como
  //     valorTotal − montoPagado − abonos, y como lo GUARDADO no lleva los días
  //     ampliados, una factura con el alta paga ya estaba en cero: el abono
  //     restaba contra cero, no podía bajar de ahí, y desaparecía. Una factura
  //     con el alta paga y un abono de $476.000 mostraba acá $476.000 de más
  //     que en Detalle Cliente.
  //   - El depósito ya devuelto, la plata entregada al cliente y los pagos de
  //     los lotes de equipos agregados después no entraban en la cuenta.
  //
  // El campo guardado ya no se lee en ninguna pantalla, y tampoco se escribe:
  // era una CONCLUSIÓN guardada como si fuera un hecho, el mismo error que en
  // su momento tuvo el campo `estado` (ver facturaCalculos).
  const cuenta = calcularCuentaFactura(factura, hoy);

  const valorTotal = formatearMoneda(cuenta.total);

  const saldoPendienteNumero = cuenta.saldoPendiente;

  const telefonoValido = tieneTelefonoValido(cliente.telefono);
  const numeroWhatsapp = telefonoValido ? String(cliente.telefono).replace(/\D/g, "") : "";

  // Cuántos equipos VENCIDOS le faltan devolver de ESTA factura, para
  // decírselo en el mensaje. Los que siguen en plazo no entran: una factura
  // está vencida en cuanto uno de sus equipos lo está, y reclamarle los siete
  // cuando solo venció uno le pide algo que todavía no debe.
  const equiposVencidos = contarUnidadesVencidas(factura, hoy);

  // Los equipos que trajeron esta factura a cartera: vencidos y todavía
  // afuera. Se reparten por urgencia una sola vez porque los miran dos
  // lugares —el renglón de la tarjeta plegada y la lista de abajo— y tienen
  // que decir lo mismo, en el mismo orden.
  const gruposEnCartera = agruparPorVencimiento(
    equiposDe(factura)
      .filter(({ equipo }) => sigueAfuera(equipo) && equipoVencido(equipo, hoy))
      .map(({ equipo }) => equipo),
    hoy,
  );

  // Los mismos, en fila, para poder nombrarlos sin abrir la tarjeta.
  const equiposEnCartera = gruposEnCartera.flatMap((grupo) =>
    grupo.items.map(({ equipo }) => ({ equipo, situacion: grupo.clave })),
  );

  // Hasta cuándo se le extendió el plazo: la fecha más lejana entre los
  // equipos que todavía no volvió, sin contar los que quedaron con entrega
  // indefinida (esos no tienen fecha que recordarle).
  const fechaProrroga =
    equiposAfuera(factura)
      .filter(
        ({ equipo }) => !sinFechaDeEntrega(equipo) && cubiertoHasta(equipo),
      )
      .map(({ equipo }) => cubiertoHasta(equipo))
      .sort()
      .pop() || null;

  const mensajeWhatsapp = construirMensajeWhatsapp({
    gestion: gestionClave,
    nombre: obtenerNombreCompleto(cliente),
    numeroFactura: datos.numeroFactura ?? "s/n",
    hoy,
    equiposPendientes: equiposVencidos,
    saldo: saldoPendienteNumero,
    fechaProrroga,
  });

  // La pizarra de totales: el aspecto lo pone el tema, acá solo van las filas.
  // Los renglones "nuevo" solo aparecen si la factura tiene ampliaciones.
  // LA BARRA DE VALORES, la misma que el encabezado del cliente en su ficha:
  // Total, Pagado, Abonos y Saldo en fila, cada uno con su ícono, su rótulo
  // chico y su cifra. No se arma acá — sale de `casillasDeCuenta` y
  // `renderPizarraTotales`, que son las que dibujan esa barra en la ficha—,
  // así que las dos pantallas no pueden mostrar la misma cuenta de dos formas.
  //
  // Antes iba como renglones apilados dentro de la misma pizarra: los mismos
  // cuatro números, pero había que recorrerlos de arriba abajo para encontrar
  // uno, que es justo lo que no se puede hacer con el cliente al teléfono.
  // LA BARRA DE VALORES, la misma que el encabezado del cliente en su ficha:
  // Total, Pagado, Abonos y Saldo en fila, cada uno con su ícono, su rótulo
  // chico y su cifra. No se arma acá —sale de `casillasDeCuenta` y
  // `renderPizarraTotales`, que son las que dibujan esa barra en la ficha—,
  // así que las dos pantallas no pueden mostrar la misma cuenta de dos formas.
  //
  // EN EL CELULAR entran dos: Total y Saldo, que es lo que se busca al
  // recorrer la lista. Las otras dos se abren con la flecha y van en columna.
  // Y lleva rótulo, que en pantalla grande no hace falta: ahí la barra está
  // pegada a la factura y se entiende de qué cuenta habla, pero en el celular
  // queda entre bloques y necesita decir qué es.
  // En el celular la cuenta se abre para ver los cuatro valores; en pantalla
  // grande ya están todos a la vista.
  const cuentaAbierta = Boolean(cuentasAbiertas[factura.id]);

  // LA CUENTA, con el mismo vestido que el resto de la tarjeta: su rótulo
  // afuera y el recuadro transparente con su degradado, igual que la gestión y
  // que cada grupo de equipos.
  //
  // Antes era el panel OSCURO FIJO que usa la ficha del cliente. Ahí encaja
  // —es el encabezado de la pantalla— pero acá quedaba como un bloque negro
  // entre recuadros de colores.
  const cuadroTotales = valorTotal && (
    <Box sx={{ mb: 1 }}>
      <Typography
        variant="overline"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          lineHeight: 1.6,
          color: acento,
        }}
      >
        <AccountBalanceWalletIcon fontSize="small" />
        Estado de cuenta
      </Typography>

      <Box sx={{ ...recuadroDeBloque(acento), mt: 0.5 }}>
        <Stack
          direction="row"
          alignItems={cuentaAbierta ? "flex-start" : "center"}
          sx={{ gap: 0.5 }}
        >
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            {renderFilaDeCasillas(
              casillasDeCuenta(cuenta, {
                resumida: esMovil && !cuentaAbierta,
                sobrePanel: false,
              }),
              { colorDivisor: acento, columna: esMovil && cuentaAbierta },
            )}
          </Box>

          {/* LA PLATA QUE SALE: el depósito que vuelve al cliente, o lo que
              pagó de más. Va acá, pegado a la cifra "A favor" que ya está en
              la fila: el botón explica ese número y el número justifica al
              botón. Arriba, entre los íconos de acción, era uno más sin texto
              —y encima al lado del de abonar, que se apaga justo cuando este
              aparece—.

              Mientras no se entregue, la factura no puede terminar: se queda
              en cartera por una plata que la empresa debe, no el cliente. */}
          {cuenta.saldoAFavor > 0 && !esMovil && (
            <Button
              size="small"
              variant="contained"
              color="warning"
              startIcon={<CurrencyExchangeIcon />}
              onClick={() => setEntregarOpen(true)}
              sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
            >
              Devolver
            </Button>
          )}

          {/* La flecha va DENTRO del recuadro, en su esquina, igual que la de
              cada equipo: es lo que abre y cierra esta caja, y afuera quedaba
              flotando al lado del rótulo sin decir sobre qué actuaba.

              Solo en el celular: ahí entran dos valores y los otros dos se
              abren. En pantalla grande están los cuatro. */}
          {esMovil && (
            <Tooltip title={cuentaAbierta ? "Ocultar la cuenta" : "Ver la cuenta"}>
              <IconButton
                size="small"
                onClick={() =>
                  setCuentasAbiertas((previas) => ({
                    ...previas,
                    [factura.id]: !previas[factura.id],
                  }))
                }
                sx={{ ...iconBtnSx, color: acento, flexShrink: 0 }}
              >
                {cuentaAbierta ? (
                  <ExpandLessIcon fontSize="small" />
                ) : (
                  <ExpandMoreIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          )}
        </Stack>

        {/* EN EL CELULAR el botón baja a su propio renglón, con el monto
            adentro. Al lado de las cifras no entra —la fila ya cede espacio
            para la flecha— y apretado entre dos números se vuelve otra vez
            algo que no se ve. */}
        {cuenta.saldoAFavor > 0 && esMovil && (
          <Button
            fullWidth
            size="small"
            variant="contained"
            color="warning"
            startIcon={<CurrencyExchangeIcon />}
            onClick={() => setEntregarOpen(true)}
            sx={{ mt: 1 }}
          >
            Devolver {formatearMoneda(cuenta.saldoAFavor)}
          </Button>
        )}
      </Box>
    </Box>
  );

  // Lo que no toda factura tiene, y que igual hay que poder ver. Aparece solo
  // si hay alguno de los dos: dibujado siempre, una factura sin ninguno
  // mostraba un recuadro oscuro vacío.
  const extrasDeCuenta = (cuenta.depositoDevuelto > 0 || cuenta.entregas > 0) && (
    <Paper variant="totales" sx={{ minWidth: { sm: 260 }, mb: 1 }}>
      {/* El depósito devuelto ya salió del total de arriba. Se muestra igual,
          porque si no el total cambiaría sin explicación. */}
      {cuenta.depositoDevuelto > 0 && (
        <Box className="fila abono">
          <Typography variant="body2">Depósito devuelto</Typography>
          <Typography variant="body2">
            {formatearMoneda(cuenta.depositoDevuelto)}
          </Typography>
        </Box>
      )}

      {cuenta.entregas > 0 && (
        <Box className="fila">
          <Typography variant="body2">Entregado al cliente</Typography>
          <Typography variant="body2">{formatearMoneda(cuenta.entregas)}</Typography>
        </Box>
      )}
    </Paper>
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
        {/* Es el que crece y empuja los botones a la esquina. No se hace al
            revés —con un `ml: auto` en los botones— porque el `spacing` del
            Stack le escribe a cada hijo su propio margen izquierdo y gana por
            especificidad: el auto no llega a aplicarse nunca. */}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          {/* El nombre en el acento: es el titular de la tarjeta y lo que se
              busca al recorrer la lista, igual que en la ficha del cliente. */}
          <Typography
            variant="subtitle1"
            fontWeight="bold"
            sx={{ color: "custom.accent" }}
          >
            {obtenerNombreCompleto(cliente)}
          </Typography>
          {cliente.telefono && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <PhoneIcon sx={{ fontSize: 14, color: "text.secondary" }} />
              <Typography variant="caption" color="text.secondary">
                {cliente.telefono}
              </Typography>
            </Stack>
          )}
        </Box>

        {/* LOS DOS BOTONES DE CONTACTO, arriba a la derecha. Iban pegados al
            teléfono, debajo del nombre: ahí quedaban a merced del largo del
            número y de la razón social. En la esquina caen siempre en el
            mismo lugar, que es donde la mano los va a buscar cuando hay una
            lista de clientes. */}
        {telefonoValido && (
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{ flexShrink: 0 }}
          >
                <Tooltip title="Escribir por WhatsApp">
                  <IconButton
                    size="small"
                    aria-label="Escribir por WhatsApp"
                    onClick={() => abrirWhatsapp(numeroWhatsapp, mensajeWhatsapp)}
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
        )}
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
                    {/* El punto del estado de ESA factura. Con él la fila de
                        pestañas se lee como un semáforo: de un vistazo se ve
                        cuál de las tres es la urgente, sin abrir ninguna. Los
                        colores son los que el tema ya le da a esos estados en
                        Clientes y en la ficha — no son nuevos. */}
                    <Box
                      component="span"
                      sx={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        display: "inline-block",
                        mr: 0.9,
                        verticalAlign: "middle",
                        bgcolor:
                          theme.palette.custom.estadoFactura[
                            calcularEstadoFactura(f, hoy)
                          ] ?? theme.palette.custom.estadoNeutro,
                      }}
                    />
                    Fact. {datosFactura(f).numeroFactura ?? "s/n"}
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
            {/* En el celular los dos lados se leen como dos bloques: a la
                izquierda hasta cuándo era y cuánto se pasó, a la derecha el
                estado con sus acciones debajo. Por eso arriba y no al medio:
                el chip tiene que quedar a la altura de "Vencía". */}
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems={esMovil ? "flex-start" : "center"}
              flexWrap="wrap"
              rowGap={1}
              gap={1.5}
              sx={{ mb: 1 }}
            >
              {/* HASTA CUÁNDO ERA, y cuánto se pasó. Antes acá iba la fecha de
                  despacho, que en cartera no decide nada: lo que hay que saber
                  al llamar es desde cuándo se pasó el plazo. La fecha sale del
                  equipo que trajo la factura acá y los días, del que más lleva
                  (ver plazoVencidoFactura).

                  Sin equipos vencidos no hay plazo que mostrar: esa factura
                  sigue en cartera por la plata, y eso lo dice el renglón de
                  abajo. */}
              {/* HASTA CUÁNDO ERA, y cuánto se pasó. La fecha sale del equipo
                  que trajo la factura acá y los días, del que más lleva (ver
                  plazoVencidoFactura).

                  Sin equipos vencidos no se muestra NADA: esa factura sigue en
                  cartera por la plata, y eso ya lo dice su cuenta. Acá iba la
                  fecha de despacho, que en esta pantalla no decide nada y se
                  leía como si fuera otro vencimiento. */}
              {plazo && (
                // En el celular los días bajan a su propio renglón: al lado de
                // la fecha empujaban al chip de estado fuera de la línea.
                <Stack
                  direction={esMovil ? "column" : "row"}
                  spacing={esMovil ? 0 : 1}
                  alignItems={esMovil ? "flex-start" : "center"}
                  flexWrap="wrap"
                >
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <EventBusyIcon fontSize="small" sx={{ color: "text.secondary" }} />
                    <Typography variant="body2" color="text.secondary">
                      Vencía
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatearFecha(plazo.fecha)}
                    </Typography>
                  </Stack>

                  {plazo.dias > 0 && (
                    <>
                      {/* La rayita separa los dos datos cuando comparten
                          renglón; en columna no hay nada que separar. */}
                      {!esMovil && (
                        <Box
                          sx={{ width: "1px", height: 16, bgcolor: "divider" }}
                          aria-hidden
                        />
                      )}
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        sx={{ color: "error.main" }}
                      >
                        {plazo.dias} día{plazo.dias === 1 ? "" : "s"} vencido
                        {plazo.dias === 1 ? "" : "s"}
                      </Typography>
                    </>
                  )}
                </Stack>
              )}

              {/* CON LA FACTURA CERRADA, el resumen de la cuenta ocupa el
                  hueco que queda entre el plazo y los botones, igual que en la
                  ficha del cliente: al recorrer la lista lo que se busca es
                  cuánto es y cuánto falta.

                  Los tamaños son los de allá, y por el mismo motivo: entre 916
                  y 1200px el hueco no pasa de unos 300px y cuatro importes de
                  siete cifras se montan entre sí, así que en ese tramo la
                  pizarra pasa a su propia fila con todo el ancho; de 1200px en
                  adelante sí entra al lado. */}
              {!anchoCorto && facturaPlegada(factura.id) && (
                <Box
                  sx={{
                    ...recuadroDeBloque(acento),
                    flexGrow: 1,
                    flexBasis: { md: "100%", lg: 0 },
                    order: { md: 1, lg: 0 },
                  }}
                >
                  {renderFilaDeCasillas(
                    casillasDeCuenta(cuenta, { sobrePanel: false }),
                    { colorDivisor: acento },
                  )}
                </Box>
              )}

              {/* Las acciones y el estado de la factura.

                  EN EL CELULAR se apilan a la derecha y el CHIP VA ARRIBA: es
                  lo que dice en qué anda la factura, y se lee antes de decidir
                  qué botón tocar. Los botones quedan debajo. En una sola línea
                  no entraban y el chip terminaba empujado sin orden.

                  En pantalla grande no cambia nada: todo en fila, los botones
                  y después el chip, igual que en la ficha del cliente. */}
              <Stack
                direction={esMovil ? "column-reverse" : "row"}
                spacing={0.75}
                alignItems={esMovil ? "flex-end" : "center"}
                // SIEMPRE PEGADOS A LA DERECHA, aunque queden solos en su
                // renglón. El `space-between` de la fila los acomodaba mientras
                // hubiera algo a la izquierda, pero entre 916 y 1200px la
                // pizarra baja a su propia línea y una factura SIN PLAZO —la
                // que sigue en cartera solo por la plata— dejaba este bloque
                // como único hijo: los botones y el chip se iban a la
                // izquierda, contra el borde.
                sx={{ flexShrink: 0, ml: "auto" }}
              >
                <Stack direction="row" spacing={0.75} alignItems="center">
                {/* EL ORDEN CUENTA EL FLUJO, y no es decorativo: primero
                    el EQUIPO —devolver, o pactarle plazo— y recién después la
                    PLATA. Al revés, que es como estaba, se cobraba primero y
                    el equipo quedaba sin definir: una factura podía quedar
                    pagada con el equipo afuera y sin fecha de retorno, que es
                    justo lo que hay que evitar. */}
                <Tooltip title="Registrar devolución">
                  <IconButton
                    size="small"
                    onClick={() => setDevolucionOpen(true)}
                    sx={{ ...iconBtnSx, color: acento }}
                  >
                    <AssignmentReturnIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Ampliar vencimiento">
                  <IconButton
                    size="small"
                    onClick={() => setAmpliarOpen(true)}
                    sx={{ ...iconBtnSx, color: acento }}
                  >
                    <UpdateIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                {/* EL ABONO SE COBRA ACÁ, no en la ficha del cliente.
                    El momento real en que entra la plata es la llamada: se
                    marca al cliente, se le pacta el plazo y en la misma
                    conversación se le pide el abono. Con el botón solo en la
                    ficha había que salir de cartera, buscar al cliente y
                    volver.

                    Es del CLIENTE, no de esta factura: se reparte entre todas
                    las que tengan saldo (ver AbonoDialog). Por eso se apaga
                    cuando no debe nada en ninguna. */}
                <Tooltip
                  title={
                    hayQueCobrar
                      ? "Registrar abono"
                      : "El cliente no tiene saldo pendiente"
                  }
                >
                  {/* El span es porque un botón deshabilitado no emite eventos
                      de mouse, y sin él el globo de ayuda no aparece. */}
                  <span>
                    <IconButton
                      size="small"
                      disabled={!hayQueCobrar}
                      onClick={() => setAbonoOpen(true)}
                      sx={{
                        ...iconBtnSx,
                        color: acento,
                        "&.Mui-disabled": { color: "action.disabled" },
                      }}
                    >
                      <AttachMoneyIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>

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
                    sx={{ ...iconBtnSx, color: acento }}
                  >
                    {facturaPlegada(factura.id) ? (
                      <ExpandMoreIcon fontSize="small" />
                    ) : (
                      <ExpandLessIcon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>

                {/* LA PLATA QUE SALE: su lugar es el estado de cuenta, pegado
                    a la cifra "A favor" que lo explica. Pero la factura ARRANCA
                    PLEGADA y ese recuadro recién aparece al abrirla, así que
                    mientras está cerrada el botón sube acá —con el monto
                    escrito, no como el ícono suelto que era antes, que se
                    perdía entre otros tres y al lado del de abonar, que se
                    apaga justo cuando este aparece—.

                    Nunca se ven los dos: cerrada, este; abierta, el de la
                    cuenta. */}
                {cuenta.saldoAFavor > 0 && facturaPlegada(factura.id) && (
                  <Button
                    size="small"
                    variant="contained"
                    color="warning"
                    startIcon={<CurrencyExchangeIcon />}
                    onClick={() => setEntregarOpen(true)}
                    sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
                  >
                    Devolver {formatearMoneda(cuenta.saldoAFavor)}
                  </Button>
                )}

                </Stack>

                <Stack direction="row" spacing={0.75} alignItems="center">
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
                    // TODAS LAS GESTIONES MIDEN LO MISMO (anchoChip.gestion),
                    // como los estados en la ficha del cliente. Son una lista
                    // de facturas, una debajo de otra: con el ancho al gusto
                    // del rótulo —"COBRO" corto, "DEVOLUCIÓN PARCIAL" largo—
                    // los bordes quedaban en diagonal.
                    width: theme.anchoChip.gestion,
                    justifyContent: "center",
                  }}
                />


                </Stack>
              </Stack>
            </Stack>

            {/* Hasta 915px la pizarra completa no entra en el hueco del
                encabezado, así que la factura cerrada muestra debajo la
                versión corta: total y saldo, que es lo que se busca al
                recorrer la lista. */}
            {anchoCorto && facturaPlegada(factura.id) && (
              <Box sx={{ mb: 1 }}>
                <Box sx={recuadroDeBloque(acento)}>
                  {renderFilaDeCasillas(
                    casillasDeCuenta(cuenta, { resumida: true, sobrePanel: false }),
                    { colorDivisor: acento },
                  )}
                </Box>
              </Box>
            )}

            {/* QUÉ HAY AFUERA, sin abrir la tarjeta. Plegada, la factura decía
                su número y cuánto se pasó, pero no de qué equipos se trata —y
                esa es la pregunta que le da nombre a esta pantalla—. Con diez
                clientes en la lista, contestarla costaba diez clics.

                Cada uno va en el color de su urgencia, el mismo que tendrá su
                recuadro al abrir. Se muestran los tres primeros y el resto se
                cuenta: la idea es reconocer el equipo de un vistazo, no leer
                el inventario. */}
            {facturaPlegada(factura.id) && equiposEnCartera.length > 0 && (
              <Stack
                direction="row"
                alignItems="center"
                flexWrap="wrap"
                sx={{ gap: 0.75, mb: 1 }}
              >
                <LocalShippingIcon fontSize="small" sx={{ color: "text.secondary" }} />

                {equiposEnCartera
                  .slice(0, MAX_EQUIPOS_PLEGADA)
                  .map(({ equipo, situacion }, indice) => {
                    const color = colorDeSituacion(situacion);
                    const IconoSituacion = iconoDeSituacion(situacion);

                    return (
                      <Chip
                        key={`afuera-${indice}`}
                        size="small"
                        variant="estadoCompacto"
                        icon={<IconoSituacion />}
                        label={`${equipo.cantidadEquipos} ${equipo.nombre}`}
                        sx={{
                          bgcolor: color,
                          color: theme.palette.getContrastText(color),
                          "& .MuiChip-icon": { color: "inherit" },
                        }}
                      />
                    );
                  })}

                {equiposEnCartera.length > MAX_EQUIPOS_PLEGADA && (
                  <Typography variant="body2" color="text.secondary">
                    y {equiposEnCartera.length - MAX_EQUIPOS_PLEGADA} más
                  </Typography>
                )}
              </Stack>
            )}

            {/* La línea de tiempo de la factura: todo lo que se hizo para
                destrabarla, en orden. Se pliega con el resto de la factura
                —un cliente con la tarjeta cerrada no la ve— pero además tiene
                su PROPIA flecha: con varias llamadas registradas la lista
                puede ser larga y no tiene por qué ocupar toda la pantalla
                cada vez que se abre la factura, ni en PC ni en móvil. */}
            {!facturaPlegada(factura.id) && gestiones.length > 0 && (
              <Box sx={{ mb: 1 }}>
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

                {/* LA ÚLTIMA, siempre. Antes la bitácora arrancaba cerrada del
                    todo y había que abrirla para saber si a este cliente ya lo
                    habían llamado — que es lo primero que se pregunta quien va
                    a llamarlo. Con la más reciente a la vista la pregunta está
                    contestada de entrada, y el botón queda para el historial
                    completo, que con varias llamadas ocupa la pantalla entera.

                    El botón va DENTRO del recuadro, en su esquina: es lo que
                    abre y cierra esta caja, y afuera quedaba flotando al lado
                    del rótulo sin decir sobre qué actuaba. */}
                <Box sx={{ ...recuadroDeBloque(colorGestion), mt: 0.5 }}>
                  {/* Igual que el botón del IVA en la ficha: la flecha arriba,
                      con el mismo estilo de icono (iconBtnSx). Lo que se centra
                      es el TEXTO, con su propio alignSelf: la flecha es más
                      alta que una línea, y sin eso el renglón quedaba pegado
                      al borde de arriba. */}
                  <Stack direction="row" alignItems="flex-start" sx={{ gap: 1 }}>
                  {/* Las mismas líneas divisorias que los otros recuadros,
                      SOLO EN EL CELULAR: una horizontal entre gestión y
                      gestión cuando están todas a la vista. En pantalla grande
                      cada renglón entra entero y la línea sobra. */}
                  <Stack
                    spacing={0.25}
                    divider={
                      esMovil ? (
                        <Divider
                          flexItem
                          sx={{ borderColor: colorGestion, opacity: 0.25 }}
                        />
                      ) : undefined
                    }
                    sx={{ flexGrow: 1, minWidth: 0, alignSelf: "center" }}
                  >
                    {(gestionAbierta ? gestiones : gestiones.slice(-1)).map((registro, i) => (
                        <Stack
                          key={`gestion-${i}`}
                          direction="row"
                          spacing={1}
                          alignItems="baseline"
                          flexWrap="wrap"
                          // Y una vertical entre CUÁNDO fue y QUÉ pasó, igual
                          // que entre las casillas de la cuenta y las de cada
                          // equipo. También solo en el celular.
                          divider={
                            esMovil ? (
                              <Divider
                                orientation="vertical"
                                flexItem
                                sx={{
                                  my: 0.25,
                                  borderColor: colorGestion,
                                  opacity: 0.25,
                                }}
                              />
                            ) : undefined
                          }
                        >
                          {/* EN EL CELULAR no va el día ni la hora: lo que
                              hace falta antes de llamar es a qué número se
                              llamó y si contestó, y con la fecha adelante ese
                              dato quedaba en el renglón de abajo. El cuándo
                              se lee en la ficha del cliente, que es donde se
                              revisa la historia. */}
                          {!esMovil && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ flexShrink: 0, fontVariantNumeric: "tabular-nums" }}
                            >
                              {formatearFecha(registro.fecha)}{" "}
                              {formatearHoraLegible(registro.hora)}
                            </Typography>
                          )}
                          <Typography variant="caption" sx={{ minWidth: 0 }}>
                            {describirGestion(registro)}
                          </Typography>
                        </Stack>
                      ))}
                  </Stack>

                  {gestiones.length > 1 && (
                    <Tooltip
                      title={
                        gestionAbierta
                          ? "Ver solo la última"
                          : `Ver las ${gestiones.length} gestiones`
                      }
                    >
                      <IconButton
                        size="small"
                        onClick={() => setGestionAbierta((prev) => !prev)}
                        sx={{ ...iconBtnSx, color: colorGestion, flexShrink: 0 }}
                      >
                        {gestionAbierta ? (
                          <ExpandLessIcon fontSize="small" />
                        ) : (
                          <ExpandMoreIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  )}
                  </Stack>
                </Box>
              </Box>
            )}

            {/* LA PLATA, apenas termina la gestión y antes de los equipos:
                es lo que se lee mientras se habla con el cliente. Las celdas
                SON el estado de cuenta; no llevan rótulo encima porque no
                necesitan que un renglón anuncie lo que ya dicen. */}
            {!facturaPlegada(factura.id) && cuadroTotales}

            {!facturaPlegada(factura.id) && extrasDeCuenta}

            {/* Una factura puede seguir en cartera sin un solo equipo vencido:
                le renovaron el que la trajo, o ya devolvió todo, y se queda
                por la plata. No lleva ningún aviso — el equipo simplemente no
                aparece, y el recuadro de la cuenta que está justo arriba ya
                dice cuánto falta cobrar. */}

            {!facturaPlegada(factura.id) && equiposDe(factura).length > 0 && (
              <Stack spacing={1} sx={{ mb: 1 }}>
                {/* Solo los equipos VENCIDOS que siguen afuera: son los que
                    trajeron la factura acá y los únicos que se le pueden
                    reclamar hoy. Los que todavía están en fecha se ven en la
                    ficha del cliente; acá solo harían preguntarse por qué
                    aparece algo que nadie tiene que devolver todavía. */}
                {gruposEnCartera.map((grupo) => (
                  <Box key={grupo.clave} sx={anchoDelBloque(grupo.items.length)}>
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

                    {/* La misma separación con su rótulo que el recuadro de la
                        gestión: pegados, los tres bloques no se leían a la
                        misma altura. */}
                    <Box sx={cuadriculaDeEquipos(grupo.items.length)}>
                      {grupo.items.map(({ equipo, index }) =>
                        renderEquipo(equipo, `${equipo.nombre}-${index}`, grupo.clave),
                      )}
                    </Box>
                  </Box>
                ))}

                {/* ACÁ NO VA LO DEVUELTO. Esta pantalla muestra lo que hay que
                    recordar: plata por cobrar, días que corren, equipo por
                    volver. Un equipo que ya volvió no es ninguna de las tres
                    —de él no queda nada por hacer— y la bitácora de arriba ya
                    dice que se devolvió, con su fecha. Su historia completa
                    vive en la ficha del cliente, que es donde se revisa.

                    Hubo un bloque verde "Devuelto" con los que volvieron
                    tarde: la idea era mostrar lo que se consiguió cobrando,
                    pero repetía lo que ya decía la bitácora y en una factura
                    de un solo equipo llenaba la tarjeta con algo resuelto. */}
              </Stack>
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

      <AbonoDialog
        avisarEquiposVencidos
        open={abonoOpen}
        onClose={() => setAbonoOpen(false)}
        cliente={cliente}
        facturas={facturasDelCliente}
        onAbonado={onEquiposActualizados}
      />

      <EntregarSaldoDialog
        open={entregarOpen}
        onClose={() => setEntregarOpen(false)}
        cliente={cliente}
        factura={factura}
        // Todas las del cliente, no solo las de cartera: la plata a favor
        // puede cruzarse contra una factura vigente que también debe.
        facturas={facturasDelCliente}
        onEntregado={onEquiposActualizados}
      />
    </Box>
  );
}

ClienteSeguimientoCard.propTypes = {
  cliente: PropTypes.object.isRequired,
  facturas: PropTypes.array.isRequired,
  // Todas las facturas abiertas del cliente, no solo las que están en cartera:
  // el abono se reparte entre las que tengan saldo, estén acá o no. Si no
  // llega, se usan las de cartera.
  facturasConSaldo: PropTypes.array,
  hoy: PropTypes.string,
  onEquiposActualizados: PropTypes.func,
};
