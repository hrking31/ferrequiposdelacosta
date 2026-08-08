import { renderHook, act } from "@testing-library/react";
import useSnackbar from "./useSnackbar";

// renderHook monta un hook sin necesidad de un componente; act() envuelve los
// cambios de estado para que React los procese antes de comprobar el resultado.
describe("useSnackbar", () => {
  it("empieza cerrado", () => {
    const { result } = renderHook(() => useSnackbar());
    expect(result.current.snackbar.open).toBe(false);
  });

  it("showSnackbar abre con el mensaje y la severidad indicados", () => {
    const { result } = renderHook(() => useSnackbar());
    act(() => result.current.showSnackbar("Guardado", "success"));
    expect(result.current.snackbar.open).toBe(true);
    expect(result.current.snackbar.message).toBe("Guardado");
    expect(result.current.snackbar.severity).toBe("success");
  });

  it("usa la severidad por defecto que se le pasó al hook", () => {
    const { result } = renderHook(() => useSnackbar("error"));
    act(() => result.current.showSnackbar("Algo falló"));
    expect(result.current.snackbar.severity).toBe("error");
  });

  it("closeSnackbar cierra pero conserva el mensaje", () => {
    const { result } = renderHook(() => useSnackbar());
    act(() => result.current.showSnackbar("Hola", "info"));
    act(() => result.current.closeSnackbar());
    expect(result.current.snackbar.open).toBe(false);
    expect(result.current.snackbar.message).toBe("Hola");
  });
});
