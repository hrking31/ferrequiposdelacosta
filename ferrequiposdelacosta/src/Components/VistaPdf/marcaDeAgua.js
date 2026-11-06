import LogoMarcaAgua from "../../assets/LogoFerrequiposMarcaAgua.png";

// LA MARCA DE AGUA (pedido del dueño, 2026-11-06): el ícono grande y muy
// tenue, centrado a lo alto y a lo ancho de cada hoja. La imagen está
// recortada justo al dibujo —sin el margen del logo de la cabecera—, así el
// centro de la imagen es el centro del ícono.
//
// Se pone al final, sobre lo ya dibujado y en todas las hojas: un PDF con una
// tabla larga tiene varias, y la tabla agrega las suyas sola. Al 6 % no tapa
// nada ni ensucia una impresión en blanco y negro.
const ANCHO_DEL_DIBUJO = 864;
const ALTO_DEL_DIBUJO = 1028;

export default function ponerMarcaDeAgua(doc, { anchoRelativo = 0.6, opacidad = 0.06 } = {}) {
  const anchoHoja = doc.internal.pageSize.getWidth();
  const altoHoja = doc.internal.pageSize.getHeight();
  const ancho = anchoHoja * anchoRelativo;
  const alto = (ancho * ALTO_DEL_DIBUJO) / ANCHO_DEL_DIBUJO;
  const x = (anchoHoja - ancho) / 2;
  const y = (altoHoja - alto) / 2;

  for (let hoja = 1; hoja <= doc.internal.getNumberOfPages(); hoja += 1) {
    doc.setPage(hoja);
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: opacidad }));
    // Con el mismo alias la imagen va una sola vez dentro del PDF, aunque
    // salga en todas las hojas.
    doc.addImage(LogoMarcaAgua, "PNG", x, y, ancho, alto, "marcaDeAgua");
    doc.restoreGraphicsState();
  }
}
