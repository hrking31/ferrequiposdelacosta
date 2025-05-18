import { useState } from "react";
import {
  Box,
  Button,
  Grid,
  TextField,
  Typography,
  Snackbar,
  Alert,
} from "@mui/material";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo";
import { useAuth } from "../../Context/AuthContext";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { storage, db } from "../../Components/Firebase/Firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, setDoc, doc } from "firebase/firestore";
import style from "./VistaCreaEquipo.module.css";

export default function VistaCreaEquipo() {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const { name, genero } = useSelector((state) => state.user);
  const [formValues, setFormValues] = useState({ name: "", description: "" });
  const [images, setImages] = useState([]);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const saludo = genero === "femenino" ? "Bienvenida" : "Bienvenido";

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
        i === index ? { ...img, name: newName } : img
      )
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
      <Box sx={{ padding: 2, textAlign: "center" }}>
        <Typography
          variant="h4"
          sx={{ color: "#8B3A3A", fontWeight: "bold", mb: 4 }}
        >
          {saludo} {name}
        </Typography>
        <Grid container spacing={2} justifyContent="center">
          <Box
            sx={{
              width: { xs: "100%", md: "50%" }, // 100% en móviles, 50% en pantallas medianas o más
              display: "flex",
              justifyContent: "center", // Centra contenido horizontalmente
              alignItems: "center", // Centra contenido verticalmente (si se usa altura)
              flexDirection: "column", // Opcional: organiza verticalmente el contenido interno
            }}
          >
            <TextField
              name="name"
              label="Nombre del equipo"
              value={formValues.name}
              onChange={handlerInputChange}
              fullWidth
              margin="normal"
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
                      className={style.previewImage}
                      sx={{
                        width: { xs: 80, sm: 90, md: 100 },
                        height: { xs: 80, sm: 90, md: 100 },
                        marginRight: 1.5,
                      }}
                    />
                    {/* <Box> */}
                      <TextField
                        label="Nombre de la imagen"
                        value={img.name}
                        onChange={(e) =>
                          handleNameChange(index, e.target.value)
                        }
                        size="small"
                        sx={{
                          marginRight: 1.5,
                          flexGrow: 1,
                        }}
                      />
                    {/* </Box> */}
                    <Button
                      variant="contained"
                      color="error"
                      onClick={() => handleRemoveImage(index)}
                      // sx={{ flexGrow: 1 }}
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
                    variant="upload"
                    component="span"
                    fullWidth
                    sx={{
                      mt: 2,
                      mb: 2,
                    }}
                  >
                    Selecciona Imagen
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

        <Grid container spacing={2} justifyContent="center">
          <Grid item xs={12} sm={6} md={4}>
            <Button
              type="submit"
              variant="success"
              disabled={loading}
              fullWidth
            >
              CREAR EQUIPO
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Button onClick={handleCancel} variant="danger" fullWidth>
              CANCELAR
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Button
              component={Link}
              to="/adminforms"
              variant="contained"
              fullWidth
            >
              MENU
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Button onClick={handlerLogout} variant="danger" fullWidth>
              CERRAR SESION
            </Button>
          </Grid>
        </Grid>
        <Snackbar
          open={openSnackbar}
          autoHideDuration={4000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbarSeverity}
            sx={{ width: "100%" }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>
    </form>
  );
}
