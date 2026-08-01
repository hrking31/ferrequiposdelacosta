import {
  Box,
  Typography,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Divider,
  Paper,
  useMediaQuery,
} from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import PropTypes from "prop-types";
import { useState, useRef } from "react";
import { useTheme, alpha } from "@mui/material/styles";
import { useDispatch } from "react-redux";
import { setUserData } from "../../Store/Slices/userSlice";
import { auth, db, storage } from "../Firebase/Firebase";
import { updateProfile } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";

export default function HeaderUsuario({ name, photoURL, role, genero, vista, cotId, icono, descripcion }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const [openModal, setOpenModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  // 915px es el corte que usan todas las vistas para pasar a la forma de
  // celular (el "isFullScreen" de cada una). El encabezado cambia en el mismo
  // punto para que no queden dos formas mezcladas en la misma pantalla.
  const isMobile = useMediaQuery("(max-width:915px)");
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("error");

  const saludo = genero === "femenino" ? "Bienvenida" : "Bienvenido";

  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => {
    if (uploading) return; // Bloquea el cierre si está subiendo
    setOpenModal(false);
    setSelectedFile(null);
    setPreviewUrl("");
  };

  // Capturar el archivo seleccionado por el usuario
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Subir imagen a Firebase y guardar enlaces
  const handleUploadAndSave = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      const currentUser = auth.currentUser;

      if (!currentUser)
        throw new Error("No hay un usuario autenticado activo.");
      const storageRef = ref(storage, `avatars/${currentUser.uid}`);
      await uploadBytes(storageRef, selectedFile);

      const downloadURL = await getDownloadURL(storageRef);

      await updateProfile(currentUser, { photoURL: downloadURL });

      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, { photoURL: downloadURL });

      dispatch(setUserData({ photoURL: downloadURL }));

      showSnackbar("¡Foto de perfil actualizada correctamente!", "success");
      handleCloseModal();
    } catch (error) {
      showSnackbar("Hubo un error al subir la imagen: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const formatearNombreRol = (rolKey) => {
    if (!rolKey) return "Usuario";
    const conEspacios = rolKey.replace(/([A-Z])/g, " $1");
    return conEspacios.charAt(0).toUpperCase() + conEspacios.slice(1);
  };

  return (
    <>
      {isMobile ? (
        /* ── CELULAR: la tarjeta va pintada con el acento ───────────── */
        <Box
          sx={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 2,
            p: 1.75,
            borderRadius: 2,
            overflow: "hidden",
            bgcolor: "custom.accent",
            color: "custom.onAccent",
            flexShrink: 0,
            boxSizing: "border-box",
            // Ocupa todo el ancho que le da la pantalla, que es el mismo del
            // contenido que va debajo. No se sale del margen lateral de la
            // vista: queda alineado con los botones, no pegado al borde.
            width: "100%",
          }}
        >
          {/* La curva del fondo: un circulo grande corrido hacia afuera, del
              mismo color aclarado. Es decoracion, no recibe clics. */}
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              right: -70,
              top: -50,
              width: 220,
              height: 220,
              borderRadius: "50%",
              bgcolor: (t) => alpha(t.palette.common.white, 0.14),
              pointerEvents: "none",
            }}
          />

          <Box
            onClick={handleOpenModal}
            sx={{
              position: "relative",
              cursor: "pointer",
              flexShrink: 0,
              "&:hover .avatar-overlay": { opacity: 1 },
            }}
          >
            <Avatar
              src={photoURL}
              alt={name}
              sx={{
                width: 64,
                height: 64,
                fontSize: "1.5rem",
                fontWeight: "bold",
                border: (t) => `3px solid ${t.palette.common.white}`,
              }}
            >
              {name ? name.charAt(0).toUpperCase() : "A"}
            </Avatar>

            <Box
              className="avatar-overlay"
              sx={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                bgcolor: "custom.veloFoto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "common.white",
                opacity: 0,
                transition: "opacity 0.2s ease",
              }}
            >
              <PhotoCameraIcon fontSize="small" />
            </Box>
          </Box>

          <Box sx={{ minWidth: 0, zIndex: 1 }}>
            <Typography
              variant="h5"
              noWrap
              sx={{ color: "inherit", lineHeight: 1.2 }}
            >
              {name || ""}
            </Typography>

            {vista && (
              <Typography
                variant="subtitle2"
                noWrap
                sx={{ color: "inherit", opacity: 0.92, lineHeight: 1.3 }}
              >
                {vista}
              </Typography>
            )}

            {cotId && (
              <Typography
                variant="caption"
                noWrap
                sx={{ display: "block", color: "inherit", opacity: 0.85 }}
              >
                {cotId}
              </Typography>
            )}

            <Chip
              icon={<VerifiedUserIcon />}
              label={formatearNombreRol(role)}
              size="small"
              sx={{
                mt: 0.75,
                bgcolor: (t) => alpha(t.palette.common.white, 0.9),
                // El fondo del chip es blanco en los DOS modos, así que la
                // letra no puede seguir al modo: con "text.primary" salía
                // blanca sobre blanca de noche. Se saca del propio blanco.
                color: (t) => t.palette.getContrastText(t.palette.common.white),
                fontWeight: 600,
                "& .MuiChip-icon": {
                  color: (t) =>
                    t.palette.getContrastText(t.palette.common.white),
                },
              }}
            />
          </Box>
        </Box>
      ) : (
        /* ── COMPUTADOR: tarjeta clara con una barra de acento al costado ── */
        <Paper
          elevation={2}
          sx={{
            display: "flex",
            alignItems: "stretch",
            width: "100%",
            maxWidth: 900,
            mx: "auto",
            // El mismo tratamiento que las tarjetas de Editar o Eliminar
            // Usuarios: elevación 2 y una franja de acento al costado.
            borderRadius: 2,
            borderLeft: "5px solid",
            borderColor: "custom.accent",
            flexShrink: 0,
            boxSizing: "border-box",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              flex: 1,
              minWidth: 0,
              px: 2,
              py: 1.25,
            }}
          >
            {/* Quien esta trabajando */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                minWidth: 0,
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  display: "grid",
                  placeItems: "center",
                  bgcolor: (t) => alpha(t.palette.custom.accent, 0.12),
                  color: "custom.accent",
                  flexShrink: 0,
                }}
              >
                <PersonOutlineIcon />
              </Box>

              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    color: "text.secondary",
                    lineHeight: 1.2,
                    textTransform: "capitalize",
                  }}
                >
                  {saludo || ""}
                </Typography>
                <Typography
                  variant="h5"
                  noWrap
                  sx={{ lineHeight: 1.15, color: "custom.accent" }}
                >
                  {name || ""}
                </Typography>
              </Box>
            </Box>

            <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />

            {/* En que pantalla esta. El icono es el mismo del boton que la
                abre en Gestion de Operaciones, y cada vista lo pasa. */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                minWidth: 0,
                flex: 1,
              }}
            >
              {icono && (
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    bgcolor: (t) => alpha(t.palette.custom.accent, 0.12),
                    color: "custom.accent",
                    flexShrink: 0,
                  }}
                >
                  {icono}
                </Box>
              )}

              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h5" noWrap sx={{ lineHeight: 1.15 }}>
                  {vista || ""}
                </Typography>
                {/* El número de cotización manda sobre la descripción: cuando
                    hay uno, es el dato que importa de esa pantalla. */}
                {(cotId || descripcion) && (
                  <Typography
                    variant="subtitle2"
                    noWrap
                    sx={{ color: "text.secondary", lineHeight: 1.3 }}
                  >
                    {cotId || descripcion}
                  </Typography>
                )}
              </Box>
            </Box>

            <Chip
              label={formatearNombreRol(role)}
              size="small"
              variant="outlined"
              sx={{
                flexShrink: 0,
                fontWeight: 600,
                borderColor: "custom.accent",
                color: "custom.accent",
              }}
            />

            {/* Avatar con el aro de acento y la camara al pasar el mouse */}
            <Box
              onClick={handleOpenModal}
              sx={{
                position: "relative",
                cursor: "pointer",
                flexShrink: 0,
                "&:hover .avatar-overlay": { opacity: 1 },
              }}
            >
              <Avatar
                src={photoURL}
                alt={name}
                sx={{
                  width: 56,
                  height: 56,
                  fontSize: "1.4rem",
                  fontWeight: "bold",
                  color: (t) => t.palette.custom.onAccent,
                  bgcolor: (t) => t.palette.custom.accent,
                  boxShadow: (t) => `0 0 0 3px ${t.palette.custom.accent}`,
                  border: (t) => `2px solid ${t.palette.common.white}`,
                }}
              >
                {name ? name.charAt(0).toUpperCase() : "A"}
              </Avatar>

              <Box
                className="avatar-overlay"
                sx={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  bgcolor: "custom.veloFoto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "common.white",
                  opacity: 0,
                  transition: "opacity 0.2s ease",
                  border: (t) => `2px solid ${t.palette.common.white}`,
                  boxSizing: "border-box",
                }}
              >
                <PhotoCameraIcon fontSize="small" />
              </Box>
            </Box>
          </Box>

          <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
        </Paper>
      )}

      {/* ================= MODAL ================= */}
      <Dialog
        open={openModal}
        onClose={handleCloseModal}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            backgroundColor: "background.default",
            backgroundImage: "none",
          },
        }}
      >
        <DialogTitle variant="h5" gutterBottom align="center">
          Actualizar Foto de Perfil
        </DialogTitle>

        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            py: 3,
            gap: 2,
          }}
        >
          <input
            type="file"
            name="fotoPerfil"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          {/* Vista previa de la imagen */}
          <Avatar
            src={previewUrl || photoURL}
            sx={{ width: 120, height: 120, boxShadow: theme.shadows[3] }}
          />

          {previewUrl && (
            <Typography variant="caption" color="text.secondary">
              Previsualización del archivo.
            </Typography>
          )}

          <Button
            variant="call"
            color="primary"
            onClick={() => fileInputRef.current.click()}
            disabled={uploading}
          >
            {previewUrl ? "Cambiar Selección" : "Seleccionar Imagen"}
          </Button>
        </DialogContent>

        <DialogActions
          sx={{
            p: 2,
            justifyContent: "space-between",
            flexDirection: { xs: "column", sm: "row" },
            gap: { xs: 1.5, sm: 0 },
            "& > :not(style) + :not(style)": {
              marginLeft: { xs: 0, sm: 2 },
              marginTop: { xs: 0, sm: 0 },
            },
          }}
        >
          <Button
            onClick={handleCloseModal}
            variant="contained"
            color="error"
            disabled={uploading}
            fullWidth
          >
            Cancelar
          </Button>
          <Button
            onClick={handleUploadAndSave}
            variant="contained"
            color="success"
            disabled={!selectedFile || uploading}
            startIcon={
              uploading ? <CircularProgress size={20} color="inherit" /> : null
            }
            fullWidth
          >
            {uploading ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

HeaderUsuario.propTypes = {
  name: PropTypes.string,
  photoURL: PropTypes.string,
  role: PropTypes.string,
  genero: PropTypes.string,
  vista: PropTypes.string,
  cotId: PropTypes.string,
  // El ícono del botón que abre esta vista en Gestión de Operaciones. Solo
  // se muestra en computador.
  icono: PropTypes.node,
  // Una linea corta que dice para que sirve la pantalla. Solo en computador.
  descripcion: PropTypes.string,
};
