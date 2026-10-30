import { nombreDeFoto, rutasDeFoto } from "./fotosEquipo";

vi.mock("../Firebase/Firebase", () => ({ storage: {} }));
vi.mock("firebase/storage", () => ({ ref: vi.fn(), uploadBytes: vi.fn(), getDownloadURL: vi.fn() }));

// Desde el 2026-10-29 el nombre de cada foto lo pone la app, con el del
// equipo: antes se escribía a mano y una "/" lo mandaba a una subcarpeta que
// borrar el equipo no vaciaba.
describe("nombreDeFoto", () => {
  it("sin tildes, espacios ni barras", () => {
    expect(nombreDeFoto("Mezcladora 1/2 Bulto")).toBe("mezcladora-1-2-bulto");
    expect(nombreDeFoto("TABLÓN")).toBe("tablon");
  });

  it("sin guiones sueltos en las puntas", () => {
    expect(nombreDeFoto("  ¡Andamio!  ")).toBe("andamio");
  });

  it("corto, aunque el nombre sea largo", () => {
    expect(nombreDeFoto("a".repeat(80))).toHaveLength(40);
  });

  it("sin nombre, 'foto'", () => {
    expect(nombreDeFoto("")).toBe("foto");
    expect(nombreDeFoto(undefined)).toBe("foto");
    expect(nombreDeFoto("///")).toBe("foto");
  });
});

describe("rutasDeFoto", () => {
  it("la grande y su miniatura, para borrarlas juntas", () => {
    expect(rutasDeFoto({ path: "e1/a", miniatura: { path: "e1/a-miniatura" } })).toEqual(["e1/a", "e1/a-miniatura"]);
    expect(rutasDeFoto({ path: "e1/vieja" })).toEqual(["e1/vieja"]);
  });
});
