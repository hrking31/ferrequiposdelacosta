import PropTypes from "prop-types";
import { Chip } from "@mui/material";
import StarIcon from "@mui/icons-material/Star";

// Las etiquetas sobre la foto: ★ PORTADA en la primera —la que se ve en la
// tienda— y, al editar, NUEVA en las que todavía no se guardaron.
export default function EtiquetasFoto({ portada, nueva }) {
  return (
    <>
      {portada && (
        <Chip size="small" icon={<StarIcon />} label="PORTADA" color="warning" sx={{ fontWeight: 700 }} />
      )}
      {nueva && <Chip size="small" label="NUEVA" color="success" sx={{ fontWeight: 700 }} />}
    </>
  );
}

EtiquetasFoto.propTypes = {
  portada: PropTypes.bool,
  nueva: PropTypes.bool,
};
