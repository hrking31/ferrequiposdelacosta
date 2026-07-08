import { useState } from "react";
import { useSelector } from "react-redux";
import { Grid, IconButton, Box, useTheme, useMediaQuery } from "@mui/material";
import {
  Fullscreen,
  ChevronLeft,
  ChevronRight,
  FullscreenExit,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import PropTypes from "prop-types";

const GalleryContainer = styled(Box)(() => ({
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  backgroundColor: "#fff",
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
  borderRadius: "14px",
  cursor: "pointer",
  border: selected
    ? `2px solid ${theme.palette.secondary.dark}`
    : `1px solid ${theme.palette.secondary.light}`,
  opacity: selected ? 1 : 0.6,
  transition: "all 0.25s ease",
  backgroundColor: "#f5f5f5",
  "&:hover": {
    opacity: 1,
  },
}));

const NavButton = styled(IconButton)(({ theme }) => ({
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  color: theme.palette.common.white,
  "&:hover": {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
}));

export default function DetailGallery({ isFullscreen, setIsFullscreen }) {
  const theme = useTheme();
  const isMobile = useMediaQuery("(max-width:915px)");
   const fullScreen = useMediaQuery("(max-width:1200px)");
  const imagenes = useSelector(
    (state) => state.equipoDetail.selectedEquipo?.images || [],
  );
  const images = Array.isArray(imagenes) ? imagenes : [];
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

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
        >
          <MainImage
            src={selectedImage}
            alt={`Imagen ${selectedImageIndex + 1}`}
          />

          {images.length > 1 && (
            <>
              <NavButton
                onClick={handlePrev}
                sx={{ left: theme.spacing(2) }}
                size="large"
              >
                <ChevronLeft fontSize="large" />
              </NavButton>

              <NavButton
                onClick={handleNext}
                sx={{ right: theme.spacing(2) }}
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
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              color: theme.palette.common.white,
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.7)",
              },
            }}
          >
            {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
          </IconButton>
        </GalleryContainer>

        {!isFullscreen && images.length > 1 && (
          <ThumbnailContainer>
            {images.map((image, index) => (
              <ThumbnailImage
                key={index}
                src={image.url}
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
};
