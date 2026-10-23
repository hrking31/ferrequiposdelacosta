import PropTypes from "prop-types";
import { Box, Divider, Stack, Typography } from "@mui/material";

// CUÁNTOS DOCUMENTOS HAY EN CADA ESTADO, con el total al pie (2026-10-22). Lo
// usan los detalles de Cotizaciones y de Cuentas de cobro del menú.
//
// Van TODOS los estados, también los que están en cero: el dueño lo quiere
// como información de control —por ejemplo, para ver si quedó algo "En
// proceso" que alguien abrió y nunca cerró—, y una fila que desaparece no dice
// nada.
//
// `filas` llega en null mientras la pizarra no tenga el dato (entre que se
// publica y corre el primer recuento).
export default function DetallePorEstado({ filas, vacio }) {
  if (!filas) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
        El detalle todavía no está listo.
      </Typography>
    );
  }

  const total = filas.reduce((suma, { cantidad }) => suma + cantidad, 0);

  if (total === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
        {vacio}
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
      {filas.map(({ clave, label, cantidad, color }) => fila(clave, label, cantidad, color))}
      <Divider sx={{ my: 0.5 }} />
      {fila("total", "Total", total)}
    </Box>
  );
}

DetallePorEstado.propTypes = {
  filas: PropTypes.arrayOf(
    PropTypes.shape({
      clave: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      cantidad: PropTypes.number.isRequired,
      color: PropTypes.string.isRequired,
    }),
  ),
  // Lo que dice cuando el mes todavía no tiene nada.
  vacio: PropTypes.string.isRequired,
};
