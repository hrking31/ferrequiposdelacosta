import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import { Box, Grid, Button, Snackbar, Alert, Typography  } from "@mui/material";
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
    <Box sx={{ padding: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
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
            <Box sx={{ marginBottom: 4 }}>
              <SearchComponent onSearch={handleSearch} />
            </Box>
            <Box sx={{ marginBottom: 4 }}>
              <CardsSearchEquipos
                onSelectEquipo={setEquipoSeleccionado}
                equipoSeleccionado={equipoSeleccionado}
              />
            </Box>
          </Box>
        </Grid>
      </Grid>

      <Grid container spacing={2} justifyContent="center" sx={{ marginTop: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Button
            variant="contained"
            onClick={handleCancelarSeleccion}
            sx={{
              width: "200px",
              height: "45px",
              color: "#ffffff",
              backgroundColor: "#FF4C4C",
              "&:hover": {
                backgroundColor: "#D32F2F",
              },
            }}
          >
            CANCELAR
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Button
            variant="contained"
            onClick={handleEditar}
            sx={{
              width: "200px",
              height: "45px",
              color: "#ffffff",
              backgroundColor: "#1E90FF",
              "&:hover": {
                backgroundColor: "#4682B4",
              },
            }}
          >
            EDITAR
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Button
            variant="contained"
            onClick={handleEliminar}
            sx={{
              width: "200px",
              height: "45px",
              color: "#ffffff",
              backgroundColor: "#1E90FF",
              "&:hover": {
                backgroundColor: "#4682B4",
              },
            }}
          >
            ELIMINAR
          </Button>
        </Grid>
      </Grid>

      <Grid container spacing={2} justifyContent="center" sx={{ marginTop: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Button
            component={Link}
            to="/adminforms"
            variant="contained"
            fullWidth
            sx={{
              height: "45px",
              color: "#ffffff",
              backgroundColor: "#1E90FF",
              "&:hover": {
                backgroundColor: "#4682B4",
              },
            }}
          >
            MENU
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Button
            onClick={handlerLogout}
            variant="contained"
            fullWidth
            sx={{
              height: "45px",
              color: "#ffffff",
              backgroundColor: "#1E90FF",
              "&:hover": {
                backgroundColor: "#4682B4",
              },
            }}
          >
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
