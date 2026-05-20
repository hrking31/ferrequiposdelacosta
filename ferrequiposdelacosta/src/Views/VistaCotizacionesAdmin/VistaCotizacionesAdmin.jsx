import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useAuth } from "../../Context/AuthContext";
import AdminCotizaciones from "../../Components/AdminCotizaciones/AdminCotizaciones";
import { Box, Grid, Button, useTheme, useMediaQuery } from "@mui/material";

export default function VistaCotizacion() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const theme = useTheme();
  const isFullScreen = useMediaQuery("(max-width:915px)");
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
      <Box
        sx={{
          mb: 2,
          //  border: "2px solid red"
        }}
      >
        <Grid item xs={12} md={6}>
          <AdminCotizaciones />
        </Grid>
      </Box>

      <Box
        sx={{
          mb: 2,
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
