// Tarjeta de un equipo dentro de una factura: cantidad/nombre/subtotal
// arriba, días/precio/fechas como pills abajo. La misma tarjeta sirve para
// un equipo original o uno agregado después; el color lo pone quien la usa,
// según el lote al que pertenezca el equipo.
//
// La excepción es un equipo YA DEVUELTO: ese se pinta en verde, el mismo que
// usan los chips de lo que va a favor del cliente. El color dice el estado sin
// que haya que leer, que es lo que se pedía: en un lote donde una parte volvió
// y otra sigue afuera, las dos tarjetas se veían iguales.
import PropTypes from "prop-types";
import { alpha } from "@mui/material/styles";
import { Box, Chip, Stack, Typography, useTheme } from "@mui/material";
import ChipsFechasEquipo from "./ChipsFechasEquipo";
import { calcularAmpliacionEquipo, equipoDevueltoCompleto } from "./facturaUtils";
// Con alias para que se lean como lo que son acá: la moneda que deja el hueco
// vacío si no hay número, y la fecha DD/MM/AAAA.
import {
  formatearMonedaOVacio as formatearMoneda,
  formatearFechaLegible as formatearFecha,
} from "../../Utils/formato";

export default function EquipoRow({ equipo, color }) {
  const theme = useTheme();

  const porDia = (Number(equipo.cantidad) || 0) * (Number(equipo.valor) || 0);
  const subtotalEquipo = porDia * (Number(equipo.dias) || 0);

  // Lo que el equipo suma o resta sobre su valor inicial: de más si se le
  // amplió el plazo o se pasó de la fecha, de menos si devolvió antes y hay
  // días que no se le cobran. Se muestra debajo del valor original —dos
  // números que se suman, no uno que ya incluye al otro—, y con el signo
  // adelante cuando es a favor del cliente.
  const ampliacionEquipo = calcularAmpliacionEquipo(equipo);
  const ajusteEquipo =
    subtotalEquipo > 0 && ampliacionEquipo.neto !== 0 ? ampliacionEquipo.neto : 0;

  // Un equipo devuelto ya no tiene nada por presentarse: su cuenta está
  // cerrada. Por eso va UN solo número —lo que de verdad se le cobra por los
  // días que lo usó— en vez del valor contratado con el ajuste debajo. De
  // dónde sale el descuento lo explica el chip de días sin usar, y tenerlo
  // también acá era decir dos veces lo mismo.
  //
  // Mientras sigue afuera se mantienen los dos números, que es la regla que ya
  // se había fijado: el inicial, y aparte lo que se fue presentando.
  const devuelto = equipoDevueltoCompleto(equipo);
  const valorMostrado = devuelto ? subtotalEquipo + ajusteEquipo : subtotalEquipo;
  const mostrarAjusteAparte = !devuelto && ajusteEquipo !== 0;

  // El color del RELLENO —el resplandor de adentro y el degradado—. Un equipo
  // ya devuelto se pinta de gris por dentro: el color dice el estado sin que
  // haya que leer. Gris y no verde a propósito — en esta pantalla el verde
  // significa PAGO, y una línea cerrada no es plata. El borde no lo toca: eso
  // sigue diciendo de qué lote es.
  const colorEquipo = devuelto
    ? theme.palette.custom.seccionDevuelto
    : color;

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
      <Stack direction="row" alignItems="center" gap={1}>
        <Chip
          variant="meta"
          label={equipo.cantidad}
          size="small"
          sx={{
            fontWeight: "bold",
            flexShrink: 0,
            // Antes era amarillo fijo, que en modo claro quedaba casi
            // invisible sobre el chip. Es letra chica, así que va el acento
            // en su versión oscura.
            color: devuelto ? colorEquipo : theme.palette.custom.accent,
          }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="span" variant="body2" fontWeight="bold">
            {equipo.nombre}
          </Typography>
          {/* El rótulo va pegado al nombre y no como un chip más abajo: es lo
              primero que hay que saber de la tarjeta, y entre los chips de
              fechas se perdía. */}
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
                color: colorEquipo,
                border: "1px solid",
                borderColor: alpha(colorEquipo, 0.5),
              }}
            >
              DEVUELTO
            </Typography>
          )}
          {/* Cuándo se pidió este equipo, que no es lo mismo que cuándo
              salió despachado. Solo lo traen los que se sumaron después de
              crear la factura. */}
          {equipo.fechaAgregado && (
            <Typography
              component="span"
              variant="caption"
              color="text.secondary"
              sx={{ ml: 0.75, whiteSpace: "nowrap" }}
            >
              agregado {formatearFecha(equipo.fechaAgregado)}
            </Typography>
          )}
        </Box>
        {subtotalEquipo > 0 && (
          <Stack sx={{ flexShrink: 0, textAlign: "right" }}>
            <Typography variant="body2" fontWeight="bold">
              {formatearMoneda(valorMostrado)}
            </Typography>
            {mostrarAjusteAparte && (
              <Typography
                variant="caption"
                fontWeight="bold"
                sx={{
                  // A favor del cliente va en verde, no en el acento: es el
                  // mismo criterio del chip "días sin usar".
                  color: ajusteEquipo < 0 ? "success.main" : "custom.accent",
                  lineHeight: 1.2,
                }}
              >
                {ajusteEquipo < 0 ? "-" : ""}
                {formatearMoneda(Math.abs(ajusteEquipo))}
              </Typography>
            )}
          </Stack>
        )}
      </Stack>
      {/* La historia de fechas del equipo, igual que en Seguimiento: mismo
          componente, mismos tramos, mismos colores.

          Acá había un grid de dos columnas para móvil —días y precio de un
          lado, fechas del otro—. Se fue con los tramos: ahora el precio por
          día viaja junto a la fecha de salida, que es de lo que es condición,
          y partirlos en dos columnas volvería a separar lo que se acaba de
          juntar. En móvil los tramos envuelven solos. */}
      <ChipsFechasEquipo equipo={equipo} />
    </Box>
  );
}

EquipoRow.propTypes = {
  equipo: PropTypes.object.isRequired,
  color: PropTypes.string.isRequired,
};
