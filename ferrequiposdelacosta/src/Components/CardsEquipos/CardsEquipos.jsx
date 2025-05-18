import CardEquipos from "../CardEquipos/CardEquipos.jsx";
import { Container, Grid } from "@mui/material";
import { useSelector } from "react-redux";
import LoadingLogo from "../LoadingLogo/LoadingLogo.jsx";

export default function CardsEquipos() {
  const { equipos, loading } = useSelector((state) => state.equipos);
  return (
    <div>
      <Container>
        <Grid
          container
          rowSpacing={{ xs: 2, sm: 6, md: 8 }}
          columnSpacing={{ xs: 2, sm: 6, md: 8 }}
        >
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
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <CardEquipos
                    id={equipo.id}
                    name={equipo.name}
                    url={imageUrl}
                  />
                </Grid>
              );
            })
          )}
        </Grid>
      </Container>
    </div>
  );
}
