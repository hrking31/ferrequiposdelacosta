import { cloneElement } from "react";
import PropTypes from "prop-types";
import { Box, ButtonBase, IconButton, Stack, Tooltip, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

// LA LISTA GUARDADA, en una franja angosta a la izquierda de la ficha (pedido
// del dueño, 2026-10-29), entre 1010 y 1500px, donde la lista entera no cabe
// al lado de la ficha ancha. La usan Equipos (las miniaturas) y Usuarios (las
// caras). Arriba el `icono` de la pantalla con cuántos hay; después cada
// elemento en el orden de la lista (tocarlo lo abre; su nombre, al pasar por
// encima) y abajo la flecha que saca la lista completa (ver CajonLista).
//
// Con estilo propio (pedido del dueño, 2026-10-29: "más creativo"): un tinte
// del acento de fondo, el número como insignia sobre el ícono, el elegido con
// su barrita al borde y su aro, los demás que se agrandan al pasar por
// encima, un desvanecido arriba y abajo cuando hay más para desplazar y la
// flecha en su botón redondo.
//
// `items`: { id, nombre, vista, elemento } — `vista` es lo que se pinta (la
// miniatura, la cara) y `elemento` lo que recibe `onElegir`. `redondas`: las
// caras, con el aro de la elegida redondo.
export default function FranjaLista({ icono, items, idElegido, onElegir, onAbrir, redondas = false }) {
  const theme = useTheme();
  const acento = theme.palette.custom.accent;
  const info = theme.palette.info.main;
  const papel = theme.palette.background.paper;
  // Lo que se desvanece arriba y abajo de la lista, en 14px.
  const desvanecido = "linear-gradient(to bottom, transparent 0, #000 14px, #000 calc(100% - 14px), transparent 100%)";

  return (
    <Box
      sx={{
        width: 80,
        flexShrink: 0,
        height: "100%",
        boxSizing: "border-box",
        borderRadius: 3,
        border: "1px solid",
        borderColor: alpha(acento, 0.25),
        bgcolor: alpha(acento, theme.palette.mode === "dark" ? 0.1 : 0.04),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        pt: 1.5,
        pb: 1.25,
      }}
    >
      {/* El ícono en su círculo, con el número como insignia encima. */}
      <Box sx={{ position: "relative", flexShrink: 0, mb: 1.5 }}>
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            bgcolor: alpha(info, 0.15),
          }}
        >
          {cloneElement(icono, { sx: { fontSize: 22, color: info } })}
        </Box>
        <Box
          sx={{
            position: "absolute",
            right: -8,
            bottom: -6,
            minWidth: 22,
            height: 18,
            px: 0.5,
            boxSizing: "border-box",
            borderRadius: 9,
            bgcolor: acento,
            color: "common.white",
            border: `2px solid ${papel}`,
            display: "grid",
            placeItems: "center",
            fontSize: "0.65rem",
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          {items.length}
        </Box>
      </Box>

      <Stack
        spacing={1.25}
        sx={{
          flex: 1,
          minHeight: 0,
          width: "100%",
          overflowY: "auto",
          py: 1.25,
          maskImage: desvanecido,
          WebkitMaskImage: desvanecido,
          "&::-webkit-scrollbar": { display: "none" },
          scrollbarWidth: "none",
        }}
      >
        {items.map(({ id, nombre, vista, elemento }) => {
          const elegido = id === idElegido;
          return (
            <Box key={id} sx={{ position: "relative", display: "flex", justifyContent: "center", flexShrink: 0 }}>
              {/* La barrita del elegido, pegada al borde. */}
              <Box
                aria-hidden
                sx={{
                  position: "absolute",
                  left: 0,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 4,
                  height: elegido ? "70%" : 0,
                  borderRadius: "0 4px 4px 0",
                  bgcolor: acento,
                  transition: "height 0.2s ease",
                }}
              />
              <Tooltip title={nombre} placement="right" arrow>
                <ButtonBase
                  onClick={() => onElegir(elemento)}
                  aria-label={nombre}
                  aria-current={elegido ? "true" : undefined}
                  sx={{
                    borderRadius: redondas ? "50%" : 1.5,
                    opacity: elegido ? 1 : 0.8,
                    transform: elegido ? "scale(1.05)" : "none",
                    boxShadow: elegido ? `0 0 0 2px ${papel}, 0 0 0 4px ${acento}` : "none",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
                    // Las miniaturas, con las esquinas del aro; las caras no:
                    // se cortaría su punto de conexión.
                    ...(!redondas && { "& > *": { borderRadius: "inherit", overflow: "hidden" } }),
                    "&:hover": {
                      opacity: 1,
                      transform: "scale(1.08)",
                      boxShadow: elegido
                        ? `0 0 0 2px ${papel}, 0 0 0 4px ${acento}, 0 6px 14px ${alpha(acento, 0.3)}`
                        : `0 6px 14px ${alpha(acento, 0.25)}`,
                    },
                  }}
                >
                  {vista}
                </ButtonBase>
              </Tooltip>
            </Box>
          );
        })}
      </Stack>

      <Tooltip title="Ver la lista completa" placement="right" arrow>
        <IconButton
          onClick={onAbrir}
          aria-label="Ver la lista completa"
          sx={{
            mt: 1,
            width: 40,
            height: 40,
            flexShrink: 0,
            color: acento,
            bgcolor: alpha(acento, 0.12),
            transition: "background-color 0.15s ease, color 0.15s ease",
            "& svg": { transition: "transform 0.15s ease" },
            "&:hover": { bgcolor: acento, color: "common.white" },
            "&:hover svg": { transform: "translateX(2px)" },
          }}
        >
          <ChevronRightIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

FranjaLista.propTypes = {
  icono: PropTypes.element.isRequired,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      nombre: PropTypes.string.isRequired,
      vista: PropTypes.node.isRequired,
      elemento: PropTypes.object.isRequired,
    }),
  ).isRequired,
  idElegido: PropTypes.string,
  onElegir: PropTypes.func.isRequired,
  // La flecha: saca la lista completa.
  onAbrir: PropTypes.func.isRequired,
  redondas: PropTypes.bool,
};
