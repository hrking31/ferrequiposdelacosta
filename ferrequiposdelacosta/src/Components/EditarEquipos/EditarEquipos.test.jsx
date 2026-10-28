import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import EditarEquipos from "./EditarEquipos";

// La edición de un equipo del catálogo (2026-10-26: dentro de la pantalla de
// Equipos, que le pasa el equipo). Lo que importa:
// - guarda en el equipo que corresponde, con el nombre en minúsculas;
// - después de guardar vuelve a pedir el catálogo (vive en memoria);
// - las fotos quitadas se borran del almacenamiento DESPUÉS de guardar;
// - el orden de las fotos (la primera es la portada) se guarda;
// - sin cambios no escribe nada, y Deshacer vuelve a lo guardado.
const nube = vi.hoisted(() => ({
  updateDoc: vi.fn(() => Promise.resolve()),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  deleteObject: vi.fn(() => Promise.resolve()),
  uploadBytes: vi.fn(() => Promise.resolve()),
  getDownloadURL: vi.fn(() => Promise.resolve("https://fotos/nueva.jpg")),
}));

vi.mock("../Firebase/Firebase", () => ({ db: {}, storage: {} }));

vi.mock("firebase/firestore", () => ({
  collection: (_db, nombre) => nombre,
  doc: (_db, ...partes) => partes.join("/"),
  updateDoc: nube.updateDoc,
  getDocs: nube.getDocs,
}));

vi.mock("firebase/storage", () => ({
  ref: (_storage, ruta) => ({ fullPath: ruta }),
  deleteObject: nube.deleteObject,
  uploadBytes: nube.uploadBytes,
  getDownloadURL: nube.getDownloadURL,
}));

vi.mock("../../Utils/achicarImagen", () => ({
  default: vi.fn(() => Promise.resolve(new Blob(["foto"], { type: "image/webp" }))),
}));

const miniaturaFrente = { url: "https://fotos/frente-miniatura.webp", path: "eq1/frente-miniatura" };
const miniaturaLado = { url: "https://fotos/lado-miniatura.webp", path: "eq1/lado-miniatura" };
const equipo = {
  id: "eq1",
  name: "ANDAMIO",
  description: "Andamio metálico",
  nameLowerCase: "andamio",
  images: [
    { name: "frente", url: "https://fotos/frente.webp", path: "eq1/frente", miniatura: miniaturaFrente },
    { name: "lado", url: "https://fotos/lado.webp", path: "eq1/lado", miniatura: miniaturaLado },
  ],
  varianteNombre: "Tamaño",
  variantes: ["1.20m"],
  textoExtra: "",
  subtitulo: "",
};

// Guardar y Deshacer viven afuera (encabezado o pie) y llegan por el id.
const abrir = (onCambios = vi.fn()) => ({
  onCambios,
  ...renderConProviders(
    <>
      <EditarEquipos
        equipo={equipo}
        idFormulario="form-editar-equipo"
        fotosPorFila={1}
        onCambios={onCambios}
      />
      <button type="submit" form="form-editar-equipo">
        Guardar
      </button>
      <button type="reset" form="form-editar-equipo">
        Deshacer
      </button>
    </>,
    { estadoInicial: { equipos: { equipos: [equipo], loading: false, error: null } } },
  ),
});

const cambiarNombre = async (usuario, nombre) => {
  await usuario.clear(screen.getByLabelText(/Nombre del equipo/));
  await usuario.type(screen.getByLabelText(/Nombre del equipo/), nombre);
};

beforeEach(() => {
  vi.clearAllMocks();
  nube.getDocs.mockResolvedValue({ docs: [] });
});

describe("EditarEquipos", () => {
  it("abre con los datos del equipo cargados", () => {
    abrir();

    expect(screen.getByLabelText(/Nombre del equipo/)).toHaveValue("ANDAMIO");
    expect(screen.getByLabelText(/Descripción del equipo/)).toHaveValue("Andamio metálico");
    expect(screen.getByText("PORTADA")).toBeInTheDocument();
  });

  it("guarda en el equipo que corresponde, con el nombre en minúsculas, y vuelve a pedir el catálogo", async () => {
    const { usuario } = abrir();

    await cambiarNombre(usuario, "ANDAMIO NUEVO");
    await usuario.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Equipo actualizado con éxito")).toBeInTheDocument();
    const [ruta, datos] = nube.updateDoc.mock.calls[0];
    expect(ruta).toBe("equipos/eq1");
    expect(datos.name).toBe("ANDAMIO NUEVO");
    // Si no se rehace, se sigue encontrando por el nombre viejo.
    expect(datos.nameLowerCase).toBe("andamio nuevo");
    expect(datos.varianteNombre).toBe("Tamaño");
    expect(datos.variantes).toEqual(["1.20m"]);
    expect(nube.getDocs).toHaveBeenCalled();
  });

  it("sin cambios no escribe nada", async () => {
    const { usuario } = abrir();

    await usuario.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("No hay cambios para guardar.")).toBeInTheDocument();
    expect(nube.updateDoc).not.toHaveBeenCalled();
  });

  it("la foto quitada se borra del almacenamiento después de guardar", async () => {
    const { usuario } = abrir();

    // Quita la segunda (lado).
    await usuario.click(screen.getAllByRole("button", { name: "Quitar foto" })[1]);
    await usuario.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Equipo actualizado con éxito")).toBeInTheDocument();
    expect(nube.updateDoc.mock.calls[0][1].images).toEqual([
      { name: "frente", url: "https://fotos/frente.webp", path: "eq1/frente", miniatura: miniaturaFrente },
    ]);
    // Las dos versiones: la grande y la miniatura.
    expect(nube.deleteObject).toHaveBeenCalledTimes(2);
    expect(nube.deleteObject).toHaveBeenCalledWith({ fullPath: "eq1/lado" });
    expect(nube.deleteObject).toHaveBeenCalledWith({ fullPath: "eq1/lado-miniatura" });
    // Primero el equipo, después el borrado: nunca apunta a una foto borrada.
    expect(nube.updateDoc.mock.invocationCallOrder[0]).toBeLessThan(
      nube.deleteObject.mock.invocationCallOrder[0],
    );
  });

  it("mover una foto cambia la portada que se guarda", async () => {
    const { usuario } = abrir();

    await usuario.click(screen.getAllByRole("button", { name: "Mover después" })[0]);
    await usuario.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Equipo actualizado con éxito")).toBeInTheDocument();
    const fotos = nube.updateDoc.mock.calls[0][1].images;
    expect(fotos.map((foto) => foto.name)).toEqual(["lado", "frente"]);
    // La miniatura viaja con su foto.
    expect(fotos[0].miniatura).toEqual(miniaturaLado);
    expect(fotos[1].miniatura).toEqual(miniaturaFrente);
    expect(nube.deleteObject).not.toHaveBeenCalled();
  });

  it("avisa los cambios sin guardar, y Deshacer vuelve a lo guardado", async () => {
    const { usuario, onCambios } = abrir();

    await cambiarNombre(usuario, "OTRO");
    expect(screen.getByRole("status", { name: "Cambios sin guardar" })).toBeInTheDocument();
    expect(onCambios).toHaveBeenLastCalledWith(1);

    await usuario.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(screen.getByLabelText(/Nombre del equipo/)).toHaveValue("ANDAMIO");
    expect(screen.queryByRole("status", { name: "Cambios sin guardar" })).not.toBeInTheDocument();
    expect(onCambios).toHaveBeenLastCalledWith(0);
  });
});
