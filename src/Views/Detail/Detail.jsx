import React from "react";
import { useParams } from "react-router-dom";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchDetailData } from "../../Store/Actions/detailAction";
import DetailGallery from "../../Components/DetailGallery/DetailGallery";
import LoadingLogo from "../../Components/LoadingLogo/LoadingLogo";
import { Grid, Typography, Box, IconButton, Button } from "@mui/material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import InstagramIcon from "@mui/icons-material/Instagram";
import FacebookIcon from "@mui/icons-material/Facebook";
import EmailIcon from "@mui/icons-material/Email";
import LogoFerrequipos from "../../assets/LogoFerrequipos.png";
import { StyleTypography, StyleNameTypography } from "./DetailEquiposStyled";
import RotatingImage from "../../Components/rotar/rotar";

export default function Detail() {
  const { name } = useParams();
  const dispatch = useDispatch();
  const equipo = useSelector((state) => state.equipoDetail.selectedEquipo);

  useEffect(() => {
    dispatch(fetchDetailData(name));
  }, [dispatch, name]);

  if (!equipo) {
    return <LoadingLogo />;
  }

  return (
    <Grid
      container
      spacing={2}
      sx={{
        marginTop: "20px",
        marginBottom: {
          xs: "-15px",
          sm: "-30px",
          md: "-70px",
        },
      }}
    >
      <Grid item xs={12} md={4}>
        <DetailGallery />
      </Grid>
      <Grid item xs={12} md={4}>
        <Box
          sx={{
            padding: 2,
            display: "flex",
            flexDirection: "column",
            height: "80%",
          }}
        >
          <Box sx={{ flexGrow: 1 }}>
            <StyleNameTypography variant="h4" component="h1" gutterBottom>
              {equipo.name}
            </StyleNameTypography>
            <StyleTypography variant="body1" component="p">
              {equipo.description.split("\n").map((line, index) => (
                <React.Fragment key={index}>
                  {line}
                  <br />
                </React.Fragment>
              ))}
            </StyleTypography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", marginTop: 2 }}>
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
              href="https://wa.me/3116576633"
              target="_blank"
            >
              <WhatsAppIcon sx={{ marginRight: 1 }} />
              <Typography variant="body1" sx={{ color: "white" }}>
                Cotiza con nosotros
              </Typography>
            </Button>
          </Box>
        </Box>
      </Grid>
      <Grid item xs={12} md={4}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            height: "auto",
            padding: 2,
          }}
        >
          <Box
            sx={{ display: "flex", justifyContent: "center", marginBottom: 2 }}
          >
            <RotatingImage
              src={LogoFerrequipos}
              alt="Rotating Logo"
              style={{ width: "100px", height: "100px" }}
            />
            {/* <img
              src={LogoFerrequipos}
              alt="Logo"
              style={{ width: "100px", height: "100px" }}
            /> */}
          </Box>
          <Typography
            variant="h3"
            component="p"
            sx={{
              color: "#8B3A3A",
              textAlign: "center",
              fontFamily: "Oswald, serif",
              fontWeight: "bold",
              fontSize: {
                xs: "1.5rem",
                sm: "2rem",
                md: "2.5rem",
                lg: "3rem",
                xl: "3.5rem",
              },
              flex: 1,
            }}
          >
            Alquiler de Equipos para La Construcción
          </Typography>
          <Typography
            variant="body1"
            component="p"
            sx={{
              textAlign: "center",
              fontFamily: "Roboto, sans-serif",
              color: "blue",
              marginTop: "4",
            }}
          >
            ANDAMIOS, CHAZAS, PARALES, ELABORACIÓN DE REJAS EN HIERRO Y
            ALUMINIO, TODO EN SOLDADURA.
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "center", marginTop: 2 }}>
            <IconButton
              component="a"
              href="mailto:ferrequipos07@hotmail.com"
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
        </Box>
      </Grid>
    </Grid>
  );
}
