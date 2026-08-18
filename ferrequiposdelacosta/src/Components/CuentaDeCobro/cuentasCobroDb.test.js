import { beforeEach, describe, expect, it, vi } from "vitest";

// Firestore se reemplaza por dobles: lo que se prueba es la lógica de este
// módulo —crear vs. actualizar, qué campos se guardan, cómo se pagina— no el
// SDK, que ya está probado por Google.
const mocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn(),
  getCountFromServer: vi.fn(),
  collection: vi.fn((_db, nombre) => ({ nombre })),
  doc: vi.fn((_db, nombre, id) => ({ nombre, id })),
  query: vi.fn((base, ...partes) => ({ base, partes })),
  orderBy: vi.fn((campo, dir) => ({ tipo: "orderBy", campo, dir })),
  limit: vi.fn((n) => ({ tipo: "limit", n })),
  startAfter: vi.fn((cursor) => ({ tipo: "startAfter", cursor })),
  where: vi.fn((campo, op, valor) => ({ tipo: "where", campo, op, valor })),
}));

vi.mock("firebase/firestore", () => mocks);
vi.mock("../Firebase/Firebase", () => ({ db: {} }));

const {
  COLECCION,
  POR_TANDA,
  contarCuentasCobroDelMes,
  eliminarCuentaCobro,
  generarCuentaCobroId,
  guardarCuentaCobro,
  leerCuentasCobro,
  marcarCuentaPagada,
} = await import("./cuentasCobroDb");

// Un documento como los que devuelve Firestore.
const docFalso = (id, datos) => ({ id, data: () => datos });

const usuario = { uid: "u1", name: "Yasbleidy" };
const cuenta = { cuentaCobroId: "CC-1", empresa: "Ana Pérez", total: 500000 };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("generarCuentaCobroId", () => {
  it("arma el número con el prefijo CC", () => {
    expect(generarCuentaCobroId()).toMatch(/^CC-\d+$/);
  });
});

describe("guardarCuentaCobro", () => {
  it("crea un documento nuevo cuando la cuenta no tiene id", async () => {
    mocks.addDoc.mockResolvedValue({ id: "nuevo" });

    const id = await guardarCuentaCobro(cuenta, "creada", usuario);

    expect(id).toBe("nuevo");
    expect(mocks.updateDoc).not.toHaveBeenCalled();

    const guardado = mocks.addDoc.mock.calls[0][1];
    expect(guardado.status).toBe("creada");
    expect(guardado.empresa).toBe("Ana Pérez");
    expect(guardado.emitidaPor).toEqual({ uid: "u1", nombre: "Yasbleidy" });
    expect(typeof guardado.creadaEn).toBe("number");
  });

  it("actualiza la existente cuando ya tiene id, sin crear otra", async () => {
    const id = await guardarCuentaCobro(
      { ...cuenta, id: "abc" },
      "pausada",
      usuario,
    );

    expect(id).toBe("abc");
    expect(mocks.addDoc).not.toHaveBeenCalled();
    expect(mocks.doc).toHaveBeenCalledWith({}, COLECCION, "abc");
    expect(mocks.updateDoc.mock.calls[0][1].status).toBe("pausada");
  });

  it("no guarda el id como campo: es el nombre del documento", async () => {
    await guardarCuentaCobro({ ...cuenta, id: "abc" }, "creada", usuario);
    expect(mocks.updateDoc.mock.calls[0][1]).not.toHaveProperty("id");
  });

  it("al actualizar no toca la fecha de creación", async () => {
    await guardarCuentaCobro({ ...cuenta, id: "abc" }, "creada", usuario);
    expect(mocks.updateDoc.mock.calls[0][1]).not.toHaveProperty("creadaEn");
  });

  it("aguanta que no haya usuario en sesión", async () => {
    mocks.addDoc.mockResolvedValue({ id: "nuevo" });
    await guardarCuentaCobro(cuenta, "creada", undefined);
    expect(mocks.addDoc.mock.calls[0][1].emitidaPor).toEqual({
      uid: null,
      nombre: "",
    });
  });

  // `emitida` es lo que hace posible contar las del mes con UNA lectura, así
  // que tiene que nacer con el documento (ver contarCuentasCobroDelMes).
  it("al emitir deja marcado que se emitió", async () => {
    mocks.addDoc.mockResolvedValue({ id: "nuevo" });
    await guardarCuentaCobro(cuenta, "creada", usuario);
    expect(mocks.addDoc.mock.calls[0][1].emitida).toBe(true);
  });

  it("un borrador no queda marcado como emitido", async () => {
    mocks.addDoc.mockResolvedValue({ id: "nuevo" });
    await guardarCuentaCobro(cuenta, "pausada", usuario);
    expect(mocks.addDoc.mock.calls[0][1]).not.toHaveProperty("emitida");
  });

  // Haberse emitido no se deshace: pausar una cuenta ya emitida NO puede
  // borrarle la marca, o el número del mes bajaría porque alguien la abrió.
  it("volver a guardar como pausada no borra la marca de emitida", async () => {
    await guardarCuentaCobro({ ...cuenta, id: "abc" }, "pausada", usuario);
    expect(mocks.updateDoc.mock.calls[0][1]).not.toHaveProperty("emitida");
  });
});

