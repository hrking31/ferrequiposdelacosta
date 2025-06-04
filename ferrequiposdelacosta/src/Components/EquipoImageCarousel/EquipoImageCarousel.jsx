import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { Box, useMediaQuery, useTheme, Typography, Paper } from "@mui/material";
import { Link } from "react-router-dom";

export default function EquipoImageCarousel() {
  const theme = useTheme();
  const isMobile = useMediaQuery("(max-width:820px)");
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
                objectFit: "contain", 
                display: "block",
                backgroundColor: "#fff", 
                padding: 1,
              }}
            />
          </Link>
        ))}
      </Box>
    </Box>
  );
}

// import { useState, useEffect, useRef } from "react";
// import { useSelector } from "react-redux";
// import { Box, useTheme, useMediaQuery } from "@mui/material";
// import { Link } from "react-router-dom";

// export default function EquipoImageCarousel() {
//   const theme = useTheme();
//   const isXs = useMediaQuery(theme.breakpoints.down("sm")); // <600px
//   const isSm = useMediaQuery(theme.breakpoints.between("sm", "md")); // 600px-900px
//   const equipos = useSelector((state) => state.equipos.equipos || []);

//   const images = equipos
//     .filter((equipo) => equipo.images?.[0]?.url)
//     .map((equipo) => ({
//       url: equipo.images[0].url,
//       equipoId: equipo.id,
//     }));

//   const [currentIndex, setCurrentIndex] = useState(0);
//   const containerRef = useRef();

//   useEffect(() => {
//     if (images.length <= 1) return;

//     const interval = setInterval(() => {
//       setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
//     }, 3000);

//     return () => clearInterval(interval);
//   }, [images.length]);

//   if (images.length === 0) {
//     return null;
//   }

//   return (
//     <Box
//       sx={{
//         width: "100%",
//         maxWidth: { xs: "100%", sm: "80vw", md: "60vw", lg: "50vw" },
//         height: {
//           xs: "40vw", // Relativo al ancho en móviles
//           sm: "30vw",
//           md: "25vw",
//           lg: "20vw",
//         },
//         maxHeight: { xs: 200, sm: 250, md: 300, lg: 350 }, // Límites para pantallas grandes
//         overflow: "hidden",
//         bgcolor: theme.palette.background.paper,
//         borderRadius: theme.shape.borderRadius,
//         boxShadow: theme.shadows[2],
//         mx: "auto", // Centrar horizontalmente
//       }}
//     >
//       <Box
//         ref={containerRef}
//         sx={{
//           display: "flex",
//           flexDirection: "row",
//           transform: `translateX(-${currentIndex * 100}%)`,
//           transition: "transform 0.5s ease-in-out",
//           height: "100%",
//           width: `${images.length * 100}%`,
//         }}
//       >
//         {images.map((img, i) => (
//           <Link
//             key={i}
//             to={`/detail/${img.equipoId}`}
//             style={{ flex: `0 0 ${100 / images.length}%`, height: "100%" }}
//           >
//             <Box
//               component="img"
//               src={img.url}
//               alt={`Equipo ${img.equipoId}`}
//               sx={{
//                 width: "100%",
//                 height: "100%",
//                 objectFit: "contain",
//                 display: "block",
//                 bgcolor: theme.palette.background.default,
//                 p: theme.spacing(1),
//               }}
//             />
//           </Link>
//         ))}
//       </Box>
//     </Box>
//   );
// }