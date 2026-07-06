import { useState } from "react";
import { useLocation } from "react-router-dom";
import { deleteDoc, doc } from "firebase/firestore";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo";
import { getStorage, ref, listAll, deleteObject } from "firebase/storage";
import { db, storage } from "../../Components/Firebase/Firebase";
import {
  Box,
  Typography,
  Button,
  Grid,
  useTheme,
} from "@mui/material";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";

const EliminarEquipo = () => {
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const theme = useTheme();
  const equipoSeleccionado = location.state?.equipo;
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("success");

  const eliminarCarpetaCompleta = async (equipoId) => {
    const storage = getStorage();
    const carpetaRef = ref(storage, `${equipoId}/`);
    const resultado = await listAll(carpetaRef);
    const promesasDeBorrado = resultado.items.map((item) => deleteObject(item));

    try {
      await Promise.all(promesasDeBorrado);
      return `Carpeta de Imágenes`;
    } catch (error) {
      throw new Error("Error al eliminar la Carpeta de Imágenes");
    }
  };

  const handleDelete = async () => {
    if (!equipoSeleccionado) return;
    const { id, name } = equipoSeleccionado;
    setLoading(true);

    try {
      const mensajeCarpeta = await eliminarCarpetaCompleta(id);
      const equipoDocRef = doc(db, "equipos", id);
      await deleteDoc(equipoDocRef);

      showSnackbar(`${mensajeCarpeta} y Equipo ${name} Eliminado.`, "success");
    } catch (error) {
      // console.error("Error eliminando el equipo: ", error);
      showSnackbar(
        error.message || `Error al Eliminar el Equipo ${name}.`,
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingLogo />;

  return (
    <Box
      mx="auto"
      p={2}
      display="flex"
      flexDirection="column"
      sx={{
        [theme.breakpoints.up("md")]: { width: "60%" },
      }}
    >
      <Box sx={{ marginBottom: { xs: 1, sm: 2 }, width: "100%" }}>
        <Typography variant="h5">
          Elimina el Equipo
          <Typography component="span" variant="body2">
            {" "}
            {equipoSeleccionado.name}.
          </Typography>
        </Typography>

        <Typography
          variant="body2"
          sx={{
            mb: 4,
            p: 2,
            lineHeight: 1.6,
            overflowWrap: "break-word",
            wordBreak: "break-word",
            hyphens: "auto",
            maxWidth: "100%",
            whiteSpace: "pre-line",
          }}
        >
          {equipoSeleccionado.description}
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid container spacing={2}>
          {equipoSeleccionado.images && equipoSeleccionado.images.length > 0
            ? equipoSeleccionado.images.map((image, index) => (
                <Grid item xs={6} sm={4} key={index}>
                  <Box sx={{ textAlign: "center", mb: 2 }}>
                    <img
                      src={image.url}
                      alt={image.name}
                      style={{
                        width: "100px",
                        height: "100px",
                        objectFit: "cover",
                        borderRadius: 12,
                        border: "1px solid #e0e0e0",
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
                      <Typography variant="body2">
                        {image.name || `Nombre no disponible ${index + 1}`}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))
            : null}
        </Grid>
      </Grid>

      <Button variant="danger" fullWidth onClick={handleDelete}>
        Eliminar Equipo
      </Button>

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Box>
  );
};

export default EliminarEquipo;
