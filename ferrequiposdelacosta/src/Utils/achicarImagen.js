// Achica una foto en el navegador antes de subirla.
//
// La cámara de un celular saca fotos de 3 o 4 MB, y Storage cobra por cada
// descarga. A 1600 px por el lado mayor un documento de identidad se sigue
// leyendo —los números, la firma, la cara— y la foto queda en unos 200-300 KB.
//
// Sale en JPEG si no se pide otra cosa: es lo que mejor comprime una foto en
// cualquier navegador, y así da igual si el celular la entregó en PNG o en otro
// formato. Las fotos de los equipos piden WebP (`tipo: "image/webp"`), que pesa
// todavía menos; el navegador que no sabe hacerlo (Safari) entrega otra cosa, y
// entonces se rehace en JPEG. El formato que salió va en `foto.type`.
//
// La orientación se respeta sola: createImageBitmap lee el giro que el
// celular anotó en la foto, y una foto tomada de lado no queda acostada.

const aBlob = (lienzo, tipo, calidad) =>
  new Promise((resolve, reject) => {
    lienzo.toBlob(
      (foto) =>
        foto ? resolve(foto) : reject(new Error("No se pudo procesar la foto.")),
      tipo,
      calidad,
    );
  });

export default async function achicarImagen(
  archivo,
  { ladoMayor = 1600, calidad = 0.8, tipo = "image/jpeg" } = {},
) {
  const imagen = await createImageBitmap(archivo, {
    imageOrientation: "from-image",
  });
  // Nunca se agranda: una foto que ya es chica se deja de su tamaño.
  const escala = Math.min(1, ladoMayor / Math.max(imagen.width, imagen.height));
  const ancho = Math.round(imagen.width * escala);
  const alto = Math.round(imagen.height * escala);

  // JPEG no tiene transparencia: lo transparente (una foto de equipo recortada
  // en PNG) saldría negro, así que va sobre blanco, el fondo de la tienda.
  const dibujar = (conFondoBlanco) => {
    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;
    const contexto = lienzo.getContext("2d");
    if (conFondoBlanco) {
      contexto.fillStyle = "#fff";
      contexto.fillRect(0, 0, ancho, alto);
    }
    contexto.drawImage(imagen, 0, 0, ancho, alto);
    return lienzo;
  };

  try {
    const foto = await aBlob(dibujar(tipo === "image/jpeg"), tipo, calidad);
    // Sin soporte para el formato pedido, el navegador entrega PNG (pesado).
    return foto.type === tipo ? foto : await aBlob(dibujar(true), "image/jpeg", calidad);
  } finally {
    imagen.close?.();
  }
}
