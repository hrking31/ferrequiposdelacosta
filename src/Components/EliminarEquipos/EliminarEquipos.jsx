import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { deleteDoc, doc } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "../../Components/Firebase/Firebase";
import { Snackbar, Alert, Box, Typography, Button, Grid } from "@mui/material";

const EliminarEquipo = () => {
  const dispatch = useDispatch();
  const equipoSeleccionado = useSelector((state) => state.selected);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const handleDelete = async () => {
    try {
      if (!equipoSeleccionado) return;
      const { id, images, name } = equipoSeleccionado;

      for (const image of images) {
        const imageRef = ref(storage, image.url);
        await deleteObject(imageRef);
      }

      const equipoDocRef = doc(db, "equipos", id);
      await deleteDoc(equipoDocRef);

      setSnackbarMessage("Equipo eliminado con éxito");
      setSnackbarSeverity("success");
    } catch (error) {
      console.error("Error eliminando el equipo: ", error);
      setSnackbarMessage("Error al eliminar el equipo");
      setSnackbarSeverity("error");
    } finally {
      setOpenSnackbar(true);
    }
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  if (!equipoSeleccionado) {
    return (
      <Typography variant="h6">
        No hay equipo seleccionado para eliminar.
      </Typography>
    );
  }

  const { name, description, images } = equipoSeleccionado;

  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h4" sx={{ marginBottom: 2 }}>
        Eliminar Equipo: {name}
      </Typography>
      <Typography variant="body1" sx={{ marginBottom: 2 }}>
        Descripción: {description}
      </Typography>

      <Grid container spacing={2}>
        {images.map((image, index) => (
          <Grid item xs={12} sm={4} key={index}>
            <Box sx={{ textAlign: "center" }}>
              <img
                src={image.url}
                alt={image.name}
                style={{ width: "100%", height: "auto" }}
              />
              <Typography variant="body2" sx={{ marginTop: 1 }}>
                Nombre: {image.name}
              </Typography>
              <Typography variant="body2">URL: {image.url}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      <Button
        variant="contained"
        color="error"
        onClick={handleDelete}
        sx={{ marginTop: 3 }}
      >
        Eliminar Equipo
      </Button>

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

export default EliminarEquipo;
