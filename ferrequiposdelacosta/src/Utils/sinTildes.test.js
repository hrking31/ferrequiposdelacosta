import sinTildes from "./sinTildes";

// Lo que comparan los buscadores que filtran mientras se escribe.
describe("sinTildes", () => {
  it("quita tildes y mayúsculas", () => {
    expect(sinTildes("TABLÓN")).toBe("tablon");
    expect(sinTildes("Martínez")).toBe("martinez");
    expect(sinTildes("CAMIÓN Ñandú")).toBe("camion nandu");
  });

  it("sin texto, vacío", () => {
    expect(sinTildes()).toBe("");
    expect(sinTildes("")).toBe("");
  });
});
