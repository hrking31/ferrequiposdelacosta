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
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  useTheme,
} from "@mui/material";
import { setCotizacionActual } from "../../Store/Slices/cotizacionSlice.js";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import BadgeIcon from "@mui/icons-material/Badge";
import BusinessIcon from "@mui/icons-material/Business";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import PauseCircleOutlineIcon from "@mui/icons-material/PauseCircleOutline";
import BuscadorFiltro from "../BuscadorFiltro/BuscadorFiltro";
import VistaCotPdf from "../VistaPdf/VistaCotPdf";
import {
  calcularStatusPrevio,
  etiquetaEstado,
} from "../../Utils/cotizacionEstado";
import { ref, remove, update } from "firebase/database";
import { database } from "../../Components/Firebase/Firebase.js";

// Cómo se pinta cada uno de los cuatro momentos por los que pasa una
// solicitud. El nombre sale de Utils/cotizacionEstado, que es donde viven los
// estados; acá solo se elige el icono y el color del chip.
const ESTILO_ESTADO = {
  creada: { Icono: CheckCircleIcon, color: "success" },
  pendiente: { Icono: PendingActionsIcon, color: "warning" },
  enProceso: { Icono: AutorenewIcon, color: "info" },
  pausada: { Icono: PauseCircleOutlineIcon, color: "default" },
};

const estadoDe = (status) => ({
  label: etiquetaEstado(status),
  ...(ESTILO_ESTADO[status] || {
    Icono: PendingActionsIcon,
    color: "default",
  }),
});

