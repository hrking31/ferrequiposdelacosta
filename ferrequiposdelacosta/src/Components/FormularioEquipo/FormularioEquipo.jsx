import PropTypes from "prop-types";
import { Box, Grid, Stack } from "@mui/material";

// EL FORMULARIO DE UN EQUIPO, armado (crear y editar):
// - `anchoCompleto`: con lugar (ver las vistas), ocupa todo el ancho que le
//   queda, en dos columnas al alto de la pantalla: todo lo que es texto a la
//   izquierda y las fotos a la derecha (pedido del dueño, 2026-10-26).
//   Si el contenido no cabe —muchas fotos—, crece y se desplaza.
// - Con una sola foto por fila, el texto se lleva dos tercios del ancho y las
//   fotos uno: una foto sola no necesita media pantalla.
// - `idFormulario`: los botones del encabezado o del pie envían y limpian el
//   formulario desde afuera (atributo `form`); limpiar es de tipo "reset".
export default function FormularioEquipo({
  idFormulario,
  onSubmit,
  onReset,
  anchoCompleto = false,
  porFila,
  texto,
  fotos,
  children,
}) {
  const anchoTexto = porFila === 1 ? 8 : 6;

  return (
    <form
      id={idFormulario}
      onSubmit={onSubmit}
      onReset={(e) => {
        e.preventDefault();
        onReset();
      }}
      style={anchoCompleto ? { minHeight: "100%", display: "flex" } : undefined}
    >
      <Box
        sx={{
          width: { xs: "100%", md: anchoCompleto ? "100%" : "80%" },
          mx: "auto",
          // Relleno y no margen arriba: un margen sumado al alto completo
          // sacaba una barra de desplazamiento por 8px.
          pt: 1,
          boxSizing: "border-box",
          mb: anchoCompleto ? 0 : 2,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Grid container spacing={2} sx={{ flex: 1 }}>
          <Grid item xs={12} md={anchoCompleto ? anchoTexto : 12} sx={{ display: "flex" }}>
            <Stack spacing={2} sx={{ flex: 1 }}>
              {texto}
            </Stack>
          </Grid>
          <Grid item xs={12} md={anchoCompleto ? 12 - anchoTexto : 12} sx={{ display: "flex" }}>
            <Stack spacing={2} sx={{ flex: 1 }}>
              {fotos}
            </Stack>
          </Grid>
        </Grid>
      </Box>
      {children}
    </form>
  );
}

FormularioEquipo.propTypes = {
  idFormulario: PropTypes.string.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  anchoCompleto: PropTypes.bool,
  porFila: PropTypes.oneOf([1, 2]).isRequired,
  // Las secciones de texto (columna izquierda) y la de fotos (derecha).
  texto: PropTypes.node.isRequired,
  fotos: PropTypes.node.isRequired,
  children: PropTypes.node,
};
