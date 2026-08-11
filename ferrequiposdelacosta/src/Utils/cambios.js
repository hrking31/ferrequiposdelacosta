// Si un formulario difiere de como se abrió.
//
// Lo usan la cotización y la cuenta de cobro para las dos mismas decisiones al
// salir: si preguntar —sin cambios no hay nada que perder, así que no se
// pregunta— y en qué estado queda el documento.
//
// `camposInternos` son los que mueve la app sola: el estado, el número del
// documento, quién lo atiende, las fechas de guardado. Si entraran en la
// comparación, abrir un documento y cerrarlo sin tocar nada contaría como
// modificarlo, porque abrirlo ya le cambia alguno de esos.

// Los datos de verdad, sin lo interno y con las claves en orden fijo, para
// poder comparar dos formularios como texto.
const soloDatos = (documento, camposInternos) => {
  const datos = {};
  Object.keys(documento || {})
    .filter((clave) => !camposInternos.has(clave))
    .sort()
    .forEach((clave) => {
      datos[clave] = documento[clave];
    });
  return datos;
};

// `original` es la foto que se sacó al abrirlo; para un documento nuevo es el
// formulario en blanco, así que esto responde además "¿escribió algo?".
export const hayCambios = (actual, original, camposInternos = []) => {
  const internos = new Set(camposInternos);
  return (
    JSON.stringify(soloDatos(actual, internos)) !==
    JSON.stringify(soloDatos(original, internos))
  );
};
