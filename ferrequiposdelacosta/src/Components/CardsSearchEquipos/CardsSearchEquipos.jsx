import CardSearchEquipos from "../CardSearchEquipos/CardSearchEquipos.jsx";
import { Container, Grid } from "@mui/material";
import { useSelector } from "react-redux";

export default function CardsSearchEquipos() {
  const equipos = useSelector((state) => state.search.results);

  return (
    <div>
      <Container>
        <Grid
          container
          rowSpacing={{ xs: 2, sm: 6, md: 8 }}
          columnSpacing={{ xs: 2, sm: 6, md: 8 }}
        >
          {equipos &&
            equipos.map((equipo, index) => {
              const imageUrl =
                equipo.images && equipo.images.length > 0
                  ? equipo.images[0].url
                  : "default-image-url.jpg";

              return (
                <Grid item xs={12} sm={6} md={6} key={index}>
                  {/* <CardSearchEquipos name={equipo.name} url={imageUrl} /> */}
                  <CardSearchEquipos equipo={equipo} />
                </Grid>
              );
            })}
        </Grid>
      </Container>
    </div>
  );
}
