// LAS FOTOS DE LOS EQUIPOS, LIVIANAS (2026-10-28, pedido del dueño). Antes se
// subían tal como salían del celular (2 a 4 MB) y cada lista con miniaturas
// bajaba la foto entera; Storage cobra por descarga.
//
// Al subir, la app las achica sola y guarda DOS de cada una, en WebP:
// - la grande (1600 px, unos 200 KB), para la ficha y el detalle de la tienda;
// - la `miniatura` (500 px, unos 30 KB), para las listas y las tarjetas de la
//   tienda y del kiosco.
//
// En el equipo, cada foto queda así:
//   { name, url, path, miniatura: { url, path } }
//
// Las dos van en la carpeta del equipo (`{id}/`), sin subcarpeta: borrar un
// equipo vacía esa carpeta y no entra a las de adentro (ver
// EliminarEquipoDialogo).
//
// Cada archivo lleva la hora en el nombre y nunca se reescribe: por eso el
// navegador puede guardarlo un año y no volver a bajarlo.
//
// El nombre lo pone la app, con el del equipo (2026-10-29, pedido del dueño:
// antes se escribía uno por foto, nadie lo veía y una "/" lo mandaba a una
// subcarpeta que borrar el equipo no vacía).
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../Firebase/Firebase";
import achicarImagen from "../../Utils/achicarImagen";

const GRANDE = { ladoMayor: 1600, calidad: 0.8, tipo: "image/webp" };
const MINIATURA = { ladoMayor: 500, calidad: 0.75, tipo: "image/webp" };
const UN_ANO = "public, max-age=31536000";

const subirArchivo = async (foto, ruta) => {
  const destino = ref(storage, ruta);
  await uploadBytes(destino, foto, { contentType: foto.type, cacheControl: UN_ANO });
  return { url: await getDownloadURL(destino), path: destino.fullPath };
};

// "Mezcladora 1/2 bulto" → "mezcladora-1-2-bulto": sin tildes, espacios ni
// nada que no sirva en el nombre de un archivo.
export const nombreDeFoto = (nombreEquipo) =>
  (nombreEquipo || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 40)
    .replace(/^-+|-+$/g, "") || "foto";

// LA MINIATURA DE UNA FOTO ELEGIDA, para verla antes de guardar: la misma
// que se va a subir (mismo tamaño y calidad). Devuelve su dirección en el
// aparato, o null si no se pudo hacer.
export const verMiniatura = async (file) => {
  try {
    return URL.createObjectURL(await achicarImagen(file, MINIATURA));
  } catch {
    return null;
  }
};

// Achica y sube una foto elegida (`file`) del equipo. Devuelve la foto tal
// como se guarda en el equipo.
export const subirFotoEquipo = async (equipoId, nombreEquipo, file) => {
  const [grande, miniatura] = await Promise.all([
    achicarImagen(file, GRANDE),
    achicarImagen(file, MINIATURA),
  ]);
  const name = nombreDeFoto(nombreEquipo);
  // Las fotos se suben juntas: la hora sola podría repetirse.
  const base = `${equipoId}/${name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const [subidaGrande, subidaMiniatura] = await Promise.all([
    subirArchivo(grande, base),
    subirArchivo(miniatura, `${base}-miniatura`),
  ]);
  return { name, ...subidaGrande, miniatura: subidaMiniatura };
};

// Dónde está guardada cada versión de una foto: para borrarlas juntas.
export const rutasDeFoto = (foto) => [foto.path, foto.miniatura?.path].filter(Boolean);
