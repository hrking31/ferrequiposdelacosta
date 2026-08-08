import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { alpha } from "@mui/material/styles";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import PlaceIcon from "@mui/icons-material/Place";
import BadgeIcon from "@mui/icons-material/Badge";
import FolderSharedIcon from "@mui/icons-material/FolderShared";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import AddIcon from "@mui/icons-material/Add";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import ClienteFormDialog from "../ListaClientes/ClienteFormDialog";
import FacturaFormDialog from "./FacturaFormDialog";
import AgregarEquipoDialog from "./AgregarEquipoDialog";
import AbonoDialog from "./AbonoDialog";
import ReporteFacturasDialog from "./ReporteFacturasDialog";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import SavingsIcon from "@mui/icons-material/Savings";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import ConstructionIcon from "@mui/icons-material/Construction";
import LibraryAddIcon from "@mui/icons-material/LibraryAdd";
import EventIcon from "@mui/icons-material/Event";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import AssignmentReturnIcon from "@mui/icons-material/AssignmentReturn";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import generarFacturaPdf from "../VistaPdf/VistaFacturaPdf";
import AddCardIcon from "@mui/icons-material/AddCard";
import LoadingLogo from "../LoadingLogo/LoadingLogo";
import PaymentsIcon from "@mui/icons-material/Payments";
import nequiLogo from "../../assets/mediosPago/nequi.png";
import bancolombiaLogo from "../../assets/mediosPago/bancolombia.png";
import daviplataLogo from "../../assets/mediosPago/daviplata.png";
import {
  agruparLotesAgregados,
  normalizarPagos,
  calcularAmpliacionEquipo,
  calcularAmpliacionFactura,
  calcularEstadoCliente,
  calcularEstadoFactura,
  calcularCuentaFactura,
  calcularCuentaCliente,
  equipoDevueltoCompleto,
  ESTADO_FACTURA_INFO,
  ESTADO_CLIENTE_INFO,
} from "./facturaUtils";
import RegistrarDevolucionDialog from "../SeguimientoClientes/RegistrarDevolucionDialog";
import { formatearMonedaOVacio, formatearNit } from "../../Utils/formato";

// Cada medio de pago con su logo (ver MODOS_PAGO en facturaUtils.js). "Nequi"
// y "Nequi A" son dos cuentas de personas distintas —Yaz y Armando— con el
// mismo logo, por eso la primera lleva el nombre escrito al lado. Lo guardado
// en Firestore no cambia: acá solo se traduce lo que se ve.
const LOGOS_PAGO = {
  Nequi: nequiLogo,
  "Nequi A": nequiLogo,
  Bancolombia: bancolombiaLogo,
  Daviplata: daviplataLogo,
};

// Los cuatro logos miden lo mismo, así el renglón queda parejo.
const TAMANO_LOGO_PAGO = { xs: 20, sm: 26 };

const renderMedioPago = (medio) => {
  const logo = LOGOS_PAGO[medio];

  return (
    // El `title` muestra de qué medio se trata al parar el mouse encima.
    <Box
      component="span"
      title={medio}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        verticalAlign: "middle",
      }}
    >
      {logo ? (
        <Box
          component="img"
          src={logo}
          alt={medio}
          // "contain" porque el de Nequi es más alto que ancho: así entra
          // entero en vez de recortarse o deformarse.
          sx={{
            height: TAMANO_LOGO_PAGO,
            width: TAMANO_LOGO_PAGO,
            objectFit: "contain",
            display: "block",
          }}
        />
      ) : (
        <PaymentsIcon
          sx={{ fontSize: TAMANO_LOGO_PAGO, color: "custom.pagoEfectivo" }}
        />
      )}

      {medio === "Nequi" && (
        <Typography
          component="span"
          variant="caption"
          fontWeight="bold"
          sx={{ color: "text.primary", lineHeight: 1 }}
        >
          Yaz
        </Typography>
      )}
    </Box>
  );
};

// El recuadro de color que envuelve cada bloque de una factura: la
// informacion de pago, los cargos adicionales y los abonos. Todo su aspecto
// —el borde, el resplandor y el degradado— sale del color que se le pase,
// que es el del bloque al que pertenece.
const renderRecuadroBloque = (color, contenido, key) => (
  <Box
    key={key}
    sx={{
      p: 1.5,
      borderRadius: 1,
      bgcolor: "background.paper",
      border: "1px solid",
      // Todo el recuadro se tiñe del color del bloque: el borde, un
      // resplandor difuso alrededor y un degradado por encima.
      borderColor: color,
      // El resplandor va hacia ADENTRO: como sombra externa se derramaba
      // por fuera del borde y manchaba lo que tenía al lado.
      boxShadow: `inset 0 0 12px ${alpha(color, 0.2)}`,
      position: "relative",
      // Recorta el degradado al radio del borde: con inset 0 las esquinas
      // se le salían por encima.
      overflow: "hidden",
      "&::before": {
        content: '""',
        position: "absolute",
        inset: 0,
        borderRadius: "inherit",
        // El degradado cubre el recuadro completo: entra fuerte por la
        // esquina de arriba y se va aclarando en diagonal, pero sin llegar
        // nunca a transparente.
        background: `linear-gradient(135deg, ${alpha(color, 0.16)}, ${alpha(color, 0.04)})`,
        pointerEvents: "none",
      },
    }}
  >
    {contenido}
  </Box>
);

// Los datos de adentro de un recuadro: cada uno es una columna con el rotulo
// arriba y el valor abajo, separadas por una linea vertical. En celular no
// entran cuatro columnas, asi que se apilan y la linea desaparece.
//
// Un dato puede traer `contenido` en vez de `valor` cuando lo que va abajo no
// es texto sino algo dibujado, como el logo del medio de pago.
const renderFilaDatos = (color, datos) => (
  <Stack
    direction={{ xs: "column", sm: "row" }}
    rowGap={1}
    sx={{ minWidth: 0 }}
    divider={
      <Divider
        orientation="vertical"
        flexItem
        sx={{ my: 0.5, display: { xs: "none", sm: "block" } }}
      />
    }
  >
    {datos.map(({ clave, rotulo, valor, contenido }) => (
      <Box key={clave} sx={{ flex: 1, minWidth: 0, px: { sm: 0.75 } }}>
        {/* El rótulo lleva el color del bloque; el valor va en el color
            normal del texto, que es donde se lee la cifra. */}
        <Typography variant="rotuloDato" sx={{ color }}>
          {rotulo}
        </Typography>
        {contenido || <Typography variant="valorDato">{valor}</Typography>}
      </Box>
    ))}
  </Stack>
);

// El molde de los botones de acción de esta pantalla: un cuadrito con borde,
// que los agrupa visualmente en vez de dejarlos sueltos. Lo usan los de cada
// factura y —en pantalla chica— los del encabezado del cliente.
const iconBtnSx = {
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 1,
  p: 0.5,
};

// ── La pizarra del estado de cuenta ────────────────────────────────────
//
// Las casillas de una cuenta, en el orden en que se leen: cuánto es, cuánto
// entró y cuánto falta. La usan la tarjeta del cliente —sumando todas sus
// facturas— y cada factura plegada.
//
// `resumida` deja solo las dos que importan de un vistazo: en celular las
// cuatro no entran y los importes de siete cifras se montan entre sí.
const casillasDeCuenta = (cuenta, { resumida = false } = {}) => {
  const aFavor = cuenta.saldoAFavor > 0;

  const casillaTotal = {
    clave: "total",
    Icono: ReceiptLongIcon,
    rotulo: "Total",
    valor: formatearMonedaOVacio(cuenta.total),
    color: "custom.totalText",
  };

  // Un solo renglón para las dos caras de lo mismo: lo que falta cobrar, o lo
  // que el cliente tiene a su favor si entregó de más.
  const casillaSaldo = {
    clave: "saldo",
    Icono: PendingActionsIcon,
    rotulo: aFavor ? "A favor" : "Saldo",
    valor: formatearMonedaOVacio(
      aFavor ? cuenta.saldoAFavor : cuenta.saldoPendiente,
    ),
    color: aFavor ? "success.light" : "error.light",
  };

  if (resumida) return [casillaTotal, casillaSaldo];

  return [
    casillaTotal,
    {
      clave: "pagado",
      Icono: PaymentsIcon,
      rotulo: "Pagado",
      valor: formatearMonedaOVacio(cuenta.pagado),
      color: "success.light",
    },
    {
      clave: "abonos",
      Icono: SavingsIcon,
      rotulo: "Abonos",
      valor: formatearMonedaOVacio(cuenta.abonos),
      color: "info.light",
    },
    casillaSaldo,
  ];
};

