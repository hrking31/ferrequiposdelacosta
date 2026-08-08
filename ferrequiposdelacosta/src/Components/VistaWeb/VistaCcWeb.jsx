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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  useTheme,
  useMediaQuery,
} from "@mui/material";

export default function VistaCcWeb() {
  const formValues = useSelector((state) => state.cuentacobro);
  const items = useSelector((state) => state.cuentacobro.value.items);

  const cuenta = formValues.value;

  // Lo que de verdad se cobra: el total menos lo que el cliente ya entregó.
  // Se recalcula acá, y no se usa el `saldo` guardado, para que una cuenta
  // vieja —de antes de que existieran estos campos— siga mostrándose bien.
  const pagado = Number(cuenta.pagado) || 0;
  const abonos = Number(cuenta.abonos) || 0;
  const yaCobrado = pagado + abonos;
  const aCancelar = Math.max(0, (Number(cuenta.total) || 0) - yaCobrado);

  const conFactura = items.some((item) => item.factura);

  // Los renglones del desglose, en el mismo orden y con las mismas condiciones
  // que el PDF (ver VistaCcPdf). `fuerte` marca los tres que van destacados.
  const etiquetaTotal = cuenta.desdeFacturas ? "Total facturas" : "Total";
  const filasTotales = [
    { etiqueta: "Subtotal", valor: cuenta.subtotalNumero, fuerte: true },
  ];
  if (Number(cuenta.descuento) > 0) {
    filasTotales.push({
      etiqueta: "Descuento",
      valor: cuenta.descuento,
      resta: true,
    });
  }
  if (cuenta.iva && Number(cuenta.ivaNumero) > 0) {
    filasTotales.push({ etiqueta: "IVA (19%)", valor: cuenta.ivaNumero });
  }
  if (Number(cuenta.valorDeposito) > 0) {
    filasTotales.push({ etiqueta: "Depósito", valor: cuenta.valorDeposito });
  }
  if (Number(cuenta.valorTransporte) > 0) {
    filasTotales.push({ etiqueta: "Transporte", valor: cuenta.valorTransporte });
  }
  if (yaCobrado > 0) {
    filasTotales.push({ etiqueta: etiquetaTotal, valor: cuenta.total, fuerte: true });
    if (pagado > 0) {
      filasTotales.push({ etiqueta: "Pagado", valor: pagado, resta: true });
    }
    if (abonos > 0) {
      filasTotales.push({ etiqueta: "Abonos", valor: abonos, resta: true });
    }
  }
  filasTotales.push({
    etiqueta: "Total a Cancelar",
    valor: aCancelar,
    fuerte: true,
  });

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  // Las dos tablas de la hoja se pintan como las del PDF: encabezado azul y
  // filas alternadas en gris y blanco. Los colores van fijos, no del tema,
  // porque la hoja es blanca en modo claro y en modo oscuro por igual.
  const estiloTabla = {
    "& td, & th": {
      borderColor: "#E0E0E0",
      px: 0.75,
      whiteSpace: "nowrap",
      color: theme.palette.custom.documentText,
    },
    "& thead th": {
      backgroundColor: "#2980B9",
      color: "#FFFFFF",
      fontWeight: "bold",
    },
    "& tbody tr:nth-of-type(even)": { backgroundColor: "#F5F5F5" },
  };

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
          "&&": { color: "rgba(0,0,0,0.15)" },
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
              <TableCell align="center">Días</TableCell>
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
                <TableCell align="center">{item.day}</TableCell>
                <TableCell align="right" sx={{ pl: 3 }}>
                  {formatearMoneda(item.subtotal)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      {/* Desglose de totales, también igual al PDF: rayado gris y blanco, el
          Subtotal siempre y el resto solo si tiene valor. Los tres renglones
          fuertes llevan el rótulo pegado a la cifra, más grande y en negrita;
          los demás, al principio. Lo que se cobra es el saldo, no el total. */}
      <Box sx={{ mt: "44px", mx: { xs: 0, sm: 4 } }}>
        <Table size="small" sx={estiloTabla}>
          <TableBody>
            {filasTotales.map(({ etiqueta, valor, fuerte, resta }) => (
              <TableRow key={etiqueta}>
                <TableCell
                  align={fuerte ? "right" : "left"}
                  sx={{
                    width: "70%",
                    pr: fuerte ? 4 : 1,
                    fontWeight: fuerte ? "bold" : "normal",
                    fontSize: fuerte ? "1.05rem" : undefined,
                  }}
                >
                  {etiqueta}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontWeight: fuerte ? "bold" : "normal",
                    fontSize: fuerte ? "1.05rem" : undefined,
                  }}
                >
                  {resta ? "- " : ""}
                  {formatearMoneda(valor)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
