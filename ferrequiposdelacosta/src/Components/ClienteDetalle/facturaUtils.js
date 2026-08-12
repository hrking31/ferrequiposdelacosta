// La puerta de entrada a todo lo de facturas. Acá no vive nada: reexporta lo
// que está repartido en dos archivos.
//
// Antes esto era un solo archivo de 737 líneas con las cuentas y los íconos
// mezclados. Se partió porque una copia de las cuentas corre dentro de la
// Cloud Function que mantiene los totales del menú, y allá no existe React:
// alcanzaba con un import de MUI en el archivo para que el servidor no
// pudiera usarlo.
//
//   facturaCalculos.js      lo que CALCULA: estados, saldos, ampliaciones,
//                           devoluciones, gestiones. Sin una línea de
//                           pantalla, y es un requisito, no prolijidad.
//                           ESTE es el que se comparte con el servidor.
//
//   facturaPresentacion.js  lo que se DIBUJA: el nombre y el ícono de cada
//                           estado y de cada gestión.
//
// Este archivo se queda para que los ~18 que ya pedían cosas acá no tengan
// que cambiar ni una línea. Si agregás algo nuevo, ponelo en el archivo que
// le corresponda —calcula o dibuja— y agregalo a la lista de abajo.

export * from "./facturaCalculos";
export * from "./facturaPresentacion";

// Viven en Utils/formato.js, que es donde va todo lo de presentación. Se
// reexportan desde acá para no tocar a quienes ya las importaban de este módulo.
export {
  formatearMonedaInput,
  limpiarMonedaInput,
  formatearFechaLegible,
} from "../../Utils/formato";
