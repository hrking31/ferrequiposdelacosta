import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import { authContext } from "../../Context/useAuth";
import { ProtectedRoutes } from "../../Components/ProtectedRoutes/ProtectedRoutes";

// CONFIRMAR EL CORREO. Las reglas no dejan leer nada sin el correo confirmado,
// así que las pantallas protegidas muestran esta en vez de su contenido. Se
// prueba a través de la puerta (ProtectedRoutes), que es como la ve la gente.
const sesion = (cambios = {}) => ({
  user: { uid: "u1", email: "aida@ferrequipos.com", role: "administrador" },
  loading: false,
  correoVerificado: false,
  logout: vi.fn(),
  enviarVerificacion: vi.fn(() => Promise.resolve()),
  confirmarCorreo: vi.fn(() => Promise.resolve(false)),
  ...cambios,
});

const abrir = (valor) =>
  renderConProviders(
    <authContext.Provider value={valor}>
      <ProtectedRoutes>
        <p>Panel de administración</p>
      </ProtectedRoutes>
    </authContext.Provider>,
  );

describe("la puerta del panel y el correo confirmado", () => {
  it("sin confirmar, no muestra el panel: pide confirmar el correo", () => {
    abrir(sesion());

    expect(screen.getByText("Confirme su correo")).toBeInTheDocument();
    expect(screen.getByText("aida@ferrequipos.com")).toBeInTheDocument();
    expect(screen.queryByText("Panel de administración")).not.toBeInTheDocument();
  });

  it("con el correo confirmado, pasa directo", () => {
    abrir(sesion({ correoVerificado: true }));

    expect(screen.getByText("Panel de administración")).toBeInTheDocument();
  });
});

describe("VistaConfirmarCorreo", () => {
  it("el correo sale solo cuando la persona lo pide", async () => {
    const valor = sesion();
    const { usuario } = abrir(valor);

    expect(valor.enviarVerificacion).not.toHaveBeenCalled();
    await usuario.click(screen.getByRole("button", { name: "Enviarme el correo" }));

    expect(valor.enviarVerificacion).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/le enviamos el correo/)).toBeInTheDocument();
  });

  it("si pide muchos seguidos, le dice que espere", async () => {
    const valor = sesion({
      enviarVerificacion: vi.fn(() =>
        Promise.reject(Object.assign(new Error("x"), { code: "auth/too-many-requests" })),
      ),
    });
    const { usuario } = abrir(valor);

    await usuario.click(screen.getByRole("button", { name: "Enviarme el correo" }));

    expect(await screen.findByText(/Espere unos minutos/)).toBeInTheDocument();
  });

  it("si toca «Ya confirmé» sin haber confirmado, se lo dice", async () => {
    const valor = sesion();
    const { usuario } = abrir(valor);

    await usuario.click(screen.getByRole("button", { name: "Ya confirmé" }));

    expect(valor.confirmarCorreo).toHaveBeenCalled();
    expect(await screen.findByText(/Todavía no aparece confirmado/)).toBeInTheDocument();
  });

  it("puede cerrar sesión desde acá", async () => {
    const valor = sesion();
    const { usuario } = abrir(valor);

    await usuario.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(valor.logout).toHaveBeenCalled();
  });
});
