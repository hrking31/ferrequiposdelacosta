import detailReducer, {
  setSelectedEquipo,
  clearSelectedEquipo,
  setLoading,
  setError,
} from "./detailSlice";

// Nota: el thunk fetchDetailData consulta Firestore, así que no se prueba acá
// (necesitaría un mock de Firebase). Se prueban los reducers, que es la lógica
// de estado del detalle de un equipo.
describe("detailSlice", () => {
  const inicial = { selectedEquipo: null, loading: false, error: null };

  it("setSelectedEquipo guarda el equipo y apaga loading/error", () => {
    const conError = { ...inicial, loading: true, error: "algo" };
    const estado = detailReducer(conError, setSelectedEquipo({ id: "1" }));
    expect(estado.selectedEquipo).toEqual({ id: "1" });
    expect(estado.loading).toBe(false);
    expect(estado.error).toBeNull();
  });

  it("clearSelectedEquipo limpia el equipo y el error", () => {
    const conEquipo = { ...inicial, selectedEquipo: { id: "1" }, error: "x" };
    const estado = detailReducer(conEquipo, clearSelectedEquipo());
    expect(estado.selectedEquipo).toBeNull();
    expect(estado.error).toBeNull();
  });

  it("setLoading enciende/apaga la carga", () => {
    expect(detailReducer(inicial, setLoading(true)).loading).toBe(true);
  });

  it("setError guarda el error y apaga la carga", () => {
    const cargando = { ...inicial, loading: true };
    const estado = detailReducer(cargando, setError("no se encontró"));
    expect(estado.error).toBe("no se encontró");
    expect(estado.loading).toBe(false);
  });
});
