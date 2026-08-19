import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import EditarEquipos from "./EditarEquipos";

// La edición de un equipo del catálogo. El equipo a editar llega por la
// navegación (lo elige la pantalla anterior), no por una consulta.
//
// La regla que más importa acá es la del REFRESCO: el catálogo vive en memoria
// y solo se consulta cuando está vacío, así que después de guardar hay que
// volver a pedirlo. Sin eso, la tienda, el kiosco y el selector de equipos
// siguen mostrando los datos viejos hasta que alguien recargue la página.
const nube = vi.hoisted(() => ({
  updateDoc: vi.fn(() => Promise.resolve()),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  deleteObject: vi.fn(() => Promise.resolve()),
  uploadBytes: vi.fn(() => Promise.resolve()),
  getDownloadURL: vi.fn(() => Promise.resolve("https://fotos/nueva.jpg")),
}));

vi.mock("../Firebase/Firebase", () => ({ db: {}, storage: {} }));

vi.mock("firebase/firestore", () => ({
  getFirestore: () => ({}),
  collection: (_db, nombre) => nombre,
  doc: (_db, ...partes) => partes.join("/"),
  updateDoc: nube.updateDoc,
  getDocs: nube.getDocs,
  query: (...args) => args,
  orderBy: (...args) => args,
}));

vi.mock("firebase/storage", () => ({
  getStorage: () => ({}),
  ref: (_storage, ruta) => ({ fullPath: ruta }),
  deleteObject: nube.deleteObject,
  uploadBytes: nube.uploadBytes,
  getDownloadURL: nube.getDownloadURL,
}));

const equipo = {
  id: "eq1",
  name: "ANDAMIO",
  description: "Andamio metálico",
  nameLowerCase: "andamio",
  images: [{ name: "andamio", url: "https://fotos/andamio.jpg", path: "eq1/andamio" }],
  varianteNombre: "Tamaño",
  variantes: ["1.20m"],
  textoExtra: "",
  subtitulo: "",
};

// El equipo llega por la navegación, igual que en la app.
const abrirCon = (equipoAEditar = equipo) =>
  renderConProviders(<EditarEquipos />, {
    ruta: { pathname: "/editarequipos", state: { equipo: equipoAEditar } },
    estadoInicial: { equipos: { equipos: [equipoAEditar], loading: false, error: null } },
  });

const guardar = (usuario) =>
  usuario.click(screen.getByRole("button", { name: "Guardar Equipo" }));

beforeEach(() => {
  vi.clearAllMocks();
  nube.getDocs.mockResolvedValue({ docs: [] });
});

describe("EditarEquipos", () => {
  it("abre con los datos del equipo cargados", () => {
    abrirCon();

    expect(screen.getByLabelText(/Nombre del equipo/)).toHaveValue("ANDAMIO");
    expect(screen.getByLabelText(/Descripción del equipo/)).toHaveValue("Andamio metálico");
  });

  it("guarda los cambios en el equipo que corresponde", async () => {
    const { usuario } = abrirCon();

    await usuario.clear(screen.getByLabelText(/Nombre del equipo/));
    await usuario.type(screen.getByLabelText(/Nombre del equipo/), "ANDAMIO NUEVO");
    await guardar(usuario);

    expect(await screen.findByText("Equipo actualizado con éxito")).toBeInTheDocument();

    const [ruta, datos] = nube.updateDoc.mock.calls[0];
    expect(ruta).toBe("equipos/eq1");
    expect(datos.name).toBe("ANDAMIO NUEVO");
  });

  it("rehace el nombre en minúsculas, que es por donde busca la tienda", async () => {
    const { usuario } = abrirCon();

    await usuario.clear(screen.getByLabelText(/Nombre del equipo/));
    await usuario.type(screen.getByLabelText(/Nombre del equipo/), "ANDAMIO NUEVO");
    await guardar(usuario);

    expect(await screen.findByText("Equipo actualizado con éxito")).toBeInTheDocument();
    // Si esto no se rehace, el equipo cambia de nombre pero se sigue
    // encontrando por el viejo — y no por el nuevo.
    expect(nube.updateDoc.mock.calls[0][1].nameLowerCase).toBe("andamio nuevo");
  });

  it("después de guardar vuelve a pedir el catálogo", async () => {
    const { usuario } = abrirCon();

    await guardar(usuario);

    expect(await screen.findByText("Equipo actualizado con éxito")).toBeInTheDocument();
    // Sin este refresco, el resto de la app muestra los datos viejos hasta que
    // alguien recargue la página.
    expect(nube.getDocs).toHaveBeenCalled();
  });

  it("conserva las variantes del equipo", async () => {
    const { usuario } = abrirCon();

    await guardar(usuario);

    expect(await screen.findByText("Equipo actualizado con éxito")).toBeInTheDocument();
    const datos = nube.updateDoc.mock.calls[0][1];
    expect(datos.varianteNombre).toBe("Tamaño");
    expect(datos.variantes).toEqual(["1.20m"]);
  });
});
