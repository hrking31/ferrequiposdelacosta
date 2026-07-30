import { Fragment, useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { alpha } from "@mui/material/styles";
import {
  Avatar,
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
  Menu,
  MenuItem,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import PlaceIcon from "@mui/icons-material/Place";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
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
  writeBatch,
} from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import ClienteFormDialog from "../ListaClientes/ClienteFormDialog";
import FacturaFormDialog from "./FacturaFormDialog";
import AgregarEquipoDialog from "./AgregarEquipoDialog";
import AbonoDialog from "./AbonoDialog";
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
  sumarAbonos,
} from "./facturaUtils";

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

// El estado del cliente es el mismo vocabulario que el de sus facturas
// (el cliente toma el estado de la factura que se le crea/edita), más
// "inactivo" para cuando todavía no tiene ninguna factura.
const ESTADO_CLIENTE_INFO = {
  inactivo: { label: "Inactivo" },
  pendienteDespacho: { label: "Pendiente despacho" },
  despachada: { label: "Despachada" },
  devolucionParcial: { label: "Devolución parcial" },
  finalizada: { label: "Finalizada" },
};

// Ciclo de vida de una factura creada desde la app:
// pendienteDespacho (se facturó, equipos aún no entregados)
//   -> despachada (todos los equipos entregados al cliente)
//   -> devolucionParcial (devolvió algunos equipos, se quedó con otros)
//   -> finalizada (devolvió todo, no queda nada pendiente)
// El color de cada estado sale de avatarBgPorEstado (color propio, no del
// prop `color` de MUI) para no repetir colores ya usados en otros botones.
const ESTADO_FACTURA_INFO = {
  pendienteDespacho: { label: "Pendiente despacho" },
  despachada: { label: "Despachada" },
  devolucionParcial: { label: "Devolución parcial" },
  finalizada: { label: "Finalizada" },
};

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

