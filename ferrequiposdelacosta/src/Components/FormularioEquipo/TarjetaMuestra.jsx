import PropTypes from "prop-types";
import { Box, Skeleton } from "@mui/material";
import { alpha } from "@mui/material/styles";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import { ALTO_FRANJA, lugarDeLaFoto } from "./piezasFormulario";

// LA TARJETA DE MUESTRA, del tamaño de una foto con su nombre: marca dónde va
// la siguiente. No se puede tocar (las fotos se eligen arriba).
export default function TarjetaMuestra({ color }) {
  return (
    <Box sx={{ display: "flex", minHeight: 0 }}>
      <Box
        aria-hidden
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          borderRadius: 2,
          overflow: "hidden",
          border: "1px dashed",
          borderColor: alpha(color, 0.35),
        }}
      >
        <Box sx={lugarDeLaFoto}>
          <Skeleton
            variant="rectangular"
            animation="wave"
            sx={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          />
          <PhotoLibraryIcon
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              fontSize: 40,
              color: alpha(color, 0.3),
            }}
          />
        </Box>
        {/* La franja del organizador: sus tres botones en gris. */}
        <Box
          sx={{
            height: ALTO_FRANJA,
            px: 1,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px dashed",
            borderColor: alpha(color, 0.35),
          }}
        >
          <Skeleton variant="circular" animation="wave" width={22} height={22} />
          <Skeleton variant="circular" animation="wave" width={22} height={22} />
          <Skeleton variant="circular" animation="wave" width={22} height={22} />
        </Box>
        {/* El nombre, del alto de su campo (un renglón). */}
        <Box sx={{ p: 1, flexShrink: 0 }}>
          <Skeleton variant="rounded" animation="wave" height={40} />
        </Box>
      </Box>
    </Box>
  );
}

TarjetaMuestra.propTypes = {
  color: PropTypes.string.isRequired,
};
