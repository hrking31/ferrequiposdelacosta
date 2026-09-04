// Tarjeta de un equipo dentro de una factura. Se lee en dos columnas: a la
// izquierda quién es el equipo y qué le pasó —cantidad, nombre y los chips de
// fechas—, a la derecha la plata. La misma tarjeta sirve para un equipo
// original o uno agregado después; el color lo pone quien la usa, según el
// lote al que pertenezca el equipo.
//
// La excepción es un equipo YA DEVUELTO: ese se pinta en verde, el mismo que
// usan los chips de lo que va a favor del cliente. El color dice el estado sin
// que haya que leer, que es lo que se pedía: en un lote donde una parte volvió
// y otra sigue afuera, las dos tarjetas se veían iguales.
import PropTypes from "prop-types";
import { alpha } from "@mui/material/styles";
import { Box, Chip, Stack, Typography, useTheme } from "@mui/material";
import ChipsFechasEquipo from "./ChipsFechasEquipo";
import { calcularEquipo, estaDevuelto } from "./facturaUtils";
// Con alias para que se lean como lo que son acá: la moneda que deja el hueco
// vacío si no hay número, y la fecha DD/MM/AAAA.
import {
  formatearMonedaOVacio as formatearMoneda,
  formatearFechaLegible as formatearFecha,
} from "../../Utils/formato";

// ── Calibrado del bloque de cifras ──────────────────────────────────────
//
// Los tres márgenes que ubican la columna de la plata, sueltos acá arriba y
// no repartidos por el JSX: son los que se ajustan mirando la pantalla, y
// buscarlos entre los estilos era la mitad del trabajo. Estos valores se
// aprobaron a ojo sobre la factura 1234.
//
// La unidad es la del tema: 1 = 8 píxeles.
const CALIBRE = {
  // Lo de AFUERA: cuánto se separa el bloque de la columna del nombre.
  separacionColumnas: 1,
  // Cuánto baja el bloque respecto del nombre. En 0 arrancan parejos.
  margenSuperior: 0,
  // Lo de ADENTRO: el aire entre una cifra y la siguiente.
  espacioEntreCifras: 0.25,
};

// Una cifra del bloque de la derecha. Las tres se dibujan igual y solo cambian
// de color y de peso, así que se arman acá en vez de repetir el mismo
// Typography tres veces.
const Cifra = ({ monto, colorTexto, principal }) => (
  <Typography
    variant={principal ? "body2" : "caption"}
    fontWeight="bold"
    sx={{
      color: colorTexto,
      lineHeight: 1.2,
      whiteSpace: "nowrap",
    }}
  >
    {formatearMoneda(monto)}
  </Typography>
);

Cifra.propTypes = {
  monto: PropTypes.number.isRequired,
  // El color del texto. La cifra principal no lo lleva: hereda el del tema.
  colorTexto: PropTypes.string,
  principal: PropTypes.bool,
};

