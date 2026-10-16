import { screen } from "@testing-library/react";
import { renderConProviders } from "../../test/utils";
import { authContext } from "../../Context/useAuth";
import { ProtectedRoutes } from "../../Components/ProtectedRoutes/ProtectedRoutes";

// ACTIVAR LOS DOS PASOS. Obligatorio: la puerta del panel no deja pasar a una
// sesión que no entró con el código. Se prueba a través de la puerta, que es
// como la ve la gente, con el interruptor encendido como quedará al publicar.
vi.mock("../../Utils/dosPasos", () => ({ EXIGIR_DOS_PASOS: true }));

// El código cuadrado se dibuja con una librería; acá alcanza con ver qué
// enlace se le pasó.
vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }) => <p>QR: {value}</p>,
}));

const ENLACE = "otpauth://totp/Ferrequipos%20de%20la%20Costa:aida@ferrequipos.com?secret=ABC";

const sesion = (cambios = {}) => ({
  user: { uid: "u1", email: "aida@ferrequipos.com", role: "administrador" },
  loading: false,
  correoVerificado: true,
  dosPasos: "falta",
  logout: vi.fn(),
  activarDosPasos: {
    empezar: vi.fn(() =>
      Promise.resolve({ secreto: "SECRETO", enlace: ENLACE, clave: "ABCD EFGH" }),
    ),
    terminar: vi.fn(() => Promise.resolve("activo")),
  },
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

describe("la puerta del panel y los dos pasos", () => {
  it("sin los dos pasos, no muestra el panel", async () => {
    abrir(sesion());

    expect(await screen.findByText("Active los dos pasos")).toBeInTheDocument();
    expect(screen.queryByText("Panel de administración")).not.toBeInTheDocument();
  });

  it("si entró con contraseña y código, pasa directo", () => {
    abrir(sesion({ dosPasos: "activo" }));

    expect(screen.getByText("Panel de administración")).toBeInTheDocument();
  });

  it("si ya los activó pero la sesión es de antes, le pide volver a entrar", async () => {
    const valor = sesion({ dosPasos: "reentrar" });
    const { usuario } = abrir(valor);

    expect(await screen.findByText("Vuelva a entrar")).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(valor.logout).toHaveBeenCalled();
  });
});

describe("VistaActivarDosPasos", () => {
  it("muestra el código cuadrado y la clave para escribir a mano", async () => {
    const valor = sesion();
    const { usuario } = abrir(valor);

    await usuario.click(await screen.findByRole("button", { name: "Empezar" }));

    expect(await screen.findByText(`QR: ${ENLACE}`)).toBeInTheDocument();
    expect(screen.getByText("ABCD EFGH")).toBeInTheDocument();
  });

  it("activa con los 6 números que muestra el celular", async () => {
    const valor = sesion();
    const { usuario } = abrir(valor);

    await usuario.click(await screen.findByRole("button", { name: "Empezar" }));
    await usuario.type(await screen.findByLabelText("Código de 6 números"), "123456");
    await usuario.click(screen.getByRole("button", { name: "Activar" }));

    expect(valor.activarDosPasos.terminar).toHaveBeenCalledWith("SECRETO", "123456");
  });

  it("solo deja escribir números, y pide los 6", async () => {
    const valor = sesion();
    const { usuario } = abrir(valor);

    await usuario.click(await screen.findByRole("button", { name: "Empezar" }));
    const campo = await screen.findByLabelText("Código de 6 números");
    await usuario.type(campo, "12a3");
    expect(campo).toHaveValue("123");

    await usuario.click(screen.getByRole("button", { name: "Activar" }));
    expect(
      await screen.findByText("Escriba los 6 números que muestra la aplicación."),
    ).toBeInTheDocument();
    expect(valor.activarDosPasos.terminar).not.toHaveBeenCalled();
  });

  it("si el código no coincide, lo dice en palabras", async () => {
    const valor = sesion();
    valor.activarDosPasos.terminar.mockRejectedValueOnce(
      Object.assign(new Error("x"), { code: "auth/invalid-verification-code" }),
    );
    const consola = vi.spyOn(console, "error").mockImplementation(() => {});
    const { usuario } = abrir(valor);

    await usuario.click(await screen.findByRole("button", { name: "Empezar" }));
    await usuario.type(await screen.findByLabelText("Código de 6 números"), "999999");
    await usuario.click(screen.getByRole("button", { name: "Activar" }));

    expect(await screen.findByText(/Ese código no coincide/)).toBeInTheDocument();
    consola.mockRestore();
  });

  it("si Firebase todavía no tiene encendidos los dos pasos, lo avisa", async () => {
    const valor = sesion();
    valor.activarDosPasos.empezar.mockRejectedValueOnce(
      Object.assign(new Error("x"), { code: "auth/operation-not-allowed" }),
    );
    const consola = vi.spyOn(console, "error").mockImplementation(() => {});
    const { usuario } = abrir(valor);

    await usuario.click(await screen.findByRole("button", { name: "Empezar" }));

    expect(await screen.findByText(/todavía no están encendidos/)).toBeInTheDocument();
    consola.mockRestore();
  });
});
