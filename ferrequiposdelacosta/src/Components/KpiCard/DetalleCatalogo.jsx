import PropTypes from "prop-types";
import { Box, Divider, Stack, Typography } from "@mui/material";

// EL DETALLE DE "EQUIPOS" DEL CATÁLOGO (2026-10-22): el nombre de cada equipo
// de la tienda, por orden alfabético, con el total al pie. Es la tarjeta de
// quien solo edita el catálogo.
//
// La lista es la misma que la app ya baja para la tienda y para la pantalla de
// Equipos (el catálogo en memoria, ver equiposSlice). Si ya se bajó
// en esta sesión, verla no cuesta nada; si no, el menú la pide al abrir esto y
// queda guardada para esas pantallas.
//
// `equipos` llega en null mientras se está bajando.
export default function DetalleCatalogo({ equipos }) {
  if (!equipos) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
        Cargando el catálogo…
      </Typography>
    );
  }

  if (equipos.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
        No hay equipos en el catálogo.
      </Typography>
    );
  }

  const nombres = equipos
    .map((equipo) => (equipo.name || "").trim() || "Sin nombre")
    .sort((a, b) => a.localeCompare(b));

  return (
    <Box>
      {nombres.map((nombre, indice) => (
        <Typography
          // El nombre solo podría repetirse: va con su posición.
          key={`${nombre}-${indice}`}
          variant="body2"
          sx={{ py: 0.75 }}
        >
          {nombre}
        </Typography>
      ))}
      <Divider sx={{ my: 0.5 }} />
      <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ py: 0.75 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Total
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {nombres.length}
        </Typography>
      </Stack>
    </Box>
  );
}

DetalleCatalogo.propTypes = {
  equipos: PropTypes.arrayOf(PropTypes.shape({ name: PropTypes.string })),
};
