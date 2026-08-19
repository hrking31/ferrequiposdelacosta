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

vi.mock("../Firebase/Firebase", () => ({ db: {} }));

vi.mock("firebase/firestore", () => ({
  // collection y doc devuelven la ruta como texto, así la prueba puede afirmar
  // a QUÉ documento se escribió sin necesitar una base de verdad.
  collection: (_db, ...partes) => partes.join("/"),
  doc: (primero, ...partes) => (partes.length ? partes.join("/") : `${primero}/nuevo`),
  getDocs: bd.getDocs,
  setDoc: bd.setDoc,
  updateDoc: bd.updateDoc,
  writeBatch: () => ({ delete: bd.borrarEnLote, commit: bd.confirmarLote }),
}));

const abrir = (props = {}) =>
  renderConProviders(<ClienteFormDialog open onClose={() => {}} {...props} />);

beforeEach(() => {
  vi.clearAllMocks();
  bd.getDocs.mockResolvedValue({ size: 0, forEach: () => {} });
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
    const [ruta, datos] = bd.setDoc.mock.calls[0];
    expect(ruta).toBe("clientes/nuevo");
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
    const [ruta, datos] = bd.updateDoc.mock.calls[0];
    expect(ruta).toBe("clientes/cli1");
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
    expect(bd.borrarEnLote).toHaveBeenLastCalledWith("clientes/cli1");
    expect(bd.confirmarLote).toHaveBeenCalledTimes(1);
    expect(alEliminar).toHaveBeenCalled();
  });
});
