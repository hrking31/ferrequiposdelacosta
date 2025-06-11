import { useEffect, useState, forwardRef } from "react";
import {
  Box,
  Typography,
  useTheme,
  IconButton,
  Slide,
  ClickAwayListener,
  useMediaQuery,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const AnimatedBox = forwardRef(function AnimatedBox(
  { isExpanded, isDarkMode, handleInstall, handleClose },
  ref
) {
  const theme = useTheme();
  const isMobile = useMediaQuery("(max-width:915px)");

  return (
    <Box
      ref={ref}
      sx={{
        position: "fixed",
        top: "15%",
        right: 0,
        zIndex: 1500,
        bgcolor: isDarkMode
          ? theme.palette.secondary.main
          : theme.palette.primary.main,
        color: isDarkMode
          ? theme.palette.secondary.contrastText
          : theme.palette.primary.contrastText,
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
        animation: `${!isExpanded ? "bounceIn 1s" : "none"}`,
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
      }}
      onClick={handleInstall}
    >
      {isExpanded && (
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
      )}
      {!isExpanded && (
        <Box sx={{ width: "100%", textAlign: "center", fontSize: 24, p: 0.5 }}>
          📱
        </Box>
      )}
      {isExpanded && (
        <Typography
          variant="body2"
          sx={{
            color: "#fff",
            textAlign: "center",
            fontWeight: 500,
            pt: 2,
          }}
        >
          ¡Lleva la experiencia a otro nivel! Instala nuestra app ahora y
          disfruta al instante en tu dispositivo.
        </Typography>
      )}
    </Box>
  );
});

export default function InstallApp() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBox, setShowInstallBox] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const theme = useTheme();

  const isDarkMode = theme.palette.mode === "dark";

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBox(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  useEffect(() => {
    if (!isExpanded) return;

    const timer = setTimeout(() => {
      setIsExpanded(false);
    }, 6000);

    return () => clearTimeout(timer);
  }, [isExpanded]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isExpanded && showInstallBox) {
        setShowInstallBox(false);
        void setTimeout(() => setShowInstallBox(true), 10);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isExpanded, showInstallBox]);

  const handleInstallClick = async () => {
    if (!isExpanded) {
      setIsExpanded(true);
      return;
    }

    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      alert("✅ ¡La aplicación ha sido instalada con éxito!");
    } else {
      alert("❌ La instalación de la aplicación fue cancelada.");
    }

    setDeferredPrompt(null);
    setShowInstallBox(false);
  };

  if (!showInstallBox) return null;

  return (
    <ClickAwayListener onClickAway={() => isExpanded && setIsExpanded(false)}>
      <Slide direction="left" in={showInstallBox} mountOnEnter unmountOnExit>
        <AnimatedBox
          isExpanded={isExpanded}
          isDarkMode={isDarkMode}
          handleInstall={handleInstallClick}
          handleClose={() => setShowInstallBox(false)}
        />
      </Slide>
    </ClickAwayListener>
  );
}
