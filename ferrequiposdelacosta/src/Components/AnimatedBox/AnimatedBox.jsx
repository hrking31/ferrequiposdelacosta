import { Box, Button, Typography, useTheme, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { forwardRef } from "react";
import PropTypes from "prop-types";

const AnimatedBox = forwardRef(function AnimatedBox(
  { isExpanded, handleInstall, handleClose, hasMounted, showLoop },
  ref
) {
  const theme = useTheme();

  const boxStyles = {
    position: "fixed",
    top: "15%",
    right: 0,
    zIndex: 1500,
    // El acento del tema: azul de día, amarillo de noche. El texto y la cruz
    // van con "onAccent", que es el color pensado para ir encima.
    bgcolor: theme.palette.custom.accent,
    color: theme.palette.custom.onAccent,
    width: isExpanded ? { xs: 280, sm: 360 } : 35,
    height: isExpanded ? "auto" : 48,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    px: isExpanded ? { xs: 2, sm: 3 } : 0,
    py: isExpanded ? 2 : 0,
    boxShadow: 3,
    overflow: "hidden",
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: isExpanded ? "center" : "flex-start",
    animation:
      !isExpanded && hasMounted
        ? `${
            showLoop
              ? "bounceLoop 2s infinite ease-in-out"
              : "bounceIn 0.8s ease-out"
          }`
        : "none",
    "@keyframes bounceIn": {
      "0%": {
        transform: "translateX(100%) scale(0.95)",
        opacity: 0,
      },
      "60%": {
        transform: "translateX(-10px) scale(1.05)",
        opacity: 1,
      },
      "80%": {
        transform: "translateX(4px) scale(0.98)",
      },
      "100%": {
        transform: "translateX(0) scale(1)",
      },
    },
    "@keyframes bounceLoop": {
      "0%, 100%": {
        transform: "translateY(0)",
      },
      "50%": {
        transform: "translateY(-5px)",
      },
    },
  };

  return (
    <Box ref={ref} sx={boxStyles} onClick={handleInstall}>
      {isExpanded ? (
        <>
          <IconButton
            aria-label="close"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            sx={{
              position: "absolute",
              top: 4,
              right: 4,
              color: "custom.onAccent",
            }}
          >
            <CloseIcon />
          </IconButton>
          
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1.5,
              p: 2,
              width: "100%",
            }}
          >
            <Typography
              variant="h5"
              sx={{
                textAlign: "center",
                // El h5 del tema sale con el color del acento, que es justo el
                // fondo de este cartel: quedaría del mismo color que la caja.
                color: "custom.onAccent",
              }}
            >
              ¡Lleva la experiencia a otro nivel! Instala nuestra app ahora y
              disfruta al instante en tu dispositivo.
            </Typography>

            {/* El botón dice qué hay que hacer. Antes había que volver a tocar
                el cartel entero, sin nada que lo indicara. Corta la
                propagación porque el clic del cartel llama a lo mismo, y sin
                esto se dispararía dos veces. */}
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleInstall();
              }}
              sx={{
                // Invertido: el fondo es el color que va ENCIMA del acento y
                // la letra es el acento. Así se despega de la caja en los dos
                // modos sin inventar colores nuevos.
                bgcolor: "custom.onAccent",
                color: "custom.accent",
                fontWeight: 700,
                px: 3,
                "&:hover": { bgcolor: "custom.onAccent", opacity: 0.9 },
              }}
            >
              Instalar
            </Button>
          </Box>
        </>
      ) : (
        <Box sx={{ width: "100%", textAlign: "center", fontSize: 24, p: 0.5 }}>
          📱
        </Box>
      )}
    </Box>
  );
});

AnimatedBox.propTypes = {
  isExpanded: PropTypes.bool.isRequired,
  handleInstall: PropTypes.func.isRequired,
  handleClose: PropTypes.func.isRequired,
  hasMounted: PropTypes.bool.isRequired,
  showLoop: PropTypes.bool.isRequired,
};

export default AnimatedBox;
