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
import {
  guardarCotizacion as guardarCotizacionEnBase,
  liberarCotizacion,
} from "../../Components/AdminCotizaciones/cotizacionesDb";
import { useAuth } from "../../Context/useAuth";
import {
  resetCotizacion,
  setFormCotizacion,
} from "../../Store/Slices/cotizacionSlice";
import { hayCambios } from "../../Utils/estadoDocumento";
import { abrirWhatsapp } from "../../Utils/whatsapp";
import Cotizacion from "../../Components/Cotizacion/Cotizacion";
import VistaCotWeb from "../../Components/VistaWeb/VistaCotWeb";
import VistaCotPdf from "../../Components/VistaPdf/VistaCotPdf";
import BuildIcon from "@mui/icons-material/Build";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";

export default function VistaCotizacion() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const values = useSelector((state) => state.cotizacion.value);
  // La cotización tal como se abrió, para saber si se cambió algo.
  const original = useSelector((state) => state.cotizacion.original);
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

  // Único punto de guardado: siempre persiste el formulario completo. Crear vs.
  // actualizar lo decide cotizacionesDb según si ya existe values.id.
  //
  // Devuelve la cotización tal como quedó guardada —con su id—, que es lo que
  // después recibe el PDF.
  const guardarCotizacion = async (nuevoEstado) => {
    try {
      return await guardarCotizacionEnBase(values, nuevoEstado);
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
      await liberarCotizacion(values.id, nuevoEstado);
    } catch (error) {
      console.error(`Error al actualizar el estado a ${nuevoEstado}:`, error);
    }
  };

  const sinEquipos = !values.items.some(
    (item) =>
      item.description?.trim() && Number(item.quantity) > 0 && Number(item.price) > 0,
  );

  // Si se tocó algo desde que se abrió. De esto dependen las dos decisiones al
  // salir: si preguntar, y en qué estado queda la cotización.
  //
  // Para una cotización nueva la foto es el formulario en blanco, así que acá
  // además responde "¿escribió algo?" — sin eso se llenaría el buzón de
  // solicitudes vacías.
  const cambios = hayCambios(values, original);

  // El estado al que vuelve si se descartan los cambios. Una cotización nueva
  // no viene de ningún lado: no hay nada que restaurar.
  const statusPrevio = values.statusPrevio || "pausada";

  const telefonoDigits = String(values.telefono || "").replace(/\D/g, "");
  const sinTelefono = telefonoDigits.length === 0;
  const message = `
    Hola 👋

    Hemos preparado su cotización 📄

    Número: ${values.cotizacionId}

    En el PDF encontrará el detalle de equipos, tiempos y valores correspondientes.

    Quedamos atentos a cualquier ajuste o confirmación.

    FERREQUIPOS DE LA COSTA

    Gracias 🙏
`;

  const handleDescargarPdf = async () => {
    if (sinEquipos) return;

    // WhatsApp primero, dentro del mismo clic: entra a la app instalada —en el
    // celular y también en el computador con WhatsApp Desktop— en vez de abrir
    // la página wa.me en el navegador. Como no navega fuera, esta pantalla
    // sigue viva guardando la cotización y armando el PDF. El porqué completo,
    // en Utils/whatsapp.js.
    if (!sinTelefono) abrirWhatsapp(values.telefono, message);

    setLoading(true);
    const cotizacionGuardada = await guardarCotizacion("creada");
    VistaCotPdf(cotizacionGuardada);
    dispatch(resetCotizacion());
    setLoading(false);
    navigate("/adminforms");
  };

  // Descartar: la cotización vuelve tal como estaba antes de abrirla. Lo único
  // que se escribe es el estado —los datos de esta sesión no se guardan— y si
  // es nueva no se escribe nada, porque no existe en la base.
  const salirSinGuardar = async () => {
    setPendingAction(null);
    setLoading(true);
    await actualizarSoloEstado(statusPrevio);
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

  // Sin cambios no se pregunta nada: guardar y descartar terminarían igual, así
  // que la pregunta no aportaría. Sale y la deja como estaba.
  const handleGuardarYSalirClick = () => {
    if (cambios) {
      setPendingAction("salir");
      return;
    }
    salirSinGuardar();
  };

  const ejecutarLogout = async () => {
    setLoading(true);
    await actualizarSoloEstado(statusPrevio);
    dispatch(resetCotizacion());
    await logout();
    setLoading(false);
  };

  const handleLogoutClick = () => {
    if (cambios) {
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
      <Box sx={{ px: 0, py: 2, flexShrink: 0, display: "flex", alignItems: "center", gap: 1, "@media (min-width:916px)": { px: 2 } }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <HeaderUsuarioConModal
            name={name}
            photoURL={photoURL}
            role={role}
            genero={genero}
            vista={"Crea una Cotización"}
            descripcion={"Arma la cotización y envíala al cliente"}
            icono={<BuildIcon />}
            cotId={values.cotizacionId}
          />
        </Box>

        {!isFullScreen && (
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Tooltip title="Descargar PDF">
              <span>
                <IconButton
                  onClick={handleDescargarPdf}
                  disabled={sinEquipos}
                  color="success"
                >
                  <PictureAsPdfIcon />
                </IconButton>
              </span>
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

      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", mx: isFullScreen ? 0 : 2 }}>
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
                  variant="contained"
                  color="success"
                  fullWidth
                  sx={{ flex: 1, whiteSpace: "nowrap" }}
                  onClick={handleDescargarPdf}
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
        <DialogTitle>Tienes cambios sin guardar</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Si sales sin guardar, perderás los cambios realizados en esta
            sesión.
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
            variant="contained"
            color="error"
            disabled={loading}
          >
            {pendingAction === "logout"
              ? "Cerrar sesión sin guardar"
              : "Salir sin guardar"}
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
    </Box>
  );
}
