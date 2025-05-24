import { useSelector } from "react-redux";
import { Grid } from "@mui/material";
import CardSearchEquipos from "../CardSearchEquipos/CardSearchEquipos.jsx";

export default function CardsSearchEquipos({
  onSelectEquipo,
  equipoSeleccionado,
}) {
  const equipos = useSelector((state) => state.search.results);

  return (
    <Grid container spacing={2} sx={{ px: { xs: 2, sm: 4, md: 6 } }}>
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
  );
}
