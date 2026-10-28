import achicarImagen from "./achicarImagen";

// Achicar una foto antes de subirla. El lienzo del navegador no existe en las
// pruebas: se simula, y lo que se mira son las decisiones de acá —el tamaño,
// el formato pedido y qué pasa si el navegador no sabe hacerlo—.
let contexto;
let lienzos;

// `sabeWebp`: si el navegador entrega WebP cuando se le pide (Safari no:
// entrega PNG).
const simularNavegador = ({ sabeWebp = true } = {}) => {
  globalThis.createImageBitmap = vi.fn(() =>
    Promise.resolve({ width: 4000, height: 3000, close: vi.fn() }),
  );
  contexto = { fillRect: vi.fn(), drawImage: vi.fn(), fillStyle: "" };
  lienzos = [];
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function () {
    lienzos.push(this);
    return contexto;
  });
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((listo, tipo) =>
    listo(new Blob(["x"], { type: tipo === "image/webp" && !sabeWebp ? "image/png" : tipo })),
  );
};

afterEach(() => {
  vi.restoreAllMocks();
  delete globalThis.createImageBitmap;
});

const foto = new File(["x"], "andamio.jpg", { type: "image/jpeg" });

describe("achicarImagen", () => {
  it("sin pedir nada: JPEG a 1600 px por el lado mayor, sobre blanco", async () => {
    simularNavegador();

    const achicada = await achicarImagen(foto);

    expect(achicada.type).toBe("image/jpeg");
    expect(lienzos[0].width).toBe(1600);
    expect(lienzos[0].height).toBe(1200);
    expect(contexto.fillRect).toHaveBeenCalled();
  });

  it("WebP pedido y sabido: WebP, sin pintar el fondo (conserva lo transparente)", async () => {
    simularNavegador();

    const achicada = await achicarImagen(foto, { ladoMayor: 500, tipo: "image/webp" });

    expect(achicada.type).toBe("image/webp");
    expect(lienzos[0].width).toBe(500);
    expect(contexto.fillRect).not.toHaveBeenCalled();
  });

  it("si el navegador no sabe hacer WebP, sale en JPEG sobre blanco y no en PNG", async () => {
    simularNavegador({ sabeWebp: false });

    const achicada = await achicarImagen(foto, { tipo: "image/webp" });

    expect(achicada.type).toBe("image/jpeg");
    // Lo transparente no queda negro.
    expect(contexto.fillRect).toHaveBeenCalledTimes(1);
  });

  it("nunca agranda una foto que ya es chica", async () => {
    simularNavegador();
    globalThis.createImageBitmap = vi.fn(() =>
      Promise.resolve({ width: 300, height: 200, close: vi.fn() }),
    );

    await achicarImagen(foto, { ladoMayor: 500, tipo: "image/webp" });

    expect(lienzos[0].width).toBe(300);
    expect(lienzos[0].height).toBe(200);
  });
});
