import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import {
  Box,
  Grid,
  Button,
  Snackbar,
  Alert,
  Typography,
  useTheme,
  useMediaQuery,
  Skeleton,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import Search from "../../Components/Search/Search";
import CardsSearchEquipos from "../../Components/CardsSearchEquipos/CardsSearchEquipos";
import {
  fetchEquipos,
  clearSearchEquipo,
} from "../../Store/Slices/searchSlice";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo.jsx";

const VistaSeleccionarEquipo = () => {
  const { logout } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);
  const { name, genero } = useSelector((state) => state.user);
  const equipos = useSelector((state) => state.search.results);
  const loading = useSelector((state) => state.search.loading);
  const error = useSelector((state) => state.search.error);
  const hasSearched = useSelector((state) => state.search.hasSearched);

  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("info");

  const theme = useTheme();
  const isFullScreen = useMediaQuery("(max-width:915px)");

  const saludo = genero === "femenino" ? "Bienvenida" : "Bienvenido";

  const handleSearch = (searchTerm) => {
    dispatch(fetchEquipos(searchTerm));
  };

  const handleEditar = () => {
    if (equipoSeleccionado) {
      navigate("/vistaeditarequipo", { state: { equipo: equipoSeleccionado } });
    } else {
      setSnackbarMessage("Debes seleccionar un Equipo para Editar.");
      setSnackbarSeverity("warning");
      setOpenSnackbar(true);
    }
  };

  const handleEliminar = () => {
    if (equipoSeleccionado) {
      navigate("/vistaeliminarequipo", {
        state: { equipo: equipoSeleccionado },
      });
    } else {
      setSnackbarMessage("Debes seleccionar un Equipo para Eliminar.");
      setSnackbarSeverity("warning");
      setOpenSnackbar(true);
    }
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const handleCancelarSeleccion = () => {
    setEquipoSeleccionado(null);
  };

  const handlerLogout = async () => {
    await logout();
  };

  useEffect(() => {
    return () => {
      dispatch(clearSearchEquipo());
    };
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      setSnackbarMessage(
        "Hubo un problema al realizar la búsqueda. Inténtalo de nuevo."
      );
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
    } else if (hasSearched && !loading && equipos.length === 0) {
      setSnackbarMessage("No se encontraron equipos.");
      setSnackbarSeverity("warning");
      setOpenSnackbar(true);
    }
  }, [error, equipos, loading, hasSearched]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        pt: isFullScreen ? { xs: 1, sm: 1.5 } : 10,
        pb: isFullScreen ? { xs: 8, sm: 9 } : 1.5,
        pl: { xs: 1, sm: 1.5 },
        pr: { xs: 1, sm: 1.5 },
        overflow: "auto",
        boxSizing: "border-box",
        // border: "2px solid red",
      }}
    >
      <Typography variant="h5" color="text.primary">
        {saludo} {name}, Busca el equipo por su nombre.
      </Typography>

      <Box
        mx="auto"
        p={2}
        display="flex"
        flexDirection="column"
        sx={{
          [theme.breakpoints.up("md")]: { width: "60%" },
          // border: "2px solid red",
        }}
      >
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Search onSearch={handleSearch} />
          </Grid>

          <Grid item xs={12}>
            {equipos.length > 0 ? (
              <CardsSearchEquipos
                onSelectEquipo={setEquipoSeleccionado}
                equipoSeleccionado={equipoSeleccionado}
              />
            ) : loading ? (
              <LoadingLogo height="40vh" />
            ) : (
              <Grid container spacing={2}>
                {[...Array(2)].map((_, index) => (
                  <Grid item xs={12} sm={6} md={6} key={index}>
                    <Skeleton
                      variant="rectangular"
                      height={250}
                      animation="wave"
                      sx={{ borderRadius: 2 }}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </Grid>
        </Grid>

        <Grid container spacing={2} justifyContent="center" sx={{ mt: 2 }}>
          <Grid item xs={12} sm={4} md={4}>
            <Button variant="contained" onClick={handleEditar} fullWidth>
              EDITAR
            </Button>
          </Grid>
          <Grid item xs={12} sm={4} md={4}>
            <Button variant="danger" onClick={handleEliminar} fullWidth>
              ELIMINAR
            </Button>
          </Grid>
          <Grid item xs={12} sm={4} md={4}>
            <Button
              variant="danger"
              onClick={handleCancelarSeleccion}
              fullWidth
            >
              CANCELAR
            </Button>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Grid container spacing={2} justifyContent="center">
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
            <Button onClick={handlerLogout} variant="contained" fullWidth>
              CERRAR SESIÓN
            </Button>
          </Grid>
        </Grid>
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
    </Box>
  );
};

export default VistaSeleccionarEquipo;
