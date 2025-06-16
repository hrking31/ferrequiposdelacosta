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
  Snackbar,
  Alert,
  Divider,
  useMediaQuery,
} from "@mui/material";
import { Instagram, Facebook, Email, Construction } from "@mui/icons-material";
import ButtonContacto from "../../Components/ButtonContacto/ButtonContacto";

export default function Detail() {
  const { id } = useParams();
  const dispatch = useDispatch();
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

  if (loading) return <LoadingLogo />;

  return (
    <Box
      sx={{
        height: `calc(100vh - ${appBarHeight}px)`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        p: 2,
        overflow: "auto",
        boxSizing: "border-box",
        // border: "2px solid red",
      }}
    >
      {equipo && (
        <>
          <Box sx={{ flexGrow: 1}}>
            <Grid container spacing={2}>
              <Grid
                item
                xs={12}
                md={isMobile ? 12 : 5}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: isMobile ? "300px" : "400px",
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
                  pb: {
                    xs: 12,
                    md: 2,
                  },
                }}
              >
                <Typography
                  variant="h3"
                  component="h1"
                  sx={{
                    fontWeight: 700,
                    textAlign: isMobile ? "center" : "left",
                    lineHeight: 1.6,
                    overflowWrap: "break-word",
                    wordBreak: "break-word",
                    hyphens: "auto",
                    maxWidth: "100%",
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
                    lineHeight: 1.6,
                    overflowWrap: "break-word",
                    wordBreak: "break-word",
                    hyphens: "auto",
                    maxWidth: "100%",
                    whiteSpace: "pre-line",
                  }}
                >
                  {equipo.description}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ textAlign: "center" }}>
                  <ButtonContacto />
                </Box>

                {!isMobile && (
                  <>
                    <Box sx={{ textAlign: "center", mt: 16 }}>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        <Construction sx={{ mr: 1 }} />
                        Alquiler de Equipos para Construcción
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                          gap: 2,
                        }}
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
                  </>
                )}
              </Grid>
            </Grid>
          </Box>

          {isMobile && (
            <Box sx={{ textAlign: "center", mt: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                <Construction sx={{ mr: 1 }} />
                Alquiler de Equipos para Construcción
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
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
          )}
        </>
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
    </Box>
  );
}
