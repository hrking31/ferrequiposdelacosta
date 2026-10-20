import achicarImagen from "./achicarImagen";

// Achicar la foto del documento antes de subirla. Lo que importa: que una
// foto grande baje a 1600 px por el lado mayor, y que si el navegador no
// puede abrirla con createImageBitmap (la tableta del gestor, 2026-10-20) se
// abra con una <img>, como la vista previa, en vez de dejar el documento sin
// subir.
const lienzo = vi.hoisted(() => ({
  drawImage: vi.fn(),
  tamanos: [],
  foto: new Blob(["jpeg"], { type: "image/jpeg" }),
}));

// La <img> de mentira: "carga" la foto con el tamaño que se le diga.
let tamanoDeLaImg = { naturalWidth: 0, naturalHeight: 0 };
let imgFalla = false;
class ImgDePrueba {
  set src(_enlace) {
    Object.assign(this, tamanoDeLaImg);
    setTimeout(() => (imgFalla ? this.onerror?.() : this.onload?.()));
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  lienzo.tamanos = [];
  imgFalla = false;
  vi.stubGlobal("Image", ImgDePrueba);
  URL.createObjectURL = vi.fn(() => "blob:foto");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function () {
    lienzo.tamanos.push([this.width, this.height]);
    return { drawImage: lienzo.drawImage };
  });
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((listo) =>
    listo(lienzo.foto),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const archivo = new File(["x"], "cedula.jpg", { type: "image/jpeg" });

describe("achicarImagen", () => {
  it("baja una foto grande a 1600 px por el lado mayor", async () => {
    const mapa = { width: 4000, height: 3000, close: vi.fn() };
    vi.stubGlobal("createImageBitmap", vi.fn(() => Promise.resolve(mapa)));

    const foto = await achicarImagen(archivo);

    expect(foto).toBe(lienzo.foto);
    expect(lienzo.tamanos).toEqual([[1600, 1200]]);
    expect(lienzo.drawImage).toHaveBeenCalledWith(mapa, 0, 0, 1600, 1200);
    expect(mapa.close).toHaveBeenCalled();
  });

  it("una foto chica no se agranda", async () => {
    const mapa = { width: 800, height: 600, close: vi.fn() };
    vi.stubGlobal("createImageBitmap", vi.fn(() => Promise.resolve(mapa)));

    await achicarImagen(archivo);

    expect(lienzo.tamanos).toEqual([[800, 600]]);
  });

  it("si createImageBitmap no puede, la abre con una <img> y la achica igual", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(() => Promise.reject(new DOMException("invalid", "InvalidStateError"))),
    );
    tamanoDeLaImg = { naturalWidth: 3000, naturalHeight: 4000 };

    const foto = await achicarImagen(archivo);

    expect(foto).toBe(lienzo.foto);
    expect(lienzo.tamanos).toEqual([[1200, 1600]]);
    expect(lienzo.drawImage).toHaveBeenCalledWith(
      expect.any(ImgDePrueba), 0, 0, 1200, 1600,
    );
    // El enlace de la foto se suelta al terminar.
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:foto");
  });

  it("si tampoco la <img> puede abrirla, avisa el error", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(() => Promise.reject(new Error("no"))));
    imgFalla = true;

    await expect(achicarImagen(archivo)).rejects.toThrow("No se pudo abrir la foto.");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:foto");
  });
});
