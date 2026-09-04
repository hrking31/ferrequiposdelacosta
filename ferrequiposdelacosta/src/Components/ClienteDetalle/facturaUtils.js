// La puerta de entrada a todo lo de facturas. Acá no vive nada: reexporta lo
// que está repartido en tres archivos.
//
// Están separados porque una copia de las cuentas corre dentro de la Cloud
// Function que mantiene los totales del menú, y allá no existe React:
// alcanzaba con un import de MUI en el archivo para que el servidor no
// pudiera usarlo.
//
//   facturaModelo.js        DÓNDE vive cada dato: la forma del documento y
//                           los atajos para leerlo. Ni una cuenta.
//
//   facturaCuentas.js       lo que CALCULA: estados, saldos, ampliaciones,
//                           devoluciones, gestiones. Sin una línea de
//                           pantalla, y es un requisito, no prolijidad.
//
//   facturaPresentacion.js  lo que se DIBUJA: el nombre y el ícono de cada
//                           estado y de cada gestión.
//
// Los dos primeros son los que se comparten con el servidor.
//
// Este archivo se queda para que los ~20 que ya pedían cosas acá no tengan
// que cambiar ni una línea. Si agregás algo nuevo, ponelo en el archivo que
// le corresponda —dónde vive, calcula o dibuja— y agregalo a la lista de
// arriba.

export * from "./facturaModelo";
export * from "./facturaCuentas";
export * from "./facturaPresentacion";

// Viven en Utils/formato.js, que es donde va todo lo de presentación. Se
// reexportan desde acá para no tocar a quienes ya las importaban de este módulo.
export {
  formatearMonedaInput,
  limpiarMonedaInput,
  formatearFechaLegible,
} from "../../Utils/formato";
