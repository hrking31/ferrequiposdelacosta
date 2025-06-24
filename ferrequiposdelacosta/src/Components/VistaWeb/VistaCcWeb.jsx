import { useSelector } from "react-redux";
import LogoFerrequipos from "../../assets/LogoFerrequipos.png";
import { Container, Typography, Box, Grid, useTheme, useMediaQuery } from '@mui/material';

export default function VistaCcWeb() {
  const formValues = useSelector((state) => state.cuentacobro);
  const items = useSelector((state) => state.cuentacobro.value.items);
  const total = useSelector((state) => state.cuentacobro.value.total);

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Container
      sx={{
        padding: isSmallScreen ? "20px" : "40px",
        maxWidth: "800px",
        backgroundColor: "white",
        boxShadow: "0px 0px 20px rgba(0, 0, 0, 0.1)",
        borderRadius: "10px",
        margin: "0 auto",
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '20px',
          flexDirection: isSmallScreen ? 'column' : 'row',
        }}
      >
        <img
          src={LogoFerrequipos}
          alt="Logo"
          style={{ width: isSmallScreen ? "80px" : "100px", marginRight: isSmallScreen ? "0" : "20px" }}
        />
        <Box
          sx={{
            textAlign: isSmallScreen ? "center" : "left",
          }}
        >
          <Typography
            variant="h5"
            color="primary"
            sx={{ fontSize: isSmallScreen ? "16px" : "18px" }}
          >
            FERREQUIPOS DE LA COSTA
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontSize: isSmallScreen ? "12px" : "14px",
              color: "red",
              margin: "10px 0",
            }}
          >
            Alquiler de equipos para la construcción
            <br />
            Nit: 22.736.950 - 1
          </Typography>
        </Box>
      </Box>

      <Typography variant="body1" sx={{ fontSize: isSmallScreen ? "12px" : "14px", marginBottom: "10px", textAlign: "center" }}>
        Barranquilla, {formValues.value.fecha}
      </Typography>

      <Typography variant="h6" sx={{ fontSize: isSmallScreen ? "18px" : "20px", fontWeight: "bold", textAlign: "center", margin: "20px 0" }}>
        CUENTA DE COBRO
      </Typography>

      <Typography variant="body1" sx={{ fontSize: isSmallScreen ? "12px" : "14px", marginBottom: "10px", textAlign: "center" }}>
        {formValues.value.empresa}
      </Typography>
      <Typography variant="body1" sx={{ fontSize: isSmallScreen ? "12px" : "14px", marginBottom: "10px", textAlign: "center" }}>
        Nit: {formValues.value.nit}
      </Typography>
      <Typography variant="body1" sx={{ fontSize: isSmallScreen ? "12px" : "14px", marginBottom: "10px", textAlign: "center" }}>
        Obra: {formValues.value.obra}
      </Typography>

      <Typography variant="h6" sx={{ fontSize: isSmallScreen ? "18px" : "20px", fontWeight: "bold", textAlign: "center", margin: "20px 0" }}>
        DEBE A
      </Typography>

      <Typography variant="h6" sx={{ fontSize: isSmallScreen ? "18px" : "20px", fontWeight: "bold", textAlign: "center", margin: "20px 0" }}>
        FERREQUIPOS DE LA COSTA
      </Typography>

      <Typography variant="body1" sx={{ fontSize: isSmallScreen ? "12px" : "14px", marginBottom: "10px", textAlign: "center" }}>
        LA SUMA DE: {formValues.value.total}
      </Typography>
      <Typography variant="body1" sx={{ fontSize: isSmallScreen ? "12px" : "14px", marginBottom: "10px", textAlign: "center" }}>
        POR CONCEPTO DE: {formValues.value.concepto}
      </Typography>

      {items.map((item, index) => (
        <Box key={index} sx={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #ccc", padding: "5px 0" }}>
          <Typography 
            variant="body1" 
            sx={{ 
              fontSize: isSmallScreen ? "12px" : "14px", 
              flex: 2,
              wordBreak: "break-word",
              whiteSpace: "normal"
            }}
          >
            {item.description}
          </Typography>
          <Typography variant="body1" sx={{ fontSize: isSmallScreen ? "12px" : "14px", flex: 1, textAlign: "right" }}>
            {item.subtotal}
          </Typography>
        </Box>
      ))}
      
      <Typography variant="h5" sx={{ fontSize: isSmallScreen ? "16px" : "18px", fontWeight: "bold", textAlign: "right", marginTop: "20px" }}>
        Total a Cancelar: {total}
      </Typography>

      <Typography variant="body2" sx={{ fontSize: isSmallScreen ? "10px" : "12px", color: "blue", textAlign: "center", marginTop: "20px" }}>
        Kra 38 # 108 – 23 Tel 2511118 - 3116576633 - 3106046465
        <br />
        Ferrequipos07@hotmail.com
        <br />
        Ferrequiposdelacosta.com
        <br />
        BARRANQUILLA - COLOMBIA
      </Typography>
    </Container>
  );
}

