import { Box, Paper, Typography } from "@mui/material";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../Context/useAuth";
import Login from "../../Components/Login/Login";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo";
import LogoCarne from "../../Components/HeaderUsuario/LogoCarne";

// LA PUERTA DEL PERSONAL: la dirección sola de la app del personal
// (personal.ferrequiposdelacosta.com, desde el 2026-11-07). Antes el inicio
// de sesión colgaba de "Mi cuenta" en el menú de la tienda, y al cliente le
// hacía pensar que alquilar pedía una cuenta; el 2026-11-06 pasó a /acceso,
// dentro de la misma app de la tienda, y al día siguiente a su propia app.
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
          <LogoCarne alto={96} />
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
