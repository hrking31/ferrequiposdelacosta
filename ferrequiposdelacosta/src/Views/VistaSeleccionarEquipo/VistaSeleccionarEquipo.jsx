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
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchEquipos,
  clearSearchEquipo,
} from "../../Store/Slices/searchSlice";
import Search from "../../Components/Search/Search";
import CardsSearchEquipos from "../../Components/CardsSearchEquipos/CardsSearchEquipos";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo.jsx";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";

const VistaSeleccionarEquipo = () => {
  const theme = useTheme();
  const { logout } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);
  const { name, photoURL } = useSelector((state) => state.user);
  const equipos = useSelector((state) => state.search.results);
  const loading = useSelector((state) => state.search.loading);
  const error = useSelector((state) => state.search.error);
  const hasSearched = useSelector((state) => state.search.hasSearched);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("info");
  const isFullScreen = useMediaQuery("(max-width:915px)");
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isMedium = useMediaQuery(theme.breakpoints.down("lg"));

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
        "Hubo un problema al realizar la búsqueda. Inténtalo de nuevo.",
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
        alignItems: "center",
        // justifyContent: { xs: "flex-start", md: "center" },
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
      <Box
        sx={{
          p: 2,
          flexShrink: 0,
          width: "100%",
        }}
      >
        <HeaderUsuarioConModal name={name} photoURL={photoURL} />
      </Box>

      <Box
        sx={{
          // flexGrow: { xs: 0, md: 1 },
          flexGrow: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          mx: "auto",
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
                {[...Array(isMobile ? 1 : isMedium ? 2 : 3)].map((_, index) => (
                  <Grid item xs={12} sm={12} md={6} lg={4} key={index}>
                    <Skeleton
                      variant="rectangular"
                      animation="wave"
                      sx={{
                        borderRadius: 2,
                        height: { xs: 280, md: 350, lg: 400 },
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </Grid>
        </Grid>

        <Box
          sx={{
            flexShrink: 0,
            width: "100%",
            //  border: "2px solid red"
          }}
        >
          <Grid container spacing={2} justifyContent="center" sx={{ mt: 2 }}>
            <Grid item xs={8} sm={4} md={4}>
              <Button variant="contained" onClick={handleEditar} fullWidth>
                EDITAR
              </Button>
            </Grid>
            <Grid item xs={8} sm={4} md={4}>
              <Button variant="danger" onClick={handleEliminar} fullWidth>
                ELIMINAR
              </Button>
            </Grid>
            <Grid item xs={8} sm={4} md={4}>
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
      </Box>

      <Box
        sx={{
          p: 1,
          flexShrink: 0,
          width: "100%",
        }}
      >
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
            <Button onClick={handlerLogout} variant="danger" fullWidth>
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
