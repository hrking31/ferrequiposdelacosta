import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import ClienteFormDialog from "./ClienteFormDialog";

// El formulario donde se da de alta, se edita y se elimina un cliente. Es un
// solo diálogo que cambia de forma según sea persona o empresa, y el que más
// cerca está de borrar datos de verdad: al eliminar un cliente se van también
// todas sus facturas.
//
// Lo que se fija acá: que el formulario cambie de campos con el tipo, que no
// deje guardar lo incompleto, que guarde los datos limpios, y que antes de
// borrar diga en voz alta cuántas facturas se lleva por delante.
const bd = vi.hoisted(() => ({
  setDoc: vi.fn(() => Promise.resolve()),
  updateDoc: vi.fn(() => Promise.resolve()),
  getDocs: vi.fn(() => Promise.resolve({ size: 0, forEach: () => {} })),
  borrarEnLote: vi.fn(),
  confirmarLote: vi.fn(() => Promise.resolve()),
}));

// Las fotos del documento van a Storage. `ref` devuelve la ruta, así la
// prueba puede afirmar DÓNDE se subió y QUÉ se borró.
const almacen = vi.hoisted(() => ({
  subir: vi.fn(() => Promise.resolve()),
  borrar: vi.fn(() => Promise.resolve()),
}));

vi.mock("../Firebase/Firebase", () => ({ db: {}, storage: {} }));

vi.mock("firebase/firestore", () => ({
  // collection y doc devuelven la ruta, así la prueba puede afirmar a QUÉ
  // documento se escribió sin necesitar una base de verdad. El doc trae
  // también su `id`, que es lo que nombra la carpeta de las fotos.
  collection: (_db, ...partes) => partes.join("/"),
  doc: (primero, ...partes) => {
    const ruta = partes.length ? partes.join("/") : `${primero}/nuevo`;
    return { path: ruta, id: ruta.split("/").pop() };
  },
  getDocs: bd.getDocs,
  setDoc: bd.setDoc,
  updateDoc: bd.updateDoc,
  writeBatch: () => ({ delete: bd.borrarEnLote, commit: bd.confirmarLote }),
}));

vi.mock("firebase/storage", () => ({
  ref: (_storage, ruta) => ({ ruta }),
  uploadBytes: almacen.subir,
  getDownloadURL: (destino) => Promise.resolve(`https://fotos/${destino.ruta}`),
  deleteObject: almacen.borrar,
}));

// Achicar la foto necesita un navegador de verdad (canvas): acá pasa tal cual.
vi.mock("../../Utils/achicarImagen", () => ({
  default: (archivo) => Promise.resolve(archivo),
}));

const abrir = (props = {}) =>
  renderConProviders(<ClienteFormDialog open onClose={() => {}} {...props} />);

const fotoDePrueba = (nombre = "cedula.jpg") =>
  new File(["foto"], nombre, { type: "image/jpeg" });

// El selector de archivos de cada lado. El input va escondido dentro de la
// tarjeta, así que se lo busca por su nombre.
const inputDeLaTarjeta = (lado) =>
  document.querySelector(`input[name="documento-${lado}"]`);

beforeEach(() => {
  vi.clearAllMocks();
  bd.getDocs.mockResolvedValue({ size: 0, forEach: () => {} });
  // jsdom no arma vistas previas de archivos: se simulan.
  URL.createObjectURL = vi.fn(() => "blob:vista-previa");
  URL.revokeObjectURL = vi.fn();
});

