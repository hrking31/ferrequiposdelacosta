import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Box, useTheme, useMediaQuery } from "@mui/material";
import { Link } from "react-router-dom";
import LogoHorizontal from "../../assets/LogoFerrequiposHorizontal.svg";
import intercalarMarca from "../../Utils/intercalarMarca.js";

export default function EquipoImageCarousel() {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const isSm = useMediaQuery("(max-width:915px)");
  const equipos = useSelector((state) => state.equipos.equipos || []);

  const images = equipos
    .filter((equipo) => equipo.images?.[0]?.url)
    .map((equipo) => ({
      url: equipo.images[0].url,
      equipoId: equipo.id,
    }));

  // Cada tres fotos, el logo horizontal "para fondo claro" (pedido del dueño,
  // 2026-11-06): el carrusel muestra todo sobre blanco. Ver intercalarMarca.
  const diapos = intercalarMarca(images);
  const extendedImages = [...diapos, diapos[0]];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);

  const containerRef = useRef();

  useEffect(() => {
    if (extendedImages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => prevIndex + 1);
      setIsTransitioning(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [extendedImages.length]);

  useEffect(() => {
    if (currentIndex === extendedImages.length - 1) {
      const timeout = setTimeout(() => {
        setIsTransitioning(false);
        setCurrentIndex(0);
        requestAnimationFrame(() => {
          setIsTransitioning(true); 
        });
      }, 500); 
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, extendedImages.length]);

  if (images.length === 0) return null;

  const flexDirection = isXs || isSm ? "row" : "column";

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: { xs: "100%", sm: "100vw", md: "100vw", lg: "50vw" },
        height: {
          xs: "40vw",
          sm: "30vw",
          md: "25vw",
          lg: "20vw",
        },
        maxHeight: { xs: 200, sm: 250, md: 300, lg: 350 },
        overflow: "hidden",
        mx: "auto",
        position: "relative",
      }}
    >
      <Box
        ref={containerRef}
        sx={{
          display: "flex",
          flexDirection: flexDirection,
          transform:
            flexDirection === "row"
              ? `translateX(-${currentIndex * 100}%)`
              : `translateY(-${currentIndex * 100}%)`,
          transition: isTransitioning ? "transform 0.5s ease-in-out" : "none",
          height: "100%",
          width: "100%",
        }}
      >
        {extendedImages.map((img, i) =>
          img.marca ? (
            // El logo no lleva a ningún lado: no es un equipo.
            <Box
              key={i}
              sx={{
                flex: "0 0 100%",
                height: "100%",
                display: "grid",
                placeItems: "center",
                // Blanco fijo, como las fotos.
                backgroundColor: theme.palette.common.white,
                p: theme.spacing(1),
              }}
            >
              <Box
                component="img"
                src={LogoHorizontal}
                alt="Ferrequipos"
                sx={{ maxWidth: "80%", maxHeight: "70%", width: "auto", height: "auto", display: "block" }}
              />
            </Box>
          ) : (
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
                  objectFit: "contain",
                  display: "block",
                  // Blanco fijo en ambos modos, a propósito: "superficie de
                  // producto" (ver CardEquipos), no una superficie de la UI.
                  backgroundColor: theme.palette.common.white,
                  p: theme.spacing(1),
                }}
              />
            </Link>
          ),
        )}
      </Box>
    </Box>
  );
}
