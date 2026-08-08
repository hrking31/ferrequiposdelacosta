import searchReducer, {
  clearSearchEquipo,
  fetchEquipos,
} from "./searchSlice";

// El thunk fetchEquipos consulta Firestore; no lo ejecutamos, pero sí probamos
// cómo el slice reacciona a sus tres fases (pending/fulfilled/rejected)
// disparando esas acciones directamente por su `type`.
describe("searchSlice", () => {
  const inicial = { results: [], loading: false, error: null, hasSearched: false };

  it("pending enciende loading y limpia el error", () => {
    const estado = searchReducer(inicial, { type: fetchEquipos.pending.type });
    expect(estado.loading).toBe(true);
    expect(estado.error).toBeNull();
  });

  it("fulfilled guarda los resultados y marca que ya se buscó", () => {
    const estado = searchReducer(inicial, {
      type: fetchEquipos.fulfilled.type,
      payload: [{ id: "1" }],
    });
    expect(estado.results).toEqual([{ id: "1" }]);
    expect(estado.loading).toBe(false);
    expect(estado.hasSearched).toBe(true);
  });

  it("rejected guarda el error", () => {
    const estado = searchReducer(inicial, {
      type: fetchEquipos.rejected.type,
      payload: "falló",
    });
    expect(estado.error).toBe("falló");
    expect(estado.loading).toBe(false);
  });

  it("clearSearchEquipo reinicia la búsqueda", () => {
    const conDatos = { results: [{ id: "1" }], loading: false, error: null, hasSearched: true };
    const estado = searchReducer(conDatos, clearSearchEquipo());
    expect(estado.results).toEqual([]);
    expect(estado.hasSearched).toBe(false);
  });
});
