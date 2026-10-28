import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Grid, IconButton, Box, useTheme, useMediaQuery } from "@mui/material";
import Fullscreen from "@mui/icons-material/Fullscreen";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import ChevronRight from "@mui/icons-material/ChevronRight";
import FullscreenExit from "@mui/icons-material/FullscreenExit";
import { styled } from "@mui/material/styles";
import PropTypes from "prop-types";
import { miniaturaDe } from "../CatalogoEquipos/catalogoEquipos";

const GalleryContainer = styled(Box)(({ theme }) => ({
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  // Blanco fijo en ambos modos, a propósito: las fotos de los equipos vienen
  // recortadas sobre fondo blanco, así que esta es una "superficie de
  // producto", no una superficie de la UI.
  backgroundColor: theme.palette.common.white,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

const MainImage = styled("img")({
  width: "100%",
  height: "100%",
  objectFit: "contain",
  transition: "opacity 0.3s ease",
});

const ThumbnailContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "center",
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  overflowX: "auto",
}));

const ThumbnailImage = styled("img")(({ theme, selected }) => ({
  width: "60px",
  height: "60px",
  objectFit: "cover",
  borderRadius: theme.shape.borderRadius * 2.5,
  cursor: "pointer",
  // La elegida se marca con el acento del tema —azul de día, amarillo de
  // noche— y las demás con la línea gris de siempre. Antes eran naranja y
  // amarillo fijos: el amarillo sobre el blanco de la miniatura casi no se
  // veía, y el naranja quedó reservado para la barra de arriba.
  border: selected
    ? `2px solid ${theme.palette.custom.accent}`
    : `1px solid ${theme.palette.divider}`,
  opacity: selected ? 1 : 0.6,
  transition: "all 0.25s ease",
  // Misma "superficie de producto" que la imagen principal: las miniaturas son
  // esas mismas fotos, así que comparten el fondo blanco fijo en vez de seguir
  // el modo (si no, quedarían oscuras debajo de una imagen principal blanca).
  backgroundColor: theme.palette.common.white,
  "&:hover": {
    opacity: 1,
  },
}));

const NavButton = styled(IconButton)(({ theme }) => ({
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  backgroundColor: theme.palette.custom.veloFoto,
  color: theme.palette.common.white,
  "&:hover": {
    backgroundColor: theme.palette.custom.veloFotoHover,
  },
}));

// Cuánto corre la fila cada flecha: dos miniaturas (60px) con su espacio.
const PASO_MINIATURAS = 2 * (60 + 8);

