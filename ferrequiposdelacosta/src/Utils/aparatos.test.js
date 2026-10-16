import {
  anotarAparato,
  describirAparato,
  describirUltimoUso,
  idDeEsteAparato,
  olvidarAparato,
} from "./aparatos";

// Los aparatos con sesión abierta. Lo que importa: que el administrador lea
// algo que reconozca ("Celular Android · Chrome"), y que anotar no gaste una
// escritura cada vez que alguien vuelve a la pestaña.
const nube = vi.hoisted(() => ({
  setDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
}));

vi.mock("../Components/Firebase/Firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (_db, ...partes) => partes.join("/"),
  setDoc: nube.setDoc,
  deleteDoc: nube.deleteDoc,
  serverTimestamp: () => "HORA_DEL_SERVIDOR",
}));

const UA = {
  pcChrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36",
  pcEdge:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36 Edg/129.0",
  androidChrome:
    "Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36",
  androidSamsung:
    "Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0 Mobile Safari/537.36",
  tabletAndroid:
    "Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36",
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  iphoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0 Mobile/15E148 Safari/604.1",
  macSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
};

describe("describirAparato", () => {
  it.each([
    [UA.pcChrome, "pc", "PC Windows · Chrome"],
    [UA.pcEdge, "pc", "PC Windows · Edge"],
    [UA.androidChrome, "celular", "Celular Android · Chrome"],
    [UA.androidSamsung, "celular", "Celular Android · Samsung Internet"],
    [UA.tabletAndroid, "tablet", "Tablet Android · Chrome"],
    [UA.iphoneSafari, "celular", "iPhone · Safari"],
    [UA.iphoneChrome, "celular", "iPhone · Chrome"],
    [UA.macSafari, "pc", "Mac · Safari"],
    ["", "pc", "Otro aparato · Navegador"],
  ])("%#: %s → %s, %s", (ua, tipo, descripcion) => {
    expect(describirAparato(ua)).toEqual({ tipo, descripcion });
  });
});

describe("describirUltimoUso", () => {
  const ahora = new Date(2026, 9, 16, 15, 0);

  it("hoy y ayer se dicen así", () => {
    expect(describirUltimoUso(new Date(2026, 9, 16, 10, 32), ahora)).toMatch(/^hoy 10:32/);
    expect(describirUltimoUso(new Date(2026, 9, 15, 18, 15), ahora)).toMatch(/^ayer 6:15/);
  });

  it("antes de ayer, con el día", () => {
    expect(describirUltimoUso(new Date(2026, 9, 12, 18, 15), ahora)).toMatch(/^12 de oct/);
  });

  it("si la hora todavía no llegó del servidor, dice que fue recién", () => {
    expect(describirUltimoUso(null, ahora)).toBe("hace un momento");
  });
});

describe("anotar y olvidar el aparato", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("este navegador conserva su número", () => {
    const id = idDeEsteAparato();
    expect(id).toBeTruthy();
    expect(idDeEsteAparato()).toBe(id);
  });

  it("al entrar se anota siempre; mientras se usa, como mucho cada media hora", async () => {
    await anotarAparato("u1", { forzar: true });
    expect(nube.setDoc).toHaveBeenCalledTimes(1);
    const [ruta, datos] = nube.setDoc.mock.calls[0];
    expect(ruta).toBe(`users/u1/aparatos/${idDeEsteAparato()}`);
    expect(datos.ultimoUso).toBe("HORA_DEL_SERVIDOR");

    // Volvió a la pestaña enseguida: no hace falta escribir de nuevo.
    await anotarAparato("u1");
    expect(nube.setDoc).toHaveBeenCalledTimes(1);

    // Pero si entra de nuevo (por ejemplo, después de que le cerraron las
    // sesiones), sí: la lista pudo haber quedado vacía.
    await anotarAparato("u1", { forzar: true });
    expect(nube.setDoc).toHaveBeenCalledTimes(2);
  });

  it("al cerrar sesión, el aparato sale de la lista", async () => {
    await olvidarAparato("u1");
    expect(nube.deleteDoc).toHaveBeenCalledWith(`users/u1/aparatos/${idDeEsteAparato()}`);
  });
});