export default function EquipoRow({ equipo, color, fechaPedido }) {
  const theme = useTheme();

  const porDia =
    (Number(equipo.cantidadEquipos) || 0) * (Number(equipo.valorDia) || 0);
  // Lo que se cobró al despachar: los días con los que salió, sin lo que se
  // le agregó después.
  const subtotalEquipo = porDia * (Number(equipo.diasAlquilados) || 0);

  // La HISTORIA de la plata del equipo, en las mismas partes en que ocurrió:
  // lo que se cobró al despachar, lo que se pactó después al ampliar el plazo
  // y lo que corre solo desde que se venció. Van una debajo de la otra, sin
  // rótulo: qué es cada cifra ya lo dicen los chips de abajo —"+2 días",
  // "5 días vencidos"—, y el color las separa de un vistazo.
  //
  // Antes iban dos números: el inicial y TODO lo demás sumado en uno. Con el
  // Benetín eso daba "$ 1.330.000" y "$ 1.330.000", donde el segundo eran en
  // realidad $ 380.000 de una ampliación y $ 950.000 de cinco días vencidos:
  // dos hechos distintos —uno pactado, el otro no— escondidos en una cifra que
  // ya no decía de dónde salía.
  const cuentaEquipo = calcularEquipo(equipo);
  const hayRenta = subtotalEquipo > 0;
  // Lo que se pactó DE MÁS al ampliarle el plazo, ya con su descuento
  // aplicado. La cuenta del equipo da lo pactado completo; acá interesa la
  // diferencia con lo del despacho, que es lo que la ampliación agregó.
  const valorAmpliado = hayRenta
    ? Math.max(0, cuentaEquipo.netoPactado - subtotalEquipo)
    : 0;
  const valorVencido = hayRenta ? cuentaEquipo.netoVencido : 0;

  // Un equipo devuelto ya no tiene nada por presentarse: su cuenta está
  // cerrada. Por eso va UN solo número —lo que de verdad se le cobra por los
  // días que lo usó— en vez del desglose. De dónde sale el descuento lo
  // explica el chip de días sin usar, y tenerlo también acá era decir dos
  // veces lo mismo.
  //
  // Mientras sigue afuera se muestra la historia completa.
  const devuelto = estaDevuelto(equipo);
  // Un equipo devuelto ya trae en `diasAlquilados` los días que de verdad
  // usó, así que su cuenta neta ES el número: no hay nada que sumarle ni que
  // restarle.
  const valorMostrado = devuelto && hayRenta ? cuentaEquipo.neto : subtotalEquipo;
  const mostrarHistorial = !devuelto && (valorAmpliado > 0 || valorVencido > 0);

  // El color del RELLENO —el resplandor de adentro y el degradado—. Un equipo
  // ya devuelto se pinta de gris por dentro: el color dice el estado sin que
  // haya que leer. Gris y no verde a propósito — en esta pantalla el verde
  // significa PAGO, y una línea cerrada no es plata. El borde no lo toca: eso
  // sigue diciendo de qué lote es.
  const colorEquipo = devuelto
    ? theme.palette.custom.seccionDevuelto
    : color;

  // El color del HECHO de haber devuelto, que es distinto del relleno: el
  // relleno apaga la tarjeta porque ya no hay nada que gestionar, y este
  // resalta el rótulo. Es el rosa de la gestión de seguimiento, donde una
  // devolución ya se pinta así.
  const colorDevolucion = theme.palette.custom.seccionGestion;

  return (
    <Box
      sx={{
        p: 1,
        borderRadius: 1,
        bgcolor: "background.paper",
        border: "1px solid",
        // Mismo tratamiento que el recuadro de pago. El BORDE se queda
        // siempre con el color del lote: es lo que ata la tarjeta a su grupo,
        // y si también se volviera verde la devuelta parecería de otro lote.
        // Lo que cambia es el relleno (ver colorEquipo, abajo).
        borderColor: color,
        boxShadow: `inset 0 0 12px ${alpha(colorEquipo, 0.2)}`,
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          background: `linear-gradient(135deg, ${alpha(colorEquipo, 0.12)}, ${alpha(colorEquipo, 0.03)})`,
          pointerEvents: "none",
        },
      }}
    >
      {/* LAS DOS COLUMNAS. Antes las cifras vivían dentro de la fila del
          nombre y los chips iban debajo, a lo ancho de toda la tarjeta: cada
          cifra que se sumaba estiraba esa fila y la tarjeta crecía hacia
          abajo, mientras al lado de los chips sobraba lugar vacío.

          Ahora el bloque de plata es una columna propia que corre junto al
          nombre Y a los chips. El alto de la tarjeta lo manda la más alta de
          las dos columnas —casi siempre la izquierda—, así que la segunda y la
          tercera cifra caen en un espacio que ya estaba ahí. */}
      <Stack
        direction="row"
        alignItems="flex-start"
        gap={CALIBRE.separacionColumnas}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <Chip
              variant="meta"
              label={equipo.cantidadEquipos}
              size="small"
              sx={{
                fontWeight: "bold",
                flexShrink: 0,
                // Antes era amarillo fijo, que en modo claro quedaba casi
                // invisible sobre el chip. Es letra chica, así que va el
                // acento en su versión oscura.
                //
                // El acento TAMBIÉN en el equipo devuelto: en el gris de esa
                // tarjeta el número se perdía, y cuántas unidades volvieron es
                // justamente el dato que se va a buscar. Lo que se apaga es el
                // fondo, no la cifra.
                color: theme.palette.custom.accent,
              }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography component="span" variant="body2" fontWeight="bold">
                {equipo.nombre}
              </Typography>
              {/* CUÁNDO SE PIDIÓ, que no es lo mismo que cuándo salió
                  despachado. La traen todos los equipos, no solo los que se
                  sumaron después: para los del despacho original es la fecha
                  en que se creó la factura, y sin ella había que deducir de la
                  ausencia del dato que el equipo venía de entrada. */}
              {fechaPedido && (
                <Typography
                  component="span"
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 0.75, whiteSpace: "nowrap" }}
                >
                  agregado {formatearFecha(fechaPedido)}
                </Typography>
              )}
              {/* Y QUE VOLVIÓ. El rótulo va junto al nombre y no como un chip
                  más abajo: es lo primero que hay que saber de la tarjeta, y
                  entre los chips de fechas se perdía. */}
              {devuelto && (
                <Typography
                  component="span"
                  variant="caption"
                  fontWeight="bold"
                  sx={{
                    ml: 0.75,
                    px: 0.75,
                    py: 0.15,
                    borderRadius: 0.5,
                    whiteSpace: "nowrap",
                    // Relleno sólido y no un contorno del gris de la tarjeta:
                    // en gris sobre gris el rótulo se perdía, y es lo primero
                    // que hay que ver. Va en el rosa de la GESTIÓN —el que
                    // Seguimiento usa para las llamadas, las prórrogas y las
                    // devoluciones—, así que el mismo hecho se pinta igual en
                    // las dos pantallas.
                    bgcolor: colorDevolucion,
                    color: theme.palette.getContrastText(colorDevolucion),
                  }}
                >
                  DEVUELTO
                </Typography>
              )}
              {/* La fecha, FUERA del rótulo. Son dos datos distintos —que
                  volvió, y cuándo— y adentro del bloque rosa se leían como uno
                  solo; separada se lee igual que la del pedido, que es su par.
                  Sigue acá arriba y no entre los chips de fechas: ahí obligaba
                  a bajar a buscar cuándo había vuelto. */}
              {devuelto && equipo.devolucion?.fechaDevolucion && (
                <Typography
                  component="span"
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 0.75, whiteSpace: "nowrap" }}
                >
                  {formatearFecha(equipo.devolucion.fechaDevolucion)}
                </Typography>
              )}
            </Box>
          </Stack>
          {/* La historia de fechas del equipo, igual que en Seguimiento: mismo
              componente, mismos tramos, mismos colores.

              Acá había un grid de dos columnas para móvil —días y precio de un
              lado, fechas del otro—. Se fue con los tramos: ahora el precio por
              día viaja junto a la fecha de salida, que es de lo que es
              condición, y partirlos en dos columnas volvería a separar lo que
              se acaba de juntar. En móvil los tramos envuelven solos. */}
          <ChipsFechasEquipo equipo={equipo} omitir={["devuelto"]} />
        </Box>

        {/* COLUMNA DERECHA: la plata. */}
        {hayRenta && (
          <Stack
            sx={{
              flexShrink: 0,
              textAlign: "right",
              mt: CALIBRE.margenSuperior,
              gap: CALIBRE.espacioEntreCifras,
            }}
          >
            <Cifra monto={valorMostrado} principal />
            {mostrarHistorial && valorAmpliado > 0 && (
              // El acento, igual que el chip "+2 días" del que sale este
              // número: lo pactado se pinta del mismo color en los dos lados
              // de la tarjeta.
              <Cifra monto={valorAmpliado} colorTexto="custom.accent" />
            )}
            {mostrarHistorial && valorVencido > 0 && (
              // Rojo, como el chip "5 días vencidos": esta plata no se pactó
              // con nadie, se está acumulando sola.
              <Cifra monto={valorVencido} colorTexto="error.main" />
            )}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}

EquipoRow.propTypes = {
  equipo: PropTypes.object.isRequired,
  color: PropTypes.string.isRequired,
  // Cuándo se pidió: la fecha del lote que lo trajo. Para los equipos del
  // despacho original es la de la factura; para los agregados después, la del
  // lote. La pone quien dibuja la fila, que es quien sabe de qué lote es.
  fechaPedido: PropTypes.string,
};
