// Las piezas visuales que comparten la tarjeta del cliente y la de cada
// factura: los recuadros de color que envuelven cada bloque, la fila de datos
// que va adentro, el molde de los botones de acción y la pizarra oscura del
// estado de cuenta. Vivían dentro de ClienteDetalle.jsx; se sacaron acá para
// que FacturaCard.jsx pueda usarlas sin depender de su pantalla.
//
// Son funciones que devuelven JSX, no componentes: se llaman como
// renderPizarraTotales(...) desde el JSX del que las usa.
import { alpha } from "@mui/material/styles";
import { Box, Divider, Paper, Stack, Typography } from "@mui/material";
import PaymentsIcon from "@mui/icons-material/Payments";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import SavingsIcon from "@mui/icons-material/Savings";
import nequiLogo from "../../assets/mediosPago/nequi.png";
import bancolombiaLogo from "../../assets/mediosPago/bancolombia.png";
import daviplataLogo from "../../assets/mediosPago/daviplata.png";
import { formatearMonedaOVacio } from "../../Utils/formato";

// Cada medio de pago con su logo (ver MODOS_PAGO en facturaUtils.js). "Nequi"
// y "Nequi A" son dos cuentas de personas distintas —Yaz y Armando— con el
// mismo logo, por eso la primera lleva el nombre escrito al lado. Lo guardado
// en Firestore no cambia: acá solo se traduce lo que se ve.
const LOGOS_PAGO = {
  Nequi: nequiLogo,
  "Nequi A": nequiLogo,
  Bancolombia: bancolombiaLogo,
  Daviplata: daviplataLogo,
};

// Los cuatro logos miden lo mismo, así el renglón queda parejo.
const TAMANO_LOGO_PAGO = { xs: 20, sm: 26 };

export const renderMedioPago = (medio) => {
  const logo = LOGOS_PAGO[medio];

  return (
    // El `title` muestra de qué medio se trata al parar el mouse encima.
    <Box
      component="span"
      title={medio}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        verticalAlign: "middle",
      }}
    >
      {logo ? (
        <Box
          component="img"
          src={logo}
          alt={medio}
          // "contain" porque el de Nequi es más alto que ancho: así entra
          // entero en vez de recortarse o deformarse.
          sx={{
            height: TAMANO_LOGO_PAGO,
            width: TAMANO_LOGO_PAGO,
            objectFit: "contain",
            display: "block",
          }}
        />
      ) : (
        <PaymentsIcon
          sx={{ fontSize: TAMANO_LOGO_PAGO, color: "custom.pagoEfectivo" }}
        />
      )}

      {medio === "Nequi" && (
        <Typography
          component="span"
          variant="caption"
          fontWeight="bold"
          sx={{ color: "text.primary", lineHeight: 1 }}
        >
          Yaz
        </Typography>
      )}
    </Box>
  );
};

// El recuadro de color que envuelve cada bloque de una factura: la
// informacion de pago, los cargos adicionales y los abonos. Todo su aspecto
// —el borde, el resplandor y el degradado— sale del color que se le pase,
// que es el del bloque al que pertenece.
export const renderRecuadroBloque = (color, contenido, key) => (
  <Box
    key={key}
    sx={{
      p: 1.5,
      borderRadius: 1,
      bgcolor: "background.paper",
      border: "1px solid",
      // Todo el recuadro se tiñe del color del bloque: el borde, un
      // resplandor difuso alrededor y un degradado por encima.
      borderColor: color,
      // El resplandor va hacia ADENTRO: como sombra externa se derramaba
      // por fuera del borde y manchaba lo que tenía al lado.
      boxShadow: `inset 0 0 12px ${alpha(color, 0.2)}`,
      position: "relative",
      // Recorta el degradado al radio del borde: con inset 0 las esquinas
      // se le salían por encima.
      overflow: "hidden",
      "&::before": {
        content: '""',
        position: "absolute",
        inset: 0,
        borderRadius: "inherit",
        // El degradado cubre el recuadro completo: entra fuerte por la
        // esquina de arriba y se va aclarando en diagonal, pero sin llegar
        // nunca a transparente.
        background: `linear-gradient(135deg, ${alpha(color, 0.16)}, ${alpha(color, 0.04)})`,
        pointerEvents: "none",
      },
    }}
  >
    {contenido}
  </Box>
);

// Los datos de adentro de un recuadro: cada uno es una columna con el rotulo
// arriba y el valor abajo, separadas por una linea vertical. En celular no
// entran cuatro columnas, asi que se apilan y la linea desaparece.
//
// Un dato puede traer `contenido` en vez de `valor` cuando lo que va abajo no
// es texto sino algo dibujado, como el logo del medio de pago.
export const renderFilaDatos = (color, datos) => (
  <Stack
    direction={{ xs: "column", sm: "row" }}
    rowGap={1}
    sx={{ minWidth: 0 }}
    divider={
      <Divider
        orientation="vertical"
        flexItem
        sx={{ my: 0.5, display: { xs: "none", sm: "block" } }}
      />
    }
  >
    {datos.map(({ clave, rotulo, valor, contenido }) => (
      <Box key={clave} sx={{ flex: 1, minWidth: 0, px: { sm: 0.75 } }}>
        {/* El rótulo lleva el color del bloque; el valor va en el color
            normal del texto, que es donde se lee la cifra. */}
        <Typography variant="rotuloDato" sx={{ color }}>
          {rotulo}
        </Typography>
        {contenido || <Typography variant="valorDato">{valor}</Typography>}
      </Box>
    ))}
  </Stack>
);

