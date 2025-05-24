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
  Skeleton,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import SearchComponent from "../../Components/SearchComponent/SearchComponent";
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
      <Box sx={{ padding: 2 }}>
        <Typography variant="h4" color="text.primary">
          {saludo} {name}, Busca el equipo por su nombre.
        </Typography>


      <Box
        mx="auto"
        p={2}
        display="flex"
        flexDirection="column"
        sx={{
          [theme.breakpoints.up("md")]: { width: "60%" },
        }}
      >
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <SearchComponent onSearch={handleSearch} />
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

      <Grid container spacing={2} justifyContent="center" sx={{ marginTop: 2 }}>
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
      <Snackbar
        open={openSnackbar}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default VistaSeleccionarEquipo;
