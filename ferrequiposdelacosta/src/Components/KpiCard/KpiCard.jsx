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
//
// `mediano`: la MISMA tarjeta del menú, más chica (pedido del dueño,
// 2026-10-29), para la columna de indicadores del computador angosto, donde
// cinco de tamaño completo no caben al alto de los botones: el círculo, la
// cifra y los rellenos bajan, sin la proporción fija; lo demás igual.
// `ancha`: con la mediana, para las dos anchas de la pantalla de pie, donde
// sobra lugar (pedido del dueño, 2026-10-29): el círculo de la grande, el
// nombre más grande y más aire entre el nombre, la cifra y el subtítulo.
export default function KpiCard({
  icono,
  etiqueta,
  valor,
  subtitulo,
  color,
  tamanoValor = "h1",
  compacto = false,
  mediano = false,
  ancha = false,
  onClick,
}) {
  const tamanoIcono = compacto ? 40 : mediano && !ancha ? 52 : 72;
  // El aire arriba y abajo de la cifra.
  const aireCifra = compacto || (mediano && !ancha) ? 0.25 : ancha ? 1 : 1.5;
  // La misma letra y color de su tamaño, más chica en la mediana. El
  // !important le gana al tamaño que el tema ajusta solo según la pantalla
  // (responsiveFontSizes), que si no la volvía a agrandar.
  const letraMediana = (variante) =>
    mediano ? { fontSize: `${variante === "h1" ? "2.1rem" : "1.4rem"} !important`, lineHeight: 1.15 } : {};

  const contenido = (
    <>
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
        {cloneElement(icono, { sx: { color, fontSize: compacto ? 22 : mediano && !ancha ? 28 : 36 } })}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant={compacto ? "caption" : "subtitle1"}
          sx={{
            color,
            fontWeight: 700,
            letterSpacing: 0.3,
            display: "block",
            ...(ancha && { fontSize: "1.2rem !important", lineHeight: 1.3 }),
          }}
        >
          {etiqueta}
        </Typography>
        {/* LA CIFRA. Con letra más chica que la de las demás (la plata, h4),
            su renglón mide lo mismo que el de una h1: una h1 invisible en la
            misma celda le da el alto, y la cifra va centrada en él. Así el
            subtítulo queda a la altura del de las demás tarjetas (pedido del
            dueño, 2026-10-29). */}
        <Box
          sx={{
            display: "grid",
            alignItems: "center",
            mt: aireCifra,
            mb: aireCifra,
          }}
        >
          {!compacto && tamanoValor !== "h1" && (
            <Typography
              variant="h1"
              fontWeight="bold"
              aria-hidden
              sx={{ ...letraMediana("h1"), gridArea: "1 / 1", visibility: "hidden" }}
            >
              0
            </Typography>
          )}
          <Typography
            variant={compacto ? "h6" : tamanoValor}
            fontWeight="bold"
            sx={{ ...(!compacto && letraMediana(tamanoValor)), gridArea: "1 / 1" }}
          >
            {valor}
          </Typography>
        </Box>
        <Typography variant={compacto ? "caption" : "body2"} color="text.secondary">
          {subtitulo}
        </Typography>
      </Box>
    </>
  );

  return (
    <Paper
      elevation={0}
      {...(onClick && { component: ButtonBase, onClick })}
      sx={{
        textAlign: "left",
        color: "text.primary",
        flex: 1,
        minWidth: 0,
        // La mediana llena su lugar (la columna, la pantalla de pie).
        maxWidth: mediano ? "none" : 320,
        ...(compacto || mediano ? {} : { aspectRatio: "2" }),
        p: compacto ? 1.5 : mediano ? 1.4 : 2.5,
        borderRadius: 3,
        border: "1px solid",
        borderColor: color,
        boxShadow: `0 0 16px ${alpha(color, 0.35)}`,
        display: "flex",
        // La chica, con su contenido centrado a lo alto: estira con la
        // columna y quedaba arriba con el hueco abajo (pedido del dueño,
        // 2026-10-29).
        ...(mediano
          ? { flexDirection: "column", justifyContent: "center" }
          : { flexDirection: "row", alignItems: "flex-start", gap: compacto ? 1 : 1.5 }),
      }}
    >
      {mediano ? (
        // La chica: el ícono a la altura del nombre, como en la grande, y el
        // conjunto centrado a lo alto de la tarjeta.
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.25 }}>{contenido}</Box>
      ) : (
        contenido
      )}
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
  mediano: PropTypes.bool,
  ancha: PropTypes.bool,
  onClick: PropTypes.func,
};
