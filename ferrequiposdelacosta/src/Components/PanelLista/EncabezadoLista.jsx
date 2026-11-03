import PropTypes from "prop-types";
import { Box, Stack, Typography } from "@mui/material";

// Lo que van a tener que bajar las columnas de los lados para arrancar a la
// altura de la primera tarjeta: los 40px del buscador y los 16 de aire.
export const ALTO_ENCABEZADO_LISTA = 56;

// EL RENGLÓN DE ARRIBA DE LA LISTA, solo encima de las tarjetas: el título, el
// buscador y el conteo, como en la lista de clientes (pedido del dueño,
// 2026-11-03). Lo usan el buzón de cotizaciones y las cuentas de cobro.
//
// Siempre en un renglón: si cediera, las columnas de los lados dejarían de
// quedar a la altura de las tarjetas. El que cede es el buscador.
export default function EncabezadoLista({ titulo, buscador, contador }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={2}
      sx={{ height: 40, mb: "16px", flexShrink: 0 }}
    >
      <Typography variant="h6" noWrap sx={{ flexShrink: 0 }}>
        {titulo}
      </Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>{buscador}</Box>
      {contador}
    </Stack>
  );
}

EncabezadoLista.propTypes = {
  titulo: PropTypes.string.isRequired,
  buscador: PropTypes.node.isRequired,
  contador: PropTypes.node.isRequired,
};
