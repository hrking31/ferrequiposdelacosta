// LA HISTORIA DE FECHAS de una línea de equipo, dibujada. Se usa igual en
// Seguimiento y en Detalle Cliente.
//
// Qué dice cada chip lo decide describirFechasEquipo, y con qué se pinta,
// estiloChipFecha — las dos en facturaPresentacion.js. Acá está el armado: los
// tramos, los cortes entre tramos y las flechas de la cadena.
//
// Que esto sea UN componente y no dos copias no es prolijidad. Cuando cada
// pantalla armaba lo suyo terminaron contando cosas distintas de la misma
// factura, y encima una pintaba de rojo la fecha vigente vencida y la otra la
// dejaba gris, como si todavía tuviera plazo.
//
// ── Por qué van en tramos ──
//
// Los chips salían en una fila plana, todos del mismo peso. "Se venció el 05",
// "se le dieron 2 días" y "quedó para el 07" son tres partes de UNA frase, y
// estaban cortadas en tres fichas sueltas mezcladas con el precio por día. Cada
// una decía la verdad y el conjunto no se entendía.
//
// Agrupados se leen de corrido:
//
//   Salió 03/08 · 3 días · $20.000/día  │  Vencía 05/08 → +2 días · $400.000 →
//   Venció 07/08  │  7 días vencidos · $1.400.000
//
// Una factura al día y sin renovaciones devuelve un solo tramo: el agrupado no
// le agrega nada al caso simple, aparece cuando hay historia que contar.
import { Fragment } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import { useTheme } from "@mui/material/styles";
import {
  agruparChipsFechas,
  describirFechasEquipo,
  estiloChipFecha,
} from "./facturaPresentacion";

// El corte entre tramos: una línea fina de la altura del chip. Alcanza para
// separar sin sumar un componente que haya que leer.
const SeparadorTramo = () => (
  <Box
    aria-hidden
    sx={{
      width: "1px",
      alignSelf: "stretch",
      minHeight: 16,
      bgcolor: "divider",
      mx: 0.5,
      flexShrink: 0,
    }}
  />
);

// La flecha que ata un eslabón con el siguiente dentro del tramo del plazo.
// Es texto, no un ícono: no tiene que competir con los de los chips.
const FlechaCadena = () => (
  <Box
    aria-hidden
    component="span"
    sx={{
      color: "text.secondary",
      fontSize: "0.75rem",
      lineHeight: 1,
      flexShrink: 0,
    }}
  >
    →
  </Box>
);

const ChipsFechasEquipo = ({ equipo, hoy }) => {
  const theme = useTheme();
  const tramos = agruparChipsFechas(describirFechasEquipo(equipo, hoy));

  if (tramos.length === 0) return null;

  return (
    <Stack
      direction="row"
      flexWrap="wrap"
      alignItems="center"
      gap={0.5}
      sx={{ mt: 0.75 }}
    >
      {tramos.map((tramo, indice) => (
        <Fragment key={tramo[0].clave}>
          {indice > 0 && <SeparadorTramo />}
          {tramo.map((chip, posicion) => {
            const { variant, sx } = estiloChipFecha(chip, theme);
            const { clave, label, Icono, enCadena } = chip;
            return (
              <Fragment key={clave}>
                {/* Nunca antes del primero del tramo: una flecha suelta al
                    empezar no ataría nada con nada. */}
                {enCadena && posicion > 0 && <FlechaCadena />}
                <Chip
                  size="small"
                  variant={variant}
                  icon={Icono ? <Icono /> : undefined}
                  sx={sx}
                  label={label}
                />
              </Fragment>
            );
          })}
        </Fragment>
      ))}
    </Stack>
  );
};

ChipsFechasEquipo.propTypes = {
  equipo: PropTypes.object.isRequired,
  // La fecha de hoy en Colombia (AAAA-MM-DD). Seguimiento ya la tiene calculada
  // para toda la tarjeta y la pasa para no repetir la cuenta por cada equipo;
  // sin ella, el cálculo la resuelve solo.
  hoy: PropTypes.string,
};

export default ChipsFechasEquipo;
