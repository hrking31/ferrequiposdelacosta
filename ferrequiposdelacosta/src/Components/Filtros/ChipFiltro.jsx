import PropTypes from "prop-types";
import { Box, Chip, Stack, useTheme } from "@mui/material";

// UN BOTÓN DE FILTRO DE LA COLUMNA DE LA IZQUIERDA (2026-10-22), con su número
// en una pastilla a la derecha. Es el mismo botón de los filtros de Seguimiento
// (ver SeguimientoClientes): el dueño quiere que el buzón de cotizaciones y la
// lista de cuentas de cobro se manejen igual, para que quien aprende una
// pantalla sepa usar las otras.
//
// `punto` es el color del estado al que filtra: se ve como un punto mientras
// no está elegido, y elegido el botón entero se pinta de ese color.
export default function ChipFiltro({ label, conteo, seleccionado, color, punto, icono, onClick }) {
  const theme = useTheme();
  const relleno = punto || color;

  return (
    <Chip
      clickable
      onClick={onClick}
      variant={seleccionado ? "filled" : "outlined"}
      label={
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ width: "100%" }}
        >
          <Box component="span">{label}</Box>
          <Box component="span" sx={theme.contadorDeChip(relleno, seleccionado)}>
            {conteo}
          </Box>
        </Stack>
      }
      icon={
        icono ||
        (punto && !seleccionado ? <Box component="span" sx={theme.puntoDeChip(punto)} /> : undefined)
      }
      sx={{
        flexShrink: 0,
        fontWeight: punto ? 600 : undefined,
        width: "100%",
        justifyContent: "flex-start",
        "& .MuiChip-label": { width: "100%" },
        ...(seleccionado && theme.chipElegido(relleno)),
      }}
    />
  );
}

ChipFiltro.propTypes = {
  label: PropTypes.string.isRequired,
  conteo: PropTypes.number.isRequired,
  seleccionado: PropTypes.bool.isRequired,
  // El color del elegido cuando no lleva `punto`: el acento.
  color: PropTypes.string.isRequired,
  punto: PropTypes.string,
  icono: PropTypes.element,
  onClick: PropTypes.func.isRequired,
};
