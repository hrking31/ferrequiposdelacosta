import { Box, Grid, Button, useTheme, useMediaQuery } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useAuth } from "../../Context/AuthContext";
import AdminCotizaciones from "../../Components/AdminCotizaciones/AdminCotizaciones";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";

export default function VistaCotizacion() {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const isFullScreen = useMediaQuery("(max-width:915px)");
  const { name, photoURL } = useSelector((state) => state.user);
  const [loading, setLoading] = useState(false);

  const handlerLogout = async () => {
    setLoading(true);
    await logout();
    setLoading(false);
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
        border: "2px solid red",
      }}
    >
      <Box sx={{ p: 2, flexShrink: 0 }}>
        <HeaderUsuarioConModal name={name} photoURL={photoURL} />
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "center",
          p: 1,
          my: 1,
          //  border: "2px solid red"
        }}
      >
        <AdminCotizaciones />

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
              variant="contained"
              fullWidth
              onClick={() => navigate("/adminforms")}
            >
              MENU
            </Button>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Button
              onClick={handlerLogout}
              variant="danger"
              fullWidth
              sx={{ flex: 1, whiteSpace: "nowrap" }}
            >
              CERRAR SESION
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
