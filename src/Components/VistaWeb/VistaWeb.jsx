// import { useSelector } from "react-redux";
// import LogoFerrequipos from "../../assets/LogoFerrequipos.png";

// const styles = {
//   container: {
//     fontFamily: "Arial, sans-serif",
//     padding: "40px",
//     maxWidth: "800px",
//     margin: "0 auto",
//     backgroundColor: "white",
//     boxShadow: "0px 0px 20px rgba(0, 0, 0, 0.1)",
//     borderRadius: "10px",
//     position: "relative",
//     zIndex: 10,
//     // Asegura que el contenedor esté por encima de la imagen de fondo
//   },
//   header: {
//     display: 'flex',
//     alignItems: 'center',
//     marginBottom: '20px',
//     flexDirection: 'column', // Ajusta para pantallas pequeñas
//   },
//   logo: {
//     width: "100px",
//     marginRight: "20px",
//   },
//   companyName: {
//     fontSize: "18px",
//     color: "blue",
//     textAlign: "center", // Alineación centrada en pantallas pequeñas
//     lineHeight: "1.2",
//   },
//   subtitle: {
//     fontSize: "14px",
//     color: "red",
//   },
//   info: {
//     marginBottom: "10px",
//     fontSize: "14px",
//     textAlign: "center", // Alineación centrada en pantallas pequeñas
//   },
//   cotizacion: {
//     fontSize: "22px",
//     textAlign: "center",
//     margin: "20px 0",
//   },
//   item: {
//     display: "flex",
//     justifyContent: "space-between",
//     alignItems: "center",
//     borderBottom: "1px solid #ccc",
//     padding: "10px 0",
//   },
//   itemDescription: {
//     flex: 2,
//     fontSize: "14px", // Tamaño de fuente ajustado
//   },
//   itemSubtotal: {
//     flex: 1,
//     textAlign: "right",
//     fontSize: "14px", // Tamaño de fuente ajustado
//   },
//   total: {
//     fontSize: "18px",
//     fontWeight: "bold",
//     textAlign: "right",
//     marginTop: "20px",
//   },
//   piePagina: {
//     fontSize: "12px",
//     color: "blue",
//     textAlign: "center",
//     lineHeight: "1.2",
//     marginTop: "40px",
//   },
//   // Estilos responsivos
//   '@media (max-width: 600px)': {
//     container: {
//       padding: "20px",
//     },
//     logo: {
//       width: "80px",
//     },
//     companyName: {
//       fontSize: "16px",
//     },
//     subtitle: {
//       fontSize: "12px",
//     },
//     info: {
//       fontSize: "12px",
//     },
//     cotizacion: {
//       fontSize: "18px",
//     },
//     itemDescription: {
//       fontSize: "12px",
//     },
//     itemSubtotal: {
//       fontSize: "12px",
//     },
//     total: {
//       fontSize: "16px",
//     },
//     piePagina: {
//       fontSize: "10px",
//     },
//   },
// };

// export default function VistaWeb() {
//   const formValues = useSelector((state) => state.cotizacion);
//   const items = useSelector((state) => state.cotizacion.value.items);
//   const total = useSelector((state) => state.cotizacion.value.total);

//   return (
//     <div style={styles.container}>
//       <div style={styles.header}>
//         <img
//           src={LogoFerrequipos}
//           alt="Logo"
//           style={styles.logo}
//         />
//         <div style={styles.companyName}>
//           <h1 style={{ margin: 0 }}>FERREQUIPOS DE LA COSTA</h1>
//           <div style={styles.subtitle}>
//             <h2 style={{ margin: 0 }}>Alquiler de equipos para la construcción</h2>
//             <h2 style={{ margin: 0 }}>Nit: 22.736.950 - 1</h2>
//           </div>
//         </div>
//       </div>
//       <p style={styles.info}>Barranquilla, {formValues.value.fecha}</p>
//       <p style={styles.info}>Señores: {formValues.value.empresa}</p>
//       <p style={styles.info}>Nit: {formValues.value.nit}</p>
//       <p style={styles.info}>Obra: {formValues.value.direccion}</p>

//       <h1 style={styles.cotizacion}>Cotización</h1>

//       {items.map((item, index) => (
//         <div key={index} style={styles.item}>
//           <p style={styles.itemDescription}>{item.description}</p>
//           <p style={styles.itemSubtotal}>{item.subtotal}</p>
//         </div>
//       ))}
//       <p style={styles.total}>Total: {total}</p>

