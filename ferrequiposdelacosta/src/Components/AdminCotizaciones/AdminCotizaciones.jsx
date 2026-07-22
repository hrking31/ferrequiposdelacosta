import { useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Avatar,
  Divider,
  Stack,
  TextField,
  InputAdornment,
  IconButton,
  useTheme,
} from "@mui/material";
import { setCotizacionActual } from "../../Store/Slices/cotizacionSlice.js";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import BadgeIcon from "@mui/icons-material/Badge";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import BusinessIcon from "@mui/icons-material/Business";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import { ref, remove, update } from "firebase/database";
import { database } from "../../Components/Firebase/Firebase.js";

export default function KioskAdminCotizaciones() {
  const theme = useTheme();
  const acento =
    theme.palette.mode === "light" ? theme.palette.primary.main : theme.palette.secondary.light;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { name, uid } = useSelector((state) => state.user);
  const cotizaciones = useSelector(
    (state) => state.cotizacion.listaCotizaciones,
  );
  const usuariosConectados = useSelector(
    (state) => state.presence.usuariosConectados || {},
  );
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");

  const busquedaLower = busqueda.trim().toLowerCase();

  const cotizacionesFiltradas = useMemo(
    () =>
      cotizaciones.filter((quotation) => {
        if (filtroTipo !== "todos" && quotation.tipo !== filtroTipo) return false;
        if (!busquedaLower) return true;
        const nombre = (quotation.empresa || "").toLowerCase();
        const telefono = (quotation.telefono || "").toLowerCase();
        return nombre.includes(busquedaLower) || telefono.includes(busquedaLower);
      }),
    [cotizaciones, filtroTipo, busquedaLower],
  );

  const handleOpenQuotation = async (quotation) => {
    try {
      await update(ref(database, `cotizaciones/${quotation.id}`), {
        status: "enProceso",
        atendidoPor: name,
        atendidoPorUid: uid,
      });

      dispatch(
        setCotizacionActual({
          ...quotation,
          status: "enProceso",
          atendidoPor: name,
          atendidoPorUid: uid,
        }),
      );

      navigate("/vistacotizacion");
    } catch (error) {
      console.error("Error al abrir la cotización:", error);
    }
  };

  const handleEliminar = async (id) => {
    try {
      await remove(ref(database, `cotizaciones/${id}`));
    } catch (error) {
      console.error("Error eliminando solicitud:", error);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        gap: 3,
        backgroundColor: (theme) => theme.palette.background.default,
        transition: "background-color 0.3s ease",
      }}
    >
      {cotizaciones.length > 0 && (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{ xs: "stretch", sm: "center" }}
          sx={{ flexShrink: 0 }}
        >
          <TextField
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar cliente..."
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: busqueda && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setBusqueda("")} edge="end">
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
              sx: { borderRadius: 999 },
            }}
          />

          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Chip
              label="Todos"
              clickable
              onClick={() => setFiltroTipo("todos")}
              variant={filtroTipo === "todos" ? "filled" : "outlined"}
              sx={
                filtroTipo === "todos"
                  ? { bgcolor: acento, color: theme.palette.getContrastText(acento) }
                  : undefined
              }
            />
            <Chip
              icon={<PersonIcon sx={{ fontSize: 16 }} />}
              label="Personas"
              clickable
              onClick={() => setFiltroTipo("persona")}
              variant={filtroTipo === "persona" ? "filled" : "outlined"}
              sx={
                filtroTipo === "persona"
                  ? {
                      bgcolor: acento,
                      color: theme.palette.getContrastText(acento),
                      "& .MuiChip-icon": { color: "inherit" },
                    }
                  : undefined
              }
            />
            <Chip
              icon={<BusinessIcon sx={{ fontSize: 16 }} />}
              label="Empresas"
              clickable
              onClick={() => setFiltroTipo("empresa")}
              variant={filtroTipo === "empresa" ? "filled" : "outlined"}
              sx={
                filtroTipo === "empresa"
                  ? {
                      bgcolor: acento,
                      color: theme.palette.getContrastText(acento),
                      "& .MuiChip-icon": { color: "inherit" },
                    }
                  : undefined
              }
            />
          </Stack>
        </Stack>
      )}

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
      {cotizaciones.length === 0 ? (
        <Typography
          variant="body1"
          sx={{ textAlign: "center", mt: 4, color: "text.secondary" }}
        >
          No hay solicitudes de cotización pendientes...
        </Typography>
      ) : cotizacionesFiltradas.length === 0 ? (
        <Typography
          variant="body1"
          sx={{ textAlign: "center", mt: 4, color: "text.secondary" }}
        >
          No se encontraron cotizaciones con esos filtros.
        </Typography>
      ) : (
        cotizacionesFiltradas.map((quotation) => (
          <Card
            key={quotation.id}
            sx={{
              position: "relative",
              overflow: "visible",
              backgroundColor: (theme) =>
                theme.palette.mode === "light"
                  ? "secondary.main"
                  : "primary.main",
              borderRadius: "8px 8px 0 0",
              outline: "1px solid transparent",
              willChange: "transform, box-shadow",
              transition:
                "transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.4s cubic-bezier(0.25, 1, 0.5, 1), border-color 0.4s ease",
              "&:hover": {
                transform: "translateY(0)",
                outlineColor: (theme) =>
                  theme.palette.mode === "light"
                    ? "primary.main"
                    : "secondary.light",
                boxShadow: (theme) =>
                  theme.palette.mode === "dark"
                    ? "0 12px 20px -5px rgba(0,0,0,0.4), 0 4px 12px -2px rgba(0,0,0,0.2)"
                    : "0 12px 24px -6px rgba(58,81,105,0.25), 0 4px 14px -2px rgba(58,81,105,0.15)",
              },

              "&:not(:hover)": {
                transform: "translateY(0)",
              },
            }}
          >
            {/* Barra superior */}
            <Box
              sx={{
                height: 6,
                backgroundColor: (theme) =>
                  theme.palette.mode === "light"
                    ? "primary.main"
                    : "secondary.light",
                borderRadius: "8px 8px 0 0",
              }}
            />

            <CardContent sx={{ p: 3 }}>
              {/* Nombre, Empresa y Estado */}
              <Stack
                direction={{ xs: "column-reverse", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
                mb={2}
                gap={2}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  gap={2}
                  sx={{ width: "100%", overflow: "hidden" }}
                >
                  <Avatar
                    sx={{
                      bgcolor: (theme) =>
                        theme.palette.mode === "light"
                          ? "primary.main"
                          : "primary.dark",
                      width: 56,
                      height: 56,
                      flexShrink: 0,
                    }}
                  >
                    {quotation.tipo === "empresa" ? (
                      <BusinessIcon
                        sx={{ fontSize: 32, color: "primary.contrastText" }}
                      />
                    ) : (
                      <PersonIcon
                        sx={{ fontSize: 32, color: "primary.contrastText" }}
                      />
                    )}
                  </Avatar>

                  <Box sx={{ minWidth: 0, width: "100%" }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        display: "block",
                        mb: -0.5,
                      }}
                    >
                      {quotation.tipo === "empresa" ? "Empresa:" : "Nombre:"}
                    </Typography>

                    <Typography
                      variant="h5"
                      noWrap
                      sx={{
                        fontWeight: "bold",
                        color: (theme) => theme.palette.text.primary,
                        textOverflow: "ellipsis",
                      }}
                    >
                      {quotation.empresa || "Cliente sin nombre"}
                    </Typography>

                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary" }}
                    >
                      Solicitud ID: {quotation.cotizacionId}
                    </Typography>
                  </Box>
                </Stack>

                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: { xs: "flex-start", sm: "center" },
                    gap: 0.5,
                    // border: "2px solid red",
                  }}
                >
                  <Chip
                    label={
                      quotation.status === "enProceso"
                        ? "En Proceso"
                        : quotation.status === "pendiente"
                          ? "Pendiente"
                          : quotation.status === "pausada"
                            ? "Pausada"
                            : quotation.status
                              ? quotation.status.charAt(0).toUpperCase() +
                                quotation.status.slice(1)
                              : ""
                    }
                    sx={{
                      fontWeight: "bold",
                      color: "text.secondary",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      height: "26px",
                      border: "none",

                      boxShadow: (theme) =>
                        theme.palette.mode === "light"
                          ? "inset 1px 2px 4px rgba(0, 0, 0, 0.12), inset -1px -1px 2px rgba(255, 255, 255, 0.5)"
                          : "inset 1px 2px 4px rgba(0, 0, 0, 0.5), inset -1px -1px 1px rgba(255, 255, 255, 0.05)",
                    }}
                  />

                  {quotation.status === "enProceso" &&
                    quotation.atendidoPor && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.primary",
                          fontSize: "0.7rem",
                          fontStyle: "italic",
                          whiteSpace: "nowrap",
                          display: "flex",
                          alignItems: "center",
                          gap: 0.6,
                        }}
                      >
                        <Box
                          component="span"
                          sx={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            backgroundColor: usuariosConectados[
                              quotation.atendidoPorUid
                            ]?.online
                              ? "#44b700"
                              : "#9e9e9e",
                            display: "inline-block",
                            position: "relative",
                            ...(usuariosConectados[quotation.atendidoPorUid]
                              ?.online && {
                              "&::after": {
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                                borderRadius: "50%",
                                animation: "pulseDot 1.5s infinite ease-in-out",
                                border: "1px solid #44b700",
                                content: '""',
                              },
                            }),
                            "@keyframes pulseDot": {
                              "0%": { transform: "scale(0.8)", opacity: 1 },
                              "100%": { transform: "scale(2.5)", opacity: 0 },
                            },
                          }}
                        />
                        <span>
                          Atendido por: <strong>{quotation.atendidoPor}</strong>
                        </span>
                      </Typography>
                    )}
                </Box>
              </Stack>

              <Divider sx={{ my: 2 }} />

              {/* Información de Contacto del Cliente */}
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={{ xs: 2, sm: 4 }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
              >
                <Stack spacing={1.5} sx={{ width: "100%" }}>
                  <Stack direction="row" alignItems="center" gap={1.5}>
                    <BadgeIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                    <Typography variant="body2">
                      <b>Identificación:</b> {quotation.nit}
                    </Typography>
                  </Stack>

                  <Stack direction="row" alignItems="center" gap={1.5}>
                    <PhoneIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                    <Typography variant="body2">
                      <b>Teléfono:</b> {quotation.telefono}
                    </Typography>
                  </Stack>

                  <Stack direction="row" alignItems="center" gap={1.5}>
                    <LocationOnIcon
                      sx={{ color: "text.secondary", fontSize: 20 }}
                    />
                    <Typography variant="body2">
                      <b>Dirección:</b> {quotation.direccion}
                    </Typography>
                  </Stack>
                </Stack>

                <Box
                  sx={{
                    minWidth: { xs: "100%", sm: "200px" },
                    mt: { xs: 2, sm: 0 },
                  }}
                >
                  {(() => {
                    let btnConfig = [];

                    if (quotation.status === "creada") {
                      btnConfig = [
                        {
                          texto: "Eliminar",
                          accion: () => handleEliminar(quotation.id),
                        },
                        {
                          texto: "Editar",
                          accion: () => handleOpenQuotation(quotation),
                        },
                      ];
                    } else if (quotation.status === "pausada") {
                      btnConfig = [
                        {
                          texto: "Continuar Cotización",
                          accion: () => handleOpenQuotation(quotation),
                        },
                      ];
                    } else if (quotation.status === "pendiente") {
                      btnConfig = [
                        {
                          texto: "Crear Cotización",
                          accion: () => handleOpenQuotation(quotation),
                        },
                      ];
                    } else if (quotation.status === "enProceso") {
                      const laTengoYo = quotation.atendidoPor === name;

                      const asesorAsignadoUid = quotation.atendidoPorUid;
                      const asesorEstaConectado =
                        usuariosConectados[asesorAsignadoUid]?.online === true;
                      if (laTengoYo) {
                        btnConfig = [
                          {
                            texto: "Retomar Cotización",
                            accion: () => handleOpenQuotation(quotation, name),
                          },
                        ];
                      } else if (!asesorEstaConectado) {
                        // Si la tiene otra persona y no está conectada, muestra el botón
                        btnConfig = [
                          {
                            texto: "Asumir Gestión",
                            accion: () => handleOpenQuotation(quotation, name),
                          },
                        ];
                      } else {
                        // Si la tiene otra persona y está conectada, se oculta el botón
                        btnConfig = [];
                      }
                    }
                    if (btnConfig.length === 0) return null;

                    return (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 1,
                        }}
                      >
                        {btnConfig.map((btn, index) => (
                          <Button
                            key={index}
                            variant="quotationSquare"
                            fullWidth
                            size="large"
                            onClick={() => btn.accion()}
                            endIcon={<ReceiptLongIcon />}
                            sx={{
                              fontWeight: "bold",
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                              py: 1.5,
                            }}
                          >
                            {btn.texto}
                          </Button>
                        ))}
                      </Box>
                    );
                  })()}
                </Box>
              </Stack>
            </CardContent>
          </Card>
        ))
      )}
      </Box>
    </Box>
  );
}
