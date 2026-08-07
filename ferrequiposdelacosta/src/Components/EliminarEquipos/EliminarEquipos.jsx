import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { deleteDoc, doc } from "firebase/firestore";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo";
import { getStorage, ref, listAll, deleteObject } from "firebase/storage";
import { db } from "../../Components/Firebase/Firebase";
import { fetchEquiposData } from "../../Store/Slices/equiposSlice";
import {
  Box,
  Typography,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";

const EliminarEquipo = () => {
  const [loading, setLoading] = useState(false);
  const [openConfirmDelete, setOpenConfirmDelete] = useState(false);
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(
    () => location.state?.equipo || null,
  );
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("success");
  const dispatch = useDispatch();

  const eliminarCarpetaCompleta = async (equipoId) => {
    const storage = getStorage();
    const carpetaRef = ref(storage, `${equipoId}/`);
    const resultado = await listAll(carpetaRef);
    await Promise.all(resultado.items.map((item) => deleteObject(item)));
  };

  const handleDelete = async () => {
    setOpenConfirmDelete(false);
    if (!equipoSeleccionado) return;
    const { id, name } = equipoSeleccionado;
    setLoading(true);

    try {
      // Se borra primero el documento para que el equipo deje de aparecer
      // en el catálogo de inmediato; si luego falla la limpieza de Storage
      // solo quedan imágenes huérfanas (invisibles), no un equipo fantasma
      // con imágenes rotas.
      await deleteDoc(doc(db, "equipos", id));

      // El catálogo vive en Redux y solo se consulta cuando está vacío, así que
      // sin este refresh el equipo borrado sigue apareciendo en la tienda, el
      // kiosco y el buscador hasta que se recargue la página.
      dispatch(fetchEquiposData());

      try {
        await eliminarCarpetaCompleta(id);
        showSnackbar(`Equipo ${name} eliminado correctamente.`, "success");
      } catch {
        showSnackbar(
          `Equipo ${name} eliminado, pero no se pudieron borrar todas sus imágenes del almacenamiento.`,
          "warning",
        );
      }

      setEquipoSeleccionado(null);
    } catch (error) {
      showSnackbar(
        error.message || `Error al eliminar el equipo ${name}.`,
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingLogo text="Eliminando equipo..." />;

  if (!equipoSeleccionado) {
    return (
      <Box
        mx="auto"
        p={2}
        display="flex"
        flexDirection="column"
        alignItems="center"
        gap={2}
        sx={{
          [theme.breakpoints.up("md")]: { width: "60%" },
        }}
      >
        <Typography variant="h6">No hay ningún equipo seleccionado.</Typography>
      </Box>
    );
  }

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
                        borderRadius: theme.shape.borderRadius * 2,
                        border: `1px solid ${theme.palette.divider}`,
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

      <Button
        variant="contained"
        color="error"
        fullWidth
        onClick={() => setOpenConfirmDelete(true)}
      >
        Eliminar Equipo
      </Button>

      <Dialog
        open={openConfirmDelete}
        onClose={() => setOpenConfirmDelete(false)}
        sx={{ zIndex: 1400 }}
      >
        <DialogTitle
          sx={{
            fontWeight: "bold",
            bgcolor: "error.main",
            color: "error.contrastText",
          }}
        >
          ⚠️ Alerta de Confirmación
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body1" sx={{ mt: 2 }}>
            ¿Seguro que quieres eliminar el equipo{" "}
            <strong>{equipoSeleccionado?.name}</strong>? Esta acción es
            irreversible y también borra todas sus imágenes.
          </Typography>
        </DialogContent>

        <DialogActions
          sx={{
            p: 2.5,
            gap: 1.5,
            flexDirection: { xs: "column", sm: "row" },
            "& > :not(style)": {
              margin: "0px !important",
            },
          }}
        >
          {/* El que borra va en ROJO y el de salir en contorno. Estaban al
              revés —borrar en verde, cancelar en rojo—: el verde invita a
              tocar, y acá se lleva el equipo con todas sus imágenes. */}
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            size="medium"
            fullWidth={isMobile}
          >
            Eliminar
          </Button>

          <Button
            onClick={() => setOpenConfirmDelete(false)}
            variant="outlined"
            size="medium"
            fullWidth={isMobile}
          >
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Box>
  );
};

export default EliminarEquipo;
