import {
  Box,
  Grid,
  Stack,
  Button,
  Typography,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import { useSelector } from "react-redux";
import EliminarEquipos from "../../Components/EliminarEquipos/EliminarEquipos";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";

const VistaEliminaEquipo = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { name, photoURL, role, genero, permisos } = useSelector(
    (state) => state.user,
  );
  const { user, logout } = useAuth();
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
        // border: "2px solid red",
      }}
    >
      <Box sx={{ p: 2, flexShrink: 0 }}>
        <HeaderUsuarioConModal
          name={name}
          photoURL={photoURL}
          role={role}
          genero={genero}
        />
      </Box>

      <Box sx={{ flexGrow: 1, mb: 2 }}>
        <EliminarEquipos />
      </Box>

      <Box
        sx={{
          p: 1.5,
          flexShrink: 0,
          // border: "2px solid red",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="center"
          alignItems="center"
          // border="2px solid red"
        >
          <Button
            variant="contained"
            fullWidth
            onClick={() => navigate("/adminforms")}
          >
            SELECCIONA OTRO EQUIPO
          </Button>

          <Button onClick={handlerLogout} variant="danger" fullWidth>
            CERRAR SESIÓN
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

export default VistaEliminaEquipo;
