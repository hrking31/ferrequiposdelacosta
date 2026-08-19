import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import RolesPermisos from "../RolesPermisos/RolesPermisos";
import Register from "./Register";

// El alta de una cuenta del personal. Crear el usuario lo hace una función del
// servidor —desde el navegador no se pueden crear cuentas con privilegios—, así
// que acá se prueba lo de este lado: que no se mande nada incompleto y que al
// usuario nuevo se le adjunten los permisos que le tocan por su rol.
//
// Ese último punto es el que importa: los permisos NO se eligen a mano, salen
// del rol. Si alguien los desacopla, esta prueba lo caza.
const crearUsuario = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock("../Firebase/Firebase", () => ({ functions: {} }));
vi.mock("firebase/functions", () => ({ httpsCallable: () => crearUsuario }));

const llenar = async (usuario, { nombre = "Aida", correo = "aida@ferrequipos.com", clave = "secreta123" } = {}) => {
  if (nombre) await usuario.type(screen.getByLabelText(/Nombre/), nombre);
  if (correo) await usuario.type(screen.getByLabelText(/Correo/), correo);
  if (clave) await usuario.type(screen.getByLabelText(/Contraseña/), clave);
};

const elegirRol = async (usuario, rol) => {
  await usuario.click(screen.getByRole("combobox", { name: /Rol del Usuario/ }));
  // Cada opción va envuelta en un Tooltip, que le cambia el nombre
  // accesible; por eso se la busca por su texto visible.
  await usuario.click(await screen.findByText(rol));
};

const registrar = (usuario) =>
  usuario.click(screen.getByRole("button", { name: "Registrar" }));

beforeEach(() => {
  crearUsuario.mockClear();
  crearUsuario.mockResolvedValue();
});

describe("Register — lo que no deja pasar", () => {
  it("sin nombre no crea nada", async () => {
    const { usuario } = renderConProviders(<Register />);

    await llenar(usuario, { nombre: "" });
    await elegirRol(usuario, "Gestor Editor");
    await registrar(usuario);

    expect(await screen.findByText("Por favor, ingrese un nombre válido.")).toBeInTheDocument();
    expect(crearUsuario).not.toHaveBeenCalled();
  });

  // El campo es type="email", así que el navegador ya frena lo que ni
  // parece un correo. Esta prueba usa uno que SÍ pasa esa barrera —sin
  // punto en el dominio— para llegar a la validación del componente.
  it("con un correo sin dominio completo, tampoco", async () => {
    const { usuario } = renderConProviders(<Register />);

    await llenar(usuario, { correo: "aida@ferrequipos" });
    await registrar(usuario);

    expect(await screen.findByText("Formato de correo no válido")).toBeInTheDocument();
    expect(crearUsuario).not.toHaveBeenCalled();
  });

  it("una contraseña de menos de 6 caracteres no pasa", async () => {
    const { usuario } = renderConProviders(<Register />);

    await llenar(usuario, { clave: "12345" });
    await registrar(usuario);

    expect(
      await screen.findByText("La contraseña debe tener al menos 6 caracteres"),
    ).toBeInTheDocument();
    expect(crearUsuario).not.toHaveBeenCalled();
  });

  it("sin rol no se crea la cuenta: sería un usuario sin permisos", async () => {
    const { usuario } = renderConProviders(<Register />);

    await llenar(usuario);
    await registrar(usuario);

    expect(await screen.findByText("Por favor, selecciona un rol")).toBeInTheDocument();
    expect(crearUsuario).not.toHaveBeenCalled();
  });
});

describe("Register — cuando está todo", () => {
  it("crea la cuenta con los permisos que le corresponden al rol", async () => {
    const { usuario } = renderConProviders(<Register />);

    await llenar(usuario);
    await elegirRol(usuario, "Gestor Editor");
    await registrar(usuario);

    expect(crearUsuario).toHaveBeenCalledTimes(1);
    expect(crearUsuario).toHaveBeenCalledWith({
      email: "aida@ferrequipos.com",
      password: "secreta123",
      name: "Aida",
      genero: "",
      role: "gestorEditor",
      // Los permisos salen del mapa de roles, no de una lista escrita a mano.
      permisos: RolesPermisos.gestorEditor,
    });

    expect(await screen.findByText("Usuario registrado con éxito")).toBeInTheDocument();
  });

  it("deja el formulario limpio para cargar al siguiente", async () => {
    const { usuario } = renderConProviders(<Register />);

    await llenar(usuario);
    await elegirRol(usuario, "Administrador");
    await registrar(usuario);

    expect(await screen.findByText("Usuario registrado con éxito")).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre/)).toHaveValue("");
    expect(screen.getByLabelText(/Correo/)).toHaveValue("");
    expect(screen.getByLabelText(/Contraseña/)).toHaveValue("");
  });

  it("si el correo ya existe, lo dice sin jerga", async () => {
    crearUsuario.mockRejectedValue(
      Object.assign(new Error("x"), { code: "auth/email-already-in-use" }),
    );
    const { usuario } = renderConProviders(<Register />);

    await llenar(usuario);
    await elegirRol(usuario, "Gestor Editor");
    await registrar(usuario);

    expect(await screen.findByText("El correo ya está registrado")).toBeInTheDocument();
  });
});
