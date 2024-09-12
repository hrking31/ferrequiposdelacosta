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
      <Grid item xs={12}>
        <Card
          sx={{
            backgroundColor: "#ededed",
            height: "auto",
            transition: "0.2s",
            "&:hover": {
              transform: "scale(1.05)",
              boxShadow: 6,
            },
          }}
          onClick={handleCardClick}
        >
          <CardActionArea>
            <CardMedia
              component="img"
              height="400"
              src={PrimeraUrl}
              alt="img not found"
              style={{ width: "100%", height: "auto" }}
            />
            <StyledCardContent>
              <Grid container direction="column" spacing={2}>
                <Grid item xs={12} sx={{ marginBottom: "-15px" }}>
                  <Textfit mode="multi" max={30}>
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
