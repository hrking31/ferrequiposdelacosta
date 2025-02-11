import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
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
    <Grid container spacing={2}>
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
            href="https://wa.me/3116576633"
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
          {/* <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 2,
            }}
          >
            <RotatingImage
              src={LogoFerrequipos}
              alt="Rotating Logo"
              style={{ width: "100px", height: "100px" }}
            />
          </Box> */}
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
            Alquiler de Equipos para La Construcción
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
            ANDAMIOS, CHAZAS, PARALES, ELABORACIÓN DE REJAS EN HIERRO Y
            ALUMINIO, TODO EN SOLDADURA.
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
      </Grid>
    </Grid>
  );
}
////////////////////////////////////////////////////////////////////
//  return (
//     <Grid
//       container
//       spacing={{
//         xs: 1,
//         sm: 2,
//         md: 2,
//       }}
//       sx={{
//         marginTop: {
//           xs: "5px",
//           sm: "10px",
//           md: "10px",
//         },
//         marginBottom: {
//           xs: "5px",
//           sm: "10px",
//           md: "10px",
//         },
//       }}
//       justifyContent="center"
//     >
//       <Grid item xs={12} md={4}>
//         <DetailGallery />
//       </Grid>
//       <Grid item xs={12} md={4}>
//         <Box
//           sx={{
//             padding: {
//               xs: 1,
//               sm: 2,
//             },
//             display: "flex",
//             flexDirection: "column",
//             height: "80%",
//           }}
//         >
//           <Box sx={{ flexGrow: 1, overflow: "hidden", maxHeight: "600px" }}>
//             <StyleNameTypography
//               variant="h5"
//               component="h1"
//               gutterBottom
//               sx={{
//                 wordBreak: "break-word",
//                 maxWidth: "100%",
//               }}
//             >
//               {equipo.name.split("\n").map((line, index) => (
//                 <React.Fragment key={index}>
//                   {line}
//                   <br />
//                 </React.Fragment>
//               ))}
//             </StyleNameTypography>
//             <StyleTypography
//               variant="body1"
//               component="p"
//               sx={{
//                 wordBreak: "break-word",
//                 maxWidth: "100%",
//                 maxHeight: "600px",
//               }}
//             >
//               {equipo.description.split("\n").map((line, index) => (
//                 <React.Fragment key={index}>
//                   {line}
//                   <br />
//                 </React.Fragment>
//               ))}
//             </StyleTypography>
//           </Box>
//           <Box sx={{ display: "flex", alignItems: "center", marginTop: 2 }}>
//             <Button
//               variant="contained"
//               color="success"
//               sx={{
//                 borderRadius: "50px",
//                 display: "flex",
//                 alignItems: "center",
//                 padding: "10px 20px",
//                 backgroundColor: "#25D366",
//                 "&:hover": {
//                   backgroundColor: "#1DA851",
//                 },
//               }}
//               component="a"
//               href="https://wa.me/3116576633"
//               target="_blank"
//             >
//               <WhatsAppIcon sx={{ marginRight: 1 }} />
//               <Typography variant="body1" sx={{ color: "white" }}>
//                 Cotiza con nosotros
//               </Typography>
//             </Button>
//           </Box>
//         </Box>
//       </Grid>
//       <Grid item xs={12} md={4}>
//         <Box
//           sx={{
//             display: "flex",
//             flexDirection: "column",
//             alignItems: "center",
//             height: "auto",
//             padding: {
//               xs: 1,
//               sm: 2,
//             },
//           }}
//         >
//           <Box
//             sx={{ display: "flex", justifyContent: "center", marginBottom: 2 }}
//           >
//             <RotatingImage
//               src={LogoFerrequipos}
//               alt="Rotating Logo"
//               style={{ width: "100px", height: "100px" }}
//             />
//           </Box>
//           <Typography
//             variant="h3"
//             component="p"
//             sx={{
//               color: "#8B3A3A",
//               textAlign: "center",
//               fontFamily: "Oswald, serif",
//               fontWeight: "bold",
//               fontSize: {
//                 xs: "1.5rem",
//                 sm: "2rem",
//                 md: "2.5rem",
//                 lg: "3rem",
//                 xl: "3.5rem",
//               },
//               flex: 1,
//             }}
//           >
//             Alquiler de Equipos para La Construcción
//           </Typography>
//           <Typography
//             variant="body1"
//             component="p"
//             sx={{
//               textAlign: "center",
//               fontFamily: "Roboto, sans-serif",
//               color: "blue",
//               marginTop: "4",
//             }}
//           >
//             ANDAMIOS, CHAZAS, PARALES, ELABORACIÓN DE REJAS EN HIERRO Y
//             ALUMINIO, TODO EN SOLDADURA.
//           </Typography>
//           <Box sx={{ display: "flex", justifyContent: "center", marginTop: 2 }}>
//             <IconButton
//               component="a"
//               href="mailto:ferrequipos07@hotmail.com"
//               target="_blank"
//             >
//               <EmailIcon fontSize="large" sx={{ color: "#0072C6" }} />
//             </IconButton>
//             <IconButton
//               component="a"
//               href="https://www.instagram.com/yourprofile"
//               target="_blank"
//             >
//               <InstagramIcon fontSize="large" sx={{ color: "#E4405F" }} />
//             </IconButton>
//             <IconButton
//               component="a"
//               href="https://www.facebook.com/yourprofile"
//               target="_blank"
//             >
//               <FacebookIcon fontSize="large" sx={{ color: "#1877F2" }} />
//             </IconButton>
//           </Box>
//         </Box>
//       </Grid>
//     </Grid>
//   );
// }
