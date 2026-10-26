import PropTypes from "prop-types";
import { Box } from "@mui/material";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import { portadaDe } from "./catalogoEquipos";

// LA PORTADA DE UN EQUIPO EN CHIQUITO (pedido del dueño, 2026-10-26), de 4 a
// 3 como en la tienda. Se baja recién cuando se ve (`loading="lazy"`): la
// lista entera no pide todas las fotos de una. Sin foto, el ícono.
export default function MiniaturaEquipo({ equipo, ancho, radio = 1 }) {
  const url = portadaDe(equipo);
  return (
    <Box
      sx={{
        width: ancho,
        aspectRatio: "4 / 3",
        flexShrink: 0,
        borderRadius: radio,
        overflow: "hidden",
        bgcolor: "action.hover",
        display: "grid",
        placeItems: "center",
      }}
    >
      {url ? (
        <Box
          component="img"
          src={url}
          alt=""
          loading="lazy"
          sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <PhotoLibraryIcon sx={{ color: "text.disabled", fontSize: "1.2em" }} />
      )}
    </Box>
  );
}

MiniaturaEquipo.propTypes = {
  equipo: PropTypes.shape({
    images: PropTypes.arrayOf(PropTypes.shape({ url: PropTypes.string })),
  }).isRequired,
  ancho: PropTypes.number.isRequired,
  radio: PropTypes.number,
};