export default function KioskAdminCotizaciones() {
  const theme = useTheme();
  // Acento del modo: naranja en claro, amarillo en oscuro.
  const acento = theme.palette.custom.accent;
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
  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

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
      // De dónde viene: si se sale sin dejar cambios, vuelve a este estado.
      // Hay que anotarlo ahora, porque en un segundo su estado será
      // "enProceso" y el anterior ya no se podría saber.
      const statusPrevio = calcularStatusPrevio(quotation);

      await update(ref(database, `cotizaciones/${quotation.id}`), {
        status: "enProceso",
        statusPrevio,
        atendidoPor: name,
        atendidoPorUid: uid,
      });

      dispatch(
        setCotizacionActual({
          ...quotation,
          status: "enProceso",
          statusPrevio,
          atendidoPor: name,
          atendidoPorUid: uid,
        }),
      );

      navigate("/vistacotizacion");
    } catch (error) {
      console.error("Error al abrir la cotización:", error);
    }
  };

  // La solicitud desaparece sola de la lista: App.jsx escucha la base en vivo.
  const handleEliminar = async () => {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      await remove(ref(database, `cotizaciones/${aEliminar.id}`));
      setAEliminar(null);
    } catch (error) {
      console.error("Error eliminando solicitud:", error);
    } finally {
      setEliminando(false);
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
          <BuscadorFiltro
            value={busqueda}
            onChange={setBusqueda}
            placeholder="Buscar cliente..."
          />

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
          >
            {cotizacionesFiltradas.length} de {cotizaciones.length} solicitudes
          </Typography>

          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Chip
              label="Todos"
              clickable
              onClick={() => setFiltroTipo("todos")}
              variant={filtroTipo === "todos" ? "filled" : "outlined"}
              sx={
                filtroTipo === "todos"
                  ? {
                      bgcolor: acento,
                      color: theme.palette.getContrastText(acento),
                      "&:hover": { bgcolor: acento },
                      "&.Mui-focusVisible": { bgcolor: acento },
                    }
                  : undefined
              }
            />
            <Chip
              icon={<PersonIcon />}
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
                      // Conserva su color: sin esto MUI le superpone un tinte
                      // al pasar el mouse y otro mientras tiene el foco.
                      "&:hover": { bgcolor: acento },
                      "&.Mui-focusVisible": { bgcolor: acento },
                    }
                  : undefined
              }
            />
            <Chip
              icon={<BusinessIcon />}
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
                      // Conserva su color: sin esto MUI le superpone un tinte
                      // al pasar el mouse y otro mientras tiene el foco.
                      "&:hover": { bgcolor: acento },
                      "&.Mui-focusVisible": { bgcolor: acento },
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
              backgroundColor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: (theme) =>
                `${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0 0`,
              outline: "1px solid transparent",
              willChange: "transform, box-shadow",
              transition:
                "transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.4s cubic-bezier(0.25, 1, 0.5, 1), border-color 0.4s ease",
              "&:hover": {
                transform: "translateY(0)",
                outlineColor: "custom.accent",
                boxShadow: (theme) => theme.palette.custom.sombraTarjetaHover,
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
                backgroundColor: "custom.accent",
                borderRadius: (theme) =>
                `${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0 0`,
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
                      bgcolor: "primary.main",
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

                  {/* Sin rótulo "Nombre"/"Empresa": el icono del avatar ya
                      dice de cuál de los dos se trata. */}
                  <Box sx={{ minWidth: 0, width: "100%" }}>
                    <Typography
                      variant="h5"
                      noWrap
                      sx={{
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
                  {(() => {
                    const estado = estadoDe(quotation.status);
                    return (
                      <Chip
                        size="small"
                        icon={<estado.Icono />}
                        label={estado.label}
                        color={estado.color}
                        variant="outlined"
                      />
                    );
                  })()}

                  {quotation.status === "enProceso" &&
                    quotation.atendidoPor && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.primary",
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
                              ? theme.palette.custom.online
                              : theme.palette.grey[500],
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
                                border: `1px solid ${theme.palette.custom.online}`,
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
                    <BadgeIcon fontSize="small" sx={{ color: "text.secondary" }} />
                    <Typography variant="body2">
                      <b>Identificación:</b> {quotation.nit}
                    </Typography>
                  </Stack>

                  <Stack direction="row" alignItems="center" gap={1.5}>
                    <PhoneIcon fontSize="small" sx={{ color: "text.secondary" }} />
                    <Typography variant="body2">
                      <b>Teléfono:</b> {quotation.telefono}
                    </Typography>
                  </Stack>

                  <Stack direction="row" alignItems="center" gap={1.5}>
                    <LocationOnIcon fontSize="small" sx={{ color: "text.secondary" }} />
                    <Typography variant="body2">
                      <b>Dirección:</b> {quotation.direccion}
                    </Typography>
                  </Stack>
                </Stack>

                {(() => {
                  // Abrir la cotización es siempre la misma acción; lo que
                  // cambia es cómo se llama según en qué punto quedó.
                  let tituloAbrir = null;

                  if (quotation.status === "creada") {
                    tituloAbrir = "Editar";
                  } else if (quotation.status === "pausada") {
                    tituloAbrir = "Continuar cotización";
                  } else if (quotation.status === "pendiente") {
                    tituloAbrir = "Crear cotización";
                  } else if (quotation.status === "enProceso") {
                    const laTengoYo = quotation.atendidoPor === name;
                    const asesorEstaConectado =
                      usuariosConectados[quotation.atendidoPorUid]?.online ===
                      true;

                    if (laTengoYo) {
                      tituloAbrir = "Retomar cotización";
                    } else if (!asesorEstaConectado) {
                      // La tiene otra persona pero está desconectada: se
                      // puede asumir. Si está conectada no se ofrece, para
                      // no pisarle el trabajo.
                      tituloAbrir = "Asumir gestión";
                    }
                  }

                  // Solo las emitidas tienen un documento que descargar.
                  const puedeDescargar =
                    quotation.status === "creada" &&
                    Array.isArray(quotation.items) &&
                    quotation.items.length > 0;
                  const puedeEliminar = quotation.status === "creada";

                  if (!tituloAbrir && !puedeDescargar && !puedeEliminar) {
                    return null;
                  }

                  return (
                    <Stack
                      direction="row"
                      spacing={0.5}
                      sx={{
                        flexShrink: 0,
                        alignSelf: { xs: "flex-end", sm: "center" },
                      }}
                    >
                      {tituloAbrir && (
                        <Tooltip title={tituloAbrir}>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenQuotation(quotation)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {puedeDescargar && (
                        <Tooltip title="Descargar PDF">
                          <IconButton
                            size="small"
                            onClick={() => VistaCotPdf(quotation)}
                          >
                            <PictureAsPdfIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {puedeEliminar && (
                        <Tooltip title="Eliminar">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setAEliminar(quotation)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  );
                })()}
              </Stack>
            </CardContent>
          </Card>
        ))
      )}
      </Box>

      <Dialog open={Boolean(aEliminar)} onClose={() => setAEliminar(null)}>
        <DialogTitle sx={{ color: acento }}>Eliminar solicitud</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Seguro que querés eliminar la solicitud{" "}
            {aEliminar?.cotizacionId} de{" "}
            {aEliminar?.empresa || "cliente sin nombre"}? Esta acción no se
            puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setAEliminar(null)}
            disabled={eliminando}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleEliminar}
            disabled={eliminando}
          >
            {eliminando ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