//       <div style={styles.piePagina}>
//         <h2 style={{ margin: 0 }}>Kra 38 # 108 – 23 Tel 2511118 - 3116576633</h2>
//         <h2 style={{ margin: 0 }}>Ferrequipos07@hotmail.com</h2>
//         <h2 style={{ margin: 0 }}>Ferrequiposdelacosta.co</h2>
//         <h2 style={{ margin: 0 }}>BARRANQUILLA - COLOMBIA</h2>
//       </div>
//     </div>
//   );
// }

import { useSelector } from "react-redux";
import LogoFerrequipos from "../../assets/LogoFerrequipos.png";
import { Box, Typography, Grid, useTheme, useMediaQuery } from '@mui/material';

export default function VistaWeb() {
  const formValues = useSelector((state) => state.cotizacion);
  const items = useSelector((state) => state.cotizacion.value.items);
  const total = useSelector((state) => state.cotizacion.value.total);
  
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        fontFamily: "Arial, sans-serif",
        padding: isSmallScreen ? "20px" : "40px",
        maxWidth: "800px",
        margin: "0 auto",
        backgroundColor: "white",
        boxShadow: "0px 0px 20px rgba(0, 0, 0, 0.1)",
        borderRadius: "10px",
        position: "relative",
        zIndex: 10,
      }}
    >
      <Grid container spacing={2} direction={isSmallScreen ? "column" : "row"} alignItems="center" sx={{ marginBottom: '20px' }}>
        <Grid item>
          <img
            src={LogoFerrequipos}
            alt="Logo"
            style={{
              width: isSmallScreen ? "60px" : "100px", // Tamaño del logo ajustado para pantallas pequeñas
              height: 'auto'
            }}
          />
        </Grid>
        <Grid item>
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontSize: isSmallScreen ? "16px" : "18px",
              color: "blue",
              textAlign: "center",
              lineHeight: "1.2",
            }}
          >
            FERREQUIPOS DE LA COSTA
          </Typography>
          <Typography
            variant="subtitle2"
            component="div"
            sx={{
              fontSize: isSmallScreen ? "12px" : "14px",
              color: "red",
              textAlign: "center",
            }}
          >
            Alquiler de equipos para la construcción
            <br />
            Nit: 22.736.950 - 1
          </Typography>
        </Grid>
      </Grid>
      <Typography variant="body1" sx={{ fontSize: isSmallScreen ? "12px" : "14px", textAlign: "center", marginBottom: "10px" }}>
        Barranquilla, {formValues.value.fecha}
        <br />
        Señores: {formValues.value.empresa}
        <br />
        Nit: {formValues.value.nit}
        <br />
        Obra: {formValues.value.direccion}
      </Typography>

      <Typography variant="h4" sx={{ fontSize: isSmallScreen ? "18px" : "22px", textAlign: "center", margin: "20px 0" }}>
        Cotización
      </Typography>

      {items.map((item, index) => (
        <Grid container key={index} sx={{ borderBottom: "1px solid #ccc", padding: "10px 0" }}>
          <Grid item xs={6}>
            <Typography variant="body2" sx={{ fontSize: isSmallScreen ? "12px" : "14px" }}>
              {item.description}
            </Typography>
          </Grid>
          <Grid item xs={6} sx={{ textAlign: "right" }}>
            <Typography variant="body2" sx={{ fontSize: isSmallScreen ? "12px" : "14px" }}>
              {item.subtotal}
            </Typography>
          </Grid>
        </Grid>
      ))}
      <Typography
        variant="h6"
        sx={{
          fontSize: isSmallScreen ? "16px" : "18px",
          fontWeight: "bold",
          textAlign: "right",
          marginTop: "20px",
        }}
      >
        Total: {total}
      </Typography>

      <Box sx={{ marginTop: "40px", textAlign: "center" }}>
        <Typography variant="caption" sx={{ fontSize: isSmallScreen ? "10px" : "12px", color: "blue", lineHeight: "1.2" }}>
          Kra 38 # 108 – 23 Tel 2511118 - 3116576633
          <br />
          Ferrequipos07@hotmail.com
          <br />
          Ferrequiposdelacosta.co
          <br />
          BARRANQUILLA - COLOMBIA
        </Typography>
      </Box>
    </Box>
  );
}

