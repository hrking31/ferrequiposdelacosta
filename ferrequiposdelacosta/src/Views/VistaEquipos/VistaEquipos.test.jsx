import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { renderConProviders } from "../../test/utils";
import VistaEquipos from "./VistaEquipos";

// EQUIPOS: ver, editar y eliminar en una sola pantalla (2026-10-26). Lo que
// importa: la lista sale de la memoria sin leer nada; tocar un equipo abre su
// ficha y EDITAR su editor; borrar exige escribir el nombre; y no se deja un
// equipo con cambios sin guardar sin preguntar.
const nube = vi.hoisted(() => ({
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  deleteDoc: vi.fn(() => Promise.resolve()),
  listAll: vi.fn(() => Promise.resolve({ items: [] })),
  deleteObject: vi.fn(() => Promise.resolve()),
}));

vi.mock("../../Components/Firebase/Firebase", () => ({ db: {}, storage: {} }));
vi.mock("firebase/firestore", () => ({
  collection: (_db, nombre) => nombre,
  doc: (_db, ...partes) => partes.join("/"),
  getDocs: nube.getDocs,
  deleteDoc: nube.deleteDoc,
  updateDoc: vi.fn(),
}));
vi.mock("firebase/storage", () => ({
  ref: (_storage, ruta) => ({ fullPath: ruta }),
  listAll: nube.listAll,
  deleteObject: nube.deleteObject,
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
}));
// Del encabezado solo importan los botones de la vista.
vi.mock("../../Components/HeaderUsuario/HeaderUsuario", () => ({
  default: function HeaderFalso({ acciones }) {
    return <div>{acciones}</div>;
  },
}));

const catalogo = [
  { id: "e1", name: "RANA", description: "Vibrocompactador", images: [], variantes: [] },
  { id: "e2", name: "ANDAMIO", description: "Metálico", images: [], variantes: [] },
];

const abrir = (ruta = "/vistaequipos") =>
  renderConProviders(
    <Routes>
      <Route path="/vistaequipos/:id?" element={<VistaEquipos />} />
      <Route path="/vistaequipos/:id/editar" element={<VistaEquipos editando />} />
      <Route path="/adminforms" element={<div>MENÚ PRINCIPAL</div>} />
    </Routes>,
    {
      ruta,
      estadoInicial: {
        user: { name: "Aida", photoURL: "", role: "gestorEditor", genero: "femenino" },
        equipos: { equipos: catalogo, loading: false, error: null },
      },
    },
  );

// Todas las medidas de ancho mínimo coinciden (computador ancho), o las de
// máximo (celular).
const conPantalla = (coincide) => {
  const matchMediaOriginal = window.matchMedia;
  beforeEach(() => {
    window.matchMedia = (query) => ({ ...matchMediaOriginal(query), matches: coincide(query) });
  });
  afterEach(() => {
    window.matchMedia = matchMediaOriginal;
  });
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("VistaEquipos — en el computador ancho", () => {
  conPantalla((query) => query.includes("min-width"));

  it("la lista sale de la memoria y tocar un equipo abre su ficha", async () => {
    const { usuario } = abrir();

    expect(screen.getByText("Elige un equipo de la lista")).toBeInTheDocument();
    expect(nube.getDocs).not.toHaveBeenCalled();

    await usuario.click(screen.getByRole("button", { name: "RANA" }));
    expect(screen.getByRole("heading", { name: "RANA" })).toBeInTheDocument();
    expect(screen.getByText("Vibrocompactador")).toBeInTheDocument();
  });

  it("EDITAR abre el editor del equipo", async () => {
    const { usuario } = abrir("/vistaequipos/e1");

    await usuario.click(screen.getByRole("button", { name: "EDITAR" }));
    expect(screen.getByLabelText(/Nombre del equipo/)).toHaveValue("RANA");
  });

  it("con cambios sin guardar, pregunta antes de pasar a otro equipo", async () => {
    const { usuario } = abrir("/vistaequipos/e1/editar");

    await usuario.type(screen.getByLabelText(/Nombre del equipo/), " X");
    await usuario.click(screen.getByRole("button", { name: "ANDAMIO" }));

    expect(await screen.findByText("Cambios sin guardar")).toBeInTheDocument();
    // Sigue en el mismo equipo hasta que confirme.
    expect(screen.getByLabelText(/Nombre del equipo/)).toHaveValue("RANA X");

    await usuario.click(screen.getByRole("button", { name: "Salir sin guardar" }));
    expect(await screen.findByDisplayValue("ANDAMIO")).toBeInTheDocument();
  });

  it("eliminar se activa recién al escribir el nombre del equipo", async () => {
    const { usuario } = abrir("/vistaequipos/e1");

    await usuario.click(screen.getByRole("button", { name: "ELIMINAR" }));
    const eliminar = await screen.findByRole("button", { name: "Eliminar" });
    expect(eliminar).toBeDisabled();

    await usuario.type(screen.getByLabelText("Confirmar eliminación"), "rana");
    expect(eliminar).toBeEnabled();
    await usuario.click(eliminar);

    expect(await screen.findByText("Equipo RANA eliminado correctamente.")).toBeInTheDocument();
    expect(nube.deleteDoc).toHaveBeenCalledWith("equipos/e1");
    // Vuelve a la lista sin equipo elegido.
    expect(screen.getByText("Elige un equipo de la lista")).toBeInTheDocument();
  });
});

describe("VistaEquipos — en el celular", () => {
  conPantalla((query) => query.includes("max-width"));

  it("primero la lista, con el menú junto al buscador; la llave sube un nivel", async () => {
    const { usuario } = abrir();

    expect(screen.getByRole("button", { name: "Menú" })).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "RANA" }));

    // La ficha, con su pie de íconos.
    expect(screen.getByRole("heading", { name: "RANA" })).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Editar equipo" }));
    expect(screen.getByLabelText(/Nombre del equipo/)).toHaveValue("RANA");

    // Del editor a la ficha, y de la ficha a la lista.
    await usuario.click(screen.getByRole("button", { name: "EQUIPOS" }));
    expect(screen.getByRole("heading", { name: "RANA" })).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "EQUIPOS" }));
    expect(screen.getByRole("button", { name: "ANDAMIO" })).toBeInTheDocument();
  });
});
