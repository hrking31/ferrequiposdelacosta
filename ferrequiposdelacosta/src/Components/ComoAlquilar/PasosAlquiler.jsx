import PropTypes from "prop-types";
import { Box, Typography } from "@mui/material";
import { keyframes } from "@mui/system";

// LA OLA EN CADENA (pedido del dueño, 2026-11-06): el 1, después el 2 y
// después el 3 crecen un poco y sueltan un anillo, como señalando el camino;
// luego una pausa y vuelta a empezar. Solo transform y opacity, como las
// demás animaciones que no paran (ver ButtonContacto): no repintan.
const VUELTA = "4.2s";
const ENTRE_PASOS = 0.45; // segundos entre un número y el siguiente

const latido = keyframes`
  0%, 14%, 100% { transform: scale(1); }
  6% { transform: scale(1.22); }
`;

const onda = keyframes`
  0% { transform: scale(1); opacity: 0.55; }
  16% { transform: scale(1.9); opacity: 0; }
  100% { transform: scale(1.9); opacity: 0; }
`;

// LOS TRES PASOS PARA ALQUILAR (pedido del dueño, 2026-11-06). Responden la
// duda que dejaba "Mi cuenta": alquilar no pide cuenta. Van a la vista en el
// menú lateral del celular y en la columna de la tienda en el computador: un
// solo lugar para sus textos.
const PASOS = [
  {
    titulo: "Elige equipos y días",
    detalle: "Agrégalos al camión desde el catálogo.",
  },
  {
    titulo: "Envía tu solicitud",
    detalle: "Sin cuenta ni registro: solo tus datos de contacto.",
  },
  {
    titulo: "Te escribimos",
    detalle: "Por WhatsApp, con el precio y la entrega.",
  },
];

// `denso`: más apretado, para la columna angosta del computador.
export default function PasosAlquiler({ denso = false }) {
  const lado = denso ? 26 : 30;
  return (
    <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: denso ? 1.5 : 2 }}>
      {PASOS.map(({ titulo, detalle }, i) => (
        <Box component="li" key={titulo} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
          <Box
            aria-hidden="true"
            sx={(theme) => ({
              position: "relative",
              flexShrink: 0,
              width: lado,
              height: lado,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              fontWeight: 700,
              fontSize: denso ? "0.85rem" : undefined,
              bgcolor: theme.palette.custom.accent,
              color: theme.palette.getContrastText(theme.palette.custom.accent),
              animation: `${latido} ${VUELTA} ease-out ${i * ENTRE_PASOS}s infinite`,
              // El anillo que se abre y se desvanece.
              "&::after": {
                content: '""',
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: `2px solid ${theme.palette.custom.accent}`,
                opacity: 0,
                animation: `${onda} ${VUELTA} ease-out ${i * ENTRE_PASOS}s infinite`,
              },
              "@media (prefers-reduced-motion: reduce)": {
                animation: "none",
                "&::after": { animation: "none" },
              },
            })}
          >
            {i + 1}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant={denso ? "subtitle2" : "subtitle1"}
              component="p"
              sx={{ fontWeight: 700, lineHeight: 1.3 }}
            >
              {titulo}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {detalle}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

PasosAlquiler.propTypes = {
  denso: PropTypes.bool,
};
