import {
  Box,
  Grid,
  Stack,
  Button,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  setFormCuentaCobro,
  setItemsCc,
  setTotalCc,
} from "../../Store/Slices/cuentacobroSlice";
import { useAuth } from "../../Context/AuthContext";
import CuentaDeCobro from "../../Components/CuentaDeCobro/CuentaDeCobro";
import VistaCcWeb from "../../Components/VistaWeb/VistaCcWeb";
import VistaCcPdf from "../../Components/VistaPdf/VistaCcPdf";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";

export default function VistaCuentaDeCobro() {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const values = useSelector((state) => state.cuentacobro);
  const { name, photoURL, role, genero, permisos } = useSelector(
    (state) => state.user,
  );
  const { logout } = useAuth();
  const isFullScreen = useMediaQuery("(max-width:915px)");
  const [loading, setLoading] = useState(false);

  const clearForm = () => {
    dispatch(
      setFormCuentaCobro({
        empresa: "",
        obra: "",
        concepto: "",
        nit: "",
        fecha: "",
      }),
    );
    dispatch(setItemsCc([]));
    dispatch(setTotalCc("0"));
  };

  const handleClick = () => {
    setLoading(true);
    setTimeout(() => {
      VistaCcPdf(values);
      setLoading(false);
    }, 200);
  };

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
          vista={"Crear Cuenta de Cobro"}
        />
      </Box>

      <Box sx={{ mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <CuentaDeCobro />
          </Grid>
          <Grid item xs={12} md={6}>
            <VistaCcWeb />
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ flexGrow: 1, mb: 2 }}>
        <Grid container spacing={2} justifyContent="center">
          <Grid item xs={10} sm={4} md={4}>
            <Button
              variant="success"
              fullWidth
              sx={{ flex: 1, whiteSpace: "nowrap" }}
              onClick={handleClick}
            >
              {loading ? "Cargando..." : "Descargar PDF"}
            </Button>
          </Grid>

          <Grid item xs={10} sm={4} md={4}>
            <Button variant="danger" onClick={clearForm} fullWidth>
              Cancelar
            </Button>
          </Grid>
        </Grid>
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
