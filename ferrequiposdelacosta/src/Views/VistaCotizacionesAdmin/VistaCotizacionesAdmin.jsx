import {
  Box,
  Stack,
  Button,
  useMediaQuery,
} from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useAuth } from "../../Context/useAuth";
import AdminCotizaciones from "../../Components/AdminCotizaciones/AdminCotizaciones";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";

export default function VistaCotizacion() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const isFullScreen = useMediaQuery("(max-width:915px)");
  const { name, photoURL, role, genero } = useSelector(
    (state) => state.user,
  );
  const [, setLoading] = useState(false);

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
        // border: "2px solid red",
      }}
    >
      <Box sx={{ p: 2, flexShrink: 0 }}>
        <HeaderUsuarioConModal
          name={name}
          photoURL={photoURL}
          role={role}
          genero={genero}
          vista={"Buzón de Cotizaciones"}
        />
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "center",
          //  border: "2px solid red"
        }}
      >
        <AdminCotizaciones/>
      </Box>

      <Box
        sx={{
          p: 1.5,
          flexShrink: 0,
          // border: "2px solid red",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="center"
          alignItems="center"
          // border="2px solid red"
        >
          <Button
            variant="contained"
            fullWidth
            onClick={() => navigate("/adminforms")}
          >
            MENU
          </Button>

          <Button onClick={handlerLogout} variant="danger" fullWidth>
            CERRAR SESION
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
