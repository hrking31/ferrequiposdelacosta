import {
  Typography,
  Box,
  Divider,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchDetailData } from "../../Store/Slices/detailSlice";
import DetailGallery from "../../Components/DetailGallery/DetailGallery";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo";
import ButtonContacto from "../../Components/ButtonContacto/ButtonContacto";
import Footer from "../../Components/Footer/Footer";
import ProductCardDetail from "../../Components/ProductCardDetail/ProductCardDetail.jsx";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../../Components/AppSnackbar/AppSnackbar";

export default function Detail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const theme = useTheme();
  const [isGalleryFullscreen, setIsGalleryFullscreen] = useState(false);
  const isFullScreen = useMediaQuery("(max-width:915px)");
  const isMobile = useMediaQuery("(max-width:1024px)");

  const {
    selectedEquipo: equipo,
    loading,
    error,
  } = useSelector((state) => state.equipoDetail);

  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar("success");

  useEffect(() => {
    dispatch(fetchDetailData(id));
  }, [dispatch, id]);

  useEffect(() => {
    if (error) {
      showSnackbar(error, "error");
    }
  }, [error, showSnackbar]);

  if (loading || !equipo) return <LoadingLogo text="Cargando datos del equipo..." />;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: { xs: "auto", lg: "100dvh" },
        minHeight: { xs: "100vh", lg: "auto" },
        pt: isFullScreen ? 0 : { md: 8, lg: 9 },
        pb: isFullScreen ? { xs: 7, sm: 8 } : 0,
        overflow: { xs: "visible", lg: "hidden" },
        boxSizing: "border-box",
        // border: "2px solid red ",
      }}
    >
      <Box
        sx={{
          flex: { lg: 1 },
          minHeight: { xs: "auto", lg: 0 },
          display: "flex",
          flexDirection: { xs: "column", lg: "row" },
          overflow: { xs: "visible", lg: "hidden" },
          // border: "2px solid red",
        }}
      >
        <Box
          sx={{
            flexShrink: 0,
            width: { xs: "100%", lg: "41.6667%" },
            p: isMobile ? 0 : 2,
            display: "flex",
            justifyContent: "center",
            overflow: { xs: "visible", lg: "hidden" },
            // border: "2px solid red",
          }}
        >
          <Box sx={{ width: "100%" }}>
            <DetailGallery
              isFullscreen={isGalleryFullscreen}
              setIsFullscreen={setIsGalleryFullscreen}
            />
          </Box>
        </Box>

        <Box
          sx={{
            flex: { lg: 1 },
            minHeight: { xs: "auto", lg: 0 },
            minWidth: 0,
            overflowY: { xs: "visible", lg: "auto" },
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            p: 2,
            // border: "2px solid red",
          }}
        >
          <Typography
            variant="h5"
            sx={{
              textAlign: isMobile ? "center" : "left",
              lineHeight: 1.6,
              overflowWrap: "break-word",
              wordBreak: "break-word",
              hyphens: "auto",
              whiteSpace: "pre-line",
            }}
          >
            {equipo.name}
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Typography
            variant="body1"
            sx={{
              pl: 1,
              overflowWrap: "break-word",
              wordBreak: "break-word",
              hyphens: "auto",
              whiteSpace: "pre-line",
            }}
          >
            {equipo.description}
          </Typography>

          <Divider sx={{ my: 2 }} />

          <ProductCardDetail product={equipo} />

          <Box sx={{ textAlign: "center", pb: 4 }}>
            <ButtonContacto
              width={250}
              fontSize={{
                md: "1rem",
              }}
            />
          </Box>

          <Typography
            sx={{
              fontSize: "1.2rem",
              fontWeight: "bold",
              display: "block",
              textAlign: "center",
              color:
                theme.palette.mode === "light"
                  ? theme.palette.primary.main
                  : theme.palette.secondary.light,
            }}
          >
            Contáctenos para consultar disponibilidad, tiempos de alquiler,
            transporte y asesoría sobre el equipo ideal para tu proyecto.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ flexShrink: 0 }}>
        <Footer />
      </Box>

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Box>
  );
}
