import { cloneElement } from "react";
import PropTypes from "prop-types";
import { Box, Paper, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

// La etiqueta de la tarjeta de la plata: la que va destacada.
export const ETIQUETA_PAGOS = "PAGOS PENDIENTES";

// Una tarjeta con el borde y el resplandor de su color, fijos, como KpiCard.
const marco = (color, resplandor) => ({
  minWidth: 0,
  borderRadius: 3,
  border: "1px solid",
  borderColor: color,
  boxShadow: `0 0 ${resplandor}px ${alpha(color, 0.3)}`,
  display: "flex",
  alignItems: "center",
});

const circulo = (color, tamano) => ({
  width: tamano,
  height: tamano,
  borderRadius: "50%",
  bgcolor: alpha(color, 0.12),
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
});

// LOS KPI DEL MENÚ CON LA PLATA DE PROTAGONISTA (idea 2 del lienzo, pedido
// del dueño, 2026-10-29), para cuando las cinco tarjetas en fila no caben:
// PAGOS PENDIENTES en una tarjeta grande a la izquierda y los demás al lado,
// de a dos por fila y bajitos (ícono, nombre y cifra en un renglón). Si el
// rol no ve la plata, solo la cuadrícula. Solo muestran, como en el
// computador ancho.
export default function KpisDestacados({ kpis }) {
  const pagos = kpis.find((kpi) => kpi.etiqueta === ETIQUETA_PAGOS);
  const resto = kpis.filter((kpi) => kpi !== pagos);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: pagos && resto.length > 0 ? "minmax(0, 1.15fr) minmax(0, 1fr)" : "minmax(0, 1fr)",
        gap: 2,
      }}
    >
      {pagos && (
        <Paper elevation={0} sx={{ ...marco(pagos.color, 16), gap: 2, px: 2.75, py: 2 }}>
          <Box sx={circulo(pagos.color, 56)}>{cloneElement(pagos.icono, { sx: { color: pagos.color, fontSize: 28 } })}</Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ color: pagos.color, fontWeight: 700, letterSpacing: 0.5 }}>
              {pagos.etiqueta}
            </Typography>
            <Typography variant="h4" fontWeight="bold" sx={{ my: 0.5, whiteSpace: "nowrap" }}>
              {pagos.valor}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {pagos.subtitulo}
            </Typography>
          </Box>
        </Paper>
      )}
      {resto.length > 0 && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(resto.length, 2)}, minmax(0, 1fr))`,
            gap: 1.25,
          }}
        >
          {resto.map((kpi) => (
            <Paper key={kpi.etiqueta} elevation={0} sx={{ ...marco(kpi.color, 10), gap: 1.5, px: 1.75, py: 1.25 }}>
              <Box sx={circulo(kpi.color, 36)}>{cloneElement(kpi.icono, { sx: { color: kpi.color, fontSize: 19 } })}</Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {/* Si no cabe, en dos renglones: cortado no se leía. */}
                <Typography
                  variant="caption"
                  component="div"
                  sx={{ color: kpi.color, fontWeight: 700, letterSpacing: 0.4, lineHeight: 1.3 }}
                >
                  {kpi.etiqueta}
                </Typography>
                <Typography variant="caption" component="div" color="text.secondary" noWrap>
                  {kpi.subtitulo}
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight="bold" sx={{ flexShrink: 0 }}>
                {kpi.valor}
              </Typography>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
}

KpisDestacados.propTypes = {
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
