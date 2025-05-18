import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Snackbar, Alert, Container, Grid } from "@mui/material";
import CardSearchEquipos from "../CardSearchEquipos/CardSearchEquipos.jsx";
import LoadingLogo from "../LoadingLogo/LoadingLogo.jsx";

export default function CardsSearchEquipos({
  onSelectEquipo,
  equipoSeleccionado,
}) {
  const equipos = useSelector((state) => state.search.results);
  const loading = useSelector((state) => state.search.loading);
  const error = useSelector((state) => state.search.error);
  const hasSearched = useSelector((state) => state.search.hasSearched);

  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("info");
  const [openSnackbar, setOpenSnackbar] = useState(false);

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

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  if (loading) return <LoadingLogo />;

  return (
    <Container>
      <Grid
        container
        rowSpacing={{ xs: 2, sm: 6, md: 8 }}
        columnSpacing={{ xs: 2, sm: 6, md: 8 }}
      >
        {equipos.map((equipo) => (
          <Grid item xs={12} sm={6} md={6} key={equipo.id}>
            <CardSearchEquipos
              equipo={equipo}
              onSelect={() => onSelectEquipo(equipo)}
              isSelected={equipoSeleccionado?.id === equipo.id}
            />
          </Grid>
        ))}
      </Grid>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}
