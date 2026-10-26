// LO QUE COMPARTEN CREAR EQUIPO Y EQUIPOS (editar), para que las dos pantallas
// se vean y se comporten igual (pedido del dueño, 2026-10-26).

// El color de cada recuadro del formulario.
export const coloresDelFormulario = (theme) => ({
  datos: theme.palette.info.main,
  variantes: theme.palette.warning.main,
  cotizacion: theme.palette.success.main,
  fotos: theme.palette.custom.accent,
});

// UN CAMPO DE TEXTO QUE LLENA SU RECUADRO (pedido del dueño: "poder ver todo
// lo escrito"): se estira hasta el fondo del recuadro y, si el texto es más
// largo, se desplaza adentro. Todo con flex y base 0: el alto que MUI calcula
// para el texto (va en línea) no cuenta, y con `overflow: auto` el campo puede
// quedar más bajo que su texto. El !important es lo único que le gana al
// `overflow: hidden` que MUI pone en línea.
//
// `lineas`: lo mínimo que muestra aunque la pantalla sea baja (1.4375em es el
// alto de renglón de los campos de MUI).
export const llenarRecuadro = (lineas) => ({
  flex: "1 1 0px",
  "& .MuiInputBase-root": { flex: "1 1 0px", flexDirection: "column", alignItems: "stretch" },
  // El otro textarea es la copia escondida con que MUI mide: no se toca.
  "& textarea:not([aria-hidden])": {
    flex: "1 1 0px",
    minHeight: `${lineas * 1.4375}em`,
    overflow: "auto !important",
  },
});

// Dónde va la foto en su tarjeta: siempre con su proporción de 4 a 3. Estirada
// al alto de la fila quedaba ancha y baja (pedido del dueño, 2026-10-26).
export const lugarDeLaFoto = { position: "relative", aspectRatio: "4 / 3" };

// El alto de la franja del organizador (◀ 🗑 ▶) bajo cada foto, igual en la
// tarjeta de muestra para que todas midan lo mismo.
export const ALTO_FRANJA = 36;

// Las tarjetas de las fotos, una o dos por fila.
export const grillaDeFotos = (porFila) => ({
  display: "grid",
  gridTemplateColumns: `repeat(${porFila}, minmax(0, 1fr))`,
  gap: 1.5,
});

// Después de las fotos, una tarjeta vacía para la siguiente; de a dos por
// fila, las que completen la última.
export const vaciosDespuesDe = (cantidad, porFila) =>
  Math.ceil((cantidad + 1) / porFila) * porFila - cantidad;
