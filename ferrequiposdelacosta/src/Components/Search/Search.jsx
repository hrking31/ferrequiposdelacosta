import { TextField, Box, Grid, IconButton, InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { ponerBusqueda } from "../../Store/Slices/searchSlice";

// EL BUSCADOR DE LA TIENDA Y DEL KIOSCO. Desde el 2026-10-29 (pedido del
// dueño) funciona como los de Usuarios y Equipos: filtra MIENTRAS se escribe,
// sin botón ni Enter, y la X lo limpia. Lo escrito va al store (searchSlice):
// las tarjetas lo leen de ahí. Si hay dos en pantalla (tienda en celular y en
// computador), escriben lo mismo.
const Search = ({ LabelOff = true }) => {
  const dispatch = useDispatch();
  const termino = useSelector((state) => state.search.termino);
  const poner = (texto) => dispatch(ponerBusqueda(texto));

  return (
    <Box display="flex" flexDirection="column" sx={{ mt: "6px" }}>
      <Grid container spacing={2} justifyContent="center">
        <Grid item xs={12}>
          <TextField
            name="buscar-equipo"
            label={LabelOff ? "¿Qué estás buscando?" : ""}
            placeholder={!LabelOff ? "¿Qué estás buscando?" : undefined}
            value={termino}
            onChange={(e) => poner(e.target.value)}
            onKeyDown={(e) => {
              // En el celular, Enter solo esconde el teclado: ya filtró.
              if (e.key === "Enter") e.target.blur();
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {termino ? (
                    <IconButton size="small" onClick={() => poner("")} edge="end" aria-label="Limpiar la búsqueda">
                      <ClearIcon sx={{ color: "custom.accent" }} />
                    </IconButton>
                  ) : (
                    <SearchIcon sx={{ color: "custom.accent" }} />
                  )}
                </InputAdornment>
              ),
            }}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

Search.propTypes = {
  LabelOff: PropTypes.bool,
};

export default Search;
