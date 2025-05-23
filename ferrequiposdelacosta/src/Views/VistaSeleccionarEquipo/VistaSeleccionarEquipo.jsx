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

const VistaSeleccionarEquipo = () => {
  const { logout } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);
  const { name, genero } = useSelector((state) => state.user);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("info");
  const { results } = useSelector((state) => state.search);

  
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

  return (
    <Box p={2} display="flex" flexDirection="column" gap={2}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Box sx={{ marginBottom: { xs: 1, sm: 2 }, width: "100%" }}>
            <Typography
              variant="h4"
              sx={{
                color: "#00008B",
                fontWeight: "bold",
                overflowWrap: "break-word",
                fontSize: { xs: "h5.fontSize", sm: "h4.fontSize" },
              }}
            >
              {saludo} {name} Busca el equipo por su nombre.
            </Typography>
          </Box>
          <Box sx={{ padding: 2 }}>
            <SearchComponent onSearch={handleSearch} />
            <Box sx={{ mb: { xs: 2, md: 6 } }}>
              {results.length > 0 ? (
                <CardsSearchEquipos
                  onSelectEquipo={setEquipoSeleccionado}
                  equipoSeleccionado={equipoSeleccionado}
                />
              ) : (
                <Grid container spacing={2}>
                  {[...Array(2)].map((_, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
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
            </Box>
          </Box>
        </Grid>
      </Grid>

      <Box
        mx="auto"
        p={2}
        display="flex"
        flexDirection="column"
        sx={{
          [theme.breakpoints.up("md")]: { width: "60%" },
        }}
      >
        <Grid container spacing={2} justifyContent="center">
          <Grid item xs={12} md={4}>
            <Button
              variant="danger"
              onClick={handleCancelarSeleccion}
              fullWidth
            >
              CANCELAR
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Button variant="contained" onClick={handleEditar} fullWidth>
              EDITAR
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Button variant="danger" onClick={handleEliminar} fullWidth>
              ELIMINAR
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