describe("ClienteFormDialog — persona o empresa", () => {
  it("arranca en persona: pide nombres, apellido y cédula", () => {
    abrir();

    expect(screen.getByLabelText("Nombres")).toBeInTheDocument();
    expect(screen.getByLabelText("Apellido")).toBeInTheDocument();
    expect(screen.getByLabelText("Cédula")).toBeInTheDocument();
    expect(screen.queryByLabelText("Razón social")).not.toBeInTheDocument();
  });

  it("al elegir empresa cambia a razón social y el documento pasa a NIT", async () => {
    const { usuario } = abrir();

    await usuario.click(screen.getByRole("radio", { name: "Empresa" }));

    expect(screen.getByLabelText("Razón social")).toBeInTheDocument();
    expect(screen.getByLabelText("NIT")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nombres")).not.toBeInTheDocument();
  });
});

describe("ClienteFormDialog — lo que no deja pasar", () => {
  it("una persona sin nombre ni apellido no se guarda", async () => {
    const { usuario } = abrir();

    await usuario.click(screen.getByRole("button", { name: "Guardar" }));

    expect(screen.getAllByText("Este campo es obligatorio.")).toHaveLength(2);
    expect(bd.setDoc).not.toHaveBeenCalled();
  });

  it("una empresa sin razón social tampoco", async () => {
    const { usuario } = abrir();

    await usuario.click(screen.getByRole("radio", { name: "Empresa" }));
    await usuario.click(screen.getByRole("button", { name: "Guardar" }));

    expect(screen.getByText("Este campo es obligatorio.")).toBeInTheDocument();
    expect(bd.setDoc).not.toHaveBeenCalled();
  });

  it("un teléfono de menos de 7 dígitos no pasa", async () => {
    const { usuario } = abrir();

    await usuario.type(screen.getByLabelText("Nombres"), "Aida");
    await usuario.type(screen.getByLabelText("Apellido"), "Pérez");
    await usuario.type(screen.getByLabelText("Teléfono"), "12345");
    await usuario.click(screen.getByRole("button", { name: "Guardar" }));

    expect(screen.getByText("Debe tener al menos 7 dígitos.")).toBeInTheDocument();
    expect(bd.setDoc).not.toHaveBeenCalled();
  });

  it("el teléfono descarta letras y signos mientras se escribe", async () => {
    const { usuario } = abrir();

    await usuario.type(screen.getByLabelText("Teléfono"), "(311) 657-66ab33");

    expect(screen.getByLabelText("Teléfono")).toHaveValue("3116576633");
  });
});

describe("ClienteFormDialog — guardar", () => {
  it("da de alta al cliente sin espacios de más y como inactivo", async () => {
    const alGuardar = vi.fn();
    const alCerrar = vi.fn();
    const { usuario } = abrir({ onGuardado: alGuardar, onClose: alCerrar });

    await usuario.type(screen.getByLabelText("Nombres"), "  Aida  ");
    await usuario.type(screen.getByLabelText("Apellido"), "Pérez");
    await usuario.click(screen.getByRole("button", { name: "Guardar" }));

    expect(bd.setDoc).toHaveBeenCalledTimes(1);
    const [ref, datos] = bd.setDoc.mock.calls[0];
    expect(ref.path).toBe("clientes/nuevo");
    expect(datos.nombres).toBe("Aida");
    expect(datos.apellido).toBe("Pérez");
    // Un cliente recién creado todavía no alquiló nada.
    expect(datos.estado).toBe("inactivo");

    expect(alGuardar).toHaveBeenCalled();
    expect(alCerrar).toHaveBeenCalled();
  });

  it("una empresa no arrastra los campos de persona, ni al revés", async () => {
    const { usuario } = abrir();

    await usuario.type(screen.getByLabelText("Nombres"), "Aida");
    await usuario.click(screen.getByRole("radio", { name: "Empresa" }));
    await usuario.type(screen.getByLabelText("Razón social"), "Constructora SAS");
    await usuario.click(screen.getByRole("button", { name: "Guardar" }));

    const [, datos] = bd.setDoc.mock.calls[0];
    expect(datos.razonSocial).toBe("Constructora SAS");
    expect(datos.nombres).toBe("");
    expect(datos.apellido).toBe("");
  });

  it("editando, actualiza al cliente que ya existe en vez de crear otro", async () => {
    const { usuario } = abrir({
      cliente: { id: "cli1", tipo: "persona", nombres: "Aida", apellido: "Pérez" },
    });

    // Al abrir en edición, el formulario ya viene con los datos cargados.
    expect(screen.getByLabelText("Nombres")).toHaveValue("Aida");

    await usuario.clear(screen.getByLabelText("Apellido"));
    await usuario.type(screen.getByLabelText("Apellido"), "Gómez");
    await usuario.click(screen.getByRole("button", { name: "Guardar" }));

    expect(bd.setDoc).not.toHaveBeenCalled();
    const [ref, datos] = bd.updateDoc.mock.calls[0];
    expect(ref.path).toBe("clientes/cli1");
    expect(datos.apellido).toBe("Gómez");
  });
});

describe("ClienteFormDialog — eliminar", () => {
  it("solo ofrece eliminar cuando se está editando", () => {
    abrir();

    expect(screen.queryByRole("button", { name: "Eliminar" })).not.toBeInTheDocument();
  });

  it("antes de borrar avisa cuántas facturas se lleva por delante", async () => {
    bd.getDocs.mockResolvedValue({ size: 3, forEach: () => {} });
    const { usuario } = abrir({ cliente: { id: "cli1", tipo: "persona", nombres: "Aida" } });

    await usuario.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(
      await screen.findByText("Se eliminarán también sus 3 facturas registradas."),
    ).toBeInTheDocument();
    // Preguntar no borra nada todavía.
    expect(bd.confirmarLote).not.toHaveBeenCalled();
  });

  it("si el cliente no tiene facturas, lo dice", async () => {
    const { usuario } = abrir({ cliente: { id: "cli1", tipo: "persona", nombres: "Aida" } });

    await usuario.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(
      await screen.findByText("Este cliente no tiene facturas registradas."),
    ).toBeInTheDocument();
  });

  it("al confirmar borra las facturas y después el cliente, todo junto", async () => {
    const facturas = [{ ref: "clientes/cli1/facturas/f1" }, { ref: "clientes/cli1/facturas/f2" }];
    bd.getDocs.mockResolvedValue({
      size: facturas.length,
      forEach: (fn) => facturas.forEach(fn),
    });
    const alEliminar = vi.fn();
    const { usuario } = abrir({
      cliente: { id: "cli1", tipo: "persona", nombres: "Aida" },
      onEliminado: alEliminar,
    });

    await usuario.click(screen.getByRole("button", { name: "Eliminar" }));
    await usuario.click(
      await screen.findByRole("button", { name: "Sí, eliminar definitivamente" }),
    );

    // Las dos facturas y el cliente: tres borrados en una sola operación, para
    // que no pueda quedar un cliente a medio borrar.
    expect(bd.borrarEnLote).toHaveBeenCalledTimes(3);
    expect(bd.borrarEnLote).toHaveBeenLastCalledWith(
      expect.objectContaining({ path: "clientes/cli1" }),
    );
    expect(bd.confirmarLote).toHaveBeenCalledTimes(1);
    expect(alEliminar).toHaveBeenCalled();
    // Sin fotos no hay nada que borrar en Storage.
    expect(almacen.borrar).not.toHaveBeenCalled();
  });

  it("al eliminar al cliente se borran también las fotos de su documento", async () => {
    const { usuario } = abrir({
      cliente: {
        id: "cli1",
        tipo: "persona",
        nombres: "Aida",
        documento: { frente: "https://viejo/frente", atras: "https://viejo/atras" },
      },
    });

    await usuario.click(screen.getByRole("button", { name: "Eliminar" }));
    await usuario.click(
      await screen.findByRole("button", { name: "Sí, eliminar definitivamente" }),
    );

    await vi.waitFor(() => expect(almacen.borrar).toHaveBeenCalledTimes(2));
    expect(almacen.borrar).toHaveBeenCalledWith({ ruta: "https://viejo/frente" });
    expect(almacen.borrar).toHaveBeenCalledWith({ ruta: "https://viejo/atras" });
  });
});

describe("ClienteFormDialog — fotos del documento", () => {
  const MENSAJE_FALLA =
    "No se pudo subir la foto del documento. Intentá de nuevo.";

  it("trae las dos tarjetas, frente y atrás, y se tocan para elegir la foto", () => {
    abrir();

    expect(
      screen.getByRole("button", { name: "Elegir foto del frente" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Elegir foto del atrás" }),
    ).toBeInTheDocument();
  });

  it("las empresas también los tienen", async () => {
    const { usuario } = abrir();

    await usuario.click(screen.getByRole("radio", { name: "Empresa" }));

    expect(
      screen.getByRole("button", { name: "Elegir foto del frente" }),
    ).toBeInTheDocument();
  });

  it("al elegir una foto se ve antes de guardar, y se puede quitar", async () => {
    const { usuario } = abrir();

    await usuario.upload(inputDeLaTarjeta("frente"), fotoDePrueba());

    expect(screen.getByRole("img", { name: "Documento, frente" })).toHaveAttribute(
      "src",
      "blob:vista-previa",
    );
    // Elegir no sube nada: eso pasa al guardar.
    expect(almacen.subir).not.toHaveBeenCalled();

    await usuario.click(screen.getByRole("button", { name: "Quitar el frente" }));

    expect(screen.queryByRole("img", { name: "Documento, frente" })).not.toBeInTheDocument();
  });

  describe("en pantalla táctil", () => {
    const matchMediaOriginal = window.matchMedia;
    beforeEach(() => {
      window.matchMedia = (query) => ({
        ...matchMediaOriginal(query),
        matches: query.includes("pointer: coarse"),
      });
    });
    afterEach(() => {
      window.matchMedia = matchMediaOriginal;
    });

    it("tocar la tarjeta ofrece tomar la foto o elegirla de la galería", async () => {
      const { usuario } = abrir();

      await usuario.click(screen.getByRole("button", { name: "Elegir foto del frente" }));

      expect(screen.getByRole("menuitem", { name: "Tomar foto" })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: "Elegir de la galería" })).toBeInTheDocument();
    });

    it("«Tomar foto» abre el selector con cámara", async () => {
      const { usuario } = abrir();
      const camara = document.querySelector('input[name="documento-frente-camara"]');
      const abrirCamara = vi.spyOn(camara, "click");

      await usuario.click(screen.getByRole("button", { name: "Elegir foto del frente" }));
      await usuario.click(screen.getByRole("menuitem", { name: "Tomar foto" }));

      expect(camara).toHaveAttribute("capture", "environment");
      expect(abrirCamara).toHaveBeenCalledTimes(1);
    });

    it("la foto de la cámara se pone igual que la de la galería", async () => {
      const { usuario } = abrir();

      await usuario.upload(
        document.querySelector('input[name="documento-atras-camara"]'),
        fotoDePrueba(),
      );

      expect(screen.getByRole("img", { name: "Documento, atrás" })).toBeInTheDocument();
    });
  });

  it("sin fotos se guarda como siempre: no sube nada ni agrega el campo", async () => {
    const { usuario } = abrir();

    await usuario.type(screen.getByLabelText("Nombres"), "Aida");
    await usuario.type(screen.getByLabelText("Apellido"), "Pérez");
    await usuario.click(screen.getByRole("button", { name: "Guardar" }));

    expect(almacen.subir).not.toHaveBeenCalled();
    const [, datos] = bd.setDoc.mock.calls[0];
    expect(datos).not.toHaveProperty("documento");
  });

  it("cliente nuevo con foto: la sube a SU carpeta y guarda el enlace en el cliente", async () => {
    const alCerrar = vi.fn();
    const { usuario } = abrir({ onClose: alCerrar });

    await usuario.type(screen.getByLabelText("Nombres"), "Aida");
    await usuario.type(screen.getByLabelText("Apellido"), "Pérez");
    await usuario.upload(inputDeLaTarjeta("frente"), fotoDePrueba());
    await usuario.click(screen.getByRole("button", { name: "Guardar" }));

    // La carpeta lleva el id que se le pidió al cliente nuevo ANTES de
    // guardarlo, y el cliente se escribe con ese mismo id.
    const [destino] = almacen.subir.mock.calls[0];
    expect(destino.ruta).toMatch(/^documentos\/nuevo\/frente-\d+\.jpg$/);
    const [ref, datos] = bd.setDoc.mock.calls[0];
    expect(ref.id).toBe("nuevo");
    expect(datos.documento).toEqual({
      frente: `https://fotos/${destino.ruta}`,
      atras: "",
    });
    expect(alCerrar).toHaveBeenCalled();
  });

  it("si la foto no sube, el cliente NO se guarda, avisa y el formulario sigue abierto", async () => {
    almacen.subir.mockRejectedValueOnce(new Error("sin señal"));
    const alCerrar = vi.fn();
    const { usuario } = abrir({ onClose: alCerrar });

    await usuario.type(screen.getByLabelText("Nombres"), "Aida");
    await usuario.type(screen.getByLabelText("Apellido"), "Pérez");
    await usuario.upload(inputDeLaTarjeta("frente"), fotoDePrueba());
    await usuario.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText(MENSAJE_FALLA)).toBeInTheDocument();
    expect(bd.setDoc).not.toHaveBeenCalled();
    expect(alCerrar).not.toHaveBeenCalled();
    // Lo escrito y la foto siguen ahí para volver a intentar.
    expect(screen.getByLabelText("Nombres")).toHaveValue("Aida");
    expect(screen.getByRole("img", { name: "Documento, frente" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled();
  });

  it("si la foto subió pero el cliente no se pudo guardar, la foto se borra", async () => {
    bd.setDoc.mockRejectedValueOnce(new Error("sin permiso"));
    const { usuario } = abrir();

    await usuario.type(screen.getByLabelText("Nombres"), "Aida");
    await usuario.type(screen.getByLabelText("Apellido"), "Pérez");
    await usuario.upload(inputDeLaTarjeta("atras"), fotoDePrueba());
    await usuario.click(screen.getByRole("button", { name: "Guardar" }));

    const [destino] = almacen.subir.mock.calls[0];
    await vi.waitFor(() =>
      expect(almacen.borrar).toHaveBeenCalledWith({ ruta: `https://fotos/${destino.ruta}` }),
    );
  });

  it("editando, cambiar una foto guarda la nueva y DESPUÉS borra la vieja", async () => {
    const { usuario } = abrir({
      cliente: {
        id: "cli1",
        tipo: "persona",
        nombres: "Aida",
        apellido: "Pérez",
        documento: { frente: "https://viejo/frente", atras: "https://viejo/atras" },
      },
    });

    // Al abrir en edición se ven las que ya tiene.
    expect(screen.getByRole("img", { name: "Documento, frente" })).toHaveAttribute(
      "src",
      "https://viejo/frente",
    );

    await usuario.upload(inputDeLaTarjeta("frente"), fotoDePrueba());
    await usuario.click(screen.getByRole("button", { name: "Guardar" }));

    const [destino] = almacen.subir.mock.calls[0];
    expect(destino.ruta).toMatch(/^documentos\/cli1\/frente-\d+\.jpg$/);
    const [, datos] = bd.updateDoc.mock.calls[0];
    expect(datos.documento).toEqual({
      frente: `https://fotos/${destino.ruta}`,
      atras: "https://viejo/atras",
    });
    // Solo la que se cambió; la de atrás sigue en uso.
    expect(almacen.borrar).toHaveBeenCalledTimes(1);
    expect(almacen.borrar).toHaveBeenCalledWith({ ruta: "https://viejo/frente" });
    expect(bd.updateDoc.mock.invocationCallOrder[0]).toBeLessThan(
      almacen.borrar.mock.invocationCallOrder[0],
    );
  });

  it("editando, quitar una foto deja ese lado vacío y borra la guardada", async () => {
    const { usuario } = abrir({
      cliente: {
        id: "cli1",
        tipo: "persona",
        nombres: "Aida",
        apellido: "Pérez",
        documento: { frente: "", atras: "https://viejo/atras" },
      },
    });

    await usuario.click(screen.getByRole("button", { name: "Quitar el atrás" }));
    // Quitar no borra nada todavía: recién al guardar.
    expect(almacen.borrar).not.toHaveBeenCalled();
    await usuario.click(screen.getByRole("button", { name: "Guardar" }));

    const [, datos] = bd.updateDoc.mock.calls[0];
    expect(datos.documento).toEqual({ frente: "", atras: "" });
    expect(almacen.borrar).toHaveBeenCalledWith({ ruta: "https://viejo/atras" });
  });

  it("editando un cliente que nunca tuvo fotos, no le agrega el campo", async () => {
    const { usuario } = abrir({
      cliente: { id: "cli1", tipo: "persona", nombres: "Aida", apellido: "Pérez" },
    });

    await usuario.click(screen.getByRole("button", { name: "Guardar" }));

    const [, datos] = bd.updateDoc.mock.calls[0];
    expect(datos).not.toHaveProperty("documento");
  });
});
