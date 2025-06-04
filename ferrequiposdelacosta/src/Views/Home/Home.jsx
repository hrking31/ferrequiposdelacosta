import CardsEquipos from "../../Components/CardsEquipos/CardsEquipos";
import Search from "../../Components/Search/Search";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchEquiposData } from "../../Store/Slices/equiposSlice";
import { fetchEquipos } from "../../Store/Slices/searchSlice";
import { Box, Grid, Alert, Snackbar } from "@mui/material";
import InstallApp from "../../Components/InstallApp/InstallApp.jsx";
import EquipoImageCarousel from "../../Components/EquipoImageCarousel/EquipoImageCarousel.jsx";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo.jsx";

export default function Home() {
  const dispatch = useDispatch();
  const equipos = useSelector((state) => state.equipos.equipos); //solo realiza consulta al cargar la pagina
  const equipo = useSelector((state) => state.search.results);
  const loading = useSelector((state) => state.search.loading);
  const error = useSelector((state) => state.search.error);
  const hasSearched = useSelector((state) => state.search.hasSearched);

  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("info");

  // useEffect(() => {
  //   dispatch(fetchEquiposData());
  // }, [dispatch]);

  useEffect(() => {
    if (equipos.length === 0) {
      dispatch(fetchEquiposData()); // Solo se hace la consulta si `equipos` está vacío
    }
  }, [dispatch, equipos]);

  useEffect(() => {
    if (error) {
      setSnackbarMessage(
        "Hubo un problema al realizar la búsqueda. Inténtalo de nuevo."
      );
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
    } else if (hasSearched && !loading && equipo.length === 0) {
      setSnackbarMessage("No se encontraron equipos.");
      setSnackbarSeverity("warning");
      setOpenSnackbar(true);
    }
  }, [error, equipos, loading, hasSearched]);

  const handleSearch = (searchTerm) => {
    dispatch(fetchEquipos(searchTerm));
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  return (
    <Grid container >
      <Grid item xs={12} sm={3} md={3}>
        <Box sx={{ flex: 1, 
        p:2,
          // border: "2px solid #000"
           }}>
          <Search onSearch={handleSearch} />
          <InstallApp />
          <EquipoImageCarousel />
        </Box>
      </Grid>
      <Grid item xs={12} sm={9} md={9}>
        <Box sx={{ flex: 1,
          //  border: "2px solid #000" 
           }}>
          {loading ? <LoadingLogo /> : <CardsEquipos />}
        </Box>
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
    </Grid>
  );
}
