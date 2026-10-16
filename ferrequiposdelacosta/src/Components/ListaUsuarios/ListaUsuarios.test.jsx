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
}));

vi.mock("../Firebase/Firebase", () => ({
  db: {},
  functions: {},
  auth: { currentUser: { uid: "otro" } },
}));

vi.mock("firebase/firestore", () => ({
  collection: (_db, nombre) => nombre,
  getDocs: nube.getDocs,
}));

vi.mock("firebase/functions", () => ({
  httpsCallable: (_functions, nombre) =>
    nombre === "deleteUser" ? nube.eliminarUsuario : nube.actualizarUsuario,
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

const conUsuarios = (lista = usuarios) => {
  nube.getDocs.mockResolvedValue({
    docs: lista.map((u) => ({ id: u.id, data: () => u })),
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
