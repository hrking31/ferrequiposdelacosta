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
const navegadorCon = ({ permiso, registrado = false }) => {
  window.Notification = { permission: permiso, requestPermission: vi.fn() };
  if (registrado) localStorage.setItem("avisos_token", "token-de-este-equipo");
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mensajeria.soportado.mockResolvedValue(true);
});

describe("estadoAvisos", () => {
  it("dice que están activados cuando este aparato ya está registrado", () => {
    navegadorCon({ permiso: "granted", registrado: true });

    expect(estadoAvisos()).toBe("activados");
  });

  it("con el permiso dado pero sin registrar acá, todavía no están", () => {
    // Pasa cuando la persona los activó en su celular y abre el computador: el
    // permiso es del navegador, el registro es de cada aparato.
    navegadorCon({ permiso: "granted" });

    expect(estadoAvisos()).toBe("sin activar");
  });

  it("reconoce cuando la persona los bloqueó", () => {
    navegadorCon({ permiso: "denied" });

    expect(estadoAvisos()).toBe("bloqueados");
  });

  it("y cuando nunca se le preguntó", () => {
    navegadorCon({ permiso: "default" });

    expect(estadoAvisos()).toBe("sin activar");
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
    expect(localStorage.getItem("avisos_token")).toBe("token-de-este-equipo");
  });
});
