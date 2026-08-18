// Tarjeta de un equipo dentro de una factura: cantidad/nombre/subtotal
// arriba, días/precio/fechas como pills abajo. La misma tarjeta sirve para
// un equipo original o uno agregado después; el color lo pone quien la usa,
// según el lote al que pertenezca el equipo.
import PropTypes from "prop-types";
import { alpha } from "@mui/material/styles";
import { Box, Chip, Stack, Typography, useTheme } from "@mui/material";
import ChipsFechasEquipo from "./ChipsFechasEquipo";
import { calcularAmpliacionEquipo } from "./facturaUtils";
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

  return (
    <Box
      sx={{
        p: 1,
        borderRadius: 1,
        bgcolor: "background.paper",
        border: "1px solid",
        // Mismo tratamiento que el recuadro de pago, con el color del grupo
        // al que pertenece el equipo.
        borderColor: color,
        boxShadow: `inset 0 0 12px ${alpha(color, 0.2)}`,
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          background: `linear-gradient(135deg, ${alpha(color, 0.12)}, ${alpha(color, 0.03)})`,
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
            color: theme.palette.custom.accent,
          }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="span" variant="body2" fontWeight="bold">
            {equipo.nombre}
          </Typography>
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
              {formatearMoneda(subtotalEquipo)}
            </Typography>
            {ajusteEquipo !== 0 && (
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
