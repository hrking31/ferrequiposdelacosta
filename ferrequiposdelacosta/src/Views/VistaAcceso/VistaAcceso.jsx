import { Box, Paper, Typography } from "@mui/material";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../Context/useAuth";
import Login from "../../Components/Login/Login";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo";
import LogoFerrequipos from "../../assets/LogoFerrequipos.svg";

// LA PUERTA DEL PERSONAL (pedido del dueño, 2026-11-06): el personal entra
// siempre por /acceso y los clientes usan la dirección normal. Antes el
// inicio de sesión colgaba de "Mi cuenta" en el menú de la tienda, y al
// cliente le hacía pensar que alquilar pedía una cuenta.
//
// Con la sesión ya abierta no hay nada que hacer acá: pasa al menú.
export default function VistaAcceso() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingLogo />;
  if (user) return <Navigate to="/adminforms" replace />;

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        px: 2,
        py: 4,
        bgcolor: "background.default",
      }}
    >
      <Paper sx={{ width: "min(420px, 100%)", p: { xs: 2.5, sm: 3.5 } }}>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
          {/* El círculo blanco de siempre: el logo es rojo y azul y en modo
              oscuro se pierde sobre el fondo (ver BotonTienda). */}
          <Box
            sx={{
              p: 0.75,
              borderRadius: "50%",
              bgcolor: "common.white",
              boxShadow: (theme) => theme.shadows[2],
            }}
          >
            <img
              src={LogoFerrequipos}
              alt="Ferrequipos"
              style={{ display: "block", width: 56, height: 56, objectFit: "cover" }}
            />
          </Box>
          <Typography
            variant="overline"
            sx={{ color: "custom.accent", fontWeight: 700, letterSpacing: 1.5 }}
          >
            Acceso del personal
          </Typography>
        </Box>

        <Login />
      </Paper>
    </Box>
  );
}
