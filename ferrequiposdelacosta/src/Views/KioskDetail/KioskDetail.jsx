import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchDetailData } from "../../Store/Slices/detailSlice.js";
import DetailGallery from "../../Components/DetailGallery/DetailGallery.jsx";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo.jsx";
import { Typography, Box, Divider, useTheme, useMediaQuery, Button } from "@mui/material";
import KioskProductCardDetail from "../../Components/KioskProductCardDetail/KioskProductCardDetail.jsx";
import Footer from "../../Components/Footer/Footer.jsx";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../../Components/AppSnackbar/AppSnackbar";

export default function KioskDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const theme = useTheme();
  const isFullScreen = useMediaQuery("(max-width:915px)");
  const isMobile = useMediaQuery("(max-width:1024px)");
  const navigate = useNavigate();
  const [isGalleryFullscreen, setIsGalleryFullscreen] = useState(false);

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

  if (loading || !equipo) return <LoadingLogo />;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        height: isMobile ? "auto" : "100dvh",
        overflow: isMobile ? "visible" : "hidden",
        pt: isFullScreen ? { xs: 0, sm: 0 } : 8,
        pb: isFullScreen ? { xs: 6, sm: 7 } : 0,
        // border: "2px solid red",
      }}
    >
      <Box
        sx={{
          flex: isMobile ? "unset" : 1,
          minHeight: isMobile ? "auto" : 0,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          overflow: isMobile ? "visible" : "hidden",
          // border: "2px solid red",
        }}
      >
        <Box
          sx={{
            flexShrink: 0,
            width: isMobile ? "100%" : "41.6667%",
            p: isMobile ? 0 : 2,
            display: "flex",
            justifyContent: "center",
            overflow: isMobile ? "visible" : "hidden",
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
            flex: isMobile ? "unset" : 1,
            minHeight: isMobile ? "auto" : 0,
            minWidth: 0,
            overflowY: isMobile ? "visible" : "auto",
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

          <KioskProductCardDetail product={equipo} />

          <Box sx={{ textAlign: "center", pb: 2 }}>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => navigate("/kioskhome")}
            >
              Ver más Equipos
            </Button>
          </Box>

          <Typography
            sx={{
              fontSize: "1.2rem",
              fontWeight: "bold",
              display: "block",
              textAlign: "center",
              mt: 2,
              mb: 3,
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
