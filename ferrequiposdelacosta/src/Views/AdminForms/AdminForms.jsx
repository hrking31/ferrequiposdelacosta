import { Link } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import { useSelector } from "react-redux";
import {
  Typography,
  Box,
  Grid,
  Button,
  useTheme,
  useMediaQuery,
} from "@mui/material";

export default function AdminForms() {
  const { logout } = useAuth();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery("(max-width:600px)");
  const isMediumScreen = useMediaQuery(
    "(min-width:601px) and (max-width:915px)"
  );
  const { name, genero, permisos } = useSelector((state) => state.user);
  const saludo = genero === "femenino" ? "Bienvenida" : "Bienvenido";

  const handlerLogout = async () => {
    await logout();
  };

  let appBarHeight = 64;

  if (isSmallScreen) {
    appBarHeight = 56;
  } else if (isMediumScreen) {
    appBarHeight = 64;
  }

  return (
    <Box
      sx={{
        height: `calc(100vh - ${appBarHeight}px)`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        p: 2,
        overflow: "auto",
        boxSizing: "border-box",
        // border: "2px solid red",
      }}
    >
      <Box sx={{ mb: 8 }}>
        <Typography
          variant="h4"
          sx={{
            color: theme.palette.text.secondary,
          }}
        >
          {saludo} {name}, Qué vamos a hacer hoy?
        </Typography>
      </Box>

      <Box
        sx={{
          flex: 1,
        }}
      >
        <Grid
          container
          justifyContent="center"
          spacing={{ xs: 2, sm: 4, md: 6 }}
          px={{ xs: 1, sm: 3, md: 6 }}
        >
          <Grid item xs={12} sm={6} md={6}>
            {permisos.includes("cotizacion") && (
              <Button
                component={Link}
                to="/vistacotizacion"
                variant="contained"
                fullWidth
              >
                COTIZACIÓN
              </Button>
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={6}>
            {permisos.includes("cuentaCombro") && (
              <Button
                component={Link}
                to="/vistacuentadecobro"
                variant="contained"
                fullWidth
              >
                CUENTA DE COBRO
              </Button>
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={6}>
            {permisos.includes("crearEquipos") && (
              <Button
                component={Link}
                to="/vistacreaequipo"
                variant="contained"
                fullWidth
              >
                CREAR EQUIPO
              </Button>
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={6}>
            {permisos.includes("eliminarEditarEquipos") && (
              <Button
                component={Link}
                to="/vistaseleccionarequipo"
                variant="contained"
                fullWidth
              >
                EDITAR o ELIMINAR EQUIPO
              </Button>
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={6}>
            {permisos.includes("crearUsuarios") && (
              <Button
                component={Link}
                to="/VistaCrearUsuarios"
                variant="contained"
                fullWidth
              >
                CREAR USUARIOS
              </Button>
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={6}>
            {permisos.includes("eliminarUsuarios") && (
              <Button
                component={Link}
                to="/VistaEliminarUsuario"
                variant="contained"
                fullWidth
              >
                ELIMINAR USUARIOS
              </Button>
            )}
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mt: 4, mb: 2 }}>
        <Grid container justifyContent="center">
          <Grid item xs={12} sm={5} md={4}>
            <Button onClick={handlerLogout} variant="danger" fullWidth>
              CERRAR SESIÓN
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
