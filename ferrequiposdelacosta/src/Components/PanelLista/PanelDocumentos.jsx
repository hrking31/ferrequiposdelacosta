import PropTypes from "prop-types";
import { Box, IconButton, Stack, Tooltip, Typography, useTheme } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { alpha } from "@mui/material/styles";

// LA COLUMNA DE LA DERECHA del buzón de cotizaciones y de la lista de cuentas
// de cobro, solo en computador ancho (2026-10-22): un recuadro que muestra lo
// de la lista o, si se toca una tarjeta de la lista, su vista previa.
//
// SOLO EL RECUADRO, de alto completo, para que se vea todo (pedido del dueño,
// 2026-10-23). Arriba llevaba dos tarjetas —la del mes y otra de la lista— y
// se quitaron: el número del mes queda en el menú.
//
// Seguimiento usa el mismo recuadro debajo de sus dos tarjetas, para que las
// tres pantallas se vean igual (ver PanelSeguimiento).
export default function PanelDocumentos({ titulo, icono, cantidad, onCerrar, children }) {
  const theme = useTheme();
  const acento = theme.palette.custom.accent;

  return (
    // Se desplaza solo: un resumen largo no estira la pantalla.
    <Box
      sx={{
        height: "100%",
        minHeight: 0,
        overflowY: "auto",
        p: 1.5,
        borderRadius: 2,
        border: "1px solid",
        borderColor: alpha(acento, 0.5),
        bgcolor: "background.paper",
        boxSizing: "border-box",
        // En columna, para que el contenido pueda estirarse al alto que queda
        // (ver ResumenLista, que reparte sus secciones a lo alto).
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        {/* Más grande y en negrita que la línea de abajo, que es chica, gris
            y sin mayúsculas: con los dos del mismo tamaño no se distinguían
            (lo notó el dueño, 2026-10-23). */}
        <Typography
          variant="subtitle1"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: 1,
            lineHeight: 1.6,
            color: acento,
            "& svg": { fontSize: 22 },
          }}
        >
          {icono}
          {titulo}
        </Typography>
        {/* Con una vista previa abierta, la X de la esquina vuelve al
            resumen (pedido del dueño, 2026-10-23). */}
        {onCerrar && (
          <Tooltip title="Volver al resumen">
            <IconButton size="small" onClick={onCerrar} aria-label="Volver al resumen">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
      {/* De cuántas salen los números, para que nadie espere que coincidan
          con los del mes. Debajo del título y en gris: el dueño lo prefirió
          así a una pastilla junto al título (2026-10-23). */}
      {cantidad !== undefined && (
        <Typography variant="caption" color="text.secondary" component="div" sx={{ pl: "29px" }}>
          {cantidad === 1 ? "Basado en la última" : `Basado en las últimas ${cantidad}`}
        </Typography>
      )}
      {/* Crece hasta el fondo del recuadro; si el contenido no cabe, el
          recuadro se desplaza. */}
      <Box sx={{ flex: "1 0 auto", display: "flex", flexDirection: "column" }}>{children}</Box>
    </Box>
  );
}

PanelDocumentos.propTypes = {
  // El rótulo del recuadro y su ícono.
  titulo: PropTypes.string.isRequired,
  icono: PropTypes.element.isRequired,
  // Si viene, la línea "Basado en las últimas N" debajo del título: de
  // cuántas de la lista salen las estadísticas.
  cantidad: PropTypes.number,
  // Si viene, la X de la esquina del recuadro (con una vista previa abierta).
  onCerrar: PropTypes.func,
  children: PropTypes.node,
};
