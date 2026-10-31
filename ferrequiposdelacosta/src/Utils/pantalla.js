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