// La pizarra en sí: casillas del mismo ancho separadas por una línea
// vertical, sobre el fondo oscuro fijo del tema (se lee igual de día que de
// noche). El `sx` que se le pase se suma al de acá, para acomodarla en el
// hueco de cada pantalla.
const renderPizarraTotales = (casillas, sx) => (
  <Paper
    variant="totales"
    sx={{
      minWidth: 0,
      py: 1.25,
      px: 1.5,
      mt: 0,
      // Reemplaza la sombra difusa de la variante por el relieve: luz arriba,
      // sombra abajo.
      boxShadow: (theme) => theme.palette.custom.panelRelieve,
      ...sx,
    }}
  >
    <Stack
      direction="row"
      sx={{ minWidth: 0 }}
      // El divisor lleva margen arriba y abajo para no llegar a los bordes de
      // la tarjeta.
      divider={
        <Divider
          orientation="vertical"
          flexItem
          sx={{ my: 0.5, borderColor: "custom.panelText", opacity: 0.25 }}
        />
      }
    >
      {casillas.map(({ clave, Icono, rotulo, valor, color }) => (
        <Box
          key={clave}
          // Todas las casillas miden lo mismo.
          sx={{ flex: 1, minWidth: 0, color, px: 0.75 }}
        >
          {/* El icono queda a la izquierda, alineado con el rotulo; como es
              mas alto que las dos lineas, ocupa el espacio que sobra abajo. El
              rotulo y el valor arrancan en el mismo punto. */}
          <Stack
            direction="row"
            alignItems="flex-start"
            gap={0.75}
            sx={{ minWidth: 0 }}
          >
            <Icono fontSize="small" sx={{ flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="rotuloDato">{rotulo}</Typography>
              {/* Un valor de siete cifras no entra en un cuarto del hueco y se
                  montaba sobre el de al lado: achica en pantallas medianas.
                  Estas son las cifras principales de la cuenta, un punto más
                  grandes que las de un recuadro. */}
              <Typography
                variant="valorDato"
                sx={{ whiteSpace: "nowrap", fontSize: { lg: "1rem" } }}
              >
                {valor}
              </Typography>
            </Box>
          </Stack>
        </Box>
      ))}
    </Stack>
  </Paper>
);

// Los estados y sus nombres viven en facturaUtils (ver ESTADO_FACTURA_INFO).
// El color de cada uno sale de avatarBgPorEstado —color propio, no el prop
// `color` de MUI— para no repetir colores ya usados en otros botones.

const TIPO_PAGO_LABELS = {
  total: "Total",
  parcial: "Parcial",
  // "Pago con abono" es solo la forma de cargarlo: el cliente entregó de más y
  // el sobrante quedó como abono, así que lo facturado se cubrió completo. Acá
  // se lee como lo que es, un pago total.
  conAbono: "Total",
  sinPago: "Sin pago",
};

const CODIGOS_SIN_TELEFONO = ["SN", "NT", "N/A", ""];

const obtenerNombreCompleto = (cliente) => {
  if (!cliente) return "";
  if (cliente.tipo === "empresa")
    return cliente.razonSocial || cliente.nombreOriginal;
  return (
    [cliente.nombres, cliente.apellido].filter(Boolean).join(" ") ||
    cliente.nombreOriginal
  );
};

const tieneTelefonoValido = (telefono) =>
  telefono &&
  !CODIGOS_SIN_TELEFONO.includes(String(telefono).trim().toUpperCase());

// Ojo: esta es la variante que devuelve NADA si el valor no es un número, no la
// que muestra "$ 0". Ver Utils/formato.js.
const formatearMoneda = formatearMonedaOVacio;


const formatearFecha = (isoDate) => {
  if (!isoDate) return null;
  const [anio, mes, dia] = isoDate.split("-");
  return `${dia}/${mes}/${anio}`;
};

export default function ClienteDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const esMovil = useMediaQuery(theme.breakpoints.down("sm"));
  const isFullScreen = useMediaQuery("(max-width:915px)");
  const acento = theme.palette.custom.accent;
  // Cada bloque de la factura tiene su color: el pago, los equipos del
  // alta y los que se agregaron despues.
  const colorPago = theme.palette.custom.seccionPago;
  const colorEquipos = theme.palette.custom.seccionEquipos;
  const colorEquiposAgregados =
    theme.palette.custom.seccionEquiposAgregados;
  // Los abonos van con el mismo azul que la casilla "Abonos" del resumen de
  // cuenta del encabezado. Se usa el tono .main y no .light porque acá el
  // recuadro va sobre fondo de tarjeta, no sobre la pizarra oscura.
  const colorAbonos = theme.palette.info.main;
  const colorAdicionales = theme.palette.custom.seccionAdicionales;
  const avatarBgPorEstado = theme.palette.custom.estadoFactura;
  const [cliente, setCliente] = useState(null);
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editarOpen, setEditarOpen] = useState(false);
  const [crearFacturaOpen, setCrearFacturaOpen] = useState(false);
  const [reporteOpen, setReporteOpen] = useState(false);
  const [facturaAgregarEquipo, setFacturaAgregarEquipo] = useState(null);
  const [abonoOpen, setAbonoOpen] = useState(false);
  const [facturaEditando, setFacturaEditando] = useState(null);
  const [facturaEliminando, setFacturaEliminando] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  // La factura a la que se le está registrando una devolución. Es el mismo
  // diálogo que usa Seguimiento: acá sirve para el cliente que devuelve todo
  // ANTES de vencerse, que nunca pasa por esa pantalla.
  const [facturaDevolucion, setFacturaDevolucion] = useState(null);
  // En celular el encabezado deja a la vista solo el nombre y el resumen de
  // cuenta: el teléfono y la dirección se despliegan con la flecha, así lo que
  // se busca de un vistazo (cuánto es y cuánto falta) no queda debajo de todo.
  // En computador sobra el ancho y van siempre visibles.
  const [contactoAbierto, setContactoAbierto] = useState(false);
  // Cada factura tiene 4 secciones que se muestran/ocultan por separado en
  // móvil (pagoGeneral, equiposFactura, equiposAgregados, pagoTotal) — la
  // clave es "{facturaId}:{seccion}". En PC todas están siempre visibles.
  const [seccionesAbiertas, setSeccionesAbiertas] = useState({});
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

  const handleEliminarFactura = async () => {
    if (!facturaEliminando) return;
    setEliminando(true);
    try {
      await deleteDoc(
        doc(db, "clientes", id, "facturas", facturaEliminando.id),
      );
      setFacturaEliminando(null);
      await fetchCliente(true);
      showSnackbar("Factura eliminada.", "success");
    } catch (error) {
      showSnackbar(`Error al eliminar la factura: ${error.message}`, "error");
    } finally {
      setEliminando(false);
    }
  };

  const toggleSeccion = (facturaId, seccion) => {
    const clave = `${facturaId}:${seccion}`;
    setSeccionesAbiertas((prev) => ({ ...prev, [clave]: !prev[clave] }));
  };
  const seccionAbierta = (facturaId, seccion) =>
    Boolean(seccionesAbiertas[`${facturaId}:${seccion}`]);

  // Plegar una factura entera. Todas arrancan plegadas —de un cliente con
  // muchas facturas se ve la lista completa de un vistazo— así que lo que se
  // guarda es cuáles se fueron abriendo.
  const [facturasAbiertas, setFacturasAbiertas] = useState({});
  const toggleFacturaColapsada = (facturaId) =>
    setFacturasAbiertas((prev) => ({ ...prev, [facturaId]: !prev[facturaId] }));
  const facturaColapsada = (facturaId) => !facturasAbiertas[facturaId];

  // silencioso=true evita el spinner de pantalla completa: se usa para
  // refrescar datos después de una edición puntual (crear factura, registrar
  // un abono) sin desmontar toda la vista y perder el scroll.
  const fetchCliente = useCallback(
    async (silencioso = false) => {
      try {
        if (!silencioso) setLoading(true);
        const clienteSnap = await getDoc(doc(db, "clientes", id));
        if (!clienteSnap.exists()) {
          setNotFound(true);
          return;
        }
        const datosCliente = { id: clienteSnap.id, ...clienteSnap.data() };

        const facturasSnap = await getDocs(
          collection(db, "clientes", id, "facturas"),
        );
        const listaFacturas = facturasSnap.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));

        // El estado del cliente es el único que se guarda, para que la lista
        // de clientes pueda filtrar sin leer las facturas de todos. Puede
        // quedar viejo solo con que pase el tiempo —una factura que venció
        // anoche—, así que acá, que ya tenemos todas sus facturas, se
        // recalcula y se corrige si hace falta.
        const estadoCalculado = calcularEstadoCliente(listaFacturas);
        if (estadoCalculado !== datosCliente.estado) {
          await updateDoc(doc(db, "clientes", id), { estado: estadoCalculado });
          datosCliente.estado = estadoCalculado;
        }

        setCliente(datosCliente);
        setFacturas(listaFacturas);
      } catch (error) {
        console.error("Error al obtener el cliente:", error);
        showSnackbar("Error al cargar el cliente", "error");
      } finally {
        if (!silencioso) setLoading(false);
      }
    },
    [id, showSnackbar],
  );

  useEffect(() => {
    fetchCliente();
  }, [fetchCliente]);

  // Tarjeta de un equipo dentro de una factura: cantidad/nombre/subtotal
  // arriba, días/precio/fechas como pills abajo. La misma tarjeta sirve para
  // un equipo original o uno agregado después.
  const renderEquipoRow = (equipo, key, color) => {
    const despacho = formatearFecha(equipo.fechaDespacho);
    const devuelto = equipoDevueltoCompleto(equipo);
    const porDia = (Number(equipo.cantidad) || 0) * (Number(equipo.valor) || 0);
    const subtotalEquipo = porDia * (Number(equipo.dias) || 0);

    // Si al equipo se le amplió el plazo, cuánto pasa a valer con esos días
    // extra ya descontados. Se muestra debajo del valor original.
    const ampliacionEquipo = calcularAmpliacionEquipo(equipo);
    const valorConAmpliacion =
      ampliacionEquipo.neto > 0 && subtotalEquipo > 0
        ? subtotalEquipo + ampliacionEquipo.neto
        : 0;

    return (
      <Box
        key={key}
        sx={{
          p: 1,
          borderRadius: 1,
          bgcolor: "background.paper",
          border: "1px solid",
          // Mismo tratamiento que el recuadro de pago, con el color del grupo
          // al que pertenece el equipo.
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
        }}
      >
        <Stack direction="row" alignItems="center" gap={1}>
          <Chip
            variant="meta"
            label={equipo.cantidad}
            size="small"
            sx={{
              fontWeight: "bold",
              flexShrink: 0,
              // Antes era amarillo fijo, que en modo claro quedaba casi
              // invisible sobre el chip. Es letra chica, así que va el acento
              // en su versión oscura.
              color: theme.palette.custom.accent,
            }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography component="span" variant="body2" fontWeight="bold">
              {equipo.nombre}
            </Typography>
            {/* Cuándo se pidió este equipo, que no es lo mismo que cuándo
                salió despachado. Solo lo traen los que se sumaron después de
                crear la factura. */}
            {equipo.fechaAgregado && (
              <Typography
                component="span"
                variant="caption"
                color="text.secondary"
                sx={{ ml: 0.75, whiteSpace: "nowrap" }}
              >
                agregado {formatearFecha(equipo.fechaAgregado)}
              </Typography>
            )}
          </Box>
          {subtotalEquipo > 0 && (
            <Stack sx={{ flexShrink: 0, textAlign: "right" }}>
              <Typography variant="body2" fontWeight="bold">
                {formatearMoneda(subtotalEquipo)}
              </Typography>
              {valorConAmpliacion > 0 && (
                <Typography
                  variant="caption"
                  fontWeight="bold"
                  sx={{ color: "custom.accent", lineHeight: 1.2 }}
                >
                  {formatearMoneda(valorConAmpliacion)}
                </Typography>
              )}
            </Stack>
          )}
        </Stack>
        {(() => {
          const chipsDiasValor = [
            <Chip
              key="dias"
              variant="meta"
              size="small"
              icon={<EventIcon />}
              label={`${equipo.dias} día${Number(equipo.dias) === 1 ? "" : "s"}`}
            />,
          ];
          if (Number(equipo.valor) > 0) {
            chipsDiasValor.push(
              <Chip
                key="valor"
                variant="meta"
                size="small"
                icon={<AttachMoneyIcon />}
                label={`${formatearMoneda(Number(equipo.valor))}/día`}
              />,
            );
          }

          const chipsFechas = [];
          if (despacho) {
            chipsFechas.push(
              <Chip
                key="despacho"
                variant="meta"
                size="small"
                icon={<LocalShippingIcon />}
                label={`Despacho ${despacho}`}
              />,
            );
          }
          if (devuelto) {
            chipsFechas.push(
              <Chip
                key="devuelto"
                variant="meta"
                size="small"
                icon={<AssignmentReturnIcon />}
                sx={{ color: "success.main" }}
                label={`Devuelto ${formatearFecha(equipo.fechaDevolucion) || ""}`}
              />,
            );
          }
          if (equipo.vencimientoIndefinido) {
            chipsFechas.push(
              <Chip
                key="indefinida"
                variant="meta"
                size="small"
                label="Entrega indefinida — cliente debe avisar"
              />,
            );
          } else {
            if (equipo.fechaVencimientoOriginal) {
              chipsFechas.push(
                <Chip
                  key="vencido"
                  size="small"
                  variant="metaEstado"
                  icon={<EventBusyIcon />}
                  sx={{
                    bgcolor: "error.main",
                    color: "error.contrastText",
                    border: "none",
                    // El ícono va del color del texto del chip, no del acento:
                    // sobre el rojo pleno el naranja no se distinguiría.
                    "& .MuiChip-icon": { color: "inherit" },
                  }}
                  label={`Vencido ${formatearFecha(equipo.fechaVencimientoOriginal)}`}
                />,
              );
            }
          }

          // Los días que se le sumaron al plazo, con su valor ya descontado, y
          // el descuento aparte. Va fuera del if de arriba porque los equipos
          // con entrega indefinida también acumulan días (los que llevan sin
          // devolverse), y antes ese chip no se les mostraba nunca.
          const ampliacion = calcularAmpliacionEquipo(equipo);
          if (ampliacion.dias > 0) {
            chipsFechas.push(
              <Chip
                key="agregados"
                variant="meta"
                size="small"
                sx={{ color: "custom.accent" }}
                label={`+${ampliacion.dias} día${ampliacion.dias === 1 ? "" : "s"}${
                  ampliacion.bruto > 0
                    ? ` · ${formatearMoneda(ampliacion.neto)}`
                    : ""
                }`}
              />,
            );
          }
          if (ampliacion.descuento > 0) {
            chipsFechas.push(
              <Chip
                key="descuento"
                variant="metaEstado"
                size="small"
                // El marranito: lo que el cliente se ahorra.
                icon={<SavingsIcon />}
                sx={{
                  fontWeight: 600,
                  color: "success.main",
                  "& .MuiChip-icon": { color: "inherit" },
                }}
                label={`Descuento ${formatearMoneda(ampliacion.descuento)}`}
              />,
            );
          }

          // El vencimiento vigente va último: primero se lee de dónde viene
          // (venció tal día, se le sumaron tantos días, con tal descuento) y
          // recién al final hasta cuándo quedó.
          if (!devuelto && !equipo.vencimientoIndefinido && equipo.fechaVencimiento) {
            chipsFechas.push(
              <Chip
                key="devuelve"
                variant="meta"
                size="small"
                icon={<AssignmentReturnIcon />}
                label={`Devuelve ${formatearFecha(equipo.fechaVencimiento)}`}
              />,
            );
          }

          // En móvil, días/precio en una columna y fechas en otra (prolijo).
          // En PC, todos los chips sueltos en una sola fila, como estaba.
          return esMovil ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                columnGap: 1,
                rowGap: 0.5,
                mt: 0.75,
              }}
            >
              <Stack spacing={0.5}>{chipsDiasValor}</Stack>
              <Stack spacing={0.5}>{chipsFechas}</Stack>
            </Box>
          ) : (
            <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.75 }}>
              {chipsDiasValor}
              {chipsFechas}
            </Stack>
          );
        })()}
      </Box>
    );
  };

  // Lo que se cobra aparte del alquiler: depósito y transporte. Antes iban
  // dentro del cuadro de pago, mezclados con el medio y el monto; ahora van
  // en su propio recuadro, debajo de los equipos.
  const renderAdicionales = ({
    deposito,
    transporteTipo,
    transporteMonto,
    iva,
    key,
    color,
  }) => {
    const hayTransporte = transporteTipo && transporteTipo !== "Sin transporte";
    const hayIva = Number(iva) > 0;
    if (deposito <= 0 && !hayTransporte && !hayIva) return null;

    const total =
      (hayIva ? Number(iva) : 0) +
      deposito +
      (hayTransporte ? transporteMonto : 0);

    const datos = [];
    if (hayIva) {
      datos.push({
        clave: "iva",
        rotulo: "IVA (19%)",
        valor: formatearMoneda(Number(iva)),
      });
    }
    if (deposito > 0) {
      datos.push({
        clave: "deposito",
        rotulo: "Depósito",
        valor: formatearMoneda(deposito),
      });
    }
    // El tipo de transporte y su valor van juntos: son un solo dato, no dos
    // ("Ida y vuelta · $60.000").
    if (hayTransporte) {
      datos.push({
        clave: "transporte",
        rotulo: "Transporte",
        valor:
          transporteMonto > 0
            ? `${transporteTipo} · ${formatearMoneda(transporteMonto)}`
            : transporteTipo,
      });
    }
    // La suma de todo lo que se cobra aparte del alquiler.
    datos.push({
      clave: "total",
      rotulo: "Total",
      valor: formatearMoneda(total),
    });

    return renderRecuadroBloque(color, renderFilaDatos(color, datos), key);
  };

  // Cuadro de pago de un lote de equipos (el original de la factura, o cada
  // equipo agregado después): tipo de pago, medio(s) de pago, depósito y
  // transporte de ESE lote puntual — no de toda la factura.
  const renderInfoPago = ({ pagos, tipoPago, fecha, key, colorEstado }) => {
    const tipoPagoLabel = TIPO_PAGO_LABELS[tipoPago] || null;
    if (pagos.length === 0 && !tipoPagoLabel) return null;

    const mediosPago = pagos.filter((pago) => pago.medio);
    const totalPagos = pagos.reduce(
      (total, pago) => total + (Number(pago.monto) || 0),
      0,
    );

    // Cada dato es una columna con el rotulo arriba y el valor abajo, igual
    // que el resumen de cuenta del encabezado.
    const datos = [];
    // Cuando se recibio esta plata: la fecha de creacion en la factura, y la
    // de solicitud en cada lote de equipos agregados.
    if (fecha) {
      datos.push({
        clave: "fecha",
        rotulo: "Fecha",
        valor: formatearFecha(fecha),
      });
    }
    if (tipoPagoLabel) {
      datos.push({ clave: "pago", rotulo: "Pago", valor: tipoPagoLabel });
    }
    // El medio va con el logo de la marca en vez del nombre escrito. Cuando el
    // pago se repartio entre varios, siguen separados por "+".
    if (mediosPago.length > 0) {
      datos.push({
        clave: "medio",
        rotulo: "Medio",
        contenido: (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 0.5,
            }}
          >
            {mediosPago.map((pago, indice) => (
              <Fragment key={`${pago.medio}-${indice}`}>
                {indice > 0 && "+"}
                {renderMedioPago(pago.medio)}
              </Fragment>
            ))}
          </Box>
        ),
      });
    }
    if (pagos.length > 0) {
      datos.push({
        clave: "valor",
        rotulo: "Valor",
        valor: pagos
          .map((pago) => formatearMoneda(Number(pago.monto)))
          .filter(Boolean)
          .join(" + "),
      });
    }
    // Con el pago repartido en varios medios, el renglon de arriba queda como
    // una suma sin resolver: aca va el resultado.
    if (pagos.length > 1) {
      datos.push({
        clave: "total",
        rotulo: "Total",
        valor: formatearMoneda(totalPagos),
      });
    }

    return renderRecuadroBloque(
      colorEstado,
      renderFilaDatos(colorEstado, datos),
      key,
    );
  };

  // Los abonos que se registraron después de emitida la factura. Van en el
  // mismo recuadro que la información de pago, porque son lo mismo: plata que
  // entró, con su fecha y su medio.
  const renderAbonos = (abonos, colorEstado) => {
    if (!abonos || abonos.length === 0) return null;

    const renglones = (
      <Stack spacing={1} divider={<Divider />}>
        {abonos.map((abono, indice) => {
          const datos = [
            {
              clave: "fecha",
              rotulo: "Abono",
              valor: formatearFecha(abono.fecha),
            },
            {
              clave: "medio",
              rotulo: "Medio",
              contenido: renderMedioPago(abono.medio),
            },
            {
              clave: "valor",
              rotulo: "Valor",
              valor: formatearMoneda(Number(abono.monto) || 0),
            },
          ];
          return (
            <Box key={`abono-${indice}`}>
              {renderFilaDatos(colorEstado, datos)}
              {/* Cuando el abono no lo hizo el cliente directamente sobre
                  esta factura, sino que llegó como sobrante de otra (ver
                  AgregarEquipoDialog), queda esta nota para no confundirlo. */}
              {abono.nota && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 0.5, fontStyle: "italic" }}
                >
                  {abono.nota}
                </Typography>
              )}
            </Box>
          );
        })}
      </Stack>
    );

    return renderRecuadroBloque(colorEstado, renglones);
  };

  // Las finalizadas no entran en el reporte: ya no tienen nada pendiente que
  // reportar. Memoizado porque ReporteFacturasDialog usa esta lista como
  // dependencia para saber cuándo premarcar todo de nuevo, y sin esto cambia
  // de referencia en cada render del padre. Va antes del "if (loading)": los
  // Hooks no pueden llamarse condicionalmente.
  const facturasParaReporte = useMemo(
    () => facturas.filter((factura) => calcularEstadoFactura(factura) !== "finalizada"),
    [facturas],
  );

  if (loading) {
    return <LoadingLogo height="40vh" text="Cargando cliente..." />;
  }

  if (notFound) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <Typography variant="h6" gutterBottom>
          Cliente no encontrado
        </Typography>
        <Button variant="contained" onClick={() => navigate("/vistaclientes")}>
          Volver a Clientes
        </Button>
      </Box>
    );
  }

  const nombreCompleto = obtenerNombreCompleto(cliente);
  const estadoInfo =
    ESTADO_CLIENTE_INFO[cliente.estado] || ESTADO_CLIENTE_INFO.inactivo;
  const estadoColor =
    avatarBgPorEstado[cliente.estado] || avatarBgPorEstado.inactivo;
  const telefonoValido = tieneTelefonoValido(cliente.telefono);
  // La cuenta del cliente entero: la suma de todas sus facturas. A diferencia
  // de una factura suelta, acá el saldo es neto (lo que sobró en una descuenta
  // lo que se debe en otra).
  const cuentaCliente = calcularCuentaCliente(facturas);
  // Solo se pliega en celular; en computador el contacto está siempre a la
  // vista, así que la flecha no tiene nada que hacer.
  const contactoVisible = !esMovil || contactoAbierto;
  // Los botones del encabezado van enmarcados, iguales a los de cada factura:
  // toda la pantalla usa el mismo molde.
  const botonEncabezadoSx = { ...iconBtnSx, color: acento };

  // Las acciones del encabezado, en este orden: volver al listado, crear
  // factura y editar el cliente, y por último plegar el contacto. La carpeta
  // reemplaza al botón "Volver a Clientes" que ocupaba un renglón entero
  // arriba de la tarjeta; "Crear Factura" reemplaza al botón con letra que
  // vivía junto al título "Facturas N" (ese título se fue entero: el conteo
  // ahora es la insignia sobre el avatar del cliente).
  //
  // Hasta 915px son varios y flotan en la esquina de arriba. En computador
  // queda el lápiz solo y va dentro de la fila del nombre, después de la
  // pizarra de valores, así queda centrado con ella.
  const botonesEncabezado = (
    <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
      {isFullScreen && (
        <Tooltip title="Volver a Clientes">
          <IconButton
            size="small"
            onClick={() => navigate("/vistaclientes")}
            sx={botonEncabezadoSx}
          >
            <FolderSharedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      <Tooltip title="Crear factura">
        <IconButton
          size="small"
          onClick={() => setCrearFacturaOpen(true)}
          sx={botonEncabezadoSx}
        >
          <ReceiptLongIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* Un solo botón para todo el cliente: el abono se reparte solo entre
          las facturas que tengan saldo (ver AbonoDialog). El span es porque
          un botón deshabilitado no emite eventos de mouse y sin él el globo
          de ayuda no aparece. */}
      <Tooltip
        title={
          cuentaCliente.saldoPendiente > 0
            ? "Registrar abono"
            : "El cliente no tiene saldo pendiente"
        }
      >
        <span>
          <IconButton
            size="small"
            disabled={cuentaCliente.saldoPendiente === 0}
            onClick={() => setAbonoOpen(true)}
            sx={{
              ...botonEncabezadoSx,
              "&.Mui-disabled": { color: "action.disabled" },
            }}
          >
            <AttachMoneyIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      {/* El span es necesario para que el tooltip funcione con el botón
          deshabilitado: un botón así no emite eventos de mouse. */}
      <Tooltip title="Descargar reporte de facturas">
        <span>
          <IconButton
            size="small"
            onClick={() => setReporteOpen(true)}
            disabled={facturasParaReporte.length === 0}
            sx={botonEncabezadoSx}
          >
            <PictureAsPdfIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Editar cliente">
        <IconButton
          size="small"
          onClick={() => setEditarOpen(true)}
          sx={botonEncabezadoSx}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {esMovil && (
        <Tooltip
          title={
            contactoAbierto
              ? "Ocultar datos del cliente"
              : "Ver datos del cliente"
          }
        >
          <IconButton
            size="small"
            onClick={() => setContactoAbierto((abierto) => !abierto)}
            sx={botonEncabezadoSx}
          >
            {contactoAbierto ? (
              <ExpandLessIcon fontSize="small" />
            ) : (
              <ExpandMoreIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );

  // El nombre (con avatar y estado) más la pizarra de cuenta: un solo bloque
  // de contenido que se ubica distinto según el ancho (ver más abajo), pero
  // es el mismo en los dos casos.
  const contenidoEncabezado = (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      alignItems={{ xs: "stretch", sm: "center" }}
      sx={{
        // La separación va como `gap` y no como `spacing`: con los
        // elementos envolviéndose, los márgenes de spacing dejan huecos
        // dobles en el renglón de abajo.
        gap: 2,
        // Si el nombre y la pizarra no entran juntos, la pizarra baja a su
        // propio renglón en vez de estirar la tarjeta fuera de la pantalla.
        flexWrap: "wrap",
        minWidth: 0,
        flex: "1 1 auto",
      }}
    >
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        sx={{
          minWidth: 0,
          // Sin facturas no hay pizarra que empuje el bloque al borde
          // derecho, así que el hueco lo ocupa el nombre.
          flexGrow: facturas.length > 0 ? 0 : 1,
          // En celular, el Stack de arriba pasa a columna y este renglón
          // (y la pizarra, su hermano) deberían estirarse solos por el
          // alignItems:"stretch" del padre — pero con flexWrap:"wrap" en
          // un contenedor en columna, ese estirado no se aplica y cada
          // hijo vuelve a su ancho de contenido, más ancho que la
          // tarjeta. Forzarlo así es lo que evita que se salga.
          width: { xs: "100%", sm: "auto" },
        }}
      >
        {/* El conteo de facturas va como insignia sobre el avatar: antes
            era el título "Facturas N" que encabezaba la lista, antes de
            que ese renglón se repartiera entre esta insignia y el botón
            de crear factura, arriba. */}
        <Badge
          badgeContent={facturas.length}
          color="primary"
          overlap="circular"
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          sx={{ flexShrink: 0 }}
        >
          <Avatar
            sx={{
              // Más chico en celular: libera ancho para el nombre.
              width: { xs: 44, sm: 56 },
              height: { xs: 44, sm: 56 },
              bgcolor:
                avatarBgPorEstado[cliente.estado] || avatarBgPorEstado.inactivo,
            }}
          >
            {cliente.tipo === "empresa" ? (
              <BusinessIcon sx={{ fontSize: { xs: 22, sm: 28 } }} />
            ) : (
              <PersonIcon sx={{ fontSize: { xs: 22, sm: 28 } }} />
            )}
          </Avatar>
        </Badge>
        <Box sx={{ minWidth: 0, width: "100%" }}>
          {/* Antes acá había que reservarle hueco a los botones flotantes:
              ahora que son parte del mismo flujo, ese hueco ya no hace
              falta. Dejar que el nombre se parta en dos líneas sigue
              siendo aceptable si no entra entero. */}
          <Typography variant="h6">{nombreCompleto}</Typography>
          <Chip
            icon={estadoInfo.Icono ? <estadoInfo.Icono /> : undefined}
            label={estadoInfo.label}
            variant="estado"
            size="small"
            sx={{
              mt: 0.5,
              bgcolor: estadoColor,
              color: theme.palette.getContrastText(estadoColor),
              "& .MuiChip-icon": { color: "inherit" },
            }}
          />
        </Box>
      </Stack>

      {/* Sin facturas no hay cuenta que mostrar: una pizarra en cero
          sugeriría que el cliente debe algo. */}
      {facturas.length > 0 &&
        renderPizarraTotales(
          // Hasta 915px solo el total y el saldo: las cuatro casillas, con
          // importes de siete cifras, no entran sin montarse entre sí. Es
          // el mismo corte que usa la pizarra de cada factura.
          casillasDeCuenta(cuentaCliente, { resumida: isFullScreen }),
          // El mismo forzado de ancho que el renglón del avatar, y por la
          // misma razón: sin esto, en celular la pizarra vuelve a su
          // ancho de contenido y se sale de la tarjeta por la derecha.
          { flexGrow: 1, width: { xs: "100%", sm: "auto" } },
        )}
    </Stack>
  );

  return (
    <Box
      sx={{
        // El encabezado (tarjeta del cliente + "Facturas / Crear Factura")
        // queda fuera de cualquier scroll: solo la lista de facturas, más
        // abajo, tiene el suyo propio.
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <Box
        sx={{
          // Los mismos márgenes y esquinas que la tarjeta de una factura: son
          // dos tarjetas de la misma lista, una arriba de la otra.
          p: 2,
          borderRadius: 2,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: 1,
          mb: 3,
          position: "relative",
          // Sin esto, una pizarra de cuatro importes largos estira la tarjeta
          // más allá del ancho de la pantalla y aparece scroll horizontal.
          minWidth: 0,
          // Es fija, no parte del área con scroll: que no se achique si el
          // alto de la pantalla es chico.
          flexShrink: 0,
        }}
      >
        {/* En computador el resumen de cuenta va al lado del nombre; en celular
            no entra en la misma línea y pasa debajo, a todo el ancho. Los
            botones son el mismo bloque en los dos casos (botonesEncabezado);
            lo que cambia es dónde se ubican. */}
        {isFullScreen ? (
          // Hasta 915px los botones ya no flotan sobre la tarjeta: van en su
          // propia fila, siempre arriba y a la derecha. `row-reverse` hace
          // que el primer hijo (los botones, de ancho fijo) se quede fijo en
          // esa fila; si el segundo (nombre + pizarra) no entra al lado, es
          // el que baja completo a su propia fila — nunca los botones.
          <Stack
            direction="row-reverse"
            flexWrap="wrap"
            alignItems="flex-start"
            sx={{ rowGap: 2, columnGap: 2 }}
          >
            {botonesEncabezado}
            {contenidoEncabezado}
          </Stack>
        ) : (
          <Stack
            direction="row"
            alignItems="center"
            sx={{ gap: 2, flexWrap: "wrap" }}
          >
            {contenidoEncabezado}
            {botonesEncabezado}
          </Stack>
        )}

        {contactoVisible && (
          <>
            {/* El divisor horizontal no llega a los bordes de la tarjeta:
                queda centrado al 95% del ancho. */}
            <Divider sx={{ my: 2, width: "95%", mx: "auto" }} />

            {/* Dos columnas en computador (>915px): a la izquierda el contacto
                (teléfono y NIT/cédula), a la derecha la ubicación (dirección y
                obra). Hasta 915px se apilan en una sola columna. */}
            <Stack
              direction={isFullScreen ? "column" : "row"}
              spacing={isFullScreen ? 1 : 4}
              // Línea divisoria vertical entre las dos columnas, solo en
              // computador. `flexItem` la estira a la altura del contenido y el
              // margen vertical evita que llegue a los bordes.
              divider={
                !isFullScreen ? (
                  <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
                ) : undefined
              }
              sx={{ minWidth: 0 }}
            >
              {/* En computador, teléfono arriba y NIT/cédula debajo (columna).
                  En móvil van uno al lado del otro (fila): son cortos y entran
                  bien, así ahorran una línea. */}
              <Stack
                direction={isFullScreen ? "row" : "column"}
                spacing={isFullScreen ? 2 : 1}
                sx={{ flex: 1, minWidth: 0 }}
              >
                {telefonoValido ? (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <PhoneIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                    <Typography variant="body2">
                      {!isFullScreen && "Teléfono: "}
                      {cliente.telefono}
                    </Typography>
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Sin teléfono registrado
                  </Typography>
                )}

                {cliente.nit && (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <BadgeIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                    <Typography variant="body2">
                      {!isFullScreen &&
                        `${cliente.tipo === "empresa" ? "NIT" : "Cédula"}: `}
                      {formatearNit(cliente.nit)}
                    </Typography>
                  </Stack>
                )}
              </Stack>

              <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
                {cliente.direccion && (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <PlaceIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                    <Typography variant="body2">
                      {!isFullScreen && "Dirección: "}
                      {cliente.direccion}
                    </Typography>
                  </Stack>
                )}

                {cliente.obra && (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <ConstructionIcon
                      sx={{ fontSize: 18, color: "text.secondary" }}
                    />
                    <Typography variant="body2">
                      {!isFullScreen && "Obra: "}
                      {cliente.obra}
                    </Typography>
                  </Stack>
                )}
              </Stack>
            </Stack>
          </>
        )}
      </Box>

      {/* De acá para abajo es lo único que se desplaza: la tarjeta del
          cliente queda fija, fuera de este contenedor. */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
      {facturas.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Este cliente no tiene facturas registradas.
        </Typography>
      ) : (
        <Stack spacing={2}>
          {facturas.map((factura) => {
            // El estado sale de los datos de la factura, no de un campo
            // guardado: así no puede quedar viejo por el simple paso del
            // tiempo (ver calcularEstadoFactura en facturaUtils).
            const facturaEstado = calcularEstadoFactura(factura);
            const facturaEstadoInfo =
              ESTADO_FACTURA_INFO[facturaEstado] || { label: "Sin estado" };
            const facturaEstadoColor =
              avatarBgPorEstado[facturaEstado] ||
              theme.palette.custom.estadoNeutro;
            // Formato viejo (migrado del Excel): transporte es un número.
            // Formato nuevo (creado en la app): transporte es el tipo
            // (ej. "Solo ida") y el monto vive aparte en valorTransporte.
            const equiposSonObjetos =
              factura.equipos?.length > 0 &&
              typeof factura.equipos[0] === "object";
            const transporteMonto = formatearMoneda(
              typeof factura.transporte === "number"
                ? factura.transporte
                : factura.valorTransporte,
            );
            const transporteTipo =
              typeof factura.transporte === "string"
                ? factura.transporte
                : null;
            // Mismo cálculo compartido que usa Seguimiento de Clientes.
            const ampliacionFactura = calcularAmpliacionFactura(factura);
            // Subtotal e IVA se muestran ya con los días ampliados sumados
            // (menos el descuento): es lo que hoy se le cobraría al cliente,
            // no lo que decía la factura el día que se emitió. Si la factura
            // no traía el dato, se deja vacío como antes en vez de un cero.
            const subtotal = formatearMoneda(
              typeof factura.subtotal === "number"
                ? ampliacionFactura.nuevoSubtotal
                : factura.subtotal,
            );
            const iva = formatearMoneda(
              typeof factura.iva === "number"
                ? ampliacionFactura.nuevoIva
                : factura.iva,
            );
            const deposito = formatearMoneda(factura.deposito);
            // La cuenta de la factura (total, cobrado, abonado y saldo) sale
            // toda de facturaUtils: es la misma que suma el resumen del
            // encabezado del cliente, así los dos lugares dicen lo mismo.
            //
            // El total y el saldo se muestran con los días ampliados ya
            // sumados, igual que el subtotal y el IVA de más arriba. Si no,
            // los renglones de la izquierda no cuadrarían con este total: el
            // guardado en la factura es de antes de la ampliación.
            const cuenta = calcularCuentaFactura(factura);
            const valorTotal = formatearMoneda(cuenta.total);
            const fecha = formatearFecha(factura.fecha);
            // Solo importa en móvil (en PC siempre se muestra todo).
            const mostrar = (seccion) =>
              !esMovil || seccionAbierta(factura.id, seccion);
            const renderToggle = (seccion) =>
              esMovil && (
                <IconButton
                  size="small"
                  onClick={() => toggleSeccion(factura.id, seccion)}
                  sx={{ color: acento }}
                >
                  {seccionAbierta(factura.id, seccion) ? (
                    <ExpandLessIcon fontSize="small" />
                  ) : (
                    <ExpandMoreIcon fontSize="small" />
                  )}
                </IconButton>
              );
            const fechaVencimiento = equiposSonObjetos
              ? null
              : formatearFecha(factura.fechaVencimiento) ||
                factura.fechaVencimientoRaw;

            // Equipos originales (creados con la factura) vs. agregados
            // después con el botón "Agregar equipo" — cada lote muestra su
            // propio pago.
            const equiposOriginales = equiposSonObjetos
              ? factura.equipos.filter(
                  (equipo) => !equipo.agregadoPosteriormente,
                )
              : [];
            const equiposAgregados = equiposSonObjetos
              ? factura.equipos.filter(
                  (equipo) => equipo.agregadoPosteriormente,
                )
              : [];
            // Misma regla que los lotes agregados: con un solo equipo el bloque
            // ocupa media grilla, con dos o más se va a todo el ancho. El "|| 1"
            // evita un repeat(0, 1fr) inválido cuando la lista viene vacía.
            const columnasOriginales = Math.min(
              equiposOriginales.length || 1,
              2,
            );
            const pagosOriginales = normalizarPagos(
              factura.pagos,
              factura.modoPago,
              factura.montoPagado,
            );

            // Depósito/transporte de TODA la factura = lo del lote original
            // (fijo, no crece) + lo que haya traído cada equipo agregado.
            const depositoAgregadosTotal = equiposAgregados.reduce(
              (total, equipo) => total + (Number(equipo.deposito) || 0),
              0,
            );
            const transporteAgregadosTotal = equiposAgregados.reduce(
              (total, equipo) => total + (Number(equipo.valorTransporte) || 0),
              0,
            );
            const depositoTotalFactura =
              (Number(factura.deposito) || 0) + depositoAgregadosTotal;
            const transporteTotalFactura =
              (Number(factura.valorTransporte) || 0) + transporteAgregadosTotal;

            // Lo cobrado al emitir la factura más lo de cada equipo agregado
            // después, y lo que el cliente fue abonando desde entonces. Si
            // pagó de más, el sobrante NO baja el saldo (que nunca es
            // negativo): sale aparte como saldo a favor.
            const totalPagadoFactura = cuenta.pagado;
            const totalAbonos = cuenta.abonos;
            const saldoPendienteNumero = cuenta.saldoPendiente;
            const saldoAFavorNumero = cuenta.saldoAFavor;
            const saldoPendiente = formatearMoneda(saldoPendienteNumero);
            const hayColorAlerta = saldoPendienteNumero > 0;

            // Adicionales del lote original: los de la factura, sin sumar
            // los de los equipos agregados (cada lote muestra los suyos).
            // El IVA de un grupo de equipos: cada uno respeta su propia
            // marca y suma también los días que se le ampliaron. Así el
            // recuadro de la factura muestra solo el IVA de sus equipos y
            // cada lote agregado el suyo, sin contarlo dos veces.
            const ivaDeEquipos = (lista) =>
              lista.reduce((total, equipo) => {
                const llevaIva = equipo.aplicaIva ?? Boolean(factura.aplicaIva);
                if (!llevaIva) return total;
                const base =
                  (Number(equipo.cantidad) || 0) *
                    (Number(equipo.dias) || 0) *
                    (Number(equipo.valor) || 0) +
                  calcularAmpliacionEquipo(equipo).neto;
                return total + base * 0.19;
              }, 0);

            const adicionalesFactura = equiposSonObjetos
              ? renderAdicionales({
                  key: "adicionales-factura",
                  iva: ivaDeEquipos(equiposOriginales),
                  color: colorAdicionales,
                  deposito: Number(factura.deposito) || 0,
                  transporteTipo,
                  transporteMonto: Number(factura.valorTransporte) || 0,
                })
              : null;

            const lotesAgregados = agruparLotesAgregados(equiposAgregados);

            // Se separan en dos grupos (izquierda: subtotal/iva, derecha:
            // depósito/transporte) para poder acomodarlos en 2 columnas
            // prolijas en móvil, en vez de dejarlos ajustar solos.
            const lineasTotalesIzq = [];
            const lineasTotalesDer = [];
            if (subtotal) {
              lineasTotalesIzq.push(
                <Typography key="subtotal" variant="body2">
                  Subtotal {subtotal}
                </Typography>,
              );
            }
            if (iva) {
              lineasTotalesIzq.push(
                <Typography key="iva" variant="body2">
                  IVA (19%) {iva}
                </Typography>,
              );
            }
            if (equiposSonObjetos) {
              if (depositoTotalFactura > 0) {
                lineasTotalesDer.push(
                  <Typography key="deposito" variant="body2">
                    Depósito {formatearMoneda(depositoTotalFactura)}
                  </Typography>,
                );
              }
              if (transporteTotalFactura > 0) {
                lineasTotalesDer.push(
                  <Typography key="transporte" variant="body2">
                    Transporte {formatearMoneda(transporteTotalFactura)}
                  </Typography>,
                );
              }
            } else {
              if (deposito) {
                lineasTotalesDer.push(
                  <Typography key="deposito" variant="body2">
                    Depósito {deposito}
                  </Typography>,
                );
              }
              if (transporteTipo || transporteMonto) {
                lineasTotalesDer.push(
                  <Typography key="transporte" variant="body2">
                    {transporteTipo === "Sin transporte"
                      ? "Sin transporte"
                      : ["Transporte", transporteTipo, transporteMonto]
                          .filter(Boolean)
                          .join(" ")}
                  </Typography>,
                );
              }
            }
            const lineasTotales = [...lineasTotalesIzq, ...lineasTotalesDer];

            // El estado no se toca a mano: sale de las fechas, de lo que se
            // devolvió y del saldo (ver calcularEstadoFactura). Para moverlo
            // hay que actuar sobre la factura —despachar, devolver, cobrar—,
            // no sobre la etiqueta.
            const chipEstado = (
              <Chip
                icon={facturaEstadoInfo.Icono ? <facturaEstadoInfo.Icono /> : undefined}
                label={facturaEstadoInfo.label}
                variant="estado"
                size="small"
                sx={{
                  bgcolor: facturaEstadoColor,
                  color: theme.palette.getContrastText(facturaEstadoColor),
                  "& .MuiChip-icon": { color: "inherit" },
                  // La variante "estado" trae un ancho fijo de 190px, pensado
                  // para una lista donde los chips se alinean en columna (ver
                  // ThemeProvider). Acá no hay esa columna, y 190px era lo que
                  // mandaba el chip a la línea de abajo aunque el título le
                  // dejara sitio de sobra. Sigue siendo el MISMO ancho para
                  // los cinco estados —no varía según el texto—, solo que más
                  // angosto: con los nombres nuevos, el más largo es
                  // "Finalizada", y 130px lo cubre con el ícono adelante.
                  width: 130,
                }}
              />
            );

            const iconosFactura = (
              <Stack
                direction="row"
                spacing={esMovil ? 1.5 : 0.75}
                alignItems="center"
              >
                {equiposSonObjetos && (
                  <Tooltip title="Agregar equipo">
                    <IconButton
                      size="small"
                      onClick={() => setFacturaAgregarEquipo(factura)}
                      sx={{ ...iconBtnSx, color: acento }}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {/* Para el cliente que devuelve antes de que se le venza el
                    alquiler: esa factura nunca entra a Seguimiento, así que
                    sin este botón no habría dónde anotar la devolución. */}
                {equiposSonObjetos && (
                  <Tooltip title="Registrar devolución">
                    <IconButton
                      size="small"
                      onClick={() => setFacturaDevolucion(factura)}
                      sx={{ ...iconBtnSx, color: acento }}
                    >
                      <AssignmentReturnIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Descargar PDF">
                  <IconButton
                    size="small"
                    onClick={() => generarFacturaPdf({ factura, cliente })}
                    sx={{ ...iconBtnSx, color: acento }}
                  >
                    <PictureAsPdfIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Editar factura">
                  <IconButton
                    size="small"
                    onClick={() => setFacturaEditando(factura)}
                    sx={{ ...iconBtnSx, color: acento }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Eliminar factura">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => setFacturaEliminando(factura)}
                    sx={iconBtnSx}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            );

            return (
              <Box
                key={factura.id}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  // El fondo de tarjeta sobre el fondo de la app ya alcanza
                  // para que se despegue: en modo noche es el azul acero sobre
                  // el azul noche.
                  bgcolor: "background.paper",
                  border: "1px solid",
                  borderColor: "custom.accent",
                  // Sin esto, la pizarra de totales estira la tarjeta más allá
                  // del ancho de la pantalla y aparece scroll horizontal.
                  minWidth: 0,
                  // Referencia para la flecha flotante de celular, más abajo.
                  position: "relative",
                }}
              >
                {/* En celular, con el título largo ("Factura N / Creada el..."),
                    el grupo chip+flecha no entra en la misma línea y se envolvía
                    entero a la línea de abajo pegado a la izquierda —la flecha
                    terminaba lejos de la esquina, donde nadie la busca. Sacarla
                    del grupo que se envuelve y clavarla en la esquina de la
                    tarjeta la deja siempre en el mismo lugar. En pantallas más
                    anchas no hace falta: ahí el título sí entra junto al chip. */}
                {esMovil && (
                  <Box sx={{ position: "absolute", top: 8, right: 8 }}>
                    <Tooltip
                      title={
                        facturaColapsada(factura.id)
                          ? "Mostrar factura"
                          : "Ocultar factura"
                      }
                    >
                      <IconButton
                        size="small"
                        onClick={() => toggleFacturaColapsada(factura.id)}
                        sx={{ ...iconBtnSx, color: acento }}
                      >
                        {facturaColapsada(factura.id) ? (
                          <ExpandMoreIcon fontSize="small" />
                        ) : (
                          <ExpandLessIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}

                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  flexWrap="wrap"
                  rowGap={1}
                  gap={1.5}
                  // En celular el hueco entre título y chip se achica a 8px:
                  // con el de 12px de siempre, "Pendiente despacho" no
                  // alcanzaba a compartir línea con el título por unos pocos
                  // píxeles y el chip se iba abajo aunque hubiera casi lugar.
                  columnGap={esMovil ? 1 : 1.5}
                  // Deja libre la esquina para la flecha flotante de arriba.
                  // El mínimo para no montarse con ella son 22px (medido en
                  // pantalla); unos pocos más de aire para que no quede
                  // pegado.
                  sx={esMovil ? { pr: 5 } : undefined}
                >
                  <Box>
                    <Typography fontWeight="bold">
                      Factura {factura.numeroFactura ?? "s/n"}
                    </Typography>
                    {/* Antes ocupaba una columna dentro del cuadro de pago. */}
                    {fecha && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", lineHeight: 1.3 }}
                      >
                        Creada el {fecha}
                      </Typography>
                    )}
                  </Box>
                  {/* Con la factura plegada, en computador, el resumen de la
                      cuenta ocupa el hueco que queda entre el titulo y los
                      botones. Va sobre la pizarra del tema, que tiene fondo
                      oscuro fijo en los dos modos. */}
                  {!isFullScreen &&
                    facturaColapsada(factura.id) &&
                    renderPizarraTotales(casillasDeCuenta(cuenta), {
                      // Entre 916 y 1200px el hueco que dejan el titulo, los
                      // cinco botones y el chip de estado (190px fijos) no
                      // pasa de unos 300px, y cuatro importes de siete cifras
                      // ahi se montan entre si. Asi que en ese tramo la
                      // tarjeta pasa a su propia fila, con todo el ancho; de
                      // 1200px en adelante si entra en el hueco.
                      flexGrow: 1,
                      flexBasis: { md: "100%", lg: 0 },
                      order: { md: 1, lg: 0 },
                    })}

                  <Stack direction="row" spacing={1} alignItems="center">
                    {!esMovil && iconosFactura}
                    {chipEstado}
                    {/* En celular la flecha ya va flotando en la esquina,
                        arriba; acá solo se repite para pantallas más anchas,
                        donde comparte línea con el chip sin problema. */}
                    {!esMovil && (
                      <Tooltip
                        title={
                          facturaColapsada(factura.id)
                            ? "Mostrar factura"
                            : "Ocultar factura"
                        }
                      >
                        <IconButton
                          size="small"
                          onClick={() => toggleFacturaColapsada(factura.id)}
                          sx={{ ...iconBtnSx, color: acento }}
                        >
                          {facturaColapsada(factura.id) ? (
                            <ExpandMoreIcon fontSize="small" />
                          ) : (
                            <ExpandLessIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </Stack>

                {/* Hasta 915px la pizarra completa no entra en el hueco del
                    encabezado, así que la factura plegada muestra debajo la
                    versión corta: al recorrer la lista lo que se busca es
                    cuánto es y cuánto falta, no editarla.

                    En celular los botones tienen su propio renglón —el mismo
                    que ocupa la pizarra— y vuelven al desplegar la factura; de
                    600px en adelante ya están arriba, en el encabezado. */}
                {isFullScreen &&
                  (facturaColapsada(factura.id) ? (
                    <Box sx={{ mt: 1 }}>
                      {renderPizarraTotales(
                        casillasDeCuenta(cuenta, { resumida: true }),
                      )}
                    </Box>
                  ) : (
                    esMovil && (
                      <Stack direction="row" alignItems="center" sx={{ mt: 1 }}>
                        {iconosFactura}
                      </Stack>
                    )
                  ))}

                {/* Todo lo que va debajo del encabezado se pliega con la
                    flecha de arriba, para poder recorrer varias facturas sin
                    scrollear cada una entera. */}
                {!facturaColapsada(factura.id) && (
                  <>
                {fechaVencimiento && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    Vencimiento: {fechaVencimiento}
                  </Typography>
                )}

                {equiposSonObjetos ? (
                  <>
                    {equiposOriginales.length > 0 && (
                      <Box
                        sx={{
                          mt: 1.5,
                          // El ancho se le pone al bloque ENTERO de la factura
                          // —información de pago, equipos y cargos adicionales—
                          // para que todo quede en la misma columna. Puesto más
                          // adentro, los rótulos y sus flechas de plegado se
                          // iban al extremo derecho de la pantalla mientras el
                          // contenido quedaba a media grilla.
                          width: {
                            sm:
                              columnasOriginales === 1
                                ? "calc(50% - 4px)"
                                : "100%",
                          },
                        }}
                      >
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Typography
                            variant="overline"
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                              lineHeight: 1.6,
                              color: colorPago,
                            }}
                          >
                            <PaymentsIcon fontSize="small" />
                            Información de pago
                          </Typography>
                          {renderToggle("pagoGeneral")}
                        </Stack>
                        {mostrar("pagoGeneral") &&
                          renderInfoPago({
                            key: "pago-original",
                            pagos: pagosOriginales,
                            tipoPago: factura.tipoPago,
                            fecha: factura.fecha,
                            colorEstado: colorPago,
                          })}

                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          sx={{ mt: 1 }}
                        >
                          <Typography
                            variant="overline"
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                              lineHeight: 1.6,
                              color: colorEquipos,
                            }}
                          >
                            <ConstructionIcon fontSize="small" />
                            Equipos {equiposOriginales.length}
                          </Typography>
                          {renderToggle("equiposFactura")}
                        </Stack>
                        {mostrar("equiposFactura") && (
                          <Box>
                            <Box
                              sx={{
                                display: "grid",
                                gridTemplateColumns: {
                                  xs: "1fr",
                                  sm: `repeat(${columnasOriginales}, 1fr)`,
                                },
                                gap: 1,
                                mt: 1,
                              }}
                            >
                              {equiposOriginales.map((equipo, index) =>
                                renderEquipoRow(equipo, `original-${index}`, colorEquipos),
                              )}
                            </Box>

                            {adicionalesFactura && (
                              <Box sx={{ mt: 1 }}>
                                <Typography
                                  variant="overline"
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                    lineHeight: 1.6,
                                    color: colorAdicionales,
                                  }}
                                >
                                  <AddCardIcon fontSize="small" />
                                  Cargos adicionales
                                </Typography>
                                <Box sx={{ mt: 0.5 }}>{adicionalesFactura}</Box>
                              </Box>
                            )}
                          </Box>
                        )}
                      </Box>
                    )}

                    {equiposAgregados.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Typography
                            variant="overline"
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                              lineHeight: 1.6,
                              color: colorEquiposAgregados,
                            }}
                          >
                            <LibraryAddIcon fontSize="small" />
                            Equipos agregados {equiposAgregados.length}
                          </Typography>
                          {renderToggle("equiposAgregados")}
                        </Stack>
                        {/* Cada lote —lo que se agregó de una sola vez— va
                            con sus equipos, después su pago y después sus
                            adicionales. */}
                        {mostrar("equiposAgregados") &&
                          lotesAgregados.map((lote, indiceLote) => {
                            const adicionalesLote = renderAdicionales({
                              key: `lote-adicionales-${indiceLote}`,
                              iva: ivaDeEquipos(lote.equipos),
                              color: colorAdicionales,
                              deposito: Number(lote.cabecera.deposito) || 0,
                              transporteTipo: lote.cabecera.transporte || null,
                              transporteMonto:
                                Number(lote.cabecera.valorTransporte) || 0,
                            });

                            // Cuántas columnas ocupa este lote: una sola si
                            // trae un equipo, dos si trae dos o más. El ancho
                            // se le pone al lote COMPLETO —no solo a la fila de
                            // equipos— para que su información de pago y sus
                            // cargos adicionales queden en la misma columna que
                            // el equipo. Sueltos se iban a todo lo ancho y el
                            // equipo quedaba a media pantalla con los datos
                            // desalineados debajo.
                            const columnasLote = Math.min(
                              lote.equipos.length,
                              2,
                            );

                            return (
                              <Box
                                key={`lote-${indiceLote}`}
                                sx={{
                                  mt: 1,
                                  // gap 1 = 8px, así que media pantalla es 50%
                                  // menos la mitad de esa separación.
                                  width: {
                                    sm:
                                      columnasLote === 1
                                        ? "calc(50% - 4px)"
                                        : "100%",
                                  },
                                  // Cada lote va en su propia tarjeta: sus
                                  // equipos, su pago y sus cargos son un
                                  // conjunto, y sueltos se confundían con los
                                  // del lote de al lado. El fondo de la app la
                                  // separa de los recuadros de adentro, que
                                  // son de color de tarjeta.
                                  p: 1.5,
                                  borderRadius: 2,
                                  bgcolor: "background.default",
                                  border: "1px solid",
                                  borderColor: alpha(colorEquiposAgregados, 0.4),
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "grid",
                                    gridTemplateColumns: {
                                      xs: "1fr",
                                      sm: `repeat(${columnasLote}, 1fr)`,
                                    },
                                    gap: 1,
                                  }}
                                >
                                  {lote.equipos.map((equipo, index) =>
                                    renderEquipoRow(
                                      equipo,
                                      `agregado-${indiceLote}-${index}`,
                                      colorEquiposAgregados,
                                    ),
                                  )}
                                </Box>

                                <Box sx={{ mt: 1 }}>
                                  <Typography
                                    variant="overline"
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 0.5,
                                      lineHeight: 1.6,
                                      color: colorPago,
                                    }}
                                  >
                                    <PaymentsIcon fontSize="small" />
                                    Información de pago
                                  </Typography>
                                  {renderInfoPago({
                                    key: `lote-pago-${indiceLote}`,
                                    pagos: normalizarPagos(
                                      lote.cabecera.pagos,
                                      lote.cabecera.modoPago,
                                      null,
                                    ),
                                    tipoPago: lote.cabecera.tipoPago,
                                    fecha: lote.cabecera.fechaAgregado,
                                    colorEstado: colorPago,
                                  })}
                                </Box>

                                {adicionalesLote && (
                                  <Box sx={{ mt: 1 }}>
                                    <Typography
                                      variant="overline"
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 0.5,
                                        lineHeight: 1.6,
                                        color: colorAdicionales,
                                      }}
                                    >
                                      <AddCardIcon fontSize="small" />
                                      Cargos adicionales
                                    </Typography>
                                    <Box sx={{ mt: 0.5 }}>
                                      {adicionalesLote}
                                    </Box>
                                  </Box>
                                )}
                              </Box>
                            );
                          })}
                      </Box>
                    )}

                    {/* Los abonos van al final de todo lo que se despachó:
                        después de los equipos agregados si los hay, y si no,
                        después de los equipos de la factura. */}
                    {(factura.abonos || []).length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Typography
                            variant="overline"
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                              lineHeight: 1.6,
                              color: colorAbonos,
                            }}
                          >
                            <SavingsIcon fontSize="small" />
                            Abonos
                          </Typography>
                          {renderToggle("abonos")}
                        </Stack>
                        {mostrar("abonos") && (
                          <Box sx={{ mt: 0.5 }}>
                            {renderAbonos(factura.abonos, colorAbonos)}
                          </Box>
                        )}
                      </Box>
                    )}
                  </>
                ) : (
                  factura.equipos?.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {factura.equipos.join(", ")}
                      </Typography>
                    </Box>
                  )
                )}

                {(lineasTotales.length > 0 || valorTotal) && (
                  <Box
                    sx={{
                      mt: 1.5,
                      pt: 1.5,
                      borderTop: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography
                        variant="overline"
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                          lineHeight: 1.6,
                          // Los dos cierres de la factura —el total y el
                          // estado de cuenta— van con el acento del tema, no
                          // con el color de un bloque: resumen todo lo de
                          // arriba, no una sección en particular.
                          color: "custom.accent",
                        }}
                      >
                        <ReceiptLongIcon fontSize="small" />
                        Total factura
                      </Typography>
                      {renderToggle("pagoTotal")}
                    </Stack>
                    {mostrar("pagoTotal") && (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: { xs: "column", sm: "row" },
                          flexWrap: { sm: "wrap" },
                          justifyContent: "space-between",
                          // Arriba, no al fondo: así el subtotal y el IVA
                          // quedan justo debajo del rótulo "Total factura" en
                          // vez de caer al pie del recuadro de estado de
                          // cuenta, que es más alto y dejaba un hueco.
                          alignItems: { xs: "stretch", sm: "flex-start" },
                          gap: 2,
                        }}
                      >
                        {esMovil ? (
                          <Box
                            sx={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              columnGap: 2,
                              rowGap: 0.5,
                            }}
                          >
                            <Stack spacing={0.5}>{lineasTotalesIzq}</Stack>
                            <Stack spacing={0.5}>{lineasTotalesDer}</Stack>
                          </Box>
                        ) : (
                          <Stack
                            direction="row"
                            spacing={2}
                            flexWrap="wrap"
                            alignItems="flex-end"
                          >
                            {lineasTotales}
                          </Stack>
                        )}

                        {/* La misma pizarra de totales que usa Seguimiento:
                            el aspecto y los colores salen del tema, así los
                            dos lugares se ven igual.

                            El rótulo y la pizarra van dentro de un mismo
                            bloque: sueltos eran dos elementos del contenedor
                            flex y cada ancho de pantalla los acomodaba en un
                            lugar distinto. */}
                        <Box
                          sx={{
                            width: { xs: "100%", sm: "auto" },
                            // Pegado a la derecha aunque baje de línea: cuando
                            // la factura tiene depósito y transporte, esa fila
                            // se llena y el recuadro pasa al renglón de abajo,
                            // donde quedaba solo y se iba a la izquierda.
                            ml: { sm: "auto" },
                          }}
                        >
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
                          <Paper
                            variant="totales"
                            sx={{
                              width: { xs: "100%", sm: "auto" },
                              minWidth: { sm: 240 },
                            }}
                          >
                            {valorTotal && (
                              <Box className="fila total">
                                <Typography
                                  variant="subtitle1"
                                  fontWeight="bold"
                                >
                                  Total factura
                                </Typography>
                                <Typography
                                  variant="subtitle1"
                                  fontWeight="bold"
                                >
                                  {valorTotal}
                                </Typography>
                              </Box>
                            )}
                            {/* Lo ya cobrado. Solo aparece cuando queda saldo
                              o cuando hubo abonos: con la factura saldada de
                              una sola vez sería repetir el total. */}
                            {(hayColorAlerta || totalAbonos > 0) && (
                              <Box className="fila pagado">
                                <Typography variant="body2">Pagado</Typography>
                                <Typography variant="body2">
                                  {formatearMoneda(totalPagadoFactura)}
                                </Typography>
                              </Box>
                            )}

                            {/* Solo el total de lo abonado: el detalle de cada
                              abono, con su fecha y su medio, va arriba en su
                              propia información de pago. */}
                            {totalAbonos > 0 && (
                              <Box className="fila abono">
                                <Typography variant="body2">Abonos</Typography>
                                <Typography variant="body2">
                                  {formatearMoneda(totalAbonos)}
                                </Typography>
                              </Box>
                            )}

                            {/* Si el cliente pagó de más, el sobrante queda a
                              su favor en vez de mostrarse como saldo. */}
                            {saldoAFavorNumero > 0 ? (
                              <Box className="fila ok" sx={{ mt: 1, mb: 0 }}>
                                <Typography variant="body2" fontWeight="bold">
                                  Saldo a favor
                                </Typography>
                                <Typography variant="body2" fontWeight="bold">
                                  {formatearMoneda(saldoAFavorNumero)}
                                </Typography>
                              </Box>
                            ) : (
                              <Box
                                className={
                                  hayColorAlerta ? "fila alerta" : "fila ok"
                                }
                                sx={{ mt: 1, mb: 0 }}
                              >
                                <Typography variant="body2" fontWeight="bold">
                                  Saldo pendiente
                                </Typography>
                                <Typography variant="body2" fontWeight="bold">
                                  {saldoPendiente}
                                </Typography>
                              </Box>
                            )}
                          </Paper>
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}
                  </>
                )}
              </Box>
            );
          })}
        </Stack>
      )}
      </Box>

      <ClienteFormDialog
        open={editarOpen}
        onClose={() => setEditarOpen(false)}
        onGuardado={fetchCliente}
        onEliminado={() => navigate("/vistaclientes")}
        cliente={cliente}
      />

      <FacturaFormDialog
        open={crearFacturaOpen}
        onClose={() => setCrearFacturaOpen(false)}
        cliente={cliente}
        onGuardado={() => fetchCliente(true)}
      />

      <ReporteFacturasDialog
        open={reporteOpen}
        onClose={() => setReporteOpen(false)}
        cliente={cliente}
        facturas={facturasParaReporte}
      />

      <FacturaFormDialog
        open={Boolean(facturaEditando)}
        onClose={() => setFacturaEditando(null)}
        cliente={cliente}
        factura={facturaEditando}
        onGuardado={() => fetchCliente(true)}
      />

      <AgregarEquipoDialog
        open={Boolean(facturaAgregarEquipo)}
        onClose={() => setFacturaAgregarEquipo(null)}
        cliente={cliente}
        factura={facturaAgregarEquipo}
        facturas={facturas}
        onAgregado={() => fetchCliente(true)}
      />

      <AbonoDialog
        open={abonoOpen}
        onClose={() => setAbonoOpen(false)}
        cliente={cliente}
        facturas={facturas}
        onAbonado={() => fetchCliente(true)}
      />

      <Dialog
        open={Boolean(facturaEliminando)}
        onClose={() => setFacturaEliminando(null)}
      >
        <DialogTitle sx={{ color: acento }}>Eliminar factura</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Seguro que querés eliminar la factura{" "}
            {facturaEliminando?.numeroFactura ?? "s/n"}? Esta acción no se puede
            deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", gap: 2, px: 3, pb: 3 }}>
          <Button
            onClick={() => setFacturaEliminando(null)}
            disabled={eliminando}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleEliminarFactura}
            disabled={eliminando}
          >
            {eliminando ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>

      <RegistrarDevolucionDialog
        open={Boolean(facturaDevolucion)}
        onClose={() => setFacturaDevolucion(null)}
        cliente={cliente}
        factura={facturaDevolucion}
        onActualizado={() => fetchCliente(true)}
      />

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Box>
  );
}
