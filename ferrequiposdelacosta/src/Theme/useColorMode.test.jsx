import { renderHook } from "@testing-library/react";
import { ColorModeContext, useColorMode } from "./useColorMode";

// useColorMode solo lee el ColorModeContext. Se prueba envolviéndolo en un
// Provider (wrapper) y comprobando que devuelve el valor provisto.
describe("useColorMode", () => {
  it("devuelve lo que expone el ColorModeContext", () => {
    const toggle = () => {};
    const wrapper = ({ children }) => (
      <ColorModeContext.Provider value={{ toggleColorMode: toggle }}>
        {children}
      </ColorModeContext.Provider>
    );
    const { result } = renderHook(() => useColorMode(), { wrapper });
    expect(result.current.toggleColorMode).toBe(toggle);
  });
});
