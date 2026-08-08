import { useSelector } from "react-redux";
import LogoFerrequipos from "../../assets/LogoFerrequipos.png";
import {
  formatearMoneda,
  formatearFechaLegible,
  formatearNit,
} from "../../Utils/formato";
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

  const cuenta = formValues.value;

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Container
      sx={{
        padding: isSmallScreen ? "20px" : "40px",
        maxWidth: "100%",
        backgroundColor: theme.palette.custom.documentBackground,
        boxShadow: 4,
        borderRadius: 1.5,
        margin: "0 auto",
        // La hoja es blanca en los dos modos, así que su texto no puede seguir
        // al tema: las variantes de tipografía traen color propio y en modo
        // oscuro dejaban gris claro sobre blanco. Los colores del membrete
        // (azul y rojo) se declaran con "&&" para sobrevivir a esta regla.
        "& .MuiTypography-root": {
          color: theme.palette.custom.documentText,
        },
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
              "&&": { color: "blue" },
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
              "&&": { color: "red" },
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
          color: theme.palette.custom.documentText,
          mb: "10px",
          textAlign: "center",
        }}
      >
        Barranquilla, {formatearFechaLegible(formValues.value.fecha)}
      </Typography>

      <Typography
        variant="h5"
        sx={{
          color: theme.palette.custom.documentText,
          textAlign: "center",
          m: "20px",
        }}
      >
        CUENTA DE COBRO
      </Typography>

      <Typography
        variant="body1"
        sx={{
          color: theme.palette.custom.documentText,
          mb: "10px",
          textAlign: "center",
        }}
      >
        {formValues.value.empresa}
      </Typography>

      <Typography
        variant="body1"
        sx={{
          color: theme.palette.custom.documentText,
          mb: "10px",
          textAlign: "center",
        }}
      >
        Nit: {formatearNit(formValues.value.nit)}
      </Typography>

      <Typography
        variant="body1"
        sx={{
          color: theme.palette.custom.documentText,
          mb: "10px",
          textAlign: "center",
        }}
      >
        Obra: {formValues.value.obra}
      </Typography>

      {cuenta.direccion && (
        <Typography
          variant="body1"
          sx={{
            color: theme.palette.custom.documentText,
            mb: "10px",
            textAlign: "center",
          }}
        >
          Dirección: {cuenta.direccion}
        </Typography>
      )}

      <Typography
        variant="h5"
        sx={{
          color: theme.palette.custom.documentText,
          textAlign: "center",
          m: "20px",
        }}
      >
        DEBE A
      </Typography>

      <Typography
        variant="h5"
        sx={{
          color: theme.palette.custom.documentText,
          textAlign: "center",
          m: "20px ",
        }}
      >
        FERREQUIPOS DE LA COSTA
      </Typography>

      <Typography
        variant="body1"
        sx={{
          color: theme.palette.custom.documentText,
          mb: "10px",
          textAlign: "center",
        }}
      >
        LA SUMA DE: {formatearMoneda(formValues.value.total)}
      </Typography>

      <Typography
        variant="body1"
        sx={{
          color: theme.palette.custom.documentText,
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
            borderBottom: `1px solid ${theme.palette.divider}`,
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

          <Typography variant="subtitle1">
            {formatearMoneda(item.subtotal)}
          </Typography>
        </Box>
      ))}

      {/* Desglose de totales: el Subtotal siempre; IVA, Depósito y Transporte
          solo si aplican, para no ensuciar el documento con renglones en cero. */}
      <Box sx={{ mt: "20px", textAlign: "right" }}>
        <Typography variant="subtitle2">
          Subtotal: {formatearMoneda(cuenta.subtotalNumero)}
        </Typography>

        {cuenta.iva && (
          <Typography variant="subtitle2">
            IVA (19%): {formatearMoneda(cuenta.ivaNumero)}
          </Typography>
        )}

        {cuenta.deposito && Number(cuenta.valorDeposito) > 0 && (
          <Typography variant="subtitle2">
            Depósito: {formatearMoneda(cuenta.valorDeposito)}
          </Typography>
        )}

        {Number(cuenta.valorTransporte) > 0 && (
          <Typography variant="subtitle2">
            Transporte: {formatearMoneda(cuenta.valorTransporte)}
          </Typography>
        )}

        <Typography variant="subtitle1" sx={{ mt: "8px" }}>
          Total a Cancelar: {formatearMoneda(total)}
        </Typography>
      </Box>

      <Box sx={{ mt: "40px", textAlign: "center" }}>
        <Typography
          variant="documentoPie"
          sx={{
            "&&": { color: "blue" },
          }}
        >
          www.ferrequiposdelacosta.com
          <br />
          ferrequipos07@hotmail.com
          <br />
          Kra 38 # 108 – 23. Tel 605 3356050 - 311 6576633 - 310 6046465
          <br />
          BARRANQUILLA - COLOMBIA
        </Typography>
      </Box>
    </Container>
  );
}
