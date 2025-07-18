import { Box, Typography, useTheme, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { forwardRef } from "react";

const AnimatedBox = forwardRef(function AnimatedBox(
  { isExpanded, isDarkMode, handleInstall, handleClose, hasMounted, showLoop },
  ref
) {
  const theme = useTheme();

  const boxStyles = {
    position: "fixed",
    top: "15%",
    right: 0,
    zIndex: 1500,
    bgcolor: isDarkMode
      ? theme.palette.primary.main
      : theme.palette.secondary.main,
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
              color: isDarkMode ? "#fff" : "#000",
            }}
          >
            <CloseIcon />
          </IconButton>
          
          <Typography
            variant="h5"
            sx={{
              textAlign: "center",
               p: 2,
            }}
          >
            ¡Lleva la experiencia a otro nivel! Instala nuestra app ahora y
            disfruta al instante en tu dispositivo.
          </Typography>
        </>
      ) : (
        <Box sx={{ width: "100%", textAlign: "center", fontSize: 24, p: 0.5 }}>
          📱
        </Box>
      )}
    </Box>
  );
});

export default AnimatedBox;
