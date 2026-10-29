import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import EditarUsuario from "./EditarUsuario";

// Editar a una persona (la pantalla de Usuarios, 2026-10-28). Guardar lo hace
// el servidor (actualizarUsuario): el rol tiene que quedar también en el carné
// de la sesión, y los permisos los calcula él a partir del rol. Acá se prueba
// que cuente bien los cambios, que mande lo correcto y que Deshacer vuelva a
// lo guardado.
const actualizarUsuario = vi.hoisted(() => vi.fn());

vi.mock("../Firebase/Firebase", () => ({ functions: {} }));
vi.mock("firebase/functions", () => ({ httpsCallable: () => actualizarUsuario }));

const aida = {
  id: "u1",
  name: "Aida Pérez",
  email: "aida@ferrequipos.com",
  genero: "femenino",
  role: "gestorEditor",
};

// Guardar y Deshacer viven afuera del formulario y llegan por su id.
const abrir = () => {
  const onCambios = vi.fn();
  const onTerminar = vi.fn();
  const resultado = renderConProviders(
    <>
      <EditarUsuario usuario={aida} idFormulario="form-prueba" onCambios={onCambios} onTerminar={onTerminar} />
      <button type="submit" form="form-prueba">
        GUARDAR
      </button>
      <button type="reset" form="form-prueba">
        DESHACER
      </button>
    </>,
  );
  return { ...resultado, onCambios, onTerminar };
};

const ultimaCuenta = (onCambios) => onCambios.mock.calls.at(-1)[0];

beforeEach(() => {
  actualizarUsuario.mockReset();
  actualizarUsuario.mockResolvedValue({});
});

describe("EditarUsuario", () => {
  it("arranca con lo guardado y sin cambios; el correo no se toca", () => {
    const { onCambios } = abrir();

    expect(screen.getByLabelText(/Nombre completo/)).toHaveValue("Aida Pérez");
    expect(screen.getByLabelText(/^Correo/)).toBeDisabled();
    expect(screen.getByRole("radio", { name: /^Gestor Editor/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("EL QUE TIENE HOY")).toBeInTheDocument();
    expect(ultimaCuenta(onCambios)).toBe(0);
  });

  it("sin cambios no llama al servidor", async () => {
    const { usuario, onTerminar } = abrir();

    await usuario.click(screen.getByRole("button", { name: "GUARDAR" }));

    expect(onTerminar).toHaveBeenCalledWith({ mensaje: "No hay cambios para guardar.", severidad: "info" });
    expect(actualizarUsuario).not.toHaveBeenCalled();
  });

  it("cuenta un recuadro por los datos y otro por el rol", async () => {
    const { usuario, onCambios } = abrir();

    await usuario.type(screen.getByLabelText(/Nombre completo/), " Gómez");
    expect(ultimaCuenta(onCambios)).toBe(1);
    await usuario.click(screen.getByRole("radio", { name: /^Gestor Integral/ }));
    expect(ultimaCuenta(onCambios)).toBe(2);
  });

  it("al cambiar el rol muestra lo que gana en el menú", async () => {
    const { usuario } = abrir();

    await usuario.click(screen.getByRole("radio", { name: /^Gestor Integral/ }));

    // De editor a integral gana los seis de facturación.
    expect(screen.getAllByText("GANA")).toHaveLength(6);
  });

  it("guarda el nombre, el género y el rol de esa persona", async () => {
    const { usuario, onTerminar } = abrir();

    await usuario.click(screen.getByRole("radio", { name: /^Gestor Integral/ }));
    await usuario.click(screen.getByRole("button", { name: "GUARDAR" }));

    expect(actualizarUsuario).toHaveBeenCalledWith({
      uid: "u1",
      name: "Aida Pérez",
      genero: "femenino",
      role: "gestorIntegral",
    });
    expect(onTerminar).toHaveBeenCalledWith({
      mensaje: "Aida Pérez quedó guardado.",
      severidad: "success",
      guardado: true,
    });
  });

  it("sin nombre no guarda", async () => {
    const { usuario, onTerminar } = abrir();

    await usuario.clear(screen.getByLabelText(/Nombre completo/));
    await usuario.click(screen.getByRole("button", { name: "GUARDAR" }));

    expect(onTerminar).toHaveBeenCalledWith({ mensaje: "El nombre no puede estar vacío.", severidad: "error" });
    expect(actualizarUsuario).not.toHaveBeenCalled();
  });

  it("Deshacer vuelve a lo guardado", async () => {
    const { usuario, onCambios } = abrir();

    await usuario.type(screen.getByLabelText(/Nombre completo/), " Gómez");
    await usuario.click(screen.getByRole("radio", { name: /^Administrador/ }));
    await usuario.click(screen.getByRole("button", { name: "DESHACER" }));

    expect(screen.getByLabelText(/Nombre completo/)).toHaveValue("Aida Pérez");
    expect(screen.getByRole("radio", { name: /^Gestor Editor/ })).toHaveAttribute("aria-checked", "true");
    expect(ultimaCuenta(onCambios)).toBe(0);
  });
});
