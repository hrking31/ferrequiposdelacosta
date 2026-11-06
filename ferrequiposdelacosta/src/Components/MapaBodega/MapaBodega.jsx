import PropTypes from "prop-types";
import { Box } from "@mui/material";

// EL MAPA DE LA BODEGA, de Google Maps. Uno solo para toda la tienda: la
// columna izquierda del computador y "Dónde estamos" del menú del celular
// (2026-11-06).
const MAPA =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3916.7449071484803!2d-74.83734642630112!3d10.982617155359392!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8ef42ce6e1990133%3A0x279860b2dde76a7b!2sFerrequipos%20de%20la%20Costa!5e0!3m2!1ses-419!2sco!4v1750278112137!5m2!1ses-419!2sco";

export default function MapaBodega({ alto = 400 }) {
  return (
    <Box sx={{ width: "100%", height: alto, overflow: "hidden", display: "flex", justifyContent: "center" }}>
      <iframe
        title="Ubicación de Ferrequipos de la Costa"
        src={MAPA}
        style={{ border: 0, width: "100%", height: "100%" }}
        allowFullScreen=""
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </Box>
  );
}

MapaBodega.propTypes = {
  alto: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};
