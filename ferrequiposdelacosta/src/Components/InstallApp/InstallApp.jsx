import { useEffect, useState } from "react";
import { Box, Typography, useTheme } from "@mui/material";

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
      onClick={handleInstall}
      sx={{
        bottom: theme.spacing(2),
        left: theme.spacing(2),
        bgcolor: isDarkMode
          ? theme.palette.secondary.main
          : theme.palette.primary.main,
        color: isDarkMode
          ? theme.palette.secondary.contrastText
          : theme.palette.primary.contrastText,
        p: 2,
        mb: 2,
        maxWidth: 360,
        borderRadius: theme.shape.borderRadius,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        cursor: "pointer",
        transition: "background-color 0.3s",
        "&:hover": {
          bgcolor: isDarkMode
            ? theme.palette.secondary.dark
            : theme.palette.primary.dark,
        },
      }}
    >
      <Typography
        variant="body2"
        sx={{
          color: theme.palette.text.primary,
          textAlign: "center",
          fontWeight: 500,
        }}
      >
        ¡Lleva la experiencia a otro nivel! Instala nuestra app ahora y disfruta
        al instante en tu dispositivo.
      </Typography>
    </Box>
  );
}
