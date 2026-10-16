import { entrarConCodigo, estadoDosPasos } from "./dosPasos";

// Los dos pasos. Lo delicado: distinguir la sesión que entró con el código
// ("activo") de la que tiene los dos pasos activados pero es de antes
// ("reentrar") y de la que nunca los activó ("falta"). Las reglas solo dejan
// pasar a la primera.
const nube = vi.hoisted(() => ({ factores: [] }));

vi.mock("../Components/Firebase/Firebase", () => ({ auth: {} }));
vi.mock("firebase/auth", () => ({
  getMultiFactorResolver: vi.fn(),
  multiFactor: () => ({ enrolledFactors: nube.factores }),
  TotpMultiFactorGenerator: {
    FACTOR_ID: "totp",
    assertionForSignIn: (uid, codigo) => ({ uid, codigo }),
  },
}));

const sesionCon = (claims) => ({
  getIdTokenResult: () => Promise.resolve({ claims }),
});

describe("estadoDosPasos", () => {
  beforeEach(() => {
    nube.factores = [];
  });

  it("entró con contraseña y código: activo", async () => {
    nube.factores = [{ factorId: "totp" }];
    const sesion = sesionCon({ firebase: { sign_in_second_factor: "totp" } });
    expect(await estadoDosPasos(sesion)).toBe("activo");
  });

  it("los tiene activados pero esta sesión es de antes: tiene que volver a entrar", async () => {
    nube.factores = [{ factorId: "totp" }];
    expect(await estadoDosPasos(sesionCon({ firebase: {} }))).toBe("reentrar");
  });

  it("nunca los activó: falta", async () => {
    expect(await estadoDosPasos(sesionCon({}))).toBe("falta");
  });
});

describe("entrarConCodigo", () => {
  it("usa la aplicación de códigos de la cuenta", async () => {
    const resolver = {
      hints: [{ factorId: "phone", uid: "sms" }, { factorId: "totp", uid: "app" }],
      resolveSignIn: vi.fn(() => Promise.resolve("adentro")),
    };

    await entrarConCodigo(resolver, "123456");

    expect(resolver.resolveSignIn).toHaveBeenCalledWith({ uid: "app", codigo: "123456" });
  });

  it("si la cuenta no tiene aplicación de códigos, lo dice", () => {
    const resolver = { hints: [{ factorId: "phone", uid: "sms" }], resolveSignIn: vi.fn() };

    expect(() => entrarConCodigo(resolver, "123456")).toThrow(/aplicación de códigos/);
    expect(resolver.resolveSignIn).not.toHaveBeenCalled();
  });
});
