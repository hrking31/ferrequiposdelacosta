import { TextField, InputAdornment, IconButton } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import PropTypes from "prop-types";

/**
 * El campo de buscar de las pantallas de administración: cápsula, lupa a la
 * izquierda y una X para limpiar que solo aparece cuando hay algo escrito.
 *
 * Filtra MIENTRAS se escribe, sobre una lista que ya está cargada en memoria.
 * No consulta la base: quien lo usa le pasa el texto y decide qué filtrar con
 * él. Por eso no tiene botón de buscar ni hace nada con la tecla Enter.
 *
 * Es el mismo campo, calcado, que tenían Clientes y Seguimiento de Clientes;
 * vive acá para que las tres pantallas no lo repitan. OJO: no confundir con
 * Components/Search, que es el buscador de la tienda y el kiosco y sí consulta
 * Firestore al enviar.
 */
export default function BuscadorFiltro({ value, onChange, placeholder }) {
  return (
    <TextField
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      fullWidth
      size="small"
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" />
          </InputAdornment>
        ),
        endAdornment: value && (
          <InputAdornment position="end">
            <IconButton size="small" onClick={() => onChange("")} edge="end">
              <ClearIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ),
        sx: { borderRadius: (theme) => theme.shape.pill },
      }}
    />
  );
}

BuscadorFiltro.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string.isRequired,
};
