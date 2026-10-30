import { cloneElement } from "react";
import PropTypes from "prop-types";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

// LOS NÚMEROS EN UNA FRANJA (2026-10-20), para el menú en pantalla angosta,
// donde las tarjetas grandes no entran. Va donde estaba la barra: abajo en el
// celular y arriba de ahí en adelante.
//
// TODOS EN UNA FILA, SOLO ÍCONO Y CIFRA (2026-10-21): los cuatro recuadros del
// computador, sin el subtítulo, para que entren. Cada uno toma el ancho que
// pide su cifra —la plata pendiente es la más larga—. Los que tienen detalle
// lo abren al tocarlos; los demás solo muestran el número.
//
// Mismo lenguaje que KpiCard —borde y resplandor del color, fijos—.
//
// `vertical`: de pie, una encima de la otra y repartidas en el alto, para el
// celular acostado, donde va a la izquierda del menú (pedido del dueño,
// 2026-10-29), con el ícono al lado de la cifra para que entren las cinco en
// ese alto. Mide lo que pide su cifra más larga.
export default function FranjaKpis({ kpis, vertical = false }) {
  return (
    <Stack
      direction={vertical ? "column" : "row"}
      alignItems={vertical ? "stretch" : "center"}
      spacing={1}
      sx={vertical ? { flexShrink: 0, py: "6px" } : undefined}
    >
      {kpis.map((kpi) => {
        const Casilla = kpi.onClick ? ButtonBase : Box;
        return (
          <Casilla
            key={kpi.etiqueta}
            onClick={kpi.onClick}
            aria-label={kpi.etiqueta}
            sx={{
              flex: "1 1 auto",
              minWidth: 0,
              // El ícono arriba y la cifra abajo; de pie, uno al lado del otro.
              display: "flex",
              flexDirection: vertical ? "row" : "column",
              alignItems: "center",
              justifyContent: vertical ? "flex-start" : "center",
              gap: vertical ? 1 : 0.25,
              px: vertical ? 1.25 : 1,
              py: vertical ? 0.5 : 0.75,
              borderRadius: 2,
              border: "1px solid",
              borderColor: kpi.color,
              boxShadow: `0 0 10px ${alpha(kpi.color, 0.3)}`,
              bgcolor: "background.paper",
            }}
          >
            {cloneElement(kpi.icono, { sx: { color: kpi.color, fontSize: 22, flexShrink: 0 } })}
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              noWrap
              sx={{ lineHeight: 1.2, maxWidth: "100%" }}
            >
              {kpi.valor}
            </Typography>
          </Casilla>
        );
      })}
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
      onClick: PropTypes.func,
    }),
  ).isRequired,
  vertical: PropTypes.bool,
};
