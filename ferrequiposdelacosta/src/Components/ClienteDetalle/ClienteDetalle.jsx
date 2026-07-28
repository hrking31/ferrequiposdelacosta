import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { collection, deleteDoc, doc, getDoc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import ClienteFormDialog from "../ListaClientes/ClienteFormDialog";
import FacturaFormDialog from "./FacturaFormDialog";
import AgregarEquipoDialog from "./AgregarEquipoDialog";
import LoadingLogo from "../LoadingLogo/LoadingLogo";
import {
  normalizarPagos,
  obtenerHistorialVencimientos,
  diferenciaEnDias,
} from "./facturaUtils";

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
  total: "Pago total",
  parcial: "Parcial",
};

const CODIGOS_SIN_TELEFONO = ["SN", "NT", "N/A", ""];

const obtenerNombreCompleto = (cliente) => {
  if (!cliente) return "";
  if (cliente.tipo === "empresa") return cliente.razonSocial || cliente.nombreOriginal;
  return [cliente.nombres, cliente.apellido].filter(Boolean).join(" ") || cliente.nombreOriginal;
};

const tieneTelefonoValido = (telefono) =>
  telefono && !CODIGOS_SIN_TELEFONO.includes(String(telefono).trim().toUpperCase());

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
  const acento =
    theme.palette.custom.accent;
  // Mismo fondo neutro que ya usaba el cuadro de "Total": se reutiliza acá
  // para los renglones de equipo y de pago, así no compiten visualmente con
  // el fondo de color de la tarjeta de la factura.
  const panelBg = theme.palette.custom.panelBackground;
  const avatarBgPorEstado = {
    inactivo:
      theme.palette.mode === "light" ? theme.palette.grey[400] : theme.palette.grey[700],
    pendienteDespacho: theme.palette.custom.pendienteDespacho,
    despachada: theme.palette.success.main,
    devolucionParcial: theme.palette.info.main,
    finalizada: theme.palette.secondary.main,
  };
  const [cliente, setCliente] = useState(null);
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editarOpen, setEditarOpen] = useState(false);
  const [crearFacturaOpen, setCrearFacturaOpen] = useState(false);
  const [facturaAgregarEquipo, setFacturaAgregarEquipo] = useState(null);
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
      await deleteDoc(doc(db, "clientes", id, "facturas", facturaEliminando.id));
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

        const facturasSnap = await getDocs(collection(db, "clientes", id, "facturas"));
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

  // En móvil se dejan ovaladas (el look "pill" normal de un Chip). En PC se
  // ven más cuadradas y sobre el tono de superficie elevada del tema, que ya
  // cambia solo con el modo: casi blanco sobre la tarjeta clara, azul más
  // claro sobre la oscura. Antes llevaban un tinte amarillo fijo que no
  // acompañaba al modo.
  const pillBg = theme.palette.background.elevated;
  const formaChipSx = esMovil ? {} : { borderRadius: 1 };
  const metaPillSx = {
    height: 22,
    fontSize: "0.7rem",
    fontWeight: 600,
    borderColor: "divider",
    ...formaChipSx,
    ...(esMovil ? {} : { bgcolor: pillBg, border: "none" }),
  };

  // Tarjeta de un equipo dentro de una factura: cantidad/nombre/subtotal
  // arriba, días/precio/fechas como pills abajo. La misma tarjeta sirve para
  // un equipo original o uno agregado después.
  const renderEquipoRow = (equipo, key) => {
    const despacho = formatearFecha(equipo.fechaDespacho);
    const subtotalEquipo =
      (Number(equipo.cantidad) || 0) * (Number(equipo.dias) || 0) * (Number(equipo.valor) || 0);
    return (
      <Box
        key={key}
        sx={{
          p: 1,
          borderRadius: 1,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack direction="row" alignItems="center" gap={1}>
          <Chip
            variant={esMovil ? "outlined" : "filled"}
            label={equipo.cantidad}
            size="small"
            sx={{
              ...metaPillSx,
              fontWeight: "bold",
              flexShrink: 0,
              // Antes era amarillo fijo, que en modo claro quedaba casi
              // invisible sobre el chip. Es letra chica, así que va el acento
              // en su versión oscura.
              color: theme.palette.custom.accentSmall,
            }}
          />
          <Typography variant="body2" fontWeight="bold" sx={{ flex: 1, minWidth: 0 }}>
            {equipo.nombre}
          </Typography>
          {subtotalEquipo > 0 && (
            <Typography variant="body2" fontWeight="bold" sx={{ flexShrink: 0 }}>
              {formatearMoneda(subtotalEquipo)}
            </Typography>
          )}
        </Stack>
        {(() => {
          const chipsDiasValor = [
            <Chip
              key="dias"
              variant={esMovil ? "outlined" : "filled"}
              size="small"
              sx={metaPillSx}
              label={`${equipo.dias} día${Number(equipo.dias) === 1 ? "" : "s"}`}
            />,
          ];
          if (Number(equipo.valor) > 0) {
            chipsDiasValor.push(
              <Chip
                key="valor"
                variant={esMovil ? "outlined" : "filled"}
                size="small"
                sx={metaPillSx}
                label={`${formatearMoneda(Number(equipo.valor))}/día`}
              />,
            );
          }

          const chipsFechas = [];
          if (despacho) {
            chipsFechas.push(
              <Chip
                key="despacho"
                variant={esMovil ? "outlined" : "filled"}
                size="small"
                sx={metaPillSx}
                label={`Despacho ${despacho}`}
              />,
            );
          }
          if (equipo.vencimientoIndefinido) {
            chipsFechas.push(
              <Chip
                key="indefinida"
                variant={esMovil ? "outlined" : "filled"}
                size="small"
                sx={metaPillSx}
                label="Entrega indefinida — cliente debe avisar"
              />,
            );
          } else {
            if (equipo.fechaVencimientoOriginal) {
              chipsFechas.push(
                <Chip
                  key="vencido"
                  size="small"
                  color="error"
                  sx={{ height: 22, fontSize: "0.7rem", fontWeight: "bold", ...formaChipSx }}
                  label={`Vencido ${formatearFecha(equipo.fechaVencimientoOriginal)}`}
                />,
              );
            }
            if (equipo.fechaVencimiento) {
              chipsFechas.push(
                <Chip
                  key="devuelve"
                  variant={esMovil ? "outlined" : "filled"}
                  size="small"
                  sx={metaPillSx}
                  label={`Devuelve ${formatearFecha(equipo.fechaVencimiento)}`}
                />,
              );
            }

            // Si al equipo se le amplió el plazo, cuántos días se le sumaron y
            // cuánto representan a precio de este equipo. Solo aparece cuando
            // hubo ampliación.
            const historial = obtenerHistorialVencimientos(equipo);
            if (historial.length > 0) {
              const diasAgregados = diferenciaEnDias(
                historial[0],
                equipo.fechaVencimiento,
              );
              const valorPorDia =
                (Number(equipo.cantidad) || 0) * (Number(equipo.valor) || 0);

              if (diasAgregados > 0) {
                chipsFechas.push(
                  <Chip
                    key="agregados"
                    variant={esMovil ? "outlined" : "filled"}
                    size="small"
                    sx={{ ...metaPillSx, color: "custom.accentSmall" }}
                    label={`+${diasAgregados} día${diasAgregados === 1 ? "" : "s"}${
                      valorPorDia > 0
                        ? ` · ${formatearMoneda(diasAgregados * valorPorDia)}`
                        : ""
                    }`}
                  />,
                );
              }
            }
          }

          // En móvil, días/precio en una columna y fechas en otra (prolijo).
          // En PC, todos los chips sueltos en una sola fila, como estaba.
          return esMovil ? (
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 1, rowGap: 0.5, mt: 0.75 }}>
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

  // Cuadro de pago de un lote de equipos (el original de la factura, o cada
  // equipo agregado después): tipo de pago, medio(s) de pago, depósito y
  // transporte de ESE lote puntual — no de toda la factura.
  const renderInfoPago = ({
    pagos,
    tipoPago,
    deposito,
    transporteTipo,
    transporteMonto,
    fechaCreacion,
    key,
  }) => {
    const tipoPagoLabel = TIPO_PAGO_LABELS[tipoPago] || null;
    const hayTransporte = transporteTipo && transporteTipo !== "Sin transporte";
    // El transporte siempre se muestra (aunque sea "Sin transporte"), por
    // eso este cuadro ya no se oculta nunca.

    const etiqueta = (texto) => (
      <Typography
        component="span"
        sx={{
          fontSize: "0.65rem",
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "text.secondary",
          mr: 0.5,
        }}
      >
        {texto}
      </Typography>
    );

    // El valor va en negrita y con el color normal del texto (no el gris
    // apagado que hereda por default un <Typography variant="caption">).
    const valor = (texto) => (
      <Typography component="span" variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
        {texto}
      </Typography>
    );

    return (
      <Box
        key={key}
        sx={{
          p: 1,
          borderRadius: 1,
          border: "1px dashed",
          borderColor: "divider",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          flexWrap="wrap"
          columnGap={2}
          rowGap={{ xs: 0.6, sm: 0.4 }}
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          {tipoPagoLabel && (
            <Box>
              {etiqueta("Pago")} {valor(tipoPagoLabel)}
            </Box>
          )}
          {pagos.length > 0 && (
            <Box>
              {etiqueta("Medio")}{" "}
              {valor(pagos.map((pago) => pago.medio).filter(Boolean).join(" + "))}
            </Box>
          )}
          {pagos.length > 0 && (
            <Box>
              {etiqueta("Valor")}{" "}
              {valor(
                pagos.map((pago) => formatearMoneda(Number(pago.monto))).filter(Boolean).join(" + "),
              )}
            </Box>
          )}
          {deposito > 0 && (
            <Box>
              {etiqueta("Depósito")} {valor(formatearMoneda(deposito))}
            </Box>
          )}
          <Box>
            {etiqueta("Transporte")}{" "}
            {valor(
              hayTransporte
                ? `${transporteTipo}${transporteMonto > 0 ? ` · ${formatearMoneda(transporteMonto)}` : ""}`
                : "Sin transporte",
            )}
          </Box>
          {fechaCreacion && (
            <Box sx={{ ml: { xs: 0, sm: "auto" } }}>
              {etiqueta("Fecha creación")} {valor(fechaCreacion)}
            </Box>
          )}
        </Stack>
      </Box>
    );
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
  const estadoInfo = ESTADO_CLIENTE_INFO[cliente.estado] || ESTADO_CLIENTE_INFO.inactivo;
  const estadoColor = avatarBgPorEstado[cliente.estado] || avatarBgPorEstado.inactivo;
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
              bgcolor: avatarBgPorEstado[cliente.estado] || avatarBgPorEstado.inactivo,
            }}
          >
            {cliente.tipo === "empresa" ? (
              <BusinessIcon sx={{ fontSize: 28 }} />
            ) : (
              <PersonIcon sx={{ fontSize: 28 }} />
            )}
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              {nombreCompleto}
            </Typography>
            <Chip
              label={estadoInfo.label}
              size="small"
              sx={{
                fontWeight: "bold",
                textTransform: "uppercase",
                mt: 0.5,
                width: 190,
                fontSize: "0.7rem",
                justifyContent: "center",
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
        <Typography variant="h6" fontWeight="bold">
          Facturas {facturas.length}
        </Typography>

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
              (factura.estado ? { label: factura.estado } : { label: "Sin estado" });
            const facturaEstadoColor =
              avatarBgPorEstado[factura.estado] ||
              (theme.palette.mode === "light" ? theme.palette.grey[400] : theme.palette.grey[700]);
            // Formato viejo (migrado del Excel): transporte es un número.
            // Formato nuevo (creado en la app): transporte es el tipo
            // (ej. "Solo ida") y el monto vive aparte en valorTransporte.
            const equiposSonObjetos =
              factura.equipos?.length > 0 && typeof factura.equipos[0] === "object";
            const transporteMonto = formatearMoneda(
              typeof factura.transporte === "number"
                ? factura.transporte
                : factura.valorTransporte,
            );
            const transporteTipo =
              typeof factura.transporte === "string" ? factura.transporte : null;
            const subtotal = formatearMoneda(factura.subtotal);
            const iva = formatearMoneda(factura.iva);
            const deposito = formatearMoneda(factura.deposito);
            const valorTotal = formatearMoneda(factura.valorTotal);
            const saldoPendiente = formatearMoneda(factura.saldoPendiente ?? 0);
            const hayColorAlerta = (factura.saldoPendiente ?? 0) > 0;
            const fecha = formatearFecha(factura.fecha);
            // Solo importa en móvil (en PC siempre se muestra todo).
            const mostrar = (seccion) => !esMovil || seccionAbierta(factura.id, seccion);
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
              : formatearFecha(factura.fechaVencimiento) || factura.fechaVencimientoRaw;

            // Equipos originales (creados con la factura) vs. agregados
            // después con el botón "Agregar equipo" — cada lote muestra su
            // propio pago.
            const equiposOriginales = equiposSonObjetos
              ? factura.equipos.filter((equipo) => !equipo.agregadoPosteriormente)
              : [];
            const equiposAgregados = equiposSonObjetos
              ? factura.equipos.filter((equipo) => equipo.agregadoPosteriormente)
              : [];
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
            const depositoTotalFactura = (Number(factura.deposito) || 0) + depositoAgregadosTotal;
            const transporteTotalFactura =
              (Number(factura.valorTransporte) || 0) + transporteAgregadosTotal;

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
                      : ["Transporte", transporteTipo, transporteMonto].filter(Boolean).join(" ")}
                  </Typography>,
                );
              }
            }
            const lineasTotales = [...lineasTotalesIzq, ...lineasTotalesDer];

            const chipEstado = (
              <Chip
                label={facturaEstadoInfo.label}
                size="small"
                onClick={(e) => handleAbrirMenuEstado(e, factura.id)}
                sx={{
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  width: 190,
                  fontSize: "0.7rem",
                  justifyContent: "center",
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
              <Stack direction="row" spacing={esMovil ? 1.5 : 0.75} alignItems="center">
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
                <Tooltip title="Editar factura">
                  <IconButton
                    size="small"
                    onClick={() => setFacturaEditando(factura)}
                    sx={iconBtnSx}
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
                  bgcolor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" rowGap={1}>
                  <Typography fontWeight="bold">
                    Factura {factura.numeroFactura ?? "s/n"}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {!esMovil && iconosFactura}
                    {chipEstado}
                  </Stack>
                </Stack>

                {esMovil && (
                  <Stack direction="row" alignItems="center" sx={{ mt: 1 }}>
                    {iconosFactura}
                  </Stack>
                )}

                {fechaVencimiento && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Vencimiento: {fechaVencimiento}
                  </Typography>
                )}

                {equiposSonObjetos ? (
                  <>
                    {equiposOriginales.length > 0 && (
                      <Box sx={{ mt: 1.5 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                            Información de pago
                          </Typography>
                          {renderToggle("pagoGeneral")}
                        </Stack>
                        {mostrar("pagoGeneral") &&
                          renderInfoPago({
                            key: "pago-original",
                            pagos: pagosOriginales,
                            tipoPago: factura.tipoPago,
                            deposito: Number(factura.deposito) || 0,
                            transporteTipo,
                            transporteMonto: Number(factura.valorTransporte) || 0,
                            fechaCreacion: fecha,
                          })}

                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          sx={{ mt: 1 }}
                        >
                          <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                            Equipos {equiposOriginales.length}
                          </Typography>
                          {renderToggle("equiposFactura")}
                        </Stack>
                        {mostrar("equiposFactura") && (
                          <Box
                            sx={{
                              display: "grid",
                              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                              gap: 1,
                              mt: 1,
                            }}
                          >
                            {equiposOriginales.map((equipo, index) =>
                              renderEquipoRow(equipo, `original-${index}`),
                            )}
                          </Box>
                        )}
                      </Box>
                    )}

                    {equiposAgregados.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography
                            variant="overline"
                            color="text.secondary"
                            sx={{ lineHeight: 1.6 }}
                          >
                            Equipos agregados {equiposAgregados.length}
                          </Typography>
                          {renderToggle("equiposAgregados")}
                        </Stack>
                        {mostrar("equiposAgregados") && (
                          <Box
                            sx={{
                              display: "grid",
                              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                              gap: 1,
                              mt: 1,
                            }}
                          >
                            {equiposAgregados.map((equipo, index) => (
                              <Stack key={`agregado-${index}`} spacing={0.5}>
                                {renderEquipoRow(equipo, `agregado-row-${index}`)}
                                {renderInfoPago({
                                  key: `agregado-pago-${index}`,
                                  pagos: normalizarPagos(equipo.pagos, equipo.modoPago, null),
                                  tipoPago: equipo.tipoPago,
                                  deposito: Number(equipo.deposito) || 0,
                                  transporteTipo: equipo.transporte || null,
                                  transporteMonto: Number(equipo.valorTransporte) || 0,
                                })}
                              </Stack>
                            ))}
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
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.6 }}>
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
                          alignItems: { xs: "stretch", sm: "flex-end" },
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
                          <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="flex-end">
                            {lineasTotales}
                          </Stack>
                        )}

                        <Box
                          sx={{
                            px: 1.5,
                            py: 1,
                            borderRadius: 2,
                            boxShadow: (theme) => theme.palette.custom.panelShadow,
                            bgcolor: panelBg,
                            width: { xs: "100%", sm: "auto" },
                          }}
                        >
                          {valorTotal && (
                            <Typography
                              variant="subtitle1"
                              fontWeight="bold"
                              sx={{ color: "custom.totalText" }}
                            >
                              Total {valorTotal}
                            </Typography>
                          )}
                          <Typography
                            variant="body2"
                            fontWeight="bold"
                            sx={{ color: hayColorAlerta ? "warning.main" : "text.secondary" }}
                          >
                            Saldo pendiente {saldoPendiente}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </Box>
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

      <Dialog open={Boolean(facturaEliminando)} onClose={() => setFacturaEliminando(null)}>
        <DialogTitle sx={{ color: acento }}>Eliminar factura</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Seguro que querés eliminar la factura{" "}
            {facturaEliminando?.numeroFactura ?? "s/n"}? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", gap: 2, px: 3, pb: 3 }}>
          <Button onClick={() => setFacturaEliminando(null)} disabled={eliminando}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleEliminarFactura} disabled={eliminando}>
            {eliminando ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Menu
        anchorEl={menuEstadoAnchor}
        open={Boolean(menuEstadoAnchor)}
        onClose={handleCerrarMenuEstado}
      >
        <MenuItem onClick={() => handleCambiarEstadoFactura("pendienteDespacho")}>
          Pendiente despacho
        </MenuItem>
        <MenuItem onClick={() => handleCambiarEstadoFactura("despachada")}>
          Despachada
        </MenuItem>
        <MenuItem onClick={() => handleCambiarEstadoFactura("devolucionParcial")}>
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
