// ¿ESTAMOS EN UN CELULAR? Toda la app lo decidía por el ancho: 915px o menos.
// Pero un teléfono ACOSTADO mide más que eso —los grandes llegan a 932— y la
// app pasaba a la forma de computador con 430px de alto: el pie con los
// botones desaparecía (en computador esos botones viven dentro de la tarjeta),
// el encabezado se llevaba el aire de escritorio y a la lista no le quedaba
// nada. Girar el teléfono no lo convierte en un computador.
//
// Así que la pregunta va por los dos lados: angosta O baja. El tema ya lo
// preguntaba así en los diálogos (ver ThemeProvider), esto es lo mismo para el
// resto de la pantalla.
//
// 500px de alto es el teléfono acostado y nada más: un portátil chico anda por
// los 650 y no tiene por qué cambiar de forma.
import { useMediaQuery } from "@mui/material";

const PANTALLA_BAJA = "(max-height:500px)";
const PANTALLA_COMPACTA = `(max-width:915px), ${PANTALLA_BAJA}`;

export const usePantallaCompacta = () => useMediaQuery(PANTALLA_COMPACTA);

// La misma pregunta como clave de `sx`, para las piezas que son funciones y
// no componentes —no pueden llamar al hook—: { [EN_COMPACTA]: {...} }.
export const EN_COMPACTA = `@media ${PANTALLA_COMPACTA}`;

// Solo el alto, para lo que cambia por falta de espacio vertical y no por
// ancho: qué queda fijo en pantalla y qué se desplaza.
export const usePantallaBaja = () => useMediaQuery(PANTALLA_BAJA);

// LA COLUMNA DE BOTONES del celular acostado (pedido del dueño, 2026-10-30): se
// corre a la izquierda lo que mide el relleno del botón (10px) para que el
// ícono quede alineado con el borde del encabezado y no lejos del borde.
export const ALINEAR_CON_EL_BORDE = "-10px";

// LAS FORMAS DE LAS PANTALLAS CON HOJA DE MUESTRA: la cuenta de cobro y la
// cotización (pedido del dueño, 2026-11-05). Van por el tamaño de la ventana,
// igual en el computador y en la tableta:
// - Hasta 915, el celular; de 916 a 1461, igual que el celular: el formulario
//   y debajo la hoja, con un solo desplazamiento.
// - Desde 1462, LADO A LADO, cada uno con su propio desplazamiento, para ir
//   escribiendo y viendo la hoja. La hoja nunca baja del ancho de una hoja
//   carta y el formulario se queda con el resto; 1462 es donde al formulario
//   le quedan 550. Cuando la mitad pasa de una hoja carta (desde 1728), van
//   mitad y mitad. La hoja llega hasta el borde de abajo, con el pie al fondo.
// - La excepción, el iPad DE PIE: pantalla claramente alargada (5/6 o más; no
//   4/5, para que entre el de 12,9" en Safari con sus barras, ≈1024 × 1256).
//   Los datos y los ítems arriba, lado a lado, las dos pizarras debajo y la
//   hoja abajo de todo.
//
// Recibe si la pantalla ya va como celular, que cada vista decide a su modo.
export const useFormaConHoja = (comoCelular) => {
  const alargada = useMediaQuery("(max-aspect-ratio: 5/6)");
  const caben = useMediaQuery("(min-width:1462px)");
  const dePie = alargada && !comoCelular;
  return { dePie, ladoALado: caben && !dePie && !comoCelular };
};

// La columna de la hoja lado a lado: el ancho de una hoja carta en pantalla
// (8,5 pulgadas a 96 px) como mínimo; la mitad cuando es más. Los 16 px son el
// espacio entre las dos columnas.
export const SX_COLUMNA_HOJA = {
  flex: "0 0 max(816px, calc((100% - 16px) / 2))",
  minWidth: 0,
  minHeight: 0,
  display: "flex",
};

// La fecha del iPad de pie: lo justo para "dd/mm/aaaa" y el ícono del
// calendario.
const ANCHO_FECHA = 170;

// EL PRIMER RENGLÓN de esos formularios: Persona, Empresa, IVA y la fecha
// (pedido del dueño, 2026-11-05). Las medidas de cada pieza según la forma:
// - Lado a lado, el formulario va en tres columnas: la fecha ocupa una y
//   Persona, Empresa e IVA se reparten parejo las otras dos.
// - De pie, las tres opciones juntas y la fecha con su ancho justo.
// - En lo demás, mitad y mitad, como siempre.
// Lado a lado y de pie las casillas van más chicas, y cada opción se corre
// 6 px y no los 11 de fábrica: con la columna que se desplaza sola, el círculo
// de "Persona" quedaba cortado por el borde izquierdo.
export const medidasPrimerRenglon = ({ ladoALado, dePie }) => {
  const chicas = ladoALado || dePie;
  return {
    smOpciones: ladoALado ? 8 : dePie ? true : 6,
    smFecha: ladoALado ? 4 : dePie ? "auto" : 6,
    sxFecha: dePie ? { width: { sm: ANCHO_FECHA } } : undefined,
    casilla: chicas ? { size: "small", sx: { p: 0.75 } } : {},
    // Persona y Empresa van juntas en su grupo: lado a lado el grupo vale dos
    // partes y el IVA una, así quedan las tres del mismo ancho.
    sxGrupo: { flex: ladoALado ? 2 : dePie ? "none" : 1 },
    sxOpcion: ladoALado
      ? { flex: 1, alignItems: "center", ml: -0.75, mr: 0 }
      : dePie
        ? { flex: "none", alignItems: "center", ml: -0.75, mr: 1.5 }
        : { flex: 1, alignItems: "center" },
    sxIva: ladoALado ? { flex: 1, ml: -0.75, mr: 0 } : { flexShrink: 0, mr: 0 },
  };
};
