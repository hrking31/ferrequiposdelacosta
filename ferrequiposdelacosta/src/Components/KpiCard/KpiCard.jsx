import { cloneElement } from "react";
import PropTypes from "prop-types";
import { Box, ButtonBase, Paper, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

// Tarjeta resumen del panel de KPIs: ícono con tinte del color, número
// grande y subtítulo. Sin botón "Ver detalle" (a pedido, no lo trae).
//
// El borde de color y el resplandor van FIJOS, no en el hover: estas tarjetas
// casi nunca se pulsan —solo informan— y reaccionar al mouse las hacía parecer
// botones. Se quedan con el aspecto que antes solo se veía al pasar por
// encima, que además es el que mejor las separa del fondo.
//
// La que trae `onClick` sí se toca (2026-10-20: "Equipos activos" abre su
// detalle por equipo). Se ve igual que las demás; solo cambia el cursor.
//
// La usan el menú y Seguimiento, para que los mismos números se vean igual en
// las dos pantallas. En Seguimiento va `compacto`: dos de lado en una columna
// de 420px, así que el ícono y la cifra se achican y la tarjeta mide lo que
// ocupa en vez de guardar la proporción del menú.
export default function KpiCard({
  icono,
  etiqueta,
  valor,
  subtitulo,
  color,
  tamanoValor = "h1",
  compacto = false,
  onClick,
}) {
  const tamanoIcono = compacto ? 40 : 72;

  return (
    <Paper
      elevation={0}
      {...(onClick && { component: ButtonBase, onClick })}
      sx={{
        textAlign: "left",
        color: "text.primary",
        flex: 1,
        minWidth: 0,
        maxWidth: 320,
        ...(compacto ? {} : { aspectRatio: "2" }),
        p: compacto ? 1.5 : 2.5,
        borderRadius: 3,
        border: "1px solid",
        borderColor: color,
        boxShadow: `0 0 16px ${alpha(color, 0.35)}`,
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: compacto ? 1 : 1.5,
      }}
    >
      <Box
        sx={{
          width: tamanoIcono,
          height: tamanoIcono,
          borderRadius: "50%",
          bgcolor: alpha(color, 0.12),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {cloneElement(icono, { sx: { color, fontSize: compacto ? 22 : 36 } })}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant={compacto ? "caption" : "subtitle1"}
          sx={{ color, fontWeight: 700, letterSpacing: 0.3, display: "block" }}
        >
          {etiqueta}
        </Typography>
        <Typography
          variant={compacto ? "h6" : tamanoValor}
          fontWeight="bold"
          sx={{ mt: compacto ? 0.25 : 1.5, mb: compacto ? 0.25 : 1.5 }}
        >
          {valor}
        </Typography>
        <Typography variant={compacto ? "caption" : "body2"} color="text.secondary">
          {subtitulo}
        </Typography>
      </Box>
    </Paper>
  );
}

KpiCard.propTypes = {
  icono: PropTypes.element.isRequired,
  etiqueta: PropTypes.string.isRequired,
  valor: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  subtitulo: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
  tamanoValor: PropTypes.string,
  compacto: PropTypes.bool,
  onClick: PropTypes.func,
};
