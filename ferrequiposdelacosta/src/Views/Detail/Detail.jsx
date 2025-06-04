import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchDetailData } from "../../Store/Slices/detailSlice";
import DetailGallery from "../../Components/DetailGallery/DetailGallery";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo";
import {
  Grid,
  Typography,
  Box,
  IconButton,
  Button,
  Snackbar,
  Alert,
  Divider,
  useTheme,
  useMediaQuery,
  Container,
} from "@mui/material";
import {
  WhatsApp,
  Instagram,
  Facebook,
  Email,
  LocalPhone,
  Construction,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";

// Componentes estilizados
const DetailContainer = styled(Box)(({ theme }) => ({
  margin: theme.spacing(3, "auto"),
  maxWidth: "1200px",
  overflow: "hidden",
}));

const GalleryWrapper = styled(Box)(({ theme }) => ({
  height: "100%",
  minHeight: "400px",
  display: "flex",
  alignItems: "center",
  [theme.breakpoints.down("sm")]: {
    minHeight: "300px",
  },
}));

const ContentWrapper = styled(Box)(({ theme }) => ({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  padding: theme.spacing(0, 2),
}));

const ActionButton = styled(Button)(({ theme }) => ({
  padding: theme.spacing(1.5, 3),
  borderRadius: theme.shape.borderRadius * 2,
  fontWeight: 600,
  margin: theme.spacing(1),
  textTransform: "none",
  boxShadow: theme.shadows[2],
  "&:hover": {
    boxShadow: theme.shadows[4],
  },
}));

export default function Detail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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

  if (loading) return <LoadingLogo />;

  return (
    <Container maxWidth="lg" sx={{ py: 2, height: "100%" }}>
      {equipo && (
        <DetailContainer elevation={3}>
          <Grid container spacing={4} sx={{ height: "100%" }}>
            <Grid
              item
              xs={12}
              md={5}
              sx={{ height: isMobile ? "auto" : "100%" }}
            >
              <GalleryWrapper>
                <DetailGallery />
              </GalleryWrapper>
            </Grid>

            <Grid item xs={12} md={7} sx={{ height: "100%" }}>
              <ContentWrapper>
                <Typography
                  variant="h3"
                  component="h1"
                  sx={{
                    fontWeight: 700,
                    mb: 3,
                    textAlign: isMobile ? "center" : "left",
                  }}
                >
                  {equipo.name.split("\n").map((line, index) => (
                    <React.Fragment key={index}>
                      {line}
                      <br />
                    </React.Fragment>
                  ))}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.6 }}>
                  {equipo.description.split("\n").map((line, index) => (
                    <React.Fragment key={index}>
                      {line}
                      <br />
                    </React.Fragment>
                  ))}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    gap: 2,
                  }}
                >
                  <ActionButton
                    variant="contained"
                    color="success"
                    startIcon={<WhatsApp />}
                    href="https://wa.me/3116576633"
                    target="_blank"
                    sx={{
                      backgroundColor: "#25D366",
                      "&:hover": { backgroundColor: "#128C7E" },
                      minWidth: 200,
                    }}
                  >
                    Cotiza con nosotros
                  </ActionButton>
                  <ActionButton
                    variant="contained"
                    color="primary"
                    startIcon={<LocalPhone />}
                    href="tel:+573116576633"
                    sx={{ minWidth: 200 }}
                  >
                    Llamar ahora
                  </ActionButton>
                </Box>

                <Box sx={{ mt: "auto", pt: 3 }}>
                  <Divider sx={{ mb: 3 }} />
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      <Construction sx={{ mr: 1 }} />
                      Alquiler de Equipos para Construcción
                    </Typography>
                    <Box
                      sx={{ display: "flex", justifyContent: "center", gap: 2 }}
                    >
                      <IconButton href="mailto:ferrequipos07@hotmail.com">
                        <Email />
                      </IconButton>
                      <IconButton href="https://www.instagram.com/ferrequipos07?utm_source=qr&igsh=aGpqN2s4Y2h5ZmRi">
                        <Instagram />
                      </IconButton>
                      <IconButton href="https://www.facebook.com/share/19fZ91JWgg/">
                        <Facebook />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>
              </ContentWrapper>
            </Grid>
          </Grid>
        </DetailContainer>
      )}

      <Snackbar
        open={snackbarProps.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarProps.severity}>
          {snackbarProps.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
