import PropTypes from "prop-types";
import { Box, Divider, Stack, Typography, useTheme } from "@mui/material";

// EL DETALLE DE "COTIZACIONES" (2026-10-22): de las que entraron este mes,
// cuántas faltan por atender y cuántas ya se cotizaron, con el total al pie.
//
// Sale de la misma pizarra que el número del recuadro (ver
// Utils/resumenDocumentos), así que verlo no cuesta ninguna lectura.
//
// "Por atender" es lo que todavía no tiene respuesta: las pendientes y las
// pausadas. Una que alguien tiene abierta se cuenta donde estaba hasta que se
// termine.
//
// `cotizacionesMes` llega en null mientras la pizarra no tenga el dato (entre
// que se publica y corre el primer recuento).
export default function DetalleCotizaciones({ cotizacionesMes }) {
  const theme = useTheme();

  if (!cotizacionesMes) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
        El detalle todavía no está listo.
      </Typography>
    );
  }

  if (cotizacionesMes.total === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
        Todavía no hay cotizaciones este mes.
      </Typography>
    );
  }

  const fila = (clave, label, cantidad, color) => (
    <Stack
      key={clave}
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      spacing={2}
      sx={{ py: 0.75 }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
        {color && (
          <Box
            sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color, flexShrink: 0 }}
          />
        )}
        <Typography variant="body2" sx={{ fontWeight: color ? 400 : 700 }}>
          {label}
        </Typography>
      </Stack>
      <Typography variant="body2" sx={{ fontWeight: 700, flexShrink: 0 }}>
        {cantidad}
      </Typography>
    </Stack>
  );

  return (
    <Box>
      {fila("porAtender", "Por atender", cotizacionesMes.porAtender, theme.palette.warning.main)}
      {fila("cotizadas", "Cotizadas", cotizacionesMes.cotizadas, theme.palette.success.main)}
      <Divider sx={{ my: 0.5 }} />
      {fila("total", "Total", cotizacionesMes.total)}
    </Box>
  );
}

DetalleCotizaciones.propTypes = {
  cotizacionesMes: PropTypes.shape({
    total: PropTypes.number,
    cotizadas: PropTypes.number,
    porAtender: PropTypes.number,
  }),
};
