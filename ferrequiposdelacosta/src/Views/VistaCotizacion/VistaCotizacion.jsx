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
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { ref, update, push } from "firebase/database";
import { database } from "../../Components/Firebase/Firebase.js";
import { useAuth } from "../../Context/useAuth";
import {
  resetCotizacion,
  setFormCotizacion,
} from "../../Store/Slices/cotizacionSlice";
import Cotizacion from "../../Components/Cotizacion/Cotizacion";
import VistaCotWeb from "../../Components/VistaWeb/VistaCotWeb";
import VistaCotPdf from "../../Components/VistaPdf/VistaCotPdf";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";

export default function VistaCotizacion() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const values = useSelector((state) => state.cotizacion.value);
  const { name, photoURL, role, genero } = useSelector(
    (state) => state.user,
  );
  const { logout } = useAuth();
  const isFullScreen = useMediaQuery("(max-width:915px)");
  const [loading, setLoading] = useState(false);
  // null | "salir" | "logout" — qué acción está esperando confirmación
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    if (!values.id && !values.cotizacionId) {
      dispatch(setFormCotizacion({ cotizacionId: `COT-${Date.now()}` }));
    }
  }, [values.id, values.cotizacionId, dispatch]);

  // Único punto de guardado: siempre persiste el formulario completo y decide
  // crear vs. actualizar según si ya existe values.id.
  const guardarCotizacion = async (nuevoEstado) => {
    try {
      const dataToSave = { ...values, status: nuevoEstado };

      if (values.id) {
        await update(ref(database, `cotizaciones/${values.id}`), dataToSave);
        return dataToSave;
      }

      const quotationRef = push(ref(database, "cotizaciones"));
      const nuevaCotizacion = {
        ...dataToSave,
        id: quotationRef.key,
        cotizacionId: values.cotizacionId || `COT-${Date.now()}`,
        createdAt: Date.now(),
      };
      await update(quotationRef, nuevaCotizacion);
      return nuevaCotizacion;
    } catch (error) {
      console.error(`Error al guardar cotización con estado ${nuevoEstado}:`, error);
      return values;
    }
  };

  // Corrige solo el estado (sin tocar los datos) de una cotización que ya
  // existía en la base. Se usa cuando el staff descarta sus cambios pero la
  // solicitud quedaría marcada "enProceso" para siempre si no se libera.
  const actualizarSoloEstado = async (nuevoEstado) => {
    if (!values.id) return;
    try {
      await update(ref(database, `cotizaciones/${values.id}`), { status: nuevoEstado });
    } catch (error) {
      console.error(`Error al actualizar el estado a ${nuevoEstado}:`, error);
    }
  };

  const sinEquipos = !values.items.some(
    (item) =>
      item.description?.trim() && Number(item.quantity) > 0 && Number(item.price) > 0,
  );

  const hayDatosCliente = Boolean(
    values.empresa?.trim() ||
      values.nit?.trim() ||
      values.telefono?.trim() ||
      values.direccion?.trim() ||
      values.barrio?.trim() ||
      values.otrosDatos?.trim(),
  );

  // Si ya existe en la base (values.id) hay que guardar el progreso sí o sí.
  // Si es una cotización nueva (sin id), solo vale la pena guardar si el
  // staff ya cargó algo (equipos o datos del cliente) — evita crear
  // solicitudes en blanco en el buzón.
  const hayContenido = Boolean(values.id) || !sinEquipos || hayDatosCliente;

  const telefonoDigits = String(values.telefono || "").replace(/\D/g, "");
  const telefono = telefonoDigits.startsWith("57") ? telefonoDigits : `57${telefonoDigits}`;
  const sinTelefono = telefonoDigits.length === 0;
  const message = encodeURIComponent(`
    Hola 👋

    Hemos preparado su cotización 📄

    Número: ${values.cotizacionId}

    En el PDF encontrará el detalle de equipos, tiempos y valores correspondientes.

    Quedamos atentos a cualquier ajuste o confirmación.

    FERREQUIPOS DE LA COSTA

    Gracias 🙏
`);

  const whatsappLink = `https://wa.me/${telefono}?text=${message}`;

  const handleDescargarPdf = async () => {
    if (sinEquipos) return;

    setLoading(true);
    const cotizacionGuardada = await guardarCotizacion("creada");
    VistaCotPdf(cotizacionGuardada);
    dispatch(resetCotizacion());
    setLoading(false);
    navigate("/adminforms");
  };

  const salirSinGuardar = async () => {
    setPendingAction(null);
    setLoading(true);
    await actualizarSoloEstado("pausada");
    dispatch(resetCotizacion());
    setLoading(false);
    navigate("/adminforms");
  };

  const guardarYSalir = async () => {
    setPendingAction(null);
    setLoading(true);
    await guardarCotizacion("pausada");
    dispatch(resetCotizacion());
    setLoading(false);
    navigate("/adminforms");
  };

  const handleGuardarYSalirClick = () => {
    if (hayContenido) {
      setPendingAction("salir");
      return;
    }
    salirSinGuardar();
  };

  const ejecutarLogout = async () => {
    setLoading(true);
    await actualizarSoloEstado("pausada");
    dispatch(resetCotizacion());
    await logout();
    setLoading(false);
  };

  const handleLogoutClick = () => {
    if (hayContenido) {
      setPendingAction("logout");
      return;
    }
    ejecutarLogout();
  };

  const handleGuardarYCerrarSesion = async () => {
    setPendingAction(null);
    setLoading(true);
    await guardarCotizacion("pausada");
    dispatch(resetCotizacion());
    await logout();
    setLoading(false);
  };

  const handleCerrarSesionSinGuardar = () => {
    setPendingAction(null);
    ejecutarLogout();
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
            vista={"Crea una Cotización"}
            cotId={values.cotizacionId}
          />
        </Box>

        {!isFullScreen && (
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Tooltip title="Descargar PDF">
              <span>
                <IconButton
                  onClick={handleDescargarPdf}
                  component="a"
                  href={sinEquipos || sinTelefono ? undefined : whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  disabled={sinEquipos}
                  color="success"
                >
                  <PictureAsPdfIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Guardar y salir">
              <IconButton onClick={handleGuardarYSalirClick}>
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

      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <Box sx={{ mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Cotizacion />
            </Grid>
            <Grid item xs={12} md={6}>
              <VistaCotWeb />
            </Grid>
          </Grid>
        </Box>

        {isFullScreen && (
          <Box sx={{ mb: 2 }}>
            <Grid container spacing={2} justifyContent="center">
              <Grid item xs={10} sm={6} md={4}>
                <Button
                  variant="success"
                  fullWidth
                  sx={{ flex: 1, whiteSpace: "nowrap" }}
                  onClick={handleDescargarPdf}
                  component="a"
                  href={sinEquipos || sinTelefono ? undefined : whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  disabled={sinEquipos}
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
              fullWidth
              sx={{ py: 0.75, px: 1, fontSize: "0.75rem" }}
              onClick={handleGuardarYSalirClick}
            >
              Guardar y Salir
            </Button>

            <Button
              onClick={handleLogoutClick}
              variant="danger"
              fullWidth
              sx={{ py: 0.75, px: 1, fontSize: "0.75rem" }}
            >
              CERRAR SESION
            </Button>
          </Stack>
        </Box>
      )}

      <Dialog open={Boolean(pendingAction)} onClose={() => setPendingAction(null)}>
        <DialogTitle>Tienes cambios sin guardar</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {values.id
              ? pendingAction === "logout"
                ? "¿Quieres guardar los cambios antes de cerrar sesión?"
                : "¿Quieres guardar los cambios antes de salir?"
              : pendingAction === "logout"
                ? "Esta cotización todavía no se ha creado. ¿Qué quieres hacer antes de cerrar sesión?"
                : "Esta cotización todavía no se ha creado. ¿Quieres guardarla antes de salir?"}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, flexWrap: "wrap", gap: 1 }}>
          <Button onClick={() => setPendingAction(null)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={
              pendingAction === "logout"
                ? handleCerrarSesionSinGuardar
                : salirSinGuardar
            }
            variant="danger"
            disabled={loading}
          >
            {pendingAction === "logout" ? "Cerrar sin Crear" : "Salir sin guardar"}
          </Button>
          <Button
            onClick={
              pendingAction === "logout"
                ? handleGuardarYCerrarSesion
                : guardarYSalir
            }
            variant="success"
            disabled={loading}
          >
            {pendingAction === "logout" ? "Crear y cerrar sesión" : "Guardar y salir"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
