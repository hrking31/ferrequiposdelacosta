import PropTypes from "prop-types";
import { Box, Stack, Typography } from "@mui/material";

// LO QUE MUESTRA EL RECUADRO CUANDO NO HAY NADA ELEGIDO (2026-10-22), para
// que nunca esté en blanco: unas secciones cortas, cada una con su título y
// sus renglones de "nombre ··· dato". Las arma cada pantalla con lo que ya
// tiene cargado (ver Utils/resumenLista).
export default function ResumenLista({ secciones }) {
  return (
    <Stack spacing={2} sx={{ mt: 0.5 }}>
      {secciones.map(({ titulo, filas, vacio }) => (
        <Box key={titulo}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {titulo}
          </Typography>
          {filas.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 0.5 }}>
              {vacio}
            </Typography>
          ) : (
            filas.map(({ clave, izquierda, derecha }) => (
              <Stack
                key={clave}
                direction="row"
                justifyContent="space-between"
                alignItems="baseline"
                spacing={2}
                sx={{ py: 0.5 }}
              >
                <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
                  {izquierda}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, flexShrink: 0 }}>
                  {derecha}
                </Typography>
              </Stack>
            ))
          )}
        </Box>
      ))}
    </Stack>
  );
}

ResumenLista.propTypes = {
  secciones: PropTypes.arrayOf(
    PropTypes.shape({
      titulo: PropTypes.string.isRequired,
      filas: PropTypes.arrayOf(
        PropTypes.shape({
          clave: PropTypes.string.isRequired,
          izquierda: PropTypes.node.isRequired,
          derecha: PropTypes.node.isRequired,
        }),
      ).isRequired,
      // Lo que dice si la sección no tiene renglones.
      vacio: PropTypes.string.isRequired,
    }),
  ).isRequired,
};
