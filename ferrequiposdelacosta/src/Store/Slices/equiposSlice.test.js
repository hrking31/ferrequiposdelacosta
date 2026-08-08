import equiposReducer, { fetchEquiposData } from "./equiposSlice";

// El catálogo se carga con el thunk fetchEquiposData (consulta Firestore). No
// ejecutamos la consulta, pero probamos las tres fases del thunk por su `type`.
describe("equiposSlice", () => {
  const inicial = { equipos: [], loading: false, error: null };

  it("pending enciende loading", () => {
    expect(equiposReducer(inicial, { type: fetchEquiposData.pending.type }).loading).toBe(true);
  });

  it("fulfilled guarda el catálogo y apaga loading", () => {
    const estado = equiposReducer(inicial, {
      type: fetchEquiposData.fulfilled.type,
      payload: [{ id: "1" }, { id: "2" }],
    });
    expect(estado.equipos).toHaveLength(2);
    expect(estado.loading).toBe(false);
  });

  it("rejected guarda el error (o un mensaje por defecto)", () => {
    expect(
      equiposReducer(inicial, { type: fetchEquiposData.rejected.type, payload: "boom" }).error,
    ).toBe("boom");
    expect(
      equiposReducer(inicial, { type: fetchEquiposData.rejected.type }).error,
    ).toBe("Error al cargar equipos");
  });
});
