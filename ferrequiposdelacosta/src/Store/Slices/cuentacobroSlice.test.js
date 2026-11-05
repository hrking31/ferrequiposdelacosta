import cuentacobroReducer, {
  setFormCuentaCobro,
  limpiarCuentaCobro,
} from "./cuentacobroSlice";

describe("cuentacobroSlice", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const base = () => ({ value: { empresa: "", items: [], total: 0 } });

  it("setFormCuentaCobro reemplaza el value entero y lo persiste", () => {
    const nuevo = { empresa: "Obras SA", obra: "Torre 1", items: [{ x: 1 }], total: 500 };
    const estado = cuentacobroReducer(base(), setFormCuentaCobro(nuevo));
    expect(estado.value.empresa).toBe("Obras SA");
    expect(estado.value.total).toBe(500);
    expect(JSON.parse(localStorage.getItem("sesion_trabajo_cuenta_cobro")).empresa).toBe("Obras SA");
  });

  it("limpiarCuentaCobro deja la cuenta en blanco y borra la sesión", () => {
    localStorage.setItem("sesion_trabajo_cuenta_cobro", "{}");
    const estado = cuentacobroReducer(base(), limpiarCuentaCobro());
    expect(estado.value.empresa).toBe("");
    expect(estado.value.total).toBe(0);
    expect(localStorage.getItem("sesion_trabajo_cuenta_cobro")).toBeNull();
  });
});
