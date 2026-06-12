import {
  Typography,
  Box,
  Grid,
  Button,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Link } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import { useSelector } from "react-redux";
import EditarEquipos from "../../Components/EditarEquipos/EditarEquipos";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";

const VistaEditarEquipo = () => {
  const { logout } = useAuth();
  const { name, photoURL } = useSelector((state) => state.user);
  const theme = useTheme();
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
        <HeaderUsuarioConModal name={name} photoURL={photoURL} />
      </Box>

      <Box sx={{ flexGrow: 1, mb: 2 }}>
        <EditarEquipos />
      </Box>

      <Box sx={{ mb: 2 }}>
        <Grid container spacing={2} justifyContent="center">
          <Grid item xs={12} sm={6} md={4}>
            <Button
              component={Link}
              to="/vistaseleccionarequipo"
              variant="contained"
              fullWidth
            >
              SELECCIONA OTRO EQUIPO
            </Button>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Button onClick={handlerLogout} variant="danger" fullWidth>
              CERRAR SESIÓN
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default VistaEditarEquipo;
