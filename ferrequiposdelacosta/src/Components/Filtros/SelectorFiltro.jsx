import PropTypes from "prop-types";
import { Box, MenuItem, Stack, TextField } from "@mui/material";

// UN FILTRO EN DESPLEGABLE (2026-10-22), para el celular y el computador
// angosto, donde no entra la columna de la izquierda. Es el mismo desplegable
// de Seguimiento (ver SeguimientoClientes): cada opción con su cantidad al otro
// extremo; si no cabe, el nombre se corta con "…" y el número queda a la vista.
//
// El id en inputProps y el htmlFor del rótulo son obligatorios en todo select
// de la app: sin ellos el rótulo apunta a un elemento que no es el campo y el
// lector de pantalla no lo asocia.
export default function SelectorFiltro({ id, label, value, onChange, opciones, sx }) {
  return (
    <TextField
      select
      size="small"
      label={label}
      value={value}
      onChange={(evento) => onChange(evento.target.value)}
      inputProps={{ id }}
      InputLabelProps={{ htmlFor: id }}
      sx={sx}
    >
      {opciones.map((opcion) => (
        <MenuItem key={opcion.valor} value={opcion.valor}>
          <Stack
            direction="row"
            justifyContent="space-between"
            spacing={1}
            sx={{ width: "100%", minWidth: 0 }}
          >
            <Box
              component="span"
              sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {opcion.label}
            </Box>
            <Box component="span" sx={{ flexShrink: 0 }}>
              {opcion.cantidad}
            </Box>
          </Stack>
        </MenuItem>
      ))}
    </TextField>
  );
}

SelectorFiltro.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  opciones: PropTypes.arrayOf(
    PropTypes.shape({
      valor: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      cantidad: PropTypes.number.isRequired,
    }),
  ).isRequired,
  sx: PropTypes.object,
};
