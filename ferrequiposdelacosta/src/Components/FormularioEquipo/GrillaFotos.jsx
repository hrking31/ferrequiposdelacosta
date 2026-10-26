import PropTypes from "prop-types";
import { Box } from "@mui/material";
import TarjetaMuestra from "./TarjetaMuestra";
import { grillaDeFotos, vaciosDespuesDe } from "./piezasFormulario";

// Cuántas se pintan de relleno: más de las que entran en cualquier pantalla.
const CUADROS_DE_RELLENO = 12;

// LAS TARJETAS DE LAS FOTOS (`children`), una o dos por fila, y después de la
// última, tarjetas de muestra: una para la siguiente y, de a dos por fila, las
// que completen la fila (pedido del dueño, 2026-10-26).
//
// En el computador (`llenar`), además:
// - con muchas fotos se desplaza SOLO este recuadro, no la pantalla entera
//   (pedido del dueño, 2026-10-26);
// - lo que sobra debajo se llena con tarjetas de muestra FIJAS que van
//   flotando (posición absoluta): no agrandan nada y las que no entran se
//   cortan. Nada se mide: medir la pantalla para contar cuántas entraban
//   entraba en bucle.
export default function GrillaFotos({ porFila, cantidad, color, llenar = false, children }) {
  const grilla = (
    <Box sx={{ ...grillaDeFotos(porFila), flexShrink: 0 }}>
      {children}
      {Array.from({ length: vaciosDespuesDe(cantidad, porFila) }, (_, i) => (
        <TarjetaMuestra key={`vacio-${i}`} color={color} />
      ))}
    </Box>
  );

  if (!llenar) return <Box sx={{ mt: 1.5 }}>{grilla}</Box>;

  return (
    <Box
      sx={{
        flex: "1 1 0px",
        minHeight: 0,
        mt: 1.5,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      {grilla}
      <Box sx={{ flex: "1 1 0px", minHeight: 0, position: "relative", overflow: "hidden" }}>
        <Box sx={{ ...grillaDeFotos(porFila), position: "absolute", top: 0, left: 0, right: 0 }}>
          {Array.from({ length: CUADROS_DE_RELLENO }, (_, i) => (
            <TarjetaMuestra key={i} color={color} />
          ))}
        </Box>
      </Box>
    </Box>
  );
}

GrillaFotos.propTypes = {
  porFila: PropTypes.oneOf([1, 2]).isRequired,
  // Cuántas fotos hay (para saber cuántas tarjetas de muestra van después).
  cantidad: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
  llenar: PropTypes.bool,
  children: PropTypes.node,
};
