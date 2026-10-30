import searchReducer, { clearSearchEquipo, ponerBusqueda } from "./searchSlice";

describe("searchSlice", () => {
  it("arranca sin nada escrito", () => {
    expect(searchReducer(undefined, { type: "@@INIT" })).toEqual({ termino: "" });
  });

  it("ponerBusqueda guarda lo escrito tal cual", () => {
    const estado = searchReducer(undefined, ponerBusqueda("mezcla "));
    expect(estado.termino).toBe("mezcla ");
  });

  it("clearSearchEquipo lo borra", () => {
    const estado = searchReducer({ termino: "andamio" }, clearSearchEquipo());
    expect(estado.termino).toBe("");
  });
});
