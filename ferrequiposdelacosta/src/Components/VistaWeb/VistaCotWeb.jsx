import { useSelector } from "react-redux";
import LogoFerrequipos from "../../assets/LogoFerrequipos.png";
import { Box, Typography, Grid, useTheme, useMediaQuery } from "@mui/material";

export default function VistaCotWeb() {
  const formValues = useSelector((state) => state.cotizacion);
  const items = useSelector((state) => state.cotizacion.value.items);
  const total = useSelector((state) => state.cotizacion.value.total);

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

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
      <Grid
        container
        spacing={2}
        direction={isSmallScreen ? "column" : "row"}
        alignItems="center"
        sx={{ marginBottom: "20px" }}
      >
        <Grid item>
          <img
            src={LogoFerrequipos}
            alt="Logo"
            style={{
              width: isSmallScreen ? "60px" : "100px",
              height: "auto",
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
      <Typography
        variant="body1"
        sx={{
          fontSize: isSmallScreen ? "12px" : "14px",
          textAlign: "left",
          marginBottom: "10px",
        }}
      >
        Barranquilla, {formValues.value.fecha}
        <br />
        Señores: {formValues.value.empresa}
        <br />
        Nit: {formValues.value.nit}
        <br />
        Obra: {formValues.value.direccion}
      </Typography>

      <Typography
        variant="h4"
        sx={{
          fontSize: isSmallScreen ? "18px" : "22px",
          textAlign: "center",
          margin: "20px 0",
        }}
      >
        Cotización
      </Typography>

      {items.map((item, index) => (
        <Grid
          container
          key={index}
          sx={{ borderBottom: "1px solid #ccc", padding: "10px 0" }}
        >
          <Grid item xs={6}>
            <Typography
              variant="body2"
              sx={{
                fontSize: isSmallScreen ? "12px" : "14px",
                wordBreak: "break-word",
                whiteSpace: "normal",
              }}
            >
              {item.quantity} {item.description}
            </Typography>
          </Grid>
          <Grid item xs={6} sx={{ textAlign: "right" }}>
            <Typography
              variant="body2"
              sx={{ fontSize: isSmallScreen ? "12px" : "14px" }}
            >
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
        <Typography
          variant="caption"
          sx={{
            fontSize: isSmallScreen ? "10px" : "12px",
            color: "blue",
            lineHeight: "1.2",
          }}
        >
          Kra 38 # 108 – 23 Tel 2511118 - 3116576633 - 3106046465
          <br />
          Ferrequipos07@hotmail.com
          <br />
          Ferrequiposdelacosta.com
          <br />
          BARRANQUILLA - COLOMBIA
        </Typography>
      </Box>
    </Box>
  );
}
