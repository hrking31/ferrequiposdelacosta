import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Box, Typography, Button } from "@mui/material";
import PropTypes from "prop-types";

export default function KioskScreensaver({ timeout = 60000 }) {
  const equipos = useSelector((state) => state.equipos.equipos || []);
  const [isActive, setIsActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const images = equipos
    .filter((equipo) => equipo.images?.[0]?.url)
    .map((equipo) => equipo.images[0].url);

  // Lógica de detección de inactividad
  useEffect(() => {
    let timer;
    const resetTimer = () => {
      setIsActive(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIsActive(true), timeout);
    };

    // Eventos que reinician el contador de actividad
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("mousedown", resetTimer);
    window.addEventListener("touchstart", resetTimer);
    window.addEventListener("keypress", resetTimer);

    timer = setTimeout(() => setIsActive(true), timeout);

    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("mousedown", resetTimer);
      window.removeEventListener("touchstart", resetTimer);
      window.removeEventListener("keypress", resetTimer);
      clearTimeout(timer);
    };
  }, [timeout]);

  // Lógica del Carrusel automático
  useEffect(() => {
    if (!isActive || images.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 5000); // Cambia cada 5 segundos

    return () => clearInterval(interval);
  }, [isActive, images.length]);

  if (!isActive || images.length === 0) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999,
        backgroundColor: "black",
        cursor: "pointer",
      }}
      onClick={() => setIsActive(false)}
    >
      {images.map((url, i) => (
        <Box
          key={i}
          component="img"
          src={url}
          sx={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "opacity 1.5s ease-in-out",
            opacity: i === currentIndex ? 1 : 0,
          }}
        />
      ))}

      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: "60%",
          background:
            "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 40%, transparent 100%)",
          zIndex: 2,
        }}
      />

      {/* Texto de invitación a la acción */}
      <Box
        sx={{
          position: "absolute",
          bottom: "10%",
          left: 0,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          zIndex: 3,
          px: 4,
          textAlign: "center",
        }}
      >
        <Typography
          variant="h2"
          sx={{
            color: "primary.main",
            fontWeight: 800,
            textShadow: "0px 4px 10px rgba(0, 0, 0, 0.9)",
            mb: 2,
            fontSize: "clamp(2rem, 5vw, 4rem)",
            lineHeight: 1.1,
          }}
        >
          TODO PARA TU PROYECTO EN UN SOLO LUGAR
        </Typography>

        <Typography
          variant="h5"
          sx={{
            color: "secondary.light",
            mb: 4,
            fontWeight: 400,
            textShadow: "0px 2px 5px rgba(0,0,0,0.8)",
            fontSize: "clamp(1.2rem, 2.5vw, 2rem)",
          }}
        >
          Selecciona tus equipos y solicita tu presupuesto ahora mismo
        </Typography>

        <Button
          variant="contained"
          size="large"
          sx={{
            py: 2,
            borderRadius: 50,
            fontSize: "1.5rem",
            fontWeight: "bold",
            backgroundColor: (theme) => theme.palette.secondary.main,
            boxShadow: "0px 10px 30px rgba(0,0,0,0.5)",
            animation: "pulse 2s infinite",
            "@keyframes pulse": {
              "0%": {
                transform: "scale(1)",
                boxShadow: "0 0 0 0 rgba(255,255,255,0.4)",
              },
              "70%": {
                transform: "scale(1.05)",
                boxShadow: "0 0 0 20px rgba(255,255,255,0)",
              },
              "100%": {
                transform: "scale(1)",
                boxShadow: "0 0 0 0 rgba(255,255,255,0)",
              },
            },
          }}
        >
          VER CATÁLOGO
        </Button>
      </Box>
    </Box>
  );
}

KioskScreensaver.propTypes = {
  timeout: PropTypes.number,
};
