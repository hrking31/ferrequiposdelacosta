import PropTypes from "prop-types";
import { ToggleButton, ToggleButtonGroup, Typography, useTheme } from "@mui/material";

// EL GÉNERO EN DOS BOTONES, uno al lado del otro (pedido del dueño,
// 2026-10-28): con dos opciones, una lista desplegable es un toque de más.
// Se guarda en minúscula, como siempre ("femenino" / "masculino").
export default function ElegirGenero({ valor, onChange }) {
  const theme = useTheme();
  const acento = theme.palette.custom.accent;

  return (
    <div>
      <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>
        Género
      </Typography>
      <ToggleButtonGroup
        exclusive
        fullWidth
        value={valor || null}
        // Tocar el marcado no lo desmarca: siempre queda uno.
        onChange={(_, nuevo) => nuevo && onChange(nuevo)}
        aria-label="Género"
        sx={{
          height: 44,
          "& .MuiToggleButton-root": { fontWeight: 600, textTransform: "none", fontSize: "0.9rem" },
          "& .MuiToggleButton-root.Mui-selected, & .MuiToggleButton-root.Mui-selected:hover": {
            bgcolor: acento,
            color: theme.palette.getContrastText(acento),
          },
        }}
      >
        <ToggleButton value="femenino">Femenino</ToggleButton>
        <ToggleButton value="masculino">Masculino</ToggleButton>
      </ToggleButtonGroup>
    </div>
  );
}

ElegirGenero.propTypes = {
  valor: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};
