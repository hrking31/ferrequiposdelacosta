import PropTypes from "prop-types";
import { Box, Stack, TextField } from "@mui/material";
import { ALTO_FRANJA, lugarDeLaFoto } from "./piezasFormulario";

// UNA FOTO DEL EQUIPO EN SU TARJETA: la foto arriba, siempre de 4 a 3, y su
// nombre debajo. Sobre la foto, lo que ponga cada pantalla:
// - `etiquetas`, arriba a la izquierda (PORTADA, NUEVA);
// Y `barra`, el organizador (mover y quitar), en su franja entre la foto y
// el nombre.
export default function TarjetaFoto({
  url,
  alt,
  nombre,
  nombreCampo,
  onCambiarNombre,
  etiquetas,
  barra,
}) {
  return (
    <Box sx={{ display: "flex", minHeight: 0 }}>
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          borderRadius: 2,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box sx={lugarDeLaFoto}>
          <Box
            component="img"
            src={url}
            alt={alt}
            sx={{
              position: "absolute",
              inset: 0,
              display: "block",
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          {etiquetas && (
            <Stack direction="row" spacing={0.5} sx={{ position: "absolute", top: 6, left: 6 }}>
              {etiquetas}
            </Stack>
          )}
        </Box>
        {/* El organizador, debajo de la foto y no encima: así se ve entera
            (pedido del dueño, 2026-10-26). Del mismo alto que su franja en
            la tarjeta de muestra. */}
        {barra && (
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{
              height: ALTO_FRANJA,
              px: 0.5,
              flexShrink: 0,
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            {barra}
          </Stack>
        )}
        <Box sx={{ p: 1, flexShrink: 0 }}>
          {/* De un renglón en todas las pantallas (pedido del dueño,
              2026-10-26). Sin saltos de línea: el nombre va en la dirección
              del archivo guardado. */}
          <TextField
            name={nombreCampo}
            label="Nombre de la imagen"
            value={nombre}
            onChange={(e) => onCambiarNombre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
            size="small"
            fullWidth
          />
        </Box>
      </Box>
    </Box>
  );
}

TarjetaFoto.propTypes = {
  url: PropTypes.string.isRequired,
  alt: PropTypes.string.isRequired,
  nombre: PropTypes.string.isRequired,
  nombreCampo: PropTypes.string.isRequired,
  onCambiarNombre: PropTypes.func.isRequired,
  etiquetas: PropTypes.node,
  barra: PropTypes.node,
};
