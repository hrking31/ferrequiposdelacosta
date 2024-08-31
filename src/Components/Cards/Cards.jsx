// import CardEquipos from "../CardEquipos/CardEquipos.jsx";
// import CardEquiposSkeleton from "../CardEquiposSkeleton/CardEquiposSkeleton";
// import { Container, Grid } from "@mui/material";
// import { useSelector } from "react-redux";

// export default function Cards() {
//   const loading = useSelector((state) => state.loading.loading);
//   const equipos = useSelector((state) => state.equipos.equipos);

//   return (
//     <div>
//       <Container>
//         <Grid
//           container
//           rowSpacing={{ xs: 2, sm: 6, md: 8 }}
//           columnSpacing={{ xs: 2, sm: 6, md: 8 }}
//         >
//           {loading
//             ? Array.from(new Array(9)).map((_, index) => (
//                 <CardEquiposSkeleton key={index} />
//               ))
//             : equipos &&
//               equipos.map((equipo, index) => {
//                 return (
//                   <Grid item xs={12} sm={6} md={4} key={index}>
//                     <CardEquipos
//                       name={equipo.name}
//                       url={equipo.url}
//                       description={equipo.description}
//                     />
//                   </Grid>
//                 );
//               })}
//         </Grid>
//       </Container>
//     </div>
//   );
// }

////////////////////////////////NUEVO ARRAY/////////////////////////////////////////////

import CardEquipos from "../CardEquipos/CardEquipos.jsx";
import CardEquiposSkeleton from "../CardEquiposSkeleton/CardEquiposSkeleton";
import { Container, Grid } from "@mui/material";
import { useSelector } from "react-redux";

export default function Cards() {
  const loading = useSelector((state) => state.loading.loading);
  const equipos = useSelector((state) => state.equipos.equipos);

  return (
    <div>
      <Container>
        <Grid
          container
          rowSpacing={{ xs: 2, sm: 6, md: 8 }}
          columnSpacing={{ xs: 2, sm: 6, md: 8 }}
        >
          {loading
            ? Array.from(new Array(9)).map((_, index) => (
                <CardEquiposSkeleton key={index} />
              ))
            : equipos &&
              equipos.map((equipo, index) => {
                const imageUrl =
                  equipo.images && equipo.images.length > 0
                    ? equipo.images[0].url
                    : "default-image-url.jpg";

                return (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <CardEquipos
                      name={equipo.name}
                      url={imageUrl}
                      price={equipo.price}
                      description={equipo.description}
                    />
                  </Grid>
                );
              })}
        </Grid>
      </Container>
    </div>
  );
}