const formatearMoneda = (valor) =>
  typeof valor === "number"
    ? valor.toLocaleString("es-CO", { style: "currency", currency: "COP" })
    : null;


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
  const [facturaAgregarEquipo, setFacturaAgregarEquipo] = useState(null);
  const [facturaAbonando, setFacturaAbonando] = useState(null);
  const [facturaEditando, setFacturaEditando] = useState(null);
  const [facturaEliminando, setFacturaEliminando] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [menuEstadoAnchor, setMenuEstadoAnchor] = useState(null);
  const [facturaMenuId, setFacturaMenuId] = useState(null);
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

  const handleAbrirMenuEstado = (event, facturaId) => {
    setMenuEstadoAnchor(event.currentTarget);
    setFacturaMenuId(facturaId);
  };

  const handleCerrarMenuEstado = () => {
    setMenuEstadoAnchor(null);
    setFacturaMenuId(null);
  };

  const handleCambiarEstadoFactura = async (nuevoEstado) => {
    const facturaId = facturaMenuId;
    handleCerrarMenuEstado();
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "clientes", id, "facturas", facturaId), {
        estado: nuevoEstado,
      });
      batch.update(doc(db, "clientes", id), {
        estado: nuevoEstado,
      });
      await batch.commit();
      await fetchCliente(true);
      showSnackbar("Estado de la factura actualizado.", "success");
    } catch (error) {
      showSnackbar(`Error al actualizar el estado: ${error.message}`, "error");
    }
  };

  // silencioso=true evita el spinner de pantalla completa: se usa para
  // refrescar datos después de una edición puntual (crear factura, cambiar
  // estado) sin desmontar toda la vista y perder el scroll.
  const fetchCliente = useCallback(
    async (silencioso = false) => {
      try {
        if (!silencioso) setLoading(true);
        const clienteSnap = await getDoc(doc(db, "clientes", id));
        if (!clienteSnap.exists()) {
          setNotFound(true);
          return;
        }
        setCliente({ id: clienteSnap.id, ...clienteSnap.data() });

        const facturasSnap = await getDocs(
          collection(db, "clientes", id, "facturas"),
        );
        const listaFacturas = facturasSnap.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
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
          if (!equipo.vencimientoIndefinido && equipo.fechaVencimiento) {
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
            </Box>
          );
        })}
      </Stack>
    );

    return renderRecuadroBloque(colorEstado, renglones);
  };

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

  return (
    <Box sx={{ width: "100%" }}>
      {isFullScreen && (
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/vistaclientes")}
          sx={{ mb: 2, color: acento }}
        >
          Volver a Clientes
        </Button>
      )}

      <Box
        sx={{
          p: 3,
          borderRadius: 3,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: 1,
          mb: 3,
          position: "relative",
        }}
      >
        <IconButton
          onClick={() => setEditarOpen(true)}
          sx={{ position: "absolute", top: 8, right: 8, color: acento }}
        >
          <EditIcon />
        </IconButton>

        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor:
                avatarBgPorEstado[cliente.estado] || avatarBgPorEstado.inactivo,
            }}
          >
            {cliente.tipo === "empresa" ? (
              <BusinessIcon sx={{ fontSize: 28 }} />
            ) : (
              <PersonIcon sx={{ fontSize: 28 }} />
            )}
          </Avatar>
          <Box>
            <Typography variant="h6">{nombreCompleto}</Typography>
            <Chip
              label={estadoInfo.label}
              variant="estado"
              size="small"
              sx={{
                mt: 0.5,
                bgcolor: estadoColor,
                color: theme.palette.getContrastText(estadoColor),
              }}
            />
          </Box>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack spacing={1}>
          {telefonoValido ? (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <PhoneIcon sx={{ fontSize: 18, color: "text.secondary" }} />
              <Typography variant="body2">{cliente.telefono}</Typography>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Sin teléfono registrado
            </Typography>
          )}

          {cliente.direccion && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <PlaceIcon sx={{ fontSize: 18, color: "text.secondary" }} />
              <Typography variant="body2">{cliente.direccion}</Typography>
            </Stack>
          )}
        </Stack>
      </Box>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Typography variant="h6">Facturas {facturas.length}</Typography>

        <Button
          startIcon={<ReceiptLongIcon />}
          onClick={() => setCrearFacturaOpen(true)}
          sx={{ color: acento, flexShrink: 0 }}
        >
          Crear Factura
        </Button>
      </Stack>

      {facturas.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Este cliente no tiene facturas registradas.
        </Typography>
      ) : (
        <Stack spacing={2}>
          {facturas.map((factura) => {
            const facturaEstadoInfo =
              ESTADO_FACTURA_INFO[factura.estado] ||
              (factura.estado
                ? { label: factura.estado }
                : { label: "Sin estado" });
            const facturaEstadoColor =
              avatarBgPorEstado[factura.estado] ||
              (theme.palette.mode === "light"
                ? theme.palette.grey[400]
                : theme.palette.grey[700]);
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
            // El total y el saldo se muestran con los días ampliados ya
            // sumados, igual que el subtotal y el IVA de más arriba. Si no,
            // los renglones de la izquierda no cuadrarían con este total: el
            // guardado en la factura es de antes de la ampliación.
            const totalFacturaNumero = ampliacionFactura.hay
              ? ampliacionFactura.nuevoTotal
              : Number(factura.valorTotal) || 0;
            const valorTotal = formatearMoneda(totalFacturaNumero);
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

            // Lo cobrado hasta ahora: el pago inicial más el de cada equipo
            // que se agregó después.
            const totalPagadoFactura =
              pagosOriginales.reduce(
                (total, pago) => total + (Number(pago.monto) || 0),
                0,
              ) +
              equiposAgregados.reduce(
                (total, equipo) =>
                  total +
                  normalizarPagos(equipo.pagos, equipo.modoPago, null).reduce(
                    (suma, pago) => suma + (Number(pago.monto) || 0),
                    0,
                  ),
                0,
              );

            // Lo que el cliente fue abonando después de emitida la factura.
            const totalAbonos = sumarAbonos(factura.abonos);
            const totalRecibido = totalPagadoFactura + totalAbonos;
            // Si pagó de más, el sobrante NO baja el saldo (que nunca es
            // negativo): sale aparte como saldo a favor.
            const saldoPendienteNumero = Math.max(
              0,
              totalFacturaNumero - totalRecibido,
            );
            const saldoAFavorNumero = Math.max(
              0,
              totalRecibido - totalFacturaNumero,
            );
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

            const chipEstado = (
              <Chip
                label={facturaEstadoInfo.label}
                variant="estado"
                size="small"
                onClick={(e) => handleAbrirMenuEstado(e, factura.id)}
                sx={{
                  cursor: "pointer",
                  bgcolor: facturaEstadoColor,
                  color: theme.palette.getContrastText(facturaEstadoColor),
                }}
              />
            );

            const iconBtnSx = {
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              p: 0.5,
            };

            const iconosFactura = (
              <Stack
                direction="row"
                spacing={esMovil ? 1.5 : 0.75}
                alignItems="center"
              >
                {/* Registrar un pago posterior. Queda a la vista siempre, pero
                    bloqueado cuando no hay nada que cobrar. El span es porque
                    un boton deshabilitado no emite eventos y sin el el globo
                    de ayuda no aparece. */}
                <Tooltip
                  title={
                    hayColorAlerta
                      ? "Registrar abono"
                      : "La factura no tiene saldo pendiente"
                  }
                >
                  <span>
                    <IconButton
                      size="small"
                      disabled={!hayColorAlerta}
                      onClick={() => setFacturaAbonando(factura)}
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
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  flexWrap="wrap"
                  rowGap={1}
                  gap={1.5}
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
                  {!isFullScreen && facturaColapsada(factura.id) && (
                    <Paper
                      variant="totales"
                      sx={{
                        // Entre 916 y 1200px el hueco que dejan el titulo, los
                        // cinco botones y el chip de estado (190px fijos) no
                        // pasa de unos 300px, y cuatro importes de siete cifras
                        // ahi se montan entre si. Asi que en ese tramo la
                        // tarjeta pasa a su propia fila, con todo el ancho; de
                        // 1200px en adelante si entra en el hueco.
                        flexGrow: 1,
                        flexBasis: { md: "100%", lg: 0 },
                        order: { md: 1, lg: 0 },
                        minWidth: 0,
                        py: 1.25,
                        px: 1.5,
                        mt: 0,
                        // Reemplaza la sombra difusa de la variante por el
                        // relieve: luz arriba, sombra abajo.
                        boxShadow: (theme) => theme.palette.custom.panelRelieve,
                      }}
                    >
                      <Stack
                        direction="row"
                        sx={{ minWidth: 0 }}
                        // El divisor lleva margen arriba y abajo para no llegar
                        // a los bordes de la tarjeta.
                        divider={
                          <Divider
                            orientation="vertical"
                            flexItem
                            sx={{
                              my: 0.5,
                              borderColor: "custom.panelText",
                              opacity: 0.25,
                            }}
                          />
                        }
                      >
                        {[
                          {
                            clave: "total",
                            Icono: ReceiptLongIcon,
                            rotulo: "Total",
                            valor: valorTotal,
                            color: "custom.totalText",
                          },
                          {
                            clave: "pagado",
                            Icono: PaymentsIcon,
                            rotulo: "Pagado",
                            valor: formatearMoneda(totalPagadoFactura),
                            color: "success.light",
                          },
                          {
                            clave: "abonos",
                            Icono: SavingsIcon,
                            rotulo: "Abonos",
                            valor: formatearMoneda(totalAbonos),
                            color: "info.light",
                          },
                          {
                            clave: "saldo",
                            Icono: PendingActionsIcon,
                            rotulo: saldoAFavorNumero > 0 ? "A favor" : "Saldo",
                            valor:
                              saldoAFavorNumero > 0
                                ? formatearMoneda(saldoAFavorNumero)
                                : saldoPendiente,
                            color:
                              saldoAFavorNumero > 0
                                ? "success.light"
                                : "error.light",
                          },
                        ].map(({ clave, Icono, rotulo, valor, color }) => (
                          <Box
                            key={clave}
                            sx={{
                              // Las cuatro casillas miden lo mismo.
                              flex: 1,
                              minWidth: 0,
                              color,
                              px: 0.75,
                            }}
                          >
                            {/* El icono queda a la izquierda, alineado con el
                                rotulo; como es mas alto que las dos lineas,
                                ocupa el espacio que sobra abajo. El rotulo y el
                                valor arrancan en el mismo punto. */}
                            <Stack
                              direction="row"
                              alignItems="flex-start"
                              gap={0.75}
                              sx={{ minWidth: 0 }}
                            >
                              <Icono
                                fontSize="small"
                                sx={{ flexShrink: 0 }}
                              />
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="rotuloDato">
                                  {rotulo}
                                </Typography>
                                {/* Un valor de siete cifras no entra en un
                                    cuarto del hueco y se montaba sobre el de al
                                    lado: achica en pantallas medianas. Estas
                                    son las cifras principales de la cuenta, un
                                    punto más grandes que las de un recuadro. */}
                                <Typography
                                  variant="valorDato"
                                  sx={{
                                    whiteSpace: "nowrap",
                                    fontSize: { lg: "1rem" },
                                  }}
                                >
                                  {valor}
                                </Typography>
                              </Box>
                            </Stack>
                          </Box>
                        ))}
                      </Stack>
                    </Paper>
                  )}

                  <Stack direction="row" spacing={1} alignItems="center">
                    {!esMovil && iconosFactura}
                    {chipEstado}
                    {/* Pliega la factura completa, dejando a la vista solo el
                        encabezado. Visible siempre, no solo en celular. */}
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
                  </Stack>
                </Stack>

                {esMovil && (
                  <Stack direction="row" alignItems="center" sx={{ mt: 1 }}>
                    {iconosFactura}
                  </Stack>
                )}

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
        onAgregado={() => fetchCliente(true)}
      />

      <AbonoDialog
        open={Boolean(facturaAbonando)}
        onClose={() => setFacturaAbonando(null)}
        cliente={cliente}
        factura={facturaAbonando}
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
            variant="danger"
            onClick={handleEliminarFactura}
            disabled={eliminando}
          >
            {eliminando ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Menu
        anchorEl={menuEstadoAnchor}
        open={Boolean(menuEstadoAnchor)}
        onClose={handleCerrarMenuEstado}
      >
        <MenuItem
          onClick={() => handleCambiarEstadoFactura("pendienteDespacho")}
        >
          Pendiente despacho
        </MenuItem>
        <MenuItem onClick={() => handleCambiarEstadoFactura("despachada")}>
          Despachada
        </MenuItem>
        <MenuItem
          onClick={() => handleCambiarEstadoFactura("devolucionParcial")}
        >
          Devolución parcial
        </MenuItem>
        <MenuItem onClick={() => handleCambiarEstadoFactura("finalizada")}>
          Finalizada
        </MenuItem>
      </Menu>

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Box>
  );
}
