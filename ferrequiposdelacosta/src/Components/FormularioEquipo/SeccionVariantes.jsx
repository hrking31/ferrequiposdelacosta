import { useState } from "react";
import PropTypes from "prop-types";
import { Box, Button, Chip, Stack, TextField, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import TuneIcon from "@mui/icons-material/Tune";
import Seccion from "./Seccion";

// VARIANTES: el nombre (ej. Altura) y los valores que el cliente elige en la
// tienda (ej. 1.20m, 1.50m). Cada valor se agrega con Agregar o con Enter.
export default function SeccionVariantes({
  nombre,
  onCambiarNombre,
  valores,
  onCambiarValores,
  color,
  esCelular,
  cambiado,
}) {
  const [nuevoValor, setNuevoValor] = useState("");

  const agregar = () => {
    const valor = nuevoValor.trim();
    if (valor && !valores.includes(valor)) {
      onCambiarValores([...valores, valor]);
    }
    setNuevoValor("");
  };

  return (
    <Seccion titulo="VARIANTES (OPCIONAL)" icono={<TuneIcon />} color={color} cambiado={cambiado}>
      <Stack spacing={1.5}>
        {/* En todas las pantallas (pedido del dueño, 2026-10-26): el nombre
            arriba y, debajo, el valor con Agregar. */}
        <TextField
          name="varianteNombre"
          label="Nombre de la variante (ej. Tamaño, Color)"
          value={nombre}
          onChange={(e) => onCambiarNombre(e.target.value)}
          fullWidth
        />
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            name="nuevaVarianteValor"
            label="Valor de la variante (ej. 1.20m)"
            value={nuevoValor}
            onChange={(e) => setNuevoValor(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                agregar();
              }
            }}
            fullWidth
          />
          {/* Siempre del mismo tamaño: ancho fijo y el alto del campo. */}
          <Button
            variant="contained"
            color="accent"
            onClick={agregar}
            sx={{ flexShrink: 0, width: 120, alignSelf: "stretch" }}
          >
            Agregar
          </Button>
        </Box>
        {/* Los valores cargados, con el color de la sección. Sin ninguno, la
            línea que explica para qué sirven solo en el celular: en el
            computador ese alto hace falta para no tener que desplazar. */}
        {valores.length > 0 ? (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {valores.map((valor, index) => (
              <Chip
                key={`${valor}-${index}`}
                label={valor}
                onDelete={() => onCambiarValores(valores.filter((_, i) => i !== index))}
                sx={{
                  fontWeight: 600,
                  bgcolor: alpha(color, 0.12),
                  color: "text.primary",
                  border: "1px solid",
                  borderColor: alpha(color, 0.5),
                }}
              />
            ))}
          </Stack>
        ) : (
          esCelular && (
            <Typography variant="body2" color="text.secondary">
              Medidas o capacidades que el cliente elige en la tienda, por ejemplo
              1.20m y 1.50m.
            </Typography>
          )
        )}
      </Stack>
    </Seccion>
  );
}

SeccionVariantes.propTypes = {
  nombre: PropTypes.string.isRequired,
  onCambiarNombre: PropTypes.func.isRequired,
  valores: PropTypes.arrayOf(PropTypes.string).isRequired,
  onCambiarValores: PropTypes.func.isRequired,
  color: PropTypes.string.isRequired,
  esCelular: PropTypes.bool,
  cambiado: PropTypes.bool,
};
