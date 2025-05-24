import { useSelector } from "react-redux";
import { Grid } from "@mui/material";
import CardEquipos from "../CardEquipos/CardEquipos.jsx";
import LoadingLogo from "../LoadingLogo/LoadingLogo.jsx";

export default function CardsEquipos() {
  const { equipos, loading } = useSelector((state) => state.equipos);
  
  return (
    <Grid container spacing={2} sx={{ p: { xs: 2, sm: 4, md: 6 } }}>
      {loading ? (
        <LoadingLogo />
      ) : (
        equipos &&
        equipos.map((equipo, index) => {
          const imageUrl =
            equipo.images && equipo.images.length > 0
              ? equipo.images[0].url
              : "default-image-url.jpg";

          return (
            <Grid item xs={6} sm={6} md={4} key={index}>
              <CardEquipos id={equipo.id} name={equipo.name} url={imageUrl} />
            </Grid>
          );
        })
      )}
    </Grid>
  );
}
