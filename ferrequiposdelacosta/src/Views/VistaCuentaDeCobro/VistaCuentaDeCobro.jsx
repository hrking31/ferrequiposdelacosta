import {
  Box,
  Grid,
  Stack,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  useMediaQuery,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LogoutIcon from "@mui/icons-material/Logout";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
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
  // null | "salir" | "logout" — qué acción está esperando confirmación
  const [pendingAction, setPendingAction] = useState(null);

  const cuenta = values.value;

  // La cuenta no se guarda en la base: vive en la sesión (localStorage), y el
  // slice la persiste sola en cada cambio. Por eso "guardar y salir" es
  // simplemente salir dejándola ahí, y lo que hay que preguntar antes es si la
  // quiere conservar para después o descartarla.
  const hayContenido = Boolean(
    (cuenta.items || []).length > 0 ||
      cuenta.empresa?.trim() ||
      cuenta.nit?.trim() ||
      cuenta.obra?.trim() ||
      cuenta.direccion?.trim() ||
      cuenta.concepto?.trim(),
  );

  // Qué le falta a la cuenta para poder emitirse. Se revisa al pedir el PDF y
  // no deshabilitando el botón: así el usuario ve QUÉ falta en vez de un botón
  // apagado sin explicación.
  const faltantes = () => {
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

  // Descarga el PDF y deja la cuenta como está: a diferencia de la cotización
  // —que al descargarse queda creada en la base— esta no se registra en ningún
  // lado, así que borrarla acá sería perder el trabajo.
  const handleDescargarPdf = () => {
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

  const guardarYSalir = () => {
    setPendingAction(null);
    navigate("/adminforms");
  };

  const salirSinGuardar = () => {
    setPendingAction(null);
    dispatch(limpiarCuentaCobro());
    navigate("/adminforms");
  };

  const handleGuardarYSalirClick = () => {
    if (hayContenido) {
      setPendingAction("salir");
      return;
    }
    salirSinGuardar();
  };

  const handleGuardarYCerrarSesion = async () => {
    setPendingAction(null);
    await logout();
  };

  const handleCerrarSesionSinGuardar = async () => {
    setPendingAction(null);
    dispatch(limpiarCuentaCobro());
    await logout();
  };

  const handleLogoutClick = () => {
    if (hayContenido) {
      setPendingAction("logout");
      return;
    }
    logout();
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

        {/* En computador las tres acciones viven acá arriba, igual que en la
            cotización; en celular bajan al pie de la pantalla. */}
        {!isFullScreen && (
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Tooltip title="Descargar PDF">
              <IconButton onClick={handleDescargarPdf} color="success">
                <PictureAsPdfIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Guardar y salir">
              <IconButton onClick={handleGuardarYSalirClick} color="success">
                <DashboardIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Cerrar sesión">
              <IconButton onClick={handleLogoutClick} color="error">
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

        {isFullScreen && (
          <Box sx={{ mb: 2 }}>
            <Grid container spacing={2} justifyContent="center">
              <Grid item xs={10} sm={6} md={4}>
                <Button
                  variant="contained"
                  color="success"
                  fullWidth
                  sx={{ flex: 1, whiteSpace: "nowrap" }}
                  onClick={handleDescargarPdf}
                >
                  {loading ? "Cargando..." : "Descargar PDF"}
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}
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
              color="success"
              fullWidth
              size="small"
              onClick={handleGuardarYSalirClick}
            >
              Guardar y Salir
            </Button>

            <Button
              onClick={handleLogoutClick}
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

      <Dialog open={Boolean(pendingAction)} onClose={() => setPendingAction(null)}>
        <DialogTitle>Tienes una cuenta de cobro sin terminar</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {pendingAction === "logout"
              ? "¿Querés conservarla para seguir después de cerrar sesión, o descartarla?"
              : "¿Querés conservarla para seguir después, o descartarla?"}
          </DialogContentText>
        </DialogContent>
        {/* El tamaño de los botones y el bajar de renglón los pone el tema
            (ver MuiDialogActions). */}
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {/* Con borde y sin relleno: se ve como botón, pero el color lleno se
              reserva para las dos acciones de verdad —descartar y guardar—. */}
          <Button variant="outlined" onClick={() => setPendingAction(null)}>
            Cancelar
          </Button>
          <Button
            onClick={
              pendingAction === "logout"
                ? handleCerrarSesionSinGuardar
                : salirSinGuardar
            }
            variant="contained"
            color="error"
          >
            {pendingAction === "logout"
              ? "Descartar y cerrar sesión"
              : "Descartar y salir"}
          </Button>
          <Button
            onClick={
              pendingAction === "logout"
                ? handleGuardarYCerrarSesion
                : guardarYSalir
            }
            variant="contained"
            color="success"
          >
            {pendingAction === "logout"
              ? "Guardar y cerrar sesión"
              : "Guardar y salir"}
          </Button>
        </DialogActions>
      </Dialog>

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Box>
  );
}
