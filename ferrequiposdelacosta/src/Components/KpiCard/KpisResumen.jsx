import PropTypes from "prop-types";
import { Box } from "@mui/material";
import KpiCard from "./KpiCard";
import { ETIQUETA_PAGOS } from "./KpisDestacados";

// LOS KPI DEL MENÚ EN UNA COLUMNA A LA DERECHA (idea 3 del lienzo, pedido del
// dueño, 2026-10-29), para el computador angosto: arriba no caben y le
// quitaban alto a los botones. Las mismas tarjetas de la pantalla ancha, en
// su copia más chica (`mediano`), la plata primero, sueltas: sin título ni
// recuadro alrededor (también pedido suyo), así las tarjetas tienen más
// lugar. Del alto de los botones del menú, que van en la misma fila (ver
// AdminForms), repartidas en él. Solo muestran, como en el computador ancho.
export default function KpisResumen({ kpis }) {
  const pagos = kpis.find((kpi) => kpi.etiqueta === ETIQUETA_PAGOS);
  const resto = kpis.filter((kpi) => kpi !== pagos);

  return (
    <Box
      component="aside"
      aria-label="Indicadores clave"
      sx={{
        width: 280,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 0.75,
        // Aire para el resplandor de las tarjetas, igual al de los botones.
        py: "6px",
      }}
    >
      {[pagos, ...resto].filter(Boolean).map((kpi) => (
        <KpiCard key={kpi.etiqueta} {...kpi} mediano onClick={undefined} />
      ))}
    </Box>
  );
}

KpisResumen.propTypes = {
  // Los mismos que reciben las tarjetas del menú (ver AdminForms).
  kpis: PropTypes.arrayOf(
    PropTypes.shape({
      etiqueta: PropTypes.string.isRequired,
      icono: PropTypes.element.isRequired,
      color: PropTypes.string.isRequired,
      valor: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      subtitulo: PropTypes.string.isRequired,
    }),
  ).isRequired,
};
