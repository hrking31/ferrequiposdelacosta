import ponerMarcaDeAgua from "./marcaDeAgua";

// LA MARCA DE AGUA de la cotización y la cuenta de cobro: el ícono centrado a
// lo alto y a lo ancho de CADA hoja, muy tenue. Un papel falso anota qué le
// piden dibujar y en qué hoja.
const papelFalso = ({ ancho = 215.9, alto = 279.4, hojas = 1 } = {}) => {
  const anotado = { imagenes: [], opacidades: [], hojaActual: null, guardados: 0, restaurados: 0 };
  const doc = {
    internal: {
      pageSize: { getWidth: () => ancho, getHeight: () => alto },
      getNumberOfPages: () => hojas,
    },
    GState: class {
      constructor(opciones) {
        Object.assign(this, opciones);
      }
    },
    setPage: (n) => {
      anotado.hojaActual = n;
    },
    saveGraphicsState: () => {
      anotado.guardados += 1;
    },
    restoreGraphicsState: () => {
      anotado.restaurados += 1;
    },
    setGState: (estado) => anotado.opacidades.push(estado.opacity),
    addImage: (img, tipo, x, y, w, h, alias) =>
      anotado.imagenes.push({ hoja: anotado.hojaActual, x, y, w, h, alias }),
  };
  return { doc, anotado };
};

describe("ponerMarcaDeAgua", () => {
  it("queda centrada a lo ancho y a lo alto de la hoja", () => {
    const { doc, anotado } = papelFalso();

    ponerMarcaDeAgua(doc);

    const [{ x, y, w, h }] = anotado.imagenes;
    expect(x + w / 2).toBeCloseTo(215.9 / 2, 5);
    expect(y + h / 2).toBeCloseTo(279.4 / 2, 5);
  });

  it("ocupa el 60 % del ancho y conserva la forma del ícono", () => {
    const { doc, anotado } = papelFalso();

    ponerMarcaDeAgua(doc);

    const [{ w, h }] = anotado.imagenes;
    expect(w).toBeCloseTo(215.9 * 0.6, 5);
    expect(h / w).toBeCloseTo(1028 / 864, 5);
  });

  it("es tenue: al 6 %", () => {
    const { doc, anotado } = papelFalso();

    ponerMarcaDeAgua(doc);

    expect(anotado.opacidades).toEqual([0.06]);
  });

  it("va en todas las hojas, con la misma imagen guardada una sola vez", () => {
    const { doc, anotado } = papelFalso({ hojas: 3 });

    ponerMarcaDeAgua(doc);

    expect(anotado.imagenes.map((i) => i.hoja)).toEqual([1, 2, 3]);
    expect(new Set(anotado.imagenes.map((i) => i.alias)).size).toBe(1);
  });

  // Si la transparencia no se devolviera, lo que se dibujara después saldría
  // también al 6 %.
  it("deja la transparencia como estaba en cada hoja", () => {
    const { doc, anotado } = papelFalso({ hojas: 2 });

    ponerMarcaDeAgua(doc);

    expect(anotado.guardados).toBe(2);
    expect(anotado.restaurados).toBe(2);
  });

  it("se centra en la hoja que tenga: también en A4", () => {
    const { doc, anotado } = papelFalso({ ancho: 210, alto: 297 });

    ponerMarcaDeAgua(doc);

    const [{ x, y, w, h }] = anotado.imagenes;
    expect(x + w / 2).toBeCloseTo(105, 5);
    expect(y + h / 2).toBeCloseTo(148.5, 5);
  });
});
