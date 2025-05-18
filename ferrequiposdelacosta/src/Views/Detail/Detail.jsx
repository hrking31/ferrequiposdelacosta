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
} from "@mui/material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import InstagramIcon from "@mui/icons-material/Instagram";
import FacebookIcon from "@mui/icons-material/Facebook";
import EmailIcon from "@mui/icons-material/Email";
import { StyleTypography, StyleNameTypography } from "./DetailEquiposStyled";

export default function Detail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const {
    selectedEquipo: equipo,
    loading,
    error,
  } = useSelector((state) => state.equipoDetail);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  useEffect(() => {
    dispatch(fetchDetailData(id));
  }, [dispatch, id]);

  useEffect(() => {
    if (error) {
      setSnackbarMessage(error);
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
    }
  }, [error]);

  useEffect(() => {
    setOpenSnackbar(false);
    setSnackbarMessage("");
    setSnackbarSeverity("success");
  }, [id]);

  if (loading) return <LoadingLogo />;

  return (
    <Grid container spacing={2}>
      {equipo && (
        <>
          {/* primera */}
          <Grid item xs={12} sm={4} md={4}>
            <Box
              sx={{
                marginTop: "40px",
                minHeight: "200px",
                maxHeight: "400px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                boxShadow: 4,
              }}
            >
              <DetailGallery />
            </Box>
          </Grid>
          {/* segunda */}
          <Grid item xs={12} sm={8} md={8}>
            <Box
              sx={{
                marginTop: "20px",
                maxHeight: "60px",
                minHeight: "60px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: "10px",
                padding: "5px",
                // border: "2px solid blue",
              }}
            >
              <StyleNameTypography
                variant="h4"
                component="h1"
                sx={{
                  wordBreak: "break-word",
                  fontSize: {
                    xs: "1.5rem",
                    sm: "2rem",
                  },
                }}
              >
                {equipo.name.split("\n").map((line, index) => (
                  <React.Fragment key={index}>
                    {line}
                    <br />
                  </React.Fragment>
                ))}
              </StyleNameTypography>
            </Box>
            <Box
              sx={{
                minHeight: "120px",
                marginTop: "10px",
                marginBottom: "15px",
                padding: "5px",
                paddingLeft: "30px",
                paddingRight: "20px",
                // border: "2px solid blue",
              }}
            >
              <StyleTypography
                variant="body1"
                component="p"
                sx={{
                  wordBreak: "break-word",
                }}
              >
                {equipo.description.split("\n").map((line, index) => (
                  <React.Fragment key={index}>
                    {line}
                    <br />
                  </React.Fragment>
                ))}
              </StyleTypography>
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                marginTop: "10px",
                // border: "2px solid blue",
              }}
            >
              <Button
                variant="contained"
                color="success"
                sx={{
                  borderRadius: "50px",
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 20px",
                  backgroundColor: "#25D366",
                  "&:hover": {
                    backgroundColor: "#1DA851",
                  },
                }}
                component="a"
                href="https://wa.me/3028446805"
                target="_blank"
              >
                <WhatsAppIcon sx={{ marginRight: 1 }} />
                <Typography variant="body1" sx={{ color: "white" }}>
                  Cotiza con nosotros
                </Typography>
              </Button>
            </Box>

            <Box
              sx={{
                minHeight: "60px",
                padding: "8px",
                // border: "2px solid blue",
              }}
            >
              <Typography
                variant="h4"
                component="p"
                sx={{
                  color: "#8B3A3A",
                  textAlign: "center",
                  fontFamily: "Oswald, serif",
                  fontWeight: "bold",
                  marginBottom: "15px",
                  fontSize: {
                    xs: "1.5rem",
                    sm: "2rem",
                  },
                }}
              >
                Sector o Actividad del Negocio (Venta y Reparación de
                Tecnología)
              </Typography>
              <Typography
                variant="body1"
                component="p"
                sx={{
                  textAlign: "center",
                  fontFamily: "Roboto, sans-serif",
                  color: "blue",
                }}
              >
                Productos o Servicios Principales. (Venta de celulares,
                accesorios, laptops y servicio técnico.)
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                // border: "2px solid blue",
              }}
            >
              <IconButton
                component="a"
                href="mailto:hrking31@gmail.com"
                target="_blank"
              >
                <EmailIcon fontSize="large" sx={{ color: "#0072C6" }} />
              </IconButton>
              <IconButton
                component="a"
                href="https://www.instagram.com/yourprofile"
                target="_blank"
              >
                <InstagramIcon fontSize="large" sx={{ color: "#E4405F" }} />
              </IconButton>
              <IconButton
                component="a"
                href="https://www.facebook.com/yourprofile"
                target="_blank"
              >
                <FacebookIcon fontSize="large" sx={{ color: "#1877F2" }} />
              </IconButton>
            </Box>
          </Grid>
        </>
      )}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={4000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setOpenSnackbar(false)}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Grid>
  );
}
