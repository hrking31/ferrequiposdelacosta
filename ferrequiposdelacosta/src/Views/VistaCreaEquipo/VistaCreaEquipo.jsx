import { useState } from "react";
import {
  Box,
  Button,
  Grid,
  Stack,
  TextField,
  Snackbar,
  Alert,
  Divider,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import { useSelector } from "react-redux";
import { storage, db } from "../../Components/Firebase/Firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, setDoc, doc } from "firebase/firestore";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";

export default function VistaCreaEquipo() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const { name, photoURL, role, genero, permisos } = useSelector(
    (state) => state.user,
  );
  const [formValues, setFormValues] = useState({ name: "", description: "" });
  const [images, setImages] = useState([]);
  const isFullScreen = useMediaQuery("(max-width:915px)");
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const handlerInputChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      name: "",
    }));
    setImages((prev) => [...prev, ...newImages]);
  };

  const handleNameChange = (index, newName) => {
    setImages((prevImages) =>
      prevImages.map((img, i) =>
        i === index ? { ...img, name: newName } : img,
      ),
    );
  };

  const handleRemoveImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleUploadImages = async (equipoId) => {
    const uploadPromises = images.map(async (img) => {
      const uniqueName = `${img.name}-${Date.now()}`;
      const storageRef = ref(storage, `${equipoId}/${uniqueName}`);
      await uploadBytes(storageRef, img.file);
      const downloadURL = await getDownloadURL(storageRef);
      return { name: img.name, url: downloadURL, path: storageRef.fullPath };
    });

    return await Promise.all(uploadPromises);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, description } = formValues;

    if (!name || !description || images.length === 0) {
      setSnackbarMessage("Todos los campos son obligatorios.");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
      return;
    }
    setLoading(true);

    try {
      const equipoRef = doc(collection(db, "equipos"));
      const equipoId = equipoRef.id;

      const uploadedImages = await handleUploadImages(equipoId);

      const data = {
        id: equipoId,
        name,
        description,
        images: uploadedImages,
        nameLowerCase: name.toLowerCase(),
      };

      await setDoc(equipoRef, data);

      setSnackbarMessage("Equipo creado exitosamente.");
      setSnackbarSeverity("success");
      setOpenSnackbar(true);

      setFormValues({ name: "", description: "" });
      setImages([]);
    } catch (error) {
      setSnackbarMessage(`Error: ${error.message}`);
      setSnackbarSeverity("error");
    } finally {
      setOpenSnackbar(true);
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormValues({ name: "", description: "" });
    setImages([]);
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const handlerLogout = async () => {
    await logout();
  };

  if (loading) return <LoadingLogo />;

  return (
    <form onSubmit={handleSubmit}>
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
            vista={"Crea un Nuevo Equipo"}
          />
        </Box>

        <Box sx={{ flexGrow: 1, mb: 2 }}>
          <Grid container spacing={2} justifyContent="center">
            <Box
              sx={{
                width: { xs: "90%", md: "60%" },
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "column",
                mt: 4,
              }}
            >
              <TextField
                name="name"
                label="Nombre del equipo"
                value={formValues.name}
                onChange={handlerInputChange}
                fullWidth
              />

              <TextField
                name="description"
                label="Descripción del equipo"
                value={formValues.description}
                onChange={handlerInputChange}
                fullWidth
                multiline
                rows={4}
                margin="normal"
              />

              {images &&
                images.map((img, index) => (
                  <Box
                    key={img.id}
                    sx={{
                      mb: 2,
                      mt: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "100%",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        width: "100%",
                        maxWidth: "100%",
                      }}
                    >
                      <Box
                        component="img"
                        src={img.preview}
                        alt={`preview-${index}`}
                        sx={{
                          width: { xs: 80, sm: 90, md: 100 },
                          height: { xs: 80, sm: 90, md: 100 },
                          marginRight: 1.5,
                        }}
                      />
                      <TextField
                        label="Nombre de la imagen"
                        value={img.name}
                        onChange={(e) =>
                          handleNameChange(index, e.target.value)
                        }
                        sx={{
                          marginRight: 1.5,
                        }}
                      />

                      <Button
                        variant="contained"
                        color="error"
                        onClick={() => handleRemoveImage(index)}
                      >
                        Eliminar
                      </Button>
                    </Box>
                  </Box>
                ))}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <label htmlFor="file-upload" style={{ cursor: "pointer" }}>
                  <Grid container spacing={2} justifyContent="center">
                    <Button
                      variant="contained"
                      component="span"
                      fullWidth
                      sx={{
                        mt: 2,
                      }}
                    >
                      Selecciona una Imagen
                    </Button>
                  </Grid>
                </label>
                <input
                  id="file-upload"
                  type="file"
                  name="fotos"
                  onChange={handleImageChange}
                  style={{ display: "none" }}
                />
              </Box>
            </Box>
          </Grid>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Divider
            sx={{
              width: "100%",
              mt: 1,
              mb: { xs: 3, md: 4 },
              borderBottomWidth: "2.5px",
            }}
          />
          <Grid container spacing={2} justifyContent="center">
            <Grid item xs={10} sm={4} md={4}>
              <Button
                type="submit"
                variant="success"
                disabled={loading}
                fullWidth
              >
                CREAR EQUIPO
              </Button>
            </Grid>
            <Grid item xs={10} sm={4} md={4}>
              <Button onClick={handleCancel} variant="danger" fullWidth>
                CANCELAR
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

      <Snackbar
        open={openSnackbar}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{
          "&.MuiSnackbar-root": {
            position: "fixed",
            top: "50% !important",
            left: "50% !important",
            transform: "translate(-50%, -50%)",
            zIndex: 1300,
          },
        }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          variant="filled"
          sx={{
            width: "100%",
            bgcolor: (theme) =>
              theme.palette[snackbarSeverity]?.main ||
              theme.palette.primary.main,
            color: (theme) =>
              theme.palette[snackbarSeverity]?.contrastText ||
              theme.palette.primary.contrastText,
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </form>
  );
}
