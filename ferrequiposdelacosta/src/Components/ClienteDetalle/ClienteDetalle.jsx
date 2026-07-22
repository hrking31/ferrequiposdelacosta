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
    theme.palette.mode === "light"
      ? theme.palette.primary.main
      : theme.palette.secondary.light;
  const avatarBgPorEstado = {
    inactivo:
      theme.palette.mode === "light" ? theme.palette.grey[400] : theme.palette.grey[700],
    // Color propio (no reutiliza warning/secondary: esos ya se usan para
    // montones de botones/íconos/fondos del tema, sobre todo en modo oscuro).
    pendienteDespacho: "#7E57C2",
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
  const [facturasAbiertas, setFacturasAbiertas] = useState({});
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

  const toggleFacturaAbierta = (facturaId) =>
    setFacturasAbiertas((prev) => ({ ...prev, [facturaId]: !prev[facturaId] }));

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
          Historial de Facturas {facturas.length}
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
            const montoPagado = formatearMoneda(factura.montoPagado ?? 0);
            const tipoPagoLabel = TIPO_PAGO_LABELS[factura.tipoPago] || null;
            const fecha = formatearFecha(factura.fecha);
            const abierta = Boolean(facturasAbiertas[factura.id]);
            const fechaVencimiento = equiposSonObjetos
              ? null
              : formatearFecha(factura.fechaVencimiento) || factura.fechaVencimientoRaw;

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

            const iconosFactura = (
              <Stack direction="row" spacing={esMovil ? 3 : 0.5} alignItems="center">
                <Tooltip title="Editar factura">
                  <IconButton
                    size="small"
                    onClick={() => setFacturaEditando(factura)}
                    sx={{ p: 0.25 }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Eliminar factura">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => setFacturaEliminando(factura)}
                    sx={{ p: 0.25 }}
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
                <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
                  <Typography fontWeight="bold">
                    Factura {factura.numeroFactura ?? "s/n"}
                  </Typography>
                  <Stack direction="row" spacing={4} alignItems="center">
                    {!esMovil && iconosFactura}
                    {chipEstado}
                  </Stack>
                </Stack>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mt: 1 }}
                >
                  {tipoPagoLabel && (
                    <Typography variant="body2" color="text.secondary">
                      {tipoPagoLabel}: {montoPagado}
                    </Typography>
                  )}
                  {esMovil && iconosFactura}
                </Stack>

                {fecha && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Fecha despacho: {fecha}
                  </Typography>
                )}

                {fechaVencimiento && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Vencimiento: {fechaVencimiento}
                  </Typography>
                )}

                {factura.equipos?.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    {equiposSonObjetos ? (
                      <Stack spacing={0.5}>
                        {factura.equipos.map((equipo, index) => (
                          <Stack
                            key={`${equipo.nombre}-${index}`}
                            direction="row"
                            flexWrap="wrap"
                            alignItems="baseline"
                            columnGap={2}
                            rowGap={0}
                          >
                            <Typography variant="body2">
                              <strong>
                                {equipo.cantidad} {equipo.nombre}
                              </strong>{" "}
                              x {equipo.dias} día{Number(equipo.dias) === 1 ? "" : "s"}
                            </Typography>
                            {equipo.fechaDespacho && (
                              <Typography variant="body2" color="text.secondary">
                                Despacho: {formatearFecha(equipo.fechaDespacho)}
                              </Typography>
                            )}
                            {equipo.vencimientoIndefinido ? (
                              <Typography variant="body2" color="text.secondary">
                                Entrega indefinida — cliente debe avisar
                              </Typography>
                            ) : (
                              <>
                                {equipo.fechaVencimientoOriginal && (
                                  <Typography
                                    variant="body2"
                                    sx={{ color: "error.main", fontWeight: "bold" }}
                                  >
                                    Vencido: {formatearFecha(equipo.fechaVencimientoOriginal)}
                                  </Typography>
                                )}
                                {equipo.fechaVencimiento && (
                                  <Typography variant="body2" sx={{ color: "secondary.light" }}>
                                    Devolución: {formatearFecha(equipo.fechaVencimiento)}
                                  </Typography>
                                )}
                              </>
                            )}
                          </Stack>
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {factura.equipos.join(", ")}
                      </Typography>
                    )}
                  </Box>
                )}

                {equiposSonObjetos && !esMovil && (
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setFacturaAgregarEquipo(factura)}
                    sx={{ mt: 0.5, mb: -1, color: acento }}
                  >
                    Agregar equipo
                  </Button>
                )}

                {(subtotal || iva || transporteTipo || transporteMonto || deposito || valorTotal) &&
                  (esMovil ? (
                    <Box sx={{ mt: 1 }}>
                      <Stack
                        direction="row"
                        justifyContent={equiposSonObjetos ? "space-between" : "flex-end"}
                        alignItems="center"
                      >
                        {equiposSonObjetos && (
                          <Button
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => setFacturaAgregarEquipo(factura)}
                            sx={{ color: acento }}
                          >
                            Agregar equipo
                          </Button>
                        )}
                        <IconButton
                          size="small"
                          onClick={() => toggleFacturaAbierta(factura.id)}
                          sx={{ color: acento }}
                        >
                          {abierta ? (
                            <ExpandLessIcon fontSize="small" />
                          ) : (
                            <ExpandMoreIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Stack>
                      {abierta && (
                        <Stack spacing={1} sx={{ mt: 1 }}>
                          {subtotal && (
                            <Typography variant="body2">Subtotal {subtotal}</Typography>
                          )}
                          {iva && <Typography variant="body2">IVA (19%) {iva}</Typography>}
                          {deposito && (
                            <Typography variant="body2">Depósito {deposito}</Typography>
                          )}
                          {(transporteTipo || transporteMonto) && (
                            <Typography variant="body2">
                              {transporteTipo === "Sin transporte"
                                ? "Sin transporte"
                                : ["Transporte", transporteTipo, transporteMonto]
                                    .filter(Boolean)
                                    .join(" ")}
                            </Typography>
                          )}
                          <Box
                            sx={{
                              px: 1.5,
                              py: 1,
                              borderRadius: 2,
                              boxShadow: "0 0 10px rgba(0,0,0,0.1)",
                              bgcolor: theme.palette.mode === "light" ? "#f8f9fa" : "#1e1e1e",
                            }}
                          >
                            {valorTotal && (
                              <Typography
                                variant="subtitle1"
                                fontWeight="bold"
                                sx={{ color: "secondary.dark" }}
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
                        </Stack>
                      )}
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        mt: 0,
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "space-between",
                        alignItems: "flex-end",
                        gap: 2,
                      }}
                    >
                      <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="flex-end">
                        {subtotal && (
                          <Typography variant="body2">Subtotal {subtotal}</Typography>
                        )}
                        {iva && <Typography variant="body2">IVA (19%) {iva}</Typography>}
                        {deposito && (
                          <Typography variant="body2">Depósito {deposito}</Typography>
                        )}
                        {(transporteTipo || transporteMonto) && (
                          <Typography variant="body2">
                            {transporteTipo === "Sin transporte"
                              ? "Sin transporte"
                              : ["Transporte", transporteTipo, transporteMonto]
                                  .filter(Boolean)
                                  .join(" ")}
                          </Typography>
                        )}
                      </Stack>

                      <Box
                        sx={{
                          mt: -4,
                          px: 1.5,
                          py: 1,
                          borderRadius: 2,
                          boxShadow: "0 0 10px rgba(0,0,0,0.1)",
                          bgcolor: theme.palette.mode === "light" ? "#f8f9fa" : "#1e1e1e",
                        }}
                      >
                        {valorTotal && (
                          <Typography
                            variant="subtitle1"
                            fontWeight="bold"
                            sx={{ color: "secondary.dark" }}
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
                  ))}
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
