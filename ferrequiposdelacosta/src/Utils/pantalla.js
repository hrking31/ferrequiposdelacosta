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

export const usePantallaCompacta = () =>
  useMediaQuery(`(max-width:915px), ${PANTALLA_BAJA}`);

// Solo el alto, para lo que cambia por falta de espacio vertical y no por
// ancho: qué queda fijo en pantalla y qué se desplaza.
export const usePantallaBaja = () => useMediaQuery(PANTALLA_BAJA);

// DÓNDE ESTÁ LA BARRA DE NAVEGACIÓN. Hasta 915px de ancho va pegada al borde
// de abajo y hay que dejarle su franja libre; de ahí en adelante va arriba y
// la franja se deja del otro lado. Esta sí es pregunta de ANCHO puro —la barra
// se mueve por ancho— y por eso no comparte el corte de arriba: el teléfono
// acostado pasa de los 915, así que su barra sube aunque todo lo demás de la
// pantalla siga siendo de celular. Contra eso los botones del pie quedaban
// tapados por la barra en un teléfono y el encabezado en el otro.
export const useNavbarAbajo = () => useMediaQuery("(max-width:915px)");
