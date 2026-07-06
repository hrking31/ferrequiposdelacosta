import {
  Box,
  Typography,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  CircularProgress,
  useMediaQuery,
} from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import { useState, useRef } from "react";
import { useTheme } from "@mui/material/styles";
import { useDispatch } from "react-redux";
import { setUserData } from "../../Store/Slices/userSlice";
import { auth, db, storage } from "../Firebase/Firebase";
import { updateProfile } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";

export default function HeaderUsuario({ name, photoURL, role, genero, vista, cotId }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const [openModal, setOpenModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
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
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 1,
          mx: "auto",
          height: 70,
          width: "100%",
          maxWidth: isMobile ? 500 : 800,
          borderRadius: isMobile ? "40px 40px 40px 40px" : "8px 40px 40px 8px",
          bgcolor: "background.paper",
          boxShadow: "0 4px 20px 0 rgba(0,0,0,0.04)",
          flexShrink: 0,
          boxSizing: "border-box",
        }}
      >
        <Box
          display="flex"
          width="100%"
          flexDirection={isMobile ? "column" : "row"}
          alignItems={isMobile ? "stretch" : "center"}
          justifyContent={"space-between"}
          sx={{
            gap: { xs: 0.3, sm: 0 },
            px: 1.5,
          }}
          // border="2px solid red"
        >
          <Box
            display="flex"
            flexDirection="column"
            // border="2px solid red"
          >
            {!isMobile && (
              <Typography
                variant="subtitle2"
                sx={{
                  lineHeight: 1.2,
                  textTransform: "capitalize",
                  color: (theme) =>
                    theme.palette.mode === "light" ? "#E2E8F0" : "#A0AEC0",
                }}
              >
                {saludo || ""}
              </Typography>
            )}

            <Typography
              variant="h5"
              sx={{
                lineHeight: 1.1,
                textAlign: isMobile ? "center" : "left",
              }}
            >
              {name || ""}
            </Typography>
          </Box>

          <Box
            display="flex"
            flexDirection="column"
            alignItems={isMobile ? "center" : "flex-start"}
            // border="2px solid red"
          >
            <Typography
              variant="h5"
              sx={{
                lineHeight: 1.1,
              }}
            >
              {vista || ""}
            </Typography>

            <Typography
              variant="subtitle2"
              sx={{
                lineHeight: 1.1,
              }}
            >
              {cotId || ""}
            </Typography>
          </Box>

          <Box
            display="flex"
            flexDirection="column"
            alignItems={isMobile ? "center" : "flex-start"}
            // border="2px solid red"
          >
            <Typography
              variant="subtitle2"
              sx={{
                lineHeight: 1.1,
                textTransform: "capitalize",
                color: (theme) =>
                  theme.palette.mode === "light" ? "#E2E8F0" : "text.secondary",
              }}
            >
              {formatearNombreRol(role)}
            </Typography>
          </Box>
        </Box>

        {/* Avatar interactivo con Hover de cámara */}
        <Box
          onClick={handleOpenModal}
          sx={{
            position: "relative",
            cursor: "pointer",
            borderRadius: "50%",
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
              color: (theme) => theme.palette.primary.contrastText,
              bgcolor: (theme) => theme.palette.primary.main,
              boxShadow: (theme) =>
                `0 0 0 4px ${
                  theme.palette.mode === "light"
                    ? `${theme.palette.primary.main}`
                    : `${theme.palette.secondary.light}`
                }`,
              border: (theme) => `2px solid ${theme.palette.primary.light}`,
            }}
          >
            {name ? name.charAt(0).toUpperCase() : "A"}
          </Avatar>

          <Box
            className="avatar-overlay"
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 56,
              height: 56,
              borderRadius: "50%",
              bgcolor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              opacity: 0,
              transition: "opacity 0.2s ease",
              border: "2px solid #fff",
              boxSizing: "border-box",
            }}
          >
            <PhotoCameraIcon sx={{ fontSize: "1.2rem" }} />
          </Box>
        </Box>

        <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
      </Box>

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
            variant="danger"
            disabled={uploading}
            fullWidth
          >
            Cancelar
          </Button>
          <Button
            onClick={handleUploadAndSave}
            variant="success"
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
