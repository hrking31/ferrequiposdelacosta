import PropTypes from "prop-types";
import { Box, Stack, Typography } from "@mui/material";
import { ALTO_FRANJA, lugarDeLaFoto } from "./piezasFormulario";

// UNA FOTO DEL EQUIPO EN SU TARJETA: la foto, siempre de 4 a 3. Sobre ella, lo
// que ponga cada pantalla:
// - `etiquetas`, arriba a la izquierda (PORTADA, NUEVA);
// - abajo a la derecha, su `miniatura` (pedido del dueño, 2026-10-29), para
//   confirmar cómo se verá en las listas y las tarjetas: undefined mientras
//   se hace, null si no tiene (sale el aviso).
// Y `barra`, el organizador (mover y quitar), en su franja debajo.
// Sin nombre: lo pone la app al subirla (ver fotosEquipo).
export default function TarjetaFoto({ url, alt, miniatura, etiquetas, barra }) {
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
          {miniatura && (
            <Box
              component="img"
              src={miniatura}
              alt={`Miniatura de ${alt}`}
              title="Miniatura: así se ve en las listas y las tarjetas"
              sx={{
                position: "absolute",
                right: 6,
                bottom: 6,
                width: "30%",
                aspectRatio: "4 / 3",
                objectFit: "cover",
                display: "block",
                borderRadius: 1,
                border: "2px solid",
                borderColor: "common.white",
                boxShadow: 3,
              }}
            />
          )}
          {miniatura === null && (
            <Typography
              variant="caption"
              sx={{
                position: "absolute",
                right: 6,
                bottom: 6,
                px: 0.75,
                py: 0.25,
                borderRadius: 1,
                fontWeight: 700,
                bgcolor: "error.main",
                color: "error.contrastText",
              }}
            >
              SIN MINIATURA
            </Typography>
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
            }}
          >
            {barra}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

TarjetaFoto.propTypes = {
  url: PropTypes.string.isRequired,
  alt: PropTypes.string.isRequired,
  miniatura: PropTypes.string,
  etiquetas: PropTypes.node,
  barra: PropTypes.node,
};
