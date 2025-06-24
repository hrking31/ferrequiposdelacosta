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
  Button,
  Snackbar,
  Alert,
  Divider,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import ButtonContacto from "../../Components/ButtonContacto/ButtonContacto";
import Footer from "../../Components/Footer/Footer";
import ProductModal from "../../Components/ProductModal/ProductModal";

export default function Detail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery("(max-width:1024px)");
  const isSmallScreen = useMediaQuery("(max-width:600px)");
  const isMediumScreen = useMediaQuery(
    "(min-width:601px) and (max-width:915px)"
  );

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

  let appBarHeight = 64;

  if (isSmallScreen) {
    appBarHeight = 56;
  } else if (isMediumScreen) {
    appBarHeight = 64;
  }

  if (loading || !equipo) return <LoadingLogo />;

  return (
    <Box
      sx={{
        height: `calc(100vh - ${appBarHeight}px)`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxSizing: "border-box",
        overflow: "auto",
        // border: "2px solid red",
      }}
    >
      <Box sx={{ flexGrow: 1, p: isMobile ? 0 : 2 }}>
        <Grid container>
          <Grid
            item
            xs={12}
            md={isMobile ? 12 : 5}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
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
            }}
          >
            <Typography
              variant="h4"
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

            <Box sx={{ textAlign: "center", pb:2 }}>
              <Button
                variant="success"
                color="primary"
                onClick={() => setOpen(true)}
                sx={{ borderRadius: 2 }}
              >
                <ShoppingCartIcon />
                Agregar al Carrito
              </Button>

              <ProductModal
                open={open}
                onClose={() => setOpen(false)}
                product={equipo}
              />
            </Box>

            <Box sx={{ textAlign: "center" }}>
              <ButtonContacto />
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Box component="footer" sx={{ width: "100%", mt: 2 }}>
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
