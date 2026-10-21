// Achica una foto en el navegador antes de subirla.
//
// La cámara de un celular saca fotos de 3 o 4 MB, y Storage cobra por cada
// descarga: subirlas enteras es lo que hoy pasa con las fotos de los equipos
// (ver CrearEquipos). A 1600 px por el lado mayor un documento de identidad se
// sigue leyendo —los números, la firma, la cara— y la foto queda en unos
// 200-300 KB.
//
// Sale siempre en JPEG: es lo que mejor comprime una foto, y así da igual si
// el celular la entregó en PNG o en otro formato.
//
// La orientación se respeta sola: createImageBitmap lee el giro que el
// celular anotó en la foto, y una foto tomada de lado no queda acostada.

export default async function achicarImagen(
  archivo,
  { ladoMayor = 1600, calidad = 0.8 } = {},
) {
  const imagen = await createImageBitmap(archivo, {
    imageOrientation: "from-image",
  });
  // Nunca se agranda: una foto que ya es chica se deja de su tamaño.
  const escala = Math.min(1, ladoMayor / Math.max(imagen.width, imagen.height));
  const ancho = Math.round(imagen.width * escala);
  const alto = Math.round(imagen.height * escala);

  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  lienzo.getContext("2d").drawImage(imagen, 0, 0, ancho, alto);
  imagen.close?.();

  return new Promise((resolve, reject) => {
    lienzo.toBlob(
      (foto) =>
        foto ? resolve(foto) : reject(new Error("No se pudo procesar la foto.")),
      "image/jpeg",
      calidad,
    );
  });
}
