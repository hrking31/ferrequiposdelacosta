import PropTypes from "prop-types";
import { Box, Divider, Stack, Typography } from "@mui/material";

// EL DETALLE DE "EQUIPOS ACTIVOS" (2026-10-20): cuántas unidades hay afuera de
// cada equipo, de la que más tiene a la que menos, con el total al pie.
//
// Sale de la misma pizarra que el número del recuadro (ver
// calcularAporteFactura), así que verlo no cuesta ninguna lectura: viene en el
// documento que el menú y Seguimiento ya leen. La usan los dos: el menú en un
// diálogo y Seguimiento en el recuadro de la historia.
//
// `equiposPorTipo` llega en null mientras la pizarra no tenga el detalle
// (entre que se publica y corre el primer repaso).
export default function DetalleEquiposActivos({ equiposPorTipo }) {
  if (!equiposPorTipo) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
        El detalle todavía no está listo.
      </Typography>
    );
  }

  const filas = Object.entries(equiposPorTipo).sort(
    ([nombreA, a], [nombreB, b]) => b - a || nombreA.localeCompare(nombreB),
  );

  if (filas.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
        No hay equipos en alquiler.
      </Typography>
    );
  }

  const total = filas.reduce((suma, [, cantidad]) => suma + cantidad, 0);

  const fila = (nombre, cantidad, negrita = false) => (
    <Stack
      key={nombre}
      direction="row"
      justifyContent="space-between"
      alignItems="baseline"
      spacing={2}
      sx={{ py: 0.75 }}
    >
      <Typography variant="body2" sx={{ fontWeight: negrita ? 700 : 400, minWidth: 0 }}>
        {nombre}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, flexShrink: 0 }}>
        {cantidad}
      </Typography>
    </Stack>
  );

  return (
    <Box>
      {filas.map(([nombre, cantidad]) => fila(nombre, cantidad))}
      <Divider sx={{ my: 0.5 }} />
      {fila("Total", total, true)}
    </Box>
  );
}

DetalleEquiposActivos.propTypes = {
  equiposPorTipo: PropTypes.objectOf(PropTypes.number),
};
