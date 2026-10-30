import { buscarEnCatalogo, filtrarCatalogo, miniaturaDe, portadaDe } from "./catalogoEquipos";

const catalogo = [
  { id: "1", name: "TABLÓN" },
  { id: "2", name: "ANDAMIOS CONVENCIONALES" },
  { id: "3", name: "MEZCLADORA" },
];

// El buscador de la tienda y del kiosco (2026-10-29): antes consultaba la base
// y solo encontraba los nombres que EMPEZABAN con lo escrito.
describe("buscarEnCatalogo", () => {
  it("encuentra lo escrito en cualquier parte del nombre", () => {
    expect(buscarEnCatalogo(catalogo, "convencional").map((e) => e.id)).toEqual(["2"]);
  });

  it("sin tildes ni mayúsculas, y con espacios de más", () => {
    expect(buscarEnCatalogo(catalogo, "  tablon ").map((e) => e.id)).toEqual(["1"]);
  });

  it("deja el orden de la tienda", () => {
    expect(buscarEnCatalogo(catalogo, "a").map((e) => e.id)).toEqual(["1", "2", "3"]);
  });

  it("sin nada escrito, todos", () => {
    expect(buscarEnCatalogo(catalogo, "")).toBe(catalogo);
  });

  it("si nada coincide, ninguno", () => {
    expect(buscarEnCatalogo(catalogo, "grúa")).toEqual([]);
  });
});

// La lista de la pantalla de Equipos: por orden alfabético y, desde el
// 2026-10-29, sin distinguir tildes.
describe("filtrarCatalogo", () => {
  it("ordena por nombre", () => {
    expect(filtrarCatalogo(catalogo, "").map((e) => e.id)).toEqual(["2", "3", "1"]);
  });

  it("no distingue tildes", () => {
    expect(filtrarCatalogo(catalogo, "tablon").map((e) => e.id)).toEqual(["1"]);
  });
});

describe("la miniatura", () => {
  it("es la versión chica de la portada; sin ella, nada", () => {
    const equipo = { images: [{ url: "grande", miniatura: { url: "chica" } }] };
    expect(portadaDe(equipo)).toBe("chica");
    expect(miniaturaDe({ url: "grande" })).toBe("");
  });
});
