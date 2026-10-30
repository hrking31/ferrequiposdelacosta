import { screen, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { renderConProviders } from "../../test/utils";
import VistaUsuarios from "./VistaUsuarios";

// USUARIOS: crear, ver, editar y eliminar en una sola pantalla (2026-10-28;
// antes eran dos pantallas y dos botones en el menú). Lo que importa: el
// personal se lee una vez; tocar a alguien abre su ficha y EDITAR su editor;
// con cambios sin guardar pregunta antes de dejarlo; NUEVO USUARIO abre el
// formulario; y las sesiones las cierra el servidor para esa persona.
const nube = vi.hoisted(() => ({
  getDocs: vi.fn(),
  cerrarSesionAparato: vi.fn(() => Promise.resolve()),
}));

vi.mock("../../Components/Firebase/Firebase", () => ({ db: {}, functions: {} }));
vi.mock("firebase/firestore", () => ({
  collection: (_db, ...partes) => partes.join("/"),
  getDocs: nube.getDocs,
}));
vi.mock("firebase/functions", () => ({
  httpsCallable: (_functions, nombre) => (nombre === "cerrarSesionAparato" ? nube.cerrarSesionAparato : vi.fn()),
}));
vi.mock("../../Context/useAuth", () => ({ useAuth: () => ({ logout: vi.fn() }) }));
// Del encabezado solo importan los botones de la vista.
vi.mock("../../Components/HeaderUsuario/HeaderUsuario", () => ({
  default: function HeaderFalso({ acciones }) {
    return <div>{acciones}</div>;
  },
}));

const personal = [
  { id: "u1", name: "Aida Pérez", email: "aida@ferrequipos.com", genero: "femenino", role: "gestorEditor" },
  { id: "u2", name: "Carlos Ríos", email: "carlos@ferrequipos.com", genero: "masculino", role: "gestorFacturacion" },
];

const aparatosDeAida = [
  {
    id: "a1",
    tipo: "pc",
    descripcion: "Computador · Chrome",
    ultimoUso: { toDate: () => new Date(), toMillis: () => Date.now() },
  },
];

const comoDocs = (lista) => ({ docs: lista.map(({ id, ...resto }) => ({ id, data: () => resto })) });

// Todos los anchos mínimos coinciden: el computador ancho.
const matchMediaOriginal = window.matchMedia;
beforeEach(() => {
  vi.clearAllMocks();
  window.matchMedia = (query) => ({ ...matchMediaOriginal(query), matches: query.includes("min-width") });
  nube.getDocs.mockImplementation((ruta) => {
    if (ruta === "users") return Promise.resolve(comoDocs(personal));
    return Promise.resolve(comoDocs(ruta === "users/u1/aparatos" ? aparatosDeAida : []));
  });
});
afterEach(() => {
  window.matchMedia = matchMediaOriginal;
});

const abrir = (ruta = "/vistausuarios") =>
  renderConProviders(
    <Routes>
      <Route path="/vistausuarios/*" element={<VistaUsuarios />} />
      <Route path="/adminforms" element={<div>MENÚ PRINCIPAL</div>} />
    </Routes>,
    {
      ruta,
      estadoInicial: {
        user: { uid: "admin", name: "Jefe", photoURL: "", role: "administrador", genero: "masculino" },
        presence: { usuariosConectados: { u1: { online: true, timestamp: Date.now() } } },
      },
    },
  );

describe("VistaUsuarios", () => {
  it("lee el personal una vez y tocar a alguien abre su ficha", async () => {
    const { usuario } = abrir();

    expect(await screen.findByText("Elige a alguien de la lista")).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: /Aida Pérez/ }));

    expect(screen.getByRole("heading", { name: /Aida Pérez/ })).toBeInTheDocument();
    expect(screen.getByText("Computador · Chrome")).toBeInTheDocument();
    // Una lectura de la lista y una de aparatos por persona; pasar a la
    // ficha no vuelve a leer.
    expect(nube.getDocs).toHaveBeenCalledTimes(1 + personal.length);
  });

  it("EDITAR abre el editor de esa persona", async () => {
    const { usuario } = abrir("/vistausuarios/u1");

    await usuario.click(await screen.findByRole("button", { name: "EDITAR" }));

    expect(screen.getByLabelText(/Nombre completo/)).toHaveValue("Aida Pérez");
  });

  it("con cambios sin guardar, pregunta antes de pasar a otra persona", async () => {
    const { usuario } = abrir("/vistausuarios/u1/editar");

    await usuario.type(await screen.findByLabelText(/Nombre completo/), " X");
    await usuario.click(screen.getByRole("button", { name: /Carlos Ríos/ }));

    expect(await screen.findByText("Cambios sin guardar")).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre completo/)).toHaveValue("Aida Pérez X");

    await usuario.click(screen.getByRole("button", { name: "Salir sin guardar" }));
    expect(await screen.findByDisplayValue("Carlos Ríos")).toBeInTheDocument();
  });

  it("NUEVO USUARIO abre el formulario de crear", async () => {
    const { usuario } = abrir();

    await usuario.click(await screen.findByRole("button", { name: /NUEVO USUARIO/ }));

    expect(screen.getByLabelText(/^Contraseña/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear usuario" })).toBeInTheDocument();
  });

  it("la papelera de un aparato le cierra la sesión solo en ese", async () => {
    const { usuario } = abrir("/vistausuarios/u1");

    await usuario.click(await screen.findByRole("button", { name: "Cerrar la sesión en Computador · Chrome" }));
    const dialogo = await screen.findByRole("dialog");
    await usuario.click(within(dialogo).getByRole("button", { name: "Cerrar sesión" }));

    expect(nube.cerrarSesionAparato).toHaveBeenCalledWith({ uid: "u1", aparatoId: "a1" });
  });
});

// Entre 1010 y 1500px (2026-10-29), como en Equipos: con alguien abierto la
// lista se guarda en una franja de caras, y su flecha la saca entera.
describe("VistaUsuarios — en el computador angosto", () => {
  beforeEach(() => {
    window.matchMedia = (query) => ({ ...matchMediaOriginal(query), matches: /min-width:1010px/.test(query) });
  });

  it("las caras de la franja abren a otra persona", async () => {
    const { usuario } = abrir("/vistausuarios/u1");

    expect(await screen.findByRole("heading", { name: /Aida Pérez/ })).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Carlos Ríos" }));
    expect(await screen.findByRole("heading", { name: /Carlos Ríos/ })).toBeInTheDocument();
  });

  it("la flecha saca la lista completa", async () => {
    const { usuario } = abrir("/vistausuarios/u1");

    await usuario.click(await screen.findByRole("button", { name: "Ver la lista completa" }));
    expect(await screen.findByPlaceholderText("Buscar usuario...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Esconder la lista" })).toBeInTheDocument();
  });
});
