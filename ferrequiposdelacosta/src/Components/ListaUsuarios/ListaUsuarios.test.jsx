import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import RolesPermisos from "../RolesPermisos/RolesPermisos";
import ListaUsuarios from "./ListaUsuarios";

// Las cuentas del personal. Acá se cambia el rol de alguien.
//
// Ni editar ni eliminar se hacen desde el navegador: los hacen funciones del
// servidor. Editar, porque el rol tiene que quedar también en el carné de la
// sesión, y los permisos los calcula el servidor a partir del rol. Eliminar,
// porque borra la cuenta de acceso, la ficha, la foto y la presencia de una
// sola vez.
const nube = vi.hoisted(() => ({
  getDocs: vi.fn(),
  actualizarUsuario: vi.fn(() => Promise.resolve()),
  eliminarUsuario: vi.fn(() => Promise.resolve()),
  cerrarSesiones: vi.fn(() => Promise.resolve()),
  quitarDosPasos: vi.fn(() => Promise.resolve()),
}));

vi.mock("../Firebase/Firebase", () => ({
  db: {},
  functions: {},
  auth: { currentUser: { uid: "otro" } },
}));

vi.mock("firebase/firestore", () => ({
  collection: (_db, ...partes) => partes.join("/"),
  getDocs: nube.getDocs,
}));

vi.mock("firebase/functions", () => ({
  httpsCallable: (_functions, nombre) =>
    ({
      deleteUser: nube.eliminarUsuario,
      actualizarUsuario: nube.actualizarUsuario,
      cerrarSesiones: nube.cerrarSesiones,
      quitarDosPasos: nube.quitarDosPasos,
    })[nombre],
}));

vi.mock("../../Context/useAuth", async (importarOriginal) => ({
  ...(await importarOriginal()),
  useAuth: () => ({ logout: vi.fn() }),
}));

const usuarios = [
  {
    id: "u1",
    name: "Aida Pérez",
    email: "aida@ferrequipos.com",
    role: "gestorEditor",
    genero: "femenino",
    permisos: RolesPermisos.gestorEditor,
  },
];

const comoDocs = (lista) => ({
  docs: lista.map(({ id, ...resto }) => ({ id, data: () => resto })),
});

const hace = (minutos) => ({
  toMillis: () => Date.now() - minutos * 60000,
  toDate: () => new Date(Date.now() - minutos * 60000),
});

// Cada usuario trae, aparte, la lista de aparatos con sesión abierta.
const conUsuarios = (lista = usuarios, aparatos = {}) => {
  nube.getDocs.mockImplementation((ruta) => {
    if (ruta === "users") return Promise.resolve(comoDocs(lista));
    const uid = ruta.split("/")[1];
    return Promise.resolve(comoDocs(aparatos[uid] || []));
  });
};

const mostrar = () =>
  renderConProviders(<ListaUsuarios />, {
    estadoInicial: {
      user: { uid: "admin", name: "Jefe", role: "administrador", permisos: [] },
      presence: { usuariosConectados: {} },
    },
  });

beforeEach(() => {
  vi.clearAllMocks();
  conUsuarios();
});

