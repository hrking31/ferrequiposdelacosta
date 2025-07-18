import { Link } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import { useSelector } from "react-redux";
import EditarEquipos from "../../Components/EditarEquipos/EditarEquipos";
import {
  Typography,
  Box,
  Grid,
  Button,
  useTheme,
  useMediaQuery,
} from "@mui/material";

const VistaEditarEquipo = () => {
  const { logout } = useAuth();
  const { name, genero } = useSelector((state) => state.user);
  const theme = useTheme();
   const isFullScreen = useMediaQuery("(max-width:915px)");

  const saludo = genero === "femenino" ? "Bienvenida" : "Bienvenido";

  const handlerLogout = async () => {
    await logout();
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        pt: isFullScreen ? { xs: 1, sm: 1.5 } : 10,
        pb: isFullScreen ? { xs: 8, sm: 9 } : 1.5,
        pl: { xs: 1, sm: 1.5 },
        pr: { xs: 1, sm: 1.5 },
        overflow: "auto",
        boxSizing: "border-box",
        // border: "2px solid red",
      }}
    >
      <Box sx={{ flexGrow: 1, mb: 2 }}>
        <Typography variant="h5" color="text.primary">
          {saludo} {name}, Vas a editar el equipo?
        </Typography>

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
