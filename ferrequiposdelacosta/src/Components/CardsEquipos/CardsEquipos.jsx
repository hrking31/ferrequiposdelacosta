import { useSelector } from "react-redux";
import { Grid, Box, Typography } from "@mui/material";
import CardEquipos from "../CardEquipos/CardEquipos.jsx";
import LoadingLogo from "../LoadingLogo/LoadingLogo.jsx";
import { buscarEnCatalogo, miniaturaDe } from "../CatalogoEquipos/catalogoEquipos";

export default function CardsEquipos() {
  const { equipos, loading } = useSelector((state) => state.equipos);
  // Lo escrito en el buscador filtra el catálogo en memoria (ver Search).
  const termino = useSelector((state) => state.search.termino);
  const equiposToDisplay = buscarEnCatalogo(equipos, termino);

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
                ? miniaturaDe(equipo.images[0])
                : "default-image-url.jpg";

            return (
              <Grid item xs={6} sm={6} md={6} lg={4} key={equipo.id || index}>
                <CardEquipos id={equipo.id} name={equipo.name} url={imageUrl} />
              </Grid>
            );
          })
        )}
        {!loading && termino.trim() && equiposToDisplay.length === 0 && (
          <Grid item xs={12}>
            <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
              Ningún equipo coincide con &quot;{termino.trim()}&quot;.
            </Typography>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
