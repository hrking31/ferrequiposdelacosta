// Si dos datos son los mismos, sin importar en qué orden vengan sus campos.
//
// Firestore no guarda el orden de los campos de un mapa, y el mismo documento
// puede llegar con ellos en otro orden según se lea —de la base o de la copia
// local—. Comparando el texto tal cual, lo que nadie tocó figuraba cambiado:
// una corrección no se podía guardar, y el historial anotaba "pago $180.000 →
// $180.000".
const ordenado = (valor) =>
  Array.isArray(valor)
    ? valor.map(ordenado)
    : valor && typeof valor === "object"
      ? Object.fromEntries(
          Object.keys(valor)
            .sort()
            .map((clave) => [clave, ordenado(valor[clave])]),
        )
      : valor;

export const mismoContenido = (a, b) =>
  JSON.stringify(ordenado(a)) === JSON.stringify(ordenado(b));
