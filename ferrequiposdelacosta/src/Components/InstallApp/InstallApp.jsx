import { useEffect, useState } from "react";
import { Box, Typography, useTheme, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export default function InstallApp() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBox, setShowInstallBox] = useState(false);
  const theme = useTheme();

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

  const handleInstall = async () => {
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

  const isDarkMode = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        position: "fixed",
        zIndex: 1500,
        top: {
          xs: theme.spacing(18),
          sm: theme.spacing(3),
          md: theme.spacing(20),
        },
        left: {
          xs: theme.spacing(2),
          sm: theme.spacing(4),
          md: theme.spacing(18),
        },
        bgcolor: isDarkMode
          ? theme.palette.secondary.main
          : theme.palette.primary.main,
        color: isDarkMode
          ? theme.palette.secondary.contrastText
          : theme.palette.primary.contrastText,
        px: {
          xs: 2,
          sm: 3,
          md: 4,
        },
        py: 2,
        borderRadius: 2,
        maxWidth: {
          xs: "90%",
          sm: 360,
        },
        width: {
          xs: "calc(100% - 32px)",
          sm: "auto",
        },
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        cursor: "pointer",
        transition: "background-color 0.3s",
        boxShadow: 3,
        "&:hover": {
          bgcolor: isDarkMode
            ? theme.palette.secondary.dark
            : theme.palette.primary.dark,
        },
        position: "fixed",
      }}
    >
      <IconButton
        aria-label="close"
        onClick={() => setShowInstallBox(false)}
        sx={{
          position: "absolute",
          top: 4,
          right: 4,
          color: isDarkMode
            ? theme.palette.secondary.contrastText
            : theme.palette.primary.contrastText,
        }}
      >
        <CloseIcon />
      </IconButton>

      <Typography
        variant="body2"
        sx={{
          color: theme.palette.text.primary,
          textAlign: "center",
          fontWeight: 500,
          pt: 2, 
          cursor: "pointer", 
        }}
        onClick={handleInstall}
      >
        ¡Lleva la experiencia a otro nivel! Instala nuestra app ahora y disfruta
        al instante en tu dispositivo.
      </Typography>
    </Box>
  );
}
