import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import { faltanEnLaClave } from "../../Utils/requisitosClave";
import CrearUsuario from "./CrearUsuario";

// Crear una cuenta del personal (la pantalla de Usuarios, 2026-10-28). La
// crea una función del servidor —desde el navegador no se pueden crear
// cuentas con privilegios—, así que acá se prueba lo de este lado: que no se
// mande nada incompleto y que se mande lo correcto.
//
// Los permisos NO viajan desde acá: el servidor los calcula a partir del rol,
// para no creerle a la pantalla.
const crearUsuario = vi.hoisted(() => vi.fn());

vi.mock("../Firebase/Firebase", () => ({ functions: {} }));
vi.mock("firebase/functions", () => ({ httpsCallable: () => crearUsuario }));

const CLAVE_BUENA = "Ferrequipos#2026";

// Crear y Limpiar viven afuera del formulario (encabezado o pie) y llegan por
// su id: acá van al lado.
const abrir = () => {
  const onTerminar = vi.fn();
  const resultado = renderConProviders(
    <>
      <CrearUsuario idFormulario="form-prueba" onTerminar={onTerminar} />
      <button type="submit" form="form-prueba">
        CREAR
      </button>
    </>,
  );
  return { ...resultado, onTerminar };
};

const llenar = async (
  usuario,
  { nombre = "Aida Pérez", correo = "aida@ferrequipos.com", clave = CLAVE_BUENA, rol = /^Gestor Editor/ } = {},
) => {
  if (nombre) await usuario.type(screen.getByLabelText(/Nombre completo/), nombre);
  if (correo) await usuario.type(screen.getByLabelText(/^Correo/), correo);
  if (clave) await usuario.type(screen.getByLabelText(/^Contraseña/), clave);
  await usuario.click(screen.getByRole("button", { name: "Femenino" }));
  if (rol) await usuario.click(screen.getByRole("radio", { name: rol }));
};

const crear = (usuario) => usuario.click(screen.getByRole("button", { name: "CREAR" }));

beforeEach(() => {
  crearUsuario.mockReset();
  crearUsuario.mockResolvedValue({ data: { uid: "nuevo1" } });
});

describe("CrearUsuario — lo que no deja pasar", () => {
  it.each([
    ["sin nombre", { nombre: "" }, "Escribe el nombre."],
    // El campo es type="email": uno sin punto en el dominio pasa esa barrera
    // y llega a la validación del componente.
    ["con un correo sin dominio completo", { correo: "aida@ferrequipos" }, "El correo no tiene un formato válido."],
    ["sin rol", { rol: null }, "Elige un rol."],
  ])("%s no crea nada", async (_caso, datos, mensaje) => {
    const { usuario, onTerminar } = abrir();

    await llenar(usuario, datos);
    await crear(usuario);

    expect(onTerminar).toHaveBeenCalledWith({ mensaje, severidad: "error" });
    expect(crearUsuario).not.toHaveBeenCalled();
  });

  it("una contraseña débil no pasa, y dice qué le falta", async () => {
    const { usuario, onTerminar } = abrir();

    await llenar(usuario, { clave: "secreta123" });
    await crear(usuario);

    expect(onTerminar).toHaveBeenCalledWith({
      mensaje: "A la contraseña le falta: 12 caracteres o más, una mayúscula, un signo, como ! @ # % & * ?.",
      severidad: "error",
    });
    expect(crearUsuario).not.toHaveBeenCalled();
  });
});

describe("CrearUsuario — lo que manda", () => {
  it("manda los datos y el rol, sin permisos, y avisa con el id nuevo", async () => {
    const { usuario, onTerminar } = abrir();

    await llenar(usuario);
    await crear(usuario);

    expect(crearUsuario).toHaveBeenCalledWith({
      email: "aida@ferrequipos.com",
      password: CLAVE_BUENA,
      name: "Aida Pérez",
      genero: "femenino",
      role: "gestorEditor",
    });
    expect(onTerminar).toHaveBeenCalledWith({
      mensaje: "Aida Pérez ya puede entrar.",
      severidad: "success",
      uid: "nuevo1",
    });
  });

  it("si el servidor la rechaza, avisa su motivo y deja lo escrito", async () => {
    crearUsuario.mockRejectedValue(new Error("El correo ya está registrado."));
    const { usuario, onTerminar } = abrir();

    await llenar(usuario);
    await crear(usuario);

    expect(onTerminar).toHaveBeenCalledWith({ mensaje: "El correo ya está registrado.", severidad: "error" });
    expect(await screen.findByLabelText(/Nombre completo/)).toHaveValue("Aida Pérez");
  });
});

describe("CrearUsuario — la contraseña", () => {
  it("GENERAR pone una que cumple todo y la deja a la vista", async () => {
    const { usuario } = abrir();
    const campo = screen.getByLabelText(/^Contraseña/);
    expect(campo).toHaveAttribute("type", "password");

    // El globo de ayuda le da su nombre accesible al botón.
    await usuario.click(screen.getByRole("button", { name: /Genera una contraseña segura/ }));

    expect(faltanEnLaClave(campo.value)).toEqual([]);
    expect(campo).toHaveAttribute("type", "text");
  });

  it("los requisitos se van marcando mientras se escribe", async () => {
    const { usuario } = abrir();

    expect(screen.queryAllByTestId("CheckCircleIcon")).toHaveLength(0);
    await usuario.type(screen.getByLabelText(/^Contraseña/), "Ab1");
    expect(screen.getAllByTestId("CheckCircleIcon")).toHaveLength(3);
    await usuario.type(screen.getByLabelText(/^Contraseña/), "#ferrequipos");
    expect(screen.getAllByTestId("CheckCircleIcon")).toHaveLength(5);
  });
});
