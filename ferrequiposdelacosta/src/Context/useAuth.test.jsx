import { renderHook } from "@testing-library/react";
import { authContext, useAuth } from "./useAuth";

// useAuth solo lee el authContext. Se prueba con un Provider que simula la
// sesión, comprobando que el hook devuelve ese valor tal cual.
describe("useAuth", () => {
  it("devuelve el valor del authContext", () => {
    const valor = { user: { uid: "1" }, login: () => {}, logout: () => {} };
    const wrapper = ({ children }) => (
      <authContext.Provider value={valor}>{children}</authContext.Provider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user.uid).toBe("1");
  });
});
