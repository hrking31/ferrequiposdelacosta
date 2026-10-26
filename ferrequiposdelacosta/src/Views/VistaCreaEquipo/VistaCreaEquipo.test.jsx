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
// El encabezado no es lo que se prueba acá.
vi.mock("../../Components/HeaderUsuario/HeaderUsuario", () => ({ default: () => null }));

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

describe("VistaCreaEquipo — el catálogo al lado", () => {
  it("en el computador, la lista sale de la memoria sin leer nada", () => {
    abrir([{ name: "RANA" }, { name: "ANDAMIO" }]);

    expect(screen.getByText("Catálogo")).toBeInTheDocument();
    expect(screen.getByText("ANDAMIO")).toBeInTheDocument();
    expect(screen.getByText("RANA")).toBeInTheDocument();
    expect(nube.getDocs).not.toHaveBeenCalled();
  });

  it("con la memoria vacía (se recargó acá), baja el catálogo una vez", async () => {
    nube.getDocs.mockResolvedValueOnce({
      docs: [{ id: "e1", data: () => ({ name: "MEZCLADORA" }) }],
    });
    abrir();

    expect(await screen.findByText("MEZCLADORA")).toBeInTheDocument();
    expect(nube.getDocs).toHaveBeenCalledTimes(1);
  });

  describe("en el celular", () => {
    const matchMediaOriginal = window.matchMedia;
    beforeEach(() => {
      window.matchMedia = (query) => ({
        ...matchMediaOriginal(query),
        matches: query.includes("max-width"),
      });
    });
    afterEach(() => {
      window.matchMedia = matchMediaOriginal;
    });

    it("la lista va en una ventana que abre «Ver catálogo»", async () => {
      const { usuario } = abrir([{ name: "ANDAMIO" }]);

      // No hay columna: no entra.
      expect(screen.queryByText("ANDAMIO")).not.toBeInTheDocument();

      await usuario.click(screen.getByRole("button", { name: "VER CATÁLOGO" }));
      const dialogo = await screen.findByRole("dialog");
      expect(dialogo).toHaveTextContent("Equipos del catálogo");
      expect(dialogo).toHaveTextContent("ANDAMIOTotal1");
    });
  });
});
