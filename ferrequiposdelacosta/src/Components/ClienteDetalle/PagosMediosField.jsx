import PropTypes from "prop-types";
import {
  Box,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Button,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { MODOS_PAGO, formatearMonedaInput, limpiarMonedaInput } from "./facturaUtils";

const FILA_VACIA = { medio: "", monto: "" };

// Lista repetible de medio de pago + monto (un pago puede repartirse en más
// de un medio, ej. parte por Bancolombia y parte en efectivo). Se usa igual
// en FacturaFormDialog y en AgregarEquipoDialog.
export default function PagosMediosField({ pagos, onChange, idPrefix, apilado = false }) {
  const filas = pagos.length > 0 ? pagos : [FILA_VACIA];

  const handleChangeFila = (index, campo, valor) => {
    onChange(filas.map((fila, i) => (i === index ? { ...fila, [campo]: valor } : fila)));
  };

  const handleAgregarFila = () => {
    onChange([...filas, FILA_VACIA]);
  };

  const handleQuitarFila = (index) => {
    onChange(filas.filter((_, i) => i !== index));
  };

  const totalPagos = filas.reduce((total, fila) => total + (Number(fila.monto) || 0), 0);

  return (
    <Box>
      <Stack spacing={1}>
        {filas.map((fila, index) => (
          <Stack
            key={index}
            direction={apilado ? "column" : { xs: "column", sm: "row" }}
            spacing={1}
          >
            <FormControl fullWidth size="small">
              <InputLabel
                id={`${idPrefix}-medio-${index}-label`}
                htmlFor={`${idPrefix}-medio-${index}-input`}
              >
                Medio de pago
              </InputLabel>
              <Select
                labelId={`${idPrefix}-medio-${index}-label`}
                inputProps={{ id: `${idPrefix}-medio-${index}-input` }}
                label="Medio de pago"
                value={fila.medio}
                onChange={(e) => handleChangeFila(index, "medio", e.target.value)}
              >
                {MODOS_PAGO.map((modo) => (
                  <MenuItem key={modo} value={modo}>
                    {modo}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {/* Apilado, el monto y el bote van en la misma línea: el monto se
                achica lo necesario para dejarle lugar al botón.
                Siempre se puede borrar un medio de pago; si era el único, el
                renglón queda vacío para volver a cargarlo. */}
            <Stack direction="row" spacing={0.5} alignItems="center">
              <TextField
                label="Monto"
                value={formatearMonedaInput(fila.monto)}
                onChange={(e) =>
                  handleChangeFila(index, "monto", limpiarMonedaInput(e.target.value))
                }
                fullWidth
              />
              <IconButton size="small" onClick={() => handleQuitarFila(index)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
        ))}
      </Stack>
      <Stack
        direction="row"
        flexWrap="wrap"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mt: 0.75 }}
      >
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon fontSize="small" />}
          onClick={handleAgregarFila}
        >
          Medio de pago
        </Button>
        {filas.length > 1 && (
          <Typography variant="caption" color="text.secondary">
            Total: {totalPagos.toLocaleString("es-CO", { style: "currency", currency: "COP" })}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

PagosMediosField.propTypes = {
  pagos: PropTypes.arrayOf(
    PropTypes.shape({
      medio: PropTypes.string,
      monto: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
  ).isRequired,
  onChange: PropTypes.func.isRequired,
  idPrefix: PropTypes.string.isRequired,
  // Pone el medio y el monto uno debajo del otro, para columnas angostas.
  apilado: PropTypes.bool,
};
