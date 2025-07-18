import { useSelector } from "react-redux";
import LogoFerrequipos from "../../assets/LogoFerrequipos.png";
import {
  Container,
  Typography,
  Box,
  Grid,
  useTheme,
  useMediaQuery,
} from "@mui/material";

export default function VistaCcWeb() {
  const formValues = useSelector((state) => state.cuentacobro);
  const items = useSelector((state) => state.cuentacobro.value.items);
  const total = useSelector((state) => state.cuentacobro.value.total);

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

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
      <Grid
        container
        spacing={1}
        direction={isSmallScreen ? "row" : "row"}
        alignItems="center"
        justifyContent="center"
        sx={{
          marginBottom: "20px",
          textAlign: isSmallScreen ? "left" : "center",
        }}
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
            variant="h5"
            component="div"
            sx={{
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
          color: theme.palette.mode === "light" ? "#3A5169" : "#A0AEC0",
          mb: "10px",
          textAlign: "center",
        }}
      >
        Barranquilla, {formValues.value.fecha}
      </Typography>

      <Typography
        variant="h5"
        sx={{
          color: theme.palette.mode === "light" ? "#3A5169" : "#A0AEC0",
          textAlign: "center",
          m: "20px",
        }}
      >
        CUENTA DE COBRO
      </Typography>

      <Typography
        variant="body1"
        sx={{
          color: theme.palette.mode === "light" ? "#3A5169" : "#A0AEC0",
          mb: "10px",
          textAlign: "center",
        }}
      >
        {formValues.value.empresa}
      </Typography>

      <Typography
        variant="body1"
        sx={{
          color: theme.palette.mode === "light" ? "#3A5169" : "#A0AEC0",
          mb: "10px",
          textAlign: "center",
        }}
      >
        Nit: {formValues.value.nit}
      </Typography>

      <Typography
        variant="body1"
        sx={{
          color: theme.palette.mode === "light" ? "#3A5169" : "#A0AEC0",
          mb: "10px",
          textAlign: "center",
        }}
      >
        Obra: {formValues.value.obra}
      </Typography>

      <Typography
        variant="h5"
        sx={{
          color: theme.palette.mode === "light" ? "#3A5169" : "#A0AEC0",
          textAlign: "center",
          m: "20px",
        }}
      >
        DEBE A
      </Typography>

      <Typography
        variant="h5"
        sx={{
          color: theme.palette.mode === "light" ? "#3A5169" : "#A0AEC0",
          textAlign: "center",
          m: "20px ",
        }}
      >
        FERREQUIPOS DE LA COSTA
      </Typography>

      <Typography
        variant="body1"
        sx={{
          color: theme.palette.mode === "light" ? "#3A5169" : "#A0AEC0",
          mb: "10px",
          textAlign: "center",
        }}
      >
        LA SUMA DE: {formValues.value.total}
      </Typography>

      <Typography
        variant="body1"
        sx={{
          color: theme.palette.mode === "light" ? "#3A5169" : "#A0AEC0",
          mb: "10px",
          textAlign: "center",
        }}
      >
        POR CONCEPTO DE: {formValues.value.concepto}
      </Typography>

      {items.map((item, index) => (
        <Box
          key={index}
          sx={{
            display: "flex",
            justifyContent: "space-between",
            borderBottom: "1px solid #ccc",
            padding: "5px 0",
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              wordBreak: "break-word",
              whiteSpace: "normal",
            }}
          >
            {item.description}
          </Typography>

          <Typography variant="subtitle1">{item.subtotal}</Typography>
        </Box>
      ))}

      <Typography
        variant="subtitle1"
        sx={{
          textAlign: "right",
          mt: "20px",
        }}
      >
        Total a Cancelar: {total}
      </Typography>

      <Box sx={{ mt: "40px", textAlign: "center" }}>
        <Typography
          variant="caption"
          sx={{
            fontSize: isSmallScreen ? "0.625rem" : "0.75rem",
            color: "blue",
            lineHeight: "1.2",
          }}
        >
          Kra 38 # 108 – 23 Tel 605 3356050 - 311 6576633 - 310 6046465
          <br />
          Ferrequipos07@hotmail.com
          <br />
          Ferrequiposdelacosta.com
          <br />
          BARRANQUILLA - COLOMBIA
        </Typography>
      </Box>
    </Container>
  );
}
