import {
  Typography,
  Box,
  Grid,
  Button,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import Register from "../../Components/Register/Register";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useAuth } from "../../Context/AuthContext";

export default function VistaCrearUsuarios() {
  const { name, genero } = useSelector((state) => state.user);
  const { logout } = useAuth();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery("(max-width:600px)");
  const isMediumScreen = useMediaQuery(
    "(min-width:601px) and (max-width:915px)"
  );

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
        justifyContent: "space-between",
        p: 2,
        overflow: "auto",
        boxSizing: "border-box",
        // border: "2px solid red",
      }}
    >
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="h4" color="text.primary">
          {saludo} {name}.
        </Typography>
      </Box>

      <Box sx={{ flexGrow: 1 }}>
        <Register />
      </Box>

      <Box sx={{ mb: 2}}>
        <Grid container spacing={2} justifyContent="center">
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
    </Box>
  );
}
