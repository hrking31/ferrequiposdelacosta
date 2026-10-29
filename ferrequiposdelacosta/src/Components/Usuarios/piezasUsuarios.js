// EL COLOR DE CADA RECUADRO de la pantalla de Usuarios: los mismos de Equipos
// (ver FormularioEquipo/piezasFormulario), para que se vean de la misma
// familia. Datos en azul, el rol en naranja, lo de entrar (sesiones y
// contraseña) en verde y la muestra en el acento.
export const coloresDeUsuarios = (theme) => ({
  datos: theme.palette.info.main,
  rol: theme.palette.warning.main,
  sesiones: theme.palette.success.main,
  clave: theme.palette.success.main,
  muestra: theme.palette.custom.accent,
});
