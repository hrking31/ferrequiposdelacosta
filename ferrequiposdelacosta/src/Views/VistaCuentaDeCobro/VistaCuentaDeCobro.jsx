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
import { limpiarCuentaCobro } from "../../Store/Slices/cuentacobroSlice";
import { useAuth } from "../../Context/useAuth";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../../Components/AppSnackbar/AppSnackbar";
import CuentaDeCobro from "../../Components/CuentaDeCobro/CuentaDeCobro";
import VistaCcWeb from "../../Components/VistaWeb/VistaCcWeb";
import VistaCcPdf from "../../Components/VistaPdf/VistaCcPdf";
import ReceiptIcon from "@mui/icons-material/Receipt";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";

export default function VistaCuentaDeCobro() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const values = useSelector((state) => state.cuentacobro);
  const { name, photoURL, role, genero } = useSelector(
    (state) => state.user,
  );
  const { logout } = useAuth();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();
  const isFullScreen = useMediaQuery("(max-width:915px)");
  const [loading, setLoading] = useState(false);

  // Deja la cuenta en blanco y borra la sesión guardada. Antes se hacía con
  // tres dispatches y el primero reemplazaba el estado entero sin incluir los
  // ítems, así que la lista quedaba inexistente por un instante.
  const clearForm = () => {
    dispatch(limpiarCuentaCobro());
  };

  // Qué le falta a la cuenta para poder emitirse. Se revisa al pedir el PDF y
  // no deshabilitando el botón: así el usuario ve QUÉ falta en vez de un botón
  // apagado sin explicación.
  const faltantes = () => {
    const cuenta = values.value;
    const falta = [];
    if (!cuenta.fecha) falta.push("la fecha");
    if (!cuenta.empresa?.trim()) falta.push("la empresa");
    if (!cuenta.nit?.trim()) falta.push("el NIT");
    if (!cuenta.concepto?.trim()) falta.push("el concepto");

    const items = cuenta.items || [];
    if (items.length === 0) {
      falta.push("al menos un ítem");
    } else if (items.some((item) => !item.description?.trim())) {
      falta.push("la descripción de todos los ítems");
    } else if (items.some((item) => !(Number(item.subtotal) > 0))) {
      falta.push("cantidad, días y precio en todos los ítems");
    }
    return falta;
  };

  const handleClick = () => {
    const falta = faltantes();
    if (falta.length > 0) {
      showSnackbar(`Antes de descargar falta ${falta.join(", ")}.`, "warning");
      return;
    }

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
      <Box sx={{ px: 0, py: 2, flexShrink: 0, display: "flex", alignItems: "center", gap: 1, "@media (min-width:916px)": { px: 2 } }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <HeaderUsuarioConModal
            name={name}
            photoURL={photoURL}
            role={role}
            genero={genero}
            vista={"Crear Cuenta de Cobro"}
            descripcion={"Genera la cuenta de cobro de un servicio"}
            icono={<ReceiptIcon />}
          />
        </Box>

        {!isFullScreen && (
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Tooltip title="Menú">
              <IconButton onClick={() => navigate("/adminforms")} color="primary">
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
        mx: isFullScreen ? 0 : 2
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
                variant="contained"
                color="success"
                fullWidth
                sx={{ flex: 1, whiteSpace: "nowrap" }}
                onClick={handleClick}
              >
                {loading ? "Cargando..." : "Descargar PDF"}
              </Button>
            </Grid>

            <Grid item xs={10} sm={4} md={4}>
              <Button variant="contained" color="error" onClick={clearForm} fullWidth>
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
              size="small"
              onClick={() => navigate("/adminforms")}
            >
              MENU
            </Button>

            <Button
              onClick={handlerLogout}
              variant="contained"
              color="error"
              fullWidth
              size="small"
            >
              CERRAR SESION
            </Button>
          </Stack>
        </Box>
      )}

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Box>
  );
}
