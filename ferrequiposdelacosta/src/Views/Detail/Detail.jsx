import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchDetailData } from "../../Store/Slices/detailSlice";
import DetailGallery from "../../Components/DetailGallery/DetailGallery";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo";
import {
  Grid,
  Typography,
  Box,
  Snackbar,
  Alert,
  Divider,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import ButtonContacto from "../../Components/ButtonContacto/ButtonContacto";
import Footer from "../../Components/Footer/Footer";
import ProductCardDetail from "../../Components/ProductCardDetail/ProductCardDetail.jsx";

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

  const [snackbarProps, setSnackbarProps] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    dispatch(fetchDetailData(id));
  }, [dispatch, id]);

  useEffect(() => {
    if (error) {
      setSnackbarProps({
        open: true,
        message: error,
        severity: "error",
      });
    }
  }, [error]);

  const handleCloseSnackbar = () => {
    setSnackbarProps((prev) => ({ ...prev, open: false }));
  };

  if (loading || !equipo) return <LoadingLogo text="Cargando Equipo..." />;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        pt: isFullScreen ? 0 : { md: 8, lg: 9 },
        pb: isFullScreen ? { xs: 7, sm: 8 } : 0,
        // border: "2px solid red ",
      }}
    >
      <Box
        sx={{
          flex: 1,
        }}
      >
        <Grid
          container
          sx={{
            p: isMobile ? 0 : 2,
            // border: "2px solid red",
          }}
        >
          <Grid item xs={12} lg={8}>
            <Box
              sx={{
                position: {
                  xs: "relative",
                  lg: isGalleryFullscreen ? "relative" : "sticky",
                },
                top: {
                  lg: isGalleryFullscreen ? 0 : 100,
                },
                alignSelf: "flex-start",
                overflow: "hidden",
                // border: "2px solid red",
              }}
            >
              <DetailGallery
                isFullscreen={isGalleryFullscreen}
                setIsFullscreen={setIsGalleryFullscreen}
              />
            </Box>
          </Grid>

          <Grid
            item
            xs={12}
            lg={4}
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
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
              <ButtonContacto />
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
          </Grid>
        </Grid>
      </Box>

      <Footer />

      <Snackbar
        open={snackbarProps.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarProps.severity}>
          {snackbarProps.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
