import { Box, Stack, Button, useMediaQuery } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/useAuth";
import { useSelector } from "react-redux";
import ClienteDetalle from "../../Components/ClienteDetalle/ClienteDetalle";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";

export default function VistaClienteDetalle() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { name, photoURL, role, genero } = useSelector(
    (state) => state.user,
  );
  const isFullScreen = useMediaQuery("(max-width:915px)");

  const handlerLogout = async () => {
    await logout();
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        width: "100%",
        pt: isFullScreen ? 0 : { md: 8, lg: 9 },
        pb: isFullScreen ? { xs: 7, sm: 8 } : 2,
        px: { xs: 2, sm: 3 },
        overflow: "auto",
        boxSizing: "border-box",
      }}
    >
      <Box sx={{ p: 2, flexShrink: 0 }}>
        <HeaderUsuarioConModal
          name={name}
          photoURL={photoURL}
          role={role}
          genero={genero}
          vista={"Detalle Cliente"}
        />
      </Box>

      <Box sx={{ flexGrow: 1, mb: 2 }}>
        <ClienteDetalle />
      </Box>

      <Box sx={{ p: 1.5, flexShrink: 0 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="center"
          alignItems="center"
        >
          <Button
            variant="contained"
            fullWidth
            onClick={() => navigate("/adminforms")}
          >
            MENU
          </Button>

          <Button onClick={handlerLogout} variant="danger" fullWidth>
            CERRAR SESION
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
