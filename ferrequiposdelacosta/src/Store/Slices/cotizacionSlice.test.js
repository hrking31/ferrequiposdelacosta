import cotizacionReducer, {
  setListaCotizaciones,
  setCotizacionActual,
  setFormCotizacion,
  setAtendidoPor,
  resetCotizacion,
} from "./cotizacionSlice";

// Este slice persiste la cotización en curso en localStorage. jsdom provee un
// localStorage, así que se puede probar tal cual; se limpia entre pruebas para
// que no se contaminen.
describe("cotizacionSlice", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const base = () => ({ listaCotizaciones: [], value: { atendidoPor: "", items: [] } });

  it("setListaCotizaciones reemplaza la lista del buzón", () => {
    const estado = cotizacionReducer(base(), setListaCotizaciones([{ id: "1" }]));
    expect(estado.listaCotizaciones).toEqual([{ id: "1" }]);
  });

  it("setCotizacionActual reemplaza la cotización y la persiste", () => {
    const estado = cotizacionReducer(base(), setCotizacionActual({ id: "cot-1", items: [1] }));
    expect(estado.value.id).toBe("cot-1");
    expect(JSON.parse(localStorage.getItem("sesion_trabajo_cotizacion")).id).toBe("cot-1");
  });

  it("setFormCotizacion hace merge sobre la cotización actual", () => {
    const estado = cotizacionReducer(base(), setFormCotizacion({ total: "$100" }));
    expect(estado.value.total).toBe("$100");
    expect(estado.value.items).toEqual([]); // conserva lo anterior
  });

  it("setAtendidoPor guarda quién atiende", () => {
    const estado = cotizacionReducer(base(), setAtendidoPor("Yasbleidy"));
    expect(estado.value.atendidoPor).toBe("Yasbleidy");
  });

  it("resetCotizacion limpia la cotización y borra la sesión guardada", () => {
    localStorage.setItem("sesion_trabajo_cotizacion", "{}");
    const estado = cotizacionReducer(base(), resetCotizacion());
    expect(estado.value.status).toBe("pendiente");
    expect(localStorage.getItem("sesion_trabajo_cotizacion")).toBeNull();
  });
});
