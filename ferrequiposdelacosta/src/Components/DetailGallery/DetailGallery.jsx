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

const GalleryContainer = styled(Box)(({ theme }) => ({
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
  height: "70px",
  objectFit: "cover",
  borderRadius: theme.shape.borderRadius / 2,
  cursor: "pointer",
  border: selected
    ? `2px solid ${theme.palette.primary.main}`
    : `1px solid ${theme.palette.divider}`,
  opacity: selected ? 1 : 0.7,
  transition: "all 0.2s ease",
  "&:hover": {
    opacity: 1,
    transform: "scale(1.05)",
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

export default function DetailGallery() {
  const theme = useTheme();
  const isMobile = useMediaQuery("(max-width:915px)");
  const imagenes = useSelector(
    (state) => state.equipoDetail.selectedEquipo?.images || []
  );
  const images = Array.isArray(imagenes) ? imagenes : [];
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleImageClick = (index) => {
    setSelectedImageIndex(index);
  };

  const handlePrev = () => {
    setSelectedImageIndex((prev) =>
      prev === 0 ? images.length - 1 : prev - 1
    );
  };

  const handleNext = () => {
    setSelectedImageIndex((prev) =>
      prev === images.length - 1 ? 0 : prev + 1
    );
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
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
            height: isFullscreen ? "100vh" : isMobile ? "60vh" : "400px",
            position: isFullscreen ? "fixed" : "relative",
            top: isFullscreen ? 0 : "auto",
            left: isFullscreen ? 0 : "auto",
            zIndex: isFullscreen ? theme.zIndex.modal : "auto",
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
