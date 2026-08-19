import { estadoAvisos, activarAvisos } from "./avisos";

// Los avisos que llegan con la app cerrada. Lo que se puede probar sin un
// navegador de verdad es la parte que decide: en qué estado está este aparato y
// qué se le dice a la persona cuando algo no se puede.
//
// Esa segunda parte importa más de lo que parece. Cuando alguien dice "no me
// llegan los avisos", casi siempre es una de tres cosas —los bloqueó, está en
// Safari sin instalar la app, o no inició sesión—, y el mensaje tiene que
// decírselo en castellano en vez de dejarlo adivinando.
const mensajeria = vi.hoisted(() => ({
  soportado: vi.fn(() => Promise.resolve(true)),
  getToken: vi.fn(() => Promise.resolve("token-de-este-equipo")),
  deleteToken: vi.fn(() => Promise.resolve()),
}));

vi.mock("firebase/messaging", () => ({
  isSupported: mensajeria.soportado,
  getMessaging: () => ({}),
  getToken: mensajeria.getToken,
  deleteToken: mensajeria.deleteToken,
}));

vi.mock("../Components/Firebase/Firebase", () => ({
  app: {},
  db: {},
  LLAVE_AVISOS: "llave-de-prueba",
}));

vi.mock("firebase/firestore", () => ({
  doc: (_db, ...partes) => partes.join("/"),
  updateDoc: vi.fn(() => Promise.resolve()),
  arrayUnion: (...valores) => ({ union: valores }),
  arrayRemove: (...valores) => ({ remove: valores }),
}));

// Deja el navegador simulado en un estado concreto: qué respondió la persona al
// permiso y si este aparato ya estaba registrado.
const navegadorCon = ({ permiso, registradoPor = null }) => {
  window.Notification = { permission: permiso, requestPermission: vi.fn() };
  if (registradoPor) {
    localStorage.setItem(
      "avisos_token",
      JSON.stringify({ uid: registradoPor, token: "token-de-este-equipo" }),
    );
  }
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mensajeria.soportado.mockResolvedValue(true);
});

describe("estadoAvisos", () => {
  it("dice que están activados cuando este aparato ya está registrado", () => {
    navegadorCon({ permiso: "granted", registradoPor: "u1" });

    expect(estadoAvisos("u1")).toBe("activados");
  });

  it("si en este equipo entra OTRA persona, a ella le falta activarlos", () => {
    // El aparato está registrado, pero a nombre del anterior: los avisos irían
    // a su ficha, no a la de quien está usando la app ahora.
    navegadorCon({ permiso: "granted", registradoPor: "u1" });

    expect(estadoAvisos("u2")).toBe("sin activar");
  });

  it("un registro del formato viejo (sin dueño) sigue valiendo", () => {
    // Los que ya lo tenían activado antes de guardar el uid no deben ver el
    // botón de nuevo sin motivo.
    window.Notification = { permission: "granted", requestPermission: vi.fn() };
    localStorage.setItem("avisos_token", "token-de-este-equipo");

    expect(estadoAvisos("u1")).toBe("activados");
  });

  it("con el permiso dado pero sin registrar acá, todavía no están", () => {
    // Pasa cuando la persona los activó en su celular y abre el computador: el
    // permiso es del navegador, el registro es de cada aparato.
    navegadorCon({ permiso: "granted" });

    expect(estadoAvisos("u1")).toBe("sin activar");
  });

  it("reconoce cuando la persona los bloqueó", () => {
    navegadorCon({ permiso: "denied" });

    expect(estadoAvisos("u1")).toBe("bloqueados");
  });

  it("y cuando nunca se le preguntó", () => {
    navegadorCon({ permiso: "default" });

    expect(estadoAvisos("u1")).toBe("sin activar");
  });
});

describe("activarAvisos — cuando no se puede, lo explica", () => {
  it("sin sesión iniciada no hace nada", async () => {
    navegadorCon({ permiso: "default" });

    const resultado = await activarAvisos(undefined);

    expect(resultado.ok).toBe(false);
    expect(resultado.mensaje).toMatch(/Iniciá sesión/);
    expect(mensajeria.getToken).not.toHaveBeenCalled();
  });

  it("en un navegador que no puede, nombra el caso del iPhone", async () => {
    // Es el reclamo más frecuente: en iPhone hay que instalar la app en la
    // pantalla de inicio; abierta en Safari no hay avisos posibles.
    mensajeria.soportado.mockResolvedValue(false);
    navegadorCon({ permiso: "default" });

    const resultado = await activarAvisos("u1");

    expect(resultado.ok).toBe(false);
    expect(resultado.mensaje).toMatch(/iPhone/);
    expect(mensajeria.getToken).not.toHaveBeenCalled();
  });

  it("si la persona dice que no, avisa que hay que habilitarlos a mano", async () => {
    // El navegador no vuelve a preguntar nunca más: sin esta explicación, la
    // persona toca el botón una y otra vez sin entender por qué no pasa nada.
    navegadorCon({ permiso: "default" });
    window.Notification.requestPermission = vi.fn(() => Promise.resolve("denied"));

    const resultado = await activarAvisos("u1");

    expect(resultado.ok).toBe(false);
    expect(resultado.mensaje).toMatch(/configuración del navegador/);
    expect(mensajeria.getToken).not.toHaveBeenCalled();
  });
});

describe("activarAvisos — cuando sí se puede", () => {
  it("registra este aparato y lo recuerda", async () => {
    navegadorCon({ permiso: "default" });
    window.Notification.requestPermission = vi.fn(() => Promise.resolve("granted"));
    navigator.serviceWorker = { register: vi.fn(() => Promise.resolve({})) };

    const resultado = await activarAvisos("u1");

    expect(resultado.ok).toBe(true);
    expect(mensajeria.getToken).toHaveBeenCalled();
    // Queda anotado cuál es el de este aparato, para poder darlo de baja
    // después sin tocar los de los demás.
    expect(JSON.parse(localStorage.getItem("avisos_token"))).toEqual({
      uid: "u1",
      token: "token-de-este-equipo",
    });
  });
});
