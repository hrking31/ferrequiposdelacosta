import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Grid, Box } from "@mui/material";
import {
  fetchEquipos,
  clearSearchEquipo,
} from "../../Store/Slices/searchSlice";
import KioskCards from "../KioskCards/KioskCards.jsx";
import Search from "../../Components/Search/Search";
import Footer from "../../Components/Footer/Footer.jsx";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";

export default function KioskEquipos() {
  const dispatch = useDispatch();
  const equipo = useSelector((state) => state.search.results);
  const loading = useSelector((state) => state.search.loading);
  const error = useSelector((state) => state.search.error);
  const hasSearched = useSelector((state) => state.search.hasSearched);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

  useEffect(() => {
    if (error) {
      showSnackbar(
        "Hubo un problema al realizar la búsqueda. Inténtalo de nuevo.",
        "error",
      );
    } else if (hasSearched && !loading && equipo.length === 0) {
      showSnackbar("No se encontraron equipos.", "warning");
    }
  }, [error, equipo, loading, hasSearched, showSnackbar]);

  useEffect(() => {
    return () => {
      dispatch(clearSearchEquipo());
    };
  }, [dispatch]);

  const handleSearch = (searchTerm) => {
    dispatch(fetchEquipos(searchTerm));
  };

  return (
    <Grid
      container
      sx={{
        display: "flex",
        flexDirection: "column",
        pt: 1,
        // border: "2px solid red",
      }}
    >
      <Box sx={{ p: 2 }}>
        <Search onSearch={handleSearch} />
      </Box>

      <KioskCards />

      <Box
        component="footer"
        sx={{
          width: "100%",
          mt: 2,
          //  border: "2px solid red"
        }}
      >
        <Footer />
      </Box>

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Grid>
  );
}
