import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Box, useTheme, useMediaQuery } from "@mui/material";
import { Link } from "react-router-dom";

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

  const extendedImages = [...images, images[0]];

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
        {extendedImages.map((img, i) => (
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
                backgroundColor: "#fff",
                p: theme.spacing(1),
              }}
            />
          </Link>
        ))}
      </Box>
    </Box>
  );
}
