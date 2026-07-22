import {
  Box,
  Grid,
  Stack,
  Button,
  IconButton,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LogoutIcon from "@mui/icons-material/Logout";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  setFormCuentaCobro,
  setItemsCc,
  setTotalCc,
} from "../../Store/Slices/cuentacobroSlice";
import { useAuth } from "../../Context/useAuth";
import CuentaDeCobro from "../../Components/CuentaDeCobro/CuentaDeCobro";
import VistaCcWeb from "../../Components/VistaWeb/VistaCcWeb";
import VistaCcPdf from "../../Components/VistaPdf/VistaCcPdf";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";

export default function VistaCuentaDeCobro() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const values = useSelector((state) => state.cuentacobro);
  const { name, photoURL, role, genero } = useSelector(
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
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <Box sx={{ p: 2, flexShrink: 0, display: "flex", alignItems: "center", gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <HeaderUsuarioConModal
            name={name}
            photoURL={photoURL}
            role={role}
            genero={genero}
            vista={"Crear Cuenta de Cobro"}
          />
        </Box>

        {!isFullScreen && (
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Tooltip title="Menú">
              <IconButton onClick={() => navigate("/adminforms")}>
                <DashboardIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Cerrar sesión">
              <IconButton onClick={handlerLogout} color="error">
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto",
        //  border: "2px solid red"
          }}>
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

        <Box sx={{ mb: 2 }}>
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
      </Box>

      {isFullScreen && (
        <Box sx={{ p: 1.5, flexShrink: 0 }}>
          <Stack
            direction="row"
            spacing={2}
            justifyContent="center"
            alignItems="stretch"
          >
            <Button
              variant="contained"
              fullWidth
              sx={{ py: 0.75, px: 1, fontSize: "0.75rem" }}
              onClick={() => navigate("/adminforms")}
            >
              MENU
            </Button>

            <Button
              onClick={handlerLogout}
              variant="danger"
              fullWidth
              sx={{ py: 0.75, px: 1, fontSize: "0.75rem" }}
            >
              CERRAR SESION
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}
