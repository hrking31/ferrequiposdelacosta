import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import LogoFerrequipos from "../../assets/LogoFerrequipos.png";
import {
  formatearMoneda,
  formatearFechaLegible,
  formatearNit,
} from "../../Utils/formato";
import resumenCuentaCobro, {
  columnaDeTiempo,
  valorDeFila,
} from "../CuentaDeCobro/resumenCuentaCobro";
import {
  Container,
  Typography,
  Box,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  useTheme,
  useMediaQuery,
} from "@mui/material";

// `llenarAlto`: la tableta acostada (pedido del dueño, 2026-11-05). La hoja
// llega hasta el borde de abajo, con su propio desplazamiento, y el pie queda al
// fondo, como en una hoja de verdad: el aire va entre los totales y el pie.
export default function VistaCcWeb({ llenarAlto = false }) {
  const formValues = useSelector((state) => state.cuentacobro);
  const items = useSelector((state) => state.cuentacobro.value.items);

  const cuenta = formValues.value;

  // Los mismos renglones del PDF (ver resumenCuentaCobro). `fuerte` marca los
  // tres que van destacados.
  const { filas, filasDeposito, aCancelar } = resumenCuentaCobro(cuenta);
  const filasTotales = [
    ...filas,
    { etiqueta: "Total a Cancelar", valor: aCancelar, fuerte: true },
  ];

  const conFactura =
    cuenta.tipo !== "empresa" && items.some((item) => item.factura);
  const tiempo = columnaDeTiempo(items);

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  // Las dos tablas de la hoja se pintan como las del PDF: encabezado azul y
  // filas alternadas en gris y blanco. Los colores van fijos, no del tema,
  // porque la hoja es blanca en modo claro y en modo oscuro por igual.
  const estiloTabla = theme.tablaDeDocumento;

  return (
    <Container
      sx={{
        padding: isSmallScreen ? "20px" : "40px",
        maxWidth: "100%",
        backgroundColor: theme.palette.custom.documentBackground,
        boxShadow: 4,
        borderRadius: 1.5,
        margin: "0 auto",
        // Para que el número de la cuenta pueda anclarse a la esquina.
        position: "relative",
        ...(llenarAlto && {
          width: "100%",
          height: "100%",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          "& > *": { flexShrink: 0 },
        }),
        // La hoja es blanca en los dos modos, así que su texto no puede seguir
        // al tema: las variantes de tipografía traen color propio y en modo
        // oscuro dejaban gris claro sobre blanco. Los colores del membrete
        // (azul y rojo) y la marca de agua se declaran con "&&" para
        // sobrevivir a esta regla.
        "& .MuiTypography-root": {
          color: theme.palette.custom.documentText,
        },
      }}
    >
      {/* El número del documento, como marca de agua en la esquina: se lee si
          se lo busca, pero no compite con nada. Igual que en la cotización. */}
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
        {cuenta.cuentaCobroId}
      </Typography>

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
          m: "14px",
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

      {/* La dirección lleva renglón fijo: va siempre, aunque esté vacía. */}
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

      <Typography
        variant="h5"
        sx={{
          color: theme.palette.custom.documentText,
          textAlign: "center",
          m: "14px",
        }}
      >
        DEBE A
      </Typography>

      <Typography
        variant="h5"
        sx={{
          color: theme.palette.custom.documentText,
          textAlign: "center",
          m: "14px",
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
        LA SUMA DE: {formatearMoneda(aCancelar)}
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

      {/* Copia de la tabla del PDF: la primera columna es el número de factura
          y solo aparece si los ítems lo traen (se rotula a las personas, no a
          las empresas). En pantallas angostas la tabla se desliza de costado
          en vez de desarmar la hoja. */}
      {/* Las dos tablas van más angostas que la hoja, con aire a los costados,
          como el margen que dejan en el PDF. */}
      <Box sx={{ overflowX: "auto", mx: { xs: 0, sm: 4 } }}>
        <Table size="small" sx={estiloTabla}>
          <TableHead>
            <TableRow>
              {conFactura && <TableCell align="center">Factura</TableCell>}
              <TableCell align="center">Cant.</TableCell>
              <TableCell>Equipo</TableCell>
              <TableCell align="center">{tiempo.titulo}</TableCell>
              <TableCell align="right" sx={{ pl: 3 }}>
                Subtotal
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={index}>
                {conFactura && (
                  <TableCell align="center">{item.factura || ""}</TableCell>
                )}
                <TableCell align="center">{item.quantity}</TableCell>
                <TableCell sx={{ whiteSpace: "normal !important", wordBreak: "break-word" }}>
                  {item.description}
                </TableCell>
                <TableCell align="center">{tiempo.valorDe(item)}</TableCell>
                <TableCell align="right" sx={{ pl: 3 }}>
                  {formatearMoneda(item.subtotal)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      {/* El depósito, antes de los totales y fuera de la suma, igual que en el
          PDF. */}
      {filasDeposito.length > 0 && (
        <Box sx={{ mt: "28px", mx: { xs: 0, sm: 4 } }}>
          <Typography variant="body1" sx={{ mb: "4px" }}>
            DEPÓSITO
          </Typography>
          <Table size="small" sx={estiloTabla}>
            <TableBody>
              {filasDeposito.map((fila) => (
                <TableRow key={fila.etiqueta}>
                  <TableCell sx={{ width: "70%", pr: 1 }}>{fila.etiqueta}</TableCell>
                  <TableCell align="right">{valorDeFila(fila)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {/* Desglose de totales, también igual al PDF: rayado gris y blanco, el
          Subtotal siempre y el resto solo si tiene valor. Los tres renglones
          fuertes llevan el rótulo pegado a la cifra, más grande y en negrita;
          los demás, al principio. Lo que se cobra es el saldo, no el total. */}
      {/* Los aires, algo más justos (pedido del dueño, 2026-10-30): así la
          cuenta vacía, al entrar, cabe entera sin barra en el computador. */}
      <Box sx={{ mt: "28px", mx: { xs: 0, sm: 4 } }}>
        <Table size="small" sx={estiloTabla}>
          <TableBody>
            {filasTotales.map((fila) => (
              <TableRow key={fila.etiqueta}>
                <TableCell
                  align={fila.fuerte ? "right" : "left"}
                  sx={{
                    width: "70%",
                    pr: fila.fuerte ? 4 : 1,
                    fontWeight: fila.fuerte ? "bold" : "normal",
                    fontSize: fila.fuerte ? "1.05rem" : undefined,
                  }}
                >
                  {fila.etiqueta}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontWeight: fila.fuerte ? "bold" : "normal",
                    fontSize: fila.fuerte ? "1.05rem" : undefined,
                  }}
                >
                  {valorDeFila(fila)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>


      {llenarAlto && <Box sx={{ flexGrow: 1 }} />}
      <Box sx={{ mt: "28px", textAlign: "center" }}>
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

VistaCcWeb.propTypes = {
  llenarAlto: PropTypes.bool,
};
