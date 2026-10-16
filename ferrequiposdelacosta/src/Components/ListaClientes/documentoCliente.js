// Las fotos del documento de identidad del cliente: frente y atrás.
//
// Viven en Storage, en `documentos/{id del cliente}/`, y en el cliente
// (Firestore) se guarda solo el enlace de cada lado:
//
//   clientes/{id}.documento = { frente: "https://…", atras: "https://…" }
//
// QUIÉN LAS VE. Solo los roles que manejan clientes, los mismos que pueden
// abrir la ficha: storage.rules lee el rol del carné de la sesión (desde el
// 2026-10-16; antes Storage no sabía de roles y la carpeta quedaba abierta a
// cualquiera con sesión). Nunca al público.
//
// Cada foto lleva la hora en el nombre: al cambiarla cambia el enlace, y el
// celular no se queda mostrando la vieja desde lo que ya había bajado.
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../Firebase/Firebase";
import achicarImagen from "../../Utils/achicarImagen";

export const LADOS_DOCUMENTO = [
  { clave: "frente", etiqueta: "Frente" },
  { clave: "atras", etiqueta: "Atrás" },
];

// Los enlaces que tiene guardados un documento, sin los lados vacíos.
export const enlacesDelDocumento = (documento) =>
  LADOS_DOCUMENTO.map(({ clave }) => documento?.[clave]).filter(Boolean);

export const tieneDocumento = (cliente) =>
  enlacesDelDocumento(cliente?.documento).length > 0;

const subirLado = async (clienteId, lado, archivo) => {
  const foto = await achicarImagen(archivo);
  const destino = ref(storage, `documentos/${clienteId}/${lado}-${Date.now()}.jpg`);
  await uploadBytes(destino, foto, { contentType: "image/jpeg" });
  return getDownloadURL(destino);
};

// Borra una foto por su enlace. Si ya no estaba, no es un error: lo que se
// quería era que no estuviera.
export const borrarFotoDocumento = async (url) => {
  if (!url) return;
  try {
    await deleteObject(ref(storage, url));
  } catch (error) {
    if (error?.code !== "storage/object-not-found") throw error;
  }
};

// Borra varias sin frenar por ninguna. Se usa para limpiar: si una falla queda
// una foto huérfana en Storage, pero lo que el usuario estaba haciendo ya
// salió bien y no tiene por qué enterarse.
export const descartarFotos = (urls) =>
  Promise.allSettled(urls.filter(Boolean).map(borrarFotoDocumento));

// Sube las fotos nuevas y devuelve cómo queda el documento, listo para
// guardarlo en el cliente.
//
// `fotos` trae, por lado, el enlace que ya estaba (`url`) y el archivo que se
// acaba de elegir (`archivo`). El lado con archivo se sube; el que no, se
// queda con su enlace (o vacío, si se quitó).
//
// Si una subida falla, se borran las que sí alcanzaron a subir —que no
// queden fotos sueltas de un guardado que no ocurrió— y se lanza el error.
export const subirFotosDocumento = async (clienteId, fotos) => {
  const documento = {};
  const subidas = [];
  try {
    for (const { clave } of LADOS_DOCUMENTO) {
      const { url = "", archivo = null } = fotos?.[clave] ?? {};
      if (archivo) {
        const nueva = await subirLado(clienteId, clave, archivo);
        subidas.push(nueva);
        documento[clave] = nueva;
      } else {
        documento[clave] = url;
      }
    }
  } catch (error) {
    await descartarFotos(subidas);
    throw error;
  }
  return { documento, subidas };
};

// Las fotos que tenía el cliente y que el documento nuevo ya no usa: las que
// se cambiaron por otra y las que se quitaron. Se borran DESPUÉS de guardar,
// cuando el cliente ya no apunta a ellas.
export const fotosQueSobran = (anterior, nuevo) =>
  LADOS_DOCUMENTO.map(({ clave }) =>
    anterior?.[clave] && anterior[clave] !== nuevo?.[clave] ? anterior[clave] : null,
  ).filter(Boolean);
