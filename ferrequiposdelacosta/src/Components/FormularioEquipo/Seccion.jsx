import PropTypes from "prop-types";
import { Box, Tooltip, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { keyframes } from "@mui/system";
import { TituloSeccion } from "../PanelLista/ResumenLista";

// El punto de "cambios sin guardar" palpita para que se note (pedido del
// dueño, 2026-10-26): crece un poco y vuelve.
const palpitar = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.5); opacity: 0.55; }
`;

// UNA SECCIÓN DEL FORMULARIO DE UN EQUIPO (2026-10-26, pedido del dueño: "más
// creativo"): el mismo recuadro y el mismo título con ícono de color de la
// columna de estadísticas (ver PanelDocumentos y ResumenLista), para que las
// pantallas se vean de la misma familia.
//
// `crece`: en el computador se reparte con las demás que crecen el alto que
// sobra en su columna, y su contenido se estira con ella. Sin eso mide lo que
// ocupa.
//
// `encoge`: mide lo que ocupa pero, si en su columna no cabe, se achica y su
// contenido decide qué se desplaza adentro (las sesiones de la ficha de un
// usuario: así la pantalla no se desplaza, pedido del dueño, 2026-10-28).
//
// `cambiado`: al editar, un punto del color de la sección junto al título
// avisa que tiene cambios sin guardar.
export default function Seccion({ titulo, icono, color, crece = false, encoge = false, cambiado = false, children }) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        flex: crece ? "1 1 0" : encoge ? "0 1 auto" : "0 0 auto",
        ...(encoge && { minHeight: 0 }),
        display: "flex",
        flexDirection: "column",
        // 16px: con más, las tres de texto no entraban al alto de la pantalla
        // y salía la barra para desplazar (pedido del dueño, 2026-10-26).
        p: 2,
        // El recuadro de toda la app (theme.recuadro).
        ...theme.recuadro(color),
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
        <TituloSeccion titulo={titulo} icono={icono} color={color} />
        {cambiado && (
          <Tooltip title="Cambios sin guardar">
            <Box
              role="status"
              aria-label="Cambios sin guardar"
              sx={{
                width: 9,
                height: 9,
                mt: "10px",
                borderRadius: "50%",
                bgcolor: color,
                boxShadow: `0 0 0 3px ${alpha(color, 0.2)}`,
                animation: `${palpitar} 1.4s ease-in-out infinite`,
              }}
            />
          </Tooltip>
        )}
      </Box>
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {children}
      </Box>
    </Box>
  );
}

Seccion.propTypes = {
  titulo: PropTypes.string.isRequired,
  icono: PropTypes.element.isRequired,
  color: PropTypes.string.isRequired,
  crece: PropTypes.bool,
  encoge: PropTypes.bool,
  cambiado: PropTypes.bool,
  children: PropTypes.node,
};
