import passwordReducer, { togglePasswordVisibility } from "./passwordSlice";

// El estado es un booleano suelto: si la contraseña se ve o no.
describe("passwordSlice", () => {
  it("togglePasswordVisibility alterna entre ver y ocultar", () => {
    const visible = passwordReducer(false, togglePasswordVisibility());
    expect(visible).toBe(true);
    const oculto = passwordReducer(visible, togglePasswordVisibility());
    expect(oculto).toBe(false);
  });
});
