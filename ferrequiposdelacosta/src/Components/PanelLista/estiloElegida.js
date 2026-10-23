// LA TARJETA ELEGIDA de la lista (la que se está mirando en la vista previa)
// en el buzón de cotizaciones y en la lista de cuentas de cobro. Pedido del
// dueño, 2026-10-23: con solo el borde de acento no se distinguía, porque al
// pasar el mouse cualquier tarjeta muestra ese mismo borde.
//
// TODO VA POR DENTRO DEL BORDE DE VERDAD. Se probó con `outline` y después con
// un anillo de sombra por fuera, y ninguno calzaba con la esquina redondeada
// de arriba de la tarjeta (lo notó el dueño con una captura). Acá se pinta el
// borde real, que ya es redondeado, y se lo engrosa hacia adentro con una
// sombra sin difuminar, que sigue siempre la curva.
//
// SIN RESPLANDOR: se probaron uno por dentro (el de los recuadros de las
// facturas) y otro por fuera (el de KpiCard), y el dueño quitó los dos.
//
// Va después de los estilos de la tarjeta: reemplaza su "&:hover" entero, así
// que repite lo que aquel tenía.
export const estiloElegida = (color, sombraHover) => {
  const marca = `inset 0 0 0 1px ${color}`;
  return {
    borderColor: color,
    boxShadow: marca,
    "&:hover": {
      transform: "translateY(0)",
      borderColor: color,
      boxShadow: `${marca}, ${sombraHover}`,
    },
  };
};
