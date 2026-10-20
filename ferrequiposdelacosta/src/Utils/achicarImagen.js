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

// Abre la foto con una <img>, igual que la vista previa de la tarjeta del
// documento. El navegador también respeta ahí el giro anotado en la foto.
const abrirConImg = (archivo) =>
  new Promise((resolve, reject) => {
    const enlace = URL.createObjectURL(archivo);
    const imagen = new Image();
    imagen.onload = () =>
      resolve({
        imagen,
        ancho: imagen.naturalWidth,
        alto: imagen.naturalHeight,
        soltar: () => URL.revokeObjectURL(enlace),
      });
    imagen.onerror = () => {
      URL.revokeObjectURL(enlace);
      reject(new Error("No se pudo abrir la foto."));
    };
    imagen.src = enlace;
  });

// Abre la foto para dibujarla. Primero con createImageBitmap, que es lo más
// rápido; si el navegador no puede, con una <img>.
//
// El 2026-10-20 la tableta de un gestor daba InvalidStateError (código 11)
// con createImageBitmap en fotos que la vista previa sí mostraba, y el
// documento no subía. La <img> es el camino que ya se veía andar ahí.
const abrirFoto = async (archivo) => {
  try {
    const imagen = await createImageBitmap(archivo, {
      imageOrientation: "from-image",
    });
    return {
      imagen,
      ancho: imagen.width,
      alto: imagen.height,
      soltar: () => imagen.close?.(),
    };
  } catch {
    return abrirConImg(archivo);
  }
};

export default async function achicarImagen(
  archivo,
  { ladoMayor = 1600, calidad = 0.8 } = {},
) {
  const { imagen, ancho: anchoOriginal, alto: altoOriginal, soltar } =
    await abrirFoto(archivo);
  // Nunca se agranda: una foto que ya es chica se deja de su tamaño.
  const escala = Math.min(1, ladoMayor / Math.max(anchoOriginal, altoOriginal));
  const ancho = Math.round(anchoOriginal * escala);
  const alto = Math.round(altoOriginal * escala);

  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  lienzo.getContext("2d").drawImage(imagen, 0, 0, ancho, alto);
  soltar();

  return new Promise((resolve, reject) => {
    lienzo.toBlob(
      (foto) =>
        foto ? resolve(foto) : reject(new Error("No se pudo procesar la foto.")),
      "image/jpeg",
      calidad,
    );
  });
}