// LAS MINIATURAS CON FLECHAS (solo el detalle de la tienda, pedido del dueño,
// 2026-10-26): si no entran todas debajo de la foto grande, flechas a los
// lados de la fila avisan que hay más y la van corriendo; las siguientes
// entran por la derecha. Con el dedo se sigue deslizando. Si entran todas,
// no hay flechas y la fila queda centrada como siempre.
//
// Se mide si sobran al cambiar el ancho y al deslizar; no entra en bucle: las
// flechas no cambian cuántas miniaturas hay, solo dónde se ven.
function MiniaturasConFlechas({ images, selectedIndex, onSelect }) {
  const theme = useTheme();
  const tiraRef = useRef(null);
  const [tira, setTira] = useState({ sobran: false, alInicio: true, alFinal: true });

  const medir = useCallback(() => {
    const nodo = tiraRef.current;
    if (!nodo) return;
    const sobran = nodo.scrollWidth > nodo.clientWidth + 1;
    const alInicio = nodo.scrollLeft <= 1;
    const alFinal = nodo.scrollLeft + nodo.clientWidth >= nodo.scrollWidth - 1;
    setTira((previa) =>
      previa.sobran === sobran && previa.alInicio === alInicio && previa.alFinal === alFinal
        ? previa
        : { sobran, alInicio, alFinal },
    );
  }, []);

  useEffect(() => {
    const nodo = tiraRef.current;
    if (!nodo) return undefined;
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(nodo);
    return () => observador.disconnect();
  }, [images.length, medir]);

  // Al cambiar de foto con las flechas de la foto grande, la fila trae a la
  // vista su miniatura.
  useEffect(() => {
    const nodo = tiraRef.current;
    const miniatura = nodo?.firstElementChild?.children[selectedIndex];
    if (!miniatura) return;
    const izquierda = miniatura.offsetLeft - nodo.firstElementChild.offsetLeft;
    if (izquierda < nodo.scrollLeft) nodo.scrollLeft = izquierda;
    else if (izquierda + miniatura.offsetWidth > nodo.scrollLeft + nodo.clientWidth) {
      nodo.scrollLeft = izquierda + miniatura.offsetWidth - nodo.clientWidth;
    }
  }, [selectedIndex]);

  const correr = (sentido) =>
    tiraRef.current?.scrollBy({ left: sentido * PASO_MINIATURAS, behavior: "smooth" });

  const flecha = (sentido, etiqueta, Icono, apagada) =>
    tira.sobran && (
      <IconButton
        aria-label={etiqueta}
        disabled={apagada}
        onClick={() => correr(sentido)}
        sx={{ flexShrink: 0, color: theme.palette.custom.accent }}
      >
        <Icono />
      </IconButton>
    );

  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      {flecha(-1, "Fotos anteriores", ChevronLeft, tira.alInicio)}
      <Box
        ref={tiraRef}
        onScroll={medir}
        sx={{
          flex: 1,
          minWidth: 0,
          p: 1,
          overflowX: "auto",
          scrollBehavior: "smooth",
          // Sin barra: lo avisan las flechas.
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {/* Centrada con margen automático: con justify-content, si no
            entran, las de la izquierda quedarían fuera de alcance. */}
        <Box sx={{ display: "flex", gap: 1, width: "max-content", mx: "auto" }}>
          {images.map((image, index) => (
            <ThumbnailImage
              key={index}
              src={miniaturaDe(image)}
              alt={`Miniatura ${index + 1}`}
              selected={index === selectedIndex}
              onClick={() => onSelect(index)}
            />
          ))}
        </Box>
      </Box>
      {flecha(1, "Más fotos", ChevronRight, tira.alFinal)}
    </Box>
  );
}

MiniaturasConFlechas.propTypes = {
  images: PropTypes.arrayOf(PropTypes.shape({ url: PropTypes.string })).isRequired,
  selectedIndex: PropTypes.number.isRequired,
  onSelect: PropTypes.func.isRequired,
};

// Cuánto quedan a la vista las flechas de la foto grande después de tocarla.
const FLECHAS_VISIBLES_MS = 2500;

// `deLaTienda`: lo que el dueño pidió para el detalle de la tienda
// (2026-10-26), y que el kiosco no lleva:
// - la fila de miniaturas con sus flechas (ver MiniaturasConFlechas);
// - las flechas de la foto grande, con su círculo oscuro, invisibles
//   mientras no se toca la foto: así no la tapan. Aparecen al tocarla o al
//   pasarle el mouse y se van solas.
export default function DetailGallery({ isFullscreen, setIsFullscreen, deLaTienda = false }) {
  const theme = useTheme();
  const isMobile = useMediaQuery("(max-width:915px)");
   const fullScreen = useMediaQuery("(max-width:1200px)");
  const imagenes = useSelector(
    (state) => state.equipoDetail.selectedEquipo?.images || [],
  );
  const images = Array.isArray(imagenes) ? imagenes : [];
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Las flechas de la foto grande a la vista (en el kiosco, siempre).
  const [flechasALaVista, setFlechasALaVista] = useState(false);
  const temporizadorRef = useRef(null);
  const mostrarFlechas = () => {
    setFlechasALaVista(true);
    clearTimeout(temporizadorRef.current);
    temporizadorRef.current = setTimeout(() => setFlechasALaVista(false), FLECHAS_VISIBLES_MS);
  };
  // Solo con el mouse: en el celular, al levantar el dedo el navegador también
  // avisa que el puntero "salió", y las escondía apenas aparecían. Ahí se van
  // solas, con el tiempo.
  const esconderFlechas = (e) => {
    if (e.pointerType !== "mouse") return;
    clearTimeout(temporizadorRef.current);
    setFlechasALaVista(false);
  };
  useEffect(() => () => clearTimeout(temporizadorRef.current), []);
  const flechasVisibles = !deLaTienda || flechasALaVista;
  const estiloFlecha = {
    opacity: flechasVisibles ? 1 : 0,
    // Invisibles no se pueden tocar: el primer toque solo las muestra.
    pointerEvents: flechasVisibles ? "auto" : "none",
    transition: "opacity 0.3s ease",
  };

  const handleImageClick = (index) => {
    setSelectedImageIndex(index);
  };

  const handlePrev = () => {
    setSelectedImageIndex((prev) =>
      prev === 0 ? images.length - 1 : prev - 1,
    );
  };

  const handleNext = () => {
    setSelectedImageIndex((prev) =>
      prev === images.length - 1 ? 0 : prev + 1,
    );
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  const selectedImage = images[selectedImageIndex]?.url || "";

  if (images.length === 0) {
    return (
      <GalleryContainer
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: theme.palette.text.secondary,
        }}
      >
        No hay imágenes disponibles
      </GalleryContainer>
    );
  }

  return (
    <Grid container spacing={2} justifyContent="center">
      <Grid item xs={12}>
        <GalleryContainer
          sx={{
            height: isFullscreen
              ? "100vh"
              : isMobile
                ? "60vh"
                : "min(56vh, 540px)",
            position: isFullscreen ? "fixed" : "relative",
            top: isFullscreen ? 0 : "auto",
            left: isFullscreen ? 0 : "auto",
            zIndex: isFullscreen ? theme.zIndex.modal : "auto",
            borderRadius: isMobile || fullScreen || isFullscreen ? 0 : "28px",
          }}
          {...(deLaTienda && {
            onPointerDown: mostrarFlechas,
            onPointerMove: mostrarFlechas,
            onPointerLeave: esconderFlechas,
          })}
        >
          <MainImage
            src={selectedImage}
            alt={`Imagen ${selectedImageIndex + 1}`}
          />

          {images.length > 1 && (
            <>
              <NavButton
                onClick={handlePrev}
                sx={{ left: theme.spacing(2), ...estiloFlecha }}
                size="large"
              >
                <ChevronLeft fontSize="large" />
              </NavButton>

              <NavButton
                onClick={handleNext}
                sx={{ right: theme.spacing(2), ...estiloFlecha }}
                size="large"
              >
                <ChevronRight fontSize="large" />
              </NavButton>
            </>
          )}

          <IconButton
            onClick={toggleFullscreen}
            sx={{
              position: "absolute",
              right: theme.spacing(2),
              bottom: theme.spacing(2),
              backgroundColor: theme.palette.custom.veloFoto,
              color: theme.palette.common.white,
              "&:hover": {
                backgroundColor: theme.palette.custom.veloFotoHover,
              },
            }}
          >
            {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
          </IconButton>
        </GalleryContainer>

        {!isFullscreen && images.length > 1 && deLaTienda && (
          <MiniaturasConFlechas
            images={images}
            selectedIndex={selectedImageIndex}
            onSelect={handleImageClick}
          />
        )}

        {!isFullscreen && images.length > 1 && !deLaTienda && (
          <ThumbnailContainer>
            {images.map((image, index) => (
              <ThumbnailImage
                key={index}
                src={miniaturaDe(image)}
                alt={`Miniatura ${index + 1}`}
                selected={index === selectedImageIndex}
                onClick={() => handleImageClick(index)}
              />
            ))}
          </ThumbnailContainer>
        )}
      </Grid>
    </Grid>
  );
}

DetailGallery.propTypes = {
  isFullscreen: PropTypes.bool.isRequired,
  setIsFullscreen: PropTypes.func.isRequired,
  deLaTienda: PropTypes.bool,
};
