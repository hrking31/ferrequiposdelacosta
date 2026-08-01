import { Grid } from "@mui/material";
import PropTypes from "prop-types";
import CardSearchEquipos from "../CardSearchEquipos/CardSearchEquipos.jsx";

// Los equipos llegan por prop: antes se leían de "search.results", el resultado
// de consultar Firestore. La vista de admin ya no consulta por cada búsqueda
// —filtra el catálogo que la app tiene cargado— así que es ella quien decide
// qué lista mostrar.
export default function CardsSearchEquipos({
  equipos,
  onSelectEquipo,
  equipoSeleccionado,
}) {
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

CardsSearchEquipos.propTypes = {
  equipos: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
    }),
  ).isRequired,
  onSelectEquipo: PropTypes.func.isRequired,
  equipoSeleccionado: PropTypes.shape({
    id: PropTypes.string,
  }),
};
