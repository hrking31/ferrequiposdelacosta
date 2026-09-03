// EL PLAZO DE UN EQUIPO, dicho en una línea. Abre la fila de cada equipo en
// los DOS diálogos de Seguimiento: el de ampliar el vencimiento y el de
// registrar la devolución.
//
// Es un componente y no dos textos sueltos porque la regla es una sola, y
// cuando cada diálogo armaba lo suyo terminaban diciendo cosas distintas del
// mismo equipo.
//
// ── La regla ──
//
// Siempre se muestra la fecha del ÚLTIMO acuerdo, no la del primero. Y si esa
// fecha ya pasó, al lado van los días que el equipo lleva afuera desde
// entonces:
//
//   Venció el 30/08 y hoy es 30/08     →  Vence: 30/08/2026
//   Pasaron 2 días y nadie pactó nada  →  Vence: 30/08/2026 - 2 días vencidos
//   El 30/08 se le dieron 4 días más   →  Vence: 03/09/2026
//   Y se pasó un día de esos           →  Vence: 03/09/2026 - 1 día vencido
//
// Sin los días hay que restar de cabeza contra el día de hoy para saber de qué
// tamaño es el atraso, que es justo lo que hace falta saber al recibir el
// equipo o al pactar el plazo nuevo.
//
// Los días salen del mismo cálculo que los COBRA (calcularAmpliacionEquipo),
// así que el diálogo no puede decir un número distinto del que termina en la
// cuenta del cliente.
import PropTypes from "prop-types";
import { Box, Typography } from "@mui/material";
import { calcularAmpliacionEquipo } from "../ClienteDetalle/facturaUtils";
import { formatearFechaLegible } from "../../Utils/formato";

const PlazoEquipo = ({ equipo, hoy }) => {
  const diasVencidos = calcularAmpliacionEquipo(
    equipo,
    ...(hoy ? [hoy] : []),
  ).diasAbiertos;

  return (
    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
      {equipo?.vencimientoIndefinido
        ? "Entrega indefinida actualmente"
        : `Vence: ${formatearFechaLegible(equipo?.fechaVencimiento)}`}
      {diasVencidos > 0 && (
        <Box component="span" sx={{ color: "error.main", fontWeight: 600 }}>
          {" "}
          - {diasVencidos} día{diasVencidos === 1 ? "" : "s"} vencido
          {diasVencidos === 1 ? "" : "s"}
        </Box>
      )}
    </Typography>
  );
};

PlazoEquipo.propTypes = {
  equipo: PropTypes.object.isRequired,
  // La fecha de hoy en Colombia (AAAA-MM-DD). Sin ella el cálculo la resuelve
  // solo; se pasa cuando la pantalla ya la tiene y no conviene recalcularla
  // por cada equipo.
  hoy: PropTypes.string,
};

export default PlazoEquipo;
