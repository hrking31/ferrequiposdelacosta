import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import VistaCreaEquipo from "./VistaCreaEquipo";

// La pantalla de crear equipo muestra los que ya hay en el catálogo, para no
// repetir uno (2026-10-26). Lo que importa: que salgan del catálogo en memoria
// sin leer nada, y que solo se baje si la memoria está vacía.
const nube = vi.hoisted(() => ({
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
}));

vi.mock("../../Components/Firebase/Firebase", () => ({ db: {}, storage: {} }));
vi.mock("firebase/firestore", () => ({
  collection: (_db, nombre) => nombre,
  doc: () => ({ id: "eq-nuevo" }),
  setDoc: vi.fn(),
  getDocs: nube.getDocs,
}));
vi.mock("firebase/storage", () => ({ ref: vi.fn(), uploadBytes: vi.fn(), getDownloadURL: vi.fn() }));
// Del encabezado solo importan los botones de la vista.
vi.mock("../../Components/HeaderUsuario/HeaderUsuario", () => ({
  default: function HeaderFalso({ acciones }) {
    return <div>{acciones}</div>;
  },
}));

const abrir = (equipos = []) =>
  renderConProviders(<VistaCreaEquipo />, {
    estadoInicial: {
      user: { name: "Aida", photoURL: "", role: "gestorEditor", genero: "femenino" },
      equipos: { equipos, loading: false, error: null },
    },
  });

beforeEach(() => {
  vi.clearAllMocks();
});

// Una pantalla así de ancha o más: todas las medidas de ancho mínimo coinciden.
const conPantalla = (coincide) => {
  const matchMediaOriginal = window.matchMedia;
  beforeEach(() => {
    window.matchMedia = (query) => ({ ...matchMediaOriginal(query), matches: coincide(query) });
  });
  afterEach(() => {
    window.matchMedia = matchMediaOriginal;
  });
};

describe("VistaCreaEquipo — el catálogo al lado, en el computador ancho", () => {
  conPantalla((query) => query.includes("min-width"));

  it("la lista sale de la memoria sin leer nada", () => {
    abrir([{ name: "RANA" }, { name: "ANDAMIO" }]);

    expect(screen.getByText("Catálogo · 2")).toBeInTheDocument();
    expect(screen.getByText("ANDAMIO")).toBeInTheDocument();
    expect(screen.getByText("RANA")).toBeInTheDocument();
    // Con la columna no hace falta el botón.
    expect(screen.queryByRole("button", { name: "VER CATÁLOGO" })).not.toBeInTheDocument();
    expect(nube.getDocs).not.toHaveBeenCalled();
  });

  it("Crear y Cancelar van en el encabezado y llegan al formulario", async () => {
    const { usuario } = abrir([{ name: "ANDAMIO" }]);

    // Al pie del formulario ya no están.
    expect(screen.queryByRole("button", { name: "CREAR EQUIPO" })).not.toBeInTheDocument();

    // Cancelar limpia lo escrito.
    await usuario.type(screen.getByLabelText(/Nombre del equipo/), "RANA");
    await usuario.click(screen.getByRole("button", { name: "Cancelar y limpiar el formulario" }));
    expect(screen.getByLabelText(/Nombre del equipo/)).toHaveValue("");

    // Crear envía el formulario: vacío, avisa lo que falta.
    await usuario.click(screen.getByRole("button", { name: "Crear equipo" }));
    expect(await screen.findByText("Todos los campos son obligatorios.")).toBeInTheDocument();
  });

  it("con la memoria vacía (se recargó acá), baja el catálogo una vez", async () => {
    nube.getDocs.mockResolvedValueOnce({
      docs: [{ id: "e1", data: () => ({ name: "MEZCLADORA" }) }],
    });
    abrir();

    expect(await screen.findByText("MEZCLADORA")).toBeInTheDocument();
    expect(nube.getDocs).toHaveBeenCalledTimes(1);
  });

});

describe("VistaCreaEquipo — en el celular", () => {
  conPantalla((query) => query.includes("max-width"));

  it("el pie trae catálogo, crear, cancelar y menú; el catálogo abre la lista", async () => {
    const { usuario } = abrir([{ name: "ANDAMIO" }]);

    // No hay columna: no entra.
    expect(screen.queryByText("ANDAMIO")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ir al menú" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear equipo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar y limpiar el formulario" })).toBeInTheDocument();
    // Ni el botón de antes ni los del pie del formulario.
    expect(screen.queryByRole("button", { name: "VER CATÁLOGO" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "CREAR EQUIPO" })).not.toBeInTheDocument();

    // Solo el ícono, como los demás del pie.
    await usuario.click(screen.getByRole("button", { name: "EQUIPOS" }));
    const dialogo = await screen.findByRole("dialog");
    expect(dialogo).toHaveTextContent("Equipos del catálogo · 1");
    expect(dialogo).toHaveTextContent("ANDAMIO");
  });
});

describe("VistaCreaEquipo — computador sin lugar para la columna", () => {
  // Más de 915px (no es celular) pero menos de 1520: ninguna medida coincide.
  conPantalla(() => false);

  it("el catálogo se abre desde el encabezado y no hay pie", async () => {
    const { usuario } = abrir([{ name: "ANDAMIO" }]);

    expect(screen.queryByRole("button", { name: "Ir al menú" })).not.toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Ver catálogo" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("ANDAMIO");
  });
});
