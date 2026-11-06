import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import LogoFerrequipos from "../../assets/LogoFerrequipos.svg";
import { Box, Typography, Grid, useTheme, useMediaQuery } from "@mui/material";
import { formatearMoneda } from "../../Utils/formato";
import resumenCotizacion from "../Cotizacion/resumenCotizacion";

// `llenarAlto`: lado a lado y el iPad de pie (pedido del dueño, 2026-11-05),
// como la hoja de la cuenta de cobro. La hoja llega hasta el borde de abajo,
// con su propio desplazamiento, y el pie queda al fondo, como en una hoja de
// verdad: el aire va entre los totales y el pie.
export default function VistaCotWeb({ llenarAlto = false }) {
  const formValues = useSelector((state) => state.cotizacion);
  const items = useSelector((state) => state.cotizacion.value.items);
  // Las mismas cifras del formulario y del PDF (ver resumenCotizacion).
  const resumen = resumenCotizacion(formValues.value);

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  // Un renglón de la cuenta: el rótulo a la izquierda y la cifra a la derecha,
  // con la raya de abajo.
  const renglon = (rotulo, valor) => (
    <Box sx={{ mt: 2 }}>
      <Grid
        container
        sx={{
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Grid item xs={6}>
          <Typography variant="subtitle2">{rotulo}</Typography>
        </Grid>

        <Grid item xs={6} sx={{ textAlign: "right" }}>
          <Typography variant="subtitle2">{valor}</Typography>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Box
      sx={{
        fontFamily: "Arial, sans-serif",
        padding: isSmallScreen ? "20px" : "40px",
        width: "100%",
        boxSizing: "border-box",
        backgroundColor: theme.palette.custom.documentBackground,
        boxShadow: 4,
        borderRadius: 1.5,
        position: "relative",
        zIndex: 10,
        ...(llenarAlto && {
          height: "100%",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          "& > *": { flexShrink: 0 },
        }),
        // La hoja es blanca en los dos modos, así que su texto no puede seguir
        // al tema: las variantes de tipografía traen color propio y en modo
        // oscuro dejaban gris claro sobre blanco. Los colores del membrete
        // (azul, rojo y la marca de agua) se declaran con "&&" para sobrevivir
        // a esta regla.
        "& .MuiTypography-root": {
          color: theme.palette.custom.documentText,
        },
      }}
    >
      <Grid
        container
        spacing={1}
        direction="row"
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

        <Typography
          sx={{
            position: "absolute",
            top: { xs: 6, sm: 12 },
            right: { xs: 10, sm: 20 },
            fontSize: { xs: "8px", sm: "10px", md: "12px" },
            fontWeight: 700,
            ...theme.marcaDeAgua,
            letterSpacing: { xs: 0.5, sm: 1.5 },
            textTransform: "uppercase",
            userSelect: "none",
            pointerEvents: "none",
          }}
        >
          {formValues.value.cotizacionId}
        </Typography>

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
        variant="subtitle2"
        sx={{
          textAlign: "left",
          marginBottom: "10px",
        }}
      >
        Barranquilla, {formValues.value.fecha}
        <br />
        {formValues.value.tipo === "empresa" ? "Señores" : "Nombre"}:{" "}
        {formValues.value.empresa}
        <br />
        {formValues.value.tipo === "empresa" ? "NIT" : "Cédula"}:{" "}
        {formValues.value.nit}
        <br />
        Tel: {formValues.value.telefono}
        <br />
        {formValues.value.tipo === "empresa" ? "Obra" : "Dirección"}:{" "}
        {formValues.value.direccion} {formValues.value.barrio}
        {formValues.value.otrosDatos && `, ${formValues.value.otrosDatos}`}
        <br />
        {formValues.value.municipio}
        {formValues.value.municipio && formValues.value.departamento
          ? ", "
          : ""}
        {formValues.value.departamento}
      </Typography>

      <Typography
        variant="h5"
        sx={{
          color: theme.palette.custom.documentText,
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
          sx={{
            borderBottom: `1px solid ${theme.palette.divider}`,
            padding: "10px 0",
          }}
        >
          <Grid item xs={6}>
            <Typography
              variant="subtitle2"
              sx={{
                wordBreak: "break-word",
                whiteSpace: "normal",
              }}
            >
              {item.quantity} {item.description} x{" "}
              {item.day === "1" ? `${item.day} día` : `${item.day} días`}
            </Typography>
          </Grid>

          <Grid item xs={6} sx={{ textAlign: "right" }}>
            <Typography variant="subtitle1">{item.subtotal}</Typography>
          </Grid>
        </Grid>
      ))}

      <Typography
        variant="subtitle1"
        sx={{
          textAlign: "right",
          mt: "20px",
        }}
      >
        Subtotal: {formatearMoneda(resumen.subtotal)}
      </Typography>

      {renglon("Iva", formatearMoneda(resumen.iva))}
      {/* El depósito, entre el IVA y el transporte, siempre (pedido del
          dueño, 2026-11-05): suma al total y se aclara que se devuelve. */}
      {renglon(
        "Depósito (se devuelve al recibir los equipos)",
        formatearMoneda(resumen.deposito),
      )}
      {renglon(
        `Transporte: ${formValues.value.transporte ?? ""}`,
        formatearMoneda(resumen.transporte),
      )}

      <Typography
        variant="subtitle1"
        sx={{
          textAlign: "right",
          mt: "20px",
        }}
      >
        Total: {formatearMoneda(resumen.total)}
      </Typography>

      {llenarAlto && <Box sx={{ flexGrow: 1 }} />}
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
    </Box>
  );
}

VistaCotWeb.propTypes = {
  llenarAlto: PropTypes.bool,
};
