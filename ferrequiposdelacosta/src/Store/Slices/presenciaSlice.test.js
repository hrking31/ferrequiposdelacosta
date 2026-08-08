import presenciaReducer, { setUsuariosConectados } from "./presenciaSlice";

describe("presenciaSlice", () => {
  it("setUsuariosConectados reemplaza el mapa de usuarios en línea", () => {
    const estado = presenciaReducer(undefined, setUsuariosConectados({ uid1: true }));
    expect(estado.usuariosConectados).toEqual({ uid1: true });
  });
});
