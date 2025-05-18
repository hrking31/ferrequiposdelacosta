import { Typography, Box, Grid, Button } from "@mui/material";
import EliminarUsuario from "../../Components/EliminarUsuario/EliminarUsuario";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useAuth } from "../../Context/AuthContext";

export default function VistaEliminarUsuario() {
  const {name, genero} = useSelector((state) => state.user);
  const { logout } = useAuth();

  const saludo = genero === "femenino" ? "Bienvenida" : "Bienvenido";

  const handlerLogout = async () => {
    await logout();
  };

  return (
    <Box sx={{ padding: 2 }}>
      <Typography
        variant="h4"
        sx={{ color: "#8B3A3A", fontWeight: "bold", mb: 4 }}
      >
        {saludo} {name}
      </Typography>
      <EliminarUsuario />
      <Grid
        container
        spacing={2}
        justifyContent="center"
        sx={{ marginBottom: 4, mt: 2 }}
      >
        <Grid item xs={12} sm={6} md={4}>
          <Button
            component={Link}
            to="/adminforms"
            variant="contained"
            fullWidth
            sx={{
              height: "45px",
              color: "#ffffff",
              backgroundColor: "#1E90FF",
              "&:hover": {
                backgroundColor: "#4682B4",
              },
            }}
          >
            MENU
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Button
            onClick={handlerLogout}
            variant="contained"
            fullWidth
            sx={{
              height: "45px",
              color: "#ffffff",
              backgroundColor: "#1E90FF",
              "&:hover": {
                backgroundColor: "#DC143C",
              },
              margin: "0 auto",
            }}
          >
            CERRAR SESIÓN
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}
