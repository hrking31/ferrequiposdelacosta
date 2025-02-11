import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { deleteDoc, doc } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "../../Components/Firebase/Firebase";
import { clearSelectedEquipo } from "../../Store/Slices/selectedSlice";
import { clearSearchEquipo } from "../../Store/Slices/searchSlice";
import { Snackbar, Alert, Box, Typography, Button, Grid } from "@mui/material";

const EliminarEquipo = () => {
  const dispatch = useDispatch();
  const equipoSeleccionado = useSelector((state) => state.selected.selected);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const resetForm = () => {
    dispatch(clearSelectedEquipo());
    dispatch(clearSearchEquipo());
  };

  const handleDelete = async () => {
    if (!equipoSeleccionado) return;
    const { id, images } = equipoSeleccionado;

    try {
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
      resetForm();
      setOpenSnackbar(true);
    }
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  return (
    <Box sx={{ padding: 2 }}>
      <Box sx={{ marginBottom: { xs: 1, sm: 2 }, width: "100%" }}>
        <Typography
          variant="h4"
          sx={{
            color: "#8B3A3A",
            fontWeight: "bold",
            overflowWrap: "break-word",
            fontSize: { xs: "h5.fontSize", sm: "h4.fontSize" },
          }}
        >
          Elimina equipo seleccionado.
        </Typography>
      </Box>

      <Grid container spacing={2}>
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
                        mt: 1,
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: "1rem",
                          color: "#8B3A3A",
                        }}
                      >
                        Nombre Imagen:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: "0.85rem",
                          color: "#00008B",
                        }}
                      >
                        {image.name || `Nombre no disponible ${index + 1}`}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: "1rem",
                          color: "#8B3A3A",
                        }}
                      >
                        Url:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: "0.85rem",
                          color: "#00008B",
                          wordBreak: "break-word",
                          maxWidth: "100%",
                        }}
                      >
                        {image.url}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))
            : null}
        </Grid>
      </Grid>

      <Button
        variant="contained"
        color="error"
        onClick={handleDelete}
        sx={{
          marginLeft: 2,
          width: "200px",
          height: "45px",
        }}
      >
        Eliminar Equipo
      </Button>

      <Button
        variant="contained"
        onClick={resetForm}
        sx={{
          marginLeft: 2,
          width: "200px",
          height: "45px",
          color: "#ffffff",
          backgroundColor: "#1E90FF",
          "&:hover": {
            backgroundColor: "#4682B4",
          },
        }}
      >
        Cancelar
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

////////////////////////////////////////////////////////////////
{
  /* <Grid container spacing={2}>
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
                      value={image.name || `Nombre no disponible ${index + 1}`}
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
      </Grid> */
}
