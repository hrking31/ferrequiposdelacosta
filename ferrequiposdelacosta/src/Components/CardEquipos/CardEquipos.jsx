import { Link } from "react-router-dom";
import {
  Card,
  CardActionArea,
  CardMedia,
  Grid,
  Typography,
  Box,
} from "@mui/material";

export default function CardEquipos({ name, url, id }) {


  return (
    <Grid item xs={12}>
      <Link to={`/detail/${id}`} style={{ textDecoration: "none" }}>
        <Card
          sx={{
            display: "flex",
            flexDirection: "column",
            height: { xs: 235, sm: 330, md: 470 },
          }}
        >
          <CardActionArea sx={{ flexDirection: "column" }}>
            <CardMedia
              component="img"
              src={url}
              alt={name}
              sx={{
                height: { xs: 180, sm: 280, md: 400 },
                objectFit: "contain",
                backgroundColor: "#fff",
              }}
            />
            <Box
              p={2}
              sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
              }}
            >
              <Typography
                variant="h6"
                title={name}
                sx={{
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 3,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "normal",
                  letterSpacing: "0.3px",
                  width: "100%",
                  maxHeight: "3.9em",
                }}
              >
                {name}
              </Typography>
            </Box>
          </CardActionArea>
        </Card>
      </Link>
    </Grid>
  );
}


// import { Link } from "react-router-dom";
// import { Card, CardActionArea, Grid, Typography, Box } from "@mui/material";

// export default function CardEquipos({ name, url, id }) {
//   return (
//     <Grid item xs={12}>
//       <Link to={`/detail/${id}`} style={{ textDecoration: "none" }}>
//         <Card
//           sx={{
//             display: "flex",
//             flexDirection: "column",
//             height: { xs: 235, sm: 330, md: 470 },
//           }}
//         >
//           <CardActionArea
//             sx={{
//               display: "flex",
//               flexDirection: "column",
//               height: "100%",
//             }}
//           >
//             {/* Box para la imagen */}
//             <Box
//               sx={{
//                 width: "100%",
//                 height: { xs: 180, sm: 280, md: 400 },
//                 backgroundColor: "#fff",
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "center",
//               }}
//             >
//               <img
//                 src={url}
//                 alt={name}
//                 style={{
//                   maxHeight: "100%",
//                   maxWidth: "100%",
//                   objectFit: "contain",
//                 }}
//               />
//             </Box>

//             {/* Box para el texto */}
//             <Box
//               sx={{
//                 width: "100%",
//                 height: { xs: 120, sm: 130, md: 100 }, // altura fija texto
//                 p: 2,
//                 boxSizing: "border-box",
//               }}
//             >
//               <Typography
//                 variant="h6"
//                 title={name}
//                 sx={{
//                   display: "-webkit-box",
//                   WebkitBoxOrient: "vertical",
//                   WebkitLineClamp: 3,
//                   overflow: "hidden",
//                   textOverflow: "ellipsis",
//                   whiteSpace: "normal",
//                   lineHeight: 1.2,
//                 }}
//               >
//                 {name}
//               </Typography>
//             </Box>
//           </CardActionArea>
//         </Card>
//       </Link>
//     </Grid>
//   );
// }
