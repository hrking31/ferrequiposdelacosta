import { useSelector } from "react-redux";
import { Grid, Box } from "@mui/material";
import CardEquipos from "../CardEquipos/CardEquipos.jsx";
import LoadingLogo from "../LoadingLogo/LoadingLogo.jsx";

export default function CardsEquipos() {
  const { equipos, loading } = useSelector((state) => state.equipos);
  const equipo = useSelector((state) => state.search.results);
  const equiposToDisplay = equipo && equipo.length > 0 ? equipo : equipos;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        p: { xs: 1, sm: 2 },
        mt: 1,
        // border: "2px solid red",
      }}
    >
      
      <Grid container spacing={1}>
        {loading ? (
          <LoadingLogo />
        ) : (
          equiposToDisplay &&
          equiposToDisplay.map((equipo, index) => {
            const imageUrl =
              equipo.images && equipo.images.length > 0
                ? equipo.images[0].url
                : "default-image-url.jpg";

            return (
              <Grid item xs={6} sm={6} md={6} lg={4} key={equipo.id || index}>
                <CardEquipos id={equipo.id} name={equipo.name} url={imageUrl} />
              </Grid>
            );
          })
        )}
      </Grid>
    </Box>
  );
}
