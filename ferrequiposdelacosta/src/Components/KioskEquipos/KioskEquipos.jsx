import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Grid,
  useTheme,
  Alert,
  Snackbar,
} from "@mui/material";
import {
  fetchEquipos,
  clearSearchEquipo,
} from "../../Store/Slices/searchSlice";
import CardsEquipos from "../../Components/CardsEquipos/CardsEquipos";
import Search from "../../Components/Search/Search";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo.jsx";

export default function KioskEquipos() {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [openAccount, setOpenAccount] = useState(false);
  const theme = useTheme();
  const equipos = useSelector((state) => state.equipos.equipos);
  const equipo = useSelector((state) => state.search.results);
  const loading = useSelector((state) => state.search.loading);
  const error = useSelector((state) => state.search.error);
  const hasSearched = useSelector((state) => state.search.hasSearched);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("info");

  useEffect(() => {
    if (error) {
      setSnackbarMessage(
        "Hubo un problema al realizar la búsqueda. Inténtalo de nuevo.",
      );
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
    } else if (hasSearched && !loading && equipo.length === 0) {
      setSnackbarMessage("No se encontraron equipos.");
      setSnackbarSeverity("warning");
      setOpenSnackbar(true);
    }
  }, [error, equipos, loading, hasSearched]);

  useEffect(() => {
    return () => {
      dispatch(clearSearchEquipo());
    };
  }, [dispatch]);

  const handleSearch = (searchTerm) => {
    dispatch(fetchEquipos(searchTerm));
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  return (
    <Grid
      container
      sx={{
        display: "flex",
        flexDirection: "column",
        pt: 8,
        pb: 8,
        // border: "2px solid red",
      }}
    >
      <CardsEquipos />

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
