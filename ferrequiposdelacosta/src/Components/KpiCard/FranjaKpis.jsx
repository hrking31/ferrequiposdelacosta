import { cloneElement } from "react";
import PropTypes from "prop-types";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

// LOS NÚMEROS EN UNA FRANJA (2026-10-20), para el menú en pantalla angosta,
// donde las tarjetas grandes no entran. Va donde estaba la barra: abajo en el
// celular y arriba de ahí en adelante. Cada número abre su detalle, y al
// extremo derecho va lo que se le pase en `extremo` (el logo de la tienda).
//
// Mismo lenguaje que KpiCard —borde y resplandor del color, fijos—, pero en un
// renglón: ícono, cifra y subtítulo.
export default function FranjaKpis({ kpis, extremo }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      {kpis.map((kpi) => (
        <ButtonBase
          key={kpi.etiqueta}
          onClick={kpi.onClick}
          aria-label={kpi.etiqueta}
          sx={{
            flex: 1,
            minWidth: 0,
            justifyContent: "flex-start",
            gap: 1,
            px: 1.25,
            py: 0.75,
            textAlign: "left",
            borderRadius: 2,
            border: "1px solid",
            borderColor: kpi.color,
            boxShadow: `0 0 10px ${alpha(kpi.color, 0.3)}`,
            bgcolor: "background.paper",
          }}
        >
          {cloneElement(kpi.icono, { sx: { color: kpi.color, fontSize: 22, flexShrink: 0 } })}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight="bold" noWrap sx={{ lineHeight: 1.2 }}>
              {kpi.valor}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
              {kpi.subtitulo}
            </Typography>
          </Box>
        </ButtonBase>
      ))}
      {extremo}
    </Stack>
  );
}

FranjaKpis.propTypes = {
  kpis: PropTypes.arrayOf(
    PropTypes.shape({
      etiqueta: PropTypes.string.isRequired,
      icono: PropTypes.element.isRequired,
      color: PropTypes.string.isRequired,
      valor: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      subtitulo: PropTypes.string.isRequired,
      onClick: PropTypes.func,
    }),
  ).isRequired,
  extremo: PropTypes.node,
};
