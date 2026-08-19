import { screen, fireEvent } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import CrearEquipos from "./CrearEquipos";

// El alta de un equipo del catálogo: datos, variantes (medidas, capacidades) y
// las fotos, que van a Storage antes de guardar el documento.
//
// Se prueban las decisiones de esta pantalla: qué exige antes de crear, cómo
// arma lo que guarda —incluido el nombre en minúsculas que usa el buscador— y
// que después de crear refresque el catálogo, sin lo cual el equipo nuevo no
// aparece en la tienda hasta recargar la página.
const nube = vi.hoisted(() => ({
  setDoc: vi.fn(() => Promise.resolve()),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  uploadBytes: vi.fn(() => Promise.resolve()),
  getDownloadURL: vi.fn(() => Promise.resolve("https://fotos/equipo.jpg")),
}));

vi.mock("../Firebase/Firebase", () => ({ db: {}, storage: {} }));

vi.mock("firebase/firestore", () => ({
  collection: (_db, nombre) => nombre,
  // El documento se crea vacío para conocer su id antes de subir las fotos:
  // las fotos se guardan en una carpeta con ese id.
  doc: () => ({ id: "eq-nuevo" }),
  setDoc: nube.setDoc,
  getDocs: nube.getDocs,
  query: (...args) => args,
  orderBy: (...args) => args,
}));

vi.mock("firebase/storage", () => ({
  ref: (_storage, ruta) => ({ fullPath: ruta }),
  uploadBytes: nube.uploadBytes,
  getDownloadURL: nube.getDownloadURL,
}));

const archivoDeFoto = () =>
  new File(["contenido"], "andamio.jpg", { type: "image/jpeg" });

// El campo de archivo está escondido detrás de un botón con estilo, así que se
// le entrega el archivo directamente en vez de simular el clic.
const elegirFoto = () => {
  fireEvent.change(document.getElementById("file-upload"), {
    target: { files: [archivoDeFoto()] },
  });
};

const crear = (usuario) =>
  usuario.click(screen.getByRole("button", { name: "CREAR EQUIPO" }));

beforeEach(() => {
  vi.clearAllMocks();
  nube.setDoc.mockResolvedValue();
  nube.getDocs.mockResolvedValue({ docs: [] });
  nube.getDownloadURL.mockResolvedValue("https://fotos/equipo.jpg");
});

describe("CrearEquipos — lo que exige antes de crear", () => {
  it("sin nombre ni descripción no crea nada", async () => {
    const { usuario } = renderConProviders(<CrearEquipos />);

    await crear(usuario);

    expect(await screen.findByText("Todos los campos son obligatorios.")).toBeInTheDocument();
    expect(nube.setDoc).not.toHaveBeenCalled();
  });

  it("con los datos pero sin foto, tampoco: un equipo sin foto no se puede mostrar", async () => {
    const { usuario } = renderConProviders(<CrearEquipos />);

    await usuario.type(screen.getByLabelText(/Nombre del equipo/), "ANDAMIO");
    await usuario.type(screen.getByLabelText(/Descripción del equipo/), "Andamio metálico");
    await crear(usuario);

    expect(await screen.findByText("Todos los campos son obligatorios.")).toBeInTheDocument();
    expect(nube.setDoc).not.toHaveBeenCalled();
  });
});

describe("CrearEquipos — al crear", () => {
  it("sube la foto, guarda el equipo y refresca el catálogo", async () => {
    const { usuario } = renderConProviders(<CrearEquipos />);

    await usuario.type(screen.getByLabelText(/Nombre del equipo/), "ANDAMIO");
    await usuario.type(screen.getByLabelText(/Descripción del equipo/), "Andamio metálico");
    elegirFoto();
    await crear(usuario);

    expect(await screen.findByText("Equipo creado exitosamente.")).toBeInTheDocument();

    // La foto va primero a Storage; en el documento queda su dirección.
    expect(nube.uploadBytes).toHaveBeenCalledTimes(1);

    const [, datos] = nube.setDoc.mock.calls[0];
    expect(datos.name).toBe("ANDAMIO");
    expect(datos.description).toBe("Andamio metálico");
    expect(datos.images[0].url).toBe("https://fotos/equipo.jpg");

    // El buscador de la tienda compara en minúsculas: si este campo no se
    // guarda, el equipo existe pero no aparece al buscarlo.
    expect(datos.nameLowerCase).toBe("andamio");

    // Y el catálogo se vuelve a pedir: vive en memoria y solo se consulta
    // cuando está vacío, así que sin esto el equipo nuevo no se ve hasta
    // recargar la página.
    expect(nube.getDocs).toHaveBeenCalled();
  });

  it("guarda las variantes cargadas y no repite las iguales", async () => {
    const { usuario } = renderConProviders(<CrearEquipos />);

    await usuario.type(screen.getByLabelText(/Nombre del equipo/), "ANDAMIO");
    await usuario.type(screen.getByLabelText(/Descripción del equipo/), "Andamio metálico");
    await usuario.type(screen.getByLabelText(/Nombre de la variante/), "Tamaño");

    const campoValor = screen.getByLabelText(/Valor de la variante/);
    const botonAgregar = screen.getByRole("button", { name: "Agregar" });

    await usuario.type(campoValor, "1.20m");
    await usuario.click(botonAgregar);
    await usuario.type(campoValor, "1.50m");
    await usuario.click(botonAgregar);
    // La misma otra vez: no se agrega dos veces.
    await usuario.type(campoValor, "1.20m");
    await usuario.click(botonAgregar);

    elegirFoto();
    await crear(usuario);

    expect(await screen.findByText("Equipo creado exitosamente.")).toBeInTheDocument();
    const [, datos] = nube.setDoc.mock.calls[0];
    expect(datos.varianteNombre).toBe("Tamaño");
    expect(datos.variantes).toEqual(["1.20m", "1.50m"]);
  });

  it("deja el formulario limpio para cargar el siguiente equipo", async () => {
    const { usuario } = renderConProviders(<CrearEquipos />);

    await usuario.type(screen.getByLabelText(/Nombre del equipo/), "ANDAMIO");
    await usuario.type(screen.getByLabelText(/Descripción del equipo/), "Andamio metálico");
    elegirFoto();
    await crear(usuario);

    expect(await screen.findByText("Equipo creado exitosamente.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre del equipo/)).toHaveValue("");
    expect(screen.getByLabelText(/Descripción del equipo/)).toHaveValue("");
  });

  it("si falla la subida, lo dice y no deja el equipo a medio crear", async () => {
    nube.uploadBytes.mockRejectedValue(new Error("sin conexión"));
    const { usuario } = renderConProviders(<CrearEquipos />);

    await usuario.type(screen.getByLabelText(/Nombre del equipo/), "ANDAMIO");
    await usuario.type(screen.getByLabelText(/Descripción del equipo/), "Andamio metálico");
    elegirFoto();
    await crear(usuario);

    expect(await screen.findByText("Error: sin conexión")).toBeInTheDocument();
    // La foto no subió, así que el equipo no se guarda: no queda un equipo sin
    // imagen dando vueltas en el catálogo.
    expect(nube.setDoc).not.toHaveBeenCalled();
  });
});
