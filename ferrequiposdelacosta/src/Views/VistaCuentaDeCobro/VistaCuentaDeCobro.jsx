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
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  limpiarCuentaCobro,
  setFormCuentaCobro,
} from "../../Store/Slices/cuentacobroSlice";
import {
  generarCuentaCobroId,
  guardarCuentaCobro,
} from "../../Components/CuentaDeCobro/cuentasCobroDb";
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
  const usuario = useSelector((state) => state.user);
  const { name, photoURL, role, genero } = usuario;
  const { logout } = useAuth();
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();
  const isFullScreen = useMediaQuery("(max-width:915px)");
  const [loading, setLoading] = useState(false);
  // null | "salir" | "logout" — qué acción está esperando confirmación
  const [pendingAction, setPendingAction] = useState(null);

  const cuenta = values.value;

  // El número del documento se asigna al abrir la pantalla y ya no cambia: es
  // lo que se ve de marca de agua en la hoja mientras se llena, así que tiene
  // que existir antes de guardar nada.
  useEffect(() => {
    if (!cuenta.cuentaCobroId) {
      dispatch(
        setFormCuentaCobro({ ...cuenta, cuentaCobroId: generarCuentaCobroId() }),
      );
    }
    // Solo interesa la primera vez; el resto del formulario cambia todo el
    // tiempo y no tiene por qué volver a entrar acá.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuenta.cuentaCobroId, dispatch]);

  // Si el usuario cargó algo. Una cuenta en blanco no se guarda ni se
  // pregunta al salir: llenaría la base de documentos vacíos.
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

  // Único punto de guardado. Devuelve la cuenta ya guardada, o null si falló:
  // ante un error NO se sigue adelante —no se limpia ni se sale— para que el
  // trabajo no se pierda por un problema de red o de permisos.
  const guardar = async (estado) => {
    try {
      const id = await guardarCuentaCobro(cuenta, estado, usuario);
      return { ...cuenta, id, status: estado };
    } catch (error) {
      console.error(`Error al guardar la cuenta de cobro (${estado}):`, error);
      showSnackbar(
        `No se pudo guardar la cuenta de cobro: ${error.message}`,
        "error",
      );
      return null;
    }
  };

  const salirAlMenu = () => {
    dispatch(limpiarCuentaCobro());
    navigate("/adminforms");
  };

  // Emitir: guarda la cuenta como creada, baja el PDF y cierra el trabajo,
  // igual que la cotización. Ya queda registrada en la base, así que limpiar
  // el formulario no pierde nada.
  const handleDescargarPdf = async () => {
    const falta = faltantes();
    if (falta.length > 0) {
      showSnackbar(`Antes de descargar falta ${falta.join(", ")}.`, "warning");
      return;
    }

    setLoading(true);
    const guardada = await guardar("creada");
    if (!guardada) {
      setLoading(false);
      return;
    }

    VistaCcPdf({ value: guardada });
    setLoading(false);
    salirAlMenu();
  };

  const guardarYSalir = async () => {
    setPendingAction(null);
    setLoading(true);
    const guardada = await guardar("pausada");
    setLoading(false);
    if (!guardada) return;
    salirAlMenu();
  };

  const descartarYSalir = () => {
    setPendingAction(null);
    salirAlMenu();
  };

  const handleGuardarYSalirClick = () => {
    if (hayContenido) {
      setPendingAction("salir");
      return;
    }
    salirAlMenu();
  };

  const handleGuardarYCerrarSesion = async () => {
    setPendingAction(null);
    setLoading(true);
    const guardada = await guardar("pausada");
    setLoading(false);
    if (!guardada) return;
    dispatch(limpiarCuentaCobro());
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
            cotId={cuenta.cuentaCobroId}
          />
        </Box>

        {/* En computador las tres acciones viven acá arriba, igual que en la
            cotización; en celular bajan al pie de la pantalla. */}
        {!isFullScreen && (
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Tooltip title="Descargar PDF">
              <span>
                <IconButton
                  onClick={handleDescargarPdf}
                  disabled={loading}
                  color="success"
                >
                  <PictureAsPdfIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Guardar y salir">
              <span>
                <IconButton
                  onClick={handleGuardarYSalirClick}
                  disabled={loading}
                  color="success"
                >
                  <DashboardIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Cerrar sesión">
              <span>
                <IconButton
                  onClick={handleLogoutClick}
                  disabled={loading}
                  color="error"
                >
                  <LogoutIcon />
                </IconButton>
              </span>
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
                  sx={{ flex: 1 }}
                  onClick={handleDescargarPdf}
                  disabled={loading}
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
              disabled={loading}
            >
              Guardar y Salir
            </Button>

            <Button
              onClick={handleLogoutClick}
              variant="contained"
              color="error"
              fullWidth
              size="small"
              disabled={loading}
            >
              CERRAR SESION
            </Button>
          </Stack>
        </Box>
      )}

      <Dialog open={Boolean(pendingAction)} onClose={() => setPendingAction(null)}>
        <DialogTitle>Tienes una cuenta de cobro sin emitir</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {pendingAction === "logout"
              ? "¿Querés guardarla para seguir después de cerrar sesión, o descartarla?"
              : "¿Querés guardarla para seguir después, o descartarla?"}
          </DialogContentText>
        </DialogContent>
        {/* El tamaño de los botones y el bajar de renglón los pone el tema
            (ver MuiDialogActions). */}
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {/* Con borde y sin relleno: se ve como botón, pero el color lleno se
              reserva para las dos acciones de verdad —descartar y guardar—. */}
          <Button
            variant="outlined"
            onClick={() => setPendingAction(null)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={
              pendingAction === "logout"
                ? handleCerrarSesionSinGuardar
                : descartarYSalir
            }
            variant="contained"
            color="error"
            disabled={loading}
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
            disabled={loading}
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
