import { useState } from "react";
import PropTypes from "prop-types";
import {
  Avatar,
  Box,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import PhoneIcon from "@mui/icons-material/Phone";
import UpdateIcon from "@mui/icons-material/Update";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import AmpliarVencimientoDialog from "./AmpliarVencimientoDialog";

const ESTADO_FACTURA_INFO = {
  pendienteDespacho: { label: "Pendiente despacho" },
  despachada: { label: "Despachada" },
  devolucionParcial: { label: "Devolución parcial" },
  finalizada: { label: "Finalizada" },
};

const CODIGOS_SIN_TELEFONO = ["SN", "NT", "N/A", ""];

const tieneTelefonoValido = (telefono) =>
  telefono && !CODIGOS_SIN_TELEFONO.includes(String(telefono).trim().toUpperCase());

const obtenerNombreCompleto = (cliente) => {
  if (!cliente) return "";
  if (cliente.tipo === "empresa") return cliente.razonSocial || cliente.nombreOriginal;
  return [cliente.nombres, cliente.apellido].filter(Boolean).join(" ") || cliente.nombreOriginal;
};

const formatearMoneda = (valor) =>
  typeof valor === "number"
    ? valor.toLocaleString("es-CO", { style: "currency", currency: "COP" })
    : null;

const formatearFecha = (isoDate) => {
  if (!isoDate) return null;
  const [anio, mes, dia] = isoDate.split("-");
  return `${dia}/${mes}/${anio}`;
};

export default function ClienteSeguimientoCard({
  cliente,
  facturas,
  hoy,
  onCambiarEstado,
  onEquiposActualizados,
}) {
  const theme = useTheme();
  const acento =
    theme.palette.mode === "light" ? theme.palette.primary.main : theme.palette.secondary.light;
  const esMovil = useMediaQuery(theme.breakpoints.down("sm"));
  const [tabFactura, setTabFactura] = useState(0);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [detalleAbierto, setDetalleAbierto] = useState(false);
  const [ampliarOpen, setAmpliarOpen] = useState(false);

  const avatarBgPorEstado = {
    pendienteDespacho: "#7E57C2",
    despachada: theme.palette.success.main,
    devolucionParcial: theme.palette.info.main,
    finalizada: theme.palette.secondary.main,
  };

  const gradosGrisPestana =
    theme.palette.mode === "light" ? theme.palette.grey[300] : theme.palette.grey[700];

  const indiceActivo = Math.min(tabFactura, facturas.length - 1);
  const factura = facturas[indiceActivo];
  const facturaEstadoInfo =
    ESTADO_FACTURA_INFO[factura.estado] || { label: factura.estado || "Sin estado" };
  const facturaEstadoColor =
    avatarBgPorEstado[factura.estado] ||
    (theme.palette.mode === "light" ? theme.palette.grey[400] : theme.palette.grey[700]);

  const subtotal = formatearMoneda(factura.subtotal);
  const iva = formatearMoneda(factura.iva);
  const deposito = formatearMoneda(factura.deposito);
  const valorTotal = formatearMoneda(factura.valorTotal);
  const transporteMonto = formatearMoneda(factura.valorTransporte);
  const transporteTipo = typeof factura.transporte === "string" ? factura.transporte : null;
  const textoTransporte =
    transporteTipo === "Sin transporte"
      ? "Sin transporte"
      : ["Transporte", transporteTipo, transporteMonto].filter(Boolean).join(" ");
  const fecha = formatearFecha(factura.fecha);
  const telefonoValido = tieneTelefonoValido(cliente.telefono);
  const numeroWhatsapp = telefonoValido ? String(cliente.telefono).replace(/\D/g, "") : "";

  const handleCambiar = (nuevoEstado) => {
    setMenuAnchor(null);
    onCambiarEstado(cliente.id, factura.id, nuevoEstado);
  };

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
        <Avatar sx={{ bgcolor: facturaEstadoColor, width: 36, height: 36 }}>
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
                <IconButton
                  size="small"
                  component="a"
                  href={`https://wa.me/${numeroWhatsapp}`}
                  target="_blank"
                  rel="noopener"
                  sx={{
                    bgcolor: "#25D366",
                    color: "#FFFFFF",
                    width: 18,
                    height: 18,
                    "&:hover": { bgcolor: "#128C7E" },
                  }}
                >
                  <WhatsAppIcon sx={{ fontSize: 11 }} />
                </IconButton>
                {esMovil && (
                  <IconButton
                    size="small"
                    component="a"
                    href={`tel:${cliente.telefono}`}
                    sx={{
                      bgcolor: "#34B7F1",
                      color: "#FFFFFF",
                      width: 18,
                      height: 18,
                      "&:hover": { bgcolor: "#269BD1" },
                    }}
                  >
                    <PhoneIcon sx={{ fontSize: 11 }} />
                  </IconButton>
                )}
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
              bgcolor: theme.palette.mode === "light" ? "#EDE6D6" : "#242424",
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
                      borderColor: activo ? "secondary.light" : "divider",
                      bgcolor: activo ? "secondary.light" : gradosGrisPestana,
                      color: activo ? "#1A1A1A" : "text.secondary",
                      position: "relative",
                      zIndex: activo ? facturas.length + 1 : facturas.length - idx,
                      mb: 0,
                      boxShadow:
                        !activo && idx < facturas.length - 1
                          ? "3px 0 4px -2px rgba(0,0,0,0.35)"
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
              borderColor: "secondary.light",
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
              <Chip
                label={facturaEstadoInfo.label}
                size="small"
                onClick={(e) => setMenuAnchor(e.currentTarget)}
                sx={{
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  fontSize: "0.65rem",
                  cursor: "pointer",
                  boxShadow: 2,
                  bgcolor: facturaEstadoColor,
                  color: theme.palette.getContrastText(facturaEstadoColor),
                }}
              />
            </Stack>

            {factura.equipos?.length > 0 && (
              <Stack spacing={0.5} sx={{ mb: 1 }}>
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
                          <Typography variant="body2" sx={{ color: "error.main", fontWeight: "bold" }}>
                            Vencido: {formatearFecha(equipo.fechaVencimientoOriginal)}
                          </Typography>
                        )}
                        {equipo.fechaVencimiento && (
                          <Typography
                            variant="body2"
                            sx={{
                              color:
                                hoy && equipo.fechaVencimiento < hoy
                                  ? "error.main"
                                  : "secondary.light",
                              fontWeight: hoy && equipo.fechaVencimiento < hoy ? "bold" : "normal",
                            }}
                          >
                            {hoy && equipo.fechaVencimiento < hoy
                              ? "Venció"
                              : hoy && equipo.fechaVencimiento === hoy
                                ? "Vence hoy"
                                : "Vence"}
                            : {formatearFecha(equipo.fechaVencimiento)}
                          </Typography>
                        )}
                      </>
                    )}
                  </Stack>
                ))}
              </Stack>
            )}

            {!esMovil && (
              <Button
                size="small"
                startIcon={<UpdateIcon />}
                onClick={() => setAmpliarOpen(true)}
                sx={{ mb: 0.5, color: acento }}
              >
                Ampliar vencimiento
              </Button>
            )}

            {esMovil ? (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Button
                    size="small"
                    startIcon={<UpdateIcon />}
                    onClick={() => setAmpliarOpen(true)}
                    sx={{ color: acento }}
                  >
                    Ampliar vencimiento
                  </Button>
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
                    {valorTotal && (
                      <Box
                        sx={{
                          px: 1.5,
                          py: 1,
                          borderRadius: 2,
                          boxShadow: "0 0 10px rgba(0,0,0,0.1)",
                          bgcolor: theme.palette.mode === "light" ? "#f8f9fa" : "#1e1e1e",
                        }}
                      >
                        <Typography
                          variant="subtitle1"
                          fontWeight="bold"
                          sx={{ color: "secondary.dark" }}
                        >
                          Total {valorTotal}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                )}
              </Box>
            ) : (
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
                  {deposito && <Typography variant="body2">Depósito {deposito}</Typography>}
                  {(transporteTipo || transporteMonto) && (
                    <Typography variant="body2">{textoTransporte}</Typography>
                  )}
                </Stack>

                {valorTotal && (
                  <Box
                    sx={{
                      px: 1.5,
                      py: 1,
                      borderRadius: 2,
                      boxShadow: "0 0 10px rgba(0,0,0,0.1)",
                      bgcolor: theme.palette.mode === "light" ? "#f8f9fa" : "#1e1e1e",
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      sx={{ color: "secondary.dark" }}
                    >
                      Total {valorTotal}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => handleCambiar("pendienteDespacho")}>Pendiente despacho</MenuItem>
        <MenuItem onClick={() => handleCambiar("despachada")}>Despachada</MenuItem>
        <MenuItem onClick={() => handleCambiar("devolucionParcial")}>Devolución parcial</MenuItem>
        <MenuItem onClick={() => handleCambiar("finalizada")}>Finalizada</MenuItem>
      </Menu>

      <AmpliarVencimientoDialog
        open={ampliarOpen}
        onClose={() => setAmpliarOpen(false)}
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
  onCambiarEstado: PropTypes.func.isRequired,
  onEquiposActualizados: PropTypes.func,
};
