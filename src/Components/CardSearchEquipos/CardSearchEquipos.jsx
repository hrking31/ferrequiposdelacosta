// import React from "react";
// // import { Link } from "react-router-dom";
// import { Card, CardActionArea, CardMedia, Grid } from "@mui/material";
// import {
//   StyleNameTypography,
//   StyledCardContent,
// } from "./CardSearchEquiposStyles";
// import { Textfit } from "react-textfit";

// export default function CardSearchEquipos({ name, url }) {
//   return (
//     <Grid
//       container
//       spacing={2}
//       sx={{
//         marginTop: "20px",
//         marginBottom: {
//           xs: "-15px",
//           sm: "-30px",
//           md: "-70px",
//         },
//       }}
//     >
//       <Grid item xs={12}>
//         {/* <Link
//           to={`/vistaeliminarequipo/${name}`}
//           style={{ textDecoration: "none" }}
//         > */}
//         <Card
//           sx={{
//             backgroundColor: "#ededed",
//             height: "auto",
//             transition: "0.2s",
//             "&:hover": {
//               transform: "scale(1.05)",
//               boxShadow: 6,
//             },
//           }}
//         >
//           <CardActionArea>
//             <CardMedia
//               component="img"
//               height="400"
//               src={url}
//               alt="img not found"
//             />
//             <StyledCardContent>
//               <Grid container direction="column" spacing={2}>
//                 <Grid item xs={12} sx={{ marginBottom: "-15px" }}>
//                   <Textfit mode="multi" max={30}>
//                     <StyleNameTypography>{name}</StyleNameTypography>
//                   </Textfit>
//                 </Grid>
//               </Grid>
//             </StyledCardContent>
//           </CardActionArea>
//         </Card>
//         {/* </Link> */}
//       </Grid>
//     </Grid>
//   );
// }

// import React from "react";
// import { useDispatch } from "react-redux";
// import { Card, CardActionArea, CardMedia, Grid } from "@mui/material";
// import {
//   StyleNameTypography,
//   StyledCardContent,
// } from "./CardSearchEquiposStyles";
// import { Textfit } from "react-textfit";
// import { setSelectedEquipo } from "../../Store/Slices/selectedSlice";

// export default function CardSearchEquipos({ name, url }) {
//   const dispatch = useDispatch();

//   const handleCardClick = () => {
//     dispatch(setSelectedEquipo({ name, url }));
//   };

//   return (
//     <Grid
//       container
//       spacing={2}
//       sx={{
//         marginTop: "20px",
//         marginBottom: {
//           xs: "-15px",
//           sm: "-30px",
//           md: "-70px",
//         },
//       }}
//     >
//       <Grid item xs={12}>
//         <Card
//           sx={{
//             backgroundColor: "#ededed",
//             height: "auto",
//             transition: "0.2s",
//             "&:hover": {
//               transform: "scale(1.05)",
//               boxShadow: 6,
//             },
//           }}
//           onClick={handleCardClick}
//         >
//           <CardActionArea>
//             <CardMedia
//               component="img"
//               height="400"
//               src={url}
//               alt="img not found"
//             />
//             <StyledCardContent>
//               <Grid container direction="column" spacing={2}>
//                 <Grid item xs={12} sx={{ marginBottom: "-15px" }}>
//                   <Textfit mode="multi" max={30}>
//                     <StyleNameTypography>{name}</StyleNameTypography>
//                   </Textfit>
//                 </Grid>
//               </Grid>
//             </StyledCardContent>
//           </CardActionArea>
//         </Card>
//       </Grid>
//     </Grid>
//   );
// }

// import React from "react";
// import { useDispatch } from "react-redux";
// import { Card, CardActionArea, CardMedia, Grid } from "@mui/material";
// import {
//   StyleNameTypography,
//   StyledCardContent,
// } from "./CardSearchEquiposStyles";
// import { Textfit } from "react-textfit";
// import { setSelectedEquipo } from "../../Store/Slices/selectedSlice";

// export default function CardSearchEquipos({ equipo }) {
//   const dispatch = useDispatch();

//   const { name, images } = equipo;

//   const PrimeraUrl = images && images.length > 0 ? images[0].url : null;

//   const handleCardClick = () => {
//     dispatch(setSelectedEquipo(equipo));
//   };

