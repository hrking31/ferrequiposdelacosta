// LA PAUSA DE MARCA (pedido del dueño, 2026-11-06): en los carruseles de fotos
// de equipos —el protector del kiosko y el de la tienda—, cada tantas fotos
// entra una diapositiva con el logo. Con menos fotos que eso, va una sola al
// final de la vuelta. La diapositiva del logo se reconoce por `marca: true`.
export const FOTOS_ENTRE_MARCAS = 3;

export default function intercalarMarca(fotos, cada = FOTOS_ENTRE_MARCAS) {
  const diapos = [];
  fotos.forEach((foto, i) => {
    diapos.push(foto);
    if ((i + 1) % cada === 0) diapos.push({ marca: true });
  });
  if (fotos.length > 0 && fotos.length < cada) diapos.push({ marca: true });
  return diapos;
}
