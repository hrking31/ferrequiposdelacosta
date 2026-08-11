// Las reglas de en qué estado queda una cotización.
//
// "enProceso" es un estado PASAJERO: solo dice que alguien la tiene abierta en
// este momento. Al salir, la cotización nunca se queda ahí; termina en uno de
// los otros tres según qué se hizo con ella:
//
//   - se emitió el PDF ....................... creada  ("Emitida")
//   - se guardaron cambios sin emitir ........ pausada ("Pausada")
//   - cualquier otra salida .................. vuelve al estado que tenía
//
// Ese último caso es el que necesita estas funciones: para devolverla a como
// estaba hay que acordarse de cómo estaba, y saber si de verdad se tocó algo.

// Cómo se llama cada estado en pantalla. Vive acá para que el buzón y el
// formulario no terminen nombrándolos distinto, como pasó con la cuenta de
// cobro, que al mismo estado le decía "Borrador".
export const ETIQUETA_ESTADO = {
  creada: "Emitida",
  pendiente: "Pendiente",
  enProceso: "En Proceso",
  pausada: "Pausada",
};

export const etiquetaEstado = (status) =>
  ETIQUETA_ESTADO[status] ||
  (status ? status.charAt(0).toUpperCase() + status.slice(1) : "Sin estado");

// A qué estado hay que devolverla si se sale sin dejar cambios. Se calcula al
// ABRIRLA y se guarda con ella, porque una vez adentro su estado ya es
// "enProceso" y el anterior se habría perdido.
//
// Si al abrirla YA venía en "enProceso" es porque alguien la dejó abierta y
// otro la está asumiendo: ahí vale el estado que ese primero anotó. Si tampoco
// hay —una cotización vieja, de antes de que se guardara este dato— se la trata
// como pausada, que es lo que era: un trabajo a medias.
export const calcularStatusPrevio = (cotizacion) => {
  if (!cotizacion) return "pendiente";
  if (cotizacion.status !== "enProceso") return cotizacion.status || "pendiente";
  return cotizacion.statusPrevio || "pausada";
};

// Lo que la app mueve sola y por lo tanto NO es "un cambio del usuario": si
// entraran en la comparación, abrir una cotización y cerrarla sin tocar nada
// contaría como modificarla, porque abrirla ya le cambia el status.
const CAMPOS_INTERNOS = new Set([
  "status",
  "statusPrevio",
  "atendidoPor",
  "atendidoPorUid",
  "id",
  "cotizacionId",
  "createdAt",
]);

// Los datos del formulario, sin lo interno y con las claves en orden fijo, para
// poder comparar dos cotizaciones como texto.
const soloDatos = (cotizacion) => {
  const datos = {};
  Object.keys(cotizacion || {})
    .filter((clave) => !CAMPOS_INTERNOS.has(clave))
    .sort()
    .forEach((clave) => {
      datos[clave] = cotizacion[clave];
    });
  return datos;
};

// Si el formulario difiere de como se abrió. `original` es la foto que se sacó
// al abrirla; para una cotización nueva es el formulario en blanco, así que
// esto responde además "¿escribió algo?".
export const hayCambios = (actual, original) =>
  JSON.stringify(soloDatos(actual)) !== JSON.stringify(soloDatos(original));
