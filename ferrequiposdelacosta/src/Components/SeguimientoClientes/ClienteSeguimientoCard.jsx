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
// Ojo: es "Return", no "Returned". El que termina en "-ed" es un ícono
// distinto (de "ya devuelto") y no el que se usa para la ACCIÓN de
// registrar una devolución en ninguna otra parte de la app.
import AssignmentReturnIcon from "@mui/icons-material/AssignmentReturn";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import HistoryIcon from "@mui/icons-material/History";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import {
  calcularCuentaCliente,
  calcularCuentaFactura,
  calcularExigible,
  contarUnidadesVencidas,
  plazoVencidoFactura,
  equipoDevueltoEnCobranza,
  equipoVencido,
  calcularEstadoFactura,
  calcularGestionFactura,
  gestionesDeSeguimiento,
  GRUPO_INICIAL,
  datosFactura,
  equiposDe,
  equiposAfuera,
  sigueAfuera,
  GESTION_INFO,
  COLOR_ENTREGA_INDEFINIDA,
} from "../ClienteDetalle/facturaUtils";
import ChipsFechasEquipo from "../ClienteDetalle/ChipsFechasEquipo";
import { formatearMonedaOVacio, formatearHoraLegible } from "../../Utils/formato";
import { abrirWhatsapp } from "../../Utils/whatsapp";
import AmpliarVencimientoDialog from "./AmpliarVencimientoDialog";
import RegistrarDevolucionDialog from "./RegistrarDevolucionDialog";
import RegistrarLlamadaDialog from "./RegistrarLlamadaDialog";
import AbonoDialog from "../ClienteDetalle/AbonoDialog";


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
  const facturaPlegada = (facturaId) => !facturasAbiertas[facturaId];
  const togglePlegarFactura = (facturaId) =>
    setFacturasAbiertas((prev) => ({ ...prev, [facturaId]: !prev[facturaId] }));
  const [ampliarOpen, setAmpliarOpen] = useState(false);
  const [devolucionOpen, setDevolucionOpen] = useState(false);
  const [llamadaOpen, setLlamadaOpen] = useState(false);
  const [abonoOpen, setAbonoOpen] = useState(false);

  // El abono es del CLIENTE: se reparte entre todas sus facturas con saldo,
  // estén o no en cartera. Si la pantalla no las manda, se usan las de acá.
  const facturasDelCliente = facturasConSaldo ?? facturas;
  const hayQueCobrar = calcularCuentaCliente(facturasDelCliente, hoy).saldoPendiente > 0;

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

  // Tarjeta de un equipo: cantidad y nombre arriba, y abajo los datos como
  // chips. Si ya se le amplió el vencimiento, la fecha original aparece
  // marcada como "Vencido"; la vigente va aparte, según en qué situación está.
  const renderEquipo = (equipo, key, situacion) => {
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
            label={equipo.cantidadEquipos}
            size="small"
            sx={{ fontWeight: "bold", flexShrink: 0, color: "custom.accent" }}
          />
          <Typography variant="body2" fontWeight="bold" sx={{ flex: 1, minWidth: 0 }}>
            {equipo.nombre}
          </Typography>
        </Stack>

        <ChipsFechasEquipo equipo={equipo} hoy={hoy} />
      </Box>
    );
  };

  // Línea de equipo ya devuelta del todo: se muestra aparte y atenuada, para
  // no mezclarla con lo que todavía hay que seguir.
  const renderEquipoDevuelto = (equipo, grupo, key) => (
    <Box
      key={key}
      sx={{
        ...recuadroDeBloque(
          grupo?.grupo === GRUPO_INICIAL ? colorEquipos : colorEquiposAgregados,
        ),
        // Atenuado: ya no hay nada que hacer con este equipo, pero se sigue
        // viendo para saber qué se devolvió y cuándo.
        opacity: 0.65,
      }}
    >
      <Stack direction="row" alignItems="center" gap={1}>
        <Chip
          variant="meta"
          label={equipo.cantidadEquipos}
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
          label={`Devuelto ${formatearFecha(equipo.devolucion?.fechaDevolucion) || ""}`}
        />
      </Stack>
    </Box>
  );

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
  const fecha = formatearFecha(datos.fechaCreacion);

  const saldoPendienteNumero = cuenta.saldoPendiente;
  const saldoPendiente = formatearMoneda(saldoPendienteNumero);

  const telefonoValido = tieneTelefonoValido(cliente.telefono);
  const numeroWhatsapp = telefonoValido ? String(cliente.telefono).replace(/\D/g, "") : "";

  // Cuántos equipos VENCIDOS le faltan devolver de ESTA factura, para
  // decírselo en el mensaje. Los que siguen en plazo no entran: una factura
  // está vencida en cuanto uno de sus equipos lo está, y reclamarle los siete
  // cuando solo venció uno le pide algo que todavía no debe.
  const equiposVencidos = contarUnidadesVencidas(factura, hoy);
  const hayEquiposVencidos = equiposVencidos > 0;

  // Si le quedan equipos afuera, están en plazo: se los renovaron o todavía no
  // vencen.
  const quedanEquiposAfuera = equiposAfuera(factura).length > 0;

  // Lo que se le puede reclamar HOY a una factura sin equipos vencidos.
  //
  // Con equipos todavía afuera es lo que debía ANTES de la renovación: los días
  // que se le acaban de conceder los está usando y se cobran cuando devuelva,
  // así que pedírselos ahora sería cobrarle un alquiler en curso. Con todo
  // devuelto ya no queda nada por correr y se le cobra la cuenta completa.
  const saldoExigible = quedanEquiposAfuera
    ? calcularExigible(factura, hoy)
    : cuenta.saldoPendiente;

  // Hasta cuándo se le extendió el plazo: la fecha más lejana entre los
  // equipos que todavía no volvió, sin contar los que quedaron con entrega
  // indefinida (esos no tienen fecha que recordarle).
  const fechaProrroga =
    equiposAfuera(factura)
      .filter(
        ({ equipo }) => !equipo.vencimientoIndefinido && equipo.fechaVencimiento,
      )
      .map(({ equipo }) => equipo.fechaVencimiento)
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
  // UNA CELDA DE LA PIZARRA: el rótulo chico arriba y la cifra grande abajo.
  // Los estilos y los colores viven en el tema (Paper variant="totalesCeldas"),
  // como los del recuadro de totales de la ficha del cliente: acá solo se dice
  // qué dato va en cada celda y de cuál de las cuatro se trata.
  const celdaDePlata = (clase, rotulo, valor) => (
    <Box className={`celda ${clase}`}>
      <Typography className="rotulo">{rotulo}</Typography>
      <Typography className="cifra">{valor}</Typography>
    </Box>
  );

  const cuadroTotales = valorTotal && (
    <Box>
      {/* LOS CUATRO NÚMEROS DE LA LLAMADA, en celdas y no apilados: cuánto
          es, cuánto entró por el despacho, cuánto abonó después y cuánto
          falta. En renglones había que recorrerlos de arriba abajo para
          encontrar uno; acá los cuatro se ven de una.
          En el celular van de a dos: cuatro columnas en 360 píxeles dejan las
          cifras cortadas. */}
      <Paper variant="totalesCeldas" sx={{ mb: 1 }}>
        {celdaDePlata("total", "Total", valorTotal)}
        {celdaDePlata("pagado", "Pagado", formatearMoneda(cuenta.pagado))}
        {celdaDePlata("abono", "Abonos", formatearMoneda(cuenta.abonos))}
        {cuenta.saldoAFavor > 0
          ? celdaDePlata("ok", "Saldo a favor", formatearMoneda(cuenta.saldoAFavor))
          : celdaDePlata(
              saldoPendienteNumero > 0 ? "alerta" : "ok",
              "Saldo pendiente",
              saldoPendiente,
            )}
      </Paper>

      {/* Lo que no toda factura tiene, y que igual hay que poder ver: sigue
          como renglón, en su propio recuadro. En celdas fijas obligaría a
          mostrar vacíos.

          El recuadro entero aparece SOLO si hay alguno de los dos. Sin esta
          condición se dibujaba igual, con su fondo y su relleno, y una factura
          sin depósito devuelto ni entregas mostraba una barra oscura vacía
          debajo de las celdas. */}
      {(cuenta.depositoDevuelto > 0 || cuenta.entregas > 0) && (
        <Paper variant="totales" sx={{ minWidth: { sm: 260 } }}>
          {/* El depósito devuelto ya salió del total de arriba. Se muestra
              igual, porque si no el total cambiaría sin explicación. */}
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
              <Typography variant="body2">
                {formatearMoneda(cuenta.entregas)}
              </Typography>
            </Box>
          )}
        </Paper>
      )}
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
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
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
              {plazo ? (
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
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
                      <Box
                        sx={{ width: "1px", height: 16, bgcolor: "divider" }}
                        aria-hidden
                      />
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
              ) : (
                fecha && (
                  <Typography variant="body2" color="text.secondary">
                    Fecha despacho: {fecha}
                  </Typography>
                )
              )}

              {/* Acciones de la factura arriba a la derecha, junto al chip de
                  estado — mismo patrón que las facturas de ClienteDetalle. */}
              <Stack direction="row" spacing={0.75} alignItems="center">
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
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                        p: 0.5,
                        color: acento,
                        "&.Mui-disabled": { color: "action.disabled" },
                      }}
                    >
                      <AttachMoneyIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>

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
                  <Tooltip
                    title={
                      gestionAbierta
                        ? "Ver solo las últimas"
                        : `Ver las ${gestiones.length} gestiones`
                    }
                  >
                    <IconButton
                      size="small"
                      // Con dos o menos ya están todas a la vista: el botón no
                      // tendría nada que desplegar.
                      disabled={gestiones.length <= 2}
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

                {/* LAS DOS ÚLTIMAS, siempre. Antes la bitácora arrancaba
                    cerrada del todo y había que abrirla para saber si a este
                    cliente ya lo habían llamado — que es lo primero que se
                    pregunta quien va a llamarlo. Con las dos más recientes a
                    la vista, la pregunta está contestada de entrada, y el
                    botón queda para el historial completo, que con varias
                    llamadas ocupa la pantalla entera. */}
                <Box sx={{ ...recuadroDeBloque(colorGestion), mt: 0.5 }}>
                  <Stack spacing={0.25}>
                    {(gestionAbierta ? gestiones : gestiones.slice(-2)).map((registro, i) => (
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
              </Box>
            )}

            {/* LA PLATA, apenas termina la gestión y antes de los equipos:
                es lo que se lee mientras se habla con el cliente. Las celdas
                SON el estado de cuenta; no llevan rótulo encima porque no
                necesitan que un renglón anuncie lo que ya dicen. */}
            {!facturaPlegada(factura.id) && cuadroTotales}

            {/* Una factura puede seguir en cartera sin tener un solo equipo
                vencido: le renovaron el que la trajo, o ya devolvió todo, y
                se queda por la plata que debe. Sin este aviso la tarjeta
                mostraba un hueco y no había forma de saber por qué seguía
                acá. Dice lo único que queda por hacer: cobrar. */}
            {!facturaPlegada(factura.id) && !hayEquiposVencidos && (
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
                  Sin equipos vencidos
                </Typography>
                {/* Con equipos todavía afuera, ese saldo es el de ANTES de la
                    ampliación, y hay que decirlo: si no, el número no coincide
                    con el saldo pendiente que muestra la cuenta y parece un
                    error. Con todo devuelto no lleva aclaración, porque ahí sí
                    es la cuenta completa (ver saldoExigible). */}
                <Typography variant="body2" color="text.secondary">
                  {`Sigue en cartera por el saldo de ${formatearMoneda(saldoExigible)}`}
                  {quedanEquiposAfuera ? ", deuda antes de la ampliación." : "."}
                </Typography>
              </Box>
            )}

            {!facturaPlegada(factura.id) && equiposDe(factura).length > 0 && (
              <Stack spacing={1} sx={{ mb: 1 }}>
                {/* Solo los equipos VENCIDOS que siguen afuera: son los que
                    trajeron la factura acá y los únicos que se le pueden
                    reclamar hoy. Los que todavía están en fecha se ven en la
                    ficha del cliente; acá solo harían preguntarse por qué
                    aparece algo que nadie tiene que devolver todavía. */}
                {agruparPorVencimiento(
                  equiposDe(factura)
                    .filter(
                      ({ equipo }) =>
                        sigueAfuera(equipo) && equipoVencido(equipo, hoy),
                    )
                    .map(({ equipo }) => equipo),
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

                {/* Solo lo que volvió DESPUÉS de vencer: eso es lo que se
                    consiguió cobrando. Lo devuelto en plazo no entró con esta
                    factura a Seguimiento y no se muestra acá (ver
                    equipoDevueltoEnCobranza). */}
                {equiposDe(factura).some(({ equipo }) =>
                  equipoDevueltoEnCobranza(equipo),
                ) && (
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
                      {equiposDe(factura)
                        .filter(({ equipo }) => equipoDevueltoEnCobranza(equipo))
                        .map(({ equipo, grupo, indice }) =>
                          renderEquipoDevuelto(
                            equipo,
                            grupo,
                            `devuelto-${grupo.grupo}-${indice}`,
                          ),
                        )}
                    </Stack>
                  </Box>
                )}
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
        open={abonoOpen}
        onClose={() => setAbonoOpen(false)}
        cliente={cliente}
        facturas={facturasDelCliente}
        onAbonado={onEquiposActualizados}
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
