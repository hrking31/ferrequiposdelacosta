import { Link } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import Button from "@mui/material/Button";
import { useSelector } from "react-redux";
import { Typography, Box, Grid } from "@mui/material";

export default function AdminForms() {
  const { logout } = useAuth();
  const { name, genero, permisos } = useSelector((state) => state.user);

  const saludo = genero === "femenino" ? "Bienvenida" : "Bienvenido";

  const handlerLogout = async () => {
    await logout();
  };

  return (
    <Box sx={{ padding: 2, textAlign: "center" }}>
      <Box sx={{ marginBottom: 4 }}>
        <Typography variant="h4" sx={{ color: "#8B3A3A", fontWeight: "bold" }}>
          {saludo} {name} ¿Qué vamos a hacer hoy?
        </Typography>
      </Box>

      <Grid
        container
        spacing={2}
        justifyContent="center"
        sx={{ marginBottom: 4 }}
      >
        <Grid item xs={12} sm={6} md={4}>
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
        <Grid item xs={12} sm={6} md={4}>
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
        <Grid item xs={12} sm={6} md={4}>
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
        <Grid item xs={12} sm={6} md={4}>
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
        <Grid item xs={12} sm={6} md={4}>
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
        <Grid item xs={12} sm={6} md={4}>
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
        <Grid item xs={12} sm={6} md={4}>
          <Button onClick={handlerLogout} variant="danger" fullWidth>
            CERRAR SESIÓN
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}
