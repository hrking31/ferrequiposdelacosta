import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Button,
  Avatar,
  Divider,
} from "@mui/material";
import { kioskCotizacion } from "../../Store/Slices/cotizacionSlice";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import BadgeIcon from "@mui/icons-material/Badge";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import BusinessIcon from "@mui/icons-material/Business";
import { ref, remove } from "firebase/database";
import { database } from "../../Components/Firebase/Firebase.js";

export default function KioskAdminCotizaciones() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const cotizaciones = useSelector(
    (state) => state.cotizacion.listaCotizaciones,
  );

  const handleOpenQuotation = (quotation) => {
    dispatch(kioskCotizacion(quotation));
    navigate("/vistacotizacion");
  };

  const handleEliminar = async (id) => {
    try {
      await remove(ref(database, `cotizaciones/${id}`));

      console.log("Solicitud eliminada");
    } catch (error) {
      console.error("Error eliminando solicitud:", error);
    }
  };

  return (
    <Box
      sx={{
        p: 3,
        display: "flex",
        flexDirection: "column",
        gap: 3,
        backgroundColor: (theme) => theme.palette.background.default,
        minHeight: "100vh",
        transition: "background-color 0.3s ease",
      }}
    >
      {/* Encabezado del Panel */}
      <Stack direction="row" alignItems="center" gap={2}>
        <BuildCircleIcon
          sx={{
            fontSize: 40,
            color: (theme) =>
              theme.palette.mode === "light"
                ? "primary.main"
                : "secondary.main",
          }}
        />
        <Typography
          variant="h2"
          sx={{
            fontWeight: "bold",
            textTransform: "uppercase",
            letterSpacing: 1,
            color: (theme) =>
              theme.palette.mode === "light"
                ? "primary.dark"
                : "secondary.main",
          }}
        >
          Panel de Solicitudes
        </Typography>
      </Stack>

      {cotizaciones.length === 0 ? (
        <Typography
          variant="body1"
          sx={{ textAlign: "center", mt: 4, color: "text.secondary" }}
        >
          No hay solicitudes de cotización pendientes...
        </Typography>
      ) : (
        cotizaciones.map((quotation) => (
          <Card
            key={quotation.id}
            sx={{
              position: "relative",
              overflow: "visible",
              backgroundColor: (theme) =>
                theme.palette.mode === "light" ? "#FFFFFF" : "primary.main",
              border: "1px solid transparent",
              willChange: "transform, box-shadow, border-color",
              transition:
                "transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.4s cubic-bezier(0.25, 1, 0.5, 1), border-color 0.4s ease",
              "&:hover": {
                transform: "translateY(-6px)",
                borderColor: (theme) => theme.palette.secondary.main,
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
                backgroundColor: (theme) => theme.palette.secondary.main,
                // borderRadius: "8px 8px 0 0",
              }}
            />

            <CardContent sx={{ p: 3 }}>
              {/* Nombre/Empresa y Estado  */}
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
                    {quotation.cliente?.tipo === "empresa" ? (
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
                      {quotation.cliente?.tipo === "empresa"
                        ? "Empresa:"
                        : "Nombre:"}
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
                      {quotation.cliente?.nombre || "Cliente sin nombre"}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary" }}
                    >
                      Solicitud ID: {quotation.id}
                    </Typography>
                  </Box>
                </Stack>

                {quotation.status === "creada" ? (
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => handleEliminar(quotation.id)}
                  >
                    Eliminar
                  </Button>
                ) : (
                  <Chip
                    label={quotation.status}
                    sx={{
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      borderRadius: 1,
                      px: 1,
                      backgroundColor: (theme) => theme.palette.warning.main,
                      color: (theme) => theme.palette.warning.contrastText,
                      boxShadow: 1,
                      alignSelf: { xs: "flex-end", sm: "center" },
                    }}
                  />
                )}
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
                      <b>Identificación:</b> {quotation.cliente?.identificacion}
                    </Typography>
                  </Stack>

                  <Stack direction="row" alignItems="center" gap={1.5}>
                    <PhoneIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                    <Typography variant="body2">
                      <b>Teléfono:</b> {quotation.cliente?.telefono}
                    </Typography>
                  </Stack>

                  <Stack direction="row" alignItems="center" gap={1.5}>
                    <LocationOnIcon
                      sx={{ color: "text.secondary", fontSize: 20 }}
                    />
                    <Typography variant="body2">
                      <b>Dirección:</b> {quotation.cliente?.direccion?.detalle}
                    </Typography>
                  </Stack>
                </Stack>

                <Box
                  sx={{
                    minWidth: { xs: "100%", sm: "200px" },
                    mt: { xs: 2, sm: 0 },
                  }}
                >
                  {quotation.status !== "creada" && (
                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      onClick={() => handleOpenQuotation(quotation)}
                      endIcon={<ReceiptLongIcon />}
                      sx={{
                        backgroundColor: (theme) =>
                          theme.palette.mode === "light"
                            ? "primary.main"
                            : "secondary.main",
                        color: "primary.contrastText",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        py: 1.5,
                        "&:hover": {
                          backgroundColor: (theme) =>
                            theme.palette.mode === "light"
                              ? "primary.dark"
                              : "secondary.dark",
                        },
                      }}
                    >
                      Crear Cotización
                    </Button>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>
        ))
      )}
    </Box>
  );
}