describe("leerCuentasCobro", () => {
  it("trae la primera tanda, de la más nueva a la más vieja", async () => {
    mocks.getDocs.mockResolvedValue({
      docs: [docFalso("a", { empresa: "Ana" }), docFalso("b", { empresa: "Beto" })],
    });

    const tanda = await leerCuentasCobro();

    expect(tanda.cuentas).toEqual([
      { id: "a", empresa: "Ana" },
      { id: "b", empresa: "Beto" },
    ]);
    expect(mocks.orderBy).toHaveBeenCalledWith("creadaEn", "desc");
    expect(mocks.limit).toHaveBeenCalledWith(POR_TANDA);
    // Sin cursor no se pide "seguir desde": es la primera tanda.
    expect(mocks.startAfter).not.toHaveBeenCalled();
  });

  it("sigue desde el último cuando se le pasa el cursor", async () => {
    mocks.getDocs.mockResolvedValue({ docs: [] });
    const cursor = { fake: true };

    await leerCuentasCobro(cursor);

    expect(mocks.startAfter).toHaveBeenCalledWith(cursor);
  });

  it("avisa que hay más solo si la tanda vino llena", async () => {
    mocks.getDocs.mockResolvedValue({
      docs: Array.from({ length: POR_TANDA }, (_, i) => docFalso(`d${i}`, {})),
    });
    expect((await leerCuentasCobro()).hayMas).toBe(true);

    mocks.getDocs.mockResolvedValue({ docs: [docFalso("a", {})] });
    expect((await leerCuentasCobro()).hayMas).toBe(false);
  });

  it("sin resultados devuelve la lista vacía y ningún cursor", async () => {
    mocks.getDocs.mockResolvedValue({ docs: [] });

    const tanda = await leerCuentasCobro();

    expect(tanda.cuentas).toEqual([]);
    expect(tanda.ultimo).toBeNull();
    expect(tanda.hayMas).toBe(false);
  });
});

describe("contarCuentasCobroDelMes", () => {
  // Lo que se cuida acá es que el número lo saque el SERVIDOR: antes se traían
  // todas las del mes para mirarles el estado, y eso costaba una lectura por
  // cuenta cada vez que alguien abría el menú.
  it("pide el número al servidor, sin traer los documentos", async () => {
    mocks.getCountFromServer.mockResolvedValue({ data: () => ({ count: 7 }) });

    expect(await contarCuentasCobroDelMes()).toBe(7);
    expect(mocks.getDocs).not.toHaveBeenCalled();
  });

  it("cuenta por el hecho de haberse emitido, no por el estado", async () => {
    mocks.getCountFromServer.mockResolvedValue({ data: () => ({ count: 0 }) });

    await contarCuentasCobroDelMes();

    // El estado va y viene —"enProceso" mientras alguien la tiene abierta,
    // "pagada" cuando entra la plata— y el número del mes no puede moverse
    // por eso. Por eso se pregunta por `emitida`, que no se deshace.
    const [campo, operador, valor] = mocks.where.mock.calls[0];
    expect(campo).toBe("emitida");
    expect(operador).toBe("==");
    expect(valor).toBe(true);
  });

  it("filtra desde el primer día del mes", async () => {
    mocks.getCountFromServer.mockResolvedValue({ data: () => ({ count: 0 }) });

    await contarCuentasCobroDelMes();

    const [campo, operador, desde] = mocks.where.mock.calls[1];
    expect(campo).toBe("creadaEn");
    expect(operador).toBe(">=");

    const fecha = new Date(desde);
    expect(fecha.getDate()).toBe(1);
    expect(fecha.getHours()).toBe(0);
    expect(fecha.getMonth()).toBe(new Date().getMonth());
  });
});

describe("marcarCuentaPagada", () => {
  it("marca el pago con quién y cuándo", async () => {
    await marcarCuentaPagada("abc", true, usuario);

    const guardado = mocks.updateDoc.mock.calls[0][1];
    expect(guardado.status).toBe("pagada");
    expect(typeof guardado.pagadaEn).toBe("number");
    expect(guardado.pagadaPor).toEqual({ uid: "u1", nombre: "Yasbleidy" });
  });

  it("al desmarcar la devuelve a emitida y limpia el rastro del pago", async () => {
    await marcarCuentaPagada("abc", false, usuario);

    const guardado = mocks.updateDoc.mock.calls[0][1];
    expect(guardado.status).toBe("creada");
    expect(guardado.pagadaEn).toBeNull();
    expect(guardado.pagadaPor).toBeNull();
  });

  // El conteo del mes cuenta por `emitida`, así que cobrar una cuenta no puede
  // bajar el número: diría cuánto falta cobrar en vez de cuánto se facturó.
  it("no toca el campo emitida", async () => {
    await marcarCuentaPagada("abc", true, usuario);
    expect(mocks.updateDoc.mock.calls[0][1]).not.toHaveProperty("emitida");
  });
});

describe("eliminarCuentaCobro", () => {
  it("borra el documento por su id", async () => {
    await eliminarCuentaCobro("abc");
    expect(mocks.doc).toHaveBeenCalledWith({}, COLECCION, "abc");
    expect(mocks.deleteDoc).toHaveBeenCalled();
  });
});
