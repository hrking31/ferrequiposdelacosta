import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Menu,
  MenuItem,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import PlaceIcon from "@mui/icons-material/Place";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import { collection, doc, getDoc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import ClienteFormDialog from "../ListaClientes/ClienteFormDialog";
import FacturaFormDialog from "./FacturaFormDialog";

// El estado del cliente es el mismo vocabulario que el de sus facturas
// (el cliente toma el estado de la factura que se le crea/edita), más
// "inactivo" para cuando todavía no tiene ninguna factura.
const ESTADO_CLIENTE_INFO = {
  inactivo: { label: "Inactivo" },
  pendienteDespacho: { label: "Pendiente de despacho" },
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
  pendienteDespacho: { label: "Pendiente de despacho" },
  despachada: { label: "Despachada" },
  devolucionParcial: { label: "Devolución parcial" },
  finalizada: { label: "Finalizada" },
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
  const [menuEstadoAnchor, setMenuEstadoAnchor] = useState(null);
  const [facturaMenuId, setFacturaMenuId] = useState(null);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

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
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
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
    <Box sx={{ width: "100%", mx: "auto", [theme.breakpoints.up("md")]: { width: "60%" } }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate("/vistaclientes")}
        sx={{ mb: 2, color: acento }}
      >
        Volver a Clientes
      </Button>

      <Box
        sx={{
          p: 3,
          borderRadius: 3,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: 1,
          mb: 3,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="space-between">
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

          <Button
            startIcon={<EditIcon />}
            onClick={() => setEditarOpen(true)}
            sx={{ flexShrink: 0, color: acento }}
          >
            Editar
          </Button>
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
          Historial de Facturas ({facturas.length})
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
            const deposito = formatearMoneda(factura.deposito);
            const valorTotal = formatearMoneda(factura.valorTotal);
            const fecha = formatearFecha(factura.fecha);
            const fechaVencimiento = equiposSonObjetos
              ? null
              : formatearFecha(factura.fechaVencimiento) || factura.fechaVencimientoRaw;

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
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography fontWeight="bold">
                      Factura {factura.numeroFactura ?? "s/n"}
                    </Typography>
                    {fecha && (
                      <Typography variant="body2" color="text.secondary">
                        Fecha despacho: {fecha}
                      </Typography>
                    )}
                    {fechaVencimiento && (
                      <Typography variant="body2" color="text.secondary">
                        Vencimiento: {fechaVencimiento}
                      </Typography>
                    )}
                  </Box>
                  <Stack direction="row" spacing={0.5} alignItems="center">
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
                  </Stack>
                </Stack>

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
                            {equipo.fechaVencimiento && (
                              <Typography variant="body2" sx={{ color: "secondary.light" }}>
                                Fecha devolución: {formatearFecha(equipo.fechaVencimiento)}
                              </Typography>
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

                {(subtotal || transporteTipo || transporteMonto || deposito || valorTotal) && (
                  <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mt: 1 }}>
                    {subtotal && (
                      <Typography variant="body2">Subtotal {subtotal}</Typography>
                    )}
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
                    {valorTotal && (
                      <Typography
                        variant="subtitle1"
                        fontWeight="bold"
                        sx={{ color: "secondary.dark" }}
                      >
                        Total {valorTotal}
                      </Typography>
                    )}
                  </Stack>
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
        onCreada={() => fetchCliente(true)}
      />

      <Menu
        anchorEl={menuEstadoAnchor}
        open={Boolean(menuEstadoAnchor)}
        onClose={handleCerrarMenuEstado}
      >
        <MenuItem onClick={() => handleCambiarEstadoFactura("pendienteDespacho")}>
          Pendiente de despacho
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
