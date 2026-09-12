// LA HISTORIA DE UN EQUIPO, dibujada como línea de tiempo: un renglón por
// hecho, con el día a la izquierda, qué pasó en el medio y la plata —o el
// estado en que quedó— a la derecha.
//
// Reemplaza a los chips de fechas dentro de la ficha de la factura. Los chips
// contestan "¿cómo está hoy?" y están bien para cartera, donde se mira una
// fila y se decide a quién llamar. Acá la pregunta es otra —"¿qué le pasó a
// este equipo?"— y en una sola línea de chips no entraba: el nombre del
// equipo repetido, las fechas encadenadas con flechas y los días vencidos
// sueltos al final contaban la historia sin decir CUÁNDO pasó cada cosa.
//
// Los hechos los arma `historialEquipo` (facturaPresentacion.js). Acá solo se
// pintan: qué color y qué ícono le toca a cada tono.
import PropTypes from "prop-types";
import { alpha } from "@mui/material/styles";
import { Box, Stack, Typography, useTheme } from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import AssignmentReturnIcon from "@mui/icons-material/AssignmentReturn";
import {
  ESTADO_EQUIPO_INFO,
  COLOR_ENTREGA_INDEFINIDA,
  historialEquipo,
} from "./facturaUtils";
import { formatearMonedaOVacio as formatearMoneda } from "../../Utils/formato";

// La fecha de la columna izquierda: "09 SEP" y el año debajo. Se parte el
// texto del ISO en vez de armar un Date — con Date, un "2026-09-09" se lee
// como medianoche UTC y en Colombia muestra el día anterior.
const MESES = [
  "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
  "JUL", "AGO", "SEP", "OCT", "NOV", "DIC",
];

const partirFecha = (iso) => {
  const [anio, mes, dia] = String(iso ?? "").split("-");
  if (!anio || !mes || !dia) return null;
  return { dia: `${dia} ${MESES[Number(mes) - 1] ?? ""}`, anio };
};

// El ícono de cada hito: dice de qué se trata sin leer.
const ICONOS = {
  salida: LocalShippingIcon,
  pendiente: HourglassTopIcon,
  vencido: EventBusyIcon,
  acordado: ChatBubbleIcon,
  indefinida: ChatBubbleIcon,
  devuelto: AssignmentReturnIcon,
  activo: EventAvailableIcon,
  ampliacion: EventAvailableIcon,
};

export default function HistorialEquipo({ equipo, hoy }) {
  const theme = useTheme();
  const hitos = historialEquipo(equipo, hoy);

  // El color de cada tono sale del tema, igual que el resto de la ficha: un
  // hito vencido se ve del mismo rojo que el estado "Vencido" de la fila.
  //
  // Y la entrega indefinida usa el rojo del vencimiento, no un color propio:
  // el equipo está vencido igual, solo que con permiso. Lo único que cambia
  // es el nombre del hito. Su teal se reserva para el momento en que se
  // acordó, que es el mismo color con que lo agrupa cartera.
  const colorDeTono = (tono) => {
    if (tono === "salida") return theme.palette.success.main;
    if (tono === "acordado") return theme.palette.custom.estadoEquipo.ampliacion;
    if (tono === "indefinida") return COLOR_ENTREGA_INDEFINIDA;
    return (
      theme.palette.custom.estadoEquipo[tono] ?? theme.palette.custom.estadoNeutro
    );
  };

  // Las tres plantas de la plata, las mismas que usan las cifras de la
  // tarjeta: lo del despacho en el color del texto, lo que se pactó después
  // en el acento y lo que corre solo, sin acuerdo, en rojo.
  const colorDeValor = (valorTono) => {
    if (valorTono === "acordado") return theme.palette.custom.accent;
    if (valorTono === "vencido") return theme.palette.error.main;
    return undefined;
  };

  const etiquetaChip = (chip) =>
    chip === "indefinida"
      ? "Entrega indefinida"
      : (ESTADO_EQUIPO_INFO[chip]?.label ?? "");

  return (
    <Box sx={{ mt: 1 }}>
      {hitos.map((hito, indice) => {
        const fecha = partirFecha(hito.fecha);
        const color = colorDeTono(hito.tono);
        const Icono = ICONOS[hito.tono] ?? EventAvailableIcon;
        const ultimo = indice === hitos.length - 1;
        const colorChip = hito.chip ? colorDeTono(hito.chip) : null;

        return (
          <Box
            key={hito.clave}
            sx={{
              display: "grid",
              // La fecha, el riel, lo que pasó y lo que costó. El riel mide lo
              // que mide su punto: la línea que une los hitos corre por su
              // centro.
              gridTemplateColumns: "auto 24px 1fr auto",
              columnGap: 1,
              alignItems: "start",
            }}
          >
            <Box sx={{ textAlign: "right", pt: 0.1 }}>
              <Typography
                variant="caption"
                sx={{ display: "block", fontWeight: 700, lineHeight: 1.2 }}
              >
                {fecha?.dia ?? ""}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", fontSize: "0.65rem", lineHeight: 1.2 }}
              >
                {fecha?.anio ?? ""}
              </Typography>
            </Box>

            {/* El riel. El último hito no lleva línea: no hay nada después que
                atar, y colgando terminaba en el aire. */}
            <Stack alignItems="center" sx={{ alignSelf: "stretch" }}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  bgcolor: color,
                  color: theme.palette.getContrastText(color),
                  flexShrink: 0,
                }}
              >
                <Icono sx={{ fontSize: "0.85rem" }} />
              </Box>
              {!ultimo && (
                <Box
                  sx={{
                    width: "2px",
                    flex: 1,
                    minHeight: 8,
                    my: 0.25,
                    bgcolor: "divider",
                  }}
                />
              )}
            </Stack>

            <Box sx={{ minWidth: 0, pb: ultimo ? 0 : 1.25 }}>
              <Typography variant="body2" fontWeight="bold">
                {hito.titulo}
              </Typography>
              {/* Hay hitos que no necesitan explicación: el título ya lo
                  dice todo, y un renglón vacío debajo separaría los hitos sin
                  agregar nada. */}
              {hito.detalle && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  {hito.detalle}
                </Typography>
              )}
            </Box>

            <Box sx={{ textAlign: "right", whiteSpace: "nowrap" }}>
              {hito.valor != null && (
                <Typography
                  variant="body2"
                  fontWeight="bold"
                  sx={{ color: colorDeValor(hito.valorTono) }}
                >
                  {formatearMoneda(hito.valor)}
                </Typography>
              )}
              {/* El mismo rótulo cuadrado del estado de la fila, no un chip
                  redondeado: en esta pantalla los estados de equipo se ven
                  así, y dos formas para la misma idea se leen como dos cosas
                  distintas. */}
              {hito.chip && (
                <Box
                  component="span"
                  sx={{
                    display: "inline-block",
                    px: 0.75,
                    py: 0.15,
                    borderRadius: 0.5,
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    border: "1px solid",
                    borderColor: colorChip,
                    bgcolor: alpha(colorChip, 0.12),
                    color: colorChip,
                  }}
                >
                  {etiquetaChip(hito.chip)}
                </Box>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

HistorialEquipo.propTypes = {
  equipo: PropTypes.object.isRequired,
  // La fecha de hoy, para que la prueba no dependa del reloj.
  hoy: PropTypes.string,
};
