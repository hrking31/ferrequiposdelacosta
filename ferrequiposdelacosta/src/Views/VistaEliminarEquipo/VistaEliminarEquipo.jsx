import { Link } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import { Box, Grid, Button } from "@mui/material";
import EliminarEquipos from "../../Components/EliminarEquipos/EliminarEquipos";

const VistaEliminaEquipo = () => {
  const { user, logout } = useAuth();

  const handlerLogout = async () => {
    await logout();
  };

  return (
    <Box
      p={2}
      display="flex"
      flexDirection="column"
      gap={2}
    >
      <EliminarEquipos />
      <Grid container spacing={2} justifyContent="center" >
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
  );
};

export default VistaEliminaEquipo;
