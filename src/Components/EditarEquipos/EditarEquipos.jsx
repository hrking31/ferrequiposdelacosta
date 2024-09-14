import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../Components/Firebase/Firebase";
import {
  Snackbar,
  Alert,
  Box,
  Typography,
  Button,
  TextField,
  Grid,
} from "@mui/material";
import { useAuth } from "../../Context/AuthContext";

const EditarEquipo = () => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const equipoSeleccionado = useSelector((state) => state.selected.selected);
  const [editData, setEditData] = useState(
    equipoSeleccionado || { name: "", description: "", url: [], images: [] }
  );
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageName, setImageName] = useState("");

  const handleSave = async () => {
    if (!equipoSeleccionado) return;

    try {
      const itemDoc = doc(db, "equipos", equipoSeleccionado.id);
      await updateDoc(itemDoc, editData);
      setSnackbarMessage("Equipo actualizado con éxito");
      setSnackbarSeverity("success");
    } catch (error) {
      console.error("Error actualizando el equipo: ", error);
      setSnackbarMessage("Error al actualizar el equipo");
      setSnackbarSeverity("error");
    } finally {
      setOpenSnackbar(true);
    }
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const handleEditChange = (field, value) => {
    setEditData((prevData) => ({
      ...prevData,
      [field]: value,
    }));
  };

  const handleImageChange = (e) => {
    setSelectedImage(e.target.files[0]);
  };

  const handleUploadImage = async () => {
    if (!selectedImage) return;

    const storageRef = ref(storage, `images/${selectedImage.name}`);
    const uploadTask = uploadBytesResumable(storageRef, selectedImage);

    uploadTask.on(
      "state_changed",
      null,
      (error) => {
        console.error("Error al subir la imagen: ", error);
        setSnackbarMessage("Error al subir la imagen");
        setSnackbarSeverity("error");
        setOpenSnackbar(true);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        setEditData((prevData) => ({
          ...prevData,
          images: [
            ...prevData.images,
            { name: imageName || selectedImage.name, url: downloadURL },
          ],
        }));
        setSelectedImage(null);
        setImageName("");
        setSnackbarMessage("Imagen subida con éxito");
        setSnackbarSeverity("success");
        setOpenSnackbar(true);
      }
    );
  };

  if (!equipoSeleccionado) {
    return (
      <Typography variant="h6">
        No hay equipo seleccionado para editar.
      </Typography>
    );
  }

  const { name, description } = editData;

  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h4" sx={{ marginBottom: 2 }}>
        Editar Equipo
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Nuevo nombre"
            variant="outlined"
            fullWidth
            value={name}
            onChange={(e) => handleEditChange("name", e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Nueva descripción"
            variant="outlined"
            fullWidth
            value={description}
            onChange={(e) => handleEditChange("description", e.target.value)}
            sx={{ mb: 2 }}
          />

          <Grid container spacing={2}>
            {equipoSeleccionado.images && equipoSeleccionado.images.length > 0
              ? equipoSeleccionado.images.map((image, index) => (
                  <Grid item xs={12} sm={4} key={index}>
                    <Box sx={{ textAlign: "center", mb: 2 }}>
                      <img
                        src={image.url}
                        alt={image.name}
                        style={{
                          width: "100px",
                          height: "100px",
                          objectFit: "cover",
                        }}
                      />
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                        }}
                      >
                        <TextField
                          type="text"
                          readOnly
                          value={
                            image.name || `Nombre no disponible ${index + 1}`
                          }
                          fullWidth
                          margin="normal"
                          sx={{
                            mt: 1,
                            fontSize: "0.75rem",
                            "& .MuiInputBase-input": {
                              padding: "6px 12px",
                            },
                            "& .MuiOutlinedInput-root": {
                              "& fieldset": {
                                borderColor: "#00008B",
                              },
                              "&:hover fieldset": {
                                borderColor: "#4682B4",
                              },
                              "&.Mui-focused fieldset": {
                                borderColor: "#1E90FF",
                              },
                            },
                          }}
                        />
                        <TextField
                          type="text"
                          readOnly
                          value={image.url}
                          fullWidth
                          margin="normal"
                          sx={{
                            mt: 1,
                            fontSize: "0.75rem",
                            "& .MuiInputBase-input": {
                              padding: "6px 12px",
                            },
                            "& .MuiOutlinedInput-root": {
                              "& fieldset": {
                                borderColor: "#00008B",
                              },
                              "&:hover fieldset": {
                                borderColor: "#4682B4",
                              },
                              "&.Mui-focused fieldset": {
                                borderColor: "#1E90FF",
                              },
                            },
                          }}
                        />
                      </Box>
                    </Box>
                  </Grid>
                ))
              : null}
            <TextField
              type="text"
              readOnly
              value={name}
              fullWidth
              margin="normal"
              sx={{
                mt: 1,
                fontSize: "0.75rem",
                "& .MuiInputBase-input": {
                  padding: "6px 12px",
                },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: "#00008B",
                  },
                  "&:hover fieldset": {
                    borderColor: "#4682B4",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#1E90FF",
                  },
                },
              }}
            />

            <TextField
              type="text"
              readOnly
              value={description}
              fullWidth
              margin="normal"
              sx={{
                mt: 1,
                fontSize: "0.75rem",
                "& .MuiInputBase-input": {
                  padding: "6px 12px",
                },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: "#00008B",
                  },
                  "&:hover fieldset": {
                    borderColor: "#4682B4",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#1E90FF",
                  },
                },
              }}
            />
          </Grid>

          <Box sx={{ mb: 2 }}>
            <input type="file" accept="image/*" onChange={handleImageChange} />
            <TextField
              label="Nombre de la imagen"
              variant="outlined"
              fullWidth
              value={imageName}
              onChange={(e) => setImageName(e.target.value)}
              sx={{ mt: 2 }}
            />
            <Button
              variant="contained"
              onClick={handleUploadImage}
              sx={{
                mt: 2,
                backgroundColor: "#1E90FF",
                "&:hover": { backgroundColor: "#4682B4" },
              }}
              fullWidth
            >
              Subir Imagen
            </Button>
          </Box>

          <Button
            variant="contained"
            onClick={handleSave}
            sx={{
              mb: 2,
              backgroundColor: "#1E90FF",
              "&:hover": { backgroundColor: "#4682B4" },
            }}
            fullWidth
          >
            Guardar Cambios
          </Button>
        </Grid>
        {/* <Grid item xs={12} sm={6}>
          {url &&
            url.length > 0 &&
            url.map((image, index) => (
              <Box key={index} sx={{ textAlign: "center", mb: 2 }}>
                <img
                  src={image}
                  alt={`Image ${index + 1}`}
                  style={{ width: "100%", height: "auto" }}
                />
                <Typography variant="body2" sx={{ marginTop: 1 }}>
                  URL: {image}
                </Typography>
              </Box>
            ))}
        </Grid> */}
      </Grid>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EditarEquipo;
