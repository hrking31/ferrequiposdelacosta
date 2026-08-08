import userReducer, { setUserData, clearUserData } from "./userSlice";

describe("userSlice", () => {
  it("setUserData mezcla los datos nuevos sobre los existentes", () => {
    const estado = userReducer(undefined, setUserData({ uid: "abc", role: "administrador" }));
    expect(estado.uid).toBe("abc");
    expect(estado.role).toBe("administrador");
    expect(estado.permisos).toEqual([]); // conserva lo inicial
  });

  it("clearUserData vuelve al estado inicial (cierre de sesión)", () => {
    const logueado = userReducer(undefined, setUserData({ uid: "abc", name: "Ana" }));
    const estado = userReducer(logueado, clearUserData());
    expect(estado.uid).toBeNull();
    expect(estado.name).toBeNull();
  });
});
