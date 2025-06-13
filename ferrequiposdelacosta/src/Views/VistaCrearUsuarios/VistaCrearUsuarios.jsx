import { Typography, Box, Grid, Button } from "@mui/material";
import Register from "../../Components/Register/Register";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useAuth } from "../../Context/AuthContext";

export default function VistaCrearUsuarios() {
  const { name, genero } = useSelector((state) => state.user);
  const { logout } = useAuth();

  const saludo = genero === "femenino" ? "Bienvenida" : "Bienvenido";

  const handlerLogout = async () => {
    await logout();
  };

  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h4" color="text.primary">
        {saludo} {name}.
      </Typography>
      <Register />
      <Grid
        container
        spacing={2}
        justifyContent="center"
        sx={{
          marginBottom: 4,
          mb: {
            xs: 8,
            sm: 8,
            md: 8,
            lg: 2,
          },
        }}
      >
        <Grid item xs={12} sm={6} md={4}>
          <Button
            component={Link}
            to="/adminforms"
            variant="contained"
            fullWidth
          >
            MENU
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
}
