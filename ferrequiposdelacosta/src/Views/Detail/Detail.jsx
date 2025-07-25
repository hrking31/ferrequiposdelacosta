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

  if (loading || !equipo) return <LoadingLogo />;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxSizing: "border-box",
        overflow: "auto",
        pt: isFullScreen ? { xs: 0, sm: 0 } : 8,
        pb: isFullScreen ? { xs: 6, sm: 7 } : 0,
        // border: "2px solid red",
      }}
    >
      <Box
        sx={{
          flexGrow: 1,
          p: isMobile ? 0 : 2,
          // border: "2px solid red",
        }}
      >
        <Grid container>
          <Grid
            item
            xs={12}
            md={isMobile ? 12 : 5}
            sx={{
              display: "flex",
              alignItems: "center",
              // border: "2px solid red",
            }}
          >
            <DetailGallery />
          </Grid>

          <Grid
            item
            xs={12}
            md={isMobile ? 12 : 7}
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

            <Box sx={{ textAlign: "center" }}>
              <ButtonContacto />
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Box
        component="footer"
        sx={{
          width: "100%",
          mt: 2,
          //  border: "2px solid red"
        }}
      >
        <Footer />
      </Box>

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
