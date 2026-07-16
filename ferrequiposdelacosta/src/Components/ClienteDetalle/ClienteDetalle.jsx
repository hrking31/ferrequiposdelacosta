import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import PlaceIcon from "@mui/icons-material/Place";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import ClienteFormDialog from "../ListaClientes/ClienteFormDialog";

const ESTADO_CLIENTE_INFO = {
  activo: { label: "Activo", chipColor: "success" },
  moroso: { label: "Moroso", chipColor: "error" },
  inactivo: { label: "Inactivo", chipColor: "default" },
  revisar: { label: "Revisar", chipColor: "warning" },
};

const ESTADO_FACTURA_INFO = {
  activo: { label: "Activo", chipColor: "success" },
  vencida: { label: "Vencida", chipColor: "warning" },
  pendiente: { label: "Pendiente ampliación", chipColor: "info" },
  morosa: { label: "Morosa", chipColor: "error" },
  cerrada: { label: "Cerrada", chipColor: "default" },
  revisar: { label: "Revisar", chipColor: "warning" },
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
  const [cliente, setCliente] = useState(null);
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editarOpen, setEditarOpen] = useState(false);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

  const fetchCliente = useCallback(async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  }, [id, showSnackbar]);

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
  const telefonoValido = tieneTelefonoValido(cliente.telefono);
  const numeroWhatsapp = telefonoValido ? String(cliente.telefono).replace(/\D/g, "") : "";

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
                bgcolor:
                  cliente.estado === "moroso"
                    ? theme.palette.error.main
                    : cliente.estado === "revisar"
                      ? theme.palette.warning.main
                      : theme.palette.success.main,
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
                color={estadoInfo.chipColor}
                size="small"
                sx={{ fontWeight: "bold", textTransform: "uppercase", mt: 0.5 }}
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

        {cliente.revisar && (
          <Alert severity="warning" icon={<ErrorOutlineIcon />} sx={{ mt: 2 }}>
            {cliente.motivoRevision || "Este cliente tiene datos migrados que deben revisarse manualmente."}
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />

        <Stack spacing={1}>
          {telefonoValido ? (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <PhoneIcon sx={{ fontSize: 18, color: "text.secondary" }} />
              <Typography variant="body2">{cliente.telefono}</Typography>
              <IconButton
                size="small"
                component="a"
                href={`https://wa.me/${numeroWhatsapp}`}
                target="_blank"
                rel="noopener"
                sx={{
                  bgcolor: "#25D366",
                  color: "#FFFFFF",
                  width: 22,
                  height: 22,
                  ml: 0.5,
                  "&:hover": { bgcolor: "#128C7E" },
                }}
              >
                <WhatsAppIcon sx={{ fontSize: 14 }} />
              </IconButton>
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

      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
        Historial de Facturas ({facturas.length})
      </Typography>

      {facturas.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Este cliente no tiene facturas registradas.
        </Typography>
      ) : (
        <Stack spacing={2}>
          {facturas.map((factura) => {
            const facturaEstadoInfo =
              ESTADO_FACTURA_INFO[factura.estado] || ESTADO_FACTURA_INFO.revisar;
            const valorTotal = formatearMoneda(factura.valorTotal);
            const transporte = formatearMoneda(factura.transporte);
            const deposito = formatearMoneda(factura.deposito);
            const fecha = formatearFecha(factura.fecha);
            const fechaVencimiento =
              formatearFecha(factura.fechaVencimiento) || factura.fechaVencimientoRaw;

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
                        Fecha: {fecha}
                      </Typography>
                    )}
                    {fechaVencimiento && (
                      <Typography variant="body2" color="text.secondary">
                        Vencimiento: {fechaVencimiento}
                      </Typography>
                    )}
                  </Box>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    {factura.revisar && (
                      <Tooltip
                        title={
                          factura.motivoRevision ||
                          `Original: pago="${factura.estadoPagoRaw ?? "—"}", entrega="${factura.estadoEntregaRaw ?? "—"}"`
                        }
                      >
                        <ErrorOutlineIcon sx={{ fontSize: 18, color: "warning.main" }} />
                      </Tooltip>
                    )}
                    <Chip
                      label={facturaEstadoInfo.label}
                      color={facturaEstadoInfo.chipColor}
                      size="small"
                    />
                  </Stack>
                </Stack>

                {factura.equipos?.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {factura.equipos.join(", ")}
                    </Typography>
                  </Box>
                )}

                {(valorTotal || transporte || deposito) && (
                  <Stack direction="row" spacing={2} sx={{ mt: 1 }} flexWrap="wrap">
                    {valorTotal && (
                      <Typography variant="body2">
                        <strong>Total:</strong> {valorTotal}
                      </Typography>
                    )}
                    {transporte && (
                      <Typography variant="body2">
                        <strong>Transporte:</strong> {transporte}
                      </Typography>
                    )}
                    {deposito && (
                      <Typography variant="body2">
                        <strong>Depósito:</strong> {deposito}
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

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Box>
  );
}
