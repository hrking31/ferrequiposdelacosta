import {
  borrarFotoDocumento,
  descartarFotos,
  enlacesDelDocumento,
  fotosQueSobran,
  subirFotosDocumento,
  tieneDocumento,
} from "./documentoCliente";

// Las fotos del documento del cliente en Storage: dónde se suben, qué se
// guarda en el cliente, y que nunca queden fotos sueltas de un guardado que
// no ocurrió.
const almacen = vi.hoisted(() => ({
  subir: vi.fn(() => Promise.resolve()),
  borrar: vi.fn(() => Promise.resolve()),
  achicar: vi.fn((archivo) => Promise.resolve({ achicada: archivo })),
}));

vi.mock("../Firebase/Firebase", () => ({ storage: {} }));

vi.mock("firebase/storage", () => ({
  // ref devuelve la ruta, así la prueba puede afirmar DÓNDE se subió.
  ref: (_storage, ruta) => ({ ruta }),
  uploadBytes: almacen.subir,
  getDownloadURL: (destino) => Promise.resolve(`https://fotos/${destino.ruta}`),
  deleteObject: almacen.borrar,
}));

vi.mock("../../Utils/achicarImagen", () => ({ default: almacen.achicar }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("documentoCliente — subir", () => {
  it("sin fotos nuevas no sube nada y deja los enlaces que había", async () => {
    const { documento, subidas } = await subirFotosDocumento("cli1", {
      frente: { url: "https://viejo/frente", archivo: null },
      atras: { url: "", archivo: null },
    });

    expect(almacen.subir).not.toHaveBeenCalled();
    expect(documento).toEqual({ frente: "https://viejo/frente", atras: "" });
    expect(subidas).toEqual([]);
  });

  it("sube la foto ACHICADA a la carpeta del cliente, como JPEG", async () => {
    const archivo = { nombre: "cedula.png" };

    const { documento, subidas } = await subirFotosDocumento("cli1", {
      frente: { url: "", archivo },
      atras: { url: "https://viejo/atras", archivo: null },
    });

    expect(almacen.achicar).toHaveBeenCalledWith(archivo);
    const [destino, foto, metadatos] = almacen.subir.mock.calls[0];
    // Con la hora en el nombre: cambiar la foto cambia el enlace.
    expect(destino.ruta).toMatch(/^documentos\/cli1\/frente-\d+\.jpg$/);
    expect(foto).toEqual({ achicada: archivo });
    expect(metadatos).toEqual({ contentType: "image/jpeg" });

    expect(documento.frente).toBe(`https://fotos/${destino.ruta}`);
    expect(documento.atras).toBe("https://viejo/atras");
    expect(subidas).toEqual([documento.frente]);
  });

  it("si la segunda no sube, borra la primera que sí subió y avisa", async () => {
    almacen.subir
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error("sin señal"));

    await expect(
      subirFotosDocumento("cli1", {
        frente: { url: "", archivo: { nombre: "f" } },
        atras: { url: "", archivo: { nombre: "a" } },
      }),
    ).rejects.toThrow("sin señal");

    const [destinoFrente] = almacen.subir.mock.calls[0];
    expect(almacen.borrar).toHaveBeenCalledTimes(1);
    expect(almacen.borrar).toHaveBeenCalledWith({
      ruta: `https://fotos/${destinoFrente.ruta}`,
    });
  });
});

describe("documentoCliente — borrar", () => {
  it("una foto que ya no estaba no es un error", async () => {
    almacen.borrar.mockRejectedValueOnce({ code: "storage/object-not-found" });

    await expect(borrarFotoDocumento("https://viejo/frente")).resolves.toBeUndefined();
  });

  it("cualquier otro error sí se avisa", async () => {
    almacen.borrar.mockRejectedValueOnce({ code: "storage/unauthorized" });

    await expect(borrarFotoDocumento("https://viejo/frente")).rejects.toEqual({
      code: "storage/unauthorized",
    });
  });

  it("al limpiar varias, una que falla no frena a las demás", async () => {
    almacen.borrar.mockRejectedValueOnce({ code: "storage/unauthorized" });

    await descartarFotos(["https://a", "", "https://b"]);

    // El vacío se salta; las otras dos se intentan las dos.
    expect(almacen.borrar).toHaveBeenCalledTimes(2);
  });
});

describe("documentoCliente — qué sobra y qué hay", () => {
  it("sobran la foto que se cambió y la que se quitó, no la que sigue igual", () => {
    expect(
      fotosQueSobran(
        { frente: "https://viejo/frente", atras: "https://viejo/atras" },
        { frente: "https://nuevo/frente", atras: "https://viejo/atras" },
      ),
    ).toEqual(["https://viejo/frente"]);

    expect(
      fotosQueSobran({ frente: "", atras: "https://viejo/atras" }, { frente: "", atras: "" }),
    ).toEqual(["https://viejo/atras"]);
  });

  it("un cliente sin fotos no tiene nada que sobre", () => {
    expect(fotosQueSobran(undefined, { frente: "https://nuevo", atras: "" })).toEqual([]);
  });

  it("tiene documento si tiene al menos un lado", () => {
    expect(tieneDocumento({ documento: { frente: "", atras: "https://a" } })).toBe(true);
    expect(tieneDocumento({ documento: { frente: "", atras: "" } })).toBe(false);
    expect(tieneDocumento({})).toBe(false);
    expect(enlacesDelDocumento({ frente: "https://f", atras: "" })).toEqual(["https://f"]);
  });
});
