import { cloneElement } from "react";
import PropTypes from "prop-types";
import { Box, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

// LO QUE MUESTRA EL RECUADRO CUANDO NO HAY NADA ELEGIDO (2026-10-22), para
// que nunca esté en blanco: unas secciones cortas, cada una con su título y
// sus renglones. Las arma cada pantalla con lo que ya tiene cargado (ver
// Utils/resumenLista).
//
// CON COLOR (pedido del dueño, 2026-10-23: "está simple, sin color, sin
// iconos, todo blanco"). Cada sección trae su ícono y su color, y una de tres
// formas:
// - "cifras": cuadritos con el número grande (Hoy / Esta semana).
// - "ranking": puesto, nombre y una barra que mide cada uno contra el primero.
// - "lista" (la de siempre): renglones de "nombre ··· dato" sobre fondo suave.

export function TituloSeccion({ titulo, icono, color }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          bgcolor: alpha(color, 0.15),
          flexShrink: 0,
        }}
      >
        {cloneElement(icono, { sx: { fontSize: 17, color } })}
      </Box>
      <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.6, color }}>
        {titulo}
      </Typography>
    </Stack>
  );
}

TituloSeccion.propTypes = {
  titulo: PropTypes.string.isRequired,
  icono: PropTypes.element.isRequired,
  color: PropTypes.string.isRequired,
};

function Cifras({ filas, color }) {
  return (
    <Stack direction="row" spacing={1.5}>
      {filas.map(({ clave, izquierda, derecha }) => (
        <Box
          key={clave}
          sx={{
            flex: 1,
            minWidth: 0,
            py: 1.5,
            px: 1,
            textAlign: "center",
            borderRadius: 2,
            border: "1px solid",
            borderColor: alpha(color, 0.35),
            bgcolor: alpha(color, 0.08),
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.1, color }}>
            {derecha}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {izquierda}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}

function Ranking({ filas, color }) {
  const mayor = Math.max(1, ...filas.map(({ derecha }) => Number(derecha) || 0));
  return (
    <Stack spacing={2}>
      {filas.map(({ clave, izquierda, derecha }, indice) => (
        <Stack key={clave} direction="row" alignItems="center" spacing={1.25}>
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
              fontSize: 12,
              fontWeight: 700,
              // El primero relleno de su color; los demás, solo el tinte.
              bgcolor: indice === 0 ? color : alpha(color, 0.15),
              color: indice === 0 ? "common.white" : color,
            }}
          >
            {indice + 1}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
              <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
                {izquierda}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, flexShrink: 0, color }}>
                {derecha}
              </Typography>
            </Stack>
            <Box sx={{ mt: 0.5, height: 6, borderRadius: 3, bgcolor: alpha(color, 0.12) }}>
              <Box
                sx={{
                  height: "100%",
                  borderRadius: 3,
                  width: `${((Number(derecha) || 0) / mayor) * 100}%`,
                  bgcolor: color,
                }}
              />
            </Box>
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}

function Lista({ filas, color: colorSeccion }) {
  return (
    <Stack spacing={1.25}>
      {/* Cada renglón puede traer su propio color (los pagos por estado de
          factura); si no, va el de la sección. */}
      {filas.map(({ clave, izquierda, derecha, color = colorSeccion }) => (
        <Stack
          key={clave}
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
          sx={{
            py: 1,
            px: 1.5,
            borderRadius: 1.5,
            bgcolor: alpha(color, 0.07),
            borderLeft: "3px solid",
            borderLeftColor: color,
          }}
        >
          <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
            {izquierda}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, flexShrink: 0, color }}>
            {derecha}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

const FORMAS = { cifras: Cifras, ranking: Ranking, lista: Lista };

export default function ResumenLista({ secciones, justificado = true }) {
  return (
    // Con aire entre secciones y entre renglones: el recuadro ocupa todo el alto
    // de la columna y apretado arriba quedaba medio vacío abajo (pedido del
    // dueño, dos veces, 2026-10-23). Y JUSTIFICADO a lo alto: la primera
    // sección arriba, la última abajo y lo que sobra repartido entre ellas.
    // El `spacing` es solo el mínimo y va chico a propósito: con uno grande el
    // contenido no cabía y salía la barra de desplazamiento, que el dueño no
    // quiere.
    //
    // Con `justificado={false}` van una debajo de otra, con su aire fijo: con
    // pocas secciones, repartidas, la última quedaba sola al fondo.
    <Stack
      spacing={justificado ? 2 : 6}
      sx={{ flex: 1, justifyContent: justificado ? "space-between" : "flex-start", mt: 2, px: 1 }}
    >
      {secciones.map(({ titulo, icono, color, forma = "lista", filas, vacio }) => {
        const Forma = FORMAS[forma];
        return (
          <Box key={titulo}>
            <TituloSeccion titulo={titulo} icono={icono} color={color} />
            {filas.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 1, px: 1.5 }}>
                {vacio}
              </Typography>
            ) : (
              <Forma filas={filas} color={color} />
            )}
          </Box>
        );
      })}
    </Stack>
  );
}

const filasPropTypes = PropTypes.arrayOf(
  PropTypes.shape({
    clave: PropTypes.string.isRequired,
    izquierda: PropTypes.node.isRequired,
    derecha: PropTypes.node.isRequired,
    // Solo en la forma "lista": el color de ese renglón.
    color: PropTypes.string,
  }),
).isRequired;

Cifras.propTypes = { filas: filasPropTypes, color: PropTypes.string.isRequired };
Ranking.propTypes = { filas: filasPropTypes, color: PropTypes.string.isRequired };
Lista.propTypes = { filas: filasPropTypes, color: PropTypes.string.isRequired };

ResumenLista.propTypes = {
  // Repartir las secciones a lo alto del recuadro (sí, salvo que se diga).
  justificado: PropTypes.bool,
  secciones: PropTypes.arrayOf(
    PropTypes.shape({
      titulo: PropTypes.string.isRequired,
      icono: PropTypes.element.isRequired,
      color: PropTypes.string.isRequired,
      forma: PropTypes.oneOf(["cifras", "ranking", "lista"]),
      filas: filasPropTypes,
      // Lo que dice si la sección no tiene renglones.
      vacio: PropTypes.string.isRequired,
    }),
  ).isRequired,
};