//   return (
//     <Grid
//       container
//       spacing={2}
//       sx={{
//         marginTop: "20px",
//         marginBottom: {
//           xs: "-15px",
//           sm: "-30px",
//           md: "-70px",
//         },
//       }}
//     >
//       <Grid item xs={12}>
//         <Card
//           sx={{
//             backgroundColor: "#ededed",
//             height: "auto",
//             transition: "0.2s",
//             "&:hover": {
//               transform: "scale(1.05)",
//               boxShadow: 6,
//             },
//           }}
//           onClick={handleCardClick}
//         >
//           <CardActionArea>
//             <CardMedia
//               component="img"
//               height="400"
//               src={PrimeraUrl}
//               alt="img not found"
//               style={{ width: "100%", height: "auto" }}
//             />
//             <StyledCardContent>
//               <Grid container direction="column" spacing={2}>
//                 <Grid item xs={12} sx={{ marginBottom: "-15px" }}>
//                   <Textfit mode="multi" max={30}>
//                     <StyleNameTypography>{name}</StyleNameTypography>
//                   </Textfit>
//                 </Grid>
//               </Grid>
//             </StyledCardContent>
//           </CardActionArea>
//         </Card>
//       </Grid>
//     </Grid>
//   );
// }
// import React from "react";
// import { useDispatch } from "react-redux";
// import { Card, CardActionArea, CardMedia, Grid } from "@mui/material";
// import {
//   StyleNameTypography,
//   StyledCardContent,
// } from "./CardSearchEquiposStyles";
// import { Textfit } from "react-textfit";
// import { setSelectedEquipo } from "../../Store/Slices/selectedSlice";

// export default function CardSearchEquipos({ equipo }) {
//   const dispatch = useDispatch();

//   const { name, images } = equipo;
//   const PrimeraUrl = images && images.length > 0 ? images[0].url : null;

//   const handleCardClick = () => {
//     dispatch(setSelectedEquipo(equipo));
//   };

//   return (
//     <Grid
//       container
//       spacing={2}
//       sx={{
//         marginTop: "20px",
//         marginBottom: {
//           xs: "-15px",
//           sm: "-30px",
//           md: "-70px",
//         },
//       }}
//     >
//       <Grid item xs={12} sm={6} md={4} lg={3}>
//         {" "}
//         {/* Adjust grid item size if needed */}
//         <Card
//           sx={{
//             backgroundColor: "#ededed",
//             maxWidth: 345, // Fixed width for all cards
//             maxHeight: 500, // Fixed height for all cards
//             overflow: "hidden", // Hide overflow
//             transition: "0.2s",
//             "&:hover": {
//               transform: "scale(1.05)",
//               boxShadow: 6,
//             },
//           }}
//           onClick={handleCardClick}
//         >
//           <CardActionArea>
//             <CardMedia
//               component="img"
//               image={PrimeraUrl}
//               alt="img not found"
//               sx={{
//                 width: "100%",
//                 height: 200, // Fixed height for the image
//                 objectFit: "cover", // Ensure image covers area without distortion
//               }}
//             />
//             <StyledCardContent>
//               <Grid container direction="column" spacing={2}>
//                 <Grid item xs={12} sx={{ padding: 1 }}>
//                   <Textfit mode="multi" max={20}>
//                     <StyleNameTypography>{name}</StyleNameTypography>
//                   </Textfit>
//                 </Grid>
//               </Grid>
//             </StyledCardContent>
//           </CardActionArea>
//         </Card>
//       </Grid>
//     </Grid>
//   );
// }
import React from "react";
import { useDispatch } from "react-redux";
import { Card, CardActionArea, CardMedia, Grid } from "@mui/material";
import {
  StyleNameTypography,
  StyledCardContent,
} from "./CardSearchEquiposStyles";
import { Textfit } from "react-textfit";
import { setSelectedEquipo } from "../../Store/Slices/selectedSlice";

export default function CardSearchEquipos({ equipo }) {
  const dispatch = useDispatch();

  const { name, images } = equipo;
  const PrimeraUrl = images && images.length > 0 ? images[0].url : null;

  const handleCardClick = () => {
    dispatch(setSelectedEquipo(equipo));
  };

  return (
    <Grid
      container
      spacing={0}
      sx={{
        marginTop: "2px",
        marginBottom: {
          xs: "-15px",
          sm: "-30px",
          md: "-70px",
        },
      }}
    >
      <Grid item xs={12} sm={12} md={12} lg={12}>
        <Card
          sx={{
            backgroundColor: "#ededed",
            maxWidth: 345,
            maxHeight: 500,
            overflow: "hidden",
            transition: "0.2s",
            "&:hover": {
              transform: "scale(1.05)",
              boxShadow: 6,
            },
            margin: 1,
          }}
          onClick={handleCardClick}
        >
          <CardActionArea>
            <CardMedia
              component="img"
              image={PrimeraUrl}
              alt="img not found"
              sx={{
                width: "100%",
                height: 200,
                objectFit: "cover",
              }}
            />
            <StyledCardContent>
              <Grid container direction="column" spacing={2}>
                <Grid item xs={12} sx={{ padding: 1 }}>
                  <Textfit mode="multi" max={20}>
                    <StyleNameTypography>{name}</StyleNameTypography>
                  </Textfit>
                </Grid>
              </Grid>
            </StyledCardContent>
          </CardActionArea>
        </Card>
      </Grid>
    </Grid>
  );
}