// El molde de los botones de acción de esta pantalla: un cuadrito con borde,
// que los agrupa visualmente en vez de dejarlos sueltos. Lo usan los de cada
// factura y —en pantalla chica— los del encabezado del cliente.
export const iconBtnSx = {
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 1,
  p: 0.5,
};

// ── La pizarra del estado de cuenta ────────────────────────────────────
//
// Las casillas de una cuenta, en el orden en que se leen: cuánto es, cuánto
// entró y cuánto falta. La usan la tarjeta del cliente —sumando todas sus
// facturas— y cada factura plegada.
//
// `resumida` deja solo las dos que importan de un vistazo: en celular las
// cuatro no entran y los importes de siete cifras se montan entre sí.
export const casillasDeCuenta = (cuenta, { resumida = false } = {}) => {
  const aFavor = cuenta.saldoAFavor > 0;

  const casillaTotal = {
    clave: "total",
    Icono: ReceiptLongIcon,
    rotulo: "Total",
    valor: formatearMonedaOVacio(cuenta.total),
    color: "custom.totalText",
  };

  // Un solo renglón para las dos caras de lo mismo: lo que falta cobrar, o lo
  // que el cliente tiene a su favor si entregó de más.
  const casillaSaldo = {
    clave: "saldo",
    Icono: PendingActionsIcon,
    rotulo: aFavor ? "A favor" : "Saldo",
    valor: formatearMonedaOVacio(
      aFavor ? cuenta.saldoAFavor : cuenta.saldoPendiente,
    ),
    color: aFavor ? "success.light" : "error.light",
  };

  if (resumida) return [casillaTotal, casillaSaldo];

  return [
    casillaTotal,
    {
      clave: "pagado",
      Icono: PaymentsIcon,
      rotulo: "Pagado",
      valor: formatearMonedaOVacio(cuenta.pagado),
      color: "success.light",
    },
    {
      clave: "abonos",
      Icono: SavingsIcon,
      rotulo: "Abonos",
      valor: formatearMonedaOVacio(cuenta.abonos),
      color: "info.light",
    },
    casillaSaldo,
  ];
};

// La pizarra en sí: casillas del mismo ancho separadas por una línea
// vertical, sobre el fondo oscuro fijo del tema (se lee igual de día que de
// noche). El `sx` que se le pase se suma al de acá, para acomodarla en el
// hueco de cada pantalla.
export const renderPizarraTotales = (casillas, sx) => (
  <Paper
    variant="totales"
    sx={{
      minWidth: 0,
      py: 1.25,
      px: 1.5,
      mt: 0,
      // Reemplaza la sombra difusa de la variante por el relieve: luz arriba,
      // sombra abajo.
      boxShadow: (theme) => theme.palette.custom.panelRelieve,
      ...sx,
    }}
  >
    <Stack
      direction="row"
      sx={{ minWidth: 0 }}
      // El divisor lleva margen arriba y abajo para no llegar a los bordes de
      // la tarjeta.
      divider={
        <Divider
          orientation="vertical"
          flexItem
          sx={{ my: 0.5, borderColor: "custom.panelText", opacity: 0.25 }}
        />
      }
    >
      {casillas.map(({ clave, Icono, rotulo, valor, color }) => (
        <Box
          key={clave}
          // Todas las casillas miden lo mismo.
          sx={{ flex: 1, minWidth: 0, color, px: 0.75 }}
        >
          {/* El icono queda a la izquierda, alineado con el rotulo; como es
              mas alto que las dos lineas, ocupa el espacio que sobra abajo. El
              rotulo y el valor arrancan en el mismo punto. */}
          <Stack
            direction="row"
            alignItems="flex-start"
            gap={0.75}
            sx={{ minWidth: 0 }}
          >
            <Icono fontSize="small" sx={{ flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="rotuloDato">{rotulo}</Typography>
              {/* Un valor de siete cifras no entra en un cuarto del hueco y se
                  montaba sobre el de al lado: achica en pantallas medianas.
                  Estas son las cifras principales de la cuenta, un punto más
                  grandes que las de un recuadro. */}
              <Typography
                variant="valorDato"
                sx={{ whiteSpace: "nowrap", fontSize: { lg: "1rem" } }}
              >
                {valor}
              </Typography>
            </Box>
          </Stack>
        </Box>
      ))}
    </Stack>
  </Paper>
);