describe("ListaUsuarios", () => {
  it("muestra al personal con su rol", async () => {
    mostrar();

    expect(await screen.findByText("Aida Pérez")).toBeInTheDocument();
    // El rol se muestra con un nombre legible, no como está guardado.
    expect(screen.getByText(/Gestor Editor/i)).toBeInTheDocument();
  });

  it("al cambiar el rol, se lo pide al servidor con el rol nuevo", async () => {
    const { usuario } = mostrar();

    // La edición se abre con el lápiz de esa fila.
    await screen.findByText("Aida Pérez");
    await usuario.click(screen.getByTestId("EditIcon").closest("button"));

    // Se le pasa a Gestor Integral.
    await usuario.click(screen.getByRole("combobox", { name: /Rol del Usuario/i }));
    await usuario.click(await screen.findByText("Gestor Integral"));
    await usuario.click(screen.getByRole("button", { name: /Guardar/i }));

    expect(await screen.findByText("Usuario actualizado con éxito")).toBeInTheDocument();

    // Los permisos no viajan: el servidor los saca del mapa de roles.
    expect(nube.actualizarUsuario).toHaveBeenCalledWith({
      uid: "u1",
      name: "Aida Pérez",
      genero: "femenino",
      role: "gestorIntegral",
    });
  });

  it("muestra en la tarjeta los aparatos con sesión abierta, el más reciente arriba", async () => {
    conUsuarios(usuarios, {
      u1: [
        { id: "a", tipo: "celular", descripcion: "Celular Android · Chrome", ultimoUso: hace(600) },
        { id: "b", tipo: "pc", descripcion: "PC Windows · Chrome", ultimoUso: hace(5) },
      ],
    });
    mostrar();

    const pc = await screen.findByText("PC Windows · Chrome");
    const celular = screen.getByText("Celular Android · Chrome");
    // El de hace 5 minutos va primero.
    expect(pc.compareDocumentPosition(celular) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("sin aparatos lo dice, y el botón de cerrar queda apagado", async () => {
    mostrar();

    await screen.findByText("Aida Pérez");
    expect(screen.getByText("Ninguna.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar todas las sesiones" })).toBeDisabled();
  });

  it("cerrar las sesiones pide confirmación y se lo encarga al servidor", async () => {
    conUsuarios(usuarios, {
      u1: [{ id: "b", tipo: "pc", descripcion: "PC Windows · Chrome", ultimoUso: hace(5) }],
    });
    const { usuario } = mostrar();

    await screen.findByText("PC Windows · Chrome");
    await usuario.click(screen.getByRole("button", { name: "Cerrar todas las sesiones" }));

    // Todavía no: primero pregunta.
    expect(await screen.findByText(/A Aida Pérez se le cerrará la app/)).toBeInTheDocument();
    expect(nube.cerrarSesiones).not.toHaveBeenCalled();

    await usuario.click(screen.getByRole("button", { name: "Cerrar sesiones" }));

    expect(nube.cerrarSesiones).toHaveBeenCalledWith({ uid: "u1" });
    expect(
      await screen.findByText("Listo: se cerraron las sesiones de Aida Pérez."),
    ).toBeInTheDocument();
  });

  it("quitar los dos pasos (celular perdido) pide confirmación y se lo encarga al servidor", async () => {
    const { usuario } = mostrar();

    await screen.findByText("Aida Pérez");
    await usuario.click(screen.getByRole("button", { name: "Quitar dos pasos" }));

    expect(await screen.findByText(/Úselo si Aida Pérez perdió o cambió el celular/)).toBeInTheDocument();
    expect(nube.quitarDosPasos).not.toHaveBeenCalled();

    // En el diálogo hay otro botón con el mismo texto: el de confirmar.
    const botones = screen.getAllByRole("button", { name: "Quitar dos pasos" });
    await usuario.click(botones[botones.length - 1]);

    expect(nube.quitarDosPasos).toHaveBeenCalledWith({ uid: "u1" });
    expect(
      await screen.findByText("Listo: Aida Pérez tendrá que activar los dos pasos de nuevo."),
    ).toBeInTheDocument();
  });

  it("no guarda un usuario sin nombre", async () => {
    const { usuario } = mostrar();

    // La edición se abre con el lápiz de esa fila.
    await screen.findByText("Aida Pérez");
    await usuario.click(screen.getByTestId("EditIcon").closest("button"));
    await usuario.clear(screen.getByLabelText(/Nombre Completo/));
    await usuario.click(screen.getByRole("button", { name: /Guardar/i }));

    expect(await screen.findByText("El nombre no puede estar vacío")).toBeInTheDocument();
    expect(nube.actualizarUsuario).not.toHaveBeenCalled();
  });
});
