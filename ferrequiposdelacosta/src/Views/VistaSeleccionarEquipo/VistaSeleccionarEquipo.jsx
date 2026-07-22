import {
  Box,
  Grid,
  Stack,
  Button,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  Skeleton,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LogoutIcon from "@mui/icons-material/Logout";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/useAuth";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchEquipos,
  clearSearchEquipo,
} from "../../Store/Slices/searchSlice";
import Search from "../../Components/Search/Search";
import CardsSearchEquipos from "../../Components/CardsSearchEquipos/CardsSearchEquipos";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo.jsx";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../../Components/AppSnackbar/AppSnackbar";

const VistaSeleccionarEquipo = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);
  const { name, photoURL, role, genero } = useSelector(
    (state) => state.user,
  );
  const equipos = useSelector((state) => state.search.results);
  const loading = useSelector((state) => state.search.loading);
  const error = useSelector((state) => state.search.error);
  const hasSearched = useSelector((state) => state.search.hasSearched);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();
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
      showSnackbar("Debes seleccionar un Equipo para Editar.", "warning");
    }
  };

  const handleEliminar = () => {
    if (equipoSeleccionado) {
      navigate("/vistaeliminarequipo", {
        state: { equipo: equipoSeleccionado },
      });
    } else {
      showSnackbar("Debes seleccionar un Equipo para Eliminar.", "warning");
    }
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
      showSnackbar(
        "Hubo un problema al realizar la búsqueda. Inténtalo de nuevo.",
        "error",
      );
    } else if (hasSearched && !loading && equipos.length === 0) {
      showSnackbar("No se encontraron equipos.", "warning");
    }
  }, [error, equipos, loading, hasSearched, showSnackbar]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        width: "100%",
        pt: isFullScreen ? 0 : { md: 8, lg: 9 },
        pb: isFullScreen ? { xs: 7, sm: 8 } : 2,
        px: { xs: 2, sm: 3 },
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <Box
        sx={{
          p: 2,
          flexShrink: 0,
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <HeaderUsuarioConModal
            name={name}
            photoURL={photoURL}
            role={role}
            genero={genero}
            vista={"Edita o Elimina un Equipo"}
          />
        </Box>

        {!isFullScreen && (
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Tooltip title="Menú">
              <IconButton onClick={() => navigate("/adminforms")}>
                <DashboardIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Cerrar sesión">
              <IconButton onClick={handlerLogout} color="error">
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: { xs: "flex-start", md: "center" },
          flexDirection: "column",
          mx: "auto",
          width: "100%",
          [theme.breakpoints.up("md")]: { width: "60%" },
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
              <LoadingLogo height="40vh" text="Buscando equipos..." />
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

      {isFullScreen && (
        <Box sx={{ p: 1.5, flexShrink: 0 }}>
          <Stack
            direction="row"
            spacing={2}
            justifyContent="center"
            alignItems="stretch"
          >
            <Button
              variant="contained"
              fullWidth
              sx={{ py: 0.75, px: 1, fontSize: "0.75rem" }}
              onClick={() => navigate("/adminforms")}
            >
              MENU
            </Button>

            <Button
              onClick={handlerLogout}
              variant="danger"
              fullWidth
              sx={{ py: 0.75, px: 1, fontSize: "0.75rem" }}
            >
              CERRAR SESIÓN
            </Button>
          </Stack>
        </Box>
      )}

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Box>
  );
};

export default VistaSeleccionarEquipo;
