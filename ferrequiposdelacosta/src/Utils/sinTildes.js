// Sin tildes ni mayúsculas, para que "martinez" encuentre a Martínez y
// "tablon" al TABLÓN. Lo usan los buscadores que filtran mientras se escribe.
const sinTildes = (texto = "") =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default sinTildes;
