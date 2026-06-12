import {
  Box,
  Grid,
  Button,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useAuth } from "../../Context/AuthContext";
import Register from "../../Components/Register/Register";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";

export default function VistaCrearUsuarios() {
  const theme = useTheme();
  const { name, photoURL } = useSelector((state) => state.user);
  const { logout } = useAuth();
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
        overflow: "hidden",
        boxSizing: "border-box",
        //  border: "2px solid red"
      }}
    >
      
      <Box sx={{ p: 2, flexShrink: 0 }}>
        <HeaderUsuarioConModal name={name} photoURL={photoURL} />
      </Box>

      {/* Contenido Principal */}
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 1,
          my: 1,
          //  border: "2px solid red"
        }}
      >
        <Register />
      </Box>

      <Box
        sx={{
          p: 1,
          flexShrink: 0,
          //  border: "2px solid red"
        }}
      >
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
