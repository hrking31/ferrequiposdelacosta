// Las reglas de en qué estado queda un documento de trabajo. Las comparten la
// cotización y la cuenta de cobro, que se llenan en pantallas distintas pero se
// abren, se pausan y se emiten igual.
//
// "enProceso" es un estado PASAJERO: solo dice que alguien lo tiene abierto en
// este momento. Al salir, el documento nunca se queda ahí; termina en uno de
// los otros según qué se hizo con él:
//
//   - se emitió el PDF ....................... creada  ("Emitida")
//   - se guardaron cambios sin emitir ........ pausada ("Pausada")
//   - cualquier otra salida .................. vuelve al estado que tenía
//
// Ese último caso es el que necesita estas funciones: para devolverlo a como
// estaba hay que acordarse de cómo estaba, y saber si de verdad se tocó algo.

import { hayCambios as compararFormularios } from "./cambios";

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

// A qué estado hay que devolverlo si se sale sin dejar cambios. Se calcula al
// ABRIRLO y se guarda con él, porque una vez adentro su estado ya es
// "enProceso" y el anterior se habría perdido.
//
// Si al abrirlo YA venía en "enProceso" es porque alguien lo dejó abierto y
// otro lo está asumiendo: ahí vale el estado que ese primero anotó. Si tampoco
// hay —un documento viejo, de antes de que se guardara este dato— se lo trata
// como pausado, que es lo que era: un trabajo a medias.
//
// `porOmision` es el estado de partida de cada tipo: una cotización nace
// "pendiente" porque la pide el cliente; una cuenta de cobro no, la escribe el
// staff de cero.
export const calcularStatusPrevio = (documento, porOmision = "pendiente") => {
  if (!documento) return porOmision;
  if (documento.status !== "enProceso") return documento.status || porOmision;
  return documento.statusPrevio || "pausada";
};

// Lo que la app mueve sola en una cotización y por lo tanto NO es "un cambio
// del usuario": abrirla ya le cambia el status y le pone quién la atiende.
const CAMPOS_INTERNOS = [
  "status",
  "statusPrevio",
  "atendidoPor",
  "atendidoPorUid",
  "id",
  "cotizacionId",
  "createdAt",
];

// Si el formulario difiere de como se abrió (ver Utils/cambios).
export const hayCambios = (actual, original) =>
  compararFormularios(actual, original, CAMPOS_INTERNOS);
