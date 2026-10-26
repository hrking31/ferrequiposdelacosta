import PropTypes from "prop-types";
import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";

// EL RECUADRO PARA ELEGIR FOTOS: toda la zona punteada abre el selector de
// archivos (es la etiqueta del campo escondido). Es el ÚNICO lugar desde donde
// se agregan: las tarjetas de muestra no se tocan (pedido del dueño).
export default function ZonaElegirFoto({ id, titulo, onElegir, color, esCelular }) {
  return (
    <>
      <Box
        component="label"
        htmlFor={id}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.5,
          py: esCelular ? 3 : 2,
          px: 2,
          borderRadius: 2,
          border: "2px dashed",
          borderColor: alpha(color, 0.5),
          bgcolor: alpha(color, 0.05),
          cursor: "pointer",
          textAlign: "center",
          transition: "background-color 0.2s, border-color 0.2s",
          "&:hover": { bgcolor: alpha(color, 0.1), borderColor: color },
        }}
      >
        <AddPhotoAlternateIcon sx={{ fontSize: 40, color }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color }}>
          {titulo}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Al menos una: sin foto el equipo no se puede mostrar en la tienda.
        </Typography>
      </Box>
      <input
        id={id}
        type="file"
        name="fotos"
        accept="image/*"
        onChange={(e) => {
          onElegir(Array.from(e.target.files));
          // Así se puede volver a elegir el mismo archivo.
          e.target.value = "";
        }}
        style={{ display: "none" }}
      />
    </>
  );
}

ZonaElegirFoto.propTypes = {
  id: PropTypes.string.isRequired,
  titulo: PropTypes.string.isRequired,
  onElegir: PropTypes.func.isRequired,
  color: PropTypes.string.isRequired,
  esCelular: PropTypes.bool,
};
