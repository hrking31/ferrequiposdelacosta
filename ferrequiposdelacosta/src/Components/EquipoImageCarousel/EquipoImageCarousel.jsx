import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Box, useMediaQuery, useTheme, Typography, Paper } from "@mui/material";
import { Link } from "react-router-dom";

export default function EquipoImageCarousel() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const equipos = useSelector((state) => state.equipos.equipos || []);

  const images = equipos
    .filter((equipo) => equipo.images?.[0]?.url)
    .map((equipo) => ({
      url: equipo.images[0].url,
      equipoId: equipo.id,
    }));

  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef();

  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [images.length]);

  if (images.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        width: isMobile ? "100%" : 310,
        height: isMobile ? 150 : 400,
        overflow: "hidden",
        bgcolor: "#f5f5f5",
      }}
    >
      <Box
        ref={containerRef}
        sx={{
          display: "flex",
          flexDirection: isMobile ? "row" : "column",
          transform: isMobile
            ? `translateX(-${currentIndex * 100}%)`
            : `translateY(-${currentIndex * 100}%)`,
          transition: "transform 0.5s ease-in-out",
          height: "100%",
          width: "100%",
        }}
      >
        {images.map((img, i) => (
          <Link
            key={i}
            to={`/detail/${img.equipoId}`}
            style={{ flex: "0 0 100%", height: "100%" }}
          >
            <Box
              component="img"
              src={img.url}
              alt={`Equipo ${img.equipoId}`}
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "contain", // Mostrar toda la imagen sin recortar
                display: "block",
                backgroundColor: "#fff", // Fondo blanco para que no se vea transparente
                padding: 1,
              }}
            />
          </Link>
        ))}
      </Box>
    </Box>
  );
}
